import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const liveFiles = [
  "src/components/Header.tsx",
  "src/components/Sidebar.tsx",
  "src/components/layout/AuthShell.tsx",
  "src/components/layout/ApplicantShell.tsx",
  "src/components/layout/PortalShell.tsx",
  "src/components/portal/PortalHeader.tsx",
  "src/components/portal/PortalSidebar.tsx",
  "src/components/staff/StaffOverview.tsx",
  "src/components/university/ApplicationStructure.tsx",
  "src/components/university/UniversityProfile.tsx",
  "src/pages/auth/SignInPage.tsx",
  "src/pages/applicant/ApplicantApplicationCreatePage.tsx",
  "src/pages/applicant/ApplicantBasketPage.tsx",
  "src/pages/applicant/ApplicantBillingPage.tsx",
  "src/pages/applicant/ApplicantComparePage.tsx",
  "src/pages/applicant/ApplicantDashboardPage.tsx",
  "src/pages/applicant/ApplicantHelpPage.tsx",
  "src/pages/applicant/ApplicantSettingsPage.tsx",
  "src/pages/applicant/UniversityDetailPage.tsx",
  "src/pages/applicant/UniversitySearchPage.tsx",
  "src/pages/staff/StaffAuditLogsPage.tsx",
  "src/pages/staff/StaffServiceLogsPage.tsx",
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
