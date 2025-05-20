import React, { useState } from 'react';
import { Save, X } from 'lucide-react';

interface SOAPNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

interface SOAPNoteEditorProps {
  note: SOAPNote;
  onSave: (note: SOAPNote) => void;
  onCancel: () => void;
}

const SOAPNoteEditor: React.FC<SOAPNoteEditorProps> = ({ 
  note, 
  onSave, 
  onCancel 
}) => {
  const [editedNote, setEditedNote] = useState<SOAPNote>({...note});
  
  const handleChange = (field: keyof SOAPNote, value: string) => {
    setEditedNote(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(editedNote);
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-gray-800 p-4 rounded-lg space-y-4">
        <div>
          <label htmlFor="subjective" className="text-sm text-gray-400 font-medium block mb-1">
            SUBJECTIVE
          </label>
          <textarea
            id="subjective"
            value={editedNote.subjective}
            onChange={(e) => handleChange('subjective', e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 text-white rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
          />
        </div>
        
        <div>
          <label htmlFor="objective" className="text-sm text-gray-400 font-medium block mb-1">
            OBJECTIVE
          </label>
          <textarea
            id="objective"
            value={editedNote.objective}
            onChange={(e) => handleChange('objective', e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 text-white rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
          />
        </div>
        
        <div>
          <label htmlFor="assessment" className="text-sm text-gray-400 font-medium block mb-1">
            ASSESSMENT
          </label>
          <textarea
            id="assessment"
            value={editedNote.assessment}
            onChange={(e) => handleChange('assessment', e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 text-white rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
          />
        </div>
        
        <div>
          <label htmlFor="plan" className="text-sm text-gray-400 font-medium block mb-1">
            PLAN
          </label>
          <textarea
            id="plan"
            value={editedNote.plan}
            onChange={(e) => handleChange('plan', e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 text-white rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
          />
        </div>
      </div>
      
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center px-3 py-2 rounded bg-gray-700 hover:bg-gray-600"
        >
          <X className="w-4 h-4 mr-1" />
          Cancel
        </button>
        
        <button
          type="submit"
          className="flex items-center px-3 py-2 rounded bg-green-700 hover:bg-green-600"
        >
          <Save className="w-4 h-4 mr-1" />
          Save
        </button>
      </div>
    </form>
  );
};

export default SOAPNoteEditor; 