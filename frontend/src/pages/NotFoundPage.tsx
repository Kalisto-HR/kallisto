import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { routes } from "../routes/routeConfig";

export function NotFoundPage() {
  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="text-center space-y-3">
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="text-sm text-muted-foreground">The route does not exist in the current portal map.</p>
        <Link to={routes.auth.signIn}>
          <Button>Go to sign in</Button>
        </Link>
      </div>
    </div>
  );
}
