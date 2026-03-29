import { Download, FileDown, Search, Users } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { usePartnerApplicantsData } from "../../hooks/usePartnerApplicantsData";
import { buildPartnerApplicationFileDownloadUrl } from "../../services/partner/submissionsService";

interface PortalApplicantsListProps {
  onNavigate?: (page: string) => void;
}

function getDisplayName(source: Record<string, unknown>): string {
  const explicit = typeof source.name === "string" ? source.name.trim() : "";
  if (explicit) {
    return explicit;
  }

  const firstName = typeof source.first_name === "string" ? source.first_name.trim() : "";
  const lastName = typeof source.last_name === "string" ? source.last_name.trim() : "";
  return `${firstName} ${lastName}`.trim() || "Applicant";
}

function formatBytes(size: unknown): string {
  if (typeof size !== "number" || Number.isNaN(size) || size <= 0) {
    return "Unknown size";
  }
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function isFileLikeObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function renderValue(value: unknown, applicationId: string): ReactNode {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "—";
    }
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
    const fileId = typeof value.id === "string" ? value.id : typeof value.file_id === "string" ? value.file_id : "";
    const fileName =
      typeof value.name === "string"
        ? value.name
        : typeof value.file_name === "string"
          ? value.file_name
          : "Uploaded file";
    const fileSize =
      typeof value.size === "number"
        ? value.size
        : typeof value.file_size === "number"
          ? value.file_size
          : 0;
    const url =
      typeof value.download_url === "string"
        ? value.download_url
        : fileId
          ? buildPartnerApplicationFileDownloadUrl(applicationId, fileId)
          : "";

    return (
      <div className="rounded-md border p-3">
        <div className="mb-2 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium">{fileName}</p>
            <p className="text-xs text-muted-foreground">{formatBytes(fileSize)}</p>
          </div>
          {url ? (
            <Button asChild size="sm" variant="outline">
              <a href={url} target="_blank" rel="noreferrer">
                <FileDown className="mr-2 h-4 w-4" />
                Open
              </a>
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  if (typeof value === "object") {
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

  return String(value);
}

export function PortalApplicantsList({ onNavigate }: PortalApplicantsListProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { items, loading, error } = usePartnerApplicantsData();

  const rows = useMemo(() => items.map((item) => {
    const applicantInfo = item.applicantInfo ?? {};
    const applicationData = item.applicationData ?? {};
    return {
      id: item.id,
      name: getDisplayName(applicantInfo),
      citizenship: String(applicantInfo.citizenship ?? applicationData.citizenship ?? "Unknown"),
      program: String(applicationData.program ?? applicantInfo.program ?? "General"),
      email: String(applicantInfo.email ?? "—"),
      submittedAt: item.submittedAt ?? item.receivedAt,
      applicantInfo,
      applicationData,
    };
  }), [items]);

  const filteredRows = rows.filter((row) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) {
      return true;
    }
    return (
      row.name.toLowerCase().includes(query) ||
      row.program.toLowerCase().includes(query) ||
      row.citizenship.toLowerCase().includes(query) ||
      row.email.toLowerCase().includes(query)
    );
  });

  const requestedApplicationId = searchParams.get("applicationId");
  const selectedRow = filteredRows.find((row) => row.id === requestedApplicationId) ?? rows.find((row) => row.id === requestedApplicationId) ?? null;

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

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Submissions</h1>
            <p className="mt-1 text-muted-foreground">
              Review submitted applicant records without in-product verdict actions.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => onNavigate?.("partner-dashboard")}>
            <Download className="mr-2 h-4 w-4" />
            Return to dashboard
          </Button>
        </div>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-9"
                placeholder="Search by applicant, program, email, or citizenship..."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Submitted Applications</CardTitle>
            <CardDescription>
              {loading ? "Loading submissions..." : `${filteredRows.length} submissions available`}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-10 text-center text-sm text-muted-foreground">Loading submissions...</div>
            ) : filteredRows.length === 0 ? (
              <div className="p-10 text-center">
                <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No submissions match the current search.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Applicant</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Citizenship</TableHead>
                      <TableHead>Program</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell>{row.email}</TableCell>
                        <TableCell>{row.citizenship}</TableCell>
                        <TableCell>{row.program}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">Submitted</Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(row.submittedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => openDetails(row.id)}>
                            View
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
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Submission Details</SheetTitle>
            <SheetDescription>
              Review the submitted payload and any attached files.
            </SheetDescription>
          </SheetHeader>

          {selectedRow ? (
            <div className="mt-6 space-y-6">
              <Card>
                <CardContent className="space-y-3 pt-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold">{selectedRow.name}</h3>
                      <p className="text-sm text-muted-foreground">{selectedRow.email}</p>
                    </div>
                    <Badge variant="secondary">Submitted</Badge>
                  </div>
                  <div className="grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <p className="text-muted-foreground">Program</p>
                      <p className="font-medium">{selectedRow.program}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Citizenship</p>
                      <p className="font-medium">{selectedRow.citizenship}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Submitted</p>
                      <p className="font-medium">
                        {new Date(selectedRow.submittedAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Applicant Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(selectedRow.applicantInfo).map(([key, value]) => (
                    <div key={key}>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{key}</p>
                      <div className="text-sm">{renderValue(value, selectedRow.id)}</div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Application Data</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(selectedRow.applicationData).map(([key, value]) => (
                    <div key={key}>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{key}</p>
                      <div className="text-sm">{renderValue(value, selectedRow.id)}</div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
