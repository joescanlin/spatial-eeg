import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Search } from 'lucide-react';
import { patientApi, Patient, PatientApiError } from '../services/patientApi';

// Mock data for fallback when API is not available
const mockPatients: Patient[] = [
  { 
    id: 1, 
    clinic_id: 1,
    first_name: 'John', 
    last_name: 'Doe', 
    gender: 'Male',
    age: 34,
    diagnosis: 'Post-operative rehabilitation',
    dx_icd10: 'Z51.89',
    sessions_count: 8, 
    last_visit: '2025-05-10' 
  },
  { 
    id: 2, 
    clinic_id: 1,
    first_name: 'Jane', 
    last_name: 'Smith', 
    gender: 'Female',
    age: 28,
    diagnosis: 'ACL reconstruction',
    dx_icd10: 'S83.511A',
    sessions_count: 15, 
    last_visit: '2025-05-14' 
  },
  { 
    id: 3, 
    clinic_id: 1,
    first_name: 'Robert', 
    last_name: 'Johnson', 
    gender: 'Male',
    age: 45,
    diagnosis: 'Lower back pain',
    dx_icd10: 'M54.5',
    sessions_count: 5, 
    last_visit: '2025-05-07' 
  },
  { 
    id: 4, 
    clinic_id: 1,
    first_name: 'Maria', 
    last_name: 'Garcia', 
    gender: 'Female',
    age: 32,
    diagnosis: 'Shoulder impingement',
    dx_icd10: 'M75.3',
    sessions_count: 10, 
    last_visit: '2025-05-13' 
  },
  { 
    id: 5, 
    clinic_id: 1,
    first_name: 'William', 
    last_name: 'Brown', 
    gender: 'Male',
    age: 67,
    diagnosis: 'Hip replacement',
    dx_icd10: 'Z96.641',
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
  const [useApi, setUseApi] = useState(true);
  
  // Fetch patients data with API fallback to mock data
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['patients-modal'],
    queryFn: async () => {
      if (!useApi) {
        return mockPatients;
      }
      
      try {
        const patients = await patientApi.getPatients();
        // Map dx_icd10 to diagnosis for backward compatibility
        return patients.map(patient => ({
          ...patient,
          diagnosis: patient.dx_icd10 || patient.diagnosis || 'No diagnosis'
        }));
      } catch (error) {
        console.warn('API not available, falling back to mock data:', error);
        setUseApi(false);
        return mockPatients;
      }
    },
    retry: 1,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  });
  
  // Filter patients based on search term
  const filteredPatients = data ? data.filter((patient: Patient) => {
    const fullName = `${patient.first_name} ${patient.last_name}`.toLowerCase();
    const diagnosis = patient.diagnosis?.toLowerCase() || '';
    return fullName.includes(searchTerm.toLowerCase()) || 
           diagnosis.includes(searchTerm.toLowerCase());
  }) : [];
  
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
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : error && useApi ? (
            <div className="text-red-500 p-4">
              <div className="font-bold">Error loading patients data</div>
              <div className="text-sm mt-1">
                {error instanceof PatientApiError ? error.message : 'Please try again later.'}
              </div>
              <button 
                onClick={() => refetch()} 
                className="mt-2 px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
              >
                Retry
              </button>
            </div>
          ) : (
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
                  {searchTerm ? `No patients found matching "${searchTerm}"` : 'No patients available'}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Connection status indicator */}
        <div className="p-3 border-t border-gray-700 text-xs text-gray-400 flex justify-between">
          <div>
            {useApi ? (
              <span className="text-green-400">✓ Connected to database</span>
            ) : (
              <span className="text-yellow-400">⚠ Using demo data (database unavailable)</span>
            )}
          </div>
          <div>
            {filteredPatients.length} patient{filteredPatients.length !== 1 ? 's' : ''} shown
          </div>
        </div>
      </div>
    </div>
  );
}

export default PatientSelectionModal; 