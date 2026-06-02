# Inventory & Order Management System

A full-stack web app for managing products, customers, inventory, and orders.

## Tech Stack

- Frontend: React, Vite, lucide-react
- Backend: FastAPI, SQLAlchemy, Pydantic
- Database: PostgreSQL
- Local setup: Docker Compose
- Deployment config: Render for backend, Vercel for frontend

## Features

- Product CRUD with SKU validation and stock tracking
- Customer create/list/detail/delete with unique email validation
- Order creation with automatic total calculation
- Inventory reduction when orders are placed
- Inventory restoration when orders are deleted
- Low-stock dashboard summary
- Search, filters, detail drawers, and responsive UI

## Project Structure

```text
backend/    FastAPI API, database models, schemas
frontend/   React/Vite application
docker-compose.yml
render.yaml
.env.example
```

## Environment

Copy the example file before running locally:

```bash
cp .env.example .env
```

Important variables:

```text
POSTGRES_DB=inventory_db
POSTGRES_USER=inventory
POSTGRES_PASSWORD=123@123
POSTGRES_PORT=5432
BACKEND_PORT=8000
FRONTEND_PORT=8080
CORS_ORIGINS=http://localhost:5173,http://localhost:8080
VITE_API_URL=http://localhost:8000
```

Change `POSTGRES_PASSWORD` for anything beyond local development.

## Run with Docker

```bash
docker compose up --build
```

Open:

- Frontend: http://localhost:8080
- API docs: http://localhost:8000/docs
- Health check: http://localhost:8000/health

Stop services:

```bash
docker compose down
```

Remove local database data:

```bash
docker compose down -v
```

## Run Without Docker

Start PostgreSQL first, then run the backend:

```bash
python3 -m venv .venv
.venv/bin/pip install -r backend/requirements.txt
DATABASE_URL=postgresql+psycopg2://inventory:inventory_password@localhost:5432/inventory_db \
  CORS_ORIGINS=http://localhost:5173 \
  .venv/bin/uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

Run the frontend in another terminal:

```bash
cd frontend
npm install
VITE_API_URL=http://localhost:8000 npm run dev
```

Vite usually starts at http://localhost:5173.

## API Routes

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/health` | API health check |
| `GET` | `/dashboard` | Dashboard totals |
| `POST` | `/products` | Create product |
| `GET` | `/products` | List products |
| `GET` | `/products/{id}` | Get product |
| `PUT` | `/products/{id}` | Update product |
| `DELETE` | `/products/{id}` | Delete product |
| `POST` | `/customers` | Create customer |
| `GET` | `/customers` | List customers |
| `GET` | `/customers/{id}` | Get customer |
| `DELETE` | `/customers/{id}` | Delete customer |
| `POST` | `/orders` | Create order |
| `GET` | `/orders` | List orders |
| `GET` | `/orders/{id}` | Get order |
| `DELETE` | `/orders/{id}` | Delete order |

## Deployment

Backend:

- Uses `render.yaml`
- Set `DATABASE_URL`
- Set `CORS_ORIGINS` to the frontend domain

Frontend:

- Uses `frontend/vercel.json`
- Set `VITE_API_URL` to the deployed backend URL