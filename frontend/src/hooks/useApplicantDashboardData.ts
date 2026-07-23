import { useCallback, useEffect, useState } from "react";
import type { Profile, ApplicantApplicationListItem, BillingSummary } from "../types/domain";
import { fetchApplicantProfile, fetchApplicantTestScores } from "../services/applicant/profileService";
import { fetchApplicantApplications } from "../services/applicant/applicationsService";
import { fetchFavorites } from "../services/applicant/favoritesService";
import { fetchBillingSummary } from "../services/applicant/billingService";

export function useApplicantDashboardData() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [applications, setApplications] = useState<ApplicantApplicationListItem[]>([]);
  const [favoritesCount, setFavoritesCount] = useState<number>(0);
  const [testScoresCount, setTestScoresCount] = useState<number>(0);
  const [billingSummary, setBillingSummary] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [profileData, applicationData, favorites, testScores, billing] = await Promise.all([
        fetchApplicantProfile(),
        fetchApplicantApplications(),
        fetchFavorites().catch(() => []),
        fetchApplicantTestScores().catch(() => []),
        fetchBillingSummary().catch(() => null),
      ]);
      setProfile(profileData);
      setApplications(applicationData);
      setFavoritesCount(favorites.length);
      setTestScoresCount(testScores.length);
      setBillingSummary(billing);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { profile, applications, favoritesCount, testScoresCount, billingSummary, loading, error, reload };
}
