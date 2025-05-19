import React, { useCallback } from 'react';
import { FileText } from 'lucide-react';
import { CollapsiblePanel } from './CollapsiblePanel';

interface PTSessionNotesProps {
  value: string;
  onChange: (notes: string) => void;
  isSessionActive: boolean;
  disabled?: boolean;
}

export function PTSessionNotes({
  value,
  onChange,
  isSessionActive,
  disabled = false
}: PTSessionNotesProps) {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  return (
    <CollapsiblePanel
      title="Session Notes"
      subtitle={value ? `${value.length} characters` : "No notes yet"}
      icon={<FileText className="w-6 h-6 text-green-400" />}
      defaultExpanded={true}
    >
      <div className="space-y-2">
        <textarea
          className="w-full h-36 px-3 py-2 bg-gray-700 text-white rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={isSessionActive ? "Add notes about this session..." : "Start a session to add notes..."}
          value={value}
          onChange={handleChange}
          disabled={disabled || !isSessionActive}
        ></textarea>
        
        {!isSessionActive && (
          <div className="text-sm text-gray-400">
            Notes can only be added during an active session.
          </div>
        )}
        
        {isSessionActive && (
          <div className="text-sm text-gray-400">
            These notes will be saved with the session data.
          </div>
        )}
      </div>
    </CollapsiblePanel>
  );
}

export default PTSessionNotes; 