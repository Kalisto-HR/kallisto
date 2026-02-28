import { useNavigate } from "react-router-dom";
import { AccessDenied } from "../../components/management/AccessDenied";
import { useSession } from "../../hooks/useSession";
import { routes } from "../../routes/routeConfig";
import { isValidUUID } from "../../utils/validation";

export function ManagementAccessDeniedPage() {
  const navigate = useNavigate();
  const { user } = useSession();

  const onBackToDashboard = () => {
    if (!user) {
      void navigate(routes.auth.signIn);
      return;
    }
    if (user.role === "student") {
      void navigate(routes.student.dashboard);
      return;
    }
    if (user.role === "partner" && user.universityLinked && isValidUUID(user.universityLinked)) {
      void navigate(routes.management.university.dashboard(user.universityLinked));
      return;
    }
    if (user.role === "staff" || user.role === "superuser-ui") {
      void navigate(routes.management.global.overview);
      return;
    }
    void navigate(routes.auth.signIn);
  };

  return <AccessDenied onBackToDashboard={onBackToDashboard} />;
}
