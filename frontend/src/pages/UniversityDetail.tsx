/**
 * UniversityDetail.tsx
 * University detail page with API integration and favorites.
 * Uses properly typed interfaces to avoid 'unknown' type issues in JSX.
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { getUniversity } from '../api/universities';
import { isFavorite, addFavorite, removeFavorite } from '../api/favorites';
import { createApplication } from '../api/applications';
import { useAuth } from '../context/AuthContext';
import type { University } from '../api/types';

/**
 * Generate application cycle based on current date
 * Jan-Jun: "{year}-Spring"
 * Jul-Dec: "{year}-Fall"
 */
function getApplicationCycle(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-11
  const season = month < 6 ? 'Spring' : 'Fall';
  return `${year}-${season}`;
}

export default function UniversityDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [university, setUniversity] = useState<University | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFav, setIsFav] = useState(false);
  const [favLoading, setFavLoading] = useState(false);

  // Application state
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [existingCycle, setExistingCycle] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError('University ID not provided');
      setLoading(false);
      return;
    }
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getUniversity(id);
        if (response.success) {
          setUniversity(response.data);
          if (user) {
            const favResponse = await isFavorite(id);
            if (favResponse.success) {
              setIsFav(favResponse.data.is_favorite);
            }
          }
        } else {
          setError(response.message);
        }
      } catch {
        setError('Failed to fetch university');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, user]);

  const handleFavoriteToggle = async () => {
    if (!id || favLoading) return;
    setFavLoading(true);
    try {
      if (isFav) {
        const response = await removeFavorite(id);
        if (response.success) setIsFav(false);
      } else {
        const response = await addFavorite(id);
        if (response.success) setIsFav(true);
      }
    } catch {
      console.error('Failed to update favorite');
    } finally {
      setFavLoading(false);
    }
  };

  const handleApplyNow = async () => {
    if (!id || !user || applyLoading) return;

    setApplyLoading(true);
    setApplyError(null);
    setExistingCycle(null);

    const cycle = getApplicationCycle();

    try {
      const { status, data } = await createApplication({
        university_id: id,
        application_cycle: cycle,
        data: {},
      });

      if (status === 201 && data.success) {
        // Success - navigate to edit the draft
        navigate(`/applications/${id}/${cycle}/edit`);
      } else if (status === 409) {
        // Conflict - application already exists
        setExistingCycle(cycle);
        setApplyError('You already have an application for this cycle');
      } else {
        // Other error
        setApplyError(data.message || 'Failed to create application');
      }
    } catch {
      setApplyError('Failed to create application. Please try again.');
    } finally {
      setApplyLoading(false);
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

  if (error || !university) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-[#003A81] mb-4">{error || 'University not found'}</h2>
            <button
              className="px-6 py-3 bg-[#006D3E] text-white rounded-lg hover:bg-[#5FB22E] transition"
              onClick={() => navigate('/search')}
            >
              Back to Search
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  // Extract typed metadata for cleaner JSX
  const requirements = university.metadata?.requirements;
  const contact = university.metadata?.contact;

  return (
    <Layout>
      {/* Header */}
      <header className="bg-[#003A81] text-white px-4 md:px-10 py-6 shadow">
        <div className="max-w-4xl mx-auto">
          <Link
            to="/search"
            className="inline-flex items-center text-white/80 hover:text-white mb-4 transition"
          >
            <span className="mr-2">←</span> Back to Search
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">{university.name}</h1>
              {university.province && (
                <p className="text-white/70 mt-1 flex items-center">
                  <span className="mr-2">📍</span> {university.province}
                </p>
              )}
            </div>
            {user && (
              <button
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  isFav
                    ? 'bg-yellow-400 text-yellow-900 hover:bg-yellow-300'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
                onClick={handleFavoriteToggle}
                disabled={favLoading}
              >
                {favLoading ? '...' : isFav ? '★ Favorited' : '☆ Favorite'}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 md:px-10 py-8">
        {/* Quick Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {university.ranking !== null && university.ranking > 0 && (
            <div className="bg-white p-4 rounded-xl shadow text-center">
              <div className="text-3xl font-bold text-[#003A81]">#{university.ranking}</div>
              <div className="text-gray-500 text-sm">National Ranking</div>
            </div>
          )}
          {university.applicationFee !== null && university.applicationFee > 0 && (
            <div className="bg-white p-4 rounded-xl shadow text-center">
              <div className="text-3xl font-bold text-[#006D3E]">${university.applicationFee}</div>
              <div className="text-gray-500 text-sm">Application Fee</div>
            </div>
          )}
          <div className="bg-white p-4 rounded-xl shadow text-center">
            <div className="text-3xl font-bold text-[#5FB22E]">{getApplicationCycle()}</div>
            <div className="text-gray-500 text-sm">Current Cycle</div>
          </div>
        </div>

        {/* Description */}
        {university.description && (
          <div className="bg-white p-6 rounded-2xl shadow mb-6">
            <h2 className="text-xl font-semibold text-[#003A81] mb-3">About</h2>
            <p className="text-gray-700 leading-relaxed">{university.description}</p>
          </div>
        )}

        {/* Requirements from metadata - now properly typed */}
        {requirements && (
          <div className="bg-white p-6 rounded-2xl shadow mb-6">
            <h2 className="text-xl font-semibold text-[#003A81] mb-3">Requirements</h2>
            <div className="space-y-2 text-gray-700">
              {requirements.recommendation_letters !== undefined && requirements.recommendation_letters > 0 && (
                <p className="flex items-center">
                  <span className="mr-2">📄</span>
                  {requirements.recommendation_letters} recommendation letter(s) required
                </p>
              )}
              {requirements.essay_required && (
                <p className="flex items-center">
                  <span className="mr-2">✍️</span>
                  Essay required
                </p>
              )}
              {requirements.standardized_tests && requirements.standardized_tests.length > 0 && (
                <p className="flex items-center">
                  <span className="mr-2">📝</span>
                  Tests: {requirements.standardized_tests.join(', ')}
                </p>
              )}
              {requirements.minimum_gpa !== undefined && requirements.minimum_gpa > 0 && (
                <p className="flex items-center">
                  <span className="mr-2">📊</span>
                  Minimum GPA: {requirements.minimum_gpa}
                </p>
              )}
              {requirements.application_deadline && (
                <p className="flex items-center">
                  <span className="mr-2">📅</span>
                  Deadline: {requirements.application_deadline}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Contact from metadata - now properly typed */}
        {contact && (
          <div className="bg-white p-6 rounded-2xl shadow mb-6">
            <h2 className="text-xl font-semibold text-[#003A81] mb-3">Contact</h2>
            <div className="space-y-2 text-gray-700">
              {contact.email && (
                <p className="flex items-center">
                  <span className="mr-2">📧</span>
                  <a href={`mailto:${contact.email}`} className="text-[#006D3E] hover:underline">
                    {contact.email}
                  </a>
                </p>
              )}
              {contact.phone && (
                <p className="flex items-center">
                  <span className="mr-2">📞</span>
                  {contact.phone}
                </p>
              )}
              {contact.website && (
                <p className="flex items-center">
                  <span className="mr-2">🌐</span>
                  <a href={contact.website} target="_blank" rel="noopener noreferrer" className="text-[#006D3E] hover:underline">
                    {contact.website}
                  </a>
                </p>
              )}
              {contact.address && (
                <p className="flex items-center">
                  <span className="mr-2">📍</span>
                  {contact.address}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Apply Error Message */}
        {applyError && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-6 py-4 rounded-lg mb-6">
            <p className="font-medium">{applyError}</p>
            {existingCycle && id && (
              <Link
                to={`/applications/${id}/${existingCycle}`}
                className="inline-block mt-2 text-[#006D3E] hover:underline font-medium"
              >
                View existing application →
              </Link>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          {user ? (
            <button
              className="flex-1 px-8 py-4 bg-[#006D3E] text-white rounded-xl hover:bg-[#5FB22E] transition font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleApplyNow}
              disabled={applyLoading}
            >
              {applyLoading ? 'Creating Application...' : 'Apply Now'}
            </button>
          ) : (
            <Link
              to="/signin"
              className="flex-1 px-8 py-4 bg-[#006D3E] text-white rounded-xl hover:bg-[#5FB22E] transition font-semibold text-lg text-center"
            >
              Sign In to Apply
            </Link>
          )}
          <button
            className="flex-1 px-8 py-4 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition font-semibold text-lg"
            onClick={() => navigate('/search')}
          >
            Back to Search
          </button>
        </div>
      </main>
    </Layout>
  );
}
