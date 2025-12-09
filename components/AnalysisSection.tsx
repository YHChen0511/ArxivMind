import React from 'react';
import { AnalysisResult } from '../types';
import { Sparkles, TrendingUp, Lightbulb } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface AnalysisSectionProps {
  analysis: AnalysisResult | null;
  loading: boolean;
}

export const AnalysisSection: React.FC<AnalysisSectionProps> = ({ analysis, loading }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 animate-pulse">
        <div className="h-4 bg-slate-200 rounded w-1/4 mb-4"></div>
        <div className="space-y-3">
          <div className="h-2 bg-slate-100 rounded w-full"></div>
          <div className="h-2 bg-slate-100 rounded w-full"></div>
          <div className="h-2 bg-slate-100 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className="bg-gradient-to-br from-white to-indigo-50/30 rounded-xl shadow-sm border border-indigo-100 p-6 mb-8">
      <div className="flex items-center gap-2 mb-4 text-indigo-700">
        <Sparkles size={20} />
        <h2 className="text-lg font-bold">AI Research Insights</h2>
      </div>
      
      <div className="text-slate-700 mb-6 leading-relaxed prose prose-sm max-w-none prose-indigo">
        <ReactMarkdown>{analysis.summary}</ReactMarkdown>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center gap-2 mb-3 text-slate-800 font-semibold">
            <TrendingUp size={18} className="text-blue-500" />
            <h3>Key Trends</h3>
          </div>
          <ul className="space-y-2">
            {analysis.keyTrends.map((trend, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                <span className="mt-1.5 w-1.5 h-1.5 bg-blue-400 rounded-full flex-shrink-0"></span>
                {trend}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3 text-slate-800 font-semibold">
            <Lightbulb size={18} className="text-amber-500" />
            <h3>Suggested Directions</h3>
          </div>
          <ul className="space-y-2">
            {analysis.suggestedDirections.map((dir, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                <span className="mt-1.5 w-1.5 h-1.5 bg-amber-400 rounded-full flex-shrink-0"></span>
                {dir}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
