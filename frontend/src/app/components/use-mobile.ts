import { useState, useEffect } from 'react';

export type DeviceClass = 'phone' | 'tablet' | 'desktop' | 'desktop-xl';

function getDeviceClass(width: number): DeviceClass {
  if (width < 480) return 'phone';
  if (width < 1024) return 'tablet';
  if (width < 1440) return 'desktop';
  return 'desktop-xl';
}

export function useDeviceClass(): DeviceClass {
  const [device, setDevice] = useState<DeviceClass>(() =>
    typeof window !== 'undefined' ? getDeviceClass(window.innerWidth) : 'desktop'
  );

  useEffect(() => {
    const handler = () => setDevice(getDeviceClass(window.innerWidth));
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return device;
}

/** Convenience hook — true for phone & tablet */
export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
  );

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);

  return isMobile;
}
