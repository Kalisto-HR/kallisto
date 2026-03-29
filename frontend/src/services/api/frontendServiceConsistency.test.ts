import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const sourceRoot = path.resolve(currentDir, "..", "..");
const routesFile = path.join(sourceRoot, "services", "api", "routes.ts");
const consistencyTestFile = path.join(sourceRoot, "services", "api", "frontendServiceConsistency.test.ts");
const allowedRouteTests = new Set([
  path.join(sourceRoot, "services", "api", "httpClient.test.ts"),
]);

function collectFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const filePath = path.join(dir, entry);
    const stats = statSync(filePath);
    if (stats.isDirectory()) {
      return collectFiles(filePath);
    }
    return [filePath];
  });
}

function isTestFile(filePath: string): boolean {
  return filePath.endsWith(".test.ts") || filePath.endsWith(".test.tsx");
}

describe("frontend service consistency", () => {
  const files = collectFiles(sourceRoot);

  it("does not reference the legacy admin/client service folders", () => {
    const offenders = files.filter((filePath) => {
      const contents = readFileSync(filePath, "utf8");
      return /services\/(admin|client)\//.test(contents);
    });

    expect(offenders).toEqual([]);
  });

  it("does not reference legacy adminApi or clientApi aliases", () => {
    const offenders = files.filter((filePath) => {
      if (filePath === consistencyTestFile) {
        return false;
      }
      const contents = readFileSync(filePath, "utf8");
      return /\b(adminApi|clientApi)\b/.test(contents);
    });

    expect(offenders).toEqual([]);
  });

  it("keeps raw backend route strings inside the service layer and approved tests only", () => {
    const offenders = files.filter((filePath) => {
      if (filePath === routesFile) {
        return false;
      }

      if (isTestFile(filePath) && allowedRouteTests.has(filePath)) {
        return false;
      }

      if (isTestFile(filePath)) {
        return false;
      }

      const contents = readFileSync(filePath, "utf8");
      return /\/(?:api\/)?v1\.0\//.test(contents);
    });

    expect(offenders).toEqual([]);
  });
});
