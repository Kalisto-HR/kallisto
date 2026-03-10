// @ts-nocheck
import { Search, Filter, Download, ChevronDown, ArrowUpDown, MoreVertical, FileDown, SlidersHorizontal, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../ui/sheet';
import { useParams, useSearchParams } from 'react-router-dom';
import { useManagementApplicantsData } from '../../hooks/useManagementApplicantsData';

interface PortalApplicantsListProps {
  onNavigate?: (page: string) => void;
  variant?: 'default' | 'empty';
}

export function PortalApplicantsList({ onNavigate, variant = 'default' }: PortalApplicantsListProps) {
  const { universityId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { items, loading, error, review } = useManagementApplicantsData(universityId);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [filterProgram, setFilterProgram] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCitizenship, setFilterCitizenship] = useState('all');
  const [filterIntake, setFilterIntake] = useState('all');
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [reviewBusyId, setReviewBusyId] = useState(null);
  const [reviewError, setReviewError] = useState(null);
  const requestedApplicationId = searchParams.get('applicationId');

  const formatBytes = (size) => {
    if (typeof size !== 'number' || Number.isNaN(size) || size <= 0) {
      return 'Unknown size';
    }
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const isPrimitive = (value) => (
    value === null ||
    value === undefined ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );

  const normalizeFileLike = (value, applicationId) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    const file = value;
    const id = typeof file.id === 'string'
      ? file.id
      : typeof file.file_id === 'string'
        ? file.file_id
        : typeof file.fileId === 'string'
          ? file.fileId
          : '';
    const storage = typeof file.storage === 'string' ? file.storage : '';
    const name = typeof file.name === 'string'
      ? file.name
      : typeof file.file_name === 'string'
        ? file.file_name
        : typeof file.fileName === 'string'
          ? file.fileName
          : 'Uploaded file';
    const type = typeof file.type === 'string'
      ? file.type
      : typeof file.content_type === 'string'
        ? file.content_type
        : typeof file.contentType === 'string'
          ? file.contentType
          : 'application/octet-stream';
    const size = typeof file.size === 'number'
      ? file.size
      : typeof file.file_size === 'number'
        ? file.file_size
        : typeof file.fileSize === 'number'
          ? file.fileSize
          : 0;
    const urlCandidates = [
      file.url,
      file.download_url,
      file.downloadUrl,
      file.signed_url,
      file.signedUrl,
      file.data_url,
      file.dataUrl,
    ];
    let previewUrl = urlCandidates.find((candidate) => typeof candidate === 'string' && candidate.trim() !== '') ?? null;
    if (!previewUrl && storage === 'application_file' && id && applicationId) {
      previewUrl = `/adminapi/v1.0/applications/${applicationId}/files/${id}/download`;
    }

    return {
      id,
      name,
      type,
      size,
      previewUrl,
      lastModified: typeof file.lastModified === 'number' ? file.lastModified : null,
    };
  };

  const isFileLikeObject = (value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return false;
    }
    const file = value;
    const hasName =
      (typeof file.name === 'string' && file.name.trim() !== '') ||
      (typeof file.file_name === 'string' && file.file_name.trim() !== '') ||
      (typeof file.fileName === 'string' && file.fileName.trim() !== '');
    const hasMimeType =
      (typeof file.type === 'string' && file.type.includes('/')) ||
      (typeof file.content_type === 'string' && file.content_type.includes('/')) ||
      (typeof file.contentType === 'string' && file.contentType.includes('/'));
    const hasSize =
      typeof file.size === 'number' ||
      typeof file.file_size === 'number' ||
      typeof file.fileSize === 'number';
    const hasUrl =
      typeof file.url === 'string' ||
      typeof file.download_url === 'string' ||
      typeof file.downloadUrl === 'string' ||
      typeof file.signed_url === 'string' ||
      typeof file.signedUrl === 'string' ||
      typeof file.data_url === 'string' ||
      typeof file.dataUrl === 'string';
    return hasName || hasMimeType || hasSize || hasUrl;
  };

  const renderFileCard = (file, key, applicationId) => {
    const normalized = normalizeFileLike(file, applicationId);
    if (!normalized) {
      return null;
    }
    const previewUrl = normalized.previewUrl;
    const fileType = normalized.type || 'Unknown type';
    const fileName = normalized.name || 'Uploaded file';
    const isImage = fileType.startsWith('image/') && !!previewUrl;

    return (
      <div key={key} className="rounded-lg border bg-card p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium break-all">{fileName}</p>
            <p className="text-xs text-muted-foreground">{fileType}</p>
          </div>
          <Badge variant="outline">{formatBytes(normalized.size)}</Badge>
        </div>

        {isImage ? (
          <div className="rounded-md border overflow-hidden bg-muted/20">
            <img src={previewUrl} alt={fileName} className="h-32 w-full object-cover" />
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={!previewUrl}
            onClick={() => {
              if (!previewUrl) {
                return;
              }
              window.open(previewUrl, '_blank', 'noopener,noreferrer');
            }}
          >
            {previewUrl ? 'Open File' : 'No Preview URL'}
          </Button>
          {typeof normalized.lastModified === 'number' ? (
            <span className="text-xs text-muted-foreground">
              Updated {new Date(normalized.lastModified).toLocaleDateString('en-US')}
            </span>
          ) : null}
        </div>
      </div>
    );
  };

  const renderValue = (value, depth = 0, applicationId) => {
    if (depth > 3) {
      return (
        <pre className="whitespace-pre-wrap break-all text-xs bg-muted/40 rounded-md p-2">
          {JSON.stringify(value, null, 2)}
        </pre>
      );
    }

    if (value === null || value === undefined || value === '') {
      return '—';
    }

    if (isPrimitive(value)) {
      return String(value);
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <span className="text-sm text-muted-foreground">No items</span>;
      }

      if (value.every((item) => isFileLikeObject(item))) {
        return (
          <div className="grid gap-2 md:grid-cols-2">
            {value.map((file, index) => renderFileCard(file, `file-${index}`, applicationId))}
          </div>
        );
      }

      if (value.every((item) => isPrimitive(item))) {
        return (
          <div className="flex flex-wrap gap-2">
            {value.map((item, index) => (
              <Badge key={`value-${index}`} variant="secondary">
                {String(item)}
              </Badge>
            ))}
          </div>
        );
      }

      return (
          <div className="space-y-2">
            {value.map((item, index) => (
              <div key={`nested-${index}`} className="rounded-md border p-2">
                {renderValue(item, depth + 1, applicationId)}
              </div>
            ))}
          </div>
      );
    }

    if (isFileLikeObject(value)) {
      return renderFileCard(value, 'file-single', applicationId);
    }

    if (typeof value === 'object') {
      const entries = Object.entries(value);
      if (entries.length === 0) {
        return <span className="text-sm text-muted-foreground">No fields</span>;
      }
      return (
        <div className="space-y-2 rounded-md border p-3 bg-muted/10">
          {entries.map(([nestedKey, nestedValue]) => (
            <div key={nestedKey}>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{nestedKey}</p>
              <div className="text-sm">{renderValue(nestedValue, depth + 1, applicationId)}</div>
            </div>
          ))}
        </div>
      );
    }

    return String(value);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      new: { label: 'New', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
      reviewing: { label: 'Reviewing', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
      shortlisted: { label: 'Shortlisted', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
      interview: { label: 'Interview', className: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
      accepted: { label: 'Accepted', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
      rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
      waitlisted: { label: 'Waitlisted', className: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400' },
    };
    return statusConfig[status] || statusConfig.new;
  };

  const syncLocalApplicantStatus = (applicationId, nextStatus) => {
    const normalizedStatus = nextStatus === 'pending' ? 'new' : nextStatus;
    setSelectedApplicant((current) => {
      if (!current || current.id !== applicationId) {
        return current;
      }
      return {
        ...current,
        reviewStatus: nextStatus,
        status: normalizedStatus,
      };
    });
  };

  const handleReview = async (event, applicant, nextStatus) => {
    event.stopPropagation();
    setReviewBusyId(applicant.id);
    setReviewError(null);
    try {
      await review(applicant.id, nextStatus);
      syncLocalApplicantStatus(applicant.id, nextStatus);
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'Failed to update application status');
    } finally {
      setReviewBusyId(null);
    }
  };

  const canReviewApplicant = (applicant) =>
    applicant.reviewStatus === 'pending' || applicant.reviewStatus === 'reviewing';

  const applicants = items.map((item) => {
    const applicantInfo = item.applicantInfo ?? {};
    const applicationData = item.applicationData ?? {};
    const normalizedName = String(
      applicantInfo.name ??
      `${applicantInfo.first_name ?? ''} ${applicantInfo.last_name ?? ''}`
    ).trim();
    return {
      id: item.id,
      name: normalizedName || 'Applicant',
      gender: String(applicantInfo.gender ?? applicationData.gender ?? 'Unknown'),
      citizenship: String(applicantInfo.citizenship ?? 'Unknown'),
      program: String(applicationData.program ?? applicantInfo.program ?? 'General'),
      gpa: Number(applicationData.gpa ?? applicantInfo.gpa ?? 0) || 0,
      sat: Number(applicationData.sat ?? applicantInfo.sat ?? 0) || 0,
      ielts: Number(applicationData.ielts ?? applicantInfo.ielts ?? 0) || 0,
      reviewStatus: item.status,
      status: item.status === 'pending' ? 'new' : item.status,
      intake: String(item.applicationCycle ?? 'Unknown'),
      submittedDate: item.submittedAt ?? item.receivedAt,
      applicantInfo,
      applicationData,
    };
  });

  const openApplicantDetails = (applicant) => {
    setSelectedApplicant(applicant);
    setDetailsOpen(true);
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set('applicationId', applicant.id);
    setSearchParams(nextSearchParams, { replace: true });
  };

  const handleDetailsOpenChange = (open) => {
    setDetailsOpen(open);
    if (!open) {
      const nextSearchParams = new URLSearchParams(searchParams);
      nextSearchParams.delete('applicationId');
      setSearchParams(nextSearchParams, { replace: true });
    }
  };

  // Filter and sort
  let filteredApplicants = applicants
    .filter((a) =>
      (searchQuery === '' ||
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.program.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.citizenship.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (filterProgram === 'all' || a.program === filterProgram) &&
      (filterStatus === 'all' || a.status === filterStatus) &&
      (filterCitizenship === 'all' || a.citizenship === filterCitizenship) &&
      (filterIntake === 'all' || a.intake === filterIntake)
    );

  // Sorting
  if (sortBy === 'newest') {
    filteredApplicants.sort((a, b) => new Date(b.submittedDate).getTime() - new Date(a.submittedDate).getTime());
  } else if (sortBy === 'gpa') {
    filteredApplicants.sort((a, b) => b.gpa - a.gpa);
  } else if (sortBy === 'sat') {
    filteredApplicants.sort((a, b) => (b.sat || 0) - (a.sat || 0));
  } else if (sortBy === 'ielts') {
    filteredApplicants.sort((a, b) => (b.ielts || 0) - (a.ielts || 0));
  }

  const activeFiltersCount = [filterProgram, filterStatus, filterCitizenship, filterIntake].filter(
    (f) => f !== 'all'
  ).length;

  useEffect(() => {
    if (!requestedApplicationId || applicants.length === 0) {
      return;
    }
    const matchingApplicant = applicants.find((applicant) => applicant.id === requestedApplicationId);
    if (!matchingApplicant) {
      return;
    }
    if (selectedApplicant?.id === matchingApplicant.id && detailsOpen) {
      return;
    }
    setSelectedApplicant(matchingApplicant);
    setDetailsOpen(true);
  }, [requestedApplicationId, applicants, selectedApplicant?.id, detailsOpen]);

  if (variant === 'empty') {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-semibold">Applicants</h1>
            <p className="text-muted-foreground mt-1">Manage and review all applicants</p>
          </div>

          {/* Empty State */}
          <Card className="text-center py-16">
            <CardContent className="space-y-6">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#4F46E5] to-[#7C3AED]">
                <Users className="h-10 w-10 text-white" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold">No applicants yet</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  When students apply to your programs, they will appear here. You can search, filter, and review all applications from this page.
                </p>
              </div>
              <Button onClick={() => onNavigate?.('university-dashboard')}>
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Applicants</h1>
            <p className="text-muted-foreground mt-1">
              {filteredApplicants.length} {filteredApplicants.length === 1 ? 'applicant' : 'applicants'}
              {activeFiltersCount > 0 && ` (${activeFiltersCount} filter${activeFiltersCount > 1 ? 's' : ''} active)`}
            </p>
          </div>
          <Button variant="outline" size="sm" className="w-full sm:w-auto">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {/* Search and Filters */}
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        {reviewError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {reviewError}
          </div>
        ) : null}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search by name, major, or citizenship..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Sort */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full lg:w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest first</SelectItem>
                  <SelectItem value="gpa">Highest GPA</SelectItem>
                  <SelectItem value="sat">Highest SAT</SelectItem>
                  <SelectItem value="ielts">Highest IELTS</SelectItem>
                </SelectContent>
              </Select>

              {/* Filters Sheet */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="relative">
                    <SlidersHorizontal className="mr-2 h-4 w-4" />
                    Filters
                    {activeFiltersCount > 0 && (
                      <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                        {activeFiltersCount}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent className="overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Filter Applicants</SheetTitle>
                    <SheetDescription>Apply filters to narrow down your search</SheetDescription>
                  </SheetHeader>
                  <div className="space-y-6 mt-6">
                    <div className="space-y-2">
                      <Label htmlFor="filter-program">Program</Label>
                      <Select value={filterProgram} onValueChange={setFilterProgram}>
                        <SelectTrigger id="filter-program">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Programs</SelectItem>
                          <SelectItem value="Computer Science">Computer Science</SelectItem>
                          <SelectItem value="Business Administration">Business Administration</SelectItem>
                          <SelectItem value="Data Science">Data Science</SelectItem>
                          <SelectItem value="Engineering">Engineering</SelectItem>
                          <SelectItem value="Psychology">Psychology</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="filter-status">Status</Label>
                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger id="filter-status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Statuses</SelectItem>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="reviewing">Reviewing</SelectItem>
                          <SelectItem value="shortlisted">Shortlisted</SelectItem>
                          <SelectItem value="interview">Interview</SelectItem>
                          <SelectItem value="accepted">Accepted</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                          <SelectItem value="waitlisted">Waitlisted</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="filter-citizenship">Citizenship</Label>
                      <Select value={filterCitizenship} onValueChange={setFilterCitizenship}>
                        <SelectTrigger id="filter-citizenship">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Countries</SelectItem>
                          <SelectItem value="China">China</SelectItem>
                          <SelectItem value="USA">USA</SelectItem>
                          <SelectItem value="India">India</SelectItem>
                          <SelectItem value="UK">UK</SelectItem>
                          <SelectItem value="Spain">Spain</SelectItem>
                          <SelectItem value="South Korea">South Korea</SelectItem>
                          <SelectItem value="Mexico">Mexico</SelectItem>
                          <SelectItem value="Egypt">Egypt</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="filter-intake">Intake Term</Label>
                      <Select value={filterIntake} onValueChange={setFilterIntake}>
                        <SelectTrigger id="filter-intake">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Intakes</SelectItem>
                          <SelectItem value="Spring 2025">Spring 2025</SelectItem>
                          <SelectItem value="Fall 2025">Fall 2025</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setFilterProgram('all');
                        setFilterStatus('all');
                        setFilterCitizenship('all');
                        setFilterIntake('all');
                      }}
                    >
                      Clear all filters
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </CardContent>
        </Card>

        {/* Applicants Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 text-center text-muted-foreground">Loading applicants...</div>
            ) : filteredApplicants.length > 0 ? (
              <>
                <div className="space-y-3 p-4 md:hidden">
                {filteredApplicants.map((applicant) => {
                  const statusInfo = getStatusBadge(applicant.status);
                  return (
                    <div
                      key={applicant.id}
                      className="rounded-lg border p-4 space-y-3"
                      onClick={() => openApplicantDetails(applicant)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium">{applicant.name}</div>
                          <div className="text-sm text-muted-foreground">{applicant.citizenship}</div>
                        </div>
                        <Badge variant="secondary" className={statusInfo.className}>
                          {statusInfo.label}
                        </Badge>
                      </div>
                      <div className="grid gap-2 text-sm sm:grid-cols-2">
                        <div>
                          <div className="text-xs text-muted-foreground">Program</div>
                          <div>{applicant.program}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Submitted</div>
                          <div>{new Date(applicant.submittedDate).toLocaleDateString('en-US')}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">GPA</div>
                          <div>{applicant.gpa.toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">SAT / IELTS</div>
                          <div>{applicant.sat || '—'} / {applicant.ielts ? applicant.ielts.toFixed(1) : '—'}</div>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="w-full">
                        View details
                      </Button>
                      {canReviewApplicant(applicant) ? (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {applicant.reviewStatus !== 'reviewing' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(event) => void handleReview(event, applicant, 'reviewing')}
                              disabled={reviewBusyId === applicant.id}
                            >
                              Mark Reviewing
                            </Button>
                          ) : null}
                          <Button
                            size="sm"
                            onClick={(event) => void handleReview(event, applicant, 'accepted')}
                            disabled={reviewBusyId === applicant.id}
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={(event) => void handleReview(event, applicant, 'rejected')}
                            disabled={reviewBusyId === applicant.id}
                          >
                            Reject
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
                <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Gender</TableHead>
                      <TableHead>Citizenship</TableHead>
                      <TableHead>Intended Major</TableHead>
                      <TableHead>GPA</TableHead>
                      <TableHead>SAT</TableHead>
                      <TableHead>IELTS</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead className="w-[220px] text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredApplicants.map((applicant) => {
                      const statusInfo = getStatusBadge(applicant.status);
                      return (
                        <TableRow
                          key={applicant.id}
                          className="cursor-pointer hover:bg-accent/50"
                          onClick={() => openApplicantDetails(applicant)}
                        >
                          <TableCell className="font-medium">{applicant.name}</TableCell>
                          <TableCell className="text-muted-foreground">{applicant.gender}</TableCell>
                          <TableCell className="text-muted-foreground">{applicant.citizenship}</TableCell>
                          <TableCell>{applicant.program}</TableCell>
                          <TableCell className="font-medium">{applicant.gpa.toFixed(2)}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {applicant.sat || '—'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {applicant.ielts ? applicant.ielts.toFixed(1) : '—'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={statusInfo.className}>
                              {statusInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(applicant.submittedDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </TableCell>
                          <TableCell className="w-[220px]">
                            <div className="flex justify-end gap-2">
                              {canReviewApplicant(applicant) && applicant.reviewStatus !== 'reviewing' ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(event) => void handleReview(event, applicant, 'reviewing')}
                                  disabled={reviewBusyId === applicant.id}
                                >
                                  Review
                                </Button>
                              ) : null}
                              {canReviewApplicant(applicant) ? (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={(event) => void handleReview(event, applicant, 'accepted')}
                                    disabled={reviewBusyId === applicant.id}
                                  >
                                    Accept
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                    onClick={(event) => void handleReview(event, applicant, 'rejected')}
                                    disabled={reviewBusyId === applicant.id}
                                  >
                                    Reject
                                  </Button>
                                </>
                              ) : null}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openApplicantDetails(applicant);
                                }}
                              >
                                View
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                </div>
              </>
            ) : (
              <div className="p-12 text-center">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No applicants found matching your criteria</p>
                <Button
                  variant="ghost"
                  className="mt-4"
                  onClick={() => {
                    setSearchQuery('');
                    setFilterProgram('all');
                    setFilterStatus('all');
                    setFilterCitizenship('all');
                    setFilterIntake('all');
                  }}
                >
                  Clear all filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Sheet open={detailsOpen} onOpenChange={handleDetailsOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Application Details</SheetTitle>
            <SheetDescription>
              Review applicant profile and submitted application payload.
            </SheetDescription>
          </SheetHeader>

          {selectedApplicant ? (
            <div className="mt-6 space-y-6">
              <Card>
                <CardContent className="pt-6 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold">{selectedApplicant.name}</h3>
                      <p className="text-sm text-muted-foreground">{selectedApplicant.citizenship}</p>
                    </div>
                    <Badge variant="secondary" className={getStatusBadge(selectedApplicant.status).className}>
                      {getStatusBadge(selectedApplicant.status).label}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Program</p>
                      <p className="font-medium">{selectedApplicant.program}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Intake</p>
                      <p className="font-medium">{selectedApplicant.intake}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Submitted</p>
                      <p className="font-medium">
                        {new Date(selectedApplicant.submittedDate).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Email</p>
                      <p className="font-medium">{String(selectedApplicant.applicantInfo?.email ?? '—')}</p>
                    </div>
                  </div>
                  {canReviewApplicant(selectedApplicant) ? (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {selectedApplicant.reviewStatus !== 'reviewing' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(event) => void handleReview(event, selectedApplicant, 'reviewing')}
                          disabled={reviewBusyId === selectedApplicant.id}
                        >
                          Mark Reviewing
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        onClick={(event) => void handleReview(event, selectedApplicant, 'accepted')}
                        disabled={reviewBusyId === selectedApplicant.id}
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={(event) => void handleReview(event, selectedApplicant, 'rejected')}
                        disabled={reviewBusyId === selectedApplicant.id}
                      >
                        Reject
                      </Button>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Applicant Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(selectedApplicant.applicantInfo ?? {}).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No applicant info provided.</p>
                  ) : (
                    Object.entries(selectedApplicant.applicantInfo ?? {}).map(([key, value]) => (
                      <div key={key}>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">{key}</p>
                        <div className="text-sm">{renderValue(value, 0, selectedApplicant.id)}</div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Application Data</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(selectedApplicant.applicationData ?? {}).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No application data provided.</p>
                  ) : (
                    Object.entries(selectedApplicant.applicationData ?? {}).map(([key, value]) => (
                      <div key={key}>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">{key}</p>
                        <div className="text-sm">{renderValue(value, 0, selectedApplicant.id)}</div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
