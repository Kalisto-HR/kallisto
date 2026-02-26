// @ts-nocheck
import { Users, TrendingUp, Award, BookOpen, Bell, UserCheck, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { applicants } from '../../data/sampleData';

interface PortalDashboardProps {
  onNavigate?: (page: string) => void;
  variant?: 'default' | 'empty' | 'loading';
}

export function PortalDashboard({ onNavigate, variant = 'default' }: PortalDashboardProps) {
  // Calculate statistics from real applicants data
  const totalApplicants = applicants.length;
  const maleCount = applicants.filter(a => a.gender === 'Male').length;
  const femaleCount = applicants.filter(a => a.gender === 'Female').length;
  
  // Calculate averages from applicants with scores
  const applicantsWithSAT = applicants.filter(a => a.sat);
  const avgSAT = applicantsWithSAT.length > 0
    ? Math.round(applicantsWithSAT.reduce((sum, a) => sum + (a.sat || 0), 0) / applicantsWithSAT.length)
    : 0;
  
  const applicantsWithIELTS = applicants.filter(a => a.ielts);
  const avgIELTS = applicantsWithIELTS.length > 0
    ? (applicantsWithIELTS.reduce((sum, a) => sum + (a.ielts || 0), 0) / applicantsWithIELTS.length).toFixed(1)
    : '0.0';
  
  // New applications (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const newApplications = applicants.filter(a =>
    new Date(a.submittedDate) >= sevenDaysAgo
  ).length;

  const stats = {
    newApplications,
    totalApplicants,
    avgSAT,
    avgIELTS,
  };

  const genderDistribution = {
    male: maleCount,
    female: femaleCount,
  };

  // Get recent applications (last 10)
  const recentApplications = [...applicants]
    .sort((a, b) => new Date(b.submittedDate).getTime() - new Date(a.submittedDate).getTime())
    .slice(0, 10);

  const notifications = [
    { id: '1', type: 'application', message: `New application from ${applicants[0].name} for ${applicants[0].program}`, time: '2 hours ago', read: false },
    { id: '2', type: 'document', message: `Documents updated by ${applicants[1].name}`, time: '5 hours ago', read: false },
    { id: '3', type: 'status', message: `Application status changed for ${applicants[2].name}`, time: '1 day ago', read: true },
    { id: '4', type: 'application', message: `New application from ${applicants[3].name} for ${applicants[3].program}`, time: '2 days ago', read: true },
    { id: '5', type: 'document', message: `Transcript uploaded by ${applicants[4].name}`, time: '3 days ago', read: true },
  ];

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      new: { label: 'New', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
      reviewing: { label: 'Reviewing', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
      shortlisted: { label: 'Shortlisted', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
      interview: { label: 'Interview', className: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
      accepted: { label: 'Accepted', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
      rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    };
    return statusConfig[status] || statusConfig.new;
  };

  if (variant === 'empty') {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-semibold">Portal Dashboard</h1>
            <p className="text-muted-foreground mt-1">Welcome to your university application portal</p>
          </div>

          {/* Empty State */}
          <Card className="text-center py-16">
            <CardContent className="space-y-6">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#4F46E5] to-[#7C3AED]">
                <Users className="h-10 w-10 text-white" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold">No applications yet</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  When students apply to your programs, their applications will appear here. You can review, manage, and track all applications from this dashboard.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                <Button onClick={() => onNavigate?.('university-profile')} size="lg">
                  Complete university profile
                </Button>
                <Button variant="outline" size="lg" onClick={() => onNavigate?.('university-settings')}>
                  Configure settings
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Getting Started */}
          <div className="grid sm:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <BookOpen className="h-8 w-8 text-[#4F46E5] mb-2" />
                <CardTitle className="text-lg">Complete Profile</CardTitle>
                <CardDescription>Add your programs, requirements, and intake details</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <UserCheck className="h-8 w-8 text-[#4F46E5] mb-2" />
                <CardTitle className="text-lg">Set Criteria</CardTitle>
                <CardDescription>Define minimum GPA, test scores, and requirements</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <Bell className="h-8 w-8 text-[#4F46E5] mb-2" />
                <CardTitle className="text-lg">Enable Notifications</CardTitle>
                <CardDescription>Get notified when students apply to your programs</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'loading') {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold">Portal Dashboard</h1>
              <p className="text-muted-foreground mt-1">Overview of your applications and applicants</p>
            </div>
            <Button onClick={() => onNavigate?.('university-applicants')}>
              View all applicants
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">New Applications</CardTitle>
                <Users className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Last 7 days</p>
                <div className="mt-2">
                  <Badge variant="secondary" className="text-xs">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    +12% from last week
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Applicants</CardTitle>
                <Users className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">All time</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Average SAT</CardTitle>
                <Award className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Out of 1600</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Average IELTS</CardTitle>
                <Award className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Out of 9.0</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Gender Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Gender Distribution</CardTitle>
                <CardDescription>Applicant demographics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Male</span>
                    <span className="font-medium">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </span>
                  </div>
                  <Progress value={0} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Female</span>
                    <span className="font-medium">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </span>
                  </div>
                  <Progress value={0} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Notifications Preview */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Recent Notifications</CardTitle>
                    <CardDescription>Latest updates and alerts</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => onNavigate?.('university-notifications')}>
                    View all
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                        notification.read ? 'bg-background' : 'bg-accent/50'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{notification.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">{notification.time}</p>
                      </div>
                      {!notification.read && (
                        <div className="h-2 w-2 rounded-full bg-[#4F46E5] shrink-0 mt-1.5" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Applications */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Applications</CardTitle>
                  <CardDescription>Last 10 applications submitted</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => onNavigate?.('university-applicants')}>
                  View all
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Program</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentApplications.map((applicant) => {
                    const statusInfo = getStatusBadge(applicant.status);
                    return (
                      <TableRow key={applicant.id} className="cursor-pointer hover:bg-accent/50">
                        <TableCell>
                          <div>
                            <div className="font-medium">{applicant.name}</div>
                            <div className="text-sm text-muted-foreground">{applicant.citizenship}</div>
                          </div>
                        </TableCell>
                        <TableCell>{applicant.program}</TableCell>
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
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigate?.('university-applicant-detail');
                            }}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Portal Dashboard</h1>
            <p className="text-muted-foreground mt-1">Overview of your applications and applicants</p>
          </div>
          <Button onClick={() => onNavigate?.('university-applicants')}>
            View all applicants
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">New Applications</CardTitle>
              <Users className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{stats.newApplications}</div>
              <p className="text-xs text-muted-foreground mt-1">Last 7 days</p>
              <div className="mt-2">
                <Badge variant="secondary" className="text-xs">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +12% from last week
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Applicants</CardTitle>
              <Users className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{stats.totalApplicants}</div>
              <p className="text-xs text-muted-foreground mt-1">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Average SAT</CardTitle>
              <Award className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{stats.avgSAT}</div>
              <p className="text-xs text-muted-foreground mt-1">Out of 1600</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Average IELTS</CardTitle>
              <Award className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{stats.avgIELTS}</div>
              <p className="text-xs text-muted-foreground mt-1">Out of 9.0</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Gender Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Gender Distribution</CardTitle>
              <CardDescription>Applicant demographics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Male</span>
                  <span className="font-medium">{genderDistribution.male} ({((genderDistribution.male / stats.totalApplicants) * 100).toFixed(1)}%)</span>
                </div>
                <Progress value={(genderDistribution.male / stats.totalApplicants) * 100} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Female</span>
                  <span className="font-medium">{genderDistribution.female} ({((genderDistribution.female / stats.totalApplicants) * 100).toFixed(1)}%)</span>
                </div>
                <Progress value={(genderDistribution.female / stats.totalApplicants) * 100} className="h-2" />
              </div>
            </CardContent>
          </Card>

          {/* Notifications Preview */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Notifications</CardTitle>
                  <CardDescription>Latest updates and alerts</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => onNavigate?.('university-notifications')}>
                  View all
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                      notification.read ? 'bg-background' : 'bg-accent/50'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{notification.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">{notification.time}</p>
                    </div>
                    {!notification.read && (
                      <div className="h-2 w-2 rounded-full bg-[#4F46E5] shrink-0 mt-1.5" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Applications */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Applications</CardTitle>
                <CardDescription>Last 10 applications submitted</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => onNavigate?.('university-applicants')}>
                View all
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentApplications.map((applicant) => {
                  const statusInfo = getStatusBadge(applicant.status);
                  return (
                    <TableRow key={applicant.id} className="cursor-pointer hover:bg-accent/50">
                      <TableCell>
                        <div>
                          <div className="font-medium">{applicant.name}</div>
                          <div className="text-sm text-muted-foreground">{applicant.citizenship}</div>
                        </div>
                      </TableCell>
                      <TableCell>{applicant.program}</TableCell>
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
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigate?.('university-applicant-detail');
                          }}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
