import { useState, useEffect } from 'react';
import { useTheme } from './components/use-theme';
import { TopBar, type Page } from './components/top-bar';
import { DashboardPage } from './components/dashboard-page';
import { DocsPage } from './components/docs-page';
import { SettingsPanel } from './components/settings-panel';
import { AuthProvider, useAuth } from './components/auth-context';
import { AuthPage } from './components/auth-page';
import { fetchServices } from './components/api';

function AppShell() {
  const { theme, toggle: toggleTheme } = useTheme();
  const { user, isAuthenticated, isGuest, isLoading } = useAuth();
  const [page, setPage] = useState<Page>('dashboard');
  const [timeFilter, setTimeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedService, setSelectedService] = useState('All services');
  const [services, setServices] = useState<string[]>([]);

  useEffect(() => {
    if (!isAuthenticated && !isGuest) return;
    fetchServices().then(setServices).catch(console.error);
  }, [isAuthenticated, isGuest]);

  // Loading spinner
  if (isLoading) {
    return (
      <div
        className="h-screen flex items-center justify-center"
        style={{
          backgroundColor: 'var(--to-bg-primary)',
          fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
        }}
      >
        <div
          className="w-5 h-5 rounded-full border-2 animate-spin"
          style={{
            borderColor: 'var(--to-border)',
            borderTopColor: 'var(--to-text-1)',
          }}
        />
      </div>
    );
  }

  // Not logged in and not guest → auth page
  if (!isAuthenticated && !isGuest) {
    return <AuthPage />;
  }

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
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
        theme={theme}
        onToggleTheme={toggleTheme}
        selectedService={selectedService}
        onServiceChange={setSelectedService}
        services={services}
        userName={user?.name}
      />

      {page === 'dashboard' && (
        <DashboardPage
          selectedService={selectedService}
          timeFilter={timeFilter}
          searchQuery={searchQuery}
        />
      )}
      {page === 'docs' && <DocsPage />}
      {page === 'settings' && <SettingsPanel />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
