// @ts-nocheck
import { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { 
  Users, 
  Plus, 
  MoreVertical, 
  Search,
  Filter,
  UserPlus,
  Shield,
  Mail,
  Clock,
  Calendar,
  X,
  Eye,
  Edit,
  UserX,
  FileText,
  ChevronRight,
  Activity,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { cn } from '../ui/utils';
import type { ManagementContext } from '../../types/managementLiteral';
import { useManagementStaffData } from '../../hooks/useManagementStaffData';

interface UsersStaffProps {
  onNavigate?: (page: string) => void;
  context?: ManagementContext;
  userRole?: 'university-manager' | 'superuser';
}

type TabView = 'staff-accounts' | 'roles-permissions' | 'invitations';

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'suspended' | 'pending';
  lastActive: string;
  createdDate: string;
  avatarUrl?: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
  userCount: number;
  permissions: string[];
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  sentDate: string;
  expiresDate: string;
  status: 'pending' | 'accepted' | 'expired';
}

export function UsersStaff({ onNavigate, context, userRole = 'university-manager' }: UsersStaffProps) {
  const [currentTab, setCurrentTab] = useState<TabView>('staff-accounts');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [showStaffDrawer, setShowStaffDrawer] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const isSuperuser = userRole === 'superuser';
  const universityId = context?.type === 'university' ? context.universityId : undefined;
  const universityName = context?.type === 'university' ? context.universityName : 'Stanford University';
  const { payload, loading, createStaff, editStaff, setStaffStatus, resendInvite, setQuery } = useManagementStaffData(universityId);

  // Mock staff data
  const mockStaffMembers: StaffMember[] = [
    {
      id: 'staff-1',
      name: 'Sarah Chen',
      email: 'sarah.chen@stanford.edu',
      role: 'University Manager',
      status: 'active',
      lastActive: '2024-01-21',
      createdDate: '2023-06-15'
    },
    {
      id: 'staff-2',
      name: 'Michael Rodriguez',
      email: 'm.rodriguez@stanford.edu',
      role: 'Admissions Officer',
      status: 'active',
      lastActive: '2024-01-20',
      createdDate: '2023-08-01'
    },
    {
      id: 'staff-3',
      name: 'Emily Thompson',
      email: 'e.thompson@stanford.edu',
      role: 'Reviewer',
      status: 'active',
      lastActive: '2024-01-19',
      createdDate: '2023-09-10'
    },
    {
      id: 'staff-4',
      name: 'David Kim',
      email: 'd.kim@stanford.edu',
      role: 'Admissions Officer',
      status: 'suspended',
      lastActive: '2023-12-15',
      createdDate: '2023-05-20'
    },
    {
      id: 'staff-5',
      name: 'Jessica Martinez',
      email: 'j.martinez@stanford.edu',
      role: 'Read-only',
      status: 'pending',
      lastActive: 'Never',
      createdDate: '2024-01-18'
    }
  ];

  // Mock roles data
  const mockRoles: Role[] = [
    {
      id: 'role-1',
      name: 'University Manager',
      description: 'Full access to university settings and applications',
      userCount: 1,
      permissions: ['Manage staff', 'Edit university profile', 'View all applications', 'Approve decisions', 'Access analytics']
    },
    {
      id: 'role-2',
      name: 'Admissions Officer',
      description: 'Review and manage applications',
      userCount: 2,
      permissions: ['View applications', 'Review applications', 'Submit recommendations', 'Access analytics']
    },
    {
      id: 'role-3',
      name: 'Reviewer',
      description: 'Review applications only',
      userCount: 1,
      permissions: ['View applications', 'Review applications', 'Submit recommendations']
    },
    {
      id: 'role-4',
      name: 'Read-only',
      description: 'View-only access to applications and reports',
      userCount: 1,
      permissions: ['View applications', 'Access analytics']
    }
  ];

  // Mock invitations data
  const mockInvitations: Invitation[] = [
    {
      id: 'inv-1',
      email: 'new.staff@stanford.edu',
      role: 'Reviewer',
      sentDate: '2024-01-15',
      expiresDate: '2024-01-22',
      status: 'pending'
    },
    {
      id: 'inv-2',
      email: 'another.person@stanford.edu',
      role: 'Admissions Officer',
      sentDate: '2024-01-10',
      expiresDate: '2024-01-17',
      status: 'expired'
    }
  ];

  const handleViewStaff = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setShowStaffDrawer(true);
    setShowActionMenu(null);
  };

  const staffMembers: StaffMember[] = loading
    ? mockStaffMembers
    : payload.items.map((item) => ({
      id: item.id,
      name: `${item.firstName} ${item.lastName}`.trim(),
      email: item.email,
      role: item.staffRole,
      status: item.status === 'deactivated' ? 'suspended' : item.status,
      lastActive: item.lastActiveAt ? new Date(item.lastActiveAt).toLocaleDateString('en-US') : 'Never',
      createdDate: new Date(item.createdAt).toLocaleDateString('en-US'),
    }));
  const roles: Role[] = loading
    ? mockRoles
    : payload.roles.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      userCount: item.userCount,
      permissions: item.permissions,
    }));
  const invitations: Invitation[] = loading
    ? mockInvitations
    : payload.invitations.map((item) => ({
      id: item.id,
      email: item.email,
      role: item.staffRole,
      sentDate: new Date(item.createdAt).toLocaleDateString('en-US'),
      expiresDate: new Date(item.expiresAt).toLocaleDateString('en-US'),
      status: item.status === 'cancelled' ? 'expired' : item.status,
    }));

  const handleRequestChange = async (action: string, staffId?: string) => {
    setActionBusy(true);
    setActionError(null);
    try {
      if (action.includes('Create') || action.includes('Send invitation') || action.includes('Request staff change')) {
        const email = window.prompt('Staff email');
        const firstName = window.prompt('First name');
        const lastName = window.prompt('Last name');
        const password = window.prompt('Temporary password (min 8 chars)');
        if (!email || !firstName || !lastName || !password) return;
        await createStaff({
          email,
          firstName,
          lastName,
          password,
          staffRole: 'Admissions Officer',
          status: 'active',
        });
      } else if (action.includes('Change role') || action.includes('Edit role') || action.includes('Request role change')) {
        if (!staffId) return;
        const role = window.prompt('New role (University Manager, Admissions Officer, Reviewer, Read-only)');
        if (!role) return;
        await editStaff(staffId, { staffRole: role as any });
      } else if (action.includes('Disable')) {
        if (!staffId) return;
        await setStaffStatus(staffId, 'suspended', 'Disabled from Users & Staff page');
      } else if (action.includes('Resend invitation')) {
        if (!staffId) return;
        await resendInvite(staffId);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setShowActionMenu(null);
      setActionBusy(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-50 text-green-700 border-green-200',
      suspended: 'bg-red-50 text-red-700 border-red-200',
      pending: 'bg-orange-50 text-orange-700 border-orange-200'
    };
    const icons = {
      active: <CheckCircle2 className="w-3 h-3 mr-1" />,
      suspended: <XCircle className="w-3 h-3 mr-1" />,
      pending: <AlertCircle className="w-3 h-3 mr-1" />
    };
    return (
      <Badge variant="outline" className={cn('flex items-center w-fit', styles[status as keyof typeof styles] || styles.active)}>
        {icons[status as keyof typeof icons]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getRoleBadge = (role: string) => {
    const styles: Record<string, string> = {
      'University Manager': 'bg-purple-50 text-purple-700 border-purple-200',
      'Admissions Officer': 'bg-blue-50 text-blue-700 border-blue-200',
      'Reviewer': 'bg-cyan-50 text-cyan-700 border-cyan-200',
      'Read-only': 'bg-gray-50 text-gray-700 border-gray-200'
    };
    return (
      <Badge variant="outline" className={styles[role] || 'bg-gray-50 text-gray-700 border-gray-200'}>
        {role}
      </Badge>
    );
  };

  const filteredStaff = staffMembers.filter(staff => {
    const matchesSearch = staff.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         staff.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || staff.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || staff.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">University: {universityName}</span>
            </div>
            <h1 className="text-3xl font-semibold">Users & Staff</h1>
            <p className="text-muted-foreground mt-1">
              Manage staff access for this university.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void handleRequestChange('Create staff account')} disabled={actionBusy}>
              <UserPlus className="h-4 w-4 mr-2" />
              {actionBusy ? 'Working...' : 'Create Staff Account'}
            </Button>
            <Button variant="outline" onClick={() => void handleRequestChange('Disable account')} disabled={actionBusy}>
              <UserX className="h-4 w-4 mr-2" />
              Disable Account
            </Button>
          </div>
        </div>
        {actionError && <p className="text-sm text-red-600">{actionError}</p>}

        {/* Tabs */}
        <div className="border-b">
          <div className="flex gap-6">
            <button
              onClick={() => setCurrentTab('staff-accounts')}
              className={cn(
                'pb-3 px-1 border-b-2 transition-colors',
                currentTab === 'staff-accounts'
                  ? 'border-[#4F46E5] text-foreground font-medium'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              Staff Accounts
            </button>
            <button
              onClick={() => setCurrentTab('roles-permissions')}
              className={cn(
                'pb-3 px-1 border-b-2 transition-colors',
                currentTab === 'roles-permissions'
                  ? 'border-[#4F46E5] text-foreground font-medium'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              Roles & Permissions
            </button>
            <button
              onClick={() => setCurrentTab('invitations')}
              className={cn(
                'pb-3 px-1 border-b-2 transition-colors',
                currentTab === 'invitations'
                  ? 'border-[#4F46E5] text-foreground font-medium'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              Invitations
            </button>
          </div>
        </div>

        {/* Staff Accounts Tab */}
        {currentTab === 'staff-accounts' && (
          <div className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-3">
                  {/* Search */}
                  <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setQuery((prev) => ({ ...prev, search: e.target.value, page: 1 }));
                        }}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                      />
                    </div>
                  </div>

                  {/* Role Filter */}
                  <select
                    value={roleFilter}
                    onChange={(e) => {
                      setRoleFilter(e.target.value);
                      setQuery((prev) => ({ ...prev, role: e.target.value as any, page: 1 }));
                    }}
                    className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                  >
                    <option value="all">All Roles</option>
                    <option value="University Manager">University Manager</option>
                    <option value="Admissions Officer">Admissions Officer</option>
                    <option value="Reviewer">Reviewer</option>
                    <option value="Read-only">Read-only</option>
                  </select>

                  {/* Status Filter */}
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setQuery((prev) => ({ ...prev, status: e.target.value as any, page: 1 }));
                    }}
                    className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Staff Table */}
            {filteredStaff.length > 0 ? (
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-accent/50 border-b">
                        <tr>
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Name</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Email</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Role</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Last Active</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Created Date</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStaff.map((staff) => (
                          <tr
                            key={staff.id}
                            onClick={() => handleViewStaff(staff)}
                            className="border-b hover:bg-accent/30 transition-colors cursor-pointer"
                          >
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                  {staff.name.charAt(0)}
                                </div>
                                <span className="font-medium">{staff.name}</span>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-sm text-muted-foreground">{staff.email}</td>
                            <td className="py-4 px-4">{getRoleBadge(staff.role)}</td>
                            <td className="py-4 px-4">{getStatusBadge(staff.status)}</td>
                            <td className="py-4 px-4 text-sm">{staff.lastActive}</td>
                            <td className="py-4 px-4 text-sm">{staff.createdDate}</td>
                            <td className="py-4 px-4 text-center">
                              <div className="relative inline-block">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowActionMenu(showActionMenu === staff.id ? null : staff.id);
                                  }}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                                {showActionMenu === staff.id && (
                                  <div className="absolute right-0 top-full mt-1 w-56 bg-white border rounded-lg shadow-lg z-10">
                                    <div className="py-1">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleViewStaff(staff);
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm hover:bg-accent flex items-center gap-2"
                                      >
                                        <Eye className="h-4 w-4" />
                                        View Profile
                                      </button>
                                      {isSuperuser ? (
                                        <>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              void handleRequestChange('Change role', staff.id);
                                            }}
                                            className="w-full text-left px-4 py-2 text-sm hover:bg-accent flex items-center gap-2"
                                          >
                                            <Edit className="h-4 w-4" />
                                            Change Role
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              void handleRequestChange('Disable account', staff.id);
                                            }}
                                            className="w-full text-left px-4 py-2 text-sm hover:bg-accent flex items-center gap-2 text-red-600"
                                          >
                                            <UserX className="h-4 w-4" />
                                            Disable Account
                                          </button>
                                        </>
                                      ) : (
                                        <>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              void handleRequestChange('Change role', staff.id);
                                            }}
                                            className="w-full text-left px-4 py-2 text-sm hover:bg-accent flex items-center gap-2"
                                          >
                                            <FileText className="h-4 w-4" />
                                            Change Role
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              void handleRequestChange('Disable account', staff.id);
                                            }}
                                            className="w-full text-left px-4 py-2 text-sm hover:bg-accent flex items-center gap-2 text-red-600"
                                          >
                                            <FileText className="h-4 w-4" />
                                            Disable Account
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No staff members found</h3>
                  <p className="text-muted-foreground mb-6">
                    {searchQuery || roleFilter !== 'all' || statusFilter !== 'all'
                      ? 'Try adjusting your filters'
                      : 'Get started by creating your first staff account'}
                  </p>
                  <Button onClick={() => void handleRequestChange('Create staff account')} disabled={actionBusy}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Create Staff Account
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Roles & Permissions Tab */}
        {currentTab === 'roles-permissions' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Roles & Permissions</CardTitle>
                <CardDescription>
                  Manage roles and their associated permissions
                  {!isSuperuser && ' (read-only for University Managers)'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {roles.map((role) => (
                  <Card key={role.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <CardTitle className="text-lg">{role.name}</CardTitle>
                            <Badge variant="secondary">{role.userCount} {role.userCount === 1 ? 'user' : 'users'}</Badge>
                          </div>
                          <CardDescription>{role.description}</CardDescription>
                        </div>
                        {isSuperuser && (
                          <Button variant="outline" size="sm" onClick={() => void handleRequestChange('Edit role', role.id)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Role
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="text-sm font-medium mb-3">Permissions:</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {role.permissions.map((permission, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm">
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                              <span>{permission}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Invitations Tab */}
        {currentTab === 'invitations' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Pending Invitations</CardTitle>
                    <CardDescription>Manage staff invitations</CardDescription>
                  </div>
                  <Button onClick={() => void handleRequestChange('Send invitation')} disabled={actionBusy}>
                    <Mail className="h-4 w-4 mr-2" />
                    Send Invitation
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {invitations.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b">
                        <tr>
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Email</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Role</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Sent Date</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Expires</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invitations.map((invitation) => (
                          <tr key={invitation.id} className="border-b hover:bg-accent/30 transition-colors">
                            <td className="py-4 px-4 font-medium">{invitation.email}</td>
                            <td className="py-4 px-4">{getRoleBadge(invitation.role)}</td>
                            <td className="py-4 px-4 text-sm">{invitation.sentDate}</td>
                            <td className="py-4 px-4 text-sm">{invitation.expiresDate}</td>
                            <td className="py-4 px-4">
                              <Badge variant="outline" className={
                                invitation.status === 'pending' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                invitation.status === 'expired' ? 'bg-red-50 text-red-700 border-red-200' :
                                'bg-green-50 text-green-700 border-green-200'
                              }>
                                {invitation.status.charAt(0).toUpperCase() + invitation.status.slice(1)}
                              </Badge>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                {invitation.status === 'pending' && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        const linkedStaff = staffMembers.find((staff) => staff.email === invitation.email);
                                        if (!linkedStaff) {
                                          setActionError('Cannot resend invitation: matching staff account not found');
                                          return;
                                        }
                                        void handleRequestChange('Resend invitation', linkedStaff.id);
                                      }}
                                    >
                                      Resend
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => void handleRequestChange('Disable account', staffMembers.find((staff) => staff.email === invitation.email)?.id)}>
                                      Cancel
                                    </Button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No pending invitations</h3>
                    <p className="text-muted-foreground mb-6">
                      Send invitations to add new staff members
                    </p>
                    <Button onClick={() => void handleRequestChange('Send invitation')} disabled={actionBusy}>
                      <Mail className="h-4 w-4 mr-2" />
                      Send Invitation
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Staff Detail Drawer */}
      {showStaffDrawer && selectedStaff && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end" onClick={() => setShowStaffDrawer(false)}>
          <div
            className="w-full max-w-2xl bg-white h-full overflow-y-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between z-10">
              <h2 className="text-2xl font-semibold">Staff Details</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowStaffDrawer(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="p-6 space-y-6">
              {/* Profile Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Profile Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white text-2xl font-medium">
                      {selectedStaff.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">{selectedStaff.name}</h3>
                      <p className="text-muted-foreground">{selectedStaff.email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Role</div>
                      {getRoleBadge(selectedStaff.role)}
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Status</div>
                      {getStatusBadge(selectedStaff.status)}
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Last Active</div>
                      <div className="font-medium">{selectedStaff.lastActive}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Created</div>
                      <div className="font-medium">{selectedStaff.createdDate}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Role & Permissions */}
              <Card>
                <CardHeader>
                  <CardTitle>Role & Permissions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {roles.find(r => r.name === selectedStaff.role)?.permissions.map((permission, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                        <span>{permission}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Activity Log */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                      <div className="flex-1">
                        <div className="text-sm font-medium">Reviewed application #A2024-1234</div>
                        <div className="text-xs text-muted-foreground">2024-01-20 14:30</div>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500 mt-2" />
                      <div className="flex-1">
                        <div className="text-sm font-medium">Logged in to portal</div>
                        <div className="text-xs text-muted-foreground">2024-01-20 09:15</div>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-purple-500 mt-2" />
                      <div className="flex-1">
                        <div className="text-sm font-medium">Updated profile settings</div>
                        <div className="text-xs text-muted-foreground">2024-01-19 16:45</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Draft History */}
              <Card>
                <CardHeader>
                  <CardTitle>Draft History</CardTitle>
                  <CardDescription>Changes requested for this staff member</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    No draft history available
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

