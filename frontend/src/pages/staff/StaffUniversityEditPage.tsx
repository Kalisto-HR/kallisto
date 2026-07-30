import { useNavigate, useParams } from "react-router-dom";
import { UniversityProfile } from "../../components/university/UniversityProfile";
import { resolveUniversityId } from "../../components/portal/portalRouting";
import { routes } from "../../routes/routeConfig";
import { fetchStaffUniversityById, updateStaffUniversity, uploadStaffUniversityLogo } from "../../services/staff/universitiesService";

export function StaffUniversityEditPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const universityId = resolveUniversityId(id ?? null);

  return (
    <UniversityProfile
      universityId={universityId}
      loadUniversity={fetchStaffUniversityById}
      saveUniversity={updateStaffUniversity}
      uploadLogo={uploadStaffUniversityLogo}
      cancelLabel="Back to Details"
      missingContextMessage="Missing valid university context. Open this page from the universities list."
      onCancel={() => navigate(universityId ? routes.staff.universityDetail(universityId) : routes.staff.universities)}
    />
  );
}
