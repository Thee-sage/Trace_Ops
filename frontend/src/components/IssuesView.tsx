import { Issue } from '../types/event';

interface IssuesViewProps {
  issues: Issue[];
  loading?: boolean;
  onIssueClick?: (issue: Issue) => void;
  highlightedEventIds?: Set<string>;
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

function getSeverityBadge(severity: 'low' | 'medium' | 'high' | 'critical'): string {
  return severity.toUpperCase();
}

function getStatusBadge(status: 'open' | 'resolved', regressionCount: number): { color: string; text: string } {
  if (regressionCount > 0 && status === 'open') {
    return { color: 'bg-orange-500 text-white', text: 'REGRESSED' };
  }
  if (status === 'resolved') {
    return { color: 'bg-green-500 text-white', text: 'RESOLVED' };
  }
  return { color: 'bg-slate-700 text-gray-200', text: 'OPEN' };
}

export function IssuesView({ issues, loading, onIssueClick, highlightedEventIds }: IssuesViewProps) {
  if (loading) {
    return (
      <div className="text-center py-8 text-gray-500">
        Loading issues...
      </div>
    );
  }

  if (issues.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No issues found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {issues.map((issue) => {
        const isHighlighted = highlightedEventIds && 
          issue.relatedEventIds.some(id => highlightedEventIds.has(id));
        const isResolved = issue.status === 'resolved';
        const borderColor = getSeverityBorderColor(issue.severity);
        const badgeColor = getSeverityBadgeColor(issue.severity);
        const statusBadge = getStatusBadge(issue.status, issue.regressionCount);
        
        return (
          <div
            key={issue.id}
            className={`p-6 bg-slate-950 border-l-4 ${borderColor} border border-slate-800 rounded-lg cursor-pointer transition-colors ${
              isHighlighted ? 'ring-1 ring-sky-400' : ''
            } ${onIssueClick ? 'hover:border-slate-700' : ''} ${isResolved ? 'opacity-50' : ''}`}
            onClick={() => onIssueClick?.(issue)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3 flex-wrap">
                  <span className={`text-base font-semibold ${isResolved ? 'text-gray-500' : 'text-gray-200'}`}>
                    {issue.title}
                  </span>
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded ${statusBadge.color}`}>
                    {statusBadge.text}
                  </span>
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded ${badgeColor}`}>
                    {issue.severity.toUpperCase()}
                  </span>
                  {issue.regressionCount > 0 && (
                    <span className="px-2 py-0.5 text-xs font-semibold rounded bg-orange-500 text-white">
                      🔁 {issue.regressionCount}
                    </span>
                  )}
                  <span className={`text-xs ${isResolved ? 'text-gray-600' : 'text-gray-500'}`}>
                    ({issue.count} occurrence{issue.count !== 1 ? 's' : ''})
                  </span>
                </div>
                
                <div className={`text-xs mb-3 ${isResolved ? 'text-gray-600' : 'text-gray-500'}`}>
                  <span>First seen: {formatTimestamp(issue.firstSeen)}</span>
                  <span className="mx-2">•</span>
                  <span>Last seen: {formatTimestamp(issue.lastSeen)}</span>
                  {issue.resolvedAt && (
                    <>
                      <span className="mx-2">•</span>
                      <span>Resolved: {formatTimestamp(issue.resolvedAt)}</span>
                    </>
                  )}
                </div>

                {issue.suspectedCause && issue.regressionCount === 0 && (
                  <div className={`text-sm mt-2 p-2 bg-slate-900 border border-slate-800 rounded ${isResolved ? 'text-gray-600' : 'text-gray-400'}`}>
                    <span className="font-medium">Introduced after {issue.suspectedCause.type}: </span>
                    <span>
                      {issue.suspectedCause.message}
                    </span>
                    <span className="text-xs ml-2 text-gray-500">
                      ({formatTimestamp(issue.suspectedCause.timestamp)})
                    </span>
                  </div>
                )}

                {issue.resolvedBy && (
                  <div className="text-sm mt-2 p-2 bg-slate-900 border border-green-500/20 rounded text-gray-500">
                    <span className="font-medium text-green-500">Resolved after {issue.resolvedBy.type}: </span>
                    <span>
                      {issue.resolvedBy.message}
                    </span>
                    <span className="text-xs ml-2">
                      ({formatTimestamp(issue.resolvedBy.timestamp)})
                    </span>
                  </div>
                )}

                {issue.regressionCount > 0 && issue.suspectedCause && (
                  <div className="text-sm mt-2 p-2 bg-slate-900 border border-orange-500/30 rounded text-gray-400">
                    <span className="font-medium text-orange-500">Regressed after {issue.suspectedCause.type}: </span>
                    <span>
                      {issue.suspectedCause.message}
                    </span>
                    <span className="text-xs ml-2 text-gray-500">
                      ({formatTimestamp(issue.suspectedCause.timestamp)})
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

