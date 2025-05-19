import React, { ReactNode } from 'react';

interface PTDashboardLayoutProps {
  children: ReactNode;
  sidebar: ReactNode;
}

/**
 * Layout component for the PT Dashboard with a main content area and a right sidebar
 */
export function PTDashboardLayout({ children, sidebar }: PTDashboardLayoutProps) {
  return (
    <div className="w-full grid grid-cols-[1fr_minmax(300px,28%)] gap-3">
      {/* Main content area */}
      <div className="space-y-3">
        {children}
      </div>
      
      {/* Right sidebar */}
      <div className="space-y-3">
        {sidebar}
      </div>
    </div>
  );
}

export default PTDashboardLayout; 