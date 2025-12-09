import React, { useState, useMemo } from 'react';
import { Search, Loader2, BookOpen, AlertCircle, Filter, ArrowUpDown } from 'lucide-react';
import { Paper, SearchState, AnalysisResult } from './types';
import { PaperCard } from './components/PaperCard';
import { AnalysisSection } from './components/AnalysisSection';
import { StatsChart } from './components/StatsChart';

const App: React.FC = () => {
  const [idea, setIdea] = useState('');
  const [papers, setPapers] = useState<Paper[]>([]);
  const [searchState, setSearchState] = useState<SearchState>({ status: 'idle' });
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  
  // Sorting and Filtering State
  const [sortBy, setSortBy] = useState<'score' | 'date' | 'relevance'>('score');
  const [minScore, setMinScore] = useState<number>(0);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idea.trim()) return;

    // Reset UI
    setPapers([]);
    setAnalysis(null);
    setSearchState({ status: 'generating_query', message: 'Starting research...' });
    // Reset filters on new search
    setSortBy('score');
    setMinScore(0);

    try {
      const response = await fetch('http://localhost:8000/api/research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idea: idea }),
      });

      if (!response.ok) {
        throw new Error(`后端错误: ${response.statusText}`);
      }

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep the last incomplete line in buffer

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);
            
            if (event.type === 'progress') {
               let status: SearchState['status'] = 'generating_query';
               if (event.step === 'analyzing') status = 'generating_query';
               else if (event.step === 'searching') status = 'fetching_papers';
               else if (event.step === 'reranking') status = 'analyzing';
               
               setSearchState({ status, message: event.message });
            } else if (event.type === 'result') {
               const data = event.data;
               const formattedPapers = data.papers.map((p: any) => ({
                id: p.url || p.entry_id,
                title: p.title,
                summary: p.summary,
                authors: p.authors || [],
                published: p.published || new Date().toISOString(),
                updated: p.updated || new Date().toISOString(),
                link: p.url || p.pdf_url,
                categories: p.categories || ['Research'],
                score: p.score,
                reason: p.reason
              }));

              setPapers(formattedPapers);
              
              const analysisData = typeof data.analysis === 'string' 
                ? JSON.parse(data.analysis) 
                : data.analysis;
                
              setAnalysis(analysisData);
              setSearchState({ status: 'success' });
            } else if (event.type === 'error') {
               throw new Error(event.message);
            }
          } catch (e) {
            console.error('Error parsing stream line:', line, e);
          }
        }
      }

    } catch (error) {
      console.error(error);
      setSearchState({ status: 'error', message: error instanceof Error ? error.message : 'An unexpected error occurred. Please check your API Key and connection.' });
    }
  };

  // Filter and Sort Logic
  const filteredPapers = useMemo(() => {
    let result = [...papers];

    // Filter by score
    if (minScore > 0) {
      result = result.filter(p => (p.score || 0) >= minScore);
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'score') {
        return (b.score || 0) - (a.score || 0);
      } else if (sortBy === 'date') {
        return new Date(b.published).getTime() - new Date(a.published).getTime();
      }
      return 0; // relevance is default order from backend
    });

    return result;
  }, [papers, sortBy, minScore]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary-600 p-1.5 rounded-lg">
              <BookOpen className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">ArxivMind</h1>
          </div>
          <div className="text-sm text-slate-500 hidden sm:block">
            Powered by Gemini 3.0 & Arxiv API
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Search Section */}
        <section className="mb-12 max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Explore Research with Ideas
          </h2>
          <p className="text-lg text-slate-600 mb-8">
            Describe your research idea in plain language. We'll find relevant papers and summarize the landscape for you.
          </p>

          <form onSubmit={handleSearch} className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
            </div>
            <input
              type="text"
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              disabled={searchState.status !== 'idle' && searchState.status !== 'success' && searchState.status !== 'error'}
              className="block w-full pl-11 pr-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm text-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
              placeholder="e.g. Agents using reinforcement learning for portfolio optimization..."
            />
            <button
              type="submit"
              disabled={!idea.trim() || (searchState.status !== 'idle' && searchState.status !== 'success' && searchState.status !== 'error')}
              className="absolute right-2 top-2 bottom-2 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-300 text-white font-medium px-6 rounded-xl transition-colors flex items-center gap-2"
            >
              {searchState.status !== 'idle' && searchState.status !== 'success' && searchState.status !== 'error' ? (
                <Loader2 className="animate-spin h-5 w-5" />
              ) : (
                <span>Research</span>
              )}
            </button>
          </form>

          {/* Status Messages */}
          {(searchState.status !== 'idle' && searchState.status !== 'success') && (
            <div className={`mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
              searchState.status === 'error' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-primary-700'
            }`}>
              {searchState.status === 'error' ? <AlertCircle size={16} /> : <Loader2 className="animate-spin" size={16} />}
              {searchState.message}
            </div>
          )}
        </section>

        {/* Results Section */}
        {papers.length > 0 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              {/* Analysis Column (Span 2) */}
              <div className="lg:col-span-2">
                 <AnalysisSection 
                    analysis={analysis} 
                    loading={searchState.status === 'analyzing'} 
                 />
              </div>
              
              {/* Stats Column (Span 1) */}
              <div className="lg:col-span-1 h-full min-h-[300px]">
                <StatsChart papers={papers} />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
              <h3 className="text-xl font-bold text-slate-800">
                Found {filteredPapers.length} Papers
              </h3>
              
              <div className="flex items-center gap-4">
                {/* Filter Control */}
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                  <Filter size={16} className="text-slate-500" />
                  <select 
                    value={minScore} 
                    onChange={(e) => setMinScore(Number(e.target.value))}
                    className="bg-transparent text-sm text-slate-700 focus:outline-none"
                  >
                    <option value={0}>All Scores</option>
                    <option value={5}>Score 5+</option>
                    <option value={7}>Score 7+</option>
                    <option value={8}>Score 8+</option>
                    <option value={9}>Score 9+</option>
                  </select>
                </div>

                {/* Sort Control */}
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                  <ArrowUpDown size={16} className="text-slate-500" />
                  <select 
                    value={sortBy} 
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-transparent text-sm text-slate-700 focus:outline-none"
                  >
                    <option value="score">Sort by Score</option>
                    <option value="relevance">Sort by Relevance</option>
                    <option value="date">Sort by Date</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPapers.map((paper) => (
                <PaperCard key={paper.id} paper={paper} />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
