// Search.tsx - University search page with API integration.
import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { getUniversities, searchUniversities } from '../api/universities';
import type { UniversityListItem } from '../api/types';

export default function Search() {
  const [searchTerm, setSearchTerm] = useState('');
  const [universities, setUniversities] = useState<UniversityListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const navigate = useNavigate();

  const fetchUniversities = useCallback(async (currentPage: number, query?: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = query
        ? await searchUniversities({ q: query, page: currentPage, limit: 10 })
        : await getUniversities(currentPage, 10);
      if (response.success) {
        setUniversities(response.data.items || []);
        setTotalPages(response.data.totalPages);
        setPage(response.data.page);
      } else {
        setError(response.message);
      }
    } catch {
      setError('Failed to fetch universities');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUniversities(1);
  }, [fetchUniversities]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchUniversities(1, searchTerm || undefined);
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm, fetchUniversities]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      fetchUniversities(newPage, searchTerm || undefined);
    }
  };

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
          <h1 className="text-3xl font-bold">Browse Universities</h1>
          <p className="text-white/70 mt-1">Find and apply to your dream university</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-10 py-8">
        {/* Search Input */}
        <div className="mb-8">
          <div className="relative">
            <input
              type="text"
              className="w-full px-6 py-4 text-lg border-2 border-gray-200 rounded-xl focus:border-[#006D3E] focus:outline-none transition"
              placeholder="Search universities by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">
              🔍
            </span>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="text-xl text-[#003A81]">Loading universities...</div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-100 text-red-700 px-6 py-4 rounded-lg text-center">
            {error}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && universities.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-6xl mb-4">🏫</div>
            <h2 className="text-2xl font-semibold text-[#003A81] mb-2">No universities found</h2>
            <p className="text-gray-500 max-w-md">
              {searchTerm
                ? `No universities match "${searchTerm}". Try a different search term.`
                : 'No universities are available at the moment. Please check back later.'}
            </p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="mt-4 px-6 py-2 bg-[#006D3E] text-white rounded-lg hover:bg-[#5FB22E] transition"
              >
                Clear Search
              </button>
            )}
          </div>
        )}

        {/* Results */}
        {!loading && !error && universities.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {universities.map((u) => (
                <div
                  key={u.id}
                  onClick={() => navigate(`/university/${u.id}`)}
                  className="bg-white p-6 rounded-2xl shadow hover:shadow-lg transition cursor-pointer border border-gray-100"
                >
                  <h3 className="text-lg font-semibold text-[#003A81] mb-2">{u.name}</h3>
                  <div className="space-y-1 text-sm text-gray-600">
                    {u.province && (
                      <p className="flex items-center">
                        <span className="text-gray-400 mr-2">📍</span>
                        {u.province}
                      </p>
                    )}
                    {u.ranking && (
                      <p className="flex items-center">
                        <span className="text-gray-400 mr-2">🏆</span>
                        Rank: #{u.ranking}
                      </p>
                    )}
                    {u.applicationFee && (
                      <p className="flex items-center">
                        <span className="text-gray-400 mr-2">💰</span>
                        Fee: R{u.applicationFee}
                      </p>
                    )}
                  </div>
                  <button className="mt-4 w-full px-4 py-2 bg-[#006D3E] text-white rounded-lg hover:bg-[#5FB22E] transition text-sm font-medium">
                    View Details
                  </button>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-8">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1}
                  className="px-4 py-2 bg-[#003A81] text-white rounded-lg hover:bg-[#003A81]/80 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Previous
                </button>
                <span className="text-gray-600 font-medium">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= totalPages}
                  className="px-4 py-2 bg-[#003A81] text-white rounded-lg hover:bg-[#003A81]/80 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </Layout>
  );
}
