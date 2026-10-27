# Music Room

## The stack

- DB : PostgreSQL
- Backend : FastAPI (Python)
- Frontend : Expo (React Native)
- Launch with Docker

## Structure

```
.
├── backend/              FastAPI app
│   ├── app/
│   │   ├── api/routes/   endpoints (auth, users, events, playlists, health)
│   │   ├── core/         config, logging middleware
│   │   ├── db/           SQLAlchemy engine/session, declarative base
│   │   ├── models/       ORM models
│   │   └── schemas/      Pydantic schemas
│   ├── alembic/          database migrations
│   └── tests/
├── frontend/             Expo app
│   └── src/api/          API client (backend URL + device headers)
├── docker-compose.yml
└── Makefile
```

## Getting started

```sh
make env    # creates .env from .env.example, then edit it (HOST_IP, passwords)
make up     # starts db, backend and frontend
```

- API docs (Swagger): http://localhost:8000/api/v1/docs
- Frontend : http://localhost:8081/
- Expo: scan the QR code shown by `make logs` with Expo Go

Run `make help` to see every command.
