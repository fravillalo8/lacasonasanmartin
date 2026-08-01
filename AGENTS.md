# AGENTS.md — Casona San Martín

Instrucciones para agentes de IA trabajando en este repositorio.

---

## Proyecto

**Casona San Martín** — Patrimonio histórico en Rinconada de Los Andes, Valle del Aconcagua. Pizzería artesanal, café, moda sustentable, eventos culturales y espacios para emprendedores.

---

## Stack

### Frontend
- **React 18 + Vite + TypeScript + Tailwind CSS**
- Estructura: `src/` con `App.tsx`, `components/`, `pages/`

### Backend
- **FastAPI** (Python) en `backend/`
- Base de datos: **SQLite** (`inventario.db`)
- Deploy backend: **Railway** (ver `backend/railway.toml`)

### Dev combinado
```bash
npm run dev   # Levanta FastAPI + Vite en paralelo (con concurrently)
```

---

## Estructura

```
/
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── index.css
│   ├── components/
│   └── pages/
├── public/
├── dist/                       # Build de producción — esto se deploya (frontend)
├── backend/
│   ├── main.py
│   ├── database.py
│   ├── models.py
│   ├── inventario.db           # SQLite — base de datos local
│   ├── railway.toml
│   ├── Procfile
│   ├── requirements.txt
│   ├── migrate_v2.py           # Migraciones SQLite
│   ├── migrate_v3.py
│   ├── seed_full.py            # Seeds de datos
│   ├── seed_proveedores.py
│   ├── seed_shawarma.py
│   └── routers/
│       ├── auth.py
│       ├── backup.py
│       ├── caja.py             # Caja / cierre del día
│       ├── clientes.py
│       ├── comandas.py         # Órdenes de mesa
│       ├── compras.py
│       ├── cotizador.py
│       ├── ingredientes.py
│       ├── merma.py
│       ├── mesas.py            # Gestión de mesas
│       ├── productos.py
│       ├── proveedores.py
│       ├── recetas.py
│       ├── reportes.py
│       ├── reservas.py         # Reservas de evento
│       └── ventas.py
├── Fotos/
├── Tiendas/
├── casona-deploy/
├── scripts/
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig*.json
├── DEPLOY.md                   # Instrucciones de deploy
├── README.md
└── cookie-consent.js
```

---

## Comandos

```bash
npm install
npm run dev          # FastAPI + Vite juntos (desarrollo)
npm run dev:web      # Solo Vite
npm run dev:api      # Solo FastAPI
npm run build        # Genera /dist para deploy del frontend

# Backend
cd backend
pip install -r requirements.txt
python main.py

# Migraciones
python migrate_v2.py
python migrate_v3.py

# Seeds
python seed_full.py
```

---

## Reglas de deploy

### Frontend → Hostinger
- `npm run build` primero → genera `/dist`
- Deploy del contenido de `/dist` via Hostinger MCP (`hosting_deployStaticWebsite`)
- Zip completo del `dist/` — reemplaza todo `public_html`

### Backend → Railway
- Push a Railway (ver `backend/railway.toml` y `Procfile`)
- La BD SQLite está en el servidor — cuidado con recrear el contenedor (pierde datos)
- Ver `DEPLOY.md` para instrucciones detalladas

---

## Sistema POS / gestión interna

El backend implementa un **sistema completo de restaurante**:
- Comandas y mesas (salón)
- Inventario de ingredientes y productos
- Gestión de proveedores y compras
- Control de merma
- Caja y cierre del día
- Reportes de ventas
- Reservas de eventos
- Cotizador

---

## Identidad

- Patrimonio histórico de Rinconada de Los Andes
- Rubros: pizzería artesanal, café, moda sustentable, eventos culturales
- Tono: cultural, artesanal, sustentable, comunitario
