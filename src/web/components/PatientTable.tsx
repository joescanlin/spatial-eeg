import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetchPatients } from '../api/ptApi';

export default function PatientTable({ onSelect }: { onSelect: (patient: any) => void }) {
  const { data, isLoading } = useQuery({ queryKey: ['patients'], queryFn: fetchPatients });

  if (isLoading) return <p>Loading…</p>;

  return (
    <table className="w-full text-sm">
      <thead>
        <tr>
          <th>Name</th>
          <th>Sessions</th>
          <th>Last Visit</th>
          <th className="w-24">Report</th>
        </tr>
      </thead>
      <tbody>
        {data.map((p: any) => (
          <tr
            key={p.id}
            className="hover:bg-gray-100 cursor-pointer"
            onClick={() => onSelect(p)}
          >
            <td>
              {p.first_name} {p.last_name}
            </td>
            <td>{p.sessions_count}</td>
            <td>{p.last_visit?.slice(0, 10) || '-'}</td>
            <td>
              <Link
                to={`/patients/${p.id}/report`}
                className="text-blue-500 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                View
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
} 