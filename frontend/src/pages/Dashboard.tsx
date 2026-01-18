// User dashboard - displays profile and provides logout
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import avatarIcon from "../assets/avatar.svg";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { getApplications } from "../api/applications";
import type { ApplicationListItem } from "../api/types";

type Profile = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  data: unknown;
  photo: string | null;
  last_seen: string | null;
};

type TopTab = "Settings" | "Personal Info";

const internalTabs: TopTab[] = ["Settings", "Personal Info"];
const externalLinks = [
  { label: "Search", path: "/search" },
  { label: "Applications", path: "/applications" },
];

const sidebarItems: Record<TopTab, { label: string; enabled: boolean }[]> = {
  Settings: [
    { label: "Theme", enabled: false },
    { label: "Notifications", enabled: false },
    { label: "Privacy", enabled: false },
  ],
  "Personal Info": [
    { label: "Name", enabled: true },
    { label: "Email", enabled: true },
    { label: "Siblings", enabled: false },
    { label: "Passport", enabled: false },
  ],
};

function getStatusColor(status: string): string {
  switch (status) {
    case "draft":
      return "bg-gray-100 text-gray-700";
    case "submitted":
      return "bg-blue-100 text-blue-700";
    case "accepted":
      return "bg-green-100 text-green-700";
    case "rejected":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState<TopTab>("Settings");
  const [selectedSidebar, setSelectedSidebar] = useState(sidebarItems[selectedTab][0].label);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [applications, setApplications] = useState<ApplicationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch profile
        const { ok, data } = await api<{ success: boolean; data: Profile; message?: string }>("/v1.0/profile", { method: "GET" });
        if (ok && data.success) {
          setProfile(data.data);
        } else {
          setError(data.message || "Failed to fetch profile");
        }

        // Fetch applications
        try {
          const appResponse = await getApplications();
          if (appResponse.success && appResponse.data) {
            setApplications(appResponse.data);
          }
        } catch {
          // Applications endpoint may not be implemented yet, ignore error
        }
      } catch {
        setError("Failed to fetch profile due to network error");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleTabChange = (tab: TopTab) => {
    setSelectedTab(tab);
    setSelectedSidebar(sidebarItems[tab][0].label);
  };

  const handleSidebarClick = (item: { label: string; enabled: boolean }) => {
    if (item.enabled) {
      setSelectedSidebar(item.label);
    } else {
      setToast(`${item.label} - Coming Soon!`);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-xl text-[#003A81]">Loading...</div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="bg-red-100 text-red-700 px-6 py-4 rounded-lg">
            {error}
          </div>
        </div>
      </Layout>
    );
  }

  const renderMainContent = () => {
    if (selectedTab === "Settings") {
      return (
        <div className="bg-white p-6 rounded-2xl shadow">
          <h3 className="text-lg font-semibold text-[#003A81] mb-4">{selectedSidebar}</h3>
          <p className="text-gray-500">
            {selectedSidebar} settings will be available soon.
          </p>
        </div>
      );
    }

    if (selectedTab === "Personal Info") {
      if (selectedSidebar === "Name" && profile) {
        return (
          <div className="bg-white p-6 rounded-2xl shadow">
            <h3 className="text-lg font-semibold text-[#003A81] mb-4">Name</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">First Name</label>
                <p className="text-lg text-gray-800">{profile.first_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Last Name</label>
                <p className="text-lg text-gray-800">{profile.last_name}</p>
              </div>
            </div>
          </div>
        );
      }

      if (selectedSidebar === "Email" && profile) {
        return (
          <div className="bg-white p-6 rounded-2xl shadow">
            <h3 className="text-lg font-semibold text-[#003A81] mb-4">Email</h3>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Email Address</label>
              <p className="text-lg text-gray-800">{profile.email}</p>
            </div>
          </div>
        );
      }

      return (
        <div className="bg-white p-6 rounded-2xl shadow">
          <h3 className="text-lg font-semibold text-[#003A81] mb-4">{selectedSidebar}</h3>
          <p className="text-gray-500">
            {selectedSidebar} information will be available soon.
          </p>
        </div>
      );
    }

    return null;
  };

  return (
    <Layout>
      {/* Toast notification */}
      {toast && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-[#003A81] text-white px-6 py-3 rounded-lg shadow-lg">
            {toast}
          </div>
        </div>
      )}

      <header className="bg-[#003A81] text-white px-4 md:px-10 py-4 shadow">
        <div className="flex justify-between items-center w-full">
          {user && (
            <span className="text-white font-serif italic leading-tight text-sm md:text-base">
              Welcome, {user.firstName}!
            </span>
          )}
          <div className="flex items-center gap-4">
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition"
            >
              Logout
            </button>
            <img
              src={avatarIcon}
              alt="User avatar"
              className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-white p-1"
            />
          </div>
        </div>
        <div className="flex w-full mt-2">
          <nav className="flex gap-2 ml-auto flex-wrap">
            {/* Internal tabs (Settings, Personal Info) */}
            {internalTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap transition ${
                  selectedTab === tab
                    ? "bg-[#5FB22E] text-white"
                    : "hover:bg-[#006D3E]/60"
                }`}
              >
                {tab}
              </button>
            ))}
            {/* External links (Search, Applications) */}
            {externalLinks.map((link) => (
              <Link
                key={link.label}
                to={link.path}
                className="px-4 py-2 rounded-xl font-medium whitespace-nowrap transition hover:bg-[#006D3E]/60"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <div className="flex flex-col md:flex-row p-4 gap-6">
        {/* Sidebar */}
        <aside className="md:w-64 bg-white p-4 rounded-xl shadow space-y-2">
          {sidebarItems[selectedTab].map((item) => (
            <button
              key={item.label}
              onClick={() => handleSidebarClick(item)}
              className={`block w-full text-left px-4 py-3 rounded-md font-medium transition ${
                selectedSidebar === item.label && item.enabled
                  ? "bg-[#5FB22E] text-white"
                  : item.enabled
                  ? "hover:bg-[#006D3E]/20"
                  : "text-gray-400 cursor-not-allowed hover:bg-gray-100"
              }`}
            >
              {item.label}
              {!item.enabled && (
                <span className="ml-2 text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded">
                  Soon
                </span>
              )}
            </button>
          ))}
        </aside>

        <main className="flex-1 p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold mb-6 text-[#003A81] tracking-wide">
              {selectedSidebar}
            </h2>

            {/* Profile Info Card - always visible */}
            {profile && (
              <div className="bg-white p-6 rounded-2xl shadow mb-6">
                <h3 className="text-lg font-semibold text-[#003A81] mb-4">Profile Info</h3>
                <div className="space-y-2 text-gray-700">
                  <p><span className="font-medium">Name:</span> {profile.first_name} {profile.last_name}</p>
                  <p><span className="font-medium">Email:</span> {profile.email}</p>
                  <p><span className="font-medium">ID:</span> {profile.id}</p>
                </div>
              </div>
            )}

            {/* Dynamic content based on selected sidebar */}
            {renderMainContent()}

            {/* Applications section */}
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-[#003A81]">My Applications</h3>
                <Link
                  to="/applications"
                  className="text-[#006D3E] hover:text-[#5FB22E] text-sm font-medium"
                >
                  View All
                </Link>
              </div>

              {applications.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                  {applications.slice(0, 3).map((app) => (
                    <div
                      key={`${app.university_id}-${app.application_cycle}`}
                      className="bg-white p-6 rounded-2xl shadow hover:shadow-lg transition cursor-pointer"
                      onClick={() => navigate(`/applications/${app.university_id}/${app.application_cycle}`)}
                    >
                      <h4 className="text-lg font-semibold text-[#003A81]">
                        {app.university_name}
                      </h4>
                      <p className="text-gray-600 mt-1 text-sm">
                        Cycle: {app.application_cycle}
                      </p>
                      <div className="mt-3">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(app.status)}`}>
                          {app.status}
                        </span>
                      </div>
                      <p className="text-gray-400 text-xs mt-3">
                        Created: {new Date(app.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white p-8 rounded-2xl shadow text-center">
                  <p className="text-gray-500 mb-4">No applications yet</p>
                  <Link
                    to="/search"
                    className="inline-block px-6 py-3 bg-[#006D3E] text-white rounded-lg hover:bg-[#5FB22E] transition font-medium"
                  >
                    Browse Universities
                  </Link>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </Layout>
  );
}
