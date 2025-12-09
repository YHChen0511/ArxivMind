import React from 'react';
import { Paper } from '../types';
import { ExternalLink, Calendar, Users, Tag, Star } from 'lucide-react';

interface PaperCardProps {
  paper: Paper;
}

export const PaperCard: React.FC<PaperCardProps> = ({ paper }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-shadow duration-200 flex flex-col h-full relative overflow-hidden">
      {paper.score !== undefined && paper.score > 0 && (
        <div className={`absolute top-0 right-0 px-3 py-1 rounded-bl-xl text-xs font-bold text-white flex items-center gap-1
          ${paper.score >= 8 ? 'bg-green-500' : paper.score >= 5 ? 'bg-yellow-500' : 'bg-slate-400'}`}>
          <Star size={12} fill="currentColor" />
          {paper.score}/10
        </div>
      )}
      
      <div className="flex justify-between items-start gap-4 mb-2 mt-2">
        <h3 className="text-lg font-semibold text-slate-800 leading-tight">
          <a href={paper.link} target="_blank" rel="noopener noreferrer" className="hover:text-primary-600 transition-colors">
            {paper.title}
          </a>
        </h3>
        <a 
          href={paper.link} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-slate-400 hover:text-primary-600 flex-shrink-0"
        >
          <ExternalLink size={18} />
        </a>
      </div>

      <div className="flex flex-wrap gap-2 mb-3 text-xs text-slate-500">
        <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded">
          <Calendar size={12} />
          <span>{new Date(paper.published).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded">
            <Tag size={12} />
            <span>{paper.categories[0]}</span>
        </div>
      </div>

      <div className="flex items-start gap-2 mb-4 text-sm text-slate-600">
        <Users size={16} className="mt-1 flex-shrink-0 text-slate-400" />
        <p className="line-clamp-1">{paper.authors.slice(0, 3).join(", ")}{paper.authors.length > 3 ? " et al." : ""}</p>
      </div>

      {paper.reason && (
        <div className="mb-3 p-2 bg-indigo-50 rounded-lg text-xs text-indigo-800 border border-indigo-100">
          <strong>Match:</strong> {paper.reason}
        </div>
      )}

      <p className="text-slate-600 text-sm leading-relaxed mb-4 line-clamp-4 flex-grow">
        {paper.summary}
      </p>

      <div className="mt-auto pt-4 border-t border-slate-50">
        <a 
            href={paper.link.replace('abs', 'pdf')} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center w-full py-2 px-4 bg-slate-50 hover:bg-slate-100 text-slate-700 text-sm font-medium rounded-lg transition-colors"
        >
            View PDF
        </a>
      </div>
    </div>
  );
};
