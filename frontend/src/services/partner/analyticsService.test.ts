import { describe, expect, it } from "vitest";
import {
  buildPartnerContactEmailList,
  buildPartnerContactsCsv,
} from "./analyticsService";
import type { PartnerAnalyticsContact } from "../../types/domain";

const contacts: PartnerAnalyticsContact[] = [
  {
    userId: "user-1",
    name: "Jane Doe",
    email: "jane@example.com",
    country: "Kazakhstan",
    stage: "prospect",
    lastActivityAt: "2026-04-20T10:00:00Z",
  },
  {
    userId: "user-2",
    name: "Sam, Test",
    email: "sam@example.com",
    country: "Uzbekistan",
    stage: "prospect",
    lastActivityAt: null,
  },
];

describe("partner analytics service helpers", () => {
  it("builds comma-separated email lists", () => {
    expect(buildPartnerContactEmailList(contacts)).toBe("jane@example.com, sam@example.com");
  });

  it("builds contact CSV with escaped cells", () => {
    expect(buildPartnerContactsCsv(contacts)).toBe(
      [
        "name,email,country,stage,last_activity_at",
        "Jane Doe,jane@example.com,Kazakhstan,prospect,2026-04-20T10:00:00Z",
        "\"Sam, Test\",sam@example.com,Uzbekistan,prospect,",
      ].join("\r\n"),
    );
  });
});
