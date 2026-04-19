import { useState } from 'react';
import { TopBar } from './components/top-bar';
import { DashboardPage } from './components/dashboard-page';
import { DocsPage } from './components/docs-page';
import { useTheme } from './components/use-theme';
import { useDeviceClass, type DeviceClass } from './components/use-mobile';

export type Page = 'dashboard' | 'docs';

export default function App() {
  const { theme, toggle: toggleTheme } = useTheme();
  const device = useDeviceClass();
  const isCompact = device === 'phone' || device === 'tablet';
  const [page, setPage] = useState<Page>('dashboard');
  const [timeFilter, setTimeFilter] = useState('24h');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedService, setSelectedService] = useState('All services');

  return (
    <div
      className="h-screen flex flex-col overflow-hidden relative"
      style={{
        backgroundColor: 'var(--to-bg-primary)',
        color: 'var(--to-text-1)',
        fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
      }}
    >
      <TopBar
        page={page}
        onPageChange={setPage}
        timeFilter={timeFilter}
        onTimeFilterChange={setTimeFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedService={selectedService}
        onServiceChange={setSelectedService}
        theme={theme}
        onToggleTheme={toggleTheme}
        device={device}
      />
      {page === 'dashboard' && (
        <DashboardPage
          timeFilter={timeFilter}
          searchQuery={searchQuery}
          selectedService={selectedService}
          device={device}
        />
      )}
      {page === 'docs' && <DocsPage device={device} />}
    </div>
  );
}
