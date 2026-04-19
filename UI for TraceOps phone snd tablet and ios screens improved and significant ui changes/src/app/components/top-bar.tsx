import { Search, ChevronDown, Sun, Moon, Activity, BookOpen, Bell, Menu, X } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { services } from './data';
import type { Theme } from './use-theme';
import type { Page } from '../App';
import type { DeviceClass } from './use-mobile';

interface TopBarProps {
  page: Page;
  onPageChange: (p: Page) => void;
  timeFilter: string;
  onTimeFilterChange: (f: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedService: string;
  onServiceChange: (s: string) => void;
  theme: Theme;
  onToggleTheme: () => void;
  device: DeviceClass;
}

const filters = ['1h', '6h', '24h', '7d'];

const navItems: { id: Page; label: string; icon: typeof Activity }[] = [
  { id: 'dashboard', label: 'Incidents', icon: Activity },
  { id: 'docs', label: 'Docs', icon: BookOpen },
];

export function TopBar({
  page,
  onPageChange,
  timeFilter,
  onTimeFilterChange,
  searchQuery,
  onSearchChange,
  selectedService,
  onServiceChange,
  theme,
  onToggleTheme,
  device,
}: TopBarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [serviceOpen, setServiceOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const serviceRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (serviceRef.current && !serviceRef.current.contains(e.target as Node)) {
        setServiceOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (searchOpen && searchRef.current) searchRef.current.focus();
  }, [searchOpen]);

  const isMobile = device === 'phone' || device === 'tablet';

  if (isMobile) {
    return (
      <>
        <header
          className="flex items-center justify-between h-[48px] px-4 shrink-0 select-none"
          style={{ borderBottom: '1px solid var(--to-border)' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-[18px] h-[18px] rounded-[4px] flex items-center justify-center"
              style={{ backgroundColor: 'var(--to-brand-bg)' }}
            >
              <span style={{ fontSize: 10, color: 'var(--to-brand-text)', fontWeight: 600, lineHeight: 1 }}>T</span>
            </div>
            <span className="text-[13px] tracking-[-0.01em]" style={{ fontWeight: 500, color: 'var(--to-text-1)' }}>
              TraceOps
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onToggleTheme}
              className="p-1.5 rounded-md transition-colors duration-150"
              style={{ color: 'var(--to-text-4)' }}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button
              className="relative p-1.5 rounded-md"
              style={{ color: 'var(--to-text-4)' }}
            >
              <Bell size={15} />
              <span
                className="absolute top-1 right-1 w-[6px] h-[6px] rounded-full"
                style={{ backgroundColor: 'var(--to-error)' }}
              />
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-md"
              style={{ color: 'var(--to-text-3)' }}
            >
              {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>
        </header>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div
            className="absolute top-[48px] left-0 right-0 z-50 px-4 py-3 space-y-2"
            style={{
              backgroundColor: 'var(--to-bg-panel)',
              borderBottom: '1px solid var(--to-border)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            }}
          >
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = page === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { onPageChange(item.id); setMobileMenuOpen(false); }}
                  className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-[6px] text-[13px]"
                  style={{
                    color: isActive ? 'var(--to-text-1)' : 'var(--to-text-3)',
                    backgroundColor: isActive ? 'var(--to-bg-elevated)' : 'transparent',
                  }}
                >
                  <Icon size={14} />
                  {item.label}
                </button>
              );
            })}

            {page === 'dashboard' && (
              <>
                <div className="h-px" style={{ backgroundColor: 'var(--to-border-subtle)' }} />

                {/* Mobile search */}
                <input
                  value={searchQuery}
                  onChange={e => onSearchChange(e.target.value)}
                  placeholder="Search events..."
                  className="w-full rounded-md text-[12px] px-3 py-2 outline-none"
                  style={{
                    backgroundColor: 'var(--to-bg-elevated)',
                    border: '1px solid var(--to-border)',
                    color: 'var(--to-text-1)',
                  }}
                />

                {/* Mobile time filters */}
                <div
                  className="flex items-center rounded-md p-0.5"
                  style={{ backgroundColor: 'var(--to-bg-elevated)', border: '1px solid var(--to-border)' }}
                >
                  {filters.map(f => (
                    <button
                      key={f}
                      onClick={() => onTimeFilterChange(f)}
                      className="flex-1 px-2.5 py-1.5 text-[11px] rounded-[4px] transition-all duration-100"
                      style={{
                        color: timeFilter === f ? 'var(--to-text-1)' : 'var(--to-text-4)',
                        backgroundColor: timeFilter === f ? 'var(--to-bg-active)' : 'transparent',
                      }}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                {/* Mobile service filter */}
                <div className="flex flex-wrap gap-1.5">
                  {services.map(s => (
                    <button
                      key={s}
                      onClick={() => onServiceChange(s)}
                      className="text-[11px] px-2.5 py-1.5 rounded-[5px] transition-colors"
                      style={{
                        color: selectedService === s ? 'var(--to-text-1)' : 'var(--to-text-4)',
                        backgroundColor: selectedService === s ? 'var(--to-bg-active)' : 'var(--to-bg-elevated)',
                        border: `1px solid ${selectedService === s ? 'var(--to-text-5)' : 'var(--to-border)'}`,
                      }}
                    >
                      {s === 'All services' ? 'All' : s}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </>
    );
  }

  return (
    <header
      className="flex items-center justify-between h-[52px] px-5 shrink-0 select-none"
      style={{ borderBottom: '1px solid var(--to-border)' }}
    >
      {/* Left: brand + nav */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div
            className="w-[18px] h-[18px] rounded-[4px] flex items-center justify-center"
            style={{ backgroundColor: 'var(--to-brand-bg)' }}
          >
            <span style={{ fontSize: 10, color: 'var(--to-brand-text)', fontWeight: 600, lineHeight: 1 }}>T</span>
          </div>
          <span className="text-[13px] tracking-[-0.01em]" style={{ fontWeight: 500, color: 'var(--to-text-1)' }}>
            TraceOps
          </span>
        </div>

        <div className="w-px h-4" style={{ backgroundColor: 'var(--to-border)' }} />

        {/* Nav buttons */}
        <nav className="flex items-center gap-0.5">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = page === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onPageChange(item.id)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[5px] transition-all duration-100 text-[12px]"
                style={{
                  color: isActive ? 'var(--to-text-1)' : 'var(--to-text-3)',
                  backgroundColor: isActive ? 'var(--to-bg-elevated)' : 'transparent',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'var(--to-bg-hover)';
                    e.currentTarget.style.color = 'var(--to-text-2)';
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--to-text-3)';
                  }
                }}
              >
                <Icon size={13} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Dashboard-specific: service filter */}
        {page === 'dashboard' && (
          <>
            <div className="w-px h-4" style={{ backgroundColor: 'var(--to-border)' }} />
            <div ref={serviceRef} className="relative">
              <button
                onClick={() => setServiceOpen(!serviceOpen)}
                className="flex items-center gap-1.5 text-[12px] transition-colors duration-100"
                style={{ color: 'var(--to-text-3)' }}
              >
                {selectedService === 'All services' ? 'All services' : selectedService}
                <ChevronDown size={12} style={{ opacity: 0.5 }} />
              </button>
              {serviceOpen && (
                <div
                  className="absolute top-full left-0 mt-1.5 rounded-md py-1 min-w-[180px] z-[100]"
                  style={{
                    backgroundColor: 'var(--to-bg-elevated)',
                    border: '1px solid var(--to-border)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                  }}
                >
                  {services.map(s => (
                    <button
                      key={s}
                      onClick={() => { onServiceChange(s); setServiceOpen(false); }}
                      className="block w-full text-left px-3 py-1.5 text-[12px] transition-colors duration-75"
                      style={{
                        color: selectedService === s ? 'var(--to-text-1)' : 'var(--to-text-3)',
                        backgroundColor: selectedService === s ? 'var(--to-bg-active)' : 'transparent',
                      }}
                      onMouseEnter={e => {
                        if (selectedService !== s) e.currentTarget.style.backgroundColor = 'var(--to-bg-hover)';
                      }}
                      onMouseLeave={e => {
                        if (selectedService !== s) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Right: filters + actions */}
      <div className="flex items-center gap-3">
        {/* Time filters — dashboard only */}
        {page === 'dashboard' && (
          <>
            <div
              className="flex items-center rounded-md p-0.5"
              style={{ backgroundColor: 'var(--to-bg-elevated)', border: '1px solid var(--to-border)' }}
            >
              {filters.map(f => (
                <button
                  key={f}
                  onClick={() => onTimeFilterChange(f)}
                  className="px-2.5 py-1 text-[11px] rounded-[4px] transition-all duration-100"
                  style={{
                    color: timeFilter === f ? 'var(--to-text-1)' : 'var(--to-text-4)',
                    backgroundColor: timeFilter === f ? 'var(--to-bg-active)' : 'transparent',
                  }}
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="w-px h-4" style={{ backgroundColor: 'var(--to-border)' }} />

            <div className="relative flex items-center">
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className="p-1.5 rounded-md transition-colors duration-100"
                style={{
                  color: searchOpen ? 'var(--to-text-2)' : 'var(--to-text-4)',
                  backgroundColor: searchOpen ? 'var(--to-bg-elevated)' : 'transparent',
                }}
              >
                <Search size={14} />
              </button>
              {searchOpen && (
                <input
                  ref={searchRef}
                  value={searchQuery}
                  onChange={e => onSearchChange(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Escape') { setSearchOpen(false); onSearchChange(''); }}}
                  placeholder="Search events..."
                  className="absolute right-8 top-1/2 -translate-y-1/2 rounded-md text-[12px] w-52 px-3 py-1.5 outline-none transition-colors duration-100"
                  style={{
                    backgroundColor: 'var(--to-bg-elevated)',
                    border: '1px solid var(--to-border)',
                    color: 'var(--to-text-1)',
                  }}
                />
              )}
            </div>
          </>
        )}

        {/* Notification bell */}
        <button
          className="relative p-1.5 rounded-md transition-colors duration-150"
          style={{ color: 'var(--to-text-4)' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--to-text-2)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--to-text-4)'; }}
          title="Notifications"
        >
          <Bell size={14} />
          <span
            className="absolute top-1 right-1 w-[6px] h-[6px] rounded-full"
            style={{ backgroundColor: 'var(--to-error)' }}
          />
        </button>

        {/* Theme toggle */}
        <button
          onClick={onToggleTheme}
          className="p-1.5 rounded-md transition-colors duration-150"
          style={{ color: 'var(--to-text-4)' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--to-text-2)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--to-text-4)'; }}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>

        {/* Avatar */}
        <div
          className="w-[26px] h-[26px] rounded-full flex items-center justify-center ml-1 cursor-pointer"
          style={{ backgroundColor: 'var(--to-bg-elevated)', border: '1px solid var(--to-border)' }}
        >
          <span className="text-[10px]" style={{ color: 'var(--to-text-3)', fontWeight: 500 }}>JK</span>
        </div>
      </div>
    </header>
  );
}