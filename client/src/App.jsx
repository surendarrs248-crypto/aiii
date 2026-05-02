import { useEffect, useMemo, useState } from 'react';

const categoryOptions = ['All', 'AI Strategy', 'Design', 'Search Tech', 'Security', 'Productivity'];
const tagOptions = ['All', 'semantic search', 'ux', 'nlp', 'privacy', 'recommendations'];
const tabOptions = ['Search', 'News', 'Weather', 'Trends', 'Analysis', 'Compare'];
const suggestions = [
  'python data analysis',
  'java enterprise development',
  'dart flutter app',
  'react component example',
  'node js api',
  'html semantic structure',
  'css grid layout',
  'javascript es6 features'
];

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
  const [assistant, setAssistant] = useState({
    title: 'AI code assistant',
    summary: 'Enter a query to get a professional answer or code output with detailed explanations in Python, Java, Dart, React, Node.js, HTML, CSS, or JavaScript.',
    intent: 'Ask anything about programming languages and web development.',
    followUps: ['Search for Python data analysis', 'Ask for a React component', 'Show me HTML structure'],
    answer: 'This engine returns direct answers, recommendations, or code with line-by-line explanations.',
    answerType: 'text',
    codeSnippet: ''
  });
  const [meta, setMeta] = useState({ resultCount: 0, queryTimeMs: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
      setAssistant(data.assistant || assistant);
      setMeta(data.meta || { resultCount: 0, queryTimeMs: 0 });
    } catch (err) {
      setError('Unable to connect to the search API.');
    } finally {
      setLoading(false);
    }
  }

  async function fetchNews() {
    try {
      setLoading(true);
      const response = await fetch('/api/news');
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

  async function fetchAnalysis() {
    try {
      if (!query.trim()) {
        setError('Please enter a query to analyze');
        return;
      }
      setLoading(true);
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query, depth: 'standard' })
      });
      const data = await response.json();
      setAnalysisData(data.data);
    } catch (err) {
      setError('Failed to fetch analysis');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Load data when tab changes
    if (activeTab === 'News' && !newsData) {
      fetchNews();
    } else if (activeTab === 'Weather' && !weatherData) {
      fetchWeather();
    } else if (activeTab === 'Trends' && !trendsData) {
      fetchTrends();
    }
  }, [activeTab, newsData, weatherData, trendsData]);

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
        </div>
          <div className="hero-panel__visual">
          <div className="hero-box">
            <span>{assistant.title}</span>
            <p>{assistant.summary}</p>
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
            </div>
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
          <section className="results-panel">
            <h2 className="section-title">Compare Results</h2>
            <p className="section-subtitle">Compare different approaches, tools, or solutions for your query</p>
            {error && <div className="alert">{error}</div>}
            <div className="compare-content">
              <p>Search for something first, then use the comparison tools to see pros & cons of different approaches.</p>
            </div>
          </section>
        )}

        <aside className="detail-panel">
          <div className="detail-card">
            <h2>{assistant.title}</h2>
            <p className="detail-summary">{assistant.summary}</p>
            <div className="assistant-intent detail-intent">{assistant.intent}</div>
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
