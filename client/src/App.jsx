import { useEffect, useMemo, useState } from 'react';

const categoryOptions = ['All', 'AI Strategy', 'Design', 'Search Tech', 'Security', 'Productivity'];
const tagOptions = ['All', 'semantic search', 'ux', 'nlp', 'privacy', 'recommendations'];
const tabOptions = ['Search', 'Web Search', 'Chat', 'News', 'Weather', 'Trends', 'Analysis', 'Compare', 'Music'];
const suggestions = [
  'google custom search api',
  'ai image generator 2026',
  'react 19 release notes',
  'best android update features',
  'openai gpt-4o image support',
  'how to build search ranking model',
  'latest chrome privacy settings',
  'semantic search engine architecture'
];
const defaultSearchHistory = [
  'Google I/O 2026 highlights',
  'best AI image generator 2026',
  'Google Custom Search API setup',
  'React 19 features and upgrade guide',
  'new Android update release date',
  'OpenAI GPT-4o image generation examples',
  'AI search ranking factors 2026',
  'Chrome privacy controls update'
];

function getHistoryIcon(term) {
  const lower = term.toLowerCase();
  if (lower.includes('image') || lower.includes('photo')) return '🖼️';
  if (lower.includes('google') || lower.includes('search')) return '🔎';
  if (lower.includes('ai') || lower.includes('openai')) return '🤖';
  if (lower.includes('react') || lower.includes('android')) return '⚙️';
  return '⏱️';
}

function formatScore(score) {
  return `${Math.round(score)}% relevance`;
}

function SearchResultCard({ result }) {
  return (
    <article className="result-card">
      <div className="result-header">
        <h3>{result.title}</h3>
        <span className="badge">{result.category}</span>
      </div>
      <p className="result-snippet">{result.snippet}</p>
      <div className="result-meta">
        <span>{result.source}</span>
        <span>{formatScore(result.score)}</span>
        <span>{result.confidence}% confidence</span>
      </div>
      <div className="tag-list">
        {result.tags.map((tag) => (
          <span key={tag} className="tag">{tag}</span>
        ))}
      </div>
      <a className="result-link" href={result.url} target="_blank" rel="noreferrer">
        View source
      </a>
    </article>
  );
}

function NewsCard({ article }) {
  return (
    <article className="news-card">
      <div className="news-header">
        <span className="news-image">{article.image}</span>
        <div>
          <h3>{article.title}</h3>
          <p className="news-meta">{article.source} • {new Date(article.date).toLocaleDateString()}</p>
        </div>
      </div>
      <p className="news-snippet">{article.description}</p>
      <div className="news-footer">
        <span className="read-time">📖 {article.readTime} min read</span>
        <span className={`sentiment ${article.sentiment}`}>{article.sentiment}</span>
        <a href={article.url} target="_blank" rel="noreferrer" className="news-link">Read more →</a>
      </div>
    </article>
  );
}

function TrendCard({ trend }) {
  return (
    <article className="trend-card">
      <div className="trend-rank">#{trend.rank}</div>
      <div className="trend-header">
        <h3>{trend.topic}</h3>
        <span className={`trend-indicator ${trend.trend}`}>{trend.trend === 'up' ? '📈' : '📊'}</span>
      </div>
      <div className="trend-stats">
        <div className="stat">
          <span className="label">Volume:</span>
          <span className="value">{trend.volume}</span>
        </div>
        <div className="stat">
          <span className="label">Growth:</span>
          <span className="value">{trend.growth}</span>
        </div>
        <div className="stat">
          <span className="label">Mentions:</span>
          <span className="value">{trend.mentions.toLocaleString()}</span>
        </div>
      </div>
    </article>
  );
}

function WebSearchCard({ result }) {
  return (
    <article className="web-search-card">
      {result.image && (
        <div className="web-result-image-wrapper">
          <img className="web-result-image" src={result.image} alt={result.title} />
        </div>
      )}
      <div className="web-result-header">
        <h3>{result.title}</h3>
        <span className="web-result-domain">{result.domain}</span>
      </div>
      <p className="result-snippet">{result.snippet}</p>
      <a className="result-link" href={result.url} target="_blank" rel="noreferrer">
        {result.url}
      </a>
    </article>
  );
}

function WeatherWidget({ data }) {
  if (!data) return null;
  
  return (
    <div className="weather-widget">
      <div className="weather-current">
        <h3>{data.location}</h3>
        <div className="temperature">
          <span className="temp-value">{data.current.temperature}°F</span>
          <span className="weather-icon">{data.current.icon}</span>
        </div>
        <p className="weather-condition">{data.current.condition}</p>
        <div className="weather-details">
          <div><span>Feels like:</span> {data.current.feelsLike}°F</div>
          <div><span>Humidity:</span> {data.current.humidity}%</div>
          <div><span>Wind:</span> {data.current.windSpeed} mph</div>
        </div>
      </div>
      <div className="weather-forecast">
        <h4>Forecast</h4>
        <div className="forecast-grid">
          {data.forecast.map((day, idx) => (
            <div key={idx} className="forecast-item">
              <p className="day">{day.day}</p>
              <p className="icon">{day.icon}</p>
              <p className="temps">{day.high}°/{day.low}°</p>
              <p className="condition">{day.condition}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [tag, setTag] = useState('All');
  const [activeTab, setActiveTab] = useState('Search');
  const [results, setResults] = useState([]);
  const [newsData, setNewsData] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [trendsData, setTrendsData] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [marketData, setMarketData] = useState(null);
  const [assistant, setAssistant] = useState({
    title: 'AI code assistant',
    summary: 'Enter a query to get a professional answer or code output with detailed explanations in Python, Java, Dart, React, Node.js, HTML, CSS, or JavaScript.',
    intent: 'Ask anything about programming languages and web development.',
    followUps: ['Search for Python data analysis', 'Ask for a React component', 'Show me HTML structure'],
    answer: 'This engine returns direct answers, recommendations, or code with line-by-line explanations.',
    answerType: 'text',
    codeSnippet: '',
    source: 'AI knowledge base'
  });
  const [searchHistory, setSearchHistory] = useState(defaultSearchHistory);
  const historyLimit = 6;
  const [compareTopics, setCompareTopics] = useState(['', '', '']);
  const [compareData, setCompareData] = useState(null);
  const [webResults, setWebResults] = useState([]);
  const [webMeta, setWebMeta] = useState({ totalResults: 0, queryTimeMs: 0 });
  const [meta, setMeta] = useState({ resultCount: 0, queryTimeMs: 0 });
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [musicData, setMusicData] = useState(null);
  const [musicLanguage, setMusicLanguage] = useState('english');

  useEffect(() => {
    const stored = window.localStorage.getItem('aiii-search-history');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSearchHistory(parsed);
        }
      } catch (e) {
        window.localStorage.removeItem('aiii-search-history');
      }
    }
  }, []);

  const canSearch = query.trim().length > 0;

  const activeFilters = useMemo(
    () => ({ category: category === 'All' ? 'All' : category, tag: tag === 'All' ? 'All' : tag }),
    [category, tag]
  );

  useEffect(() => {
    if (!canSearch) {
      setResults([]);
      setMeta({ resultCount: 0, queryTimeMs: 0 });
      setAssistant((current) => ({
        ...current,
        summary: 'Enter a query to get a professional answer or code output with detailed explanations in Python, Java, Dart, React, Node.js, HTML, CSS, or JavaScript.'
      }));
      setError(null);
    }
  }, [canSearch]);

  async function runSearch(event, overrideQuery) {
    event?.preventDefault();
    const searchQuery = overrideQuery ?? query;
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery, category, tag })
      });
      const data = await response.json();
      setQuery(searchQuery);
      setResults(data.results || []);
      setWebResults(data.webResults || []);
      setAssistant(data.assistant || assistant);
      setMeta(data.meta || { resultCount: 0, queryTimeMs: 0 });
      setWebMeta(data.webMeta || { totalResults: 0, queryTimeMs: 0 });
      setSearchHistory((prev) => {
        const normalized = searchQuery.trim();
        const next = [normalized, ...prev.filter((term) => term !== normalized)].slice(0, historyLimit);
        window.localStorage.setItem('aiii-search-history', JSON.stringify(next));
        return next;
      });
    } catch (err) {
      setError('Unable to connect to the search API.');
    } finally {
      setLoading(false);
    }
  }

  async function runWebSearch(event) {
    event?.preventDefault();
    const searchQuery = query.trim();
    if (!searchQuery) {
      setError('Enter a query to perform a web search.');
      return;
    }

    setLoading(true);
    setError(null);
    setWebResults([]);

    try {
      const response = await fetch('/api/google-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery, limit: 8, searchType: 'web' })
      });
      const data = await response.json();
      setWebResults(data.data?.results || []);
      setWebMeta({ totalResults: data.data?.totalResults || 0, queryTimeMs: Number((Math.random() * 200).toFixed(0)) });
      setSearchHistory((prev) => {
        const normalized = searchQuery;
        const next = [normalized, ...prev.filter((term) => term !== normalized)].slice(0, historyLimit);
        window.localStorage.setItem('aiii-search-history', JSON.stringify(next));
        return next;
      });
    } catch (err) {
      setError('Unable to connect to the web search API.');
    } finally {
      setLoading(false);
    }
  }

  async function runChat(event) {
    event?.preventDefault();
    const message = chatInput.trim();
    if (!message) return;

    const userMessage = { role: 'user', content: message };
    const nextMessages = [...chatMessages, userMessage];
    setChatMessages(nextMessages);
    setChatInput('');
    setChatLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages })
      });
      const data = await response.json();
      const assistantReply = data?.data?.reply || 'Sorry, I could not generate a response right now.';
      setChatMessages((prev) => [...prev, { role: 'assistant', content: assistantReply }]);
    } catch (err) {
      setError('Unable to connect to the chat API.');
      setChatMessages((prev) => [...prev, { role: 'assistant', content: 'There was a connection problem. Please try again.' }]);
    } finally {
      setChatLoading(false);
    }
  }

  async function runCompare(event) {
    event?.preventDefault();
    const topics = compareTopics.map((topic) => topic.trim()).filter(Boolean);
    if (topics.length === 0) {
      setError('Enter at least one topic to compare.');
      return;
    }

    setLoading(true);
    setError(null);
    setCompareData(null);

    try {
      const response = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topics })
      });
      const data = await response.json();
      setCompareData(data.data);
    } catch (err) {
      setError('Unable to load comparison results.');
    } finally {
      setLoading(false);
    }
  }

  function requestLocalWeather() {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      fetchWeather();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        fetchWeather(position.coords.latitude, position.coords.longitude);
      },
      () => {
        setError('Location access denied. Showing fallback weather data.');
        fetchWeather();
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function fetchWeather(lat, lon) {
    try {
      setLoading(true);
      setError(null);
      const queryString = lat && lon ? `?lat=${lat}&lon=${lon}` : '?location=New York';
      const response = await fetch(`/api/weather${queryString}`);
      const data = await response.json();
      setWeatherData(data.data);
    } catch (err) {
      setError('Failed to fetch weather');
    } finally {
      setLoading(false);
    }
  }

  async function fetchNews() {
    try {
      setLoading(true);
      const response = await fetch('/api/news?country=in');
      const data = await response.json();
      setNewsData(data.data);
    } catch (err) {
      setError('Failed to fetch news');
    } finally {
      setLoading(false);
    }
  }

  async function fetchWeather() {
    try {
      setLoading(true);
      const response = await fetch('/api/weather?location=New York');
      const data = await response.json();
      setWeatherData(data.data);
    } catch (err) {
      setError('Failed to fetch weather');
    } finally {
      setLoading(false);
    }
  }

  async function fetchTrends() {
    try {
      setLoading(true);
      const response = await fetch('/api/trends');
      const data = await response.json();
      setTrendsData(data.data);
    } catch (err) {
      setError('Failed to fetch trends');
    } finally {
      setLoading(false);
    }
  }

  async function fetchMarketData() {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/market-data');
      const data = await response.json();
      setMarketData(data.data);
    } catch (err) {
      setError('Failed to fetch stock market updates');
    } finally {
      setLoading(false);
    }
  }

  async function fetchMusic() {
    try {
      setLoading(true);
      const response = await fetch(`/api/music?language=${musicLanguage}&limit=10`);
      const data = await response.json();
      setMusicData(data.data);
    } catch (err) {
      setError('Failed to fetch music');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Load data when tab changes
    if (activeTab === 'News' && !newsData) {
      fetchNews();
    } else if (activeTab === 'Weather' && !weatherData) {
      requestLocalWeather();
    } else if (activeTab === 'Trends' && !trendsData) {
      fetchTrends();
    } else if (activeTab === 'Analysis' && !marketData) {
      fetchMarketData();
    }
  }, [activeTab, newsData, weatherData, trendsData, marketData]);

  return (
    <div className="app-shell">
      <header className="hero-panel">
        <div>
          <span className="eyebrow">black ai</span>
          <h1>Conversational AI search with professional knowledge ranking.</h1>
          <p>
            Discover relevant insights like a modern AI assistant — with intent-aware results, source
            intelligence, and detailed code explanations in multiple programming languages.
          </p>
          <form className="search-form" onSubmit={runSearch}>
            <label htmlFor="searchInput" className="sr-only">
              Search query
            </label>
            <input
              id="searchInput"
              type="search"
              placeholder="Search for answers or paste code to explain each line..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <button type="submit" disabled={!canSearch || loading}>
              {loading ? 'Searching…' : 'Search'}
            </button>
          </form>
          <div className="suggestions">
            {suggestions.map((term) => (
              <button
                key={term}
                type="button"
                className="suggestion-pill"
                onClick={() => runSearch(null, term)}
              >
                {term}
              </button>
            ))}
          </div>
          {searchHistory.length > 0 && (
            <div className="search-history">
              <div className="history-header">
                <span>Recent searches</span>
                <button type="button" className="history-clear" onClick={() => {
                  setSearchHistory([]);
                  window.localStorage.removeItem('aiii-search-history');
                }}>
                  Clear
                </button>
              </div>
              <div className="history-list">
                {searchHistory.map((term) => (
                  <button
                    key={term}
                    type="button"
                    className="history-pill"
                    onClick={() => runSearch(null, term)}
                  >
                    <span className="history-icon">{getHistoryIcon(term)}</span>
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
          <div className="hero-panel__visual">
          <div className="hero-box">
            <span>{assistant.title}</span>
            <p>{assistant.summary}</p>
            {assistant.source && <div className="assistant-source">Source: {assistant.source}</div>}
            <div className="assistant-intent">{assistant.intent}</div>
            <div className="assistant-answer">
              <p>{assistant.answer}</p>
              {assistant.answerType === 'code' && assistant.codeSnippet && (
                <pre className="code-block">{assistant.codeSnippet}</pre>
              )}
            </div>
            <div className="followups">
              {assistant.followUps.map((term) => (
                <button
                  key={term}
                  type="button"
                  className="followup-pill"
                  onClick={() => runSearch(null, term)}
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="main-content">
        {/* Tab Navigation */}
        <div className="tabs-navigation">
          {tabOptions.map((tab) => (
            <button
              key={tab}
              className={`tab-button ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              <span className="tab-icon">
                {tab === 'Search' && '🔍'}
                {tab === 'Web Search' && '🌐'}
                {tab === 'News' && '📰'}
                {tab === 'Weather' && '🌤️'}
                {tab === 'Trends' && '📈'}
                {tab === 'Analysis' && '📊'}
                {tab === 'Compare' && '⚖️'}
              </span>
              {tab}
            </button>
          ))}
        </div>

        {/* Search Tab */}
        {activeTab === 'Search' && (
          <section className="results-panel">
            <section className="controls-panel">
              <div className="filter-group">
                <label htmlFor="categorySelect">Category</label>
                <select id="categorySelect" value={category} onChange={(e) => setCategory(e.target.value)}>
                  {categoryOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filter-group">
                <label htmlFor="tagSelect">Tag</label>
                <select id="tagSelect" value={tag} onChange={(e) => setTag(e.target.value)}>
                  {tagOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <div className="action-panel">
                <button onClick={runSearch} disabled={!canSearch || loading}>
                  Refresh results
                </button>
              </div>
            </section>

            {error && <div className="alert">{error}</div>}
            <section className="results-summary">
              <div>
                <span>{results.length} result{results.length === 1 ? '' : 's'}</span>
                <p>Showing advanced search results tailored for your query and selected filters.</p>
              </div>
              <div className="meta-info">
                <span>{meta.queryTimeMs} ms</span>
                <span>{meta.resultCount} fetched</span>
              </div>
            </section>

            <section className="results-grid">
              {loading
                ? Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="result-card skeleton">
                      <div className="skeleton-title" />
                      <div className="skeleton-line" />
                      <div className="skeleton-line short" />
                    </div>
                  ))
                : results.map((result) => <SearchResultCard key={result.id} result={result} />)}
              {!loading && results.length === 0 && canSearch && (
                <div className="empty-state">
                  <h2>No matches found</h2>
                  <p>Try broadening your query or switching categories to discover more results.</p>
                </div>
              )}
            </section>
            {webResults.length > 0 && (
              <section className="web-results-panel">
                <h2 className="section-title">Live Google Search</h2>
                <p className="news-note">These live results are fetched directly from the Google Custom Search API.</p>
                <section className="web-search-grid">
                  {webResults.map((result, index) => (
                    <WebSearchCard key={`${result.url}-${index}`} result={result} />
                  ))}
                </section>
              </section>
            )}
          </section>
        )}

        {/* Web Search Tab */}
        {activeTab === 'Web Search' && (
          <section className="results-panel">
            <h2 className="section-title">Google Web Search</h2>
            {error && <div className="alert">{error}</div>}
            <div className="search-controls">
              <p>Search the web with Google Custom Search integration.</p>
              <p className="news-note">Live India news updates are fetched from an external news API.</p>
              <button onClick={runWebSearch} disabled={!canSearch || loading}>
                {loading ? 'Searching web…' : 'Search web'}
              </button>
            </div>
            <section className="results-summary">
              <div>
                <span>{webMeta.totalResults} web result{webMeta.totalResults === 1 ? '' : 's'}</span>
                <p>Powered by the Google Custom Search API when configured.</p>
              </div>
              <div className="meta-info">
                <span>{webMeta.queryTimeMs} ms</span>
                <span>{webResults.length} displayed</span>
              </div>
            </section>
            <section className="web-search-grid">
              {loading
                ? Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="web-search-card skeleton">
                      <div className="skeleton-title" />
                      <div className="skeleton-line" />
                    </div>
                  ))
                : webResults.map((result, index) => <WebSearchCard key={`${result.url}-${index}`} result={result} />)}
              {!loading && webResults.length === 0 && canSearch && (
                <div className="empty-state">
                  <h2>No web results yet</h2>
                  <p>Enter a query and click Search web to fetch results.</p>
                </div>
              )}
            </section>
            {webResults.length > 0 && (
              <section className="web-results-panel">
                <h2 className="section-title">Google Results</h2>
                <section className="web-search-grid">
                  {webResults.map((result, index) => (
                    <WebSearchCard key={`${result.url}-${index}`} result={result} />
                  ))}
                </section>
              </section>
            )}
          </section>
        )}

        {/* Chat Tab */}
        {activeTab === 'Chat' && (
          <section className="results-panel chat-panel">
            <h2 className="section-title">AI Chat</h2>
            {error && <div className="alert">{error}</div>}
            <div className="chat-summary">
              <p>Talk to a ChatGPT-style assistant for programming, search guidance, and general AI help.</p>
            </div>
            <div className="chat-window">
              {chatMessages.length === 0 && !chatLoading ? (
                <div className="empty-state">
                  <h2>Start a conversation</h2>
                  <p>Ask a question and get instant ChatGPT-style responses.</p>
                </div>
              ) : (
                chatMessages.map((message, index) => (
                  <div key={index} className={`chat-bubble ${message.role}`}>
                    <span className="chat-role">{message.role === 'user' ? 'You' : 'Assistant'}</span>
                    <p>{message.content}</p>
                  </div>
                ))
              )}
            </div>
            <form className="chat-form" onSubmit={runChat}>
              <input
                type="text"
                placeholder="Ask the AI anything..."
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
              />
              <button type="submit" disabled={!chatInput.trim() || chatLoading}>
                {chatLoading ? 'Sending…' : 'Send'}
              </button>
            </form>
          </section>
        )}

        {/* Music Tab */}
        {activeTab === 'Music' && (
          <section className="results-panel">
            <h2 className="section-title">Live Music Player</h2>
            {error && <div className="alert">{error}</div>}
            <div className="music-controls">
              <p>Play live music from Tamil, English, Hindi, and Telugu.</p>
              <div className="language-selector">
                <label htmlFor="musicLanguage">Select Language:</label>
                <select
                  id="musicLanguage"
                  value={musicLanguage}
                  onChange={(event) => setMusicLanguage(event.target.value)}
                >
                  <option value="english">English</option>
                  <option value="hindi">Hindi</option>
                  <option value="tamil">Tamil</option>
                  <option value="telugu">Telugu</option>
                </select>
                <button onClick={fetchMusic} disabled={loading}>
                  {loading ? 'Loading…' : 'Load Music'}
                </button>
              </div>
            </div>
            <div className="music-grid">
              {musicData?.tracks?.map((track) => (
                <div key={track.id} className="music-card">
                  <div className="music-thumbnail">
                    {track.thumbnail.startsWith('http') ? (
                      <img src={track.thumbnail} alt={track.title} />
                    ) : (
                      <span>{track.thumbnail}</span>
                    )}
                  </div>
                  <div className="music-info">
                    <h3>{track.title}</h3>
                    <p>{track.artist}</p>
                    <a href={track.url} target="_blank" rel="noreferrer" className="music-play">
                      ▶️ Play
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* News Tab */}
        {activeTab === 'News' && (
          <section className="results-panel">
            <h2 className="section-title">Latest News & Articles</h2>
            {error && <div className="alert">{error}</div>}
            <section className="news-grid">
              {loading
                ? Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="news-card skeleton">
                      <div className="skeleton-title" />
                      <div className="skeleton-line" />
                    </div>
                  ))
                : newsData?.articles?.map((article) => <NewsCard key={article.id} article={article} />)}
            </section>
          </section>
        )}

        {/* Weather Tab */}
        {activeTab === 'Weather' && (
          <section className="results-panel">
            <h2 className="section-title">Weather Report</h2>
            {error && <div className="alert">{error}</div>}
            {loading ? (
              <div className="loading">Loading weather...</div>
            ) : (
              <WeatherWidget data={weatherData} />
            )}
          </section>
        )}

        {/* Trends Tab */}
        {activeTab === 'Trends' && (
          <section className="results-panel">
            <h2 className="section-title">Trending Topics</h2>
            {error && <div className="alert">{error}</div>}
            <section className="trends-grid">
              {loading
                ? Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="trend-card skeleton">
                      <div className="skeleton-title" />
                    </div>
                  ))
                : trendsData?.trending?.map((trend) => <TrendCard key={trend.rank} trend={trend} />)}
            </section>
          </section>
        )}

        {/* Analysis Tab */}
        {activeTab === 'Analysis' && (
          <section className="results-panel">
            <h2 className="section-title">Advanced Analysis</h2>
            {error && <div className="alert">{error}</div>}
            <div className="analysis-controls">
              <button onClick={fetchAnalysis} disabled={!canSearch || loading} className="analyze-btn">
                {loading ? 'Analyzing...' : 'Analyze Query'}
              </button>
              <button onClick={fetchMarketData} disabled={loading} className="secondary">
                {loading ? 'Refreshing...' : 'Refresh Market Updates'}
              </button>
            </div>
            {marketData && (
              <div className="market-panel">
                <div className="market-panel-header">
                  <div>
                    <h3>Live Stock Market Snapshot</h3>
                    <p>Real-time stock updates from market data sources.</p>
                  </div>
                  <div className="market-meta">
                    <span>Updated {new Date(marketData.lastUpdated).toLocaleTimeString()}</span>
                    <span>{marketData.source}</span>
                  </div>
                </div>
                <div className="market-grid">
                  {marketData.markets.map((stock) => (
                    <article key={stock.symbol} className={`market-card ${stock.trend}`}>
                      <div className="market-symbol">
                        <strong>{stock.symbol}</strong>
                        <span>{stock.name}</span>
                      </div>
                      <div className="market-price">
                        <span>${stock.price.toFixed(2)}</span>
                        <span className={`market-change ${stock.trend}`}>{stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)} ({stock.changePercent.toFixed(2)}%)</span>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
            {analysisData && (
              <div className="analysis-content">
                <h3>{analysisData.topic}</h3>
                <p className="analysis-overview">{analysisData.overview}</p>
                <div className="analysis-sections">
                  {analysisData.sections?.map((section, idx) => (
                    <div key={idx} className="analysis-section">
                      <h4>{section.title}</h4>
                      <p>{section.content}</p>
                    </div>
                  ))}
                </div>
                <div className="analysis-stats">
                  <div className="stat"><span>Sentiment:</span> <span>{analysisData.sentiment}</span></div>
                  <div className="stat"><span>Confidence:</span> <span>{(analysisData.confidence * 100).toFixed(0)}%</span></div>
                  <div className="stat"><span>Sources:</span> <span>{analysisData.sources}</span></div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Compare Tab */}
        {activeTab === 'Compare' && (
          <section className="results-panel compare-panel">
            <h2 className="section-title">Compare Options</h2>
            <p className="section-subtitle">Enter up to three topics to compare features, pros, cons, and recommendations.</p>
            {error && <div className="alert">{error}</div>}
            <form className="compare-form" onSubmit={runCompare}>
              <div className="compare-inputs">
                {compareTopics.map((topic, index) => (
                  <input
                    key={index}
                    type="text"
                    placeholder={`Topic ${index + 1}`}
                    value={topic}
                    onChange={(event) => {
                      const nextTopics = [...compareTopics];
                      nextTopics[index] = event.target.value;
                      setCompareTopics(nextTopics);
                    }}
                  />
                ))}
              </div>
              <div className="compare-actions">
                <button type="submit" disabled={loading}>
                  {loading ? 'Comparing…' : 'Compare now'}
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setCompareTopics(['', '', ''])}
                >
                  Reset
                </button>
              </div>
            </form>
            {compareData ? (
              <div className="comparison-grid">
                {compareData.comparisons.map((item) => (
                  <article key={item.name} className="comparison-card">
                    <h3>{item.name}</h3>
                    <div className="topic-tag">Rating: {item.rating}</div>
                    <div className="topic-tag">Price: {item.price}</div>
                    <div className="topic-tag">Market share: {item.market}%</div>
                    <div className="comparison-section">
                      <strong>Pros</strong>
                      <ul>
                        {item.pros.map((pro) => (
                          <li key={pro}>{pro}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="comparison-section">
                      <strong>Cons</strong>
                      <ul>
                        {item.cons.map((con) => (
                          <li key={con}>{con}</li>
                        ))}
                      </ul>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="compare-content">
                <p>Use the compare inputs above to explore how different options stack up in real time.</p>
              </div>
            )}
          </section>
        )}

        <aside className="detail-panel">
          <div className="detail-card">
            <h2>{assistant.title}</h2>
            <p className="detail-summary">{assistant.summary}</p>
            <div className="assistant-intent detail-intent">{assistant.intent}</div>
            {assistant.source && <div className="assistant-source detail-source">Source: {assistant.source}</div>}
            <div className="assistant-answer detail-answer">
              {assistant.answerType === 'code-explanation' ? (
                <>
                  <h3>Pasted code</h3>
                  <pre className="code-block">{assistant.codeSnippet}</pre>
                  <h3>Line-by-line explanation</h3>
                  <div className="explanation-text">{assistant.answer}</div>
                </>
              ) : (
                <p>{assistant.answer}</p>
              )}
              {assistant.answerType === 'code' && assistant.codeSnippet && (
                <div className="line-by-line-panel">
                  <h3>Line-by-line code view</h3>
                  <div className="code-line-list">
                    {assistant.codeSnippet.split('\n').map((line, index) => (
                      <div key={index} className="code-line">
                        <span className="line-number">{index + 1}</span>
                        <code>{line || '\u00A0'}</code>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="followups">
              {assistant.followUps.map((term) => (
                <button
                  key={term}
                  type="button"
                  className="followup-pill"
                  onClick={() => runSearch(null, term)}
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
