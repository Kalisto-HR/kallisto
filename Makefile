FRONTEND := frontend

.PHONY: build-client build-admin build-frontend seed-universities migrate-db seed-db-dev bootstrap-db clean

build-client:
	cd services/client && go build -o ../../bin/client ./cmd

build-admin:
	cd services/admin && go build -o ../../bin/admin ./cmd

build-frontend:
	cd $(FRONTEND) && npm install && npm run build

seed-universities:
	go run scripts/seeds/cmd/import_universities/main.go

migrate-db:
	bash scripts/db/apply_migrations.sh --client-db client_db --admin-db admin_db --db-user postgres --db-host localhost --db-port 5432

seed-db-dev:
	bash scripts/db/apply_seeds.sh --seed-profile dev --client-db client_db --admin-db admin_db --db-user postgres --db-host localhost --db-port 5432

bootstrap-db:
	bash scripts/db/bootstrap.sh --create-databases --seed-profile dev --db-user postgres --db-host localhost --db-port 5432

clean:
	rm -rf bin/* frontend/dist
