import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from database import init_db
from routers import auth, ingredientes, compras, recetas, reportes, productos, mesas, comandas, ventas, reservas, clientes, caja, merma
from routers import backup, proveedores, cotizador, mp_point, events, auditoria, panel_ia, carta


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="MesaControl — La Casona San Martín",
    version="1.6.0",
    docs_url="/api/docs",
    redoc_url=None,
    lifespan=lifespan,
)

_allowed = [
    "https://lacasonasanmartin.cl",
    "https://www.lacasonasanmartin.cl",
    "https://vallevolt.cl",          # demo pública del producto en vallevolt.cl/gastro
    "https://www.vallevolt.cl",
    "http://localhost:5173",
    "http://localhost:4173",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(ingredientes.router)
app.include_router(compras.router)
app.include_router(recetas.router)
app.include_router(reportes.router)
app.include_router(productos.router)
app.include_router(mesas.router)
app.include_router(comandas.router)
app.include_router(ventas.router)
app.include_router(reservas.router)
app.include_router(clientes.router)
app.include_router(caja.router)
app.include_router(merma.router)
app.include_router(backup.router)
app.include_router(proveedores.router)
app.include_router(cotizador.router)
app.include_router(mp_point.router)
app.include_router(events.router)
app.include_router(auditoria.router)
app.include_router(panel_ia.router)
app.include_router(carta.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "app": "MesaControl", "version": "1.6.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
