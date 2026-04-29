.DEFAULT_GOAL := up

.PHONY: up down reset logs ps seed \
        api-shell api-migrate api-makemigrations api-superuser api-test api-schema \
        web-gen-types fmt

up:
	cp -n .env.example .env || true
	docker compose up --build

down:
	docker compose down

reset:
	docker compose down -v
	docker compose up --build

logs:
	docker compose logs -f

ps:
	docker compose ps

seed:
	docker compose exec api uv run python manage.py seed_demo

api-shell:
	docker compose exec api uv run python manage.py shell

api-migrate:
	docker compose exec api uv run python manage.py migrate

api-makemigrations:
	docker compose exec api uv run python manage.py makemigrations

api-superuser:
	docker compose exec api uv run python manage.py createsuperuser

api-test:
	docker compose exec api uv run pytest -x

api-schema:
	docker compose exec api uv run python manage.py spectacular --file schema.yml

web-gen-types: api-schema
	cp apps/api/schema.yml packages/api-types/schema.yml
	pnpm --filter @pentesthub/api-types generate

fmt:
	docker compose exec api uv run ruff format .
	docker compose exec api uv run ruff check . --fix
	pnpm -r lint
