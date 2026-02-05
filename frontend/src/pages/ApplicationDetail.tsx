// ApplicationDetail.tsx - Application detail and edit page.
import { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import Layout from '../components/Layout';
import { getApplication, updateApplication, submitApplication } from '../api/applications';
import { getUniversity } from '../api/universities';
import type { Application, University } from '../api/types';

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

export default function ApplicationDetail() {
  const { universityId, cycle } = useParams<{ universityId: string; cycle: string }>();
  const location = useLocation();
  const isEditMode = location.pathname.endsWith('/edit');

  const [application, setApplication] = useState<Application | null>(null);
  const [university, setUniversity] = useState<University | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState('{}');
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!universityId || !cycle) {
      setError('Missing application parameters');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch application and university in parallel
        const [appResponse, uniResponse] = await Promise.all([
          getApplication(universityId, cycle),
          getUniversity(universityId),
        ]);

        if (appResponse.success) {
          setApplication(appResponse.data);
          setFormData(JSON.stringify(appResponse.data.data || {}, null, 2));
        } else {
          setError(appResponse.message || 'Failed to fetch application');
        }

        if (uniResponse.success) {
          setUniversity(uniResponse.data);
        }
      } catch {
        setError('Failed to fetch application');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [universityId, cycle]);

  // Auto-dismiss save message
  useEffect(() => {
    if (saveMessage) {
      const timer = setTimeout(() => setSaveMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [saveMessage]);

  const handleSave = async () => {
    if (!universityId || !cycle || saving) return;

    let parsedData: Record<string, unknown>;
    try {
      parsedData = JSON.parse(formData);
    } catch {
      setSaveMessage({ type: 'error', text: 'Invalid JSON format' });
      return;
    }

    setSaving(true);
    setSaveMessage(null);

    try {
      const response = await updateApplication(universityId, cycle, { data: parsedData });
      if (response.success) {
        setSaveMessage({ type: 'success', text: 'Application saved successfully' });
        setApplication((prev) => prev ? { ...prev, data: parsedData } : null);
      } else {
        setSaveMessage({ type: 'error', text: response.message || 'Failed to save' });
      }
    } catch {
      setSaveMessage({ type: 'error', text: 'Failed to save application' });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!universityId || !cycle) return;
    if (!confirm('Submit application? This action cannot be undone.')) return;

    setSaving(true);
    setSaveMessage(null);

    try {
      const response = await submitApplication(universityId, cycle);
      if (response.success) {
        setSaveMessage({ type: 'success', text: 'Application submitted successfully!' });
        // Refresh application data to show updated status
        const appResponse = await getApplication(universityId, cycle);
        if (appResponse.success) {
          setApplication(appResponse.data);
        }
      } else {
        setSaveMessage({ type: 'error', text: response.message || 'Failed to submit' });
      }
    } catch {
      setSaveMessage({ type: 'error', text: 'Failed to submit application' });
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-xl text-[#003A81]">Loading application...</div>
        </div>
      </Layout>
    );
  }

  if (error || !application) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-6xl mb-4">📄</div>
            <h2 className="text-2xl font-bold text-[#003A81] mb-2">
              {error || 'Application not found'}
            </h2>
            <p className="text-gray-500 mb-6">
              The application you're looking for doesn't exist or couldn't be loaded.
            </p>
            <Link
              to="/applications"
              className="px-6 py-3 bg-[#006D3E] text-white rounded-lg hover:bg-[#5FB22E] transition"
            >
              Back to Applications
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  const isDraft = application.status === 'draft';
  const universityName = university?.name || 'University';

  return (
    <Layout>
      {/* Header */}
      <header className="bg-[#003A81] text-white px-4 md:px-10 py-6 shadow">
        <div className="max-w-4xl mx-auto">
          <Link
            to="/applications"
            className="inline-flex items-center text-white/80 hover:text-white mb-4 transition"
          >
            <span className="mr-2">←</span> Back to Applications
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold">{universityName}</h1>
              <p className="text-white/70 mt-1">Application Cycle: {cycle}</p>
            </div>
            <span
              className={`px-4 py-2 rounded-full text-sm font-semibold capitalize ${getStatusColor(application.status)}`}
            >
              {application.status}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 md:px-10 py-8">
        {/* Save Message Toast */}
        {saveMessage && (
          <div
            className={`mb-6 px-6 py-4 rounded-lg ${
              saveMessage.type === 'success'
                ? 'bg-green-100 text-green-700 border border-green-200'
                : 'bg-red-100 text-red-700 border border-red-200'
            }`}
          >
            {saveMessage.text}
          </div>
        )}

        {/* Application Info Card */}
        <div className="bg-white p-6 rounded-2xl shadow mb-6">
          <h2 className="text-xl font-semibold text-[#003A81] mb-4">Application Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">University</p>
              <Link
                to={`/university/${universityId}`}
                className="text-[#006D3E] hover:underline font-medium"
              >
                {universityName}
              </Link>
            </div>
            <div>
              <p className="text-sm text-gray-500">Application Cycle</p>
              <p className="font-medium text-gray-800">{application.application_cycle}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(application.status)}`}
              >
                {application.status}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-500">Created</p>
              <p className="font-medium text-gray-800">{formatDate(application.created_at)}</p>
            </div>
            {application.submitted_at && (
              <div className="sm:col-span-2">
                <p className="text-sm text-gray-500">Submitted</p>
                <p className="font-medium text-gray-800">{formatDate(application.submitted_at)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Application Data Card */}
        <div className="bg-white p-6 rounded-2xl shadow mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-[#003A81]">Application Data</h2>
            {isDraft && !isEditMode && (
              <Link
                to={`/applications/${universityId}/${cycle}/edit`}
                className="text-[#006D3E] hover:text-[#5FB22E] font-medium text-sm"
              >
                Edit Application
              </Link>
            )}
          </div>

          {isDraft && isEditMode ? (
            <div>
              <p className="text-sm text-gray-500 mb-2">
                Edit your application data below (JSON format):
              </p>
              <textarea
                className="w-full h-64 p-4 border-2 border-gray-200 rounded-xl font-mono text-sm focus:border-[#006D3E] focus:outline-none transition resize-none"
                value={formData}
                onChange={(e) => setFormData(e.target.value)}
                placeholder='{"gpa": 3.5, "essay": "Your essay here..."}'
              />
              <p className="text-xs text-gray-400 mt-2">
                Tip: Fill in the required fields based on the university's application requirements.
              </p>
            </div>
          ) : (
            <div className="bg-gray-50 p-4 rounded-xl">
              <pre className="text-sm text-gray-700 overflow-x-auto whitespace-pre-wrap font-mono">
                {JSON.stringify(application.data || {}, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* University Requirements (if available) */}
        {university?.applicationSchema && (
          <div className="bg-white p-6 rounded-2xl shadow mb-6">
            <h2 className="text-xl font-semibold text-[#003A81] mb-4">Required Fields</h2>
            <div className="space-y-2">
              {(() => {
                const schema = university.applicationSchema as { fields?: Array<{ name: string; type: string; required: boolean }> };
                if (!schema.fields) return <p className="text-gray-500">No specific fields required.</p>;
                return schema.fields.map((field) => (
                  <div key={field.name} className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${field.required ? 'bg-red-500' : 'bg-gray-300'}`} />
                    <span className="font-medium text-gray-700">{field.name}</span>
                    <span className="text-gray-400 text-sm">({field.type})</span>
                    {field.required && <span className="text-red-500 text-xs">Required</span>}
                  </div>
                ));
              })()}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {isDraft && (
          <div className="flex flex-col sm:flex-row gap-4">
            {isEditMode ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 px-6 py-4 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Draft'}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="flex-1 px-6 py-4 bg-[#006D3E] text-white rounded-xl hover:bg-[#5FB22E] transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Submitting...' : 'Submit Application'}
                </button>
              </>
            ) : (
              <Link
                to={`/applications/${universityId}/${cycle}/edit`}
                className="flex-1 px-6 py-4 bg-[#006D3E] text-white rounded-xl hover:bg-[#5FB22E] transition font-semibold text-center"
              >
                Edit Application
              </Link>
            )}
          </div>
        )}

        {/* Submitted state info */}
        {application.status === 'submitted' && (
          <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl text-center">
            <div className="text-4xl mb-2">📬</div>
            <h3 className="text-lg font-semibold text-blue-800 mb-1">Application Submitted</h3>
            <p className="text-blue-600">
              Your application has been submitted and is being reviewed.
            </p>
          </div>
        )}

        {/* Accepted state info */}
        {application.status === 'accepted' && (
          <div className="bg-green-50 border border-green-200 p-6 rounded-xl text-center">
            <div className="text-4xl mb-2">🎉</div>
            <h3 className="text-lg font-semibold text-green-800 mb-1">Congratulations!</h3>
            <p className="text-green-600">
              Your application has been accepted.
            </p>
          </div>
        )}

        {/* Rejected state info */}
        {application.status === 'rejected' && (
          <div className="bg-red-50 border border-red-200 p-6 rounded-xl text-center">
            <div className="text-4xl mb-2">😔</div>
            <h3 className="text-lg font-semibold text-red-800 mb-1">Application Not Accepted</h3>
            <p className="text-red-600">
              Unfortunately, your application was not accepted this cycle.
            </p>
          </div>
        )}
      </main>
    </Layout>
  );
}
