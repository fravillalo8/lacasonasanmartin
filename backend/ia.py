"""Helper central de IA (Claude) para MesaControl — La Casona San Martín.

Toda llamada a Claude pasa por aquí. Reutiliza el mismo estilo que
routers/cotizador.py (API REST cruda con requests, sin SDK) para no sumar
dependencias. Si no está seteada ANTHROPIC_API_KEY, `ia_disponible()` devuelve
False y las features degradan a modo "sin IA" (reglas) en vez de romper.

Variables de entorno:
  ANTHROPIC_API_KEY   (obligatoria para IA; si falta → modo sin IA)
  ANTHROPIC_MODEL     (opcional; por defecto claude-sonnet-5)
"""
import os
import json
import requests

_API_URL = "https://api.anthropic.com/v1/messages"
_DEFAULT_MODEL = "claude-sonnet-5"


def ia_disponible() -> bool:
    """True si hay API key configurada (para degradar sin romper)."""
    return bool(os.getenv("ANTHROPIC_API_KEY", "").strip())


def call_claude(prompt: str, max_tokens: int = 1024, system: str | None = None) -> str:
    """Llama a Claude y devuelve el texto. Lanza RuntimeError si no hay key o falla."""
    api_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY no configurada")

    payload = {
        "model": os.getenv("ANTHROPIC_MODEL", _DEFAULT_MODEL),
        "max_tokens": max_tokens,
        "messages": [{"role": "user", "content": prompt}],
    }
    if system:
        payload["system"] = system

    try:
        resp = requests.post(
            _API_URL,
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json=payload,
            timeout=40,
        )
        resp.raise_for_status()
    except Exception as e:  # noqa: BLE001
        raise RuntimeError(f"Error llamando a Claude: {e}") from e

    return resp.json()["content"][0]["text"].strip()


def call_claude_json(prompt: str, max_tokens: int = 1024, system: str | None = None):
    """Como call_claude pero espera JSON de vuelta. Tolera fences ```json.

    Devuelve el objeto parseado, o None si no se pudo parsear."""
    raw = call_claude(prompt, max_tokens=max_tokens, system=system)
    txt = raw.strip()
    if txt.startswith("```"):
        # quita ```json ... ```
        txt = txt.split("```", 2)[1] if "```" in txt else txt
        if txt.lstrip().lower().startswith("json"):
            txt = txt.lstrip()[4:]
    txt = txt.strip().strip("`").strip()
    # recorta al primer { ... último }
    start, end = txt.find("{"), txt.rfind("}")
    if start != -1 and end != -1:
        txt = txt[start : end + 1]
    try:
        return json.loads(txt)
    except Exception:  # noqa: BLE001
        return None
