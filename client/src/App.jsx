import { useEffect, useMemo, useState } from 'react';

const categoryOptions = ['All', 'AI Strategy', 'Design', 'Search Tech', 'Security', 'Productivity'];
const tagOptions = ['All', 'semantic search', 'ux', 'nlp', 'privacy', 'recommendations'];
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

export default function App() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [tag, setTag] = useState('All');
  const [results, setResults] = useState([]);
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
