COMPOSE ?= docker compose

.PHONY: help env build up down restart logs ps test migrate migration psql clean

help:
	@echo "make env        - create .env from .env.example"
	@echo "make build      - build the docker images"
	@echo "make up         - start db, backend and frontend"
	@echo "make down       - stop everything"
	@echo "make logs       - follow the logs"
	@echo "make test       - run the backend tests"
	@echo "make migrate    - apply database migrations"
	@echo "make migration m=\"message\" - generate a new migration"
	@echo "make psql       - open a psql shell"
	@echo "make clean      - stop and remove volumes"

env:
	@test -f .env || (cp .env.example .env && echo ".env created, edit it")

build: env
	$(COMPOSE) build

up: env
	$(COMPOSE) up -d --build

down:
	$(COMPOSE) down

restart: down up

logs:
	$(COMPOSE) logs -f

ps:
	$(COMPOSE) ps

test:
	$(COMPOSE) run --rm backend pytest

migrate:
	$(COMPOSE) run --rm backend alembic upgrade head

migration:
	$(COMPOSE) run --rm backend alembic revision --autogenerate -m "$(m)"

psql:
	$(COMPOSE) exec db sh -c 'psql -U $$POSTGRES_USER -d $$POSTGRES_DB'

clean:
	$(COMPOSE) down -v
