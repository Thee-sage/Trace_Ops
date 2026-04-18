import type { Issue } from './types';
import { statusColor } from './tokens';

interface IssuesRailProps {
  issues: Issue[];
  selectedIssueId: string | null;
  onSelectIssue: (id: string | null) => void;
}

export function IssuesRail({ issues, selectedIssueId, onSelectIssue }: IssuesRailProps) {
  const activeIssues = issues.filter(i => i.status === 'open' || i.status === 'investigating');
  const resolvedIssues = issues.filter(i => i.status === 'resolved');
  const hasSelection = selectedIssueId !== null;

  const renderIssue = (issue: Issue) => {
    const isActive = selectedIssueId === issue.id;
    const isDimmed = hasSelection && !isActive;

    return (
      <button
        key={issue.id}
        onClick={() => onSelectIssue(isActive ? null : issue.id)}
        className="w-full text-left px-4 py-2.5 transition-all duration-150 border-l-[2px]"
        style={{
          backgroundColor: isActive ? 'var(--to-bg-elevated)' : 'transparent',
          borderLeftColor: isActive ? 'var(--to-text-1)' : 'transparent',
          opacity: isDimmed ? 0.35 : 1,
        }}
        onMouseEnter={e => {
          if (!isActive) e.currentTarget.style.backgroundColor = 'var(--to-bg-hover)';
        }}
        onMouseLeave={e => {
          if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <div className="flex items-start gap-2.5">
          <span
            className="w-[5px] h-[5px] rounded-full mt-[6px] shrink-0 transition-colors duration-100"
            style={{ backgroundColor: isActive ? 'var(--to-text-1)' : statusColor[issue.status] }}
          />
          <div className="flex-1 min-w-0">
            <div
              className="text-[12px] leading-[1.45] transition-colors duration-100"
              style={{ color: isActive ? 'var(--to-text-1)' : 'var(--to-text-2)' }}
            >
              {issue.title}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className="text-[10px] tabular-nums transition-colors duration-100"
                style={{ color: isActive ? 'var(--to-text-3)' : 'var(--to-text-4)' }}
              >
                {issue.impactLabel || `${issue.impact} affected`}
              </span>
            </div>
          </div>
        </div>
      </button>
    );
  };

  if (issues.length === 0) {
    return (
      <aside
        className="w-[252px] shrink-0 flex flex-col select-none"
        style={{
          backgroundColor: 'var(--to-bg-panel)',
          borderRight: '1px solid var(--to-border)',
        }}
      >
        <div
          className="px-4 h-10 flex items-center shrink-0"
          style={{ borderBottom: '1px solid var(--to-border)' }}
        >
          <span className="text-[11px] uppercase tracking-[0.08em]" style={{ color: 'var(--to-text-3)' }}>
            Issues
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center px-6">
            <div className="w-2 h-2 rounded-full mx-auto mb-2" style={{ backgroundColor: 'var(--to-success)' }} />
            <div className="text-[11px]" style={{ color: 'var(--to-text-4)' }}>No issues detected</div>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className="w-[252px] shrink-0 flex flex-col select-none"
      style={{
        backgroundColor: 'var(--to-bg-panel)',
        borderRight: '1px solid var(--to-border)',
      }}
    >
      {/* Header */}
      <div
        className="px-4 h-10 flex items-center justify-between shrink-0"
        style={{ borderBottom: '1px solid var(--to-border)' }}
      >
        <span className="text-[11px] uppercase tracking-[0.08em]" style={{ color: 'var(--to-text-3)' }}>
          Issues
        </span>
        {activeIssues.length > 0 && (
          <span className="text-[10px] tabular-nums" style={{ color: 'var(--to-error)' }}>
            {activeIssues.length} active
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeIssues.length > 0 && (
          <div>
            <div className="px-4 pt-3 pb-1.5">
              <span className="text-[9px] uppercase tracking-[0.1em]" style={{ color: 'var(--to-text-4)' }}>
                Active
              </span>
            </div>
            {activeIssues.map(renderIssue)}
          </div>
        )}

        {resolvedIssues.length > 0 && (
          <div>
            <div className="px-4 pt-4 pb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[9px] uppercase tracking-[0.1em]" style={{ color: 'var(--to-text-5)' }}>
                  Resolved
                </span>
                <div className="flex-1 h-px" style={{ backgroundColor: 'var(--to-border-subtle)' }} />
              </div>
            </div>
            {resolvedIssues.map(renderIssue)}
          </div>
        )}
      </div>
    </aside>
  );
}
