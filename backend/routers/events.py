import asyncio
import json
import secrets
import time
from typing import AsyncGenerator
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import StreamingResponse
from routers.auth import require_auth, verify_token

router = APIRouter(prefix="/api", tags=["events"])

# Set de colas activas — una por cliente SSE conectado
_subscribers: set[asyncio.Queue] = set()

# Tokens SSE de corta vida: token → expires (60s)
# Evita que el JWT de sesión aparezca en logs del servidor (SSE no puede usar headers)
_sse_tokens: dict[str, float] = {}
_SSE_TTL = 60


def _cleanup_sse_tokens() -> None:
    now = time.time()
    stale = [t for t, exp in _sse_tokens.items() if exp < now]
    for t in stale:
        _sse_tokens.pop(t, None)


def broadcast(event_type: str, data: dict) -> None:
    """Envía un evento a todos los clientes SSE conectados."""
    msg = json.dumps({"type": event_type, "data": data}, ensure_ascii=False)
    dead: set[asyncio.Queue] = set()
    for q in list(_subscribers):
        try:
            q.put_nowait(msg)
        except asyncio.QueueFull:
            dead.add(q)
    _subscribers.difference_update(dead)   # mutar en sitio (evita UnboundLocalError por reasignar)


async def _generate(q: asyncio.Queue) -> AsyncGenerator[str, None]:
    _subscribers.add(q)
    try:
        while True:
            try:
                msg = await asyncio.wait_for(q.get(), timeout=20)
                yield f"data: {msg}\n\n"
            except asyncio.TimeoutError:
                yield ": ping\n\n"  # keep-alive para proxies/Railway
    finally:
        _subscribers.discard(q)


@router.post("/events/token")
def obtener_sse_token(auth: dict = Depends(require_auth)):
    """Genera un token de corta vida (60s) para autenticar la conexión SSE.
    Usar este token en GET /api/events?token=<sse_token> en lugar del JWT principal.
    """
    _cleanup_sse_tokens()
    sse_token = secrets.token_hex(16)
    _sse_tokens[sse_token] = time.time() + _SSE_TTL
    return {"sse_token": sse_token, "ttl": _SSE_TTL}


@router.get("/events")
async def sse_stream(token: str = Query(...)):
    """Acepta un sse_token (POST /api/events/token) O el JWT de sesión como fallback."""
    _cleanup_sse_tokens()
    # Primero intentar SSE token de corta vida
    exp = _sse_tokens.pop(token, None)
    if exp is not None:
        if exp < time.time():
            raise HTTPException(status_code=401, detail="Token SSE expirado")
    else:
        # Fallback: verificar JWT de sesión directamente
        try:
            verify_token(token)
        except HTTPException:
            raise HTTPException(status_code=401, detail="Token inválido")

    q: asyncio.Queue = asyncio.Queue(maxsize=50)
    return StreamingResponse(
        _generate(q),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
