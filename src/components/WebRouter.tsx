import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import LandingPage from './LandingPage';
import WebApp from './WebApp';

const WebRouter: React.FC = () => {
  const [currentRoute, setCurrentRoute] = useState<'landing' | 'admin'>('landing');

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    // Check URL parameters and pathname to determine route
    const urlParams = new URLSearchParams(window.location.search);
    const routeParam = urlParams.get('route');
    const pathname = window.location.pathname;

    if (routeParam === 'admin' || pathname.includes('/admin')) {
      setCurrentRoute('admin');
    } else {
      setCurrentRoute('landing');
    }

    // Listen for navigation changes
    const handlePopState = () => {
      const newUrlParams = new URLSearchParams(window.location.search);
      const newRouteParam = newUrlParams.get('route');
      const newPathname = window.location.pathname;

      if (newRouteParam === 'admin' || newPathname.includes('/admin')) {
        setCurrentRoute('admin');
      } else {
        setCurrentRoute('landing');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (currentRoute === 'admin') {
    return <WebApp />;
  }

  return <LandingPage />;
};

export default WebRouter; 