import React, { useState, ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import clsx from 'clsx';

interface CollapsiblePanelProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  defaultExpanded?: boolean;
  children: ReactNode;
  className?: string;
}

export function CollapsiblePanel({
  title,
  subtitle,
  icon,
  defaultExpanded = true,
  children,
  className = '',
}: CollapsiblePanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div
      className={clsx(
        "rounded-lg border border-gray-700",
        "bg-gray-800/50 backdrop-blur-sm",
        "transition-all duration-300 ease-in-out",
        className
      )}
    >
      {/* Header - always visible */}
      <div 
        className={clsx(
          "flex items-center justify-between p-4 cursor-pointer",
          isExpanded ? "border-b border-gray-700" : ""
        )}
        onClick={toggleExpand}
      >
        <div className="flex items-center gap-3">
          {icon && <div className="flex-shrink-0">{icon}</div>}
          <div className="flex flex-col">
            <span className="font-bold text-lg">{title}</span>
            {subtitle && <span className="text-sm text-gray-400">{subtitle}</span>}
          </div>
        </div>
        <div className="text-gray-400">
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </div>

      {/* Content - only visible when expanded */}
      <div 
        className={clsx(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
} 