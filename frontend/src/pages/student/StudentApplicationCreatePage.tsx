import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCheck,
  CheckCircle2,
  FileText,
  Info,
  Send,
} from "lucide-react";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Progress } from "../../components/ui/progress";
import { Textarea } from "../../components/ui/textarea";
import { ErrorState } from "../../components/common/PageState";
import { useApplicationFlowData } from "../../hooks/useApplicationFlowData";
import { routes } from "../../routes/routeConfig";

type Step = 1 | 2 | 3 | 4;

const steps = [
  { number: 1, label: "Overview" },
  { number: 2, label: "Requirements" },
  { number: 3, label: "Documents" },
  { number: 4, label: "Review" },
] as const;

export function StudentApplicationCreatePage() {
  const { universityId = "" } = useParams();
  const flow = useApplicationFlowData(universityId);
  const [currentStep, setCurrentStep] = useState<Step>(1);

  const progress = useMemo(
    () => ((currentStep - 1) / (steps.length - 1)) * 100,
    [currentStep],
  );

  const draftJson = useMemo(() => JSON.stringify(flow.formData, null, 2), [flow.formData]);

  if (flow.step === "success") {
    return (
      <div className="mx-auto max-w-4xl">
        <Card className="border-2 border-green-500/20">
          <CardHeader className="space-y-4 py-8 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <CheckCheck className="h-10 w-10 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-3xl">Application Submitted</CardTitle>
              <p className="mt-2 text-muted-foreground">
                Your application for university <strong>{universityId}</strong> was submitted.
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-[#4F46E5]/30 bg-[#4F46E5]/5">
              <Info className="h-4 w-4 text-[#4F46E5]" />
              <AlertDescription>
                You can track status updates from your applications dashboard.
              </AlertDescription>
            </Alert>
            <div className="flex gap-3">
              <Link to={routes.student.applications} className="flex-1">
                <Button variant="outline" className="w-full">
                  View Applications
                </Button>
              </Link>
              <Link to={routes.student.universities} className="flex-1">
                <Button className="w-full">Return to Search</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Application Process</h1>
        <Badge variant="secondary">University {universityId}</Badge>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="mb-6">
            <Progress value={progress} className="h-2" />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {steps.map((step) => (
              <div key={step.number} className="text-center">
                <div
                  className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                    currentStep > step.number
                      ? "border-[#4F46E5] bg-[#4F46E5] text-white"
                      : currentStep === step.number
                      ? "border-[#4F46E5] bg-[#4F46E5]/10 text-[#4F46E5]"
                      : "border-muted-foreground/30 text-muted-foreground"
                  }`}
                >
                  {currentStep > step.number ? <CheckCircle2 className="h-5 w-5" /> : step.number}
                </div>
                <div className="text-xs font-medium">{step.label}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {currentStep === 1 ? (
        <Card>
          <CardHeader>
            <CardTitle>Application Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border p-4">
              <div className="text-sm text-muted-foreground">Target university</div>
              <div className="text-lg font-semibold">{universityId}</div>
            </div>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                This flow uses real backend draft/save/submit endpoints. Submission is immutable.
              </AlertDescription>
            </Alert>
            <div className="flex gap-3">
              <Link to={routes.student.universities} className="flex-1">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to search
                </Button>
              </Link>
              <Button className="flex-1" onClick={() => setCurrentStep(2)}>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {currentStep === 2 ? (
        <Card>
          <CardHeader>
            <CardTitle>Eligibility and Requirements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>• Bachelor&apos;s degree in relevant field</p>
            <p>• Language score requirements apply</p>
            <p>• Transcript, CV, and statement are required</p>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setCurrentStep(1)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button className="flex-1" onClick={() => setCurrentStep(3)}>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {currentStep === 3 ? (
        <Card>
          <CardHeader>
            <CardTitle>Draft Documents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cycle">Application cycle</Label>
                <Input
                  id="cycle"
                  value={flow.cycle}
                  onChange={(event) => flow.setCycle(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gpa">GPA</Label>
                <Input
                  id="gpa"
                  placeholder="3.8"
                  onChange={(event) =>
                    flow.setFormData((prev) => ({ ...prev, gpa: event.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="essay">Statement of Purpose</Label>
              <Textarea
                id="essay"
                rows={6}
                placeholder="Paste your statement..."
                onChange={(event) =>
                  flow.setFormData((prev) => ({ ...prev, essay: event.target.value }))
                }
              />
            </div>
            <div className="rounded-md border bg-muted/30 p-3">
              <div className="mb-2 text-xs text-muted-foreground">Current draft payload</div>
              <pre className="overflow-auto text-xs">{draftJson}</pre>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setCurrentStep(2)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button className="flex-1" onClick={() => setCurrentStep(4)}>
                Review
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {currentStep === 4 ? (
        <Card>
          <CardHeader>
            <CardTitle>Review and Submit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-accent p-4">
              <div className="font-medium">Submission checklist</div>
              <div className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
                <FileText className="mt-0.5 h-4 w-4" />
                Confirm all information before final submission.
              </div>
            </div>

            {flow.error ? (
              <ErrorState message={flow.error} />
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Submitted applications cannot be edited after confirmation.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setCurrentStep(3)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                className="flex-1 bg-[#4F46E5] hover:bg-[#4338CA]"
                disabled={flow.loading || !flow.canReview}
                onClick={() => void flow.saveDraft().then(() => flow.submit())}
              >
                <Send className="mr-2 h-4 w-4" />
                {flow.loading ? "Submitting..." : "Submit Application"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
