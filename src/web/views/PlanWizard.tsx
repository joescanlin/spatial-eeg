import React, { useState } from 'react';
import { fetchPatients } from '../api/ptApi';
import { useQuery } from '@tanstack/react-query';

const rules = (m: any): string[] => {
  return [
    m.symmetry_idx_pct > 15 && 'Add unilateral step-ups, 3×10 each side',
    m.sway_path_cm > 25 && 'Introduce tandem-stance hold, 30 s × 5',
  ].filter(Boolean) as string[];
};

export default function PlanWizard() {
  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: fetchPatients,
  });

  const [sel, setSel] = useState<any>(null);

  return (
    <div className="p-4">
      <select
        onChange={(e) => setSel(patients.find((p: any) => p.id == (e.target.value as any)))}
        className="bg-gray-200 p-2 rounded"
      >
        <option>Select patient…</option>
        {patients.map((p: any) => (
          <option key={p.id} value={p.id}>
            {p.first_name} {p.last_name}
          </option>
        ))}
      </select>

      {sel && (
        <div className="mt-4 space-y-2">
          {rules(sel.latest_metrics).map((txt: string, i: number) => (
            <div key={i} className="bg-green-100 p-2 rounded">
              {txt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 