import { useMemo, useState } from "react";
import {
  CheckCircle,
  Clock,
  Download,
  Eye,
  FileText,
  MapPin,
  Search,
  Users,
  XCircle,
} from "lucide-react";
import { EmptyState } from "../common/PageState";

type UniversityStatus = "active" | "inactive" | "pending" | "suspended";
type UniversityType = "public" | "private" | "international";

export interface StaffUniversityView {
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

interface StaffUniversitiesProps {
  universitiesData?: StaffUniversityView[];
  onViewDetails?: (universityId: string) => void;
  onEditProfile?: (universityId: string) => void;
}

export default function StaffUniversities({
  universitiesData = [],
  onViewDetails,
  onEditProfile,
}: StaffUniversitiesProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<UniversityStatus | "all">("all");
  const [selectedType, setSelectedType] = useState<UniversityType | "all">("all");
  const [selectedUniversity, setSelectedUniversity] = useState<StaffUniversityView | null>(null);

  const filteredUniversities = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return universitiesData.filter((university) => {
      const matchesSearch =
        normalizedQuery.length === 0 ||
        university.name.toLowerCase().includes(normalizedQuery) ||
        university.nameEn.toLowerCase().includes(normalizedQuery) ||
        university.id.toLowerCase().includes(normalizedQuery) ||
        university.location.toLowerCase().includes(normalizedQuery);

      const matchesStatus = selectedStatus === "all" || university.status === selectedStatus;
      const matchesType = selectedType === "all" || university.type === selectedType;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [searchQuery, selectedStatus, selectedType, universitiesData]);

  const getStatusBadge = (status: UniversityStatus) => {
    const styles = {
      active: "bg-green-50 text-green-700 border-green-200",
      inactive: "bg-gray-50 text-gray-700 border-gray-200",
      pending: "bg-orange-50 text-orange-700 border-orange-200",
      suspended: "bg-red-50 text-red-700 border-red-200",
    };

    const icons = {
      active: CheckCircle,
      inactive: XCircle,
      pending: Clock,
      suspended: XCircle,
    };

    const Icon = icons[status];
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${styles[status]}`}>
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getTypeBadge = (type: UniversityType) => {
    const styles = {
      public: "bg-secondary text-secondary-foreground border border-border",
      private: "bg-primary/10 text-primary border border-primary/20",
      international: "bg-accent text-accent-foreground border border-border",
    };

    return (
      <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${styles[type]}`}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </span>
    );
  };

  const emptyTitle = universitiesData.length === 0 ? "No universities available" : "No universities match your filters";
  const emptyDescription =
    universitiesData.length === 0
      ? "Live university records will appear here once the backend returns data."
      : "Adjust your search or filters and try again.";

  return (
    <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="mb-2 text-2xl font-semibold text-[#171717]">Universities</h1>
        <p className="text-[#737373]">Manage all universities on the platform. All changes go through approval.</p>
      </div>

      <div className="mb-6 rounded-lg border border-[#E5E5E5] bg-white p-4 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A3A3A3]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by name, ID, or location..."
              className="w-full rounded-lg border border-[#E5E5E5] py-2.5 pl-10 pr-4 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#171717]"
            />
          </div>

          <select
            value={selectedStatus}
            onChange={(event) => setSelectedStatus(event.target.value as UniversityStatus | "all")}
            className="w-full rounded-lg border border-[#E5E5E5] bg-white px-4 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#171717] lg:w-auto"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>

          <select
            value={selectedType}
            onChange={(event) => setSelectedType(event.target.value as UniversityType | "all")}
            className="w-full rounded-lg border border-[#E5E5E5] bg-white px-4 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#171717] lg:w-auto"
          >
            <option value="all">All Types</option>
            <option value="public">Public</option>
            <option value="private">Private</option>
            <option value="international">International</option>
          </select>

          <button className="flex items-center justify-center gap-2 rounded-lg border border-[#E5E5E5] px-4 py-2.5 text-sm font-medium text-[#171717] transition-colors hover:bg-[#FAFAFA] lg:w-auto">
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>

        <div className="mt-4 flex items-center gap-4 text-sm text-[#737373]">
          <span>
            Showing {filteredUniversities.length} of {universitiesData.length} universities
          </span>
        </div>
      </div>

      {filteredUniversities.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <div className="overflow-hidden rounded-lg border border-[#E5E5E5] bg-white">
          <div className="space-y-3 p-4 md:hidden">
            {filteredUniversities.map((university) => (
              <div key={university.id} className="space-y-3 rounded-lg border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-[#171717]">{university.name}</div>
                    <div className="text-sm text-[#737373]">{university.nameEn}</div>
                    <div className="font-mono text-xs text-[#A3A3A3]">{university.id}</div>
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
                    <div>
                    {university.admins} / {university.applications.toLocaleString()}
                    </div>
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
                  <Eye className="h-4 w-4" />
                  View
                </button>
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E5E5E5] bg-[#FAFAFA]">
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-[#737373]">University</th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-[#737373]">Type</th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-[#737373]">Location</th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-[#737373]">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-[#737373]">Admins</th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-[#737373]">Applications</th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-[#737373]">Last Active</th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-[#737373]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5F5F5]">
                {filteredUniversities.map((university) => (
                  <tr key={university.id} className="transition-colors hover:bg-[#FAFAFA]">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-[#171717]">{university.name}</div>
                        <div className="mt-0.5 text-sm text-[#737373]">{university.nameEn}</div>
                        <div className="mt-0.5 font-mono text-xs text-[#A3A3A3]">{university.id}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">{getTypeBadge(university.type)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-[#737373]">
                        <MapPin className="h-4 w-4" />
                        {university.location}
                      </div>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(university.status)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-[#737373]">
                        <Users className="h-4 w-4" />
                    {university.admins}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-[#737373]">
                        <FileText className="h-4 w-4" />
                        {university.applications.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-[#737373]">{university.lastActive}</span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setSelectedUniversity(university)}
                        className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-[#171717] transition-colors hover:bg-[#F5F5F5]"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedUniversity ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 sm:p-6">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white">
            <div className="sticky top-0 flex items-center justify-between border-b border-[#E5E5E5] bg-white p-6">
              <div>
                <h2 className="text-xl font-semibold text-[#171717]">{selectedUniversity.name}</h2>
                <p className="mt-1 text-sm text-[#737373]">{selectedUniversity.nameEn}</p>
              </div>
              <button onClick={() => setSelectedUniversity(null)} className="text-[#737373] hover:text-[#171717]">
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6 p-6">
              <div>
                <h3 className="mb-4 font-medium text-[#171717]">Basic Information</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm text-[#737373]">University ID</label>
                    <div className="mt-1 font-mono text-sm text-[#171717]">{selectedUniversity.id}</div>
                  </div>
                  <div>
                    <label className="text-sm text-[#737373]">Type</label>
                    <div className="mt-1">{getTypeBadge(selectedUniversity.type)}</div>
                  </div>
                  <div>
                    <label className="text-sm text-[#737373]">Location</label>
                    <div className="mt-1 text-sm text-[#171717]">{selectedUniversity.location}</div>
                  </div>
                  <div>
                    <label className="text-sm text-[#737373]">Status</label>
                    <div className="mt-1">{getStatusBadge(selectedUniversity.status)}</div>
                  </div>
                  <div>
                    <label className="text-sm text-[#737373]">Joined Date</label>
                    <div className="mt-1 text-sm text-[#171717]">{selectedUniversity.joinedDate}</div>
                  </div>
                  <div>
                    <label className="text-sm text-[#737373]">Last Active</label>
                    <div className="mt-1 text-sm text-[#171717]">{selectedUniversity.lastActive}</div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="mb-4 font-medium text-[#171717]">Statistics</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="rounded-lg bg-[#FAFAFA] p-4">
                    <div className="mb-1 text-sm text-[#737373]">Partner Admins</div>
                    <div className="text-2xl font-semibold text-[#171717]">{selectedUniversity.admins}</div>
                  </div>
                  <div className="rounded-lg bg-[#FAFAFA] p-4">
                    <div className="mb-1 text-sm text-[#737373]">Total Applications</div>
                    <div className="text-2xl font-semibold text-[#171717]">
                      {selectedUniversity.applications.toLocaleString()}
                    </div>
                  </div>
                  <div className="rounded-lg bg-[#FAFAFA] p-4">
                    <div className="mb-1 text-sm text-[#737373]">Acceptance Rate</div>
                    <div className="text-2xl font-semibold text-[#171717]">{selectedUniversity.acceptanceRate}</div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 border-t border-[#E5E5E5] pt-4">
                <button
                  className="flex-1 rounded-lg border border-[#E5E5E5] px-4 py-2.5 text-sm font-medium text-[#171717] transition-colors hover:bg-[#FAFAFA]"
                  onClick={() => onEditProfile?.(selectedUniversity.id)}
                >
                  Request Profile Edit
                </button>
                <button
                  className="flex-1 rounded-lg bg-[#171717] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#404040]"
                  onClick={() => onViewDetails?.(selectedUniversity.id)}
                >
                  View Full Details
                </button>
              </div>

              <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                <p className="text-sm text-orange-800">
                  <strong>Note:</strong> All profile changes go through the approval system. No direct modifications are allowed from this view.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
