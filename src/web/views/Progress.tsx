import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchPatientMetrics } from '../api/ptApi';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import PatientTable from '../components/PatientTable';

export default function Progress() {
  const [patient, setPatient] = useState<any>(null);

  const { data = [] } = useQuery({
    enabled: !!patient,
    queryKey: ['metrics', patient?.id],
    queryFn: () => fetchPatientMetrics(patient.id),
  });

  return (
    <div className="flex">
      <PatientTable onSelect={setPatient} />
      {patient && (
        <div className="flex-1 p-4">
          <h2 className="text-xl font-semibold mb-2">{patient.first_name}'s Progress</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <XAxis dataKey="ts" tickFormatter={(d: string) => d.slice(5, 10)} />
              <YAxis />
              <Tooltip />
              <Line dataKey="cadence_spm" stroke="#3b82f6" strokeWidth={2} />
              <Line dataKey="sway_path_cm" stroke="#ef4444" strokeDasharray="3 3" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
} 