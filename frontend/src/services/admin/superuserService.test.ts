import { describe, expect, it } from "vitest";
import { normalizeSuperuserUniversityItem } from "./superuserService";

describe("normalizeSuperuserUniversityItem", () => {
  it("normalizes the generic university payload returned by staff universities", () => {
    expect(
      normalizeSuperuserUniversityItem({
        id: "u-1",
        name: "Westminster International University in Tashkent",
        city: "Tashkent",
        country: "Uzbekistan",
        acceptance_rate: 14.5,
        created_at: "2026-03-24T12:00:00Z",
      }),
    ).toEqual({
      id: "u-1",
      name: "Westminster International University in Tashkent",
      name_en: "Westminster International University in Tashkent",
      type: "public",
      location: "Tashkent, Uzbekistan",
      status: "active",
      admins: 0,
      applications: 0,
      acceptance_rate: "14.5%",
      joined_date: "2026-03-24T12:00:00Z",
      last_active: "Unknown",
    });
  });

  it("preserves the richer global university payload when it is already present", () => {
    expect(
      normalizeSuperuserUniversityItem({
        id: "u-2",
        name: "WIUT",
        name_en: "Westminster International University in Tashkent",
        type: "international",
        location: "Tashkent",
        status: "pending",
        admins: 3,
        applications: 18,
        acceptance_rate: "12.1%",
        joined_date: "2025-09-01",
        last_active: "2 hours ago",
      }),
    ).toEqual({
      id: "u-2",
      name: "WIUT",
      name_en: "Westminster International University in Tashkent",
      type: "international",
      location: "Tashkent",
      status: "pending",
      admins: 3,
      applications: 18,
      acceptance_rate: "12.1%",
      joined_date: "2025-09-01",
      last_active: "2 hours ago",
    });
  });
});
