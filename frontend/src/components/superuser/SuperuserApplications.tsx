// @ts-nocheck
import React, { useState } from 'react';
import { 
  Search, 
  FileText, 
  Eye,
  Download,
  Calendar,
  User,
  Building2,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Filter
} from 'lucide-react';

type ApplicationStatus = 'submitted' | 'under-review' | 'accepted' | 'rejected' | 'withdrawn';

interface Application {
  id: string;
  applicantId: string;
  applicantName: string;
  applicantEmail: string;
  university: string;
  universityId: string;
  program: string;
  status: ApplicationStatus;
  submittedDate: string;
  lastUpdated: string;
  reviewedBy?: string;
}

interface SuperuserApplicationsProps {
  searchApplicationById?: (id: string) => Promise<Application | null>;
  summary?: {
    totalApplications?: string;
    underReview?: string;
    acceptedToday?: string;
    avgReviewTime?: string;
  };
}

export default function SuperuserApplications({ searchApplicationById, summary }: SuperuserApplicationsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);

  // Mock application for search demonstration
  const searchApplication = async (id: string) => {
    if (searchApplicationById) {
      const found = await searchApplicationById(id);
      if (found) {
        setSelectedApplication(found);
        return;
      }
      alert('Application not found.');
      return;
    }

    // Simulate search
    if (id === 'APP-2024-12345') {
      setSelectedApplication({
        id: 'APP-2024-12345',
        applicantId: 'USER-45678',
        applicantName: 'Wang Xiaoming',
        applicantEmail: 'wxm@example.com',
        university: 'Tsinghua University',
        universityId: 'UNI-001',
        program: 'Master of Computer Science',
        status: 'under-review',
        submittedDate: '2024-01-15 14:30',
        lastUpdated: '2024-01-18 10:20',
        reviewedBy: 'admin@tsinghua.edu.cn'
      });
    } else {
      alert('Application not found. Try APP-2024-12345');
    }
  };

  const getStatusBadge = (status: ApplicationStatus) => {
    const styles = {
      submitted: 'bg-blue-50 text-blue-700 border-blue-200',
      'under-review': 'bg-orange-50 text-orange-700 border-orange-200',
      accepted: 'bg-green-50 text-green-700 border-green-200',
      rejected: 'bg-red-50 text-red-700 border-red-200',
      withdrawn: 'bg-gray-50 text-gray-700 border-gray-200',
    };

    const icons = {
      submitted: FileText,
      'under-review': Clock,
      accepted: CheckCircle,
      rejected: XCircle,
      withdrawn: AlertCircle,
    };

    const Icon = icons[status];

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status]}`}>
        <Icon className="w-3 h-3" />
        {status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
      </span>
    );
  };

  return (
    <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#171717] mb-2">Applications</h1>
        <p className="text-[#737373]">
          Search and view application submissions across all universities
        </p>
      </div>

      {/* Search Card */}
      <div className="mb-6 rounded-xl border border-[#E5E5E5] bg-white p-4 sm:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-[#171717] mb-2">Pull Application by ID</h2>
            <p className="text-[#737373]">
              Enter an application ID to view details and submission data
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
                    void searchApplication(searchQuery.trim());
                  }
                }}
                placeholder="Enter application ID (e.g., APP-2024-12345)"
                className="w-full pl-12 pr-4 py-3.5 border border-[#E5E5E5] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#171717] focus:border-transparent"
              />
            </div>
            <button
              onClick={() => searchQuery.trim() && void searchApplication(searchQuery.trim())}
              className="px-6 py-3.5 bg-[#171717] text-white rounded-lg text-sm font-medium hover:bg-[#404040] transition-colors"
            >
              Search
            </button>
          </div>

          <div className="mt-4 text-sm text-[#737373]">
            <strong>Try:</strong> APP-2024-12345
          </div>
        </div>
      </div>

      {/* Recent Searches / Global Stats */}
      <div className="mb-6 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <div className="bg-white rounded-xl border border-[#E5E5E5] p-6">
          <div className="text-sm text-[#737373] mb-2">Total Applications</div>
          <div className="text-2xl font-semibold text-[#171717]">{summary?.totalApplications ?? '156,892'}</div>
          <div className="text-xs text-[#A3A3A3] mt-2">Across all universities</div>
        </div>

        <div className="bg-white rounded-xl border border-[#E5E5E5] p-6">
          <div className="text-sm text-[#737373] mb-2">Under Review</div>
          <div className="text-2xl font-semibold text-[#171717]">{summary?.underReview ?? '3,421'}</div>
          <div className="text-xs text-[#A3A3A3] mt-2">Pending university review</div>
        </div>

        <div className="bg-white rounded-xl border border-[#E5E5E5] p-6">
          <div className="text-sm text-[#737373] mb-2">Accepted Today</div>
          <div className="text-2xl font-semibold text-[#171717]">{summary?.acceptedToday ?? '89'}</div>
          <div className="text-xs text-[#A3A3A3] mt-2">In the last 24 hours</div>
        </div>

        <div className="bg-white rounded-xl border border-[#E5E5E5] p-6">
          <div className="text-sm text-[#737373] mb-2">Avg. Review Time</div>
          <div className="text-2xl font-semibold text-[#171717]">{summary?.avgReviewTime ?? '5.2 days'}</div>
          <div className="text-xs text-[#A3A3A3] mt-2">Platform average</div>
        </div>
      </div>

      {/* Application Result */}
      {selectedApplication && (
        <div className="bg-white rounded-xl border border-[#E5E5E5]">
          <div className="flex flex-col gap-3 border-b border-[#E5E5E5] p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#171717] mb-1">Application Details</h2>
              <p className="text-sm text-[#737373]">{selectedApplication.id}</p>
            </div>
            <div className="flex items-center gap-3">
              {getStatusBadge(selectedApplication.status)}
              <button className="px-4 py-2 border border-[#E5E5E5] rounded-lg text-sm font-medium text-[#171717] hover:bg-[#FAFAFA] transition-colors flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Applicant Info */}
            <div>
              <h3 className="font-medium text-[#171717] mb-4">Applicant Information</h3>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div>
                  <label className="text-sm text-[#737373]">Applicant ID</label>
                  <div className="text-sm font-mono text-[#171717] mt-1">{selectedApplication.applicantId}</div>
                </div>
                <div>
                  <label className="text-sm text-[#737373]">Full Name</label>
                  <div className="text-sm text-[#171717] mt-1">{selectedApplication.applicantName}</div>
                </div>
                <div>
                  <label className="text-sm text-[#737373]">Email</label>
                  <div className="text-sm text-[#171717] mt-1">{selectedApplication.applicantEmail}</div>
                </div>
              </div>
            </div>

            {/* University & Program */}
            <div>
              <h3 className="font-medium text-[#171717] mb-4">University & Program</h3>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label className="text-sm text-[#737373]">University</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Building2 className="w-4 h-4 text-[#737373]" />
                    <span className="text-sm text-[#171717]">{selectedApplication.university}</span>
                    <span className="text-xs text-[#A3A3A3] font-mono">({selectedApplication.universityId})</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-[#737373]">Program</label>
                  <div className="text-sm text-[#171717] mt-1">{selectedApplication.program}</div>
                </div>
              </div>
            </div>

            {/* Application Timeline */}
            <div>
              <h3 className="font-medium text-[#171717] mb-4">Timeline</h3>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div>
                  <label className="text-sm text-[#737373]">Submitted</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="w-4 h-4 text-[#737373]" />
                    <span className="text-sm text-[#171717]">{selectedApplication.submittedDate}</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-[#737373]">Last Updated</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="w-4 h-4 text-[#737373]" />
                    <span className="text-sm text-[#171717]">{selectedApplication.lastUpdated}</span>
                  </div>
                </div>
                {selectedApplication.reviewedBy && (
                  <div>
                    <label className="text-sm text-[#737373]">Reviewed By</label>
                    <div className="text-sm text-[#171717] mt-1">{selectedApplication.reviewedBy}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 border-t border-[#E5E5E5] pt-4 md:flex-row">
              <button className="flex-1 px-4 py-2.5 border border-[#E5E5E5] rounded-lg text-sm font-medium text-[#171717] hover:bg-[#FAFAFA] transition-colors flex items-center justify-center gap-2">
                <Eye className="w-4 h-4" />
                View Full Application
              </button>
              <button className="flex-1 px-4 py-2.5 border border-[#E5E5E5] rounded-lg text-sm font-medium text-[#171717] hover:bg-[#FAFAFA] transition-colors flex items-center justify-center gap-2">
                <User className="w-4 h-4" />
                View Applicant Profile
              </button>
              <button className="flex-1 px-4 py-2.5 bg-[#171717] text-white rounded-lg text-sm font-medium hover:bg-[#404040] transition-colors">
                Access Review Portal
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Permission-Aware Access:</strong> When viewing application details, 
                the system will respect university-level permissions and only show data 
                that you have authorization to access.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!selectedApplication && (
        <div className="bg-white rounded-xl border border-[#E5E5E5] p-12 text-center">
          <div className="w-16 h-16 bg-[#F5F5F5] rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-[#A3A3A3]" />
          </div>
          <h3 className="font-medium text-[#171717] mb-2">No Application Selected</h3>
          <p className="text-[#737373] text-sm">
            Search for an application ID above to view details
          </p>
        </div>
      )}
    </div>
  );
}

