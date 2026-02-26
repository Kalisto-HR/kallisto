// @ts-nocheck
import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Download,
  Eye,
  Calendar,
  User,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Building2,
  UserCog,
  Ban,
  Shield,
  ChevronRight
} from 'lucide-react';

type ActionType = 
  | 'user-login'
  | 'user-banned'
  | 'user-unbanned'
  | 'application-submitted'
  | 'application-reviewed'
  | 'university-created'
  | 'university-updated'
  | 'mgmt-account-created'
  | 'mgmt-account-deleted'
  | 'draft-approved'
  | 'draft-rejected'
  | 'draft-executed'
  | 'credit-purchased'
  | 'credit-refunded';

interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  actorId: string;
  actorType: 'superuser' | 'admin' | 'system' | 'user';
  action: ActionType;
  actionDescription: string;
  targetEntity: string;
  targetId: string;
  outcome: 'success' | 'failed' | 'pending';
  ipAddress: string;
  metadata?: Record<string, any>;
}

export default function SuperuserAuditLogs() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState<ActionType | 'all'>('all');
  const [selectedOutcome, setSelectedOutcome] = useState<'success' | 'failed' | 'pending' | 'all'>('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const auditLogs: AuditLog[] = [
    {
      id: 'LOG-2024-001234',
      timestamp: '2024-01-20 14:30:45',
      actor: 'Super Admin',
      actorId: 'SUPERUSER-001',
      actorType: 'superuser',
      action: 'draft-approved',
      actionDescription: 'Approved draft for management account creation',
      targetEntity: 'Draft DR-2024-001',
      targetId: 'DR-2024-001',
      outcome: 'success',
      ipAddress: '192.168.1.100',
      metadata: {
        draftType: 'create-mgmt-account',
        targetEmail: 'admin@fudan.edu.cn',
        university: 'Fudan University'
      }
    },
    {
      id: 'LOG-2024-001233',
      timestamp: '2024-01-20 14:15:22',
      actor: 'System',
      actorId: 'SYSTEM',
      actorType: 'system',
      action: 'mgmt-account-created',
      actionDescription: 'Management account created after draft execution',
      targetEntity: 'admin@sjtu.edu.cn',
      targetId: 'ACC-089',
      outcome: 'success',
      ipAddress: '10.0.0.1',
      metadata: {
        university: 'Shanghai Jiao Tong University',
        role: 'admin'
      }
    },
    {
      id: 'LOG-2024-001232',
      timestamp: '2024-01-20 13:45:18',
      actor: 'Super Admin',
      actorId: 'SUPERUSER-001',
      actorType: 'superuser',
      action: 'user-banned',
      actionDescription: 'User permanently banned for policy violations',
      targetEntity: 'User #45678',
      targetId: 'USER-45678',
      outcome: 'success',
      ipAddress: '192.168.1.100',
      metadata: {
        reason: 'Fraudulent applications',
        duration: 'permanent'
      }
    },
    {
      id: 'LOG-2024-001231',
      timestamp: '2024-01-20 12:30:05',
      actor: 'admin@tsinghua.edu.cn',
      actorId: 'ACC-001',
      actorType: 'admin',
      action: 'application-reviewed',
      actionDescription: 'Application reviewed and status updated',
      targetEntity: 'Application APP-2024-12345',
      targetId: 'APP-2024-12345',
      outcome: 'success',
      ipAddress: '203.0.113.45',
      metadata: {
        previousStatus: 'submitted',
        newStatus: 'under-review',
        university: 'Tsinghua University'
      }
    },
    {
      id: 'LOG-2024-001230',
      timestamp: '2024-01-20 11:20:33',
      actor: 'System',
      actorId: 'SYSTEM',
      actorType: 'system',
      action: 'university-created',
      actionDescription: 'New university added to platform',
      targetEntity: 'Shanghai Tech University',
      targetId: 'UNI-009',
      outcome: 'success',
      ipAddress: '10.0.0.1',
      metadata: {
        type: 'public',
        location: 'Shanghai'
      }
    },
    {
      id: 'LOG-2024-001229',
      timestamp: '2024-01-20 10:15:47',
      actor: 'Super Admin',
      actorId: 'SUPERUSER-001',
      actorType: 'superuser',
      action: 'draft-rejected',
      actionDescription: 'Draft rejected due to insufficient information',
      targetEntity: 'Draft DR-2024-002',
      targetId: 'DR-2024-002',
      outcome: 'success',
      ipAddress: '192.168.1.100',
      metadata: {
        reason: 'Incomplete documentation',
        draftType: 'university-profile-update'
      }
    },
    {
      id: 'LOG-2024-001228',
      timestamp: '2024-01-20 09:30:12',
      actor: 'Zhang Wei',
      actorId: 'USER-12345',
      actorType: 'user',
      action: 'application-submitted',
      actionDescription: 'New application submitted',
      targetEntity: 'Application APP-2024-56789',
      targetId: 'APP-2024-56789',
      outcome: 'success',
      ipAddress: '58.20.45.120',
      metadata: {
        university: 'Peking University',
        program: 'Master of Computer Science',
        creditsUsed: 1
      }
    },
    {
      id: 'LOG-2024-001227',
      timestamp: '2024-01-20 08:45:28',
      actor: 'Wang Fang',
      actorId: 'USER-23456',
      actorType: 'user',
      action: 'credit-purchased',
      actionDescription: 'User purchased application credits',
      targetEntity: 'User #23456',
      targetId: 'USER-23456',
      outcome: 'success',
      ipAddress: '61.135.169.125',
      metadata: {
        amount: '¥580',
        credits: 10,
        paymentMethod: 'Alipay'
      }
    },
  ];

  const getActionBadge = (action: ActionType) => {
    const config: Record<ActionType, { label: string; color: string; icon: any }> = {
      'user-login': { label: 'User Login', color: 'bg-gray-50 text-gray-700', icon: User },
      'user-banned': { label: 'User Banned', color: 'bg-red-50 text-red-700', icon: Ban },
      'user-unbanned': { label: 'User Unbanned', color: 'bg-green-50 text-green-700', icon: CheckCircle },
      'application-submitted': { label: 'App Submitted', color: 'bg-blue-50 text-blue-700', icon: FileText },
      'application-reviewed': { label: 'App Reviewed', color: 'bg-purple-50 text-purple-700', icon: FileText },
      'university-created': { label: 'Uni Created', color: 'bg-green-50 text-green-700', icon: Building2 },
      'university-updated': { label: 'Uni Updated', color: 'bg-blue-50 text-blue-700', icon: Building2 },
      'mgmt-account-created': { label: 'Account Created', color: 'bg-green-50 text-green-700', icon: UserCog },
      'mgmt-account-deleted': { label: 'Account Deleted', color: 'bg-red-50 text-red-700', icon: UserCog },
      'draft-approved': { label: 'Draft Approved', color: 'bg-green-50 text-green-700', icon: CheckCircle },
      'draft-rejected': { label: 'Draft Rejected', color: 'bg-red-50 text-red-700', icon: XCircle },
      'draft-executed': { label: 'Draft Executed', color: 'bg-blue-50 text-blue-700', icon: CheckCircle },
      'credit-purchased': { label: 'Credit Purchase', color: 'bg-green-50 text-green-700', icon: CheckCircle },
      'credit-refunded': { label: 'Credit Refund', color: 'bg-orange-50 text-orange-700', icon: XCircle },
    };

    const { label, color, icon: Icon } = config[action];

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${color}`}>
        <Icon className="w-3 h-3" />
        {label}
      </span>
    );
  };

  const getOutcomeBadge = (outcome: 'success' | 'failed' | 'pending') => {
    const styles = {
      success: 'bg-green-50 text-green-700 border-green-200',
      failed: 'bg-red-50 text-red-700 border-red-200',
      pending: 'bg-orange-50 text-orange-700 border-orange-200',
    };

    const icons = {
      success: CheckCircle,
      failed: XCircle,
      pending: Clock,
    };

    const Icon = icons[outcome];

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${styles[outcome]}`}>
        <Icon className="w-3 h-3" />
        {outcome.charAt(0).toUpperCase() + outcome.slice(1)}
      </span>
    );
  };

  const getActorTypeBadge = (type: 'superuser' | 'admin' | 'system' | 'user') => {
    const styles = {
      superuser: 'bg-purple-50 text-purple-700',
      admin: 'bg-blue-50 text-blue-700',
      system: 'bg-gray-50 text-gray-700',
      user: 'bg-indigo-50 text-indigo-700',
    };

    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${styles[type]}`}>
        <Shield className="w-3 h-3" />
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </span>
    );
  };

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = 
      log.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.actionDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.targetEntity.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesAction = selectedAction === 'all' || log.action === selectedAction;
    const matchesOutcome = selectedOutcome === 'all' || log.outcome === selectedOutcome;

    return matchesSearch && matchesAction && matchesOutcome;
  });

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#171717] mb-2">Audit Logs</h1>
        <p className="text-[#737373]">
          Immutable record of all platform actions and events
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-[#E5E5E5] p-6">
          <div className="text-sm text-[#737373] mb-2">Total Logs</div>
          <div className="text-2xl font-semibold text-[#171717]">2,341,892</div>
          <div className="text-xs text-[#A3A3A3] mt-2">All-time</div>
        </div>

        <div className="bg-white rounded-xl border border-[#E5E5E5] p-6">
          <div className="text-sm text-[#737373] mb-2">Today</div>
          <div className="text-2xl font-semibold text-[#171717]">8,234</div>
          <div className="text-xs text-[#A3A3A3] mt-2">Last 24 hours</div>
        </div>

        <div className="bg-white rounded-xl border border-[#E5E5E5] p-6">
          <div className="text-sm text-[#737373] mb-2">Success Rate</div>
          <div className="text-2xl font-semibold text-[#171717]">99.8%</div>
          <div className="text-xs text-[#A3A3A3] mt-2">This month</div>
        </div>

        <div className="bg-white rounded-xl border border-[#E5E5E5] p-6">
          <div className="text-sm text-[#737373] mb-2">Failed Actions</div>
          <div className="text-2xl font-semibold text-[#171717]">127</div>
          <div className="text-xs text-[#A3A3A3] mt-2">Requires review</div>
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
              placeholder="Search by log ID, actor, action, or target entity..."
              className="w-full pl-10 pr-4 py-2.5 border border-[#E5E5E5] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#171717] focus:border-transparent"
            />
          </div>

          {/* Action Filter */}
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value as ActionType | 'all')}
            className="px-4 py-2.5 border border-[#E5E5E5] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#171717] focus:border-transparent bg-white min-w-[180px]"
          >
            <option value="all">All Actions</option>
            <option value="user-banned">User Banned</option>
            <option value="application-submitted">App Submitted</option>
            <option value="application-reviewed">App Reviewed</option>
            <option value="mgmt-account-created">Account Created</option>
            <option value="draft-approved">Draft Approved</option>
            <option value="draft-rejected">Draft Rejected</option>
            <option value="university-created">Uni Created</option>
          </select>

          {/* Outcome Filter */}
          <select
            value={selectedOutcome}
            onChange={(e) => setSelectedOutcome(e.target.value as 'success' | 'failed' | 'pending' | 'all')}
            className="px-4 py-2.5 border border-[#E5E5E5] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#171717] focus:border-transparent bg-white"
          >
            <option value="all">All Outcomes</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
          </select>

          {/* Export */}
          <button className="px-4 py-2.5 border border-[#E5E5E5] rounded-lg text-sm font-medium text-[#171717] hover:bg-[#FAFAFA] transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>

        <div className="flex items-center gap-4 mt-4 text-sm text-[#737373]">
          <span>Showing {filteredLogs.length} of {auditLogs.length} logs</span>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-xl border border-[#E5E5E5] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E5E5E5] bg-[#FAFAFA]">
                <th className="text-left px-6 py-4 text-xs font-medium text-[#737373] uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="text-left px-6 py-4 text-xs font-medium text-[#737373] uppercase tracking-wider">
                  Actor
                </th>
                <th className="text-left px-6 py-4 text-xs font-medium text-[#737373] uppercase tracking-wider">
                  Action
                </th>
                <th className="text-left px-6 py-4 text-xs font-medium text-[#737373] uppercase tracking-wider">
                  Target
                </th>
                <th className="text-left px-6 py-4 text-xs font-medium text-[#737373] uppercase tracking-wider">
                  Outcome
                </th>
                <th className="text-left px-6 py-4 text-xs font-medium text-[#737373] uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5F5F5]">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-[#FAFAFA] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-[#737373]">
                      <Calendar className="w-4 h-4" />
                      <span>{log.timestamp}</span>
                    </div>
                    <div className="text-xs text-[#A3A3A3] font-mono mt-0.5">{log.id}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-[#171717] text-sm">{log.actor}</div>
                    <div className="flex items-center gap-2 mt-1">
                      {getActorTypeBadge(log.actorType)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getActionBadge(log.action)}
                    <div className="text-xs text-[#737373] mt-1">{log.actionDescription}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-[#171717]">{log.targetEntity}</div>
                    <div className="text-xs text-[#A3A3A3] font-mono mt-0.5">{log.targetId}</div>
                  </td>
                  <td className="px-6 py-4">
                    {getOutcomeBadge(log.outcome)}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="text-sm text-[#171717] hover:text-[#404040] flex items-center gap-1"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#E5E5E5] flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[#171717] mb-1">Audit Log Details</h2>
                <p className="text-sm text-[#737373] font-mono">{selectedLog.id}</p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-[#737373] hover:text-[#171717]"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="font-medium text-[#171717] mb-4">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-[#737373]">Timestamp</label>
                    <div className="text-sm text-[#171717] mt-1">{selectedLog.timestamp}</div>
                  </div>
                  <div>
                    <label className="text-sm text-[#737373]">Outcome</label>
                    <div className="mt-1">{getOutcomeBadge(selectedLog.outcome)}</div>
                  </div>
                  <div>
                    <label className="text-sm text-[#737373]">IP Address</label>
                    <div className="text-sm text-[#171717] font-mono mt-1">{selectedLog.ipAddress}</div>
                  </div>
                  <div>
                    <label className="text-sm text-[#737373]">Log ID</label>
                    <div className="text-sm text-[#171717] font-mono mt-1">{selectedLog.id}</div>
                  </div>
                </div>
              </div>

              {/* Actor */}
              <div>
                <h3 className="font-medium text-[#171717] mb-4">Actor</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-[#737373]">Name</label>
                    <div className="text-sm text-[#171717] mt-1">{selectedLog.actor}</div>
                  </div>
                  <div>
                    <label className="text-sm text-[#737373]">Actor ID</label>
                    <div className="text-sm text-[#171717] font-mono mt-1">{selectedLog.actorId}</div>
                  </div>
                  <div>
                    <label className="text-sm text-[#737373]">Actor Type</label>
                    <div className="mt-1">{getActorTypeBadge(selectedLog.actorType)}</div>
                  </div>
                </div>
              </div>

              {/* Action */}
              <div>
                <h3 className="font-medium text-[#171717] mb-4">Action</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-[#737373]">Action Type</label>
                    <div className="mt-1">{getActionBadge(selectedLog.action)}</div>
                  </div>
                  <div>
                    <label className="text-sm text-[#737373]">Description</label>
                    <div className="text-sm text-[#171717] mt-1">{selectedLog.actionDescription}</div>
                  </div>
                </div>
              </div>

              {/* Target */}
              <div>
                <h3 className="font-medium text-[#171717] mb-4">Target Entity</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-[#737373]">Entity</label>
                    <div className="text-sm text-[#171717] mt-1">{selectedLog.targetEntity}</div>
                  </div>
                  <div>
                    <label className="text-sm text-[#737373]">Target ID</label>
                    <div className="text-sm text-[#171717] font-mono mt-1">{selectedLog.targetId}</div>
                  </div>
                </div>
              </div>

              {/* Metadata */}
              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div>
                  <h3 className="font-medium text-[#171717] mb-4">Additional Metadata</h3>
                  <div className="bg-[#FAFAFA] rounded-lg p-4 border border-[#E5E5E5]">
                    <pre className="text-xs font-mono text-[#171717] whitespace-pre-wrap">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Immutable Record:</strong> This audit log is part of an immutable ledger 
                  and cannot be modified or deleted. All logs are permanently stored for compliance 
                  and security purposes.
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-[#E5E5E5]">
              <button
                onClick={() => setSelectedLog(null)}
                className="w-full px-4 py-2.5 bg-[#171717] text-white rounded-lg text-sm font-medium hover:bg-[#404040] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

