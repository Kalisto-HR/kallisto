package seeds

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestAdminSeedDoesNotInsertSyntheticLogs(t *testing.T) {
	t.Parallel()

	path := filepath.Join("admin_seed.sql")
	content, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("failed to read admin seed: %v", err)
	}

	sql := string(content)
	if strings.Contains(sql, "INSERT INTO service_logs") {
		t.Fatal("admin seed should not insert service_logs rows")
	}
	if strings.Contains(sql, "INSERT INTO audit_logs") {
		t.Fatal("admin seed should not insert audit_logs rows")
	}
}
