// @ts-nocheck
import React from 'react';
import { 
  Building2, 
  Users, 
  FileText, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowUpRight
} from 'lucide-react';

interface SuperuserOverviewProps {
  data?: {
    stats?: {
      total_universities?: number;
      management_accounts?: number;
      total_applications?: number;
      pending_drafts?: number;
    };
    recent_activity?: Array<{
      id: string | number;
      type: string;
      description: string;
      user: string;
      timestamp: string;
      status?: string;
    }>;
    pending_drafts?: Array<{
      id: string;
      type: string;
      target: string;
      requester: string;
      created_at: string;
      priority: string;
    }>;
    system_health?: Array<{
      label: string;
      value: string;
      status: string;
    }>;
  };
}

export default function SuperuserOverview({ data }: SuperuserOverviewProps) {
  const stats = data?.stats
    ? [
        { label: 'Total Universities', value: String(data.stats.total_universities ?? 0), change: 'Live data', icon: Building2, color: 'blue' },
        { label: 'Management Accounts', value: String(data.stats.management_accounts ?? 0), change: 'Live data', icon: Users, color: 'purple' },
        { label: 'Total Applications', value: String(data.stats.total_applications ?? 0), change: 'Live data', icon: FileText, color: 'green' },
        { label: 'Pending Drafts', value: String(data.stats.pending_drafts ?? 0), change: 'Requires attention', icon: Clock, color: 'orange' },
      ]
    : [
    { label: 'Total Universities', value: '847', change: '+12 this month', icon: Building2, color: 'blue' },
    { label: 'Management Accounts', value: '2,341', change: '+45 this month', icon: Users, color: 'purple' },
    { label: 'Total Applications', value: '156,892', change: '+3,421 today', icon: FileText, color: 'green' },
    { label: 'Pending Drafts', value: '12', change: 'Requires attention', icon: Clock, color: 'orange' },
  ];

  const recentActivity = data?.recent_activity ?? [
    {
      id: 1,
      type: 'University Created',
      description: 'New university "Shanghai Tech University" added to platform',
      user: 'System Admin',
      timestamp: '2 hours ago',
      status: 'completed'
    },
    {
      id: 2,
      type: 'Management Account Created',
      description: 'Account created for admin@tsinghua.edu.cn',
      user: 'Super Admin',
      timestamp: '4 hours ago',
      status: 'completed'
    },
    {
      id: 3,
      type: 'Draft Approved',
      description: 'Profile update for "Peking University" approved',
      user: 'Super Admin',
      timestamp: '6 hours ago',
      status: 'completed'
    },
    {
      id: 4,
      type: 'User Banned',
      description: 'User #23451 banned for policy violation',
      user: 'Super Admin',
      timestamp: '1 day ago',
      status: 'completed'
    },
  ];

  const pendingDrafts = data?.pending_drafts ?? [
    {
      id: 'DR-2024-001',
      type: 'Create Management Account',
      target: 'admin@fudan.edu.cn',
      requester: 'System',
      createdAt: '2024-01-20 09:30',
      priority: 'high'
    },
    {
      id: 'DR-2024-002',
      type: 'University Profile Update',
      target: 'Zhejiang University',
      requester: 'admin@zju.edu.cn',
      createdAt: '2024-01-20 08:15',
      priority: 'medium'
    },
    {
      id: 'DR-2024-003',
      type: 'Ban User',
      target: 'User #45678',
      requester: 'Support Team',
      createdAt: '2024-01-19 16:45',
      priority: 'high'
    },
  ];

  const systemHealth = data?.system_health ?? [
    { label: 'API Response Time', value: '124ms', status: 'good' },
    { label: 'Database Connections', value: '847/1000', status: 'good' },
    { label: 'Error Rate', value: '0.02%', status: 'good' },
    { label: 'Active Users', value: '12,345', status: 'good' },
  ];

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#171717] mb-2">Overview</h1>
        <p className="text-[#737373]">Monitor platform activity and system health</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const colorClasses = {
            blue: 'bg-blue-50 text-blue-600',
            purple: 'bg-purple-50 text-purple-600',
            green: 'bg-green-50 text-green-600',
            orange: 'bg-orange-50 text-orange-600',
          }[stat.color];

          return (
            <div key={stat.label} className="bg-white rounded-xl border border-[#E5E5E5] p-6">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 ${colorClasses} rounded-lg flex items-center justify-center`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-semibold text-[#171717] mb-1">{stat.value}</div>
              <div className="text-sm text-[#737373] mb-2">{stat.label}</div>
              <div className="text-xs text-[#A3A3A3] flex items-center gap-1">
                {stat.color === 'orange' ? (
                  <AlertCircle className="w-3 h-3" />
                ) : (
                  <TrendingUp className="w-3 h-3" />
                )}
                {stat.change}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        {/* Pending Drafts */}
        <div className="col-span-2 bg-white rounded-xl border border-[#E5E5E5]">
          <div className="p-6 border-b border-[#E5E5E5] flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-[#171717]">Pending Drafts</h2>
              <p className="text-sm text-[#737373] mt-1">Requires your review and approval</p>
            </div>
            <button className="text-sm text-[#171717] hover:text-[#404040] flex items-center gap-1">
              View all
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
          <div className="divide-y divide-[#F5F5F5]">
            {pendingDrafts.map((draft) => (
              <div key={draft.id} className="p-6 hover:bg-[#FAFAFA] transition-colors cursor-pointer">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono text-[#737373]">{draft.id}</span>
                    {draft.priority === 'high' && (
                      <span className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full">
                        High Priority
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-[#A3A3A3]">{draft.createdAt ?? draft.created_at}</span>
                </div>
                <div className="font-medium text-[#171717] mb-1">{draft.type}</div>
                <div className="text-sm text-[#737373] mb-2">Target: {draft.target}</div>
                <div className="text-xs text-[#A3A3A3]">Requested by: {draft.requester}</div>
              </div>
            ))}
          </div>
        </div>

        {/* System Health */}
        <div className="bg-white rounded-xl border border-[#E5E5E5]">
          <div className="p-6 border-b border-[#E5E5E5]">
            <h2 className="font-semibold text-[#171717]">System Health</h2>
            <p className="text-sm text-[#737373] mt-1">Real-time metrics</p>
          </div>
          <div className="p-6 space-y-4">
            {systemHealth.map((metric) => (
              <div key={metric.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-[#737373]">{metric.label}</span>
                  {metric.status === 'good' && (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  )}
                </div>
                <div className="font-medium text-[#171717]">{metric.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-[#E5E5E5]">
        <div className="p-6 border-b border-[#E5E5E5] flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-[#171717]">Recent Activity</h2>
            <p className="text-sm text-[#737373] mt-1">Latest platform actions and events</p>
          </div>
          <button className="text-sm text-[#171717] hover:text-[#404040] flex items-center gap-1">
            View audit log
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
        <div className="divide-y divide-[#F5F5F5]">
          {recentActivity.map((activity) => (
            <div key={activity.id} className="p-6 flex items-start gap-4">
              <div className="w-8 h-8 bg-green-50 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-[#171717] mb-1">{activity.type}</div>
                <div className="text-sm text-[#737373] mb-2">{activity.description}</div>
                <div className="text-xs text-[#A3A3A3]">
                  by {activity.user} • {activity.timestamp}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

