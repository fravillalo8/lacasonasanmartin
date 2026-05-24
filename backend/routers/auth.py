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


def _check_rate(ip: str) -> None:
    now = time.time()
    recent = [t for t in _attempts.get(ip, []) if now - t < WINDOW_SECS]
    if len(recent) >= MAX_ATTEMPTS:
        raise HTTPException(status_code=429, detail="Demasiados intentos. Espera 1 minuto.")
    recent.append(now)
    _attempts[ip] = recent


# ─── Schemas ─────────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    pin: str


# ─── Endpoints ───────────────────────────────────────────────────────────────
@router.post("/login")
def login(req: LoginRequest, request: Request):
    ip = request.client.host if request.client else "unknown"
    _check_rate(ip)

    role = _pin_map.get(req.pin)
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
