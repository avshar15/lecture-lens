'use client';

import { useState } from 'react';

const LANGUAGES = [
  { code: 'English', label: '🇺🇸 English' },
  { code: 'Spanish', label: '🇪🇸 Spanish' },
  { code: 'French', label: '🇫🇷 French' },
  { code: 'German', label: '🇩🇪 German' },
  { code: 'Italian', label: '🇮🇹 Italian' },
  { code: 'Portuguese', label: '🇵🇹 Portuguese' },
  { code: 'Hindi', label: '🇮🇳 Hindi' },
  { code: 'Mandarin', label: '🇨🇳 Mandarin' },
  { code: 'Japanese', label: '🇯🇵 Japanese' },
  { code: 'Korean', label: '🇰🇷 Korean' },
  { code: 'Arabic', label: '🇸🇦 Arabic' },
  { code: 'Russian', label: '🇷🇺 Russian' },
];

const TAB_LABELS: Record<string, string> = {
  outline: '📋 Outline',
  summary: '📝 Summary',
  flashcards: '🃏 Flashcards',
  search: '🔍 Ask',
  audit: '🔬 Faculty Audit',
};

const serif = { fontFamily: 'Georgia, serif' } as const;

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('outline');
  const [activeSummaryTab, setActiveSummaryTab] = useState<'gist' | 'guide' | 'notes'>('gist');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [translating, setTranslating] = useState(false);
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());
  const [mode, setMode] = useState<'student' | 'faculty'>('student');
  const [objectives, setObjectives] = useState('');
  const [shuffled, setShuffled] = useState(false);
  const [cardStatus, setCardStatus] = useState<{ [key: number]: string }>({});

  const handleAnalyze = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    setSelectedLanguage('');
    setSearchResults([]);
    setCardStatus({});
    setFlippedCards(new Set());
    setActiveTab('outline');
    setCurrentStep(1);

    try {
      setTimeout(() => setCurrentStep(2), 3000);
      setTimeout(() => setCurrentStep(3), 8000);

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, mode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      setResult(data);
      setCurrentStep(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setCurrentStep(0);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || !result?.chunks) return;
    setSearching(true);
    setSearchResults([]);
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery, chunks: result.chunks }),
      });
      const data = await response.json();
      if (data.success) setSearchResults(data as any);
    } catch {
      console.error('Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleTranslate = async (language: string) => {
    if (!result || !language) return;
    if (language === selectedLanguage) return;
    if (language === 'English' && !selectedLanguage) return;

    if (language === 'English') {
      setResult((prev: any) => ({
        ...prev,
        analysis: {
          ...prev.analysis,
          outline: prev.originalAnalysis?.outline || prev.analysis.outline,
          flashcards: prev.originalAnalysis?.flashcards || prev.analysis.flashcards,
          summaryShort: prev.originalAnalysis?.summaryShort || prev.analysis.summaryShort,
          summaryMedium: prev.originalAnalysis?.summaryMedium || prev.analysis.summaryMedium,
          summaryFull: prev.originalAnalysis?.summaryFull || prev.analysis.summaryFull,
        },
      }));
      setSelectedLanguage('');
      return;
    }

    setTranslating(true);
    setSelectedLanguage(language);
    try {
      const sourceContent = result.originalAnalysis || result.analysis;
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: {
            outline: sourceContent.outline,
            flashcards: sourceContent.flashcards,
            summaryShort: sourceContent.summaryShort,
            summaryMedium: sourceContent.summaryMedium,
            summaryFull: sourceContent.summaryFull,
          },
          targetLanguage: language,
        }),
      });
      const data = await response.json();
      if (data.success) {
        if (!result.originalAnalysis) {
          setResult((prev: any) => ({
            ...prev,
            originalAnalysis: {
              outline: prev.analysis.outline,
              flashcards: prev.analysis.flashcards,
              summaryShort: prev.analysis.summaryShort,
              summaryMedium: prev.analysis.summaryMedium,
              summaryFull: prev.analysis.summaryFull,
            },
            analysis: { ...prev.analysis, ...data.translated },
          }));
        } else {
          setResult((prev: any) => ({
            ...prev,
            analysis: { ...prev.analysis, ...data.translated },
          }));
        }
      }
    } catch {
      console.error('Translation failed');
    } finally {
      setTranslating(false);
    }
  };

  const getYouTubeTimestampUrl = (videoId: string, timestamp: number) => {
    return `https://www.youtube.com/watch?v=${videoId}&t=${Math.floor(timestamp)}s`;
  };

  const toggleCard = (index: number) => {
    setFlippedCards(prev => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  };

  const loadingMessage =
    currentStep === 1
      ? '☕ Reading through your lecture...'
      : currentStep === 2
        ? '✨ Building your study guide...'
        : '🎯 Almost ready for you...';

  const progressWidth = currentStep === 1 ? '30%' : currentStep === 2 ? '65%' : '90%';

  return (
    <main
      className="min-h-screen text-[#2d2520]"
      style={{
        fontFamily: '-apple-system, system-ui, sans-serif',
        backgroundColor: '#faf7f2',
      }}
    >
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Header */}
      <div className="border-b border-[#e8e0d5] bg-white px-6 py-6">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-4xl font-bold text-[#2d2520]" style={serif}>
            lecturelens ☕
          </h1>
          <p className="text-sm text-[#8a7968] mt-1">your AI study companion</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Hero — no result, not loading */}
        {!result && !loading && (
          <div className="text-center pt-20 pb-16" style={{ animation: 'fadeIn 0.6s ease-out' }}>
            <div className="flex justify-center" style={{ animation: 'float 3s ease-in-out infinite' }}>
              <svg width="140" height="90" viewBox="0 0 140 90" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="10" y="40" width="50" height="35" rx="3" fill="#eef3f0" stroke="#5c7a6b" strokeWidth="2" />
                <rect x="60" y="40" width="50" height="35" rx="3" fill="#eef3f0" stroke="#5c7a6b" strokeWidth="2" />
                <line x1="60" y1="40" x2="60" y2="75" stroke="#5c7a6b" strokeWidth="2" />
                <path d="M10 40 Q35 30 60 40" stroke="#5c7a6b" strokeWidth="2" fill="none" />
                <path d="M60 40 Q85 30 110 40" stroke="#5c7a6b" strokeWidth="2" fill="none" />
                <rect x="95" y="55" width="28" height="20" rx="4" fill="#fdf0eb" stroke="#c4795a" strokeWidth="1.5" />
                <path d="M99 55 Q103 48 107 55" stroke="#c4795a" strokeWidth="1.5" fill="none" />
                <path d="M104 55 Q108 46 112 55" stroke="#c4795a" strokeWidth="1.5" fill="none" />
                <rect x="93" y="73" width="32" height="4" rx="2" fill="#c4795a" />
              </svg>
            </div>
            {mode === 'student' ? (
              <>
                <h2 className="text-4xl font-bold text-[#2d2520] mt-6 text-center" style={serif}>
                  Turn any lecture into your study guide ☕
                </h2>
                <p className="text-lg text-[#8a7968] mt-3 max-w-xl mx-auto text-center">
                  Drop in any YouTube lecture. Walk away with a full outline, summaries at every depth, flashcards, and
                  instant answers to any question in multiple languages. Every timestamp takes you directly to that moment
                  in the video.
                </p>
                <div className="flex flex-wrap justify-center gap-3 mt-6">
                  <span className="px-4 py-2 rounded-full text-sm font-medium bg-[#eef3f0] text-[#5c7a6b]">
                    📋 Smart Outline
                  </span>
                  <span className="px-4 py-2 rounded-full text-sm font-medium bg-[#fdf0eb] text-[#c4795a]">
                    🃏 Flashcards
                  </span>
                  <span className="px-4 py-2 rounded-full text-sm font-medium bg-[#f5f0eb] text-[#8a7968]">
                    🔍 Ask Anything
                  </span>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-4xl font-bold text-[#2d2520] mt-6 text-center" style={serif}>
                  Get private feedback on your lecture
                </h2>
                <p className="text-lg text-[#8a7968] mt-3 max-w-xl mx-auto text-center">
                  Paste your lecture URL. Get a private pedagogical audit, for your eyes only.
                </p>
              </>
            )}
            <div className="mt-10 max-w-2xl mx-auto">
              <input
                type="text"
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
                placeholder="Paste a YouTube lecture URL..."
                className="w-full rounded-2xl border border-[#e8e0d5] bg-white px-5 py-4 text-[#2d2520] placeholder:text-[#b5a898] focus:outline-none focus:ring-2 focus:ring-[#5c7a6b] focus:ring-offset-2 focus:ring-offset-[#faf7f2] transition-colors"
              />
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={loading || !url.trim()}
                className="mt-3 block w-full max-w-2xl mx-auto rounded-2xl bg-[#5c7a6b] px-8 py-4 font-medium text-white transition-colors hover:bg-[#4a6b5a] disabled:bg-[#e8e0d5] disabled:text-[#b5a898]"
              >
                {loading ? 'Analyzing...' : 'Analyze'}
              </button>
            </div>
          </div>
        )}

        {/* URL row when loading or already have result (compact) */}
        {(loading || result) && (
          <div className="flex gap-3 mb-8 max-w-2xl mx-auto">
            <input
              type="text"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
              placeholder="Paste a YouTube lecture URL..."
              className="flex-1 rounded-2xl border border-[#e8e0d5] bg-white px-5 py-3 text-[#2d2520] placeholder:text-[#b5a898] focus:outline-none focus:ring-2 focus:ring-[#5c7a6b] focus:ring-offset-2 focus:ring-offset-[#faf7f2]"
            />
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={loading || !url.trim()}
              className="shrink-0 rounded-2xl bg-[#5c7a6b] px-6 py-3 font-medium text-white transition-colors hover:bg-[#4a6b5a] disabled:bg-[#e8e0d5] disabled:text-[#b5a898]"
            >
              {loading ? 'Analyzing...' : 'Analyze'}
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-2xl border border-[#e8a598] bg-[#fdf0f0] p-4 mb-6 text-sm text-[#c4795a]">
            ⚠️ {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="mx-auto mt-12 max-w-md rounded-2xl border border-[#e8e0d5] bg-white p-10 text-center shadow-sm">
            <div
              className="mx-auto rounded-full border-[3px] border-[#e8e0d5] border-t-[#5c7a6b]"
              style={{
                width: 44,
                height: 44,
                animation: 'spin 1s linear infinite',
              }}
            />
            <p className="mt-4 text-base text-[#8a7968]">{loadingMessage}</p>
            <div className="mt-6 h-2 w-full rounded-full bg-[#e8e0d5]">
              <div
                className="h-2 rounded-full bg-[#5c7a6b] transition-all duration-500"
                style={{ width: progressWidth }}
              />
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div>
            {/* Results header */}
            <div className="mb-6 flex items-center gap-4 rounded-2xl border border-[#e8e0d5] bg-white p-4 shadow-sm">
              <img
                src={`https://img.youtube.com/vi/${result.metadata.videoId}/mqdefault.jpg`}
                alt="video thumbnail"
                className="h-auto w-28 rounded-xl object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-[#b5a898]">{url}</p>
                <button
                  type="button"
                  onClick={() => {
                    setResult(null);
                    setUrl('');
                    setSearchResults([]);
                    setSelectedLanguage('');
                    setCardStatus({});
                    setFlippedCards(new Set());
                    setActiveTab('outline');
                  }}
                  className="mt-2 rounded-xl bg-[#f0ebe4] px-3 py-1.5 text-xs text-[#8a7968] transition-colors hover:bg-[#e8e0d5]"
                >
                  ← Try another lecture
                </button>
              </div>
            </div>

            {/* Language Toggle */}
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <span className="text-sm text-[#8a7968]">🌍</span>
              {LANGUAGES.map(lang => (
                <button
                  type="button"
                  key={lang.code}
                  onClick={() => handleTranslate(lang.code)}
                  disabled={translating}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                    (lang.code === 'English' && !selectedLanguage) || selectedLanguage === lang.code
                      ? 'bg-[#5c7a6b] text-white'
                      : 'bg-[#f0ebe4] text-[#8a7968] hover:bg-[#e8e0d5]'
                  }`}
                >
                  {translating && selectedLanguage === lang.code ? '⏳ Translating...' : lang.label}
                </button>
              ))}
            </div>

            {/* Tabs */}
            <div className="mb-6 flex gap-6 border-b border-[#e8e0d5] bg-white px-2">
              {['outline', 'summary', 'flashcards', 'search', ...(mode === 'faculty' ? ['audit'] : [])].map(
                tab => (
                  <button
                    type="button"
                    key={tab}
                    onClick={() => {
                      setActiveTab(tab);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`cursor-pointer border-b-2 py-3 text-sm font-medium transition-all ${
                      activeTab === tab
                        ? 'border-[#5c7a6b] text-[#2d2520]'
                        : 'border-transparent text-[#8a7968] hover:text-[#2d2520]'
                    }`}
                  >
                    {TAB_LABELS[tab] ?? tab}
                  </button>
                )
              )}
            </div>

            {/* Outline Tab */}
            {activeTab === 'outline' && (
              <div className="space-y-3">
                {result.analysis.outline.map((item: any, i: number) => (
                  <div
                    key={i}
                    className="mb-3 rounded-xl border border-[#e8e0d5] border-l-4 border-l-[#5c7a6b] bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <h3 className="mb-1 font-semibold text-[#2d2520]" style={serif}>
                          {item.title}
                        </h3>
                        <p className="text-sm leading-relaxed text-[#8a7968]">{item.summary}</p>
                        <p className="mt-2 text-xs text-[#b5a898]">Click the timestamp to jump to this moment →</p>
                      </div>
                      <a
                        href={getYouTubeTimestampUrl(result.metadata.videoId, item.timestamp)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 rounded-full bg-[#fdf0eb] px-3 py-1 font-mono text-xs text-[#c4795a] transition-colors hover:bg-[#c4795a] hover:text-white"
                      >
                        ▶ {item.timestampFormatted}
                        {item.endTimestampFormatted ? ` — ${item.endTimestampFormatted}` : ''}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Summary Tab */}
            {activeTab === 'summary' && (
              <div>
                <div className="mb-6 flex gap-6 border-b border-[#e8e0d5]">
                  {(
                    [
                      { id: 'gist' as const, title: 'The Gist ☕', sub: '~90 sec' },
                      { id: 'guide' as const, title: 'Study Guide 📖', sub: '~5 min' },
                      { id: 'notes' as const, title: 'Deep Notes 🗒️', sub: 'comprehensive' },
                    ] as const
                  ).map(({ id, title, sub }) => (
                    <button
                      type="button"
                      key={id}
                      onClick={() => setActiveSummaryTab(id)}
                      className={`cursor-pointer pb-3 text-left transition-all ${
                        activeSummaryTab === id
                          ? 'border-b-2 border-[#5c7a6b] font-semibold text-[#2d2520]'
                          : 'border-b-2 border-transparent text-[#8a7968] hover:text-[#2d2520]'
                      }`}
                    >
                      <span className="block">{title}</span>
                      <span className="mt-0.5 block text-xs font-normal text-[#b5a898]">{sub}</span>
                    </button>
                  ))}
                </div>
                <div className="rounded-2xl border border-[#e8e0d5] bg-white p-6 shadow-sm">
                  {activeSummaryTab === 'gist' && (
                    <p className="leading-relaxed text-[#2d2520]">{result.analysis.summaryShort}</p>
                  )}
                  {activeSummaryTab === 'guide' && (
                    <div className="leading-relaxed text-[#2d2520] space-y-3">
                      {result.analysis.summaryMedium.split('\n').map((line: string, idx: number) => {
                        if (line.startsWith('## '))
                          return (
                            <h2 key={idx} className="text-lg font-bold text-[#5c7a6b] mt-4 mb-2" style={serif}>
                              {line.replace('## ', '')}
                            </h2>
                          );
                        if (line.startsWith('### '))
                          return (
                            <h3 key={idx} className="font-semibold text-[#5c7a6b] mt-3 mb-1" style={serif}>
                              {line.replace('### ', '')}
                            </h3>
                          );
                        if (line.startsWith('**') && line.endsWith('**'))
                          return (
                            <p key={idx} className="font-semibold text-[#2d2520]">
                              {line.replace(/\*\*/g, '')}
                            </p>
                          );
                        if (line.includes('**')) {
                          const parts = line.split(/\*\*(.*?)\*\*/g);
                          return (
                            <p key={idx} className="text-[#2d2520]">
                              {parts.map((part, i) =>
                                i % 2 === 1 ? <strong key={i}>{part}</strong> : part
                              )}
                            </p>
                          );
                        }
                        if (line.startsWith('MOST IMPORTANT MOMENT:')) {
                          const timestampMatch = line.match(/(\d+:\d+)/);
                          const text = line.replace('MOST IMPORTANT MOMENT:', '').trim();
                          return (
                            <div key={idx} className="mt-6 rounded-xl bg-[#fdf0eb] border border-[#c4795a] p-4">
                              <p className="text-xs font-medium text-[#c4795a] mb-1">⭐ MOST IMPORTANT MOMENT</p>
                              <p className="text-[#2d2520] text-sm">{text.replace(/\d+:\d+\s*—\s*/, '')}</p>
                              {timestampMatch && (
                                <a
                                  href={getYouTubeTimestampUrl(result.metadata.videoId, (() => {
                                    const [m, s] = timestampMatch[1].split(':').map(Number);
                                    return m * 60 + s;
                                  })())}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-block mt-2 rounded-full bg-[#c4795a] px-3 py-1 text-xs font-mono text-white hover:bg-[#b56b4e]"
                                >
                                  ▶ Watch at {timestampMatch[1]}
                                </a>
                              )}
                            </div>
                          );
                        }
                        if (line.trim() === '') return <div key={idx} className="mb-1" />;
                        return <p key={idx} className="text-[#2d2520]">{line}</p>;
                      })}
                    </div>
                  )}
                  {activeSummaryTab === 'notes' && (
                    <div className="max-w-none leading-relaxed">
                      {result.analysis.summaryFull.split('\n').map((line: string, idx: number) => {
                        if (line.startsWith('## '))
                          return (
                            <h2 key={idx} className="mb-2 mt-6 text-lg font-bold text-[#5c7a6b]" style={serif}>
                              {line.replace('## ', '')}
                            </h2>
                          );
                        if (line.startsWith('### '))
                          return (
                            <h3 key={idx} className="mb-1 mt-4 font-semibold text-[#5c7a6b]" style={serif}>
                              {line.replace('### ', '')}
                            </h3>
                          );
                        if (line.startsWith('• ') || line.startsWith('- '))
                          return (
                            <li key={idx} className="mb-1 ml-4 text-[#2d2520]">
                              {line.replace('• ', '').replace('- ', '')}
                            </li>
                          );
                        if (line.startsWith('**') && line.endsWith('**'))
                          return (
                            <p key={idx} className="mb-1 mt-3 font-semibold text-[#2d2520]">
                              {line.replace(/\*\*/g, '')}
                            </p>
                          );
                        if (line.trim() === '') return <div key={idx} className="mb-2" />;
                        return (
                          <p key={idx} className="mb-2 text-[#2d2520]">
                            {line}
                          </p>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Flashcards Tab */}
            {activeTab === 'flashcards' && (
              <div>
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-[#8a7968]">
                      {Object.values(cardStatus).filter(s => s === 'got-it').length} /{' '}
                      {result.analysis.flashcards.filter((c: any) => c.question && c.answer).length} concepts covered
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setFlippedCards(new Set());
                        setCardStatus({});
                      }}
                      className="text-xs text-[#b5a898] underline transition-colors hover:text-[#8a7968]"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                {(() => {
                  const validCards = result.analysis.flashcards.filter((c: any) => c.question && c.answer);
                  const masteredCount = Object.values(cardStatus).filter(s => s === 'got-it').length;

                  if (masteredCount === validCards.length && validCards.length > 0) {
                    const reviewCards = validCards.filter((_: any, i: number) => (cardStatus as any)[i] === 'review');
                    return (
                      <div className="py-12 text-center">
                        <p className="mb-4 text-5xl">☕</p>
                        <h3 className="mb-2 text-xl font-bold text-[#2d2520]" style={serif}>
                          You&apos;ve covered all {validCards.length} concepts
                        </h3>
                        {reviewCards.length > 0 && (
                          <div className="mx-auto mt-6 max-w-md text-left">
                            <p className="mb-3 text-sm text-[#8a7968]">
                              Still working on {reviewCards.length} concepts:
                            </p>
                            {reviewCards.map((card: any, i: number) => (
                              <div key={i} className="mb-2 rounded-lg border border-[#e8e0d5] bg-white p-3">
                                <p className="text-sm font-medium text-[#2d2520]">{card.question}</p>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => {
                                const reviewOnly: any = {};
                                validCards.forEach((_: any, i: number) => {
                                  if ((cardStatus as any)[i] === 'review') reviewOnly[i] = 'flipped';
                                });
                                setCardStatus(reviewOnly);
                                setFlippedCards(new Set());
                              }}
                              className="mt-4 w-full rounded-2xl bg-[#5c7a6b] py-2 px-6 text-sm font-medium text-white transition-colors hover:bg-[#4a6b5a]"
                            >
                              Review weak spots
                            </button>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setCardStatus({});
                            setFlippedCards(new Set());
                          }}
                          className="mt-4 rounded-2xl bg-[#f0ebe4] py-2 px-6 text-sm font-medium text-[#8a7968] transition-colors hover:bg-[#e8e0d5]"
                        >
                          Start over
                        </button>
                      </div>
                    );
                  }

                  const sections: { [key: string]: any[] } = {};
                  const orderedSections: string[] = [];

                  const cardsWithIndex = validCards.map((c: any, originalIndex: number) => ({
                    ...c,
                    originalIndex,
                  }));
                  const displayCards = shuffled
                    ? [...cardsWithIndex].sort(() => Math.random() - 0.5)
                    : cardsWithIndex;

                  displayCards.forEach((card: any) => {
                    const section = card.sectionTitle || 'General';
                    if (!sections[section]) {
                      sections[section] = [];
                      orderedSections.push(section);
                    }
                    sections[section].push(card);
                  });

                  return (
                    <div className="space-y-8">
                      {orderedSections.map(sectionTitle => {
                        const sectionCards = sections[sectionTitle];
                        const outlineItem = result.analysis.outline.find((o: any) => o.title === sectionTitle);
                        const sectionMastered = sectionCards.filter(
                          (c: any) => (cardStatus as any)[c.originalIndex] === 'got-it'
                        ).length;

                        return (
                          <div key={sectionTitle}>
                            <div className="mb-3 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="text-lg">📚</span>
                                <span className="text-sm font-semibold text-[#c4795a]" style={serif}>
                                  {sectionTitle}
                                </span>
                                {outlineItem && (
                                  <span className="font-mono text-xs text-[#b5a898]">
                                    {outlineItem.timestampFormatted} — {outlineItem.endTimestampFormatted}
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-[#b5a898]">
                                {sectionMastered}/{sectionCards.length} mastered
                              </span>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                              {sectionCards.map((card: any) => {
                                const idx = card.originalIndex;
                                const status = (cardStatus as any)[idx];
                                const isFlipped = status === 'flipped' || status === 'got-it' || status === 'review';
                                const isMastered = status === 'got-it';

                                return (
                                  <div
                                    key={idx}
                                    className={`rounded-2xl border shadow-sm transition-all ${
                                      isMastered
                                        ? 'border-[#5c7a6b] bg-[#f0f7f4] opacity-70'
                                        : 'border-[#e8e0d5] bg-white'
                                    }`}
                                    style={{ perspective: '1000px' }}
                                  >
                                    <div
                                      role="presentation"
                                      onClick={() => {
                                        if (isMastered) return;
                                        if (isFlipped) {
                                          setCardStatus((prev: any) => {
                                            const next = { ...prev };
                                            delete next[idx];
                                            return next;
                                          });
                                        } else {
                                          setCardStatus((prev: any) => ({ ...prev, [idx]: 'flipped' }));
                                        }
                                      }}
                                      className={isMastered ? '' : 'cursor-pointer'}
                                      style={{
                                        transition: 'transform 0.5s',
                                        transformStyle: 'preserve-3d',
                                        transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                                        position: 'relative',
                                        minHeight: '220px',
                                      }}
                                    >
                                      <div
                                        className="rounded-2xl"
                                        style={{
                                          backfaceVisibility: 'hidden',
                                          WebkitBackfaceVisibility: 'hidden',
                                          position: 'absolute',
                                          width: '100%',
                                          padding: '20px',
                                        }}
                                      >
                                        <p className="mb-2 text-xs font-medium text-[#c4795a]">QUESTION</p>
                                        <p className="font-medium text-[#2d2520]">{card.question}</p>
                                        {isMastered ? (
                                          <button
                                            type="button"
                                            onClick={e => {
                                              e.stopPropagation();
                                              setCardStatus((prev: any) => {
                                                const next = { ...prev };
                                                delete next[idx];
                                                return next;
                                              });
                                            }}
                                            className="mt-3 rounded-full bg-[#fdf0eb] px-4 py-1 text-xs font-medium text-[#c4795a] transition-colors hover:bg-[#c4795a] hover:text-white"
                                          >
                                            🔄 Review again
                                          </button>
                                        ) : (
                                          <p className="mt-3 text-xs text-[#b5a898]">Click to reveal</p>
                                        )}
                                      </div>
                                      <div
                                        className="rounded-2xl"
                                        style={{
                                          backfaceVisibility: 'hidden',
                                          WebkitBackfaceVisibility: 'hidden',
                                          position: 'absolute',
                                          width: '100%',
                                          padding: '20px',
                                          transform: 'rotateY(180deg)',
                                        }}
                                      >
                                        <p className="mb-2 text-xs font-medium text-[#5c7a6b]">ANSWER</p>
                                        <p className="text-sm text-[#2d2520]">{card.answer}</p>
                                        <a
                                          href={getYouTubeTimestampUrl(result.metadata.videoId, card.timestamp)}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={e => e.stopPropagation()}
                                          className="mt-3 inline-block rounded-full bg-[#fdf0eb] px-2 py-1 font-mono text-xs text-[#c4795a]"
                                        >
                                          ▶ {card.timestampFormatted}
                                        </a>
                                        {!isMastered && (
                                          <div className="mt-3">
                                            <button
                                              type="button"
                                              onClick={e => {
                                                e.stopPropagation();
                                                setCardStatus((prev: any) => {
                                                  const next = { ...prev };
                                                  delete next[idx];
                                                  return next;
                                                });
                                                setTimeout(() => {
                                                  setCardStatus((prev: any) => ({ ...prev, [idx]: 'got-it' }));
                                                }, 10);
                                              }}
                                              className="rounded-full bg-[#5c7a6b] px-3 py-0.5 text-xs font-medium text-white transition-colors hover:bg-[#4a6b5a] inline-block"
                                            >
                                              ✅ Got it
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Search Tab */}
            {activeTab === 'search' && (
              <div>
                {!searching && (!searchResults || !(searchResults as any).answer) && (
                  <div className="py-16 text-center">
                    <p className="mb-4 text-4xl">🔍</p>
                    <h3 className="mb-2 text-lg font-semibold text-[#2d2520]" style={serif}>
                      Ask anything about this lecture
                    </h3>
                    <p className="text-sm text-[#b5a898]">
                      Try: What is the main concept? or Explain what was said about X
                    </p>
                  </div>
                )}
                <div className="mb-6 flex gap-3">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    placeholder="Ask anything about this lecture..."
                    className="w-full flex-1 rounded-2xl border border-[#e8e0d5] bg-white px-5 py-3 text-[#2d2520] placeholder:text-[#b5a898] focus:outline-none focus:ring-2 focus:ring-[#5c7a6b] focus:ring-offset-2 focus:ring-offset-[#faf7f2]"
                  />
                  <button
                    type="button"
                    onClick={handleSearch}
                    disabled={searching || !searchQuery.trim()}
                    className="shrink-0 rounded-2xl bg-[#5c7a6b] px-6 py-3 font-medium text-white transition-colors hover:bg-[#4a6b5a] disabled:bg-[#e8e0d5] disabled:text-[#b5a898]"
                  >
                    {searching ? 'Searching...' : 'Ask ✨'}
                  </button>
                </div>
                {searching && (
                  <div className="animate-pulse rounded-2xl border border-[#e8e0d5] bg-white p-6">
                    <p className="text-sm text-[#b5a898]">☕ Finding the answer...</p>
                  </div>
                )}
                {!searching && searchResults && (searchResults as any).answer && (
                  <div className="space-y-4">
                    <div className="rounded-2xl border-l-4 border-l-[#5c7a6b] bg-white p-5 shadow-sm">
                      <p className="mb-2 text-xs font-medium text-[#5c7a6b]">ANSWER</p>
                      <p className="mb-4 leading-relaxed text-[#2d2520]">{(searchResults as any).answer}</p>
                      {((searchResults as any).sources || [])[0] && (
                        <a
                          href={getYouTubeTimestampUrl(
                            result.metadata.videoId,
                            ((searchResults as any).sources || [])[0].timestamp
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-xl bg-[#c4795a] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#b56b4e]"
                        >
                          ▶ Watch at {((searchResults as any).sources || [])[0].timestampFormatted}
                        </a>
                      )}
                    </div>
                    {((searchResults as any).sources || []).length > 1 && (
                      <div>
                        <p className="mb-2 text-xs font-medium text-[#b5a898]">OTHER RELEVANT MOMENTS</p>
                        <div className="space-y-2">
                          {((searchResults as any).sources || []).slice(1).map((r: any, i: number) => (
                            <div
                              key={i}
                              className="flex justify-between gap-4 rounded-xl border border-[#e8e0d5] bg-[#faf7f2] p-4"
                            >
                              <p className="line-clamp-2 flex-1 text-sm text-[#8a7968]">{r.text}</p>
                              <a
                                href={getYouTubeTimestampUrl(result.metadata.videoId, r.timestamp)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="shrink-0 rounded-lg bg-[#fdf0eb] px-2 py-1 font-mono text-xs text-[#c4795a]"
                              >
                                ▶ {r.timestampFormatted}
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Faculty Audit Tab */}
            {activeTab === 'audit' && result.audit && (
              <div className="space-y-6">
                <div className="rounded-2xl border-l-4 border-l-[#c4795a] bg-[#fdf0eb] p-6">
                  <p className="mb-2 text-xs font-medium text-[#c4795a]">TOP PRIORITY FIX</p>
                  <p className="text-lg font-medium text-[#2d2520]" style={serif}>
                    {result.audit.topPriorityFix}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {[
                    { label: 'Pedagogy', key: 'pedagogicalScore' },
                    { label: 'Accessibility', key: 'accessibilityScore' },
                    { label: 'Clarity', key: 'clarityScore' },
                    { label: 'Equity', key: 'equityScore' },
                  ].map(({ label, key }) => (
                    <div key={key} className="rounded-2xl border border-[#e8e0d5] bg-white p-4 text-center shadow-sm">
                      <p className="text-3xl font-bold text-[#5c7a6b]">{result.audit[key]}</p>
                      <p className="mt-1 text-xs text-[#8a7968]">{label}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  {result.audit.findings?.map((finding: any, i: number) => (
                    <div
                      key={i}
                      className="mb-3 rounded-2xl border-l-4 border-l-[#e8a598] bg-white p-4 shadow-sm"
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <span className="rounded-lg bg-[#fdf0eb] px-2 py-0.5 text-xs text-[#c4795a]">
                          {finding.category}
                        </span>
                        <a
                          href={getYouTubeTimestampUrl(result.metadata.videoId, finding.timestamp)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg bg-[#fdf0eb] px-2 py-0.5 font-mono text-xs text-[#c4795a] transition-colors hover:bg-[#c4795a] hover:text-white"
                        >
                          ▶ {finding.timestampFormatted}
                        </a>
                      </div>
                      <p className="mb-2 text-sm text-[#8a7968]">{finding.issue}</p>
                      <p className="text-sm text-[#5c7a6b]">💡 {finding.suggestedRewrite}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
