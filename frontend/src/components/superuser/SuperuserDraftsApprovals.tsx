// @ts-nocheck
import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  FileCheck,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  MessageSquare,
  GitCompare,
  Calendar,
  User,
  Building2,
  UserCog,
  Ban,
  Edit,
  ChevronRight,
  AlertCircle
} from 'lucide-react';

type DraftType = 
  | 'create-mgmt-account'
  | 'delete-mgmt-account'
  | 'university-profile-update'
  | 'ban-user'
  | 'suspend-university'
  | 'restore-university';

type DraftStatus = 'pending' | 'approved' | 'rejected' | 'executed';

interface Draft {
  id: string;
  type: DraftType;
  status: DraftStatus;
  title: string;
  description: string;
  requester: string;
  requesterEmail: string;
  targetEntity: string;
  targetId: string;
  createdAt: string;
  reviewedAt?: string;
  executedAt?: string;
  reviewedBy?: string;
  priority: 'low' | 'medium' | 'high';
  changes?: {
    field: string;
    before: string;
    after: string;
  }[];
  comments: number;
}

interface SuperuserDraftsApprovalsProps {
  draftsData?: Draft[];
  onApproveDraft?: (draftId: string, notes?: string) => Promise<void> | void;
  onRejectDraft?: (draftId: string, reason: string) => Promise<void> | void;
}

export default function SuperuserDraftsApprovals({
  draftsData,
  onApproveDraft,
  onRejectDraft,
}: SuperuserDraftsApprovalsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<DraftType | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<DraftStatus | 'all'>('all');
  const [selectedDraft, setSelectedDraft] = useState<Draft | null>(null);

  const drafts: Draft[] = draftsData ?? [
    {
      id: 'DR-2024-001',
      type: 'create-mgmt-account',
      status: 'pending',
      title: 'Create Management Account for Fudan University',
      description: 'New admin account request for admin@fudan.edu.cn',
      requester: 'System',
      requesterEmail: 'system@damen.com',
      targetEntity: 'admin@fudan.edu.cn',
      targetId: 'UNI-003',
      createdAt: '2024-01-20 09:30',
      priority: 'high',
      comments: 2,
      changes: [
        { field: 'Email', before: '-', after: 'admin@fudan.edu.cn' },
        { field: 'Name', before: '-', after: 'Chen Hao' },
        { field: 'Role', before: '-', after: 'Admin' },
        { field: 'University', before: '-', after: 'Fudan University (UNI-003)' }
      ]
    },
    {
      id: 'DR-2024-002',
      type: 'university-profile-update',
      status: 'pending',
      title: 'Update Profile for Zhejiang University',
      description: 'Requested profile changes to acceptance rate and program details',
      requester: 'admin@zju.edu.cn',
      requesterEmail: 'admin@zju.edu.cn',
      targetEntity: 'Zhejiang University',
      targetId: 'UNI-005',
      createdAt: '2024-01-20 08:15',
      priority: 'medium',
      comments: 5,
      changes: [
        { field: 'Acceptance Rate', before: '9.5%', after: '9.3%' },
        { field: 'Application Deadline', before: '2024-03-31', after: '2024-04-15' },
        { field: 'Tuition Fee', before: '¥25,000/year', after: '¥28,000/year' }
      ]
    },
    {
      id: 'DR-2024-003',
      type: 'ban-user',
      status: 'pending',
      title: 'Ban User #45678 for Policy Violation',
      description: 'User reported for multiple policy violations and fraudulent applications',
      requester: 'Support Team',
      requesterEmail: 'support@damen.com',
      targetEntity: 'User #45678',
      targetId: 'USER-45678',
      createdAt: '2024-01-19 16:45',
      priority: 'high',
      comments: 8,
      changes: [
        { field: 'Account Status', before: 'Active', after: 'Banned' },
        { field: 'Ban Reason', before: '-', after: 'Policy violation - fraudulent applications' },
        { field: 'Ban Duration', before: '-', after: 'Permanent' }
      ]
    },
    {
      id: 'DR-2024-004',
      type: 'delete-mgmt-account',
      status: 'approved',
      title: 'Delete Management Account for Former Admin',
      description: 'Account deletion for former admin who left the university',
      requester: 'admin@tsinghua.edu.cn',
      requesterEmail: 'admin@tsinghua.edu.cn',
      targetEntity: 'former@tsinghua.edu.cn',
      targetId: 'ACC-045',
      createdAt: '2024-01-18 14:20',
      reviewedAt: '2024-01-19 10:30',
      reviewedBy: 'Super Admin',
      priority: 'medium',
      comments: 3,
      changes: [
        { field: 'Account Status', before: 'Inactive', after: 'Deleted' },
        { field: 'Delete Reason', before: '-', after: 'Employee left university' }
      ]
    },
    {
      id: 'DR-2024-005',
      type: 'university-profile-update',
      status: 'rejected',
      title: 'Update Contact Information',
      description: 'Requested to update university contact email',
      requester: 'editor@pku.edu.cn',
      requesterEmail: 'editor@pku.edu.cn',
      targetEntity: 'Peking University',
      targetId: 'UNI-002',
      createdAt: '2024-01-17 11:00',
      reviewedAt: '2024-01-18 09:15',
      reviewedBy: 'Super Admin',
      priority: 'low',
      comments: 4,
      changes: [
        { field: 'Contact Email', before: 'admissions@pku.edu.cn', after: 'info@pku.edu.cn' }
      ]
    },
    {
      id: 'DR-2024-006',
      type: 'create-mgmt-account',
      status: 'executed',
      title: 'Create Reviewer Account',
      description: 'New reviewer account for Shanghai Jiao Tong University',
      requester: 'admin@sjtu.edu.cn',
      requesterEmail: 'admin@sjtu.edu.cn',
      targetEntity: 'reviewer@sjtu.edu.cn',
      targetId: 'UNI-004',
      createdAt: '2024-01-15 13:45',
      reviewedAt: '2024-01-16 10:00',
      executedAt: '2024-01-16 10:05',
      reviewedBy: 'Super Admin',
      priority: 'medium',
      comments: 1,
      changes: [
        { field: 'Email', before: '-', after: 'reviewer@sjtu.edu.cn' },
        { field: 'Name', before: '-', after: 'Li Hua' },
        { field: 'Role', before: '-', after: 'Reviewer' }
      ]
    },
  ];

  const getStatusBadge = (status: DraftStatus) => {
    const styles = {
      pending: 'bg-orange-50 text-orange-700 border-orange-200',
      approved: 'bg-blue-50 text-blue-700 border-blue-200',
      rejected: 'bg-red-50 text-red-700 border-red-200',
      executed: 'bg-green-50 text-green-700 border-green-200',
    };

    const icons = {
      pending: Clock,
      approved: CheckCircle,
      rejected: XCircle,
      executed: CheckCircle,
    };

    const Icon = icons[status];

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status]}`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getTypeBadge = (type: DraftType) => {
    const config = {
      'create-mgmt-account': { label: 'Create Account', icon: UserCog, color: 'bg-blue-50 text-blue-700' },
      'delete-mgmt-account': { label: 'Delete Account', icon: UserCog, color: 'bg-red-50 text-red-700' },
      'university-profile-update': { label: 'Profile Update', icon: Building2, color: 'bg-purple-50 text-purple-700' },
      'ban-user': { label: 'Ban User', icon: Ban, color: 'bg-red-50 text-red-700' },
      'suspend-university': { label: 'Suspend University', icon: Building2, color: 'bg-orange-50 text-orange-700' },
      'restore-university': { label: 'Restore University', icon: Building2, color: 'bg-green-50 text-green-700' },
    };

    const fallback = { label: type, icon: Edit, color: 'bg-gray-50 text-gray-700' };
    const { label, icon: Icon, color } = config[type] || fallback;

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${color}`}>
        <Icon className="w-3 h-3" />
        {label}
      </span>
    );
  };

  const getPriorityBadge = (priority: 'low' | 'medium' | 'high') => {
    const styles = {
      low: 'bg-gray-50 text-gray-700',
      medium: 'bg-yellow-50 text-yellow-700',
      high: 'bg-red-50 text-red-700',
    };

    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[priority]}`}>
        {priority.toUpperCase()}
      </span>
    );
  };

  const filteredDrafts = drafts.filter(draft => {
    const matchesSearch = 
      draft.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      draft.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      draft.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      draft.targetEntity.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = selectedType === 'all' || draft.type === selectedType;
    const matchesStatus = selectedStatus === 'all' || draft.status === selectedStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  const stats = {
    pending: drafts.filter(d => d.status === 'pending').length,
    approved: drafts.filter(d => d.status === 'approved').length,
    rejected: drafts.filter(d => d.status === 'rejected').length,
    executed: drafts.filter(d => d.status === 'executed').length,
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#171717] mb-2">Drafts & Approvals</h1>
        <p className="text-[#737373]">
          Review and approve all platform changes • All destructive actions require approval
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-[#E5E5E5] p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div className="text-2xl font-semibold text-[#171717]">{stats.pending}</div>
          </div>
          <div className="text-sm text-[#737373]">Pending Review</div>
        </div>

        <div className="bg-white rounded-xl border border-[#E5E5E5] p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-2xl font-semibold text-[#171717]">{stats.approved}</div>
          </div>
          <div className="text-sm text-[#737373]">Approved</div>
        </div>

        <div className="bg-white rounded-xl border border-[#E5E5E5] p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div className="text-2xl font-semibold text-[#171717]">{stats.rejected}</div>
          </div>
          <div className="text-sm text-[#737373]">Rejected</div>
        </div>

        <div className="bg-white rounded-xl border border-[#E5E5E5] p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
              <FileCheck className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-2xl font-semibold text-[#171717]">{stats.executed}</div>
          </div>
          <div className="text-sm text-[#737373]">Executed</div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl border border-[#E5E5E5] p-6 mb-6">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A3A3A3]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ID, title, or target entity..."
              className="w-full pl-10 pr-4 py-2.5 border border-[#E5E5E5] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#171717] focus:border-transparent"
            />
          </div>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as DraftType | 'all')}
            className="px-4 py-2.5 border border-[#E5E5E5] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#171717] focus:border-transparent bg-white min-w-[200px]"
          >
            <option value="all">All Types</option>
            <option value="create-mgmt-account">Create Account</option>
            <option value="delete-mgmt-account">Delete Account</option>
            <option value="university-profile-update">Profile Update</option>
            <option value="ban-user">Ban User</option>
            <option value="suspend-university">Suspend University</option>
            <option value="restore-university">Restore University</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as DraftStatus | 'all')}
            className="px-4 py-2.5 border border-[#E5E5E5] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#171717] focus:border-transparent bg-white"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="executed">Executed</option>
          </select>
        </div>

        <div className="flex items-center gap-4 mt-4 text-sm text-[#737373]">
          <span>Showing {filteredDrafts.length} of {drafts.length} drafts</span>
        </div>
      </div>

      {/* Drafts List */}
      <div className="bg-white rounded-xl border border-[#E5E5E5] overflow-hidden">
        <div className="divide-y divide-[#F5F5F5]">
          {filteredDrafts.map((draft) => (
            <div
              key={draft.id}
              onClick={() => setSelectedDraft(draft)}
              className="p-6 hover:bg-[#FAFAFA] transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono text-[#737373]">{draft.id}</span>
                  {getTypeBadge(draft.type)}
                  {draft.priority === 'high' && getPriorityBadge(draft.priority)}
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(draft.status)}
                  <ChevronRight className="w-5 h-5 text-[#A3A3A3]" />
                </div>
              </div>

              <h3 className="font-medium text-[#171717] mb-2">{draft.title}</h3>
              <p className="text-sm text-[#737373] mb-3">{draft.description}</p>

              <div className="flex items-center gap-6 text-xs text-[#A3A3A3]">
                <div className="flex items-center gap-1.5">
                  <User className="w-3 h-3" />
                  <span>{draft.requester}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" />
                  <span>{draft.createdAt}</span>
                </div>
                {draft.comments > 0 && (
                  <div className="flex items-center gap-1.5">
                    <MessageSquare className="w-3 h-3" />
                    <span>{draft.comments} comments</span>
                  </div>
                )}
                {draft.changes && (
                  <div className="flex items-center gap-1.5">
                    <GitCompare className="w-3 h-3" />
                    <span>{draft.changes.length} changes</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Draft Detail Modal */}
      {selectedDraft && (
        <DraftDetailModal
          draft={selectedDraft}
          onClose={() => setSelectedDraft(null)}
          onApproveDraft={onApproveDraft}
          onRejectDraft={onRejectDraft}
        />
      )}
    </div>
  );
}

// Draft Detail Modal Component
function DraftDetailModal({
  draft,
  onClose,
  onApproveDraft,
  onRejectDraft,
}: {
  draft: Draft;
  onClose: () => void;
  onApproveDraft?: (draftId: string, notes?: string) => Promise<void> | void;
  onRejectDraft?: (draftId: string, reason: string) => Promise<void> | void;
}) {
  const [activeTab, setActiveTab] = useState<'overview' | 'diff' | 'comments' | 'timeline'>('overview');
  const [comment, setComment] = useState('');
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  // Helper functions for badges
  const getStatusBadge = (status: DraftStatus) => {
    const styles = {
      pending: 'bg-orange-50 text-orange-700 border-orange-200',
      approved: 'bg-blue-50 text-blue-700 border-blue-200',
      rejected: 'bg-red-50 text-red-700 border-red-200',
      executed: 'bg-green-50 text-green-700 border-green-200',
    };

    const icons = {
      pending: Clock,
      approved: CheckCircle,
      rejected: XCircle,
      executed: CheckCircle,
    };

    const Icon = icons[status];

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status]}`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getTypeBadge = (type: DraftType) => {
    const config = {
      'create-mgmt-account': { label: 'Create Account', icon: UserCog, color: 'bg-blue-50 text-blue-700' },
      'delete-mgmt-account': { label: 'Delete Account', icon: UserCog, color: 'bg-red-50 text-red-700' },
      'university-profile-update': { label: 'Profile Update', icon: Building2, color: 'bg-purple-50 text-purple-700' },
      'ban-user': { label: 'Ban User', icon: Ban, color: 'bg-red-50 text-red-700' },
      'suspend-university': { label: 'Suspend University', icon: Building2, color: 'bg-orange-50 text-orange-700' },
      'restore-university': { label: 'Restore University', icon: Building2, color: 'bg-green-50 text-green-700' },
    };

    const fallback = { label: type, icon: Edit, color: 'bg-gray-50 text-gray-700' };
    const { label, icon: Icon, color } = config[type] || fallback;

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${color}`}>
        <Icon className="w-3 h-3" />
        {label}
      </span>
    );
  };

  const mockComments = [
    {
      id: 1,
      author: 'Super Admin',
      authorEmail: 'superadmin@damen.com',
      content: 'Reviewing this request. Need to verify with the university first.',
      timestamp: '2024-01-20 10:15',
    },
    {
      id: 2,
      author: draft.requester,
      authorEmail: draft.requesterEmail,
      content: 'This is urgent. The new admin needs access ASAP.',
      timestamp: '2024-01-20 11:30',
    },
  ];

  const timeline = [
    { status: 'Created', timestamp: draft.createdAt, user: draft.requester, icon: Clock },
    draft.reviewedAt && { status: draft.status === 'approved' ? 'Approved' : 'Rejected', timestamp: draft.reviewedAt, user: draft.reviewedBy!, icon: draft.status === 'approved' ? CheckCircle : XCircle },
    draft.executedAt && { status: 'Executed', timestamp: draft.executedAt, user: 'System', icon: CheckCircle },
  ].filter(Boolean);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
      <div className="bg-white rounded-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-[#E5E5E5] flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-sm font-mono text-[#737373]">{draft.id}</span>
              {getTypeBadge(draft.type)}
              {draft.status === 'pending' && draft.priority === 'high' && (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700">
                  HIGH PRIORITY
                </span>
              )}
            </div>
            <h2 className="text-xl font-semibold text-[#171717] mb-1">{draft.title}</h2>
            <p className="text-sm text-[#737373]">{draft.description}</p>
          </div>
          <button onClick={onClose} className="text-[#737373] hover:text-[#171717] ml-4">
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-[#E5E5E5] px-6">
          <div className="flex gap-6">
            {(['overview', 'diff', 'comments', 'timeline'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`
                  px-1 py-3 text-sm font-medium border-b-2 transition-colors
                  ${activeTab === tab
                    ? 'border-[#171717] text-[#171717]'
                    : 'border-transparent text-[#737373] hover:text-[#171717]'
                  }
                `}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-[#737373] mb-2">Requester</h3>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {draft.requester.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium text-[#171717]">{draft.requester}</div>
                      <div className="text-sm text-[#737373]">{draft.requesterEmail}</div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-[#737373] mb-2">Target Entity</h3>
                  <div className="font-medium text-[#171717]">{draft.targetEntity}</div>
                  <div className="text-sm text-[#737373] font-mono">{draft.targetId}</div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-[#737373] mb-2">Created At</h3>
                  <div className="text-[#171717]">{draft.createdAt}</div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-[#737373] mb-2">Status</h3>
                  <div>{getStatusBadge(draft.status)}</div>
                </div>
              </div>

              {draft.status === 'pending' && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-orange-800">
                    <strong>Action Required:</strong> This draft is waiting for your review and approval. 
                    Please review the changes and either approve or reject this request.
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'diff' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <GitCompare className="w-5 h-5 text-[#737373]" />
                <h3 className="font-medium text-[#171717]">Proposed Changes</h3>
              </div>

              {draft.changes && draft.changes.length > 0 ? (
                <div className="space-y-3">
                  {draft.changes.map((change, index) => (
                    <div key={index} className="border border-[#E5E5E5] rounded-lg overflow-hidden">
                      <div className="bg-[#FAFAFA] px-4 py-2 border-b border-[#E5E5E5]">
                        <span className="text-sm font-medium text-[#171717]">{change.field}</span>
                      </div>
                      <div className="grid grid-cols-2 divide-x divide-[#E5E5E5]">
                        <div className="p-4 bg-red-50/30">
                          <div className="text-xs text-[#737373] mb-2 flex items-center gap-1">
                            <span className="w-2 h-2 bg-red-600 rounded-full"></span>
                            Before
                          </div>
                          <div className="text-sm text-[#171717] font-mono">
                            {change.before === '-' ? <span className="text-[#A3A3A3] italic">(empty)</span> : change.before}
                          </div>
                        </div>
                        <div className="p-4 bg-green-50/30">
                          <div className="text-xs text-[#737373] mb-2 flex items-center gap-1">
                            <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                            After
                          </div>
                          <div className="text-sm text-[#171717] font-mono">
                            {change.after === '-' ? <span className="text-[#A3A3A3] italic">(will be removed)</span> : change.after}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-[#737373]">
                  No changes data available
                </div>
              )}
            </div>
          )}

          {activeTab === 'comments' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-5 h-5 text-[#737373]" />
                <h3 className="font-medium text-[#171717]">Comments ({mockComments.length})</h3>
              </div>

              <div className="space-y-4">
                {mockComments.map((comment) => (
                  <div key={comment.id} className="border border-[#E5E5E5] rounded-lg p-4">
                    <div className="flex items-start gap-3 mb-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
                        {comment.author.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-[#171717]">{comment.author}</span>
                          <span className="text-xs text-[#A3A3A3]">{comment.timestamp}</span>
                        </div>
                        <p className="text-sm text-[#737373]">{comment.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border border-[#E5E5E5] rounded-lg p-4">
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add a comment..."
                  rows={3}
                  className="w-full border-0 focus:outline-none resize-none text-sm"
                />
                <div className="flex justify-end mt-2">
                  <button className="px-4 py-2 bg-[#171717] text-white rounded-lg text-sm font-medium hover:bg-[#404040] transition-colors">
                    Post Comment
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-[#737373]" />
                <h3 className="font-medium text-[#171717]">Status Timeline</h3>
              </div>

              <div className="relative">
                {timeline.map((event: any, index) => {
                  const Icon = event.icon;
                  const isLast = index === timeline.length - 1;

                  return (
                    <div key={index} className="flex gap-4 pb-6 relative">
                      {!isLast && (
                        <div className="absolute left-5 top-12 bottom-0 w-px bg-[#E5E5E5]"></div>
                      )}
                      <div className="w-10 h-10 bg-white border-2 border-[#E5E5E5] rounded-full flex items-center justify-center flex-shrink-0 relative z-10">
                        <Icon className="w-5 h-5 text-[#737373]" />
                      </div>
                      <div className="flex-1 pt-2">
                        <div className="font-medium text-[#171717] mb-1">{event.status}</div>
                        <div className="text-sm text-[#737373]">
                          by {event.user} • {event.timestamp}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {draft.status === 'pending' && (
          <div className="p-6 border-t border-[#E5E5E5] flex gap-3">
            <button
              onClick={() => setShowRejectionModal(true)}
              className="flex-1 px-4 py-2.5 border border-red-300 text-red-700 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
            >
              Reject
            </button>
            <button
              onClick={() => setShowApprovalModal(true)}
              className="flex-1 px-4 py-2.5 bg-[#171717] text-white rounded-lg text-sm font-medium hover:bg-[#404040] transition-colors"
            >
              Approve & Execute
            </button>
          </div>
        )}

        {draft.status === 'approved' && !draft.executedAt && (
          <div className="p-6 border-t border-[#E5E5E5] flex gap-3">
            <button className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
              Execute Now
            </button>
          </div>
        )}
      </div>

      {/* Approval Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-6">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6 border-b border-[#E5E5E5]">
              <h3 className="text-lg font-semibold text-[#171717]">Approve & Execute</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  <strong>Confirm Action:</strong> You are about to approve and execute this draft. 
                  This action will immediately apply the changes to the platform.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#171717] mb-2">
                  Approval Notes (Optional)
                </label>
                <textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  rows={3}
                  placeholder="Add notes about your decision..."
                  className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#171717] focus:border-transparent resize-none"
                />
              </div>
            </div>
            <div className="p-6 border-t border-[#E5E5E5] flex gap-3">
              <button
                onClick={() => setShowApprovalModal(false)}
                className="flex-1 px-4 py-2.5 border border-[#E5E5E5] rounded-lg text-sm font-medium text-[#171717] hover:bg-[#FAFAFA] transition-colors"
              >
                Cancel
              </button>
              <button
                className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                onClick={async () => {
                  if (onApproveDraft) {
                    await onApproveDraft(draft.id, approvalNotes);
                  }
                  setShowApprovalModal(false);
                  onClose();
                }}
              >
                Approve & Execute
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-6">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6 border-b border-[#E5E5E5]">
              <h3 className="text-lg font-semibold text-[#171717]">Reject Draft</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">
                  <strong>Confirm Rejection:</strong> You are about to reject this draft request. 
                  The requester will be notified of your decision.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#171717] mb-2">
                  Reason for Rejection *
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  placeholder="Explain why this request is being rejected..."
                  className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#171717] focus:border-transparent resize-none"
                />
              </div>
            </div>
            <div className="p-6 border-t border-[#E5E5E5] flex gap-3">
              <button
                onClick={() => setShowRejectionModal(false)}
                className="flex-1 px-4 py-2.5 border border-[#E5E5E5] rounded-lg text-sm font-medium text-[#171717] hover:bg-[#FAFAFA] transition-colors"
              >
                Cancel
              </button>
              <button
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                onClick={async () => {
                  if (onRejectDraft) {
                    await onRejectDraft(draft.id, rejectionReason || "Rejected by superuser");
                  }
                  setShowRejectionModal(false);
                  onClose();
                }}
              >
                Reject Draft
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
