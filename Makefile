CLIENT_WEB := services/client/web
ADMIN_WEB := services/admin/web

.PHONY: build-client build-admin build-frontend clean

build-client:
	cd services/client && go build -o ../../bin/client ./cmd

build-admin:
	cd services/admin && go build -o ../../bin/admin ./cmd

build-frontend:
	cd $(CLIENT_WEB) && npm install && npm run build && mv dist ../public
	cd $(ADMIN_WEB) && npm install && npm run build && mv dist ../public

clean:
	rm -rf services/*/public/*
