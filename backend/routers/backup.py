import io
import json
import zipfile
from datetime import datetime

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import inspect, text

from database import engine
from routers.auth import require_admin

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/backup")
def download_backup(_auth: dict = Depends(require_admin)):
    """Descarga un ZIP con todas las tablas en JSON. Solo admin."""
    with engine.connect() as conn:
        inspector = inspect(engine)
        tables = inspector.get_table_names()

        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
            for table in tables:
                rows = []
                for row in conn.execute(text(f"SELECT * FROM {table}")):
                    record = dict(row._mapping)
                    for k, v in record.items():
                        if hasattr(v, "isoformat"):
                            record[k] = v.isoformat()
                    rows.append(record)
                zf.writestr(f"{table}.json", json.dumps(rows, ensure_ascii=False, indent=2))

    buf.seek(0)
    filename = f"mesacontrol_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
