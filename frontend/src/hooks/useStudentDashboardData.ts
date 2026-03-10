import { useCallback, useEffect, useState } from "react";
import type { Profile, StudentApplicationListItem } from "../types/domain";
import { fetchStudentProfile, fetchStudentTestScores } from "../services/client/profileService";
import { fetchStudentApplications } from "../services/client/applicationsService";
import { fetchFavorites } from "../services/client/favoritesService";

export function useStudentDashboardData() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [applications, setApplications] = useState<StudentApplicationListItem[]>([]);
  const [favoritesCount, setFavoritesCount] = useState<number>(0);
  const [testScoresCount, setTestScoresCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [profileData, applicationData, favorites, testScores] = await Promise.all([
        fetchStudentProfile(),
        fetchStudentApplications(),
        fetchFavorites().catch(() => []),
        fetchStudentTestScores().catch(() => []),
      ]);
      setProfile(profileData);
      setApplications(applicationData);
      setFavoritesCount(favorites.length);
      setTestScoresCount(testScores.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { profile, applications, favoritesCount, testScoresCount, loading, error, reload };
}
