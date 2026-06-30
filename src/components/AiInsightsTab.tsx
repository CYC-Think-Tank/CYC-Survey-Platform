'use client';

import { useState } from 'react';
import {
  RefreshCw,
  AlertTriangle,
  Sparkles,
  Lightbulb,
  TrendingUp,
  Users,
  Zap,
  Brain,
  Eye,
  Search,
} from 'lucide-react';
import { adminFetch } from '@/lib/adminAuth';
import type { LucideIcon } from 'lucide-react';

type AiModuleKey = 'persuadability' | 'mood' | 'beliefs' | 'minority' | 'archetypes' | 'blindspots';

interface AiMeta {
  total_respondents?: number;
  generated_at?: string;
}

interface PersuadabilityFinding {
  title: string;
  description: string;
  confidence: string;
}

interface DemographicSegment {
  segment_name: string;
  size: string;
  persuadability: number;
  label: string;
  key_trait: string;
}

interface MoodDimension {
  dimension: string;
  score: number;
  insight: string;
}

interface EmergingConcern {
  concern: string;
  urgency: string;
  evidence: string;
}

interface BeliefCluster {
  cluster_name: string;
  size: string;
  description: string;
  beliefs?: string[];
}

interface SurprisingConnection {
  connection: string;
  why_surprising: string;
  evidence: string;
}

interface AmplifiedConcern {
  concern: string;
  percentage: number;
  concentration: string;
  intensity_label: string;
  intensity: number;
  why_it_matters: string;
  evidence: string;
}

interface Archetype {
  name: string;
  percentage: number;
  description: string;
  key_traits?: string[];
  values: string;
  engagement_level: string;
}

interface BlindSpot {
  topic: string;
  severity: string;
  evidence: string;
  suggested_questions?: string[];
}

interface AiModuleData {
  meta?: AiMeta;
  persuadability_score?: { overall?: number; label?: string };
  overall_summary?: string;
  key_findings?: PersuadabilityFinding[];
  demographic_segments?: DemographicSegment[];
  overall_mood?: { label: string; description: string };
  mood_dimensions?: MoodDimension[];
  emerging_concerns?: EmergingConcern[];
  summary?: string;
  belief_clusters?: BeliefCluster[];
  surprising_connections?: SurprisingConnection[];
  amplified_concerns?: AmplifiedConcern[];
  archetypes?: Archetype[];
  coverage_score?: { overall?: number; label?: string };
  blind_spots?: BlindSpot[];
}

export default function AiInsightsTab({
  surveyId,
  totalRespondents,
}: {
  surveyId: string;
  totalRespondents: number;
}) {
  const [aiSubTab, setAiSubTab] = useState<AiModuleKey>('persuadability');
  const [aiData, setAiData] = useState<Record<string, AiModuleData>>({});
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});
  const [aiErrors, setAiErrors] = useState<Record<string, string>>({});

  const aiModules: { key: AiModuleKey; label: string; endpoint: string; icon: LucideIcon }[] = [
    { key: 'persuadability', label: 'Persuadability', endpoint: 'ai-analysis', icon: TrendingUp },
    { key: 'mood', label: 'Mood', endpoint: 'ai-mood', icon: Sparkles },
    { key: 'beliefs', label: 'Beliefs', endpoint: 'ai-beliefs', icon: Brain },
    { key: 'minority', label: 'Minority', endpoint: 'ai-minority', icon: Eye },
    { key: 'archetypes', label: 'Archetypes', endpoint: 'ai-archetypes', icon: Users },
    { key: 'blindspots', label: 'Blind Spots', endpoint: 'ai-blindspots', icon: Search },
  ];

  const triggerAiModule = (mod: (typeof aiModules)[0], force = false) => {
    if (aiData[mod.key] && !force) return;
    setAiLoading((prev) => ({ ...prev, [mod.key]: true }));
    setAiErrors((prev) => ({ ...prev, [mod.key]: '' }));
    adminFetch(`/api/surveys/${surveyId}/${mod.endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force_refresh: force }),
    })
      .then((res) => {
        if (!res.ok)
          return res.json().then((d) => {
            throw new Error(d.detail || 'Analysis failed');
          });
        return res.json();
      })
      .then((d) => {
        setAiData((prev) => ({ ...prev, [mod.key]: d }));
        setAiLoading((prev) => ({ ...prev, [mod.key]: false }));
      })
      .catch((e) => {
        setAiErrors((prev) => ({ ...prev, [mod.key]: e.message }));
        setAiLoading((prev) => ({ ...prev, [mod.key]: false }));
      });
  };

  // Trigger initial load for persuadability when first mounted if empty
  if (!aiData['persuadability'] && !aiLoading['persuadability'] && !aiErrors['persuadability']) {
    triggerAiModule(aiModules[0]);
  }

  const currentMod = aiModules.find((m) => m.key === aiSubTab)!;
  const data: AiModuleData | undefined = aiData[aiSubTab];
  const loading = aiLoading[aiSubTab];
  const error = aiErrors[aiSubTab];

  return (
    <div className="space-y-6">
      {/* Sub-tab Navigation */}
      <div className="flex space-x-1 overflow-x-auto pb-2 scrollbar-hide">
        {aiModules.map((mod) => {
          const Icon = mod.icon;
          const isActive = aiSubTab === mod.key;
          return (
            <button
              key={mod.key}
              onClick={() => {
                setAiSubTab(mod.key);
                triggerAiModule(mod);
              }}
              className={`flex-shrink-0 flex items-center px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                isActive
                  ? 'bg-[var(--color-cyc-primary)] text-white shadow-md'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              <Icon className="w-4 h-4 mr-2" />
              {mod.label}
            </button>
          );
        })}
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl shadow border border-gray-200">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-cyc-primary)]" />
          <p className="mt-6 text-lg font-semibold text-[var(--color-cyc-secondary)]">
            Analyzing with AI...
          </p>
          <p className="text-sm text-gray-400 mt-1">This may take 15-30 seconds</p>
        </div>
      )}

      {error && !loading && (
        <div className="bg-white rounded-xl shadow border border-gray-200 p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-[var(--color-cyc-accent)] mx-auto mb-3" />
          <p className="text-[var(--color-cyc-secondary)] font-semibold mb-1">Analysis Failed</p>
          <p className="text-gray-500 text-sm mb-4">{error}</p>
          <button
            onClick={() => triggerAiModule(currentMod, true)}
            className="btn-secondary inline-flex items-center text-sm"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </button>
        </div>
      )}

      {data && !loading && (
        <div className="space-y-6">
          <div className="flex justify-between items-center pb-2 border-b border-gray-100">
            <div className="text-xs text-gray-400">
              <span className="mr-4">
                Based on {data.meta?.total_respondents || totalRespondents} respondents
              </span>
              <span>
                Generated{' '}
                {data.meta?.generated_at
                  ? new Date(data.meta.generated_at).toLocaleString()
                  : 'just now'}
              </span>
            </div>
            <button
              onClick={() => triggerAiModule(currentMod, true)}
              className="inline-flex items-center px-3 py-1.5 bg-[var(--color-cyc-primary)] text-white hover:bg-teal-700 rounded text-xs font-semibold transition-colors shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Reanalyze
            </button>
          </div>

          {/* Render different UI based on the active sub-tab */}

          {/* 1. PERSUADABILITY */}
          {aiSubTab === 'persuadability' && (
            <>
              <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                  <div className="relative w-28 h-28 flex-shrink-0">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="#F3F4F6" strokeWidth="8" />
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        fill="none"
                        stroke="var(--color-cyc-primary)"
                        strokeWidth="8"
                        strokeDasharray={`${(data.persuadability_score?.overall || 0) * 2.64} 264`}
                        strokeLinecap="round"
                        className="transition-all duration-1000"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-extrabold text-[var(--color-cyc-secondary)]">
                        {data.persuadability_score?.overall || 0}
                      </span>
                      <span className="text-[10px] text-gray-400 font-semibold">
                        {data.persuadability_score?.label || 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div className="text-center sm:text-left flex-1">
                    <h3 className="text-base font-bold text-[var(--color-cyc-secondary)] mb-1 flex items-center justify-center sm:justify-start">
                      <TrendingUp className="w-4 h-4 mr-2 text-[var(--color-cyc-accent)]" />
                      Persuadability Score
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{data.overall_summary}</p>
                  </div>
                </div>
              </div>

              {data.key_findings && data.key_findings.length > 0 && (
                <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
                  <h3 className="text-base font-bold text-[var(--color-cyc-secondary)] mb-1 flex items-center">
                    <Lightbulb className="w-4 h-4 mr-2 text-[var(--color-cyc-accent)]" />
                    Key Findings
                  </h3>
                  <div className="space-y-3 mt-4">
                    {data.key_findings.map((f: PersuadabilityFinding, i: number) => {
                      const confColor =
                        f.confidence === 'High'
                          ? 'bg-teal-50 text-[var(--color-cyc-primary)]'
                          : f.confidence === 'Medium'
                            ? 'bg-amber-50 text-amber-600'
                            : 'bg-gray-100 text-gray-500';
                      return (
                        <div
                          key={i}
                          className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
                        >
                          <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Lightbulb className="w-4 h-4 text-[var(--color-cyc-primary)]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <h4 className="text-sm font-semibold text-[var(--color-cyc-secondary)]">
                                {f.title}
                              </h4>
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0 ${confColor}`}
                              >
                                {f.confidence}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed">{f.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {data.demographic_segments && data.demographic_segments.length > 0 && (
                <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
                  <h3 className="text-base font-bold text-[var(--color-cyc-secondary)] mb-4 flex items-center">
                    <Users className="w-4 h-4 mr-2 text-[var(--color-cyc-primary)]" />
                    Demographic Segments
                  </h3>
                  <div className="space-y-4">
                    {data.demographic_segments.map((seg: DemographicSegment, i: number) => (
                      <div key={i}>
                        <div className="flex justify-between text-sm mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-700">{seg.segment_name}</span>
                            <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                              {seg.size}
                            </span>
                          </div>
                          <span className="text-gray-500">
                            {seg.persuadability}/100 · {seg.label}
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2.5">
                          <div
                            className="bg-[var(--color-cyc-primary)] h-2.5 rounded-full transition-all duration-500"
                            style={{ width: `${seg.persuadability}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{seg.key_trait}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* 2. PUBLIC MOOD HEATMAP */}
          {aiSubTab === 'mood' && (
            <>
              <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
                <div className="text-center mb-6">
                  <span className="text-3xl font-extrabold text-[var(--color-cyc-primary)] block mb-1">
                    {data.overall_mood?.label}
                  </span>
                  <p className="text-sm text-gray-600 max-w-2xl mx-auto">
                    {data.overall_mood?.description}
                  </p>
                </div>
                <h3 className="text-sm font-bold text-[var(--color-cyc-secondary)] mb-4 uppercase tracking-wider">
                  Mood Dimensions
                </h3>
                <div className="space-y-4">
                  {data.mood_dimensions?.map((dim: MoodDimension, i: number) => (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700">{dim.dimension}</span>
                        <span className="text-gray-500 font-bold">{dim.score}/100</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-[var(--color-cyc-primary)] h-2 rounded-full transition-all duration-500"
                          style={{ width: `${dim.score}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{dim.insight}</p>
                    </div>
                  ))}
                </div>
              </div>

              {data.emerging_concerns && data.emerging_concerns.length > 0 && (
                <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
                  <h3 className="text-base font-bold text-[var(--color-cyc-secondary)] mb-4 flex items-center">
                    <AlertTriangle className="w-4 h-4 mr-2 text-[var(--color-cyc-accent)]" />
                    Emerging Concerns
                  </h3>
                  <div className="space-y-3">
                    {data.emerging_concerns.map((ec: EmergingConcern, i: number) => (
                      <div
                        key={i}
                        className="flex flex-col p-3 rounded-lg border border-gray-100 bg-gray-50"
                      >
                        <div className="flex justify-between items-center mb-1">
                          <h4 className="text-sm font-semibold text-[var(--color-cyc-secondary)]">
                            {ec.concern}
                          </h4>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${ec.urgency === 'High' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}
                          >
                            {ec.urgency} Urgency
                          </span>
                        </div>
                        <p className="text-xs text-gray-600">{ec.evidence}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* 3. BELIEF NETWORK */}
          {aiSubTab === 'beliefs' && (
            <>
              <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
                <p className="text-sm text-gray-600 mb-6 leading-relaxed">{data.summary}</p>
                <h3 className="text-sm font-bold text-[var(--color-cyc-secondary)] mb-4 uppercase tracking-wider">
                  Belief Clusters
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.belief_clusters?.map((cluster: BeliefCluster, i: number) => (
                    <div key={i} className="border border-gray-200 rounded-lg p-4 bg-teal-50/30">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-bold text-[var(--color-cyc-secondary)]">
                          {cluster.cluster_name}
                        </h4>
                        <span className="text-[10px] bg-[var(--color-cyc-primary)] text-white px-2 py-0.5 rounded-full">
                          {cluster.size} People
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mb-3">{cluster.description}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {cluster.beliefs?.map((b: string, j: number) => (
                          <span
                            key={j}
                            className="text-[10px] bg-white border border-gray-200 text-gray-600 px-2 py-1 rounded shadow-sm"
                          >
                            {b}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {data.surprising_connections && data.surprising_connections.length > 0 && (
                <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
                  <h3 className="text-base font-bold text-[var(--color-cyc-secondary)] mb-4 flex items-center">
                    <Zap className="w-4 h-4 mr-2 text-[var(--color-cyc-accent)]" />
                    Surprising Connections
                  </h3>
                  <div className="space-y-3">
                    {data.surprising_connections.map((sc: SurprisingConnection, i: number) => (
                      <div
                        key={i}
                        className="flex gap-3 p-3 rounded-lg border border-amber-100 bg-amber-50/50"
                      >
                        <div className="flex-1">
                          <h4 className="text-sm font-bold text-[var(--color-cyc-secondary)] mb-1">
                            {sc.connection}
                          </h4>
                          <p className="text-xs text-amber-800 mb-1">
                            <span className="font-semibold">Why it&apos;s surprising:</span>{' '}
                            {sc.why_surprising}
                          </p>
                          <p className="text-[10px] text-gray-500 italic">
                            Evidence: {sc.evidence}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* 4. MINORITY INSIGHTS */}
          {aiSubTab === 'minority' && (
            <>
              <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
                <p className="text-sm text-gray-600 mb-6">{data.summary}</p>
                <h3 className="text-sm font-bold text-[var(--color-cyc-secondary)] mb-4 uppercase tracking-wider">
                  Amplified Concerns
                </h3>
                <div className="space-y-4">
                  {data.amplified_concerns?.map((ac: AmplifiedConcern, i: number) => (
                    <div key={i} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h4 className="font-bold text-[var(--color-cyc-secondary)] text-sm">
                            {ac.concern}
                          </h4>
                          <span className="text-xs text-gray-500 mt-0.5 block">
                            Raised by {ac.percentage}% • Concentrated in: {ac.concentration}
                          </span>
                        </div>
                        <div className="text-right ml-4">
                          <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold block mb-1">
                            {ac.intensity_label} Intensity
                          </span>
                          <span className="text-xl font-extrabold text-[var(--color-cyc-primary)]">
                            {ac.intensity}
                          </span>
                          <span className="text-xs text-gray-400">/100</span>
                        </div>
                      </div>
                      <div className="bg-gray-50 p-3 rounded text-xs text-gray-600 border border-gray-100">
                        <p className="mb-1">
                          <span className="font-semibold text-[var(--color-cyc-secondary)]">
                            Why it matters:
                          </span>{' '}
                          {ac.why_it_matters}
                        </p>
                        <p className="italic opacity-80 mt-2">&quot;{ac.evidence}&quot;</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* 5. ARCHETYPES */}
          {aiSubTab === 'archetypes' && (
            <>
              <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
                <p className="text-sm text-gray-600 mb-6">{data.summary}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.archetypes?.map((arch: Archetype, i: number) => (
                    <div
                      key={i}
                      className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow flex flex-col h-full"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-bold text-[var(--color-cyc-primary)] text-lg">
                          {arch.name}
                        </h4>
                        <span className="bg-[var(--color-cyc-secondary)] text-white text-xs font-bold px-2 py-1 rounded-md">
                          {arch.percentage}%
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mb-4 flex-grow">{arch.description}</p>

                      <div className="space-y-3">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                            Key Traits
                          </span>
                          <ul className="text-xs text-gray-700 list-disc list-inside mt-1">
                            {arch.key_traits?.map((t: string, j: number) => (
                              <li key={j}>{t}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-gray-50 p-2 rounded border border-gray-100">
                            <span className="block text-[10px] font-bold text-gray-400 mb-0.5">
                              Values
                            </span>
                            <span className="font-medium text-[var(--color-cyc-secondary)]">
                              {arch.values}
                            </span>
                          </div>
                          <div className="bg-gray-50 p-2 rounded border border-gray-100">
                            <span className="block text-[10px] font-bold text-gray-400 mb-0.5">
                              Engagement
                            </span>
                            <span className="font-medium text-[var(--color-cyc-secondary)]">
                              {arch.engagement_level}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* 6. BLIND SPOTS */}
          {aiSubTab === 'blindspots' && (
            <>
              <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
                <div className="flex justify-between items-center mb-6 pb-6 border-b border-gray-100">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-[var(--color-cyc-secondary)] flex items-center mb-1">
                      <Search className="w-5 h-5 mr-2 text-[var(--color-cyc-accent)]" />
                      Coverage Analysis
                    </h3>
                    <p className="text-sm text-gray-600">{data.summary}</p>
                  </div>
                  <div className="text-center ml-6 border-l pl-6 border-gray-100">
                    <span className="block text-3xl font-extrabold text-[var(--color-cyc-primary)]">
                      {data.coverage_score?.overall}
                    </span>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      {data.coverage_score?.label}
                    </span>
                  </div>
                </div>

                <h3 className="text-sm font-bold text-[var(--color-cyc-secondary)] mb-4 uppercase tracking-wider">
                  Survey Blind Spots
                </h3>
                <div className="space-y-4 mb-8">
                  {data.blind_spots?.map((bs: BlindSpot, i: number) => (
                    <div key={i} className="border border-red-100 bg-red-50/30 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-[var(--color-cyc-secondary)] text-sm">
                          {bs.topic}
                        </h4>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${bs.severity === 'Critical' ? 'bg-red-200 text-red-800' : 'bg-orange-100 text-orange-800'}`}
                        >
                          {bs.severity} Gap
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mb-3">
                        <span className="font-semibold">Evidence:</span> {bs.evidence}
                      </p>

                      <div className="bg-white border border-gray-200 rounded p-2">
                        <span className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">
                          Suggested Addition
                        </span>
                        <ul className="text-xs font-medium text-[var(--color-cyc-primary)] list-disc list-inside">
                          {bs.suggested_questions?.map((q: string, j: number) => (
                            <li key={j}>{q}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
