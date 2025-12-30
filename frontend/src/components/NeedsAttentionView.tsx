import { Issue } from '../types/event';

interface NeedsAttentionViewProps {
  issues: Issue[];
  loading?: boolean;
  onIssueClick?: (issue: Issue) => void;
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString();
}

function getSeverityBorderColor(severity: 'low' | 'medium' | 'high' | 'critical'): string {
  switch (severity) {
    case 'critical':
      return 'border-l-red-600';
    case 'high':
      return 'border-l-orange-500';
    case 'medium':
      return 'border-l-yellow-400';
    case 'low':
      return 'border-l-sky-400';
    default:
      return 'border-l-slate-700';
  }
}

function getSeverityBadgeColor(severity: 'low' | 'medium' | 'high' | 'critical'): string {
  switch (severity) {
    case 'critical':
      return 'bg-red-600 text-white';
    case 'high':
      return 'bg-orange-500 text-white';
    case 'medium':
      return 'bg-yellow-400 text-slate-950';
    case 'low':
      return 'bg-sky-400 text-slate-950';
    default:
      return 'bg-slate-700 text-gray-200';
  }
}

function getPriorityBarColor(severity: 'low' | 'medium' | 'high' | 'critical'): string {
  switch (severity) {
    case 'critical':
      return 'bg-red-600';
    case 'high':
      return 'bg-orange-500';
    case 'medium':
      return 'bg-yellow-400';
    case 'low':
      return 'bg-sky-400';
    default:
      return 'bg-slate-700';
  }
}

export function NeedsAttentionView({ issues, loading, onIssueClick }: NeedsAttentionViewProps) {
  if (loading) {
    return (
      <div className="text-center py-4 text-gray-500">
        Loading...
      </div>
    );
  }

  if (issues.length === 0) {
    return null;
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-8">
        <span className="text-xl">🔥</span>
        <h2 className="text-xl font-semibold text-gray-200">
          Needs Attention
        </h2>
      </div>
      
      <div className="space-y-6">
        {issues.map((issue) => {
          const borderColor = getSeverityBorderColor(issue.severity);
          const badgeColor = getSeverityBadgeColor(issue.severity);
          const priorityPercent = Math.min(100, Math.max(0, issue.priorityScore));
          
          return (
            <div
              key={issue.id}
              className={`p-7 bg-slate-950 border-l-4 ${borderColor} border border-slate-800 rounded-lg cursor-pointer ${
                onIssueClick ? 'hover:border-slate-700' : ''
              }`}
              onClick={() => onIssueClick?.(issue)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3 flex-wrap">
                    <span className="text-lg font-semibold text-gray-200">
                      {issue.title}
                    </span>
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded ${badgeColor}`}>
                      {issue.severity.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm text-gray-400">Priority</span>
                      <span className="text-sm font-mono text-gray-300">{issue.priorityScore}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${getPriorityBarColor(issue.severity)}`}
                        style={{ width: `${priorityPercent}%` }}
                      />
                    </div>
                  </div>
                  
                  {issue.priorityReason && (
                    <div className="text-sm text-gray-400 mb-3">
                      {issue.priorityReason}
                    </div>
                  )}

                  <div className="text-sm text-gray-500">
                    <span>{issue.count} occurrence{issue.count !== 1 ? 's' : ''}</span>
                    {issue.errorRate > 0 && (
                      <>
                        <span className="mx-2">•</span>
                        <span>{issue.errorRate.toFixed(1)} errors/min</span>
                      </>
                    )}
                    {issue.uniqueRoutes > 0 && (
                      <>
                        <span className="mx-2">•</span>
                        <span>{issue.uniqueRoutes} route{issue.uniqueRoutes !== 1 ? 's' : ''}</span>
                      </>
                    )}
                    {issue.regressionCount > 0 && (
                      <>
                        <span className="mx-2">•</span>
                        <span className="text-orange-500">🔁 Regressed {issue.regressionCount} time{issue.regressionCount !== 1 ? 's' : ''}</span>
                      </>
                    )}
                    <span className="mx-2">•</span>
                    <span>Last seen: {formatTimestamp(issue.lastSeen)}</span>
                  </div>

                  {issue.suspectedCause && (
                    <div className="text-sm text-gray-500 mt-3">
                      After {issue.suspectedCause.type}: {issue.suspectedCause.message}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

