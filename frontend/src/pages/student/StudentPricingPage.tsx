import { useNavigate } from "react-router-dom";
import { Check, HelpCircle, Sparkles, Zap } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../../components/ui/accordion";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { routes } from "../../routes/routeConfig";

const plans = [
  {
    name: "Starter",
    price: "$0",
    period: "Free forever",
    description: "Explore universities and track early planning.",
    features: ["10 credits included", "University search", "Basic compare", "Email support"],
    current: true,
  },
  {
    name: "Pro",
    price: "$199",
    period: "per month",
    description: "Full student workflow with AI and higher limits.",
    features: [
      "100 credits per month",
      "Advanced filters",
      "AI recommendations",
      "Deadline reminders",
      "Priority support",
    ],
    popular: true,
  },
  {
    name: "Premium",
    price: "$499",
    period: "per month",
    description: "High-touch support and unlimited credits.",
    features: [
      "Unlimited credits",
      "Personal consultant",
      "Essay review",
      "Interview preparation",
      "24/7 support",
    ],
  },
];

export function StudentPricingPage() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-7xl space-y-12">
      <section className="text-center">
        <h1 className="text-4xl font-semibold">Choose Your Plan</h1>
        <p className="mx-auto mt-3 max-w-2xl text-lg text-muted-foreground">
          Get the tools and insights you need to find and apply to your best-fit university.
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={plan.popular ? "relative border-2 border-[#4F46E5] shadow-lg" : "relative"}
          >
            {plan.popular ? (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#4F46E5] text-white">
                <Zap className="mr-1 h-3 w-3" />
                Most Popular
              </Badge>
            ) : null}

            <CardHeader>
              <div className="mb-2 flex items-center justify-between">
                <div className="rounded-lg bg-accent p-2">
                  <Sparkles className="h-5 w-5 text-accent-foreground" />
                </div>
                {plan.current ? <Badge variant="outline">Current</Badge> : null}
              </div>
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
              <div className="pt-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-semibold">{plan.price}</span>
                </div>
                <p className="text-xs text-muted-foreground">{plan.period}</p>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <Button
                className="w-full"
                variant={plan.popular ? "default" : "outline"}
                disabled={Boolean(plan.current)}
                onClick={() => navigate(routes.student.checkout)}
              >
                {plan.current ? "Current Plan" : `Upgrade to ${plan.name}`}
              </Button>
              <div className="space-y-2">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 text-green-500" />
                    {feature}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Additional Credits</CardTitle>
          <CardDescription>One-time purchases, non-expiring credits.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border p-4 text-center">
            <div className="text-2xl font-semibold">50 Credits</div>
            <div className="text-sm text-muted-foreground">$60 one-time</div>
            <Button className="mt-3 w-full" variant="outline" onClick={() => navigate(routes.student.checkout)}>
              Purchase
            </Button>
          </div>
          <div className="relative rounded-lg border-2 border-[#4F46E5]/30 bg-[#4F46E5]/5 p-4 text-center">
            <Badge className="absolute -top-2 right-2">Best Value</Badge>
            <div className="text-2xl font-semibold">100 Credits</div>
            <div className="text-sm text-muted-foreground">$100 one-time</div>
            <Button className="mt-3 w-full" onClick={() => navigate(routes.student.checkout)}>
              Purchase
            </Button>
          </div>
          <div className="rounded-lg border p-4 text-center">
            <div className="text-2xl font-semibold">250 Credits</div>
            <div className="text-sm text-muted-foreground">$200 one-time</div>
            <Button className="mt-3 w-full" variant="outline" onClick={() => navigate(routes.student.checkout)}>
              Purchase
            </Button>
          </div>
        </CardContent>
      </Card>

      <section className="mx-auto max-w-3xl">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-semibold">Frequently Asked Questions</h2>
          <p className="text-muted-foreground">Everything you need to know about pricing.</p>
        </div>
        <Accordion type="single" collapsible className="space-y-4">
          <AccordionItem value="q1" className="rounded-lg border px-6">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-muted-foreground" />
                What are application credits?
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              Credits are consumed when submitting applications through the platform.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="q2" className="rounded-lg border px-6">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-muted-foreground" />
                Can I cancel anytime?
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              Yes. Subscriptions can be canceled at any time from billing settings.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>
    </div>
  );
}
