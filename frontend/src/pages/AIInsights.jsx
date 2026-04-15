import { useState } from 'react';
import {
  Sparkles, AlertTriangle, TrendingUp, Lightbulb,
  CheckCircle2, XCircle, RefreshCw, ChevronRight,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useAIInsights, useAnomalies, useAIPrediction, useSavingsSuggestions, useGeminiReport } from '../hooks/useAnalytics';
import useAuthStore from '../store/authStore';
import EmptyState  from '../components/common/EmptyState';
import Spinner     from '../components/common/Spinner';
import { formatCurrency, getCategoryMeta, formatDate } from '../utils';
import { MONTH_NAMES } from '../constants';


function AnomalyCard({ anomaly }) {
  const expense = anomaly.expenseId;
  const meta    = getCategoryMeta(expense?.category ?? 'other');
  return (
    <div className="flex items-start gap-3 py-3 px-1 border-b border-white/5 last:border-0">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-amber-500/10 border border-amber-500/20">
        <AlertTriangle size={15} className="text-amber-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-200 truncate">{expense?.description ?? 'Expense'}</p>
        <p className="text-xs text-slate-500 mt-0.5">
          {formatDate(expense?.date)} · {meta.label}
        </p>
        <p className="text-xs text-amber-300/80 mt-1.5 leading-relaxed">
          {anomaly.reason}
        </p>
      </div>
      <p className="stat-num text-sm font-semibold text-amber-300 flex-shrink-0">
        {formatCurrency(expense?.amount ?? 0)}
      </p>
    </div>
  );
}

function PredictionCard({ prediction, isLoading, isError }) {
  if (isLoading) return (
    <div className="card p-5 space-y-3">
      <div className="skeleton h-4 w-32 rounded" />
      <div className="skeleton h-10 w-40 rounded" />
      <div className="skeleton h-3 w-24 rounded" />
    </div>
  );

  if (isError || !prediction) return (
    <div className="card p-5 flex items-center gap-3 border-white/5">
      <XCircle size={18} className="text-slate-600 flex-shrink-0" />
      <div>
        <p className="text-sm text-slate-400">Prediction unavailable</p>
        <p className="text-xs text-slate-600 mt-0.5">AI engine may be warming up — try again in a moment</p>
      </div>
    </div>
  );

  const { targetMonth, predictedTotal, byCategory, confidence, dataMonths, method } = prediction;
  const [year, mon] = (targetMonth ?? '').split('-');
  const monthLabel = MONTH_NAMES[parseInt(mon, 10) - 1] ?? '';
  const topCats = Object.entries(byCategory ?? {})
    .sort(([,a],[,b]) => b - a)
    .slice(0, 4);

  const confColor = confidence === 'high' ? 'text-green-400'
    : confidence === 'medium' ? 'text-amber-400'
    : 'text-slate-400';

  return (
    <div className="card p-5 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">
            {monthLabel} {year} forecast
          </p>
          <p className="stat-num text-3xl font-semibold text-blue-300">
            {formatCurrency(predictedTotal)}
          </p>
          <p className={`text-xs mt-1 ${confColor}`}>
            {confidence} confidence · {dataMonths} months of data
          </p>
        </div>
        <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/15">
          <TrendingUp size={20} className="text-blue-400" />
        </div>
      </div>

      {/* Per-category breakdown */}
      <div className="space-y-2">
        <p className="text-[10px] text-slate-500 uppercase tracking-wider">Expected by category</p>
        {topCats.map(([cat, amt]) => {
          const meta = getCategoryMeta(cat);
          return (
            <div key={cat} className="flex items-center gap-2">
              <span className="text-sm w-5">{meta.icon}</span>
              <span className="text-xs text-slate-300 flex-1 truncate">{meta.label}</span>
              <span className="stat-num text-xs text-slate-200">{formatCurrency(amt)}</span>
            </div>
          );
        })}
      </div>

      {method === 'weighted_average' && (
        <p className="text-[10px] text-slate-600 mt-3 italic">
          Using weighted average — add more expenses for ANN prediction
        </p>
      )}
    </div>
  );
}

function SuggestionCard({ suggestion, rank }) {
  const meta = getCategoryMeta(suggestion.category);
  const isGood = suggestion.ratio < 0.8;
  return (
    <div className="flex items-start gap-3 py-3 px-1 border-b border-white/5 last:border-0">
      <div className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold"
        style={{ background: `${meta.color}18`, color: meta.color }}>
        {rank}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm">{meta.icon}</span>
          <span className="text-sm font-medium text-slate-200">{meta.label}</span>
          {isGood
            ? <CheckCircle2 size={12} className="text-green-400 flex-shrink-0" />
            : <AlertTriangle size={12} className="text-amber-400 flex-shrink-0" />
          }
        </div>
        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{suggestion.reasoning}</p>
        {!isGood && suggestion.suggestedCut > 0 && (
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-xs text-slate-400">Cut by</span>
            <span className="text-xs font-medium text-emerald-400">
              {formatCurrency(suggestion.suggestedCut)}
            </span>
            <ChevronRight size={10} className="text-slate-600" />
            <span className="text-xs text-slate-400">save to</span>
            <span className="text-xs font-medium text-slate-300">
              {formatCurrency(suggestion.newTarget)}
            </span>
          </div>
        )}
      </div>
      <div className="text-right flex-shrink-0">
        <p className="stat-num text-sm font-medium" style={{ color: isGood ? '#22c55e' : meta.color }}>
          {formatCurrency(suggestion.currentSpend)}
        </p>
        <p className="text-[10px] text-slate-500">this month</p>
      </div>
    </div>
  );
}


const TABS = ['Overview', 'Anomalies', 'Predictions', 'Savings', 'Advisor'];

export default function AIInsights() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState('Overview');

  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth() + 1;

  const { data: insights,    isLoading: insightsLoading  } = useAIInsights();
  const { data: anomalyData, isLoading: anomalyLoading   } = useAnomalies({ resolved: false });
  const { data: prediction,  isLoading: predLoading, isError: predError } = useAIPrediction();
  const { refetch: fetchReport, data: reportData, isFetching: reportLoading, isError: reportError, error: repErr } = useGeminiReport();
  const { data: suggestions, isLoading: sugLoading } = useSavingsSuggestions({
    year, month, months: 3, targetPercent: 20,
  });

  const anomalies   = anomalyData?.anomalies ?? insights?.anomalySummary?.recent ?? [];
  const totalAnomaly = anomalyData?.total ?? insights?.anomalySummary?.total ?? 0;
  const predData    = prediction?.prediction ?? insights?.prediction;
  const sugList     = suggestions?.suggestions ?? [];
  const aiOk        = insights?.aiAvailable !== false && !predError;
  const statusLoading = insightsLoading || (predLoading && !prediction);

  return (
    <div className="space-y-5 animate-slide-up">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white flex items-center gap-2">
            AI Insights
            <Sparkles size={20} className="text-indigo-400" />
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {statusLoading
              ? 'Checking AI status...'
              : aiOk
                ? 'AI engine active · anomaly detection running'
                : 'AI engine warming up — some features may be limited'
            }
          </p>
        </div>
        {(statusLoading || !aiOk) && <RefreshCw size={16} className="text-slate-600 mt-1 animate-spin-slow" />}
      </div>
 
      {/* ── AI status pill ─────────────────────────────────── */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs ${
        statusLoading ? 'bg-indigo-500/8 border-indigo-500/20 text-indigo-400' :
        aiOk ? 'bg-green-500/8 border-green-500/20 text-green-400' :
        'bg-amber-500/8 border-amber-500/20 text-amber-400'
      }`}>
        <span className={`w-1.5 h-1.5 rounded-full animate-pulse-slow ${
          statusLoading ? 'bg-indigo-400' :
          aiOk ? 'bg-green-400' :
          'bg-amber-400'
        }`} />
        {statusLoading ? 'Connecting to Python AI engine...' : 
         aiOk ? 'Python AI engine online' : 
         'AI engine initialising (free-tier cold start)'}
      </div>

      {/* ── Tab bar ────────────────────────────────────────── */}
      <div className="flex gap-1 bg-navy-900 p-1 rounded-xl border border-white/5">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all duration-150 relative ${
              tab === t
                ? 'bg-indigo-500 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t}
            {t === 'Anomalies' && totalAnomaly > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full text-[9px] font-bold text-navy-950 flex items-center justify-center">
                {totalAnomaly > 9 ? '9+' : totalAnomaly}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Overview tab ───────────────────────────────────── */}
      {tab === 'Overview' && (
        <div className="space-y-4 animate-fade-in">
          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="card p-4 text-center">
              <p className="text-3xl font-bold text-amber-400 mb-1">{totalAnomaly}</p>
              <p className="text-xs text-slate-400">Anomalies found</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-3xl font-bold text-blue-400 mb-1">
                {predData ? '✓' : aiOk ? '…' : '—'}
              </p>
              <p className="text-xs text-slate-400">Prediction ready</p>
            </div>
          </div>

          {/* Mini prediction */}
          <PredictionCard
            prediction={predData}
            isLoading={insightsLoading || predLoading}
            isError={predError}
          />

          {/* Recent anomalies */}
          {totalAnomaly > 0 && (
            <div className="card p-4">
              <p className="label mb-2">Recent anomalies</p>
              {(insights?.anomalySummary?.recent ?? []).slice(0, 3).map((a) => (
                <AnomalyCard key={a._id} anomaly={a} />
              ))}
              {totalAnomaly > 3 && (
                <button onClick={() => setTab('Anomalies')} className="mt-2 text-xs text-indigo-400 hover:text-indigo-300">
                  View all {totalAnomaly} anomalies →
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Anomalies tab ──────────────────────────────────── */}
      {tab === 'Anomalies' && (
        <div className="space-y-3 animate-fade-in">
          <p className="text-xs text-slate-500">
            Unusual expenses detected by Isolation Forest. Sorted by anomaly score.
          </p>

          {anomalyLoading ? (
            <div className="card p-4"><Spinner className="mx-auto" /></div>
          ) : anomalies.length === 0 ? (
            <EmptyState
              icon="✅"
              title="No anomalies detected"
              description="Your spending patterns look normal — great job!"
            />
          ) : (
            <div className="card p-2">
              {anomalies.map((a) => <AnomalyCard key={a._id} anomaly={a} />)}
            </div>
          )}

          {anomalies.length > 0 && (
            <p className="text-[10px] text-slate-600 text-center px-4 leading-relaxed">
              Anomalies are flagged when an expense is statistically unusual compared
              to your historical spending in that category.
            </p>
          )}
        </div>
      )}

      {/* ── Predictions tab ────────────────────────────────── */}
      {tab === 'Predictions' && (
        <div className="space-y-4 animate-fade-in">
          <p className="text-xs text-slate-500">
            ANN model trained on your past spending patterns predicts next month's budget.
          </p>
          <PredictionCard
            prediction={predData}
            isLoading={predLoading}
            isError={predError}
          />

          {predData && (
            <div className="card p-4">
              <p className="label mb-3">Full category breakdown</p>
              <div className="space-y-2.5">
                {Object.entries(predData.byCategory ?? {})
                  .sort(([,a],[,b]) => b - a)
                  .map(([cat, amt]) => {
                    const meta = getCategoryMeta(cat);
                    const total = Object.values(predData.byCategory).reduce((s,v) => s+v, 0);
                    const pct = total > 0 ? (amt / total) * 100 : 0;
                    return (
                      <div key={cat}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-300">{meta.icon} {meta.label}</span>
                          <span className="stat-num text-slate-200">{formatCurrency(amt)}</span>
                        </div>
                        <div className="h-1 bg-white/8 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, background: meta.color }} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Savings tab ────────────────────────────────────── */}
      {tab === 'Savings' && (
        <div className="space-y-4 animate-fade-in">
          <div className="card p-4 flex items-start gap-3 border-emerald-500/15">
            <Lightbulb size={18} className="text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-slate-200">Greedy savings suggestions</p>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Categories ranked by how much above your historical average you're spending.
                Cut the top ones first for maximum impact.
              </p>
            </div>
          </div>

          {sugLoading ? (
            <div className="card p-4 space-y-4">
              {[1,2,3,4].map((i) => (
                <div key={i} className="flex gap-3">
                  <div className="skeleton w-7 h-7 rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-3 w-24 rounded" />
                    <div className="skeleton h-2.5 w-40 rounded" />
                  </div>
                  <div className="skeleton h-4 w-16 rounded" />
                </div>
              ))}
            </div>
          ) : sugList.length === 0 ? (
            <EmptyState
              icon="💡"
              title="No suggestions yet"
              description="Add at least 2 months of expenses to get personalised savings tips"
            />
          ) : (
            <>
              {/* Target saving */}
              {suggestions?.targetSaving && (
                <div className="flex items-center justify-between px-4 py-3 bg-emerald-500/8 border border-emerald-500/15 rounded-xl text-sm">
                  <span className="text-slate-300">Target saving (20%)</span>
                  <span className="stat-num font-semibold text-emerald-400">
                    {formatCurrency(suggestions.targetSaving)}
                  </span>
                </div>
              )}

              <div className="card p-2">
                {sugList.slice(0, 6).map((s, i) => (
                  <SuggestionCard key={s.category} suggestion={s} rank={i + 1} />
                ))}
              </div>

              <p className="text-[10px] text-slate-600 text-center leading-relaxed px-4">
                Suggestions use a greedy algorithm comparing current vs historical spend.
                Non-discretionary categories (utilities, health) are deprioritised.
              </p>
            </>
          )}
        </div>
      )}

      {/* ── Advisor tab ────────────────────────────────────── */}
      {tab === 'Advisor' && (
        <div className="space-y-4 animate-fade-in">
          <div className="card p-4 flex items-start gap-3 border-emerald-500/15">
            <Sparkles size={18} className="text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-slate-200">Gemini Conversational Coach</p>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Connects directly to Google's generative models using your private API key to analyze your trends and produce a comprehensive financial health report.
              </p>
            </div>
          </div>

          {!user?.hasGeminiKey ? (
            <div className="card p-6 flex flex-col items-center justify-center text-center space-y-3 border-white/5">
              <div className="w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center">
                <AlertTriangle className="text-amber-400" size={24} />
              </div>
              <p className="text-sm text-slate-200 font-medium">Gemini Key Not Configured</p>
              <p className="text-xs text-slate-500 max-w-xs leading-relaxed">Head over to the Settings page and input your Gemini 1.5 Flash API Key to unlock the conversational advisor.</p>
            </div>
          ) : (
            <div className="card p-4 space-y-4">
              <button 
                onClick={() => fetchReport()} 
                disabled={reportLoading}
                className="w-full btn-primary flex items-center justify-center gap-2"
              >
                {reportLoading ? <span className="w-4 h-4 border-2 border-navy-950/30 border-t-navy-950 rounded-full animate-spin" /> : <Sparkles size={16} />}
                {reportLoading ? 'Generating your report...' : 'Generate AI Health Report'}
              </button>

              {reportError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 text-center">
                  Failed to generate report: {repErr?.response?.data?.message || 'Unknown network error. Check API key.'}
                </div>
              )}

              {reportData?.report && (
                <div className="mt-6 pt-4 border-t border-white/5 text-slate-300">
                  <div className="text-sm leading-relaxed prose prose-invert max-w-none">
                    <ReactMarkdown>{reportData.report}</ReactMarkdown>
                  </div>
                  <p className="text-[10px] text-slate-500 text-center mt-6 uppercase tracking-wider font-semibold">
                    Generated by Google {reportData.model || 'Gemini'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
