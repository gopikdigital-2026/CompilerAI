import React from 'react';

interface BarChartProps {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
}

export function BarChart({ data, color = '#0072e6', height = 120 }: BarChartProps) {
  const max = Math.max(...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-1.5 w-full" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-1 flex-1 h-full justify-end">
          <div
            className="w-full rounded-sm transition-all duration-300 hover:opacity-80"
            style={{
              height: `${(d.value / max) * (height - 20)}px`,
              backgroundColor: color,
              opacity: 0.7 + (i / data.length) * 0.3,
            }}
          />
          <span className="text-[10px] text-neutral-500">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
