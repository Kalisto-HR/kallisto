import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  ExternalLink,
  HelpCircle,
  Mail,
  MessageCircle,
  Search,
  Settings,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../../components/ui/accordion";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { routes } from "../../routes/routeConfig";

const faqs = [
  {
    question: "How do I start an application?",
    answer: "Open Find Universities, choose a university, then click Apply to start your draft.",
  },
  {
    question: "Why do I see missing credits?",
    answer: "Credit purchase APIs are still being integrated. Billing UI is available for flow parity.",
  },
  {
    question: "Can I edit submitted applications?",
    answer: "No. Submitted applications are immutable. Update your draft before submitting.",
  },
  {
    question: "Where do I manage my profile?",
    answer: "Open Settings from the sidebar or profile dropdown to update basic account data.",
  },
];

export function StudentHelpPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const filteredFaqs = useMemo(() => {
    const next = query.trim().toLowerCase();
    if (!next) return faqs;
    return faqs.filter((item) =>
      `${item.question} ${item.answer}`.toLowerCase().includes(next),
    );
  }, [query]);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <section className="space-y-4 text-center">
        <div className="brand-logo-mark mx-auto flex h-16 w-16 items-center justify-center rounded-full">
          <HelpCircle className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-semibold sm:text-4xl">How can we help?</h1>
        <p className="mx-auto max-w-2xl text-base text-muted-foreground sm:text-lg">
          Find answers to common questions or contact support.
        </p>
      </section>

      <Card>
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search help articles and FAQs..."
              className="h-12 pl-10 text-base"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
          <CardDescription>Core platform workflows and common issues.</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {filteredFaqs.map((faq, index) => (
              <AccordionItem key={faq.question} value={`faq-${index}`}>
                <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <MessageCircle className="mb-2 h-8 w-8 text-primary" />
            <CardTitle className="text-lg">Live Chat</CardTitle>
            <CardDescription>Real-time support channel.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" disabled>
              Start chat
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Mail className="mb-2 h-8 w-8 text-primary" />
            <CardTitle className="text-lg">Email Support</CardTitle>
            <CardDescription>We respond within one business day.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" disabled>
              Send email
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <BookOpen className="mb-2 h-8 w-8 text-primary" />
            <CardTitle className="text-lg">Documentation</CardTitle>
            <CardDescription>Technical and onboarding docs.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" disabled>
              <ExternalLink className="mr-2 h-4 w-4" />
              View docs
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Button
            variant="ghost"
            className="justify-start"
            onClick={() => navigate(routes.student.billing)}
          >
            View billing
          </Button>
          <Button
            variant="ghost"
            className="justify-start"
            onClick={() => navigate(routes.student.settings)}
          >
            <Settings className="mr-2 h-4 w-4" />
            Account settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
