import React from 'react';
import { ResponsiveContainer, RadialBarChart, RadialBar, Legend } from 'recharts';

export const MetricGauge = ({ label, value, max = 200 }: { label: string; value: number; max?: number }) => (
  <div className="w-40 h-40">
    <ResponsiveContainer>
      <RadialBarChart innerRadius="70%" outerRadius="100%" data={[{ name: label, value }]}
        startAngle={90} endAngle={-270}>
        <RadialBar minAngle={15} maxAngle={360} clockWise dataKey="value" cornerRadius={10} fill="#3b82f6" />
        <Legend verticalAlign="middle" align="center" iconSize={0} formatter={() => (
          <span className="text-lg font-semibold text-white">{value}</span>
        )} />
      </RadialBarChart>
    </ResponsiveContainer>
    <p className="text-center mt-1 text-white text-sm">{label}</p>
  </div>
); 