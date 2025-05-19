import React from 'react';
import { MetricGauge } from '../components/MetricGauge';
import BalanceMap from '../components/BalanceMap';
import { useMetricStreams } from '../hooks/useMetricStreams';

export default function LiveGait() {
  const m: any = useMetricStreams();

  return (
    <div className="flex flex-col p-4 gap-4">
      <div className="flex gap-8">
        <MetricGauge label="Cadence" value={Math.round(m.cadence_spm || 0)} />
        <MetricGauge label="Symmetry %" value={Math.round(m.symmetry_idx_pct || 0)} max={100} />
        <MetricGauge label="Stride (in)" value={Math.round(m.stride_len_in || 0)} max={60} />
      </div>
      <div className="flex gap-4">
        <BalanceMap frame={m} className="max-w-md" />
        {/* existing grid component reused */}
      </div>
    </div>
  );
} 