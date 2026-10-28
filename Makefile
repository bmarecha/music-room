COMPOSE ?= docker compose

.PHONY: help env env-refresh build up down restart re logs ps test migrate migration psql clean

help:
	@echo "make env        - create .env from .env.example"
	@echo "make build      - build the docker images"
	@echo "make up         - start db, backend and frontend"
	@echo "make down       - stop everything"
	@echo "make logs       - follow all logs"
	@echo "make logs SERVICE=backend      - follow backend logs"
	@echo "make logs SERVICE=db           - follow database logs"
	@echo "make logs SERVICE=frontend     - follow frontend logs"
	@echo "make test       - run the backend tests"
	@echo "make migrate    - apply database migrations"
	@echo "make migration m=\"message\" - generate a new migration"
	@echo "make psql       - open a psql shell"
	@echo "make clean      - stop and remove volumes"

env:
	@if [ ! -f .env ]; then \
		./refresh_env.sh; \
	fi

env-refresh:
	./refresh_env.sh

build: env
	$(COMPOSE) build

up: env
	$(COMPOSE) up -d --build

down:
	$(COMPOSE) down

restart: down up

re: clean
	$(COMPOSE) build --no-cache
	$(COMPOSE) up -d --force-recreate

logs:
	if [ -n "$(SERVICE)" ]; then \
		case "$(SERVICE)" in \
			db|backend|frontend) $(COMPOSE) logs -f "$(SERVICE)" ;; \
			*) echo "Invalid SERVICE: $(SERVICE). Use db, backend, or frontend."; exit 1 ;; \
		esac; \
	else \
		$(COMPOSE) logs -f; \
	fi

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
