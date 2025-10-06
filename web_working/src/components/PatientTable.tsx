import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { patientApi, Patient, PatientApiError } from '../services/patientApi';
import PatientCreateForm from './PatientCreateForm';
import { mockResearchSubjects } from '../utils/mockResearchData';

// Convert research subjects to Patient interface format
const mockPatients: Patient[] = mockResearchSubjects.map(subject => ({
  id: subject.id,
  clinic_id: 1,
  first_name: subject.first_name,
  last_name: subject.last_name,
  gender: subject.gender,
  age: subject.age,
  diagnosis: subject.flooring_condition,  // Show flooring condition in diagnosis column
  dx_icd10: subject.flooring_condition,
  sessions_count: subject.sessions_count,
  last_visit: subject.last_visit
}));

interface PatientTableProps {
  onSelect: (patient: Patient) => void;
  onViewReport?: (patientId: number) => void;
}

export function PatientTable({ onSelect, onViewReport }: PatientTableProps) {
  // State for search functionality and modals
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [useApi, setUseApi] = useState(true);
  
  const queryClient = useQueryClient();
  
  // Fetch patients data with API fallback to mock data
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['patients'],
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

  // Handle patient creation success
  const handlePatientCreated = (newPatient: Patient) => {
    // Add to cache optimistically
    queryClient.setQueryData(['patients'], (old: Patient[] | undefined) => {
      return old ? [newPatient, ...old] : [newPatient];
    });
    
    // Refetch to ensure data consistency
    refetch();
  };

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

  if (error && useApi) {
    return (
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
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Add Subject button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Research Subjects</h3>
        <button
          onClick={() => setIsCreateFormOpen(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Subject
        </button>
      </div>
      
      {/* Search input */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search subjects by name or flooring condition..."
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

      {/* Research Subjects table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-300">
          <thead className="text-xs text-gray-400 uppercase bg-gray-800">
            <tr>
              <th scope="col" className="px-6 py-3">Subject Name</th>
              <th scope="col" className="px-6 py-3">Age/Gender</th>
              <th scope="col" className="px-6 py-3">Flooring Condition</th>
              <th scope="col" className="px-6 py-3">Trials</th>
              <th scope="col" className="px-6 py-3">Last Session</th>
              <th scope="col" className="px-6 py-3">Report</th>
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
                  <td className="px-6 py-4">
                    {patient.age ? `${patient.age}y` : '-'}
                    {patient.age && patient.gender ? ' / ' : ''}
                    {patient.gender || ''}
                  </td>
                  <td className="px-6 py-4">
                    <div className="max-w-xs truncate" title={patient.diagnosis || '-'}>
                      {patient.diagnosis || '-'}
                    </div>
                    {patient.dx_icd10 && (
                      <div className="text-xs text-gray-400">{patient.dx_icd10}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">{patient.sessions_count}</td>
                  <td className="px-6 py-4">{patient.last_visit ? new Date(patient.last_visit).toLocaleDateString() : '-'}</td>
                  <td className="px-6 py-4">
                    {onViewReport && (
                      <button
                        className="text-blue-400 hover:text-blue-300"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewReport(patient.id);
                        }}
                      >
                        View
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr className="bg-gray-700 border-b border-gray-600">
                <td colSpan={6} className="px-6 py-4 text-center">
                  {searchTerm ? 'No matching subjects found' : 'No subjects available'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center text-xs text-gray-400">
        <div>
          {useApi ? (
            <span className="text-green-400">✓ Connected to database</span>
          ) : (
            <span className="text-yellow-400">⚠ Using research demo data</span>
          )}
        </div>
        <div>
          {filteredPatients.length} subject{filteredPatients.length !== 1 ? 's' : ''} shown
        </div>
      </div>
      
      {/* Patient Creation Form Modal */}
      <PatientCreateForm
        isOpen={isCreateFormOpen}
        onClose={() => setIsCreateFormOpen(false)}
        onPatientCreated={handlePatientCreated}
      />
    </div>
  );
}

export default PatientTable; 