import os
import requests as http
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from routers.auth import require_auth

router = APIRouter(prefix="/api/mp-point", tags=["mp-point"])

_BASE = "https://api.mercadopago.com/point/integration-api"


def _hdrs() -> dict:
    token = os.getenv("MP_ACCESS_TOKEN", "")
    if not token:
        raise HTTPException(503, "MP_ACCESS_TOKEN no configurado en el servidor")
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


class IntentIn(BaseModel):
    device_id: str
    amount: int          # pesos CLP enteros
    description: str = "Pago en mesa"


@router.get("/devices")
def listar_devices(_=Depends(require_auth)):
    r = http.get(f"{_BASE}/devices", headers=_hdrs(), timeout=10)
    if not r.ok:
        raise HTTPException(r.status_code, r.json().get("message", r.text))
    return r.json()


@router.post("/intents")
def crear_intent(data: IntentIn, _=Depends(require_auth)):
    payload = {
        "amount": data.amount,
        "additional_info": {
            "external_reference": data.description,
            "print_on_terminal": True,
        },
    }
    r = http.post(
        f"{_BASE}/devices/{data.device_id}/payment-intents",
        json=payload,
        headers=_hdrs(),
        timeout=15,
    )
    if not r.ok:
        body = r.json() if r.headers.get("content-type", "").startswith("application/json") else {}
        raise HTTPException(r.status_code, body.get("message", r.text))
    return r.json()


@router.get("/intents/{intent_id}")
def ver_intent(intent_id: str, _=Depends(require_auth)):
    r = http.get(f"{_BASE}/payment-intents/{intent_id}", headers=_hdrs(), timeout=10)
    if not r.ok:
        raise HTTPException(r.status_code, r.text)
    return r.json()


@router.delete("/intents/{device_id}/{intent_id}")
def cancelar_intent(device_id: str, intent_id: str, _=Depends(require_auth)):
    r = http.delete(
        f"{_BASE}/devices/{device_id}/payment-intents/{intent_id}",
        headers=_hdrs(),
        timeout=10,
    )
    return {"ok": r.ok}
