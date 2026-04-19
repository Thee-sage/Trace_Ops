// CSS variable references for use in inline styles
// All values resolve from [data-theme] in theme.css

export const v = (name: string) => `var(--to-${name})`;

export const typeColor: Record<string, string> = {
  error: v('error'),
  deployment: v('deploy'),
  config: v('config'),
};

export const typeSubtle: Record<string, string> = {
  error: v('error-subtle'),
  deployment: v('deploy-subtle'),
  config: v('deploy-subtle'),
};

export const typeBorder: Record<string, string> = {
  error: v('error-border'),
  deployment: v('deploy-border'),
  config: v('config-border'),
};

export const statusColor: Record<string, string> = {
  open: v('status-open'),
  investigating: v('status-investigating'),
  resolved: v('status-resolved'),
};
