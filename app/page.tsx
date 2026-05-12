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

const AGENT_STEPS = [
  { id: 1, label: 'Ingestion Agent', description: 'Extracting & chunking transcript' },
  { id: 2, label: 'Analysis Agent', description: 'Building outline, summaries & flashcards' },
  { id: 3, label: 'Search Agent', description: 'Indexing transcript for semantic search' },
];

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('outline');
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

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              <span className="text-blue-400">lecture</span>lens
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">AI-powered lecture intelligence</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setMode('student')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                mode === 'student'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              🎓 Student
            </button>
            <button
              onClick={() => setMode('faculty')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                mode === 'faculty'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              🔍 Faculty
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Hero */}
        {!result && !loading && (
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">
              {mode === 'student'
                ? 'Turn any lecture into a study environment'
                : 'Get private feedback on your lecture'}
            </h2>
            <p className="text-gray-400 text-lg">
              {mode === 'student'
                ? 'Paste a YouTube lecture URL. Get outlines, summaries, flashcards, and more.'
                : 'Paste your lecture URL. Get a private pedagogical audit — for your eyes only.'}
            </p>
          </div>
        )}

        {/* URL Input */}
        {result && (
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-400 truncate flex-1 mr-4">
              Analyzing: <span className="text-white font-mono text-xs">{url}</span>
            </p>
            <button
              onClick={() => {
                setResult(null);
                setUrl('');
                setSearchResults([]);
                setSelectedLanguage('');
                setCardStatus({});
                setFlippedCards(new Set());
                setActiveTab('outline');
              }}
              className="shrink-0 text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg transition-all"
            >
              ← Analyze another lecture
            </button>
          </div>
        )}
        <div className="flex gap-3 mb-8">
          <input
            type="text"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
            placeholder="Paste a YouTube lecture URL..."
            className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
          <button
            onClick={handleAnalyze}
            disabled={loading || !url.trim()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-xl font-medium transition-all"
          >
            {loading ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 mb-8 text-red-300">
            ⚠️ {error}
          </div>
        )}

        {/* Loading - Named Agent Steps */}
        {loading && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 mb-8">
            <p className="text-sm text-gray-400 mb-6 text-center">Multi-agent pipeline running...</p>
            <div className="space-y-4">
              {AGENT_STEPS.map(step => (
                <div key={step.id} className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    currentStep > step.id
                      ? 'bg-green-600 text-white'
                      : currentStep === step.id
                      ? 'bg-blue-600 text-white animate-pulse'
                      : 'bg-gray-800 text-gray-500'
                  }`}>
                    {currentStep > step.id ? '✓' : step.id}
                  </div>
                  <div>
                    <p className={`font-medium text-sm ${
                      currentStep >= step.id ? 'text-white' : 'text-gray-500'
                    }`}>
                      {step.label}
                    </p>
                    <p className="text-xs text-gray-500">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div>
            {/* Language Toggle */}
            <div className="flex items-center gap-2 mb-6 flex-wrap">
              <span className="text-sm text-gray-400">Language:</span>
              {LANGUAGES.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => handleTranslate(lang.code)}
                  disabled={translating}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    (lang.code === 'English' && !selectedLanguage) || selectedLanguage === lang.code
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {translating && selectedLanguage === lang.code ? '...' : lang.label}
                </button>
              ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-gray-900 p-1 rounded-xl w-fit">
              {['outline', 'summary', 'flashcards', 'search',
                ...(mode === 'faculty' ? ['audit'] : [])
              ].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                    activeTab === tab
                      ? 'bg-gray-700 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Outline Tab */}
            {activeTab === 'outline' && (
              <div className="space-y-3">
                {result.analysis.outline.map((item: any, i: number) => (
                  <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-600 transition-all">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-white mb-1">{item.title}</h3>
                        <p className="text-gray-400 text-sm">{item.summary}</p>
                      </div>
                      <a
                        href={getYouTubeTimestampUrl(result.metadata.videoId, item.timestamp)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 bg-gray-800 hover:bg-blue-600 text-gray-300 hover:text-white px-3 py-1.5 rounded-lg text-xs font-mono transition-all"
                      >
                        ▶ {item.timestampFormatted}{item.endTimestampFormatted ? ` — ${item.endTimestampFormatted}` : ''}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Summary Tab */}
            {activeTab === 'summary' && (
              <div className="space-y-6">
                {[
                  { label: 'The Gist', subtitle: '~90 seconds', key: 'summaryShort', color: 'blue' },
                  { label: 'Study Guide', subtitle: '~5 minutes', key: 'summaryMedium', color: 'purple' },
                  { label: 'Deep Notes', subtitle: 'comprehensive', key: 'deepNotes', color: 'green' },
                ].map(({ label, subtitle, key, color }) => (
                  <div key={key} className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium bg-${color}-900/50 text-${color}-300 border border-${color}-800`}>
                        {label}
                      </div>
                      <span className="text-xs text-gray-500">{subtitle}</span>
                    </div>
                    {key === 'deepNotes' ? (
                      <div className="text-gray-300 leading-relaxed prose prose-invert max-w-none">
                        {result.analysis.summaryFull.split('\n').map((line: string, idx: number) => {
                          if (line.startsWith('## ')) return <h2 key={idx} className="text-white font-bold text-lg mt-6 mb-2">{line.replace('## ', '')}</h2>;
                          if (line.startsWith('### ')) return <h3 key={idx} className="text-white font-semibold mt-4 mb-1">{line.replace('### ', '')}</h3>;
                          if (line.startsWith('• ') || line.startsWith('- ')) return <li key={idx} className="text-gray-300 ml-4 mb-1">{line.replace('• ', '').replace('- ', '')}</li>;
                          if (line.startsWith('**') && line.endsWith('**')) return <p key={idx} className="text-white font-semibold mt-3 mb-1">{line.replace(/\*\*/g, '')}</p>;
                          if (line.trim() === '') return <div key={idx} className="mb-2" />;
                          return <p key={idx} className="text-gray-300 mb-2">{line}</p>;
                        })}
                      </div>
                    ) : (
                      <p className="text-gray-300 leading-relaxed">{result.analysis[key === 'deepNotes' ? 'summaryFull' : key]}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Flashcards Tab */}
            {activeTab === 'flashcards' && (
              <div>
                {/* Progress Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-400">
                      {Object.values(cardStatus).filter(s => s === 'got-it').length} /{' '}
                      {result.analysis.flashcards.filter((c: any) => c.question && c.answer).length} concepts covered
                    </span>
                    <button
                      type="button"
                      onClick={() => { setFlippedCards(new Set()); setCardStatus({}); }}
                      className="text-xs text-gray-500 hover:text-gray-300 underline transition-all"
                    >
                      Reset
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShuffled(!shuffled)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                      shuffled ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    🔀 Shuffle {shuffled ? 'On' : 'Off'}
                  </button>
                </div>

                {/* Cards grouped by section */}
                {(() => {
                  const validCards = result.analysis.flashcards.filter((c: any) => c.question && c.answer);
                  const masteredCount = Object.values(cardStatus).filter(s => s === 'got-it').length;

                  // Completion screen
                  if (masteredCount === validCards.length && validCards.length > 0) {
                    const reviewCards = validCards.filter((_: any, i: number) => (cardStatus as any)[i] === 'review');
                    return (
                      <div className="text-center py-12">
                        <p className="text-4xl mb-4">🎉</p>
                        <h3 className="text-xl font-bold text-white mb-2">
                          You&apos;ve covered all {validCards.length} concepts
                        </h3>
                        {reviewCards.length > 0 && (
                          <div className="mt-6 text-left max-w-md mx-auto">
                            <p className="text-sm text-gray-400 mb-3">
                              Still working on {reviewCards.length} concepts:
                            </p>
                            {reviewCards.map((card: any, i: number) => (
                              <div key={i} className="bg-gray-900 border border-gray-800 rounded-lg p-3 mb-2">
                                <p className="text-white text-sm font-medium">{card.question}</p>
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
                              className="mt-4 w-full py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-medium transition-all"
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
                          className="mt-4 px-6 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-sm font-medium transition-all"
                        >
                          Start over
                        </button>
                      </div>
                    );
                  }

                  // Group cards by section
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
                            {/* Section Header */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                                <span className="text-sm font-semibold text-white">{sectionTitle}</span>
                                {outlineItem && (
                                  <span className="text-xs font-mono text-gray-500">
                                    {outlineItem.timestampFormatted} — {outlineItem.endTimestampFormatted}
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-gray-500">
                                {sectionMastered}/{sectionCards.length} mastered
                              </span>
                            </div>

                            {/* Cards in this section */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {sectionCards.map((card: any) => {
                                const idx = card.originalIndex;
                                const status = (cardStatus as any)[idx];
                                const isFlipped = status === 'flipped' || status === 'got-it' || status === 'review';
                                const isMastered = status === 'got-it';

                                return (
                                  <div
                                    key={idx}
                                    onClick={() => {
                                      if (!isFlipped) {
                                        setCardStatus((prev: any) => ({ ...prev, [idx]: 'flipped' }));
                                      }
                                    }}
                                    className={`border rounded-xl p-5 transition-all ${
                                      isMastered
                                        ? 'bg-green-900/10 border-green-800/50 opacity-60'
                                        : isFlipped
                                          ? 'bg-gray-900 border-gray-700'
                                          : 'bg-gray-900 border-gray-800 cursor-pointer hover:border-gray-600'
                                    }`}
                                  >
                                    {!isFlipped ? (
                                      <div>
                                        <p className="text-xs text-blue-400 font-medium mb-2">QUESTION</p>
                                        <p className="text-white font-medium">{card.question}</p>
                                        <p className="text-xs text-gray-600 mt-3">Click to reveal answer</p>
                                      </div>
                                    ) : (
                                      <div>
                                        <p className="text-xs text-green-400 font-medium mb-2">ANSWER</p>
                                        <p className="text-gray-200 text-sm">{card.answer}</p>

                                        <a
                                          href={getYouTubeTimestampUrl(result.metadata.videoId, card.timestamp)}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={e => e.stopPropagation()}
                                          className="inline-block mt-3 text-xs font-mono bg-gray-800 hover:bg-blue-600 px-2 py-1 rounded transition-all"
                                        >
                                          ▶ {card.timestampFormatted}
                                        </a>
                                        {!isMastered && (
                                          <div className="flex gap-2 mt-3">
                                            <button
                                              type="button"
                                              onClick={e => {
                                                e.stopPropagation();
                                                setCardStatus((prev: any) => ({ ...prev, [idx]: 'got-it' }));
                                              }}
                                              className="flex-1 py-1.5 bg-green-700 hover:bg-green-600 rounded-lg text-xs font-medium transition-all"
                                            >
                                              ✅ Got it
                                            </button>
                                            <button
                                              type="button"
                                              onClick={e => {
                                                e.stopPropagation();
                                                setCardStatus((prev: any) => ({ ...prev, [idx]: 'review' }));
                                              }}
                                              className="flex-1 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs font-medium transition-all"
                                            >
                                              🔄 Review again
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    )}
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
                <div className="flex gap-3 mb-6">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    placeholder="Ask anything about this lecture..."
                    className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <button
                    onClick={handleSearch}
                    disabled={searching || !searchQuery.trim()}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-xl font-medium transition-all"
                  >
                    {searching ? 'Searching...' : 'Ask'}
                  </button>
                </div>
                {searching && (
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 animate-pulse">
                    <p className="text-gray-500 text-sm">Finding the answer in the lecture...</p>
                  </div>
                )}
                {!searching && searchResults && (searchResults as any).answer && (
                  <div className="space-y-4">
                    <div className="bg-blue-900/20 border border-blue-800 rounded-xl p-5">
                      <p className="text-xs text-blue-400 font-medium mb-2">ANSWER</p>
                      <p className="text-white leading-relaxed mb-4">{(searchResults as any).answer}</p>
                      {((searchResults as any).sources || [])[0] && (
                        <a
                          href={getYouTubeTimestampUrl(
                            result.metadata.videoId,
                            ((searchResults as any).sources || [])[0].timestamp
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                        >
                          ▶ Watch at {((searchResults as any).sources || [])[0].timestampFormatted}
                        </a>
                      )}
                    </div>
                    {((searchResults as any).sources || []).length > 1 && (
                      <div>
                        <p className="text-xs text-gray-500 mb-2 font-medium">OTHER RELEVANT MOMENTS</p>
                        <div className="space-y-2">
                          {((searchResults as any).sources || []).slice(1).map((r: any, i: number) => (
                            <div
                              key={i}
                              className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-start justify-between gap-4"
                            >
                              <p className="text-gray-400 text-sm flex-1 line-clamp-2">{r.text}</p>
                              <a
                                href={getYouTubeTimestampUrl(result.metadata.videoId, r.timestamp)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="shrink-0 text-xs font-mono bg-gray-800 hover:bg-blue-600 px-2 py-1 rounded transition-all"
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
                <div className="bg-purple-900/20 border border-purple-800 rounded-xl p-6">
                  <p className="text-xs text-purple-400 font-medium mb-2">TOP PRIORITY FIX</p>
                  <p className="text-white text-lg font-medium">{result.audit.topPriorityFix}</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Pedagogy', key: 'pedagogicalScore' },
                    { label: 'Accessibility', key: 'accessibilityScore' },
                    { label: 'Clarity', key: 'clarityScore' },
                    { label: 'Equity', key: 'equityScore' },
                  ].map(({ label, key }) => (
                    <div key={key} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
                      <p className="text-3xl font-bold text-white">{result.audit[key]}</p>
                      <p className="text-xs text-gray-400 mt-1">{label}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  {result.audit.findings?.map((finding: any, i: number) => (
                    <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs bg-gray-800 px-2 py-0.5 rounded text-gray-300">{finding.category}</span>
                        <a
                          href={getYouTubeTimestampUrl(result.metadata.videoId, finding.timestamp)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-mono bg-gray-800 hover:bg-blue-600 px-2 py-0.5 rounded transition-all"
                        >
                          ▶ {finding.timestampFormatted}
                        </a>
                      </div>
                      <p className="text-gray-300 text-sm mb-2">{finding.issue}</p>
                      <p className="text-green-400 text-sm">💡 {finding.suggestedRewrite}</p>
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