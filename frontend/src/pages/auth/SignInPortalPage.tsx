import { Building2, GraduationCap, Shield } from "lucide-react";
import type { ComponentType } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../../components/ui/card";
import { routes } from "../../routes/routeConfig";

interface PortalCard {
  title: string;
  description: string;
  cta: string;
  features: string[];
  action: () => void;
  Icon: ComponentType<{ className?: string }>;
}

export function SignInPortalPage() {
  const navigate = useNavigate();

  const cards: PortalCard[] = [
    {
      title: "Student Portal",
      description: "Find universities, compare options, and submit applications",
      cta: "Continue as Student",
      features: [
        "AI-powered university matching",
        "Advanced search with filters",
        "Side-by-side comparison",
        "5-step application workflow",
        "Per-application + packages billing",
      ],
      action: () => navigate(routes.auth.signInStudent),
      Icon: GraduationCap,
    },
    {
      title: "University Manager",
      description: "Manage your university's applications and profile",
      cta: "Continue as Manager",
      features: [
        "University dashboard & analytics",
        "Application structure builder",
        "Applicant management",
        "Profile editing (draft system)",
        "Billing & packages",
      ],
      action: () => navigate(routes.auth.signInManagement),
      Icon: Building2,
    },
    {
      title: "Superuser",
      description: "Global administration and platform management",
      cta: "Continue as Superuser",
      features: [
        "Global oversight dashboard",
        "Universities management",
        "Drafts & approvals system",
        "Service & audit logs",
        "Context switcher (Global/University)",
      ],
      action: () => navigate(`${routes.auth.signInManagement}?intent=superuser`),
      Icon: Shield,
    },
  ];

  return (
    <div className="min-h-screen bg-[#f5f7fb] px-4 py-12 md:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-10 text-center">
          <h1 className="text-5xl font-semibold tracking-tight text-foreground">Welcome to DaMen</h1>
          <p className="mt-3 text-lg text-muted-foreground">AI-powered university application platform</p>
        </header>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {cards.map((card) => (
            <Card key={card.title} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <CardHeader className="pb-3">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#2563eb] text-white shadow-sm">
                  <card.Icon className="h-7 w-7" />
                </div>
                <CardTitle className="text-4xl font-semibold leading-tight text-foreground">{card.title}</CardTitle>
                <p className="pt-2 text-lg text-muted-foreground">{card.description}</p>
              </CardHeader>
              <CardContent className="pt-0">
                <Button
                  className="h-12 w-full rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#2563eb] text-base font-semibold text-white hover:opacity-95"
                  onClick={card.action}
                >
                  {card.cta}
                </Button>
                <hr className="my-5 border-slate-200" />
              </CardContent>
              <CardFooter className="pt-0">
                <div className="w-full text-base text-muted-foreground">
                  <p className="mb-2 font-medium">Demo Features:</p>
                  <ul className="space-y-1">
                    {card.features.map((feature) => (
                      <li key={feature}>- {feature}</li>
                    ))}
                  </ul>
                </div>
              </CardFooter>
            </Card>
          ))}
        </section>

        <footer className="mt-12 text-center text-lg text-muted-foreground">
          Focus on China-related university applications - Credit-based submission system - Yuan pricing
        </footer>
      </div>
    </div>
  );
}
