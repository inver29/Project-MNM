# Backend Noi That Moc Viet

Backend RESTful API cho he thong web ban noi that.

## Stack

- FastAPI
- SQLAlchemy 2.x
- PostgreSQL
- JWT authentication

## Chay local

1. Tao database `cua_hang_noi_that_db` trong PostgreSQL.
2. Copy file `.env.example` thanh `.env`.
3. Cai thu vien va chay server:

```bash
python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

API mac dinh chay tai `http://127.0.0.1:8000`.

## Tai khoan seed

- Admin: `admin@noithatmocviet.local` / `Admin@12345`
- Customer: `khachhang@noithatmocviet.local` / `Customer@12345`

## Tai lieu

- Endpoint list: `docs/api_endpoints.md`
- Database dictionary: `docs/database_dictionary.md`
- PostgreSQL schema: `docs/postgresql_schema.sql`
