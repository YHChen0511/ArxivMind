export interface Paper {
  id: string;
  title: string;
  summary: string;
  authors: string[];
  published: string;
  updated: string;
  link: string;
  categories: string[];
  score?: number;
  reason?: string;
}

export interface SearchState {
  status: 'idle' | 'generating_query' | 'fetching_papers' | 'analyzing' | 'success' | 'error';
  message?: string;
}

export interface AnalysisResult {
  summary: string;
  keyTrends: string[];
  suggestedDirections: string[];
}
