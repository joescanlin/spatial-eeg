import React, { useState } from 'react';
import { X, Search } from 'lucide-react';

// Patient interface (matching the one from PatientTable)
interface Patient {
  id: number;
  first_name: string;
  last_name: string;
  diagnosis: string;
  sessions_count: number;
  last_visit: string;
}

// Mock data for patients (same as in PatientTable)
const mockPatients: Patient[] = [
  { 
    id: 1, 
    first_name: 'John', 
    last_name: 'Doe', 
    diagnosis: 'Post-operative rehabilitation', 
    sessions_count: 8, 
    last_visit: '2025-05-10' 
  },
  { 
    id: 2, 
    first_name: 'Jane', 
    last_name: 'Smith', 
    diagnosis: 'ACL reconstruction', 
    sessions_count: 15, 
    last_visit: '2025-05-14' 
  },
  { 
    id: 3, 
    first_name: 'Robert', 
    last_name: 'Johnson', 
    diagnosis: 'Lower back pain', 
    sessions_count: 5, 
    last_visit: '2025-05-07' 
  },
  { 
    id: 4, 
    first_name: 'Maria', 
    last_name: 'Garcia', 
    diagnosis: 'Shoulder impingement', 
    sessions_count: 10, 
    last_visit: '2025-05-13' 
  },
  { 
    id: 5, 
    first_name: 'William', 
    last_name: 'Brown', 
    diagnosis: 'Hip replacement', 
    sessions_count: 20, 
    last_visit: '2025-05-12' 
  }
];

interface PatientSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPatient: (patient: Patient) => void;
}

export function PatientSelectionModal({
  isOpen,
  onClose,
  onSelectPatient
}: PatientSelectionModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter patients based on search term
  const filteredPatients = mockPatients.filter(patient => {
    const fullName = `${patient.first_name} ${patient.last_name}`.toLowerCase();
    const diagnosis = patient.diagnosis?.toLowerCase() || '';
    return fullName.includes(searchTerm.toLowerCase()) || 
           diagnosis.includes(searchTerm.toLowerCase());
  });
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold">Select Patient</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 border-b border-gray-700">
          <div className="relative">
            <input
              type="text"
              placeholder="Search patients by name or diagnosis..."
              className="w-full px-4 py-2 pl-10 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            {searchTerm && (
              <button
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                onClick={() => setSearchTerm('')}
              >
                ×
              </button>
            )}
          </div>
        </div>
        
        <div className="overflow-y-auto flex-grow">
          <div className="divide-y divide-gray-700">
            {filteredPatients.length > 0 ? (
              filteredPatients.map(patient => (
                <div 
                  key={patient.id}
                  className="p-4 hover:bg-gray-700 cursor-pointer transition-colors"
                  onClick={() => {
                    onSelectPatient(patient);
                    onClose();
                  }}
                >
                  <div className="font-medium">
                    {patient.first_name} {patient.last_name}
                  </div>
                  <div className="text-sm text-gray-400 mt-1">
                    {patient.diagnosis}
                  </div>
                  <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                    <div>
                      Sessions: {patient.sessions_count}
                    </div>
                    <div>
                      Last visit: {new Date(patient.last_visit).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-gray-400">
                No patients found matching "{searchTerm}"
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PatientSelectionModal; 