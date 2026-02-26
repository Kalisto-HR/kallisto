FRONTEND := frontend

.PHONY: build-client build-admin build-frontend seed-universities clean

build-client:
	cd services/client && go build -o ../../bin/client ./cmd

build-admin:
	cd services/admin && go build -o ../../bin/admin ./cmd

build-frontend:
	cd $(FRONTEND) && npm install && npm run build

seed-universities:
	go run scripts/seeds/cmd/import_universities/main.go

clean:
	rm -rf bin/* frontend/dist
