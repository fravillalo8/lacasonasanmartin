import hmac
import os
import secrets
import time
from fastapi import APIRouter, Depends, HTTPException, Header, Request
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/api/auth", tags=["auth"])

# ─── PINs por rol ────────────────────────────────────────────────────────────
# Configurar en Railway: ADMIN_PIN, MOZO_PIN, COCINA_PIN
_pin_map: dict[str, str] = {}
for _env, _role in [("ADMIN_PIN", "admin"), ("MOZO_PIN", "mozo"), ("COCINA_PIN", "cocina")]:
    _pin = os.getenv(_env, "")
    if _pin:
        _pin_map[_pin] = _role

# Fallback: si no hay ningún admin configurado, usa 1234
if "admin" not in _pin_map.values():
    _pin_map[os.getenv("ADMIN_PIN", "1234")] = "admin"

# ─── Token store ─────────────────────────────────────────────────────────────
_tokens: dict[str, dict] = {}  # token -> {role, expires}

# ─── Rate limiting ────────────────────────────────────────────────────────────
_attempts: dict[str, list[float]] = {}
MAX_ATTEMPTS = 5
WINDOW_SECS = 60
_CLEANUP_EVERY = 300  # limpiar estructuras cada 5 minutos
_last_cleanup = 0.0


def _real_ip(request: Request) -> str:
    """Extrae la IP real del cliente (Railway corre detrás de proxy)."""
    for header in ("x-real-ip", "x-forwarded-for"):
        val = request.headers.get(header, "").split(",")[0].strip()
        if val:
            return val
    return request.client.host if request.client else "unknown"


def _cleanup_stale() -> None:
    """Elimina tokens expirados y entradas de rate-limit antiguas."""
    global _last_cleanup
    now = time.time()
    if now - _last_cleanup < _CLEANUP_EVERY:
        return
    _last_cleanup = now
    expired_tokens = [t for t, v in _tokens.items() if v["expires"] < now]
    for t in expired_tokens:
        _tokens.pop(t, None)
    stale_ips = [ip for ip, ts in _attempts.items() if not any(now - t < WINDOW_SECS for t in ts)]
    for ip in stale_ips:
        _attempts.pop(ip, None)


def _check_rate(ip: str) -> None:
    now = time.time()
    recent = [t for t in _attempts.get(ip, []) if now - t < WINDOW_SECS]
    if len(recent) >= MAX_ATTEMPTS:
        raise HTTPException(status_code=429, detail="Demasiados intentos. Espera 1 minuto.")
    recent.append(now)
    _attempts[ip] = recent


def _verify_pin(candidate: str) -> "str | None":
    """Verifica el PIN usando comparación de tiempo constante para evitar timing attacks."""
    from typing import Optional
    found_role: Optional[str] = None
    for stored_pin, role in _pin_map.items():
        if hmac.compare_digest(stored_pin.encode(), candidate.encode()):
            found_role = role
    return found_role


# ─── Schemas ─────────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    pin: str


# ─── Endpoints ───────────────────────────────────────────────────────────────
@router.post("/login")
def login(req: LoginRequest, request: Request):
    ip = _real_ip(request)
    _check_rate(ip)
    _cleanup_stale()

    role = _verify_pin(req.pin)
    if not role:
        raise HTTPException(status_code=401, detail="PIN incorrecto")

    token = secrets.token_hex(32)
    _tokens[token] = {"role": role, "expires": time.time() + 86400}
    return {"token": token, "role": role, "expires_in": 86400}


@router.post("/logout")
def logout(authorization: str = Header("")):
    token = authorization.replace("Bearer ", "").strip()
    _tokens.pop(token, None)
    return {"ok": True}


@router.get("/me")
def me(authorization: str = Header("")):
    token = authorization.replace("Bearer ", "").strip()
    entry = _tokens.get(token)
    if not entry or entry["expires"] < time.time():
        raise HTTPException(status_code=401, detail="No autorizado")
    return {"ok": True, "role": entry["role"]}


# ─── Dependencies ────────────────────────────────────────────────────────────
def require_auth(authorization: str = Header("")) -> dict:
    token = authorization.replace("Bearer ", "").strip()
    entry = _tokens.get(token)
    if not entry or entry["expires"] < time.time():
        raise HTTPException(status_code=401, detail="Token inválido o expirado")
    return {"token": token, "role": entry["role"]}


def require_admin(auth: dict = Depends(require_auth)) -> dict:
    if auth["role"] != "admin":
        raise HTTPException(status_code=403, detail="Se requiere rol administrador")
    return auth


# ─── Rate limiting por token (para endpoints costosos) ───────────────────────
_token_calls: dict[str, list[float]] = {}
_HEAVY_MAX = 3      # máx 3 llamadas
_HEAVY_WINDOW = 60  # en 60 segundos


def require_heavy_ratelimit(auth: dict = Depends(require_admin)) -> dict:
    """Limita a 3 llamadas/minuto por token para endpoints que consumen recursos externos."""
    token = auth["token"]
    now = time.time()
    recent = [t for t in _token_calls.get(token, []) if now - t < _HEAVY_WINDOW]
    if len(recent) >= _HEAVY_MAX:
        raise HTTPException(status_code=429, detail=f"Máximo {_HEAVY_MAX} operaciones por minuto. Espera un momento.")
    recent.append(now)
    _token_calls[token] = recent
    return auth


def verify_token(token: str) -> dict:
    """Verifica token directamente (para SSE que no puede usar headers)."""
    entry = _tokens.get(token)
    if not entry or entry["expires"] < time.time():
        raise HTTPException(status_code=401, detail="Token inválido o expirado")
    return {"token": token, "role": entry["role"]}
