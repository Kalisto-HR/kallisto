// @ts-nocheck
import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Eye,
  MapPin,
  Users,
  FileText,
  TrendingUp,
  CheckCircle,
  Clock,
  XCircle,
  MoreVertical
} from 'lucide-react';

type UniversityStatus = 'active' | 'inactive' | 'pending' | 'suspended';
type UniversityType = 'public' | 'private' | 'international';

interface University {
  id: string;
  name: string;
  nameEn: string;
  type: UniversityType;
  location: string;
  status: UniversityStatus;
  admins: number;
  applications: number;
  acceptanceRate: string;
  joinedDate: string;
  lastActive: string;
}

interface SuperuserUniversitiesProps {
  universitiesData?: University[];
}

export default function SuperuserUniversities({ universitiesData }: SuperuserUniversitiesProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<UniversityStatus | 'all'>('all');
  const [selectedType, setSelectedType] = useState<UniversityType | 'all'>('all');
  const [selectedUniversity, setSelectedUniversity] = useState<University | null>(null);

  const universities: University[] = universitiesData ?? [
    {
      id: 'UNI-001',
      name: '清华大学',
      nameEn: 'Tsinghua University',
      type: 'public',
      location: 'Beijing',
      status: 'active',
      admins: 12,
      applications: 2341,
      acceptanceRate: '8.2%',
      joinedDate: '2023-01-15',
      lastActive: '2 hours ago'
    },
    {
      id: 'UNI-002',
      name: '北京大学',
      nameEn: 'Peking University',
      type: 'public',
      location: 'Beijing',
      status: 'active',
      admins: 15,
      applications: 2156,
      acceptanceRate: '9.1%',
      joinedDate: '2023-01-18',
      lastActive: '5 hours ago'
    },
    {
      id: 'UNI-003',
      name: '复旦大学',
      nameEn: 'Fudan University',
      type: 'public',
      location: 'Shanghai',
      status: 'active',
      admins: 10,
      applications: 1847,
      acceptanceRate: '10.5%',
      joinedDate: '2023-02-01',
      lastActive: '1 day ago'
    },
    {
      id: 'UNI-004',
      name: '上海交通大学',
      nameEn: 'Shanghai Jiao Tong University',
      type: 'public',
      location: 'Shanghai',
      status: 'active',
      admins: 11,
      applications: 1923,
      acceptanceRate: '9.8%',
      joinedDate: '2023-02-05',
      lastActive: '3 hours ago'
    },
    {
      id: 'UNI-005',
      name: '浙江大学',
      nameEn: 'Zhejiang University',
      type: 'public',
      location: 'Hangzhou',
      status: 'active',
      admins: 13,
      applications: 2012,
      acceptanceRate: '9.3%',
      joinedDate: '2023-02-10',
      lastActive: '6 hours ago'
    },
    {
      id: 'UNI-006',
      name: '南京大学',
      nameEn: 'Nanjing University',
      type: 'public',
      location: 'Nanjing',
      status: 'pending',
      admins: 0,
      applications: 0,
      acceptanceRate: 'N/A',
      joinedDate: '2024-01-20',
      lastActive: 'Never'
    },
    {
      id: 'UNI-007',
      name: '中国科学技术大学',
      nameEn: 'University of Science and Technology of China',
      type: 'public',
      location: 'Hefei',
      status: 'active',
      admins: 8,
      applications: 1456,
      acceptanceRate: '11.2%',
      joinedDate: '2023-03-01',
      lastActive: '12 hours ago'
    },
    {
      id: 'UNI-008',
      name: 'NYU Shanghai',
      nameEn: 'New York University Shanghai',
      type: 'international',
      location: 'Shanghai',
      status: 'active',
      admins: 6,
      applications: 892,
      acceptanceRate: '15.6%',
      joinedDate: '2023-03-15',
      lastActive: '8 hours ago'
    },
  ];

  const getStatusBadge = (status: UniversityStatus) => {
    const styles = {
      active: 'bg-green-50 text-green-700 border-green-200',
      inactive: 'bg-gray-50 text-gray-700 border-gray-200',
      pending: 'bg-orange-50 text-orange-700 border-orange-200',
      suspended: 'bg-red-50 text-red-700 border-red-200',
    };

    const icons = {
      active: CheckCircle,
      inactive: XCircle,
      pending: Clock,
      suspended: XCircle,
    };

    const Icon = icons[status];

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status]}`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getTypeBadge = (type: UniversityType) => {
    const styles = {
      public: 'bg-blue-50 text-blue-700',
      private: 'bg-purple-50 text-purple-700',
      international: 'bg-indigo-50 text-indigo-700',
    };

    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[type]}`}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </span>
    );
  };

  const filteredUniversities = universities.filter(uni => {
    const matchesSearch = 
      uni.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      uni.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      uni.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      uni.location.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = selectedStatus === 'all' || uni.status === selectedStatus;
    const matchesType = selectedType === 'all' || uni.type === selectedType;

    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#171717] mb-2">Universities</h1>
        <p className="text-[#737373]">
          Manage all universities on the platform • All changes go through draft approval
        </p>
      </div>

      {/* Filters and Search */}
      <div className="mb-6 rounded-xl border border-[#E5E5E5] bg-white p-4 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A3A3A3]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, ID, or location..."
              className="w-full pl-10 pr-4 py-2.5 border border-[#E5E5E5] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#171717] focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as UniversityStatus | 'all')}
            className="w-full rounded-lg border border-[#E5E5E5] bg-white px-4 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#171717] lg:w-auto"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as UniversityType | 'all')}
            className="w-full rounded-lg border border-[#E5E5E5] bg-white px-4 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#171717] lg:w-auto"
          >
            <option value="all">All Types</option>
            <option value="public">Public</option>
            <option value="private">Private</option>
            <option value="international">International</option>
          </select>

          {/* Export */}
          <button className="flex items-center justify-center gap-2 rounded-lg border border-[#E5E5E5] px-4 py-2.5 text-sm font-medium text-[#171717] transition-colors hover:bg-[#FAFAFA] lg:w-auto">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>

        <div className="flex items-center gap-4 mt-4 text-sm text-[#737373]">
          <span>Showing {filteredUniversities.length} of {universities.length} universities</span>
      </div>

      {/* Universities Table */}
      <div className="overflow-hidden rounded-xl border border-[#E5E5E5] bg-white">
        <div className="space-y-3 p-4 md:hidden">
          {filteredUniversities.map((university) => (
            <div key={university.id} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium text-[#171717]">{university.name}</div>
                  <div className="text-sm text-[#737373]">{university.nameEn}</div>
                  <div className="text-xs text-[#A3A3A3] font-mono">{university.id}</div>
                </div>
                {getStatusBadge(university.status)}
              </div>
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <div className="text-xs text-[#737373]">Type</div>
                  <div className="mt-1">{getTypeBadge(university.type)}</div>
                </div>
                <div>
                  <div className="text-xs text-[#737373]">Location</div>
                  <div>{university.location}</div>
                </div>
                <div>
                  <div className="text-xs text-[#737373]">Admins / Applications</div>
                  <div>{university.admins} / {university.applications.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-xs text-[#737373]">Last Active</div>
                  <div>{university.lastActive}</div>
                </div>
              </div>
              <button
                onClick={() => setSelectedUniversity(university)}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm font-medium text-[#171717] transition-colors hover:bg-[#F5F5F5]"
              >
                <Eye className="w-4 h-4" />
                View
              </button>
            </div>
          ))}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E5E5E5] bg-[#FAFAFA]">
                <th className="text-left px-6 py-4 text-xs font-medium text-[#737373] uppercase tracking-wider">
                  University
                </th>
                <th className="text-left px-6 py-4 text-xs font-medium text-[#737373] uppercase tracking-wider">
                  Type
                </th>
                <th className="text-left px-6 py-4 text-xs font-medium text-[#737373] uppercase tracking-wider">
                  Location
                </th>
                <th className="text-left px-6 py-4 text-xs font-medium text-[#737373] uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-6 py-4 text-xs font-medium text-[#737373] uppercase tracking-wider">
                  Admins
                </th>
                <th className="text-left px-6 py-4 text-xs font-medium text-[#737373] uppercase tracking-wider">
                  Applications
                </th>
                <th className="text-left px-6 py-4 text-xs font-medium text-[#737373] uppercase tracking-wider">
                  Last Active
                </th>
                <th className="text-left px-6 py-4 text-xs font-medium text-[#737373] uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5F5F5]">
              {filteredUniversities.map((university) => (
                <tr key={university.id} className="hover:bg-[#FAFAFA] transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-[#171717]">{university.name}</div>
                      <div className="text-sm text-[#737373] mt-0.5">{university.nameEn}</div>
                      <div className="text-xs text-[#A3A3A3] mt-0.5 font-mono">{university.id}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getTypeBadge(university.type)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-[#737373]">
                      <MapPin className="w-4 h-4" />
                      {university.location}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(university.status)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-[#737373]">
                      <Users className="w-4 h-4" />
                      {university.admins}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-[#737373]">
                      <FileText className="w-4 h-4" />
                      {university.applications.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-[#737373]">{university.lastActive}</span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setSelectedUniversity(university)}
                      className="px-3 py-1.5 text-sm font-medium text-[#171717] hover:bg-[#F5F5F5] rounded-lg transition-colors flex items-center gap-2"
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
      </div>

      {/* University Detail Modal */}
      {selectedUniversity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 sm:p-6">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#E5E5E5] flex items-center justify-between sticky top-0 bg-white">
              <div>
                <h2 className="text-xl font-semibold text-[#171717]">{selectedUniversity.name}</h2>
                <p className="text-sm text-[#737373] mt-1">{selectedUniversity.nameEn}</p>
              </div>
              <button
                onClick={() => setSelectedUniversity(null)}
                className="text-[#737373] hover:text-[#171717]"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="font-medium text-[#171717] mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm text-[#737373]">University ID</label>
                    <div className="text-sm font-mono text-[#171717] mt-1">{selectedUniversity.id}</div>
                  </div>
                  <div>
                    <label className="text-sm text-[#737373]">Type</label>
                    <div className="mt-1">{getTypeBadge(selectedUniversity.type)}</div>
                  </div>
                  <div>
                    <label className="text-sm text-[#737373]">Location</label>
                    <div className="text-sm text-[#171717] mt-1">{selectedUniversity.location}</div>
                  </div>
                  <div>
                    <label className="text-sm text-[#737373]">Status</label>
                    <div className="mt-1">{getStatusBadge(selectedUniversity.status)}</div>
                  </div>
                  <div>
                    <label className="text-sm text-[#737373]">Joined Date</label>
                    <div className="text-sm text-[#171717] mt-1">{selectedUniversity.joinedDate}</div>
                  </div>
                  <div>
                    <label className="text-sm text-[#737373]">Last Active</label>
                    <div className="text-sm text-[#171717] mt-1">{selectedUniversity.lastActive}</div>
                  </div>
                </div>
              </div>

              {/* Statistics */}
              <div>
                <h3 className="font-medium text-[#171717] mb-4">Statistics</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="bg-[#FAFAFA] rounded-lg p-4">
                    <div className="text-sm text-[#737373] mb-1">Management Admins</div>
                    <div className="text-2xl font-semibold text-[#171717]">{selectedUniversity.admins}</div>
                  </div>
                  <div className="bg-[#FAFAFA] rounded-lg p-4">
                    <div className="text-sm text-[#737373] mb-1">Total Applications</div>
                    <div className="text-2xl font-semibold text-[#171717]">{selectedUniversity.applications.toLocaleString()}</div>
                  </div>
                  <div className="bg-[#FAFAFA] rounded-lg p-4">
                    <div className="text-sm text-[#737373] mb-1">Acceptance Rate</div>
                    <div className="text-2xl font-semibold text-[#171717]">{selectedUniversity.acceptanceRate}</div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-[#E5E5E5]">
                <button className="flex-1 px-4 py-2.5 border border-[#E5E5E5] rounded-lg text-sm font-medium text-[#171717] hover:bg-[#FAFAFA] transition-colors">
                  Request Profile Edit
                </button>
                <button className="flex-1 px-4 py-2.5 bg-[#171717] text-white rounded-lg text-sm font-medium hover:bg-[#404040] transition-colors">
                  View Full Details
                </button>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-sm text-orange-800">
                  <strong>Note:</strong> All profile changes go through the Drafts & Approvals system. 
                  No direct modifications are allowed from this view.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

