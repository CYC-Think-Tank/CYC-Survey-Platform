"use client";
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, BarChart3, User, ChevronLeft, ChevronRight, Trash2, ChevronDown, ChevronUp, Calculator, Sparkles, Lightbulb, TrendingUp, Users, AlertTriangle, Target, Zap, RefreshCw, Brain, Eye, Search, Layers } from 'lucide-react';
import AiInsightsTab from '@/components/AiInsightsTab';

interface Answer {
  id?: string;
  question_id: string;
  answer_text: string | null;
  answer_numeric: number | null;
  answer_options: string[] | null;
  time_spent?: number;
}

interface Response {
  session_id: string;
  completed_at: string | null;
  answers: Answer[];
  attention_check_failures?: number;
  weight?: number;
  is_valid?: boolean;
}

interface Question {
  id: string;
  question_text: string;
  type: string;
  order_index: number;
  options: any;
}

export default function ResultsPage() {
  const params = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'summary' | 'individual'>('summary');
  const [showAdvanced, setShowAdvanced] = useState<Record<string, boolean>>({});

  // Summary State
  const [summaryStats, setSummaryStats] = useState<any>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Individual Pagination State
  const [currentResponseIndex, setCurrentResponseIndex] = useState(0);
  const [currentResp, setCurrentResp] = useState<Response | null>(null);
  const [filterFailed, setFilterFailed] = useState(false);
  const [paginatedTotal, setPaginatedTotal] = useState(0);
  const [respLoading, setRespLoading] = useState(false);

  const toggleAdvanced = (qId: string) => setShowAdvanced(prev => ({ ...prev, [qId]: !prev[qId] }));

  const fetchResults = () => {
    fetch(`/api/surveys/${params.id}/results`)
      .then(res => res.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  const fetchSummary = useCallback(() => {
    setSummaryLoading(true);
    fetch(`/api/surveys/${params.id}/summary`)
      .then(res => res.json())
      .then(d => { setSummaryStats(d); setSummaryLoading(false); })
      .catch(() => setSummaryLoading(false));
  }, [params.id]);

  const fetchIndividualResponse = useCallback((index: number, failedOnly: boolean) => {
    setRespLoading(true);
    fetch(`/api/surveys/${params.id}/responses/paginated?offset=${index}&limit=1&filter_failed=${failedOnly}`)
      .then(res => res.json())
      .then(d => {
        if (d.responses && d.responses.length > 0) {
          setCurrentResp(d.responses[0]);
        } else {
          setCurrentResp(null);
        }
        setPaginatedTotal(d.total || 0);
        setRespLoading(false);
      })
      .catch(() => setRespLoading(false));
  }, [params.id]);

  useEffect(() => { fetchResults(); }, [params.id]);

  useEffect(() => {
    if (tab === 'summary' && !summaryStats && !loading) {
      fetchSummary();
    }
  }, [tab, summaryStats, loading, fetchSummary]);

  useEffect(() => {
    if (tab === 'individual') {
      fetchIndividualResponse(currentResponseIndex, filterFailed);
    }
  }, [tab, currentResponseIndex, filterFailed, fetchIndividualResponse]);

  const handleDeleteAll = async () => {
    const input = window.prompt(`This will PERMANENTLY DELETE all responses for this survey. Type "DELETE ALL" to confirm.`);
    if (input !== 'DELETE ALL') { alert('Deletion cancelled.'); return; }
    try {
      await fetch(`/api/surveys/${params.id}/responses`, { method: 'DELETE' });
      setCurrentResponseIndex(0);
      setSummaryStats(null);
      fetchResults();
    } catch { alert('Failed to delete responses.'); }
  };

  const handleDeleteOne = async (sessionId: string) => {
    if (!window.confirm('Are you sure you want to delete this individual response? This cannot be undone.')) return;
    try {
      await fetch(`/api/responses/${sessionId}`, { method: 'DELETE' });
      setCurrentResponseIndex(prev => Math.max(0, prev - 1));
      setSummaryStats(null); // Invalidate summary
      fetchResults();
      if (tab === 'individual') {
        fetchIndividualResponse(Math.max(0, currentResponseIndex - 1), filterFailed);
      }
    } catch { alert('Failed to delete response.'); }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-cyc-primary)]"></div></div>;
  }

  if (!data || !data.questions) {
    return <div className="text-center py-20 text-gray-500">No data found.</div>;
  }

  const { survey, questions, total_responses }: { survey: any, questions: Question[], total_responses: number } = data;

  const advancedStatsUI = (qId: string, content: React.ReactNode) => (
    <div className="mt-6 pt-4 border-t border-gray-100">
      <button onClick={() => toggleAdvanced(qId)} className="flex items-center text-xs font-semibold text-[var(--color-cyc-primary)] hover:text-teal-700 transition-colors bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-full">
        <Calculator className="w-3 h-3 mr-1.5" />
        {showAdvanced[qId] ? 'Hide Research Stats' : 'Show Research Stats'}
        {showAdvanced[qId] ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
      </button>
      {showAdvanced[qId] && (
        <div className="mt-3 p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 grid grid-cols-2 sm:grid-cols-3 gap-4">
          {content}
        </div>
      )}
    </div>
  );

  function renderSummaryForQuestion(q: Question) {
    if (!summaryStats || !summaryStats[q.id]) {
       return <p className="text-sm text-gray-400 italic">No data available.</p>;
    }
    const stat = summaryStats[q.id];

    if (q.type === 'multiple_choice' || q.type === 'dropdown') {
      const opts: string[] = Array.isArray(q.options) ? q.options : (q.options?.choices || []);
      const counts = stat.counts || {};
      const modeData = stat.mode_data;
      const totalN = stat.sample_size || 0;

      return (
        <div>
          <div className="space-y-3">
            {opts.map((opt: string) => {
              const c = counts[opt] || 0;
              const pct = totalN > 0 ? Math.round((c / totalN) * 100) : 0;
              return (
                <div key={opt}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">{opt}</span>
                    <span className="text-gray-500">{c} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div className="h-full rounded-full bg-[var(--color-cyc-primary)] transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          {totalN > 0 && advancedStatsUI(q.id, (
            <>
              <div><span className="block text-xs text-gray-500 mb-0.5">Sample Size (N)</span><span className="font-bold">{totalN}</span></div>
              {modeData && <div className="col-span-2"><span className="block text-xs text-gray-500 mb-0.5">Statistical Mode</span><span className="font-bold">{modeData.modes.join(', ')} ({modeData.count} responses)</span></div>}
            </>
          ))}
        </div>
      );
    }

    if (q.type === 'checkboxes') {
      const opts: string[] = Array.isArray(q.options) ? q.options : (q.options?.choices || []);
      const counts = stat.counts || {};
      const totalWeighted = stat.total_weighted || 0;
      const totalN = stat.sample_size || 0;
      const modeData = stat.mode_data;

      return (
        <div>
          <div className="space-y-3">
            {opts.map((opt: string) => {
              const c = counts[opt] || 0;
              const pct = totalWeighted > 0 ? Math.round((c / totalWeighted) * 100) : 0;
              return (
                <div key={opt}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">{opt}</span>
                    <span className="text-gray-500">{Math.round(c)} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div className="h-full rounded-full bg-[var(--color-cyc-accent)] transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          {totalN > 0 && advancedStatsUI(q.id, (
            <>
              <div><span className="block text-xs text-gray-500 mb-0.5">Sample Size (N)</span><span className="font-bold">{totalN}</span></div>
              {modeData && <div className="col-span-2"><span className="block text-xs text-gray-500 mb-0.5">Statistical Mode</span><span className="font-bold">{modeData.modes.join(', ')} ({Math.round(modeData.count)} selections)</span></div>}
            </>
          ))}
        </div>
      );
    }

    if (q.type === 'ranking') {
      const avgRanks = stat.avg_ranks || {};
      const totalN = stat.sample_size || 0;
      
      const sortedItems = Object.entries(avgRanks)
        .sort(([, a]: [string, any], [, b]: [string, any]) => Number(a) - Number(b));

      return (
        <div>
          <div className="space-y-3">
            {sortedItems.map(([opt, avg]: [string, any], i) => {
              const optsArray = Array.isArray(q.options) ? q.options : (q.options?.choices || []);
              const maxRank = optsArray.length || 5; 
              const pct = maxRank > 1 ? Math.max(0, 100 - ((avg - 1) / (maxRank - 1)) * 100) : 100;
              return (
                <div key={opt}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">{i + 1}. {opt}</span>
                    <span className="text-gray-500">Avg Rank: {Number(avg).toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div className="h-full rounded-full bg-[var(--color-cyc-primary)] transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          {totalN > 0 && advancedStatsUI(q.id, (
            <>
              <div><span className="block text-xs text-gray-500 mb-0.5">Sample Size (N)</span><span className="font-bold">{totalN}</span></div>
            </>
          ))}
        </div>
      );
    }

    if (q.type === 'rating_scale') {
      const { sample_size, avg, median, std_dev, variance, min, max, quartiles, outliers } = stat;
      return (
        <div>
          <div className="flex items-center space-x-6">
            <div className="text-center">
              <div className="text-4xl font-extrabold text-[var(--color-cyc-primary)]">{avg ?? '—'}%</div>
              <div className="text-sm text-gray-500 mt-1">Average</div>
            </div>
            <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
              <div className="h-full rounded-full bg-[var(--color-cyc-primary)] transition-all duration-500" style={{ width: `${avg || 0}%` }} />
            </div>
          </div>
          {sample_size > 0 && advancedStatsUI(q.id, (
            <>
              <div><span className="block text-xs text-gray-500 mb-0.5">Sample Size (N)</span><span className="font-bold">{sample_size}</span></div>
              <div><span className="block text-xs text-gray-500 mb-0.5">Median</span><span className="font-bold">{median}</span></div>
              <div><span className="block text-xs text-gray-500 mb-0.5">Standard Deviation</span><span className="font-bold">{std_dev?.toFixed(2)}</span></div>
              <div><span className="block text-xs text-gray-500 mb-0.5">Variance</span><span className="font-bold">{variance?.toFixed(2)}</span></div>
              <div><span className="block text-xs text-gray-500 mb-0.5">Range (Min - Max)</span><span className="font-bold">{min} - {max}</span></div>
              <div><span className="block text-xs text-gray-500 mb-0.5">Quartiles (Q1, Q3)</span><span className="font-bold">{quartiles?.q1}, {quartiles?.q3}</span></div>
              <div><span className="block text-xs text-gray-500 mb-0.5">IQR</span><span className="font-bold">{quartiles?.iqr}</span></div>
              <div className="col-span-2">
                <span className="block text-xs text-gray-500 mb-0.5">Outliers (1.5*IQR)</span>
                {outliers && outliers.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {outliers.slice(0, 50).map((o: number, i: number) => <span key={i} className="px-2 py-0.5 bg-red-100 text-red-700 rounded-md text-xs font-bold">{o}</span>)}
                    {outliers.length > 50 && <span className="text-xs text-gray-400 mt-1">+{outliers.length - 50} more</span>}
                  </div>
                ) : <span className="font-bold text-gray-400">None detected</span>}
              </div>
            </>
          ))}
        </div>
      );
    }

    if (q.type === 'likert_scale') {
      const { counts, sample_size, avg, median, std_dev, mode_data } = stat;
      const labels: Record<number, string> = { 1: 'Strongly Disagree', 2: 'Disagree', 3: 'Neutral', 4: 'Agree', 5: 'Strongly Agree' };

      return (
        <div>
          <div className="text-center mb-4">
            <span className="text-3xl font-extrabold text-[var(--color-cyc-primary)]">{avg ?? '—'}</span>
            <span className="text-sm text-gray-500 ml-2">/ 5 average</span>
          </div>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map(val => {
              const c = counts?.[val] || 0;
              const pct = sample_size > 0 ? Math.round((c / sample_size) * 100) : 0;
              return (
                <div key={val} className="flex items-center space-x-3">
                  <span className="w-32 text-xs text-right text-gray-600 font-medium">{labels[val]}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div className="h-full rounded-full bg-[var(--color-cyc-primary)] transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 w-16">{c} ({pct}%)</span>
                </div>
              );
            })}
          </div>
          {sample_size > 0 && advancedStatsUI(q.id, (
            <>
              <div><span className="block text-xs text-gray-500 mb-0.5">Sample Size (N)</span><span className="font-bold">{sample_size}</span></div>
              <div className="col-span-2"><span className="block text-xs text-gray-500 mb-0.5">Median</span><span className="font-bold">{median} ({labels[median] || ''})</span></div>
              <div><span className="block text-xs text-gray-500 mb-0.5">Standard Deviation</span><span className="font-bold">{std_dev?.toFixed(2)}</span></div>
              {mode_data && <div className="col-span-2"><span className="block text-xs text-gray-500 mb-0.5">Statistical Mode</span><span className="font-bold">{mode_data.modes.map((m: any) => labels[Number(m)] || m).join(', ')}</span></div>}
            </>
          ))}
        </div>
      );
    }

    if (q.type === 'short_answer') {
      const texts = stat.texts || [];
      const validationType = q.options?.validation?.type;
      return (
        <div>
          {validationType && validationType !== 'none' && (
            <div className="mb-2 inline-block px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs rounded-full">
              Validation: {validationType.replace(/_/g, ' ')}
            </div>
          )}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {texts.map((t: string, i: number) => (
              <div key={i} className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-700">
                {t}
              </div>
            ))}
            {texts.length === 0 && <span className="text-gray-400 italic">No responses</span>}
          </div>
        </div>
      );
    }

    return null;
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <Link href="/admin" className="text-gray-500 hover:text-gray-700 flex items-center text-sm mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-cyc-secondary)]">{survey.title}</h1>
            <p className="text-gray-500 mt-1">{total_responses} response{total_responses !== 1 ? 's' : ''}</p>
          </div>
          {total_responses > 0 && (
            <button
              onClick={handleDeleteAll}
              className="flex items-center px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-semibold transition-colors"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All Results
            </button>
          )}
        </div>
      </div>

      <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 mb-8 max-w-md">
        <button
          onClick={() => setTab('summary')}
          className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md text-sm font-semibold transition-all ${tab === 'summary' ? 'bg-white shadow text-[var(--color-cyc-secondary)]' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <BarChart3 className="w-4 h-4 mr-2" /> Summary
        </button>
        <button
          onClick={() => setTab('individual')}
          className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md text-sm font-semibold transition-all ${tab === 'individual' ? 'bg-white shadow text-[var(--color-cyc-secondary)]' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <User className="w-4 h-4 mr-2" /> Individual
        </button>
        <button
          onClick={() => setTab('ai' as any)}
          className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md text-sm font-semibold transition-all ${(tab as string) === 'ai' ? 'bg-white shadow text-[var(--color-cyc-secondary)]' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Sparkles className="w-4 h-4 mr-2" /> AI Insights
        </button>
      </div>

      {/* SUMMARY TAB */}
      {tab === 'summary' && (
        <div className="space-y-6">
          {summaryLoading ? (
             <div className="flex justify-center items-center h-32">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-cyc-primary)]"></div>
               <span className="ml-3 text-gray-500 font-medium">Calculating stats...</span>
             </div>
          ) : (
             <>
                {/* Referral Breakdown */}
                {data.referral_breakdown && Object.keys(data.referral_breakdown).length > 0 && (
                  <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
                    <h3 className="text-base font-bold text-[var(--color-cyc-secondary)] mb-1 flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-9.86a4.5 4.5 0 016.364 6.364l-4.5 4.5a4.5 4.5 0 01-7.244-1.242" /></svg>
                      Referral Sources
                    </h3>
                    <p className="text-xs text-gray-400 mb-4">Where your responses came from</p>
                    <div className="space-y-3">
                      {Object.entries(data.referral_breakdown as Record<string, number>)
                        .sort(([, a], [, b]) => b - a)
                        .map(([source, count]) => {
                          const pct = total_responses > 0 ? Math.round((count / total_responses) * 100) : 0;
                          return (
                            <div key={source}>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="font-medium text-gray-700 capitalize">{source}</span>
                                <span className="text-gray-500">{count} ({pct}%)</span>
                              </div>
                              <div className="w-full bg-gray-100 rounded-full h-2.5">
                                <div className="bg-[var(--color-cyc-primary)] h-2.5 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {questions.map((q: Question, idx: number) => (
                  <div key={q.id} className="bg-white rounded-xl shadow border border-gray-200 p-6">
                    <h3 className="text-base font-bold text-[var(--color-cyc-secondary)] mb-1">
                      {idx + 1}. {q.question_text}
                    </h3>
                    {q.options?.description && (
                      <p className="text-xs text-gray-400 dark:text-slate-500 mt-1 italic">{q.options.description.replace(/<[^>]*>?/gm, '')}</p>
                    )}
                    <p className="text-xs text-gray-400 mb-4 capitalize">{q.type.replace('_', ' ')}</p>
                    {renderSummaryForQuestion(q)}
                  </div>
                ))}
             </>
          )}
        </div>
      )}

      {/* INDIVIDUAL TAB */}
      {tab === 'individual' && (
        <div>
          <div className="flex justify-end mb-4">
            <label className="flex items-center space-x-2 cursor-pointer bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm hover:bg-gray-50 transition">
              <input type="checkbox" checked={filterFailed} onChange={(e) => { setFilterFailed(e.target.checked); setCurrentResponseIndex(0); }} className="rounded text-red-500 focus:ring-red-500 w-4 h-4" />
              <span className="text-sm font-semibold text-gray-700">Show Only Failed Attention Checks</span>
            </label>
          </div>
          
          {respLoading ? (
            <div className="flex justify-center items-center h-32">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-cyc-primary)]"></div>
            </div>
          ) : !currentResp ? (
            <p className="text-center text-gray-500 py-12">No responses found.</p>
          ) : (
            <>
              {/* Navigation */}
              <div className="flex items-center justify-between bg-white rounded-xl shadow border border-gray-200 p-4 mb-6">
                <button
                  onClick={() => setCurrentResponseIndex(Math.max(0, currentResponseIndex - 1))}
                  disabled={currentResponseIndex === 0}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="text-center">
                  <span className="font-bold text-[var(--color-cyc-secondary)]">Response {currentResponseIndex + 1}</span>
                  <span className="text-gray-400 mx-2">of</span>
                  <span className="font-bold text-[var(--color-cyc-secondary)]">{paginatedTotal}</span>
                  {currentResp.attention_check_failures && currentResp.attention_check_failures > 0 ? (
                    <div className="mt-2 inline-flex items-center px-2 py-1 bg-red-100 text-red-700 text-[10px] font-bold rounded-full uppercase tracking-wider">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Failed Attention Check ({currentResp.attention_check_failures})
                    </div>
                  ) : null}
                  {currentResp.completed_at && (
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(currentResp.completed_at).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleDeleteOne(currentResp.session_id)}
                    className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                    title="Delete this response"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentResponseIndex(Math.min(paginatedTotal - 1, currentResponseIndex + 1))}
                    disabled={currentResponseIndex >= paginatedTotal - 1}
                    className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Answer Cards */}
              <div className="space-y-4">
                {questions.map((q: Question, idx: number) => {
                  const answer = currentResp.answers.find((a: Answer) => a.question_id === q.id);
                  let displayValue: string = '—';

                  if (answer) {
                    if (q.type === 'multiple_choice' || q.type === 'dropdown') {
                      displayValue = answer.answer_text || '—';
                    } else if (q.type === 'short_answer') {
                      displayValue = answer.answer_text || '—';
                    } else if (q.type === 'rating_scale') {
                      displayValue = answer.answer_numeric !== null ? `${answer.answer_numeric}%` : '—';
                    } else if (q.type === 'likert_scale') {
                      const labels: Record<number, string> = { 1: 'Strongly Disagree', 2: 'Disagree', 3: 'Neutral', 4: 'Agree', 5: 'Strongly Agree' };
                      displayValue = answer.answer_numeric !== null ? `${answer.answer_numeric} — ${labels[answer.answer_numeric] || ''}` : '—';
                    } else if (q.type === 'checkboxes') {
                      displayValue = answer.answer_options ? (answer.answer_options as string[]).join(', ') : '—';
                    } else if (q.type === 'ranking') {
                      displayValue = answer.answer_options ? (answer.answer_options as string[]).map((opt, i) => `${i + 1}. ${opt}`).join(' | ') : '—';
                    }
                  }

                  return (
                    <div key={q.id} className="bg-white rounded-xl shadow border border-gray-200 p-5">
                      <h4 className="text-sm font-bold text-[var(--color-cyc-secondary)] mb-1">
                        {idx + 1}. {q.question_text}
                      </h4>
                      {q.options?.description && (
                        <p className="text-xs text-gray-400 dark:text-slate-500 mt-1 italic">{q.options.description.replace(/<[^>]*>?/gm, '')}</p>
                      )}
                      <p className="text-base text-gray-700">
                        {displayValue}
                        {answer?.time_spent !== undefined && (
                          <span className="text-gray-400 text-xs ml-2 font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                            {(answer.time_spent / 1000).toFixed(1)}s
                          </span>
                        )}
                      </p>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* AI INSIGHTS TAB */}
      {(tab as string) === 'ai' && (
        <AiInsightsTab surveyId={params.id as string} totalRespondents={total_responses} />
      )}
    </div>
  );
}
