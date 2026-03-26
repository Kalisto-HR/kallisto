import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const liveFiles = [
  "src/components/Header.tsx",
  "src/components/Sidebar.tsx",
  "src/components/layout/AuthShell.tsx",
  "src/components/layout/StudentShell.tsx",
  "src/components/layout/ManagementLiteralLayout.tsx",
  "src/components/management/ManagementHeader.tsx",
  "src/components/management/ManagementSidebar.tsx",
  "src/components/superuser/SuperuserOverview.tsx",
  "src/components/university/ApplicationStructure.tsx",
  "src/components/university/UniversityProfile.tsx",
  "src/pages/auth/SignInPage.tsx",
  "src/pages/student/StudentApplicationCreatePage.tsx",
  "src/pages/student/StudentBasketPage.tsx",
  "src/pages/student/StudentBillingPage.tsx",
  "src/pages/student/StudentComparePage.tsx",
  "src/pages/student/StudentDashboardPage.tsx",
  "src/pages/student/StudentHelpPage.tsx",
  "src/pages/student/StudentSettingsPage.tsx",
  "src/pages/student/UniversityDetailPage.tsx",
  "src/pages/student/UniversitySearchPage.tsx",
  "src/pages/superuser/SuperuserAuditLogsPage.tsx",
  "src/pages/superuser/SuperuserServiceLogsPage.tsx",
];

const bannedLegacyTokens = [
  "#4F46E5",
  "#4338CA",
  "#7C3AED",
  "from-purple-600",
  "to-blue-600",
];

describe("live theme consistency", () => {
  it.each(liveFiles)("does not use removed indigo or purple brand tokens in %s", (relativePath) => {
    const filePath = resolve(process.cwd(), relativePath);
    const source = readFileSync(filePath, "utf8");

    for (const token of bannedLegacyTokens) {
      expect(source).not.toContain(token);
    }
  });
});
