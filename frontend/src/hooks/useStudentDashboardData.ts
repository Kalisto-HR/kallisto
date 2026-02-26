import { useCallback, useEffect, useState } from "react";
import type { Profile, StudentApplicationListItem } from "../types/domain";
import { fetchStudentProfile } from "../services/client/profileService";
import { fetchStudentApplications } from "../services/client/applicationsService";
import { fetchFavorites } from "../services/client/favoritesService";

export function useStudentDashboardData() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [applications, setApplications] = useState<StudentApplicationListItem[]>([]);
  const [favoritesCount, setFavoritesCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [profileData, applicationData] = await Promise.all([
        fetchStudentProfile(),
        fetchStudentApplications(),
      ]);
      let nextFavoritesCount = 0;
      try {
        const favorites = await fetchFavorites();
        nextFavoritesCount = favorites.length;
      } catch {
        nextFavoritesCount = 0;
      }
      setProfile(profileData);
      setApplications(applicationData);
      setFavoritesCount(nextFavoritesCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { profile, applications, favoritesCount, loading, error, reload };
}
