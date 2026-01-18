// Applications.tsx - Applications list page with management actions.
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { getApplications, deleteApplication } from '../api/applications';
import { useAuth } from '../context/AuthContext';
import type { ApplicationListItem } from '../api/types';

function getStatusColor(status: string): string {
  switch (status) {
    case 'draft':
      return 'bg-gray-100 text-gray-700';
    case 'submitted':
      return 'bg-blue-100 text-blue-700';
    case 'accepted':
      return 'bg-green-100 text-green-700';
    case 'rejected':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

export default function Applications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<ApplicationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchApplications = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getApplications();
        if (response.success) {
          setApplications(response.data || []);
        } else {
          setError(response.message);
        }
      } catch {
        setError('Failed to fetch applications');
      } finally {
        setLoading(false);
      }
    };
    fetchApplications();
  }, []);

  const handleDelete = async (universityId: string, cycle: string, universityName: string) => {
    if (!confirm(`Delete application for ${universityName} (${cycle})?`)) return;
    try {
      const response = await deleteApplication(universityId, cycle);
      if (response.success) {
        setApplications((prev) =>
          prev.filter((app) => !(app.university_id === universityId && app.application_cycle === cycle))
        );
      } else {
        alert(response.message);
      }
    } catch {
      alert('Failed to delete application');
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (!user) {
    navigate('/signin');
    return null;
  }

  return (
    <Layout>
      {/* Header */}
      <header className="bg-[#003A81] text-white px-4 md:px-10 py-6 shadow">
        <div className="max-w-7xl mx-auto">
          <Link
            to="/dashboard"
            className="inline-flex items-center text-white/80 hover:text-white mb-4 transition"
          >
            <span className="mr-2">←</span> Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">My Applications</h1>
              <p className="text-white/70 mt-1">Track and manage your university applications</p>
            </div>
            <Link
              to="/search"
              className="px-6 py-3 bg-[#5FB22E] text-white rounded-lg hover:bg-[#006D3E] transition font-medium"
            >
              Browse Universities
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-10 py-8">
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="text-xl text-[#003A81]">Loading applications...</div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-100 text-red-700 px-6 py-4 rounded-lg text-center">
            {error}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && applications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-8xl mb-6">📝</div>
            <h2 className="text-3xl font-bold text-[#003A81] mb-3">No applications yet</h2>
            <p className="text-gray-500 text-lg max-w-md mb-8">
              Start by browsing universities and applying to your favorites
            </p>
            <Link
              to="/search"
              className="px-8 py-4 bg-[#006D3E] text-white rounded-xl hover:bg-[#5FB22E] transition font-semibold text-lg"
            >
              Browse Universities
            </Link>
          </div>
        )}

        {/* Applications List */}
        {!loading && !error && applications.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {applications.map((app) => (
              <div
                key={`${app.university_id}-${app.application_cycle}`}
                className="bg-white p-6 rounded-2xl shadow hover:shadow-lg transition border border-gray-100"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <Link
                    to={`/university/${app.university_id}`}
                    className="text-lg font-semibold text-[#003A81] hover:text-[#006D3E] transition"
                  >
                    {app.university_name}
                  </Link>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(app.status)}`}
                  >
                    {app.status}
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <p>
                    <span className="font-medium">Cycle:</span> {app.application_cycle}
                  </p>
                  <p>
                    <span className="font-medium">Created:</span> {formatDate(app.created_at)}
                  </p>
                  {app.submitted_at && (
                    <p>
                      <span className="font-medium">Submitted:</span> {formatDate(app.submitted_at)}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t border-gray-100">
                  <Link
                    to={`/applications/${app.university_id}/${app.application_cycle}`}
                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-center text-sm font-medium"
                  >
                    View
                  </Link>
                  {app.status === 'draft' && (
                    <>
                      <Link
                        to={`/applications/${app.university_id}/${app.application_cycle}/edit`}
                        className="flex-1 px-4 py-2 bg-[#006D3E] text-white rounded-lg hover:bg-[#5FB22E] transition text-center text-sm font-medium"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(app.university_id, app.application_cycle, app.university_name)}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition text-sm font-medium"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </Layout>
  );
}
