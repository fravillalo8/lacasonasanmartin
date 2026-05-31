from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
import os
from dotenv import load_dotenv

load_dotenv()

_db_url = os.getenv("DATABASE_URL", "sqlite:///./inventario.db")
# Railway entrega postgresql:// pero SQLAlchemy necesita postgresql+psycopg2://
if _db_url.startswith("postgresql://"):
    _db_url = _db_url.replace("postgresql://", "postgresql+psycopg2://", 1)

DATABASE_URL = _db_url

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    from models import Base as ModelsBase
    from sqlalchemy import text
    ModelsBase.metadata.create_all(bind=engine)
    # Column migrations for existing tables
    migrations = [
        "ALTER TABLE ventas ADD COLUMN subtotal FLOAT DEFAULT 0",
        "ALTER TABLE ventas ADD COLUMN descuento FLOAT DEFAULT 0",
        "ALTER TABLE ventas ADD COLUMN propina FLOAT DEFAULT 0",
        "ALTER TABLE ventas ADD COLUMN numero_mesa INTEGER DEFAULT 0",
        "ALTER TABLE productos ADD COLUMN agotado_hoy BOOLEAN DEFAULT FALSE",
        "ALTER TABLE comandas ADD COLUMN tipo VARCHAR(20) DEFAULT 'mesa'",
        "ALTER TABLE comandas ADD COLUMN cliente_nombre VARCHAR(200) DEFAULT ''",
        "ALTER TABLE productos ADD COLUMN receta_id INTEGER REFERENCES recetas(id)",
        "ALTER TABLE items_comanda ADD COLUMN listo BOOLEAN DEFAULT FALSE",
        "ALTER TABLE comandas ADD COLUMN numero_ticket INTEGER",
        # v1.3.0
        "ALTER TABLE mesas ADD COLUMN posicion_x INTEGER DEFAULT 0",
        "ALTER TABLE mesas ADD COLUMN posicion_y INTEGER DEFAULT 0",
        "ALTER TABLE ventas ADD COLUMN pago2_tipo VARCHAR(20) DEFAULT ''",
        "ALTER TABLE ventas ADD COLUMN pago2_monto FLOAT DEFAULT 0",
    ]
    # Cada migración usa su propia conexión para que un fallo (columna ya existe)
    # no deje la transacción en estado de error en PostgreSQL, bloqueando el resto.
    for sql in migrations:
        try:
            with engine.connect() as conn:
                conn.execute(text(sql))
                conn.commit()
        except Exception:
            pass  # column already exists
