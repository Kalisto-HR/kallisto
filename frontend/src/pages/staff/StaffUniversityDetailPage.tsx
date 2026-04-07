import { useNavigate, useParams } from "react-router-dom";
import { UniversityProfile } from "../../components/university/UniversityProfile";
import { resolveUniversityId } from "../../components/portal/portalRouting";
import { routes } from "../../routes/routeConfig";
import { fetchStaffUniversityById } from "../../services/staff/universitiesService";

export function StaffUniversityDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const universityId = resolveUniversityId(id ?? null);

  return (
    <UniversityProfile
      universityId={universityId}
      mode="view"
      pageDescription="Review the live university profile shown to applicants and staff."
      cancelLabel="Back to Universities"
      loadUniversity={fetchStaffUniversityById}
      onCancel={() => navigate(routes.staff.universities)}
      onEdit={universityId ? () => navigate(routes.staff.universityEdit(universityId)) : undefined}
    />
  );
}
