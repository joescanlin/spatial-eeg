import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

// Define the Patient type for better type safety
interface Patient {
  id: number;
  first_name: string;
  last_name: string;
  diagnosis: string;
  sessions_count: number;
  last_visit: string;
}

// Mock data for patients
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

interface PatientTableProps {
  onSelect: (patient: Patient) => void;
}

export function PatientTable({ onSelect }: PatientTableProps) {
  // State for search functionality
  const [searchTerm, setSearchTerm] = useState('');
  
  // Fetch patients data with mock data instead of API
  const { data, isLoading, error } = useQuery({
    queryKey: ['patients'],
    queryFn: () => Promise.resolve(mockPatients),
    // Always return success for demo mode
    retry: false,
    staleTime: Infinity,
  });

  // Filter patients based on search term
  const filteredPatients = data ? data.filter((patient: Patient) => {
    const fullName = `${patient.first_name} ${patient.last_name}`.toLowerCase();
    const diagnosis = patient.diagnosis?.toLowerCase() || '';
    return fullName.includes(searchTerm.toLowerCase()) || 
           diagnosis.includes(searchTerm.toLowerCase());
  }) : [];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 p-4">
        Error loading patients data. Please try again later.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search input */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search patients by name or diagnosis..."
          className="w-full px-4 py-2 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            onClick={() => setSearchTerm('')}
          >
            ×
          </button>
        )}
      </div>

      {/* Patients table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-300">
          <thead className="text-xs text-gray-400 uppercase bg-gray-800">
            <tr>
              <th scope="col" className="px-6 py-3">Name</th>
              <th scope="col" className="px-6 py-3">Diagnosis</th>
              <th scope="col" className="px-6 py-3">Sessions</th>
              <th scope="col" className="px-6 py-3">Last Visit</th>
            </tr>
          </thead>
          <tbody>
            {filteredPatients.length > 0 ? (
              filteredPatients.map((patient: Patient) => (
                <tr 
                  key={patient.id} 
                  className="bg-gray-700 border-b border-gray-600 hover:bg-gray-600 cursor-pointer"
                  onClick={() => onSelect(patient)}
                >
                  <td className="px-6 py-4 font-medium whitespace-nowrap">
                    {patient.first_name} {patient.last_name}
                  </td>
                  <td className="px-6 py-4">{patient.diagnosis || '-'}</td>
                  <td className="px-6 py-4">{patient.sessions_count}</td>
                  <td className="px-6 py-4">{patient.last_visit ? new Date(patient.last_visit).toLocaleDateString() : '-'}</td>
                </tr>
              ))
            ) : (
              <tr className="bg-gray-700 border-b border-gray-600">
                <td colSpan={4} className="px-6 py-4 text-center">
                  {searchTerm ? 'No matching patients found' : 'No patients available'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      <div className="text-xs text-gray-400 italic">
        Demo Mode: Using mock patient data
      </div>
    </div>
  );
}

export default PatientTable; 