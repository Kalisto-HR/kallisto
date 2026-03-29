import { describe, expect, it } from "vitest";
import { buildPartnerApplicationFileDownloadUrl } from "./submissionsService";

describe("partner submissions service", () => {
  it("builds partner file download urls through the service layer", () => {
    expect(buildPartnerApplicationFileDownloadUrl("app-1", "file-2")).toBe(
      "/api/v1.0/partner/applications/app-1/files/file-2/download",
    );
  });
});
