# aitema|Termin - Makefile

.PHONY: dev build test clean

dev:
	docker compose up --build

dev-backend:
	cd backend && npm run dev

dev-frontend:
	cd frontend && npm run dev

build:
	docker compose build

test:
	cd backend && npm test

test-booking:
	cd backend && npx vitest run src/services/booking.service.test.ts

lint:
	cd backend && npm run lint

db-generate:
	cd backend && npx prisma generate

db-push:
	cd backend && npx prisma db push

db-migrate:
	cd backend && npx prisma migrate dev

db-seed:
	cd backend && npx tsx prisma/seed.ts

clean:
	docker compose down -v
	rm -rf backend/node_modules backend/dist
	rm -rf frontend/node_modules frontend/.svelte-kit
