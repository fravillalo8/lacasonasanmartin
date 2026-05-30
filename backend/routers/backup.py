import io
import json
import zipfile
from datetime import datetime

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import MetaData, select

from database import engine
from routers.auth import require_admin, require_heavy_ratelimit

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/backup")
def download_backup(_auth: dict = Depends(require_heavy_ratelimit)):
    """Descarga un ZIP con todas las tablas en JSON. Solo admin."""
    meta = MetaData()
    meta.reflect(bind=engine)

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        with engine.connect() as conn:
            for table_name, tbl in meta.tables.items():
                rows = []
                for row in conn.execute(select(tbl)):
                    record = dict(row._mapping)
                    for k, v in record.items():
                        if hasattr(v, "isoformat"):
                            record[k] = v.isoformat()
                    rows.append(record)
                zf.writestr(f"{table_name}.json", json.dumps(rows, ensure_ascii=False, indent=2))

    buf.seek(0)
    filename = f"mesacontrol_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
