import React, { useEffect } from 'react';
import { THEME } from '../theme';

interface CompoundProviderProps {
  children: React.ReactNode;
}

/**
 * CAISSA-CORE: THE ENVIRONMENT LAYOUT
 * Forces the global "Dark Luxury" environment.
 * Sets the core background and ensures high-contrast UI visibility.
 */
export const CompoundProvider = ({ children }: CompoundProviderProps) => {
  useEffect(() => {
    // Force global background color
    document.body.style.backgroundColor = THEME.colors.background.void;
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.overflowX = 'hidden';

    // Set theme-color meta tag for mobile browsers (StatusBar equivalent)
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute('content', THEME.colors.background.void);
  }, []);

  return (
    <div 
      className="min-h-screen w-full flex flex-col"
      style={{ 
        backgroundColor: THEME.colors.background.void,
        color: '#F8F9FA' // Default titanium white for text
      }}
    >
      {children}
    </div>
  );
};
