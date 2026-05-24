import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  GraduationCap,
  Languages,
  School,
} from "lucide-react";
import type { University } from "../../types/domain";
import { fetchUniversityById } from "../../services/applicant/universitiesService";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { EmptyState, ErrorState, LoadingState } from "../../components/common/PageState";
import { routes } from "../../routes/routeConfig";
import { formatRmb } from "../../utils/currency";

interface ProgramRequirements {
  eligibility: string[];
  documents: string[];
  testScores: Record<string, string>;
}

interface ProgramFees {
  tuitionPerYear: number | null;
  tuitionDescription: string | null;
  applicationFee: number | null;
}

interface ProgramDeadline {
  term: string;
  deadline: string;
  deadlineIso: string | null;
  applicationPeriod: string | null;
}

interface ProgramScholarship {
  name: string;
  description: string;
  appliesTo: string;
}

interface Program {
  id: string;
  name: string;
  department: string | null;
  faculty: string | null;
  language: string | null;
  duration: string | null;
  level: string | null;
  requirements: ProgramRequirements;
  fees: ProgramFees;
  deadlines: ProgramDeadline[];
  scholarships: ProgramScholarship[];
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function extractProgram(university: University, programId: string): Program | null {
  const metadata = toRecord(university.metadata);
  const programs = Array.isArray(metadata?.programs) ? metadata.programs : [];

  for (const prog of programs) {
    const record = toRecord(prog);
    if (!record) continue;
    if (record.id === programId) {
      return {
        id: String(record.id ?? ""),
        name: String(record.name ?? "Unknown Program"),
        department: record.department ? String(record.department) : null,
        faculty: record.faculty ? String(record.faculty) : null,
        language: record.language ? String(record.language) : null,
        duration: record.duration ? String(record.duration) : null,
        level: record.level ? String(record.level) : null,
        requirements: (record.requirements as ProgramRequirements) ?? {
          eligibility: [],
          documents: [],
          testScores: {},
        },
        fees: (record.fees as ProgramFees) ?? {
          tuitionPerYear: null,
          tuitionDescription: null,
          applicationFee: null,
        },
        deadlines: Array.isArray(record.deadlines) ? (record.deadlines as ProgramDeadline[]) : [],
        scholarships: Array.isArray(record.scholarships) ? (record.scholarships as ProgramScholarship[]) : [],
      };
    }
  }
  return null;
}

export function ProgramDetailPage() {
  const { id: universityId = "", programId = "" } = useParams();
  const [university, setUniversity] = useState<University | null>(null);
  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const universityData = await fetchUniversityById(universityId);
        setUniversity(universityData);
        const extracted = extractProgram(universityData, programId);
        setProgram(extracted);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load program details");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [universityId, programId]);

  if (loading) return <LoadingState label="Loading program details..." />;
  if (error) return <ErrorState message={error} />;
  if (!university || !program) {
    return (
      <EmptyState
        title="Program not found"
        description="The requested program could not be found."
      />
    );
  }

  const testScoreEntries = Object.entries(program.requirements.testScores);
  const hasRequirements =
    program.requirements.eligibility.length > 0 ||
    program.requirements.documents.length > 0 ||
    testScoreEntries.length > 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link to={routes.applicant.universityDetail(universityId)}>
        <Button variant="ghost" size="sm" className="w-full justify-start sm:w-auto">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to {university.name}
        </Button>
      </Link>

      <section className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
          <div className="brand-logo-mark flex h-16 w-16 items-center justify-center rounded-2xl text-lg font-semibold text-white shadow-lg">
            <GraduationCap className="h-8 w-8" />
          </div>
          <div className="flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2 sm:gap-3">
              <h1 className="text-2xl font-semibold sm:text-3xl">{program.name}</h1>
              {program.level ? (
                <Badge variant="secondary" className="brand-soft-badge">
                  {program.level}
                </Badge>
              ) : null}
            </div>
            <div className="mb-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground sm:gap-4">
              <span className="flex items-center gap-1.5">
                <School className="h-4 w-4" />
                {university.name}
              </span>
              {program.department ? (
                <span className="flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4" />
                  {program.department}
                </span>
              ) : null}
              {program.language ? (
                <span className="flex items-center gap-1.5">
                  <Languages className="h-4 w-4" />
                  {program.language}
                </span>
              ) : null}
              {program.duration ? (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {program.duration}
                </span>
              ) : null}
            </div>
            {program.faculty ? (
              <p className="text-muted-foreground">Faculty: {program.faculty}</p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <DollarSign className="mb-2 h-5 w-5 text-muted-foreground" />
            <div className="text-2xl font-semibold">
              {formatRmb(program.fees.tuitionPerYear, { fallback: "N/A" })}
            </div>
            <p className="text-xs text-muted-foreground">Tuition / Year</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Languages className="mb-2 h-5 w-5 text-muted-foreground" />
            <div className="text-2xl font-semibold">{program.language ?? "N/A"}</div>
            <p className="text-xs text-muted-foreground">Language</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Clock className="mb-2 h-5 w-5 text-muted-foreground" />
            <div className="text-2xl font-semibold">{program.duration ?? "N/A"}</div>
            <p className="text-xs text-muted-foreground">Duration</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <CalendarDays className="mb-2 h-5 w-5 text-muted-foreground" />
            <div className="text-2xl font-semibold">
              {program.deadlines[0]?.deadline ?? "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">Application Deadline</p>
          </CardContent>
        </Card>
      </section>

      <Tabs defaultValue="requirements" className="space-y-6">
        <TabsList className="flex w-full justify-start overflow-x-auto">
          <TabsTrigger value="requirements">Requirements</TabsTrigger>
          <TabsTrigger value="deadlines">Deadlines</TabsTrigger>
          <TabsTrigger value="costs">Costs & Fees</TabsTrigger>
          <TabsTrigger value="scholarships">Scholarships</TabsTrigger>
        </TabsList>

        <TabsContent value="requirements">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Eligibility & Documents
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!hasRequirements ? (
                  <p className="text-sm text-muted-foreground">
                    No specific requirements have been published for this program.
                  </p>
                ) : (
                  <>
                    {program.requirements.eligibility.length > 0 ? (
                      <div className="space-y-2">
                        <h4 className="font-medium text-slate-900">Eligibility Criteria</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                          {program.requirements.eligibility.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {program.requirements.documents.length > 0 ? (
                      <div className="space-y-2">
                        <h4 className="font-medium text-slate-900">Required Documents</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                          {program.requirements.documents.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Test Score Requirements
                </CardTitle>
              </CardHeader>
              <CardContent>
                {testScoreEntries.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {testScoreEntries.map(([test, score]) => (
                      <div key={test} className="rounded-lg bg-slate-50 px-4 py-3">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">
                          {test.toUpperCase()}
                        </div>
                        <div className="text-lg font-semibold text-slate-900">{score}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No minimum test scores have been specified for this program.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="deadlines">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                Application Deadlines
              </CardTitle>
            </CardHeader>
            <CardContent>
              {program.deadlines.length > 0 ? (
                <div className="space-y-4">
                  {program.deadlines.map((dl, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-slate-200 p-4"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <Badge variant="secondary" className="mb-2">
                            {dl.term}
                          </Badge>
                          <div className="text-lg font-semibold text-slate-900">
                            {dl.deadline}
                          </div>
                        </div>
                        {dl.deadlineIso ? (
                          <div className="text-sm text-muted-foreground">
                            ISO: {dl.deadlineIso}
                          </div>
                        ) : null}
                      </div>
                      {dl.applicationPeriod ? (
                        <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-muted-foreground">
                          <span className="font-medium text-slate-700">Application Period:</span>{" "}
                          {dl.applicationPeriod}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No specific deadlines have been published for this program.
                  Please check the university website for current application periods.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="costs">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Tuition & Fees
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-lg border border-slate-200 p-4">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    Tuition per Year
                  </div>
                  <div className="mt-1 text-2xl font-semibold text-slate-900">
                    {formatRmb(program.fees.tuitionPerYear, { fallback: "Not specified" })}
                  </div>
                  {program.fees.tuitionDescription ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {program.fees.tuitionDescription}
                    </p>
                  ) : null}
                </div>

                <div className="rounded-lg border border-slate-200 p-4">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    Application Fee
                  </div>
                  <div className="mt-1 text-2xl font-semibold text-slate-900">
                    {formatRmb(program.fees.applicationFee, { fallback: "Not specified" })}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 p-4">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    Program Level
                  </div>
                  <div className="mt-1 text-2xl font-semibold text-slate-900">
                    {program.level ?? "Bachelor"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scholarships">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                Available Scholarships
              </CardTitle>
            </CardHeader>
            <CardContent>
              {program.scholarships.length > 0 ? (
                <div className="space-y-4">
                  {program.scholarships.map((scholarship, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-slate-200 p-4"
                    >
                      <div className="font-medium text-slate-900">{scholarship.name}</div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {scholarship.description}
                      </p>
                      {scholarship.appliesTo ? (
                        <Badge variant="outline" className="mt-2">
                          {scholarship.appliesTo}
                        </Badge>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No specific scholarships have been listed for this program.
                  Please check the university website or contact the admissions office
                  for available funding opportunities.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
