interface ServiceSelectorProps {
  services: string[];
  selectedService: string | null;
  onSelect: (serviceName: string) => void;
  loading?: boolean;
}

export function ServiceSelector({ services, selectedService, onSelect, loading }: ServiceSelectorProps) {
  return (
    <div>
      <label htmlFor="service-select" className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
        Service
      </label>
      <select
        id="service-select"
        value={selectedService || ''}
        onChange={(e) => onSelect(e.target.value)}
        disabled={loading || services.length === 0}
        className="block w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-sky-400 focus:border-sky-400 disabled:bg-slate-900/50 disabled:text-gray-500 disabled:cursor-not-allowed appearance-none cursor-pointer"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 0.75rem center',
          backgroundSize: '1em 1em',
          paddingRight: '2.5rem'
        }}
      >
        <option value="" className="bg-slate-950">-- Choose a service --</option>
        {Array.isArray(services) && services.map((service) => (
          <option key={service} value={service} className="bg-slate-950">
            {service}
          </option>
        ))}
      </select>
    </div>
  );
}

