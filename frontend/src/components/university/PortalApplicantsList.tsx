import {
  AlertCircle,
  CheckCircle2,
  Download,
  Eye,
  FileDown,
  FileText,
  Flag,
  MessageSquare,
  Search,
  SlidersHorizontal,
  UserCheck,
  Users,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Progress } from "../ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { usePartnerApplicantsData } from "../../hooks/usePartnerApplicantsData";
import { buildPartnerApplicationFileDownloadUrl } from "../../services/partner/submissionsService";
import type { SubmissionStatus } from "../../types/domain";
import { getApplicationStatusBadgeVariant, getApplicationStatusLabel } from "../../utils/applicationStatus";

type AdmissionsView = "all" | "new" | "under_review" | "missing" | "ready" | "accepted" | "flagged" | "unassigned";
type SortMode = "newest" | "oldest" | "name" | "status" | "progress";

const STATUS_FILTERS: Array<{ value: "all" | SubmissionStatus; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "submitted", label: "Submitted" },
  { value: "under_review", label: "Under review" },
  { value: "additional_information_required", label: "Additional information required" },
  { value: "decision_pending", label: "Decision pending" },
  { value: "accepted", label: "Accepted" },
  { value: "waitlisted", label: "Waitlisted" },
  { value: "rejected", label: "Rejected" },
];

const SAVED_VIEWS: Array<{ value: AdmissionsView; label: string; description: string }> = [
  { value: "all", label: "All applications", description: "Complete admissions queue" },
  { value: "new", label: "New applications", description: "Recently submitted" },
  { value: "under_review", label: "Under review", description: "Active committee review" },
  { value: "missing", label: "Missing information", description: "Requires applicant follow-up" },
  { value: "ready", label: "Ready for decision", description: "Review complete" },
  { value: "accepted", label: "Accepted", description: "Successful outcomes" },
  { value: "unassigned", label: "Unassigned", description: "Needs reviewer owner" },
  { value: "flagged", label: "Flagged", description: "Priority or risk indicators" },
];

function getDisplayName(source: Record<string, unknown>): string {
  const explicit = typeof source.name === "string" ? source.name.trim() : "";
  if (explicit) return explicit;
  const firstName = typeof source.first_name === "string" ? source.first_name.trim() : "";
  const lastName = typeof source.last_name === "string" ? source.last_name.trim() : "";
  return `${firstName} ${lastName}`.trim() || "Applicant";
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "A";
}

function formatBytes(size: unknown): string {
  if (typeof size !== "number" || Number.isNaN(size) || size <= 0) return "Unknown size";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function isFileLikeObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function collectDocuments(value: unknown, applicationId: string): Array<{ id: string; name: string; size: number; url: string; status: string; type: string }> {
  const documents: Array<{ id: string; name: string; size: number; url: string; status: string; type: string }> = [];
  const walk = (candidate: unknown, keyHint = "Document") => {
    if (Array.isArray(candidate)) {
      candidate.forEach((item) => walk(item, keyHint));
      return;
    }
    if (!isFileLikeObject(candidate)) return;
    const fileId = typeof candidate.id === "string" ? candidate.id : typeof candidate.file_id === "string" ? candidate.file_id : "";
    const fileName = typeof candidate.name === "string" ? candidate.name : typeof candidate.file_name === "string" ? candidate.file_name : "";
    if (fileId || fileName) {
      documents.push({
        id: fileId || `${applicationId}-${documents.length}`,
        name: fileName || "Uploaded file",
        size: typeof candidate.size === "number" ? candidate.size : typeof candidate.file_size === "number" ? candidate.file_size : 0,
        url: typeof candidate.download_url === "string" ? candidate.download_url : fileId ? buildPartnerApplicationFileDownloadUrl(applicationId, fileId) : "",
        status: typeof candidate.status === "string" ? candidate.status : "Uploaded",
        type: keyHint,
      });
      return;
    }
    Object.entries(candidate).forEach(([key, nested]) => walk(nested, key));
  };
  walk(value);
  return documents;
}

function renderValue(value: unknown, applicationId: string): ReactNode {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) {
    if (value.length === 0) return "—";
    return (
      <div className="space-y-2">
        {value.map((item, index) => (
          <div key={`${applicationId}-${index}`} className="rounded-md border p-3">
            {renderValue(item, applicationId)}
          </div>
        ))}
      </div>
    );
  }
  if (isFileLikeObject(value)) {
    const docs = collectDocuments(value, applicationId);
    if (docs.length > 0) {
      const doc = docs[0];
      return (
        <div className="rounded-md border p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium">{doc.name}</p>
              <p className="text-xs text-muted-foreground">{formatBytes(doc.size)}</p>
            </div>
            {doc.url ? (
              <Button asChild size="sm" variant="outline">
                <a href={doc.url} target="_blank" rel="noreferrer">
                  <FileDown className="mr-2 h-4 w-4" />
                  Open
                </a>
              </Button>
            ) : null}
          </div>
        </div>
      );
    }
    return (
      <div className="space-y-2 rounded-md border p-3">
        {Object.entries(value).map(([key, nestedValue]) => (
          <div key={key}>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{key}</p>
            <div className="text-sm">{renderValue(nestedValue, applicationId)}</div>
          </div>
        ))}
      </div>
    );
  }
  if (typeof value === "object") return "—";
  return String(value);
}

function createDownloadFileName(name: string, applicationId: string) {
  const normalizedName = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `${normalizedName || "application"}-${applicationId}.json`;
}

function getString(source: Record<string, unknown>, keys: string[], fallback = "—") {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number") return String(value);
  }
  return fallback;
}

function getDocumentProgress(documents: ReturnType<typeof collectDocuments>) {
  if (documents.length === 0) return 0;
  const approved = documents.filter((item) => ["approved", "uploaded", "Uploaded"].includes(item.status)).length;
  return Math.round((approved / documents.length) * 100);
}

function toTime(value: string | null) {
  return value ? new Date(value).getTime() : 0;
}

export function PortalApplicantsList() {
  const { t } = useTranslation(["common", "applications"]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | SubmissionStatus>("all");
  const [programFilter, setProgramFilter] = useState("all");
  const [savedView, setSavedView] = useState<AdmissionsView>("all");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { items, loading, error } = usePartnerApplicantsData();

  const rows = useMemo(() => items.map((item) => {
    const applicantInfo = item.applicantInfo ?? {};
    const applicationData = item.applicationData ?? {};
    const documents = collectDocuments(applicationData, item.id);
    const name = getDisplayName(applicantInfo);
    const program = getString(applicationData, ["program", "program_major", "first_choice_program"], getString(applicantInfo, ["program"], "General"));
    const reviewer = getString(applicationData, ["assigned_reviewer", "reviewer"], "Unassigned");
    const scholarship = String(applicationData.scholarship_consideration ?? "").toLowerCase() === "yes";
    const priority = scholarship || item.status === "additional_information_required" || item.status === "decision_pending";
    return {
      id: item.id,
      raw: item,
      name,
      initials: getInitials(name),
      email: getString(applicantInfo, ["email"]),
      phone: getString(applicantInfo, ["phone", "phone_number"]),
      citizenship: getString(applicantInfo, ["citizenship", "country"], getString(applicationData, ["citizenship"], "Unknown")),
      program,
      faculty: getString(applicationData, ["faculty"], "—"),
      degreeLevel: getString(applicationData, ["degree_level", "degreeLevel"], "—"),
      intake: getString(applicationData, ["preferred_intake", "intake"], item.applicationCycle),
      submittedAt: item.submittedAt ?? item.receivedAt,
      lastActivity: item.receivedAt,
      status: item.status,
      reviewProgress: item.statusProgress,
      documentProgress: getDocumentProgress(documents),
      reviewer,
      documents,
      priority,
      scholarship,
      matchScore: typeof applicationData.match_score === "number" ? applicationData.match_score : null,
      applicantInfo,
      applicationData,
    };
  }), [items]);

  const programs = useMemo(() => ["all", ...Array.from(new Set(rows.map((row) => row.program).filter(Boolean))).sort()], [rows]);

  const filteredRows = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    const filtered = rows.filter((row) => {
      const matchesSearch = !query || [row.name, row.email, row.phone, row.program, row.citizenship, row.id]
        .some((value) => value.toLowerCase().includes(query));
      const matchesStatus = statusFilter === "all" || row.status === statusFilter;
      const matchesProgram = programFilter === "all" || row.program === programFilter;
      const matchesView =
        savedView === "all" ||
        (savedView === "new" && row.status === "submitted") ||
        (savedView === "under_review" && row.status === "under_review") ||
        (savedView === "missing" && row.status === "additional_information_required") ||
        (savedView === "ready" && row.status === "decision_pending") ||
        (savedView === "accepted" && row.status === "accepted") ||
        (savedView === "unassigned" && row.reviewer === "Unassigned") ||
        (savedView === "flagged" && row.priority);
      return matchesSearch && matchesStatus && matchesProgram && matchesView;
    });

    return [...filtered].sort((left, right) => {
      if (sortMode === "oldest") return toTime(left.submittedAt) - toTime(right.submittedAt);
      if (sortMode === "name") return left.name.localeCompare(right.name);
      if (sortMode === "status") return left.status.localeCompare(right.status);
      if (sortMode === "progress") return right.reviewProgress - left.reviewProgress;
      return toTime(right.submittedAt) - toTime(left.submittedAt);
    });
  }, [programFilter, rows, savedView, searchQuery, sortMode, statusFilter]);

  const requestedApplicationId = searchParams.get("applicationId");
  const selectedRow = filteredRows.find((row) => row.id === requestedApplicationId) ?? rows.find((row) => row.id === requestedApplicationId) ?? null;
  const allVisibleSelected = filteredRows.length > 0 && filteredRows.every((row) => selectedIds.includes(row.id));

  const downloadSelectedApplication = () => {
    if (!selectedRow) return;
    const snapshot = {
      exported_at: new Date().toISOString(),
      application: {
        id: selectedRow.id,
        name: selectedRow.name,
        email: selectedRow.email,
        citizenship: selectedRow.citizenship,
        program: selectedRow.program,
        submitted_at: selectedRow.submittedAt,
        applicant_info: selectedRow.applicantInfo,
        application_data: selectedRow.applicationData,
      },
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = createDownloadFileName(selectedRow.name, selectedRow.id);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const openDetails = (applicationId: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("applicationId", applicationId);
    setSearchParams(next, { replace: true });
    setDetailsOpen(true);
  };

  const handleDetailsChange = (open: boolean) => {
    setDetailsOpen(open);
    if (!open) {
      const next = new URLSearchParams(searchParams);
      next.delete("applicationId");
      setSearchParams(next, { replace: true });
    }
  };

  const toggleSelected = (applicationId: string) => {
    setSelectedIds((current) =>
      current.includes(applicationId) ? current.filter((id) => id !== applicationId) : [...current, applicationId],
    );
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <Badge className="brand-soft-badge" variant="secondary">Admissions CRM</Badge>
            <h1 className="mt-3 text-3xl font-semibold">Applications</h1>
            <p className="mt-1 max-w-3xl text-muted-foreground">
              Manage applicant review, documents, flags, reviewer ownership, and decision readiness from one queue.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" disabled={selectedIds.length === 0}>
              <UserCheck className="mr-2 h-4 w-4" />
              Assign reviewer
            </Button>
            <Button variant="outline" size="sm" disabled={selectedIds.length === 0}>
              <Flag className="mr-2 h-4 w-4" />
              Bulk flag
            </Button>
            <Button variant="outline" size="sm" onClick={downloadSelectedApplication} disabled={!selectedRow}>
              <Download className="mr-2 h-4 w-4" />
              Export selected
            </Button>
          </div>
        </div>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard label="Total" value={rows.length} helper="Applications loaded" />
          <MetricCard label="Under review" value={rows.filter((row) => row.status === "under_review").length} helper="Committee workflow" />
          <MetricCard label="Missing info" value={rows.filter((row) => row.status === "additional_information_required").length} helper="Student action needed" />
          <MetricCard label="Decision pending" value={rows.filter((row) => row.status === "decision_pending").length} helper="Ready for outcome" />
        </div>

        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <SlidersHorizontal className="h-4 w-4" />
              Saved views
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {SAVED_VIEWS.map((view) => (
                <button
                  key={view.value}
                  type="button"
                  onClick={() => setSavedView(view.value)}
                  className={`rounded-lg border p-3 text-left transition ${savedView === view.value ? "border-primary bg-primary/6" : "hover:border-primary/30"}`}
                >
                  <div className="text-sm font-medium">{view.label}</div>
                  <div className="text-xs text-muted-foreground">{view.description}</div>
                </button>
              ))}
            </div>
            <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="pl-9"
                  placeholder="Search applicant, email, phone, ID, or program..."
                />
              </div>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_FILTERS.map((status) => (
                    <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={programFilter} onValueChange={setProgramFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {programs.map((program) => (
                    <SelectItem key={program} value={program}>{program === "all" ? "All programs" : program}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sortMode} onValueChange={(value) => setSortMode(value as SortMode)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest first</SelectItem>
                  <SelectItem value="oldest">Oldest first</SelectItem>
                  <SelectItem value="name">Applicant name</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="progress">Review progress</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Application Queue</CardTitle>
            <CardDescription>
              {loading ? "Loading applications..." : `${filteredRows.length} applications in this view`}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-10 text-center text-sm text-muted-foreground">Loading applications...</div>
            ) : filteredRows.length === 0 ? (
              <div className="p-10 text-center">
                <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No applications match the current filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <input
                          type="checkbox"
                          checked={allVisibleSelected}
                          onChange={() => setSelectedIds(allVisibleSelected ? [] : filteredRows.map((row) => row.id))}
                          aria-label="Select all visible applications"
                        />
                      </TableHead>
                      <TableHead>Applicant</TableHead>
                      <TableHead>Program</TableHead>
                      <TableHead>Intake</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Documents</TableHead>
                      <TableHead>Review</TableHead>
                      <TableHead>Reviewer</TableHead>
                      <TableHead>Match</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(row.id)}
                            onChange={() => toggleSelected(row.id)}
                            aria-label={`Select ${row.name}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                              {row.initials}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 font-medium">
                                {row.name}
                                {row.priority ? <Flag className="h-3.5 w-3.5 text-amber-500" /> : null}
                              </div>
                              <div className="text-xs text-muted-foreground">{row.email}</div>
                              <div className="text-[11px] text-muted-foreground">ID {row.id.slice(0, 8)}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{row.program}</div>
                          <div className="text-xs text-muted-foreground">{row.degreeLevel} · {row.faculty}</div>
                        </TableCell>
                        <TableCell>{row.intake}</TableCell>
                        <TableCell>
                          <Badge variant={getApplicationStatusBadgeVariant(row.status)}>
                            {getApplicationStatusLabel(t, row.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="min-w-36">
                          <Progress value={row.documentProgress} className="h-2" />
                          <div className="mt-1 text-xs text-muted-foreground">{row.documentProgress}% · {row.documents.length} files</div>
                        </TableCell>
                        <TableCell className="min-w-36">
                          <Progress value={row.reviewProgress} className="h-2" />
                          <div className="mt-1 text-xs text-muted-foreground">{row.reviewProgress}% complete</div>
                        </TableCell>
                        <TableCell>{row.reviewer}</TableCell>
                        <TableCell>{row.matchScore === null ? "—" : `${row.matchScore}/100`}</TableCell>
                        <TableCell>
                          {new Date(row.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => openDetails(row.id)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Open
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Sheet open={detailsOpen || Boolean(selectedRow)} onOpenChange={handleDetailsChange}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-5xl">
          <SheetHeader>
            <SheetTitle>Application Workspace</SheetTitle>
            <SheetDescription>Review answers, documents, messages, and activity without losing queue context.</SheetDescription>
          </SheetHeader>

          {selectedRow ? (
            <div className="mt-6 space-y-6">
              <Card>
                <CardContent className="space-y-4 pt-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
                        {selectedRow.initials}
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold">{selectedRow.name}</h3>
                        <p className="text-sm text-muted-foreground">{selectedRow.email} · {selectedRow.phone}</p>
                        <p className="text-xs text-muted-foreground">Application ID {selectedRow.id}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={getApplicationStatusBadgeVariant(selectedRow.status)}>
                        {getApplicationStatusLabel(t, selectedRow.status)}
                      </Badge>
                      {selectedRow.priority ? <Badge variant="secondary">Flagged</Badge> : null}
                      {selectedRow.scholarship ? <Badge variant="outline">Scholarship</Badge> : null}
                    </div>
                  </div>
                  <div className="grid gap-3 text-sm md:grid-cols-4">
                    <SummaryItem label="Program" value={selectedRow.program} />
                    <SummaryItem label="Degree / intake" value={`${selectedRow.degreeLevel} · ${selectedRow.intake}`} />
                    <SummaryItem label="Reviewer" value={selectedRow.reviewer} />
                    <SummaryItem label="Submitted" value={new Date(selectedRow.submittedAt).toLocaleString()} />
                  </div>
                </CardContent>
              </Card>

              <Tabs defaultValue="overview">
                <TabsList className="overflow-x-auto">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="form">Application Form</TabsTrigger>
                  <TabsTrigger value="documents">Documents</TabsTrigger>
                  <TabsTrigger value="reviews">Reviews</TabsTrigger>
                  <TabsTrigger value="messages">Messages</TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="space-y-4 pt-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <WorkspaceCard icon={FileText} title="Document completion" value={`${selectedRow.documentProgress}%`} helper={`${selectedRow.documents.length} uploaded files`} />
                    <WorkspaceCard icon={UserCheck} title="Review progress" value={`${selectedRow.reviewProgress}%`} helper={selectedRow.reviewer} />
                    <WorkspaceCard icon={AlertCircle} title="Missing information" value={selectedRow.status === "additional_information_required" ? "Required" : "Clear"} helper="Based on current status" />
                  </div>
                  <Card>
                    <CardHeader><CardTitle className="text-base">Admissions checklist</CardTitle></CardHeader>
                    <CardContent className="grid gap-3 md:grid-cols-2">
                      {[
                        ["Application submitted", true],
                        ["Required fields completed", selectedRow.reviewProgress >= 25],
                        ["Required documents uploaded", selectedRow.documentProgress >= 80],
                        ["Reviewer assigned", selectedRow.reviewer !== "Unassigned"],
                        ["Review completed", selectedRow.reviewProgress >= 100],
                        ["Final decision recorded", ["accepted", "waitlisted", "rejected"].includes(selectedRow.status)],
                      ].map(([label, complete]) => (
                        <div key={String(label)} className="flex items-center gap-2 rounded-lg border p-3 text-sm">
                          <CheckCircle2 className={`h-4 w-4 ${complete ? "text-green-600" : "text-muted-foreground"}`} />
                          {label}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="form" className="space-y-4 pt-4">
                  <AnswerSection title="Applicant Info" data={selectedRow.applicantInfo} applicationId={selectedRow.id} />
                  <AnswerSection title="Application Data" data={selectedRow.applicationData} applicationId={selectedRow.id} />
                </TabsContent>
                <TabsContent value="documents" className="space-y-4 pt-4">
                  <Progress value={selectedRow.documentProgress} className="h-2" />
                  <Card>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Document</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Size</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedRow.documents.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No uploaded documents found in this submission.</TableCell></TableRow>
                          ) : selectedRow.documents.map((doc) => (
                            <TableRow key={doc.id}>
                              <TableCell className="font-medium">{doc.name}</TableCell>
                              <TableCell>{doc.type}</TableCell>
                              <TableCell>{formatBytes(doc.size)}</TableCell>
                              <TableCell><Badge variant="secondary">{doc.status}</Badge></TableCell>
                              <TableCell className="text-right">
                                {doc.url ? <Button asChild size="sm" variant="outline"><a href={doc.url} target="_blank" rel="noreferrer">Preview</a></Button> : null}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="reviews" className="space-y-4 pt-4">
                  <PlaceholderPanel icon={UserCheck} title="Reviewer workflow" description="Reviewer scoring, confidential comments, and recommendations are ready for backend assignment endpoints." />
                </TabsContent>
                <TabsContent value="messages" className="space-y-4 pt-4">
                  <PlaceholderPanel icon={MessageSquare} title="Applicant messages" description="Use this workspace for information requests, document replacement requests, and status notification previews." />
                </TabsContent>
                <TabsContent value="activity" className="space-y-4 pt-4">
                  <PlaceholderPanel icon={FileText} title="Activity timeline" description="Status history and application events will appear here as the backend returns activity records." />
                </TabsContent>
              </Tabs>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function MetricCard({ label, value, helper }: { label: string; value: number; helper: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-3xl font-semibold">{value}</div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{helper}</p>
      </CardContent>
    </Card>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function WorkspaceCard({ icon: Icon, title, value, helper }: { icon: typeof FileText; title: string; value: string; helper: string }) {
  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <div className="rounded-lg bg-accent p-2 w-fit"><Icon className="h-4 w-4 text-accent-foreground" /></div>
        <div className="text-2xl font-semibold">{value}</div>
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{helper}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function AnswerSection({ title, data, applicationId }: { title: string; data: Record<string, unknown>; applicationId: string }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        {Object.entries(data).length === 0 ? (
          <p className="text-sm text-muted-foreground">No answers stored.</p>
        ) : Object.entries(data).map(([key, value]) => (
          <div key={key} className="rounded-lg border p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{key}</p>
            <div className="mt-1 text-sm">{renderValue(value, applicationId)}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function PlaceholderPanel({ icon: Icon, title, description }: { icon: typeof FileText; title: string; description: string }) {
  return (
    <div className="rounded-lg border border-dashed p-8 text-center">
      <Icon className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
      <h3 className="font-medium">{title}</h3>
      <p className="mx-auto mt-1 max-w-xl text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
