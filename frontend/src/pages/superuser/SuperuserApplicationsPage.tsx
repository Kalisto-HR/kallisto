import SuperuserApplications from "../../components/superuser/SuperuserApplications";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { AdminSubmittedApplication } from "../../types/domain";
import { fetchSuperuserApplications } from "../../services/admin/superuserService";

export function SuperuserApplicationsPage() {
  const [applications, setApplications] = useState<AdminSubmittedApplication[]>([]);
  const [total, setTotal] = useState<number>(0);

  useEffect(() => {
    let active = true;
    void fetchSuperuserApplications({ page: 1, limit: 200 })
      .then((page) => {
        if (active) {
          setApplications(page.items);
          setTotal(page.total);
        }
      })
      .catch(() => {
        // Keep literal fallback UI if request fails.
      });
    return () => {
      active = false;
    };
  }, []);

  const summary = useMemo(() => {
    const reviewing = applications.filter((a) => a.status === "reviewing").length;
    const accepted = applications.filter((a) => a.status === "accepted").length;
    return {
      totalApplications: total.toLocaleString(),
      underReview: reviewing.toLocaleString(),
      acceptedToday: accepted.toLocaleString(),
      avgReviewTime: "N/A",
    };
  }, [applications, total]);

  const searchApplicationById = useCallback(
    async (id: string) => {
      const matched = applications.find((item) => item.id === id);
      if (!matched) {
        return null;
      }

      const applicantName = String(
        (matched.applicantInfo?.first_name ?? matched.applicantInfo?.name ?? "Applicant") as string,
      );
      const applicantEmail = String((matched.applicantInfo?.email ?? "N/A") as string);

      return {
        id: matched.id,
        applicantId: matched.userId,
        applicantName,
        applicantEmail,
        university: matched.universityId,
        universityId: matched.universityId,
        program: String((matched.applicationData?.program ?? "N/A") as string),
        status:
          matched.status === "reviewing"
            ? "under-review"
            : matched.status === "pending"
              ? "submitted"
              : matched.status,
        submittedDate: matched.submittedAt ?? "N/A",
        lastUpdated: matched.reviewedAt ?? matched.receivedAt,
        reviewedBy: matched.reviewedBy ?? undefined,
      };
    },
    [applications],
  );

  return <SuperuserApplications searchApplicationById={searchApplicationById as any} summary={summary} />;
}
