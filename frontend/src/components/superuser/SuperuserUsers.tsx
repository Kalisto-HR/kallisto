// @ts-nocheck
import React, { useState } from 'react';
import { 
  Search, 
  User,
  Eye,
  Ban,
  Mail,
  Calendar,
  FileText,
  AlertCircle,
  CheckCircle,
  XCircle,
  Shield
} from 'lucide-react';

type UserStatus = 'active' | 'banned' | 'suspended';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: UserStatus;
  joinedDate: string;
  lastLogin: string;
  totalApplications: number;
  activeApplications: number;
  creditBalance: number;
  totalSpent: number;
}

interface SuperuserUsersProps {
  searchUserById?: (id: string) => Promise<UserProfile | null>;
  onCreateBanDraft?: (userId: string, reason: string, duration: string) => Promise<void> | void;
  summary?: {
    totalUsers?: string;
    activeUsers?: string;
    bannedUsers?: string;
    newToday?: string;
  };
}

export default function SuperuserUsers({ searchUserById, onCreateBanDraft, summary }: SuperuserUsersProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [showBanModal, setShowBanModal] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [banDuration, setBanDuration] = useState('permanent');

  // Mock user search
  const searchUser = async (id: string) => {
    if (searchUserById) {
      const found = await searchUserById(id);
      if (found) {
        setSelectedUser(found);
        return;
      }
      alert('User not found.');
      return;
    }

    if (id === 'USER-12345' || id === '12345') {
      setSelectedUser({
        id: 'USER-12345',
        name: 'Zhang Wei',
        email: 'zhangwei@example.com',
        phone: '+86 138-0000-1234',
        status: 'active',
        joinedDate: '2023-06-15',
        lastLogin: '2024-01-20 14:30',
        totalApplications: 8,
        activeApplications: 3,
        creditBalance: 12,
        totalSpent: 580
      });
    } else if (id === 'USER-45678' || id === '45678') {
      setSelectedUser({
        id: 'USER-45678',
        name: 'Wang Xiaoming',
        email: 'wxm@example.com',
        phone: '+86 139-1111-5678',
        status: 'banned',
        joinedDate: '2023-08-20',
        lastLogin: '2024-01-10 09:15',
        totalApplications: 25,
        activeApplications: 0,
        creditBalance: 0,
        totalSpent: 1250
      });
    } else {
      alert('User not found. Try USER-12345 or USER-45678');
    }
  };

  const getStatusBadge = (status: UserStatus) => {
    const styles = {
      active: 'bg-green-50 text-green-700 border-green-200',
      banned: 'bg-red-50 text-red-700 border-red-200',
      suspended: 'bg-orange-50 text-orange-700 border-orange-200',
    };

    const icons = {
      active: CheckCircle,
      banned: XCircle,
      suspended: AlertCircle,
    };

    const Icon = icons[status];

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status]}`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const handleBanSubmit = async () => {
    if (!banReason.trim()) {
      alert('Please provide a reason for banning this user.');
      return;
    }

    if (selectedUser && onCreateBanDraft) {
      await onCreateBanDraft(selectedUser.id, banReason, banDuration);
      alert(`Draft Created!\n\nType: Ban User\nUser: ${selectedUser.name} (${selectedUser.id})`);
    } else {
      // In real app, this would create a draft via API
      alert(`Draft Created!\n\nType: Ban User\nUser: ${selectedUser?.name} (${selectedUser?.id})\nReason: ${banReason}\nDuration: ${banDuration}\n\nThe draft is now pending approval in "Drafts & Approvals" page.`);
    }
    setShowBanModal(false);
    setBanReason('');
    setBanDuration('permanent');
  };

  return (
    <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#171717] mb-2">Users</h1>
        <p className="text-[#737373]">
          Search users by ID and manage user accounts
        </p>
      </div>

      {/* Search Card */}
      <div className="mb-6 rounded-xl border border-[#E5E5E5] bg-white p-4 sm:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-purple-600" />
            </div>
            <h2 className="text-xl font-semibold text-[#171717] mb-2">Search User by ID</h2>
            <p className="text-[#737373]">
              Enter a user ID to inspect profile data
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A3A3A3]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    void searchUser(searchQuery.trim());
                  }
                }}
                placeholder="Enter user ID (e.g., USER-12345 or 12345)"
                className="w-full pl-12 pr-4 py-3.5 border border-[#E5E5E5] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#171717] focus:border-transparent"
              />
            </div>
            <button
              onClick={() => searchQuery.trim() && void searchUser(searchQuery.trim())}
              className="px-6 py-3.5 bg-[#171717] text-white rounded-lg text-sm font-medium hover:bg-[#404040] transition-colors"
            >
              Search
            </button>
          </div>

          <div className="mt-4 text-sm text-[#737373]">
            <strong>Try:</strong> USER-12345 (Active) or USER-45678 (Banned)
          </div>
        </div>
      </div>

      {/* Platform Stats */}
      <div className="mb-6 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <div className="bg-white rounded-xl border border-[#E5E5E5] p-6">
          <div className="text-sm text-[#737373] mb-2">Total Users</div>
          <div className="text-2xl font-semibold text-[#171717]">{summary?.totalUsers ?? '45,892'}</div>
          <div className="text-xs text-[#A3A3A3] mt-2">Platform-wide</div>
        </div>

        <div className="bg-white rounded-xl border border-[#E5E5E5] p-6">
          <div className="text-sm text-[#737373] mb-2">Active Users</div>
          <div className="text-2xl font-semibold text-[#171717]">{summary?.activeUsers ?? '43,201'}</div>
          <div className="text-xs text-[#A3A3A3] mt-2">94.1% of total</div>
        </div>

        <div className="bg-white rounded-xl border border-[#E5E5E5] p-6">
          <div className="text-sm text-[#737373] mb-2">Banned Users</div>
          <div className="text-2xl font-semibold text-[#171717]">{summary?.bannedUsers ?? '127'}</div>
          <div className="text-xs text-[#A3A3A3] mt-2">Policy violations</div>
        </div>

        <div className="bg-white rounded-xl border border-[#E5E5E5] p-6">
          <div className="text-sm text-[#737373] mb-2">New Today</div>
          <div className="text-2xl font-semibold text-[#171717]">{summary?.newToday ?? '89'}</div>
          <div className="text-xs text-[#A3A3A3] mt-2">Last 24 hours</div>
        </div>
      </div>

      {/* User Profile Result */}
      {selectedUser && (
        <div className="bg-white rounded-xl border border-[#E5E5E5]">
          <div className="flex flex-col gap-3 border-b border-[#E5E5E5] p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-semibold">
                {selectedUser.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[#171717] mb-1">{selectedUser.name}</h2>
                <p className="text-sm text-[#737373] font-mono">{selectedUser.id}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {getStatusBadge(selectedUser.status)}
              {selectedUser.status === 'active' && (
                <button
                  onClick={() => setShowBanModal(true)}
                  className="px-4 py-2 border border-red-300 text-red-700 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors flex items-center gap-2"
                >
                  <Ban className="w-4 h-4" />
                  Ban User
                </button>
              )}
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Personal Information */}
            <div>
              <h3 className="font-medium text-[#171717] mb-4">Personal Information</h3>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div>
                  <label className="text-sm text-[#737373]">Email</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Mail className="w-4 h-4 text-[#737373]" />
                    <span className="text-sm text-[#171717]">{selectedUser.email}</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-[#737373]">Phone</label>
                  <div className="text-sm text-[#171717] mt-1">{selectedUser.phone}</div>
                </div>
                <div>
                  <label className="text-sm text-[#737373]">Status</label>
                  <div className="mt-1">{getStatusBadge(selectedUser.status)}</div>
                </div>
              </div>
            </div>

            {/* Account Activity */}
            <div>
              <h3 className="font-medium text-[#171717] mb-4">Account Activity</h3>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div>
                  <label className="text-sm text-[#737373]">Joined Date</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="w-4 h-4 text-[#737373]" />
                    <span className="text-sm text-[#171717]">{selectedUser.joinedDate}</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-[#737373]">Last Login</label>
                  <div className="text-sm text-[#171717] mt-1">{selectedUser.lastLogin}</div>
                </div>
                <div>
                  <label className="text-sm text-[#737373]">Credit Balance</label>
                  <div className="text-sm text-[#171717] mt-1">{selectedUser.creditBalance} credits</div>
                </div>
              </div>
            </div>

            {/* Application Statistics */}
            <div>
              <h3 className="font-medium text-[#171717] mb-4">Application Statistics</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="bg-[#FAFAFA] rounded-lg p-4">
                  <div className="text-sm text-[#737373] mb-1">Total Applications</div>
                  <div className="text-2xl font-semibold text-[#171717]">{selectedUser.totalApplications}</div>
                </div>
                <div className="bg-[#FAFAFA] rounded-lg p-4">
                  <div className="text-sm text-[#737373] mb-1">Active</div>
                  <div className="text-2xl font-semibold text-[#171717]">{selectedUser.activeApplications}</div>
                </div>
                <div className="bg-[#FAFAFA] rounded-lg p-4">
                  <div className="text-sm text-[#737373] mb-1">Total Spent</div>
                  <div className="text-2xl font-semibold text-[#171717]">¥{selectedUser.totalSpent}</div>
                </div>
                <div className="bg-[#FAFAFA] rounded-lg p-4">
                  <div className="text-sm text-[#737373] mb-1">Avg. per App</div>
                  <div className="text-2xl font-semibold text-[#171717]">
                    ¥{selectedUser.totalApplications > 0 ? Math.round(selectedUser.totalSpent / selectedUser.totalApplications) : 0}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 border-t border-[#E5E5E5] pt-4 md:flex-row">
              <button className="flex-1 px-4 py-2.5 border border-[#E5E5E5] rounded-lg text-sm font-medium text-[#171717] hover:bg-[#FAFAFA] transition-colors flex items-center justify-center gap-2">
                <Eye className="w-4 h-4" />
                View Full Profile
              </button>
              <button className="flex-1 px-4 py-2.5 border border-[#E5E5E5] rounded-lg text-sm font-medium text-[#171717] hover:bg-[#FAFAFA] transition-colors flex items-center justify-center gap-2">
                <FileText className="w-4 h-4" />
                View Applications
              </button>
              <button className="flex-1 px-4 py-2.5 bg-[#171717] text-white rounded-lg text-sm font-medium hover:bg-[#404040] transition-colors">
                Access User Data
              </button>
            </div>

            {selectedUser.status === 'banned' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-800">
                    <strong>Account Banned:</strong> This user has been permanently banned from the platform 
                    due to policy violations. Contact support for more details or to request a review.
                  </div>
                </div>
              </div>
            )}

            {selectedUser.status === 'active' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Read-Only Access:</strong> User profile data is displayed for inspection only. 
                  Banning a user requires creating a draft request for superuser approval.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!selectedUser && (
        <div className="bg-white rounded-xl border border-[#E5E5E5] p-12 text-center">
          <div className="w-16 h-16 bg-[#F5F5F5] rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-[#A3A3A3]" />
          </div>
          <h3 className="font-medium text-[#171717] mb-2">No User Selected</h3>
          <p className="text-[#737373] text-sm">
            Search for a user ID above to inspect their profile
          </p>
        </div>
      )}

      {/* Ban User Modal */}
      {showBanModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 sm:p-6">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6 border-b border-[#E5E5E5]">
              <h2 className="text-xl font-semibold text-[#171717]">Ban User</h2>
              <p className="text-sm text-[#737373] mt-1">
                This will create a DRAFT request for user ban
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800 mb-3">
                  <strong>Warning:</strong> You are about to request to ban the following user:
                </p>
                <div className="space-y-1 text-sm text-red-800">
                  <div><strong>User ID:</strong> {selectedUser.id}</div>
                  <div><strong>Name:</strong> {selectedUser.name}</div>
                  <div><strong>Email:</strong> {selectedUser.email}</div>
                  <div><strong>Total Applications:</strong> {selectedUser.totalApplications}</div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#171717] mb-2">
                  Reason for Ban *
                </label>
                <textarea
                  rows={3}
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="Explain why this user should be banned (policy violation, fraud, etc.)"
                  className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#171717] focus:border-transparent resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#171717] mb-2">
                  Ban Duration
                </label>
                <select
                  value={banDuration}
                  onChange={(e) => setBanDuration(e.target.value)}
                  className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#171717] focus:border-transparent"
                >
                  <option value="permanent">Permanent</option>
                  <option value="30days">30 Days</option>
                  <option value="90days">90 Days</option>
                  <option value="1year">1 Year</option>
                </select>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  This will create a draft request that requires superuser approval. 
                  The user will not be banned until the request is approved and executed.
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-[#E5E5E5] flex gap-3">
              <button
                onClick={() => setShowBanModal(false)}
                className="flex-1 px-4 py-2.5 border border-[#E5E5E5] rounded-lg text-sm font-medium text-[#171717] hover:bg-[#FAFAFA] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBanSubmit}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Create Ban Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
