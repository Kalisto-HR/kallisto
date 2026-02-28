FRONTEND := frontend

.PHONY: build-client build-admin build-frontend seed-universities migrate-db seed-db-dev bootstrap-db smoke-migrations clean

build-client:
	cd services/client && go build -o ../../bin/client ./cmd

build-admin:
	cd services/admin && go build -o ../../bin/admin ./cmd

build-frontend:
	cd $(FRONTEND) && npm install && npm run build

seed-universities:
	go run scripts/seeds/cmd/import_universities/main.go

migrate-db:
	powershell -ExecutionPolicy Bypass -File scripts/db/apply_migrations.ps1 -ClientDb client_db -AdminDb admin_db -DbUser postgres -DbHost localhost -DbPort 5432

seed-db-dev:
	powershell -ExecutionPolicy Bypass -File scripts/db/apply_seeds.ps1 -SeedProfile dev -ClientDb client_db -AdminDb admin_db -DbUser postgres -DbHost localhost -DbPort 5432

bootstrap-db:
	powershell -ExecutionPolicy Bypass -File scripts/db/bootstrap.ps1 -CreateDatabases -SeedProfile dev -DbUser postgres -DbHost localhost -DbPort 5432

smoke-migrations:
	powershell -ExecutionPolicy Bypass -File scripts/db/smoke_test_migrations.ps1 -DbUser postgres -DbHost localhost -DbPort 5432

clean:
	rm -rf bin/* frontend/dist
