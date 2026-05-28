"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PlusCircle, Users, Clock, LogOut, Edit3, Lock, Power, Trash2, BarChart3, Share2, Copy, Check, X } from 'lucide-react';

export default function AdminDashboard() {
  const [surveys, setSurveys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareModal, setShareModal] = useState<{ id: string; title: string } | null>(null);
  const [shareLinks, setShareLinks] = useState<any[]>([]);
  const [shareLabel, setShareLabel] = useState('');
  const [generatingLink, setGeneratingLink] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [raffleEmails, setRaffleEmails] = useState<string[] | null>(null);
  const [raffleError, setRaffleError] = useState<string | null>(null);
  const [raffleLoading, setRaffleLoading] = useState(false);
  const router = useRouter();

  const fetchSurveys = () => {
    fetch('/api/surveys?include_inactive=true')
      .then(res => res.json())
      .then(data => {
        setSurveys(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch surveys", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchSurveys();
  }, []);

  const handleToggleActive = async (survey: any) => {
    if (!survey.is_active) {
      const confirmed = window.confirm(
        "WARNING: Activating this survey will make it visible to users and PERMANENTLY LOCK it from future edits. Are you sure you want to proceed?"
      );
      if (!confirmed) return;
    }

    try {
      const res = await fetch(`/api/surveys/${survey.id}/toggle`, {
        method: 'PATCH',
      });
      if (res.ok) {
        fetchSurveys(); // Refresh to get updated statuses for all surveys
      } else {
        alert("Failed to toggle survey status.");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while toggling.");
    }
  };

  const handleRandomEmailGeneration = async () => {
    setRaffleError(null);
    setRaffleLoading(true);
    try {
      const res = await fetch(`/api/admin/raffle-email`);
      const data = await res.json();
      // alert(`Randomly selected email(s) for raffle: ${data.emails}`);
      setRaffleEmails(data.emails);
    } catch (err) {
      console.error(err);
      setRaffleEmails(null);
      setRaffleError("An error occurred while generating random emails.");
      alert("An error occurred while generating random emails.");
    } finally {
      setRaffleLoading(false);
    }
  };

  const handleDelete = async (survey: any) => {
    const confirmMessage = survey.is_active 
      ? `CRITICAL WARNING: "${survey.title}" is currently ACTIVE! Deleting it will instantly remove it from the live site and PERMANENTLY DESTROY all respondent data collected so far. Type "DELETE" to confirm.`
      : `WARNING: Are you sure you want to permanently delete "${survey.title}"? This will also destroy all respondent data collected for this survey. This cannot be undone.`;

    if (survey.is_active) {
      const input = window.prompt(confirmMessage);
      if (input !== "DELETE") {
        alert("Deletion cancelled.");
        return;
      }
    } else {
      const confirmed = window.confirm(confirmMessage);
      if (!confirmed) return;
    }

    try {
      const res = await fetch(`/api/surveys/${survey.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchSurveys();
      } else {
        alert("Failed to delete survey.");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while deleting.");
    }
  };

  const handleDuplicate = async (survey: any) => {
    try {
      const res = await fetch(`/api/surveys/${survey.id}/duplicate`, {
        method: 'POST',
      });
      if (res.ok) {
        fetchSurveys();
      } else {
        alert("Failed to duplicate survey.");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while duplicating.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('cyc_admin_auth');
    router.push('/admin/login');
  };

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const openShareModal = async (survey: any) => {
    setShareModal({ id: survey.id, title: survey.title });
    setShareLinks([]);
    setShareLabel('');
    // Fetch existing share links
    try {
      const res = await fetch(`/api/surveys/${survey.id}/share-links`);
      const data = await res.json();
      setShareLinks(data);
    } catch { /* ignore */ }
  };

  const handleGenerateLink = async () => {
    if (!shareModal) return;
    setGeneratingLink(true);
    try {
      const res = await fetch(`/api/surveys/${shareModal.id}/share-links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: shareLabel.trim() || null })
      });
      const newLink = await res.json();
      newLink.response_count = 0;
      setShareLinks(prev => [newLink, ...prev]);
      setShareLabel('');
      // Auto-copy the new link
      const url = `${baseUrl}/survey/${shareModal.id}?ref=${newLink.code}`;
      await navigator.clipboard.writeText(url);
      setCopiedLink(newLink.code);
      setTimeout(() => setCopiedLink(null), 2000);
    } catch { alert('Failed to generate link.'); }
    setGeneratingLink(false);
  };

  const handleDeleteLink = async (linkId: string) => {
    try {
      await fetch(`/api/share-links/${linkId}`, { method: 'DELETE' });
      setShareLinks(prev => prev.filter(l => l.id !== linkId));
    } catch { alert('Failed to delete link.'); }
  };

  const copyToClipboard = async (text: string, code: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedLink(code);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-cyc-primary)]"></div></div>;
  }

  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 sm:gap-0">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-cyc-secondary)] dark:text-slate-100">Dashboard Overview</h1>
          <p className="text-gray-500 dark:text-slate-500 mt-1">Manage your surveys and view engagement metrics.</p>
        </div>
        <div className="flex space-x-4">
          <Link href="/admin/create" className="btn-primary flex items-center">
            <PlusCircle className="w-4 h-4 mr-2" />
            New Survey
          </Link>

          <button
            onClick={() => handleRandomEmailGeneration()}
            className="text-indigo-600 hover:text-indigo-800 flex items-center"
          >
            <Users className="w-4 h-4 mr-1" />
            Randomly generate emails
          </button>
          <button onClick={handleLogout} className="px-4 py-2 text-red-600 hover:bg-red-50 rounded flex items-center transition-colors">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </button>
        </div>
      </div>
      {raffleLoading && (
        <p className="text-sm text-gray-500">Generating raffle emails...</p>
      )}

      {raffleError && (
        <div className="text-sm text-red-600 dark:text-red-400">
          <span className="font-semibold">Raffle error:</span> {raffleError}
        </div>
      )}

      {raffleEmails && (
        <div className="mt-4 p-4 border rounded-lg bg-gray-50">
          <h3 className="font-semibold mb-2">Raffle Emails:</h3>
          <ul className="list-disc ml-5">
            {raffleEmails.map((email, idx) => (
              <li key={idx}>{email}</li>
            ))}
          </ul>
        </div>
      )}

      {/* {(raffleEmails || raffleError || raffleLoading) && (
        <div className="mb-6 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 p-4">
          {raffleEmails && (
            <div className="mt-4 p-4 border rounded-lg bg-gray-50">
              <h3 className="font-semibold mb-2">Raffle Emails:</h3>
              <ul className="list-disc ml-5">
              {raffleEmails.map((email, idx) => (
                <li key={idx}>{email}</li>
              ))}
              </ul>
            </div>
)}
          {raffleError && (
            <div className="text-sm test-red-600 dark:text-red-400">
              <span className="font-semibold">Raffle error:</span> {raffleError}
            </div>
          )}

          {raffleLoading && (
            <p className="text-sm text-gray-500">Generating raffle emails...</p>
          )}
          
        </div>
      )} */}

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-gray-200 dark:border-slate-700 overflow-x-auto overflow-y-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 dark:bg-slate-900/50">
            <tr>
              <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-slate-500 uppercase tracking-wider">Survey Title</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-slate-500 uppercase tracking-wider">Status</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-slate-500 uppercase tracking-wider">Responses</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-slate-500 uppercase tracking-wider">Est. Time</th>
              <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200">
            {surveys.map((survey) => (
              <tr key={survey.id} className="hover:bg-gray-50 dark:bg-slate-900/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="text-sm font-semibold text-[var(--color-cyc-secondary)] dark:text-slate-100">{survey.title}</div>
                  <div className="text-sm text-gray-500 dark:text-slate-500 line-clamp-1">{survey.description?.replace(/<[^>]*>?/gm, '')}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${survey.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-slate-200'}`}>
                    {survey.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-500">
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-1.5 text-[var(--color-cyc-primary)]" />
                    {survey.response_count || 0}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-500">
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1.5" />
                    {survey.estimated_minutes} min
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-3">
                    <Link href={`/admin/results/${survey.id}`} className="text-[var(--color-cyc-secondary)] dark:text-slate-100 hover:text-blue-700 flex items-center">
                      <BarChart3 className="w-4 h-4 mr-1" />
                      Results
                    </Link>

                    <button
                      onClick={() => openShareModal(survey)}
                      className="text-purple-600 hover:text-purple-800 flex items-center"
                      title="Share Links"
                    >
                      <Share2 className="w-4 h-4 mr-1" />
                      Share
                    </button>

                    <button 
                      onClick={() => handleToggleActive(survey)}
                      className={`flex items-center ${survey.is_active ? 'text-orange-500 hover:text-orange-700' : 'text-green-600 hover:text-green-800'}`}
                      title={survey.is_active ? "Deactivate" : "Activate"}
                    >
                      <Power className="w-4 h-4 mr-1" />
                      {survey.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    
                    {!survey.has_been_published ? (
                      <Link href={`/admin/edit/${survey.id}`} className="text-[var(--color-cyc-primary)] hover:text-teal-700 flex items-center">
                        <Edit3 className="w-4 h-4 mr-1" />
                        Edit
                      </Link>
                    ) : (
                      <Link href={`/admin/edit/${survey.id}`} className="text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 flex items-center" title="View locked survey or edit translations">
                        <Lock className="w-4 h-4 mr-1" />
                        View
                      </Link>
                    )}

                    <button 
                      onClick={() => handleDuplicate(survey)}
                      className="text-gray-500 dark:text-slate-500 hover:text-gray-700 dark:text-slate-300 flex items-center"
                      title="Duplicate Survey"
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      Duplicate
                    </button>

                    <button 
                      onClick={() => handleDelete(survey)}
                      className="text-red-500 hover:text-red-700 ml-2"
                      title="Delete Survey"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {surveys.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-slate-500">
                  No surveys found. Create one to get started!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Share Link Modal */}
      {shareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 relative max-h-[85vh] flex flex-col">
            <button onClick={() => setShareModal(null)} className="absolute top-4 right-4 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:text-slate-400">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-[var(--color-cyc-secondary)] dark:text-slate-100 mb-1 flex items-center">
              <Share2 className="w-5 h-5 mr-2" />
              Share Links
            </h2>
            <p className="text-sm text-gray-500 dark:text-slate-500 mb-5">Generate unique tracked links for <strong>{shareModal.title}</strong></p>

            {/* Generate new link */}
            <div className="flex space-x-2 mb-5">
              <input
                type="text"
                value={shareLabel}
                onChange={(e) => setShareLabel(e.target.value)}
                placeholder="Label (intern name)"
                className="flex-grow p-2.5 border-2 border-gray-200 dark:border-slate-700 rounded-lg focus:border-[var(--color-cyc-primary)] focus:outline-none text-sm"
                onKeyDown={(e) => { if (e.key === 'Enter') handleGenerateLink(); }}
              />
              <button
                onClick={handleGenerateLink}
                disabled={generatingLink}
                className="px-4 py-2 bg-[var(--color-cyc-primary)] text-white rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-all whitespace-nowrap"
              >
                {generatingLink ? '...' : '+ Generate'}
              </button>
            </div>

            {/* List of generated links */}
            <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
              {shareLinks.length === 0 && (
                <p className="text-center text-gray-400 dark:text-slate-500 text-sm py-8">No links generated yet. Click &quot;Generate&quot; to create one.</p>
              )}
              {shareLinks.map(link => {
                const url = `${baseUrl}/survey/${shareModal.id}?ref=${link.code}`;
                const isCopied = copiedLink === link.code;
                return (
                  <div key={link.id} className="bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700 rounded-lg p-3 group">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-semibold text-[var(--color-cyc-secondary)] dark:text-slate-100">
                          {link.label || <span className="text-gray-400 dark:text-slate-500 italic">Unlabeled</span>}
                        </span>
                        <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-mono">{link.code}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500 dark:text-slate-500 font-medium">{link.response_count} response{link.response_count !== 1 ? 's' : ''}</span>
                        <button onClick={() => handleDeleteLink(link.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <code className="text-xs text-gray-500 dark:text-slate-500 truncate mr-2 flex-1">{url}</code>
                      <button onClick={() => copyToClipboard(url, link.code)}
                        className={`flex items-center text-xs font-medium px-2 py-1 rounded transition-all ${isCopied ? 'bg-green-100 text-green-700' : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-500 hover:text-[var(--color-cyc-primary)] hover:border-teal-300'}`}>
                        {isCopied ? <><Check className="w-3 h-3 mr-1" />Copied!</> : <><Copy className="w-3 h-3 mr-1" />Copy</>}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
