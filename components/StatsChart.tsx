import React from 'react';
import { Paper } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface StatsChartProps {
  papers: Paper[];
}

export const StatsChart: React.FC<StatsChartProps> = ({ papers }) => {
  if (papers.length === 0) return null;

  const data = React.useMemo(() => {
    const yearCounts: Record<string, number> = {};
    papers.forEach(p => {
      const year = new Date(p.published).getFullYear().toString();
      yearCounts[year] = (yearCounts[year] || 0) + 1;
    });

    return Object.keys(yearCounts)
      .sort()
      .map(year => ({
        year,
        count: yearCounts[year]
      }));
  }, [papers]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 h-full flex flex-col">
      <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Publication Timeline</h3>
      <div className="flex-grow min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis 
                dataKey="year" 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: '#94a3b8', fontSize: 12}}
                dy={10}
            />
            <Tooltip 
                cursor={{fill: '#f1f5f9'}}
                contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === data.length - 1 ? '#3b82f6' : '#cbd5e1'} />
                ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
