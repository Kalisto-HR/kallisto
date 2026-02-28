import SuperuserUniversities from "../../components/superuser/SuperuserUniversities";
import { useEffect, useState } from "react";
import { fetchSuperuserUniversities, type SuperuserUniversityItem } from "../../services/admin/superuserService";

export function SuperuserUniversitiesPage() {
  const [universities, setUniversities] = useState<SuperuserUniversityItem[]>([]);

  useEffect(() => {
    let active = true;
    void fetchSuperuserUniversities({ page: 1, limit: 100 })
      .then((page) => {
        if (active) {
          setUniversities(page.items);
        }
      })
      .catch(() => {
        // Keep literal fallback UI if request fails.
      });
    return () => {
      active = false;
    };
  }, []);

  const mapped = universities.map((item) => ({
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

  return <SuperuserUniversities universitiesData={mapped.length > 0 ? (mapped as any) : undefined} />;
}
