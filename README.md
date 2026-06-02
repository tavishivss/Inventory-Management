# Inventory & Order Management System

Full-stack inventory and order management application with React, FastAPI, PostgreSQL, Docker, and Docker Compose.

## Features

- Product CRUD with unique SKU validation and non-negative stock checks
- Customer create/list/detail/delete with unique email validation
- Order create/list/detail/delete with automatic total calculation
- Inventory reduction when orders are created
- Insufficient-stock protection
- Dashboard totals for products, customers, orders, and low-stock products
- Responsive React UI with success and error messaging

## Local Docker Setup

1. Copy environment defaults:

   ```bash
   cp .env.example .env
   ```

2. Update `.env`, especially `POSTGRES_PASSWORD`.

3. Start the stack:

   ```bash
   docker compose up --build
   ```

4. Open:

   - Frontend: `http://localhost:8080`
   - Backend API docs: `http://localhost:8000/docs`

If `docker` is not found on macOS, start Docker Desktop and run:

```bash
/Applications/Docker.app/Contents/Resources/bin/docker compose up --build
```

## Start Frontend and Backend

### With Docker Compose

Start all services together:

```bash
docker compose up --build
```

This starts:

- Frontend: `http://localhost:8080`
- Backend API: `http://localhost:8000`
- Backend API docs: `http://localhost:8000/docs`
- PostgreSQL: `localhost:5432`

Stop the stack:

```bash
docker compose down
```

### Without Docker

Run PostgreSQL first and make sure `DATABASE_URL` points to it. For local development, use:

```bash
python3 -m venv .venv
.venv/bin/pip install -r backend/requirements.txt
DATABASE_URL=postgresql+psycopg2://inventory:inventory_password@localhost:5432/inventory_db .venv/bin/uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

In a second terminal, start the frontend:

```bash
cd frontend
npm install
VITE_API_URL=http://localhost:8000 npm run dev
```

The Vite frontend will usually run at `http://localhost:5173`.

## API

Products:

- `POST /products`
- `GET /products`
- `GET /products/{id}`
- `PUT /products/{id}`
- `DELETE /products/{id}`

Customers:

- `POST /customers`
- `GET /customers`
- `GET /customers/{id}`
- `DELETE /customers/{id}`

Orders:

- `POST /orders`
- `GET /orders`
- `GET /orders/{id}`
- `DELETE /orders/{id}`

Dashboard:

- `GET /dashboard`

