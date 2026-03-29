import { useCallback, useEffect, useState } from "react";
import { ErrorState, LoadingState } from "../../components/common/PageState";
import StaffUniversities, { type StaffUniversityView } from "../../components/staff/StaffUniversities";
import { fetchStaffUniversities, type StaffUniversityItem } from "../../services/staff/universitiesService";

export function StaffUniversitiesPage() {
  const [universities, setUniversities] = useState<StaffUniversityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const page = await fetchStaffUniversities({ page: 1, limit: 100 });
      setUniversities(page.items);
    } catch (err) {
      setUniversities([]);
      setError(err instanceof Error ? err.message : "Failed to load universities");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <LoadingState label="Loading universities..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => void load()} />;
  }

  const mapped: StaffUniversityView[] = universities.map((item) => ({
    id: item.id,
    name: item.name,
    nameEn: item.name_en,
    type: item.type,
    location: item.location,
    status: item.status,
    admins: item.admins,
    applications: item.applications,
    acceptanceRate: item.acceptance_rate,
    joinedDate: item.joined_date,
    lastActive: item.last_active,
  }));

  return <StaffUniversities universitiesData={mapped} />;
}
