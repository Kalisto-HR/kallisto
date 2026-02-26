// @ts-nocheck
import { Search, Filter, Download, ChevronDown, ArrowUpDown, MoreVertical, FileDown, SlidersHorizontal, Users } from 'lucide-react';
import { useState } from 'react';
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
import { applicants } from '../../data/sampleData';

interface PortalApplicantsListProps {
  onNavigate?: (page: string) => void;
  variant?: 'default' | 'empty';
}

export function PortalApplicantsList({ onNavigate, variant = 'default' }: PortalApplicantsListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [filterProgram, setFilterProgram] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCitizenship, setFilterCitizenship] = useState('all');
  const [filterIntake, setFilterIntake] = useState('all');

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Applicants</h1>
            <p className="text-muted-foreground mt-1">
              {filteredApplicants.length} {filteredApplicants.length === 1 ? 'applicant' : 'applicants'}
              {activeFiltersCount > 0 && ` (${activeFiltersCount} filter${activeFiltersCount > 1 ? 's' : ''} active)`}
            </p>
          </div>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {/* Search and Filters */}
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
                <SheetContent>
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
            {filteredApplicants.length > 0 ? (
              <div className="overflow-x-auto">
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredApplicants.map((applicant) => {
                      const statusInfo = getStatusBadge(applicant.status);
                      return (
                        <TableRow
                          key={applicant.id}
                          className="cursor-pointer hover:bg-accent/50"
                          onClick={() => onNavigate?.('university-applicant-detail')}
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
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
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
    </div>
  );
}
