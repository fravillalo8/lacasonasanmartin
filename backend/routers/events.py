import asyncio
import json
from typing import AsyncGenerator
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from routers.auth import verify_token

router = APIRouter(prefix="/api", tags=["events"])

# Set de colas activas — una por cliente SSE conectado
_subscribers: set[asyncio.Queue] = set()


def broadcast(event_type: str, data: dict) -> None:
    """Envía un evento a todos los clientes SSE conectados."""
    msg = json.dumps({"type": event_type, "data": data}, ensure_ascii=False)
    dead: set[asyncio.Queue] = set()
    for q in _subscribers:
        try:
            q.put_nowait(msg)
        except asyncio.QueueFull:
            dead.add(q)
    _subscribers -= dead


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


@router.get("/events")
async def sse_stream(token: str = Query(...)):
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
            "X-Accel-Buffering": "no",  # desactiva buffer en Nginx/Railway
        },
    )
