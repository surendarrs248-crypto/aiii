// External API Integrations for Weather, News, and Web Search
// This module handles all external API calls

// Weather API integration (replace with real API in production)
export async function getWeather(lat, lon, location = 'Local area') {
  const apiKey = process.env.OPENWEATHER_API_KEY;

  const fallbackWeather = {
    location,
    current: {
      temperature: 72,
      feelsLike: 70,
      humidity: 65,
      windSpeed: 8,
      condition: 'Partly Cloudy',
      icon: '⛅',
      lastUpdated: new Date().toISOString(),
    },
    forecast: [
      { day: 'Tomorrow', high: 75, low: 62, condition: 'Sunny', icon: '☀️' },
      { day: 'Friday', high: 73, low: 61, condition: 'Cloudy', icon: '☁️' },
      { day: 'Saturday', high: 68, low: 55, condition: 'Rainy', icon: '🌧️' },
    ],
    alerts: [],
    source: 'OpenWeatherMap (Mock)',
  };

  if (!apiKey || !lat || !lon) {
    return fallbackWeather;
  }

  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/onecall?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&exclude=minutely,hourly,alerts&units=imperial&appid=${encodeURIComponent(apiKey)}`
    );

    if (!response.ok) {
      throw new Error(`OpenWeatherMap returned ${response.status}`);
    }

    const data = await response.json();

    return {
      location: data.timezone || location,
      current: {
        temperature: Math.round(data.current.temp),
        feelsLike: Math.round(data.current.feels_like),
        humidity: data.current.humidity,
        windSpeed: Math.round(data.current.wind_speed),
        condition: data.current.weather?.[0]?.description || 'Unknown',
        icon: mapWeatherIcon(data.current.weather?.[0]?.main),
        lastUpdated: new Date(data.current.dt * 1000).toISOString(),
      },
      forecast: data.daily.slice(1, 4).map((day) => ({
        day: new Date(day.dt * 1000).toLocaleDateString('en-US', { weekday: 'short' }),
        high: Math.round(day.temp.max),
        low: Math.round(day.temp.min),
        condition: day.weather?.[0]?.main || 'N/A',
        icon: mapWeatherIcon(day.weather?.[0]?.main),
      })),
      alerts: data.alerts || [],
      source: 'OpenWeatherMap',
    };
  } catch (error) {
    console.error('Weather API error:', error);
    return fallbackWeather;
  }
}

function mapWeatherIcon(main) {
  if (!main) return '🌤️';
  const normalized = main.toLowerCase();
  if (normalized.includes('cloud')) return '☁️';
  if (normalized.includes('rain') || normalized.includes('drizzle')) return '🌧️';
  if (normalized.includes('storm')) return '⛈️';
  if (normalized.includes('snow')) return '❄️';
  if (normalized.includes('clear')) return '☀️';
  if (normalized.includes('fog') || normalized.includes('mist') || normalized.includes('haze')) return '🌫️';
  return '🌤️';
}

// News API integration for live headlines
export async function getNews(category = 'general', country = 'in') {
  const apiKey = process.env.NEWS_API_KEY;
  const safeCategory = category || 'general';
  const safeCountry = country || 'in';

  if (!apiKey) {
    // Fallback mock news when no API key is configured
    const mockNews = [
      {
        id: 1,
        title: 'AI Breakthrough: New Language Model Achieves Record Accuracy',
        description: 'Researchers announce a new AI model that outperforms previous benchmarks...',
        source: 'TechNews Daily',
        category: 'AI',
        date: new Date(Date.now() - 3600000).toISOString(),
        image: '📰',
        url: 'https://example.com/ai-breakthrough',
        sentiment: 'positive',
        readTime: 5,
      },
      {
        id: 2,
        title: 'Search Engine Updates: New Algorithm Prioritizes User Experience',
        description: 'Major search engines announce updates to improve search relevance...',
        source: 'Web Development Weekly',
        category: 'Search',
        date: new Date(Date.now() - 7200000).toISOString(),
        image: '🔍',
        url: 'https://example.com/search-update',
        sentiment: 'neutral',
        readTime: 4,
      },
      {
        id: 3,
        title: 'JavaScript Framework Trends: React Remains Top Choice',
        description: 'Annual survey shows continued dominance of React in web development...',
        source: 'Developer Central',
        category: 'Development',
        date: new Date(Date.now() - 10800000).toISOString(),
        image: '⚙️',
        url: 'https://example.com/js-trends',
        sentiment: 'positive',
        readTime: 6,
      },
      {
        id: 4,
        title: 'Cloud Computing Market Growing 25% Year-over-Year',
        description: 'Industry analysts project continued growth in cloud services...',
        source: 'Tech Business Quarterly',
        category: 'Cloud',
        date: new Date(Date.now() - 14400000).toISOString(),
        image: '☁️',
        url: 'https://example.com/cloud-market',
        sentiment: 'positive',
        readTime: 7,
      },
    ];

    return {
      articles: mockNews,
      totalResults: mockNews.length,
      category: safeCategory,
      lastUpdated: new Date().toISOString(),
      source: 'Mock News',
    };
  }

  try {
    const params = new URLSearchParams({
      apiKey,
      country: safeCountry,
      category: safeCategory,
      pageSize: '10',
      q: 'India',
    });

    const response = await fetch(`https://newsapi.org/v2/top-headlines?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`NewsAPI returned ${response.status}`);
    }

    const data = await response.json();
    const articles = (data.articles || []).map((item, index) => ({
      id: item.url || `news-${index}`,
      title: item.title || 'Untitled headline',
      description: item.description || item.content || 'No description available.',
      source: item.source?.name || 'NewsAPI',
      category: safeCategory,
      date: item.publishedAt || new Date().toISOString(),
      image: item.urlToImage || '📰',
      url: item.url || '#',
      sentiment: 'neutral',
      readTime: item.content ? Math.max(2, Math.round(item.content.split(' ').length / 200)) : 4,
    }));

    return {
      articles,
      totalResults: Number(data.totalResults || articles.length),
      category: safeCategory,
      lastUpdated: new Date().toISOString(),
      source: 'NewsAPI',
    };
  } catch (error) {
    console.error('News API error:', error);
    throw new Error('Failed to fetch news');
  }
}

// Web search integration (replace with real search API in production)
function getSearchResultImage(item) {
  if (item.pagemap?.cse_image?.[0]?.src) return item.pagemap.cse_image[0].src;
  if (item.pagemap?.cse_thumbnail?.[0]?.src) return item.pagemap.cse_thumbnail[0].src;
  if (item.image?.thumbnailLink) return item.image.thumbnailLink;
  return null;
}

function truncateText(text, maxLength = 280) {
  if (!text) return '';
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

export async function performWebSearch(query, limit = 10, searchType = 'web') {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const searchEngineId = process.env.GOOGLE_CSE_ID;
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 5, 1), 10);
  const safeQuery = (query || '').trim();

  if (!apiKey || !searchEngineId) {
    return getMockSearchResults(safeQuery, safeLimit, 'Fallback Google search mock');
  }

  try {
    const params = new URLSearchParams({
      key: apiKey,
      cx: searchEngineId,
      q: safeQuery,
      num: String(safeLimit),
    });

    if (searchType === 'image') {
      params.set('searchType', 'image');
    }

    const response = await fetch(`https://www.googleapis.com/customsearch/v1?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Google Search API returned ${response.status}`);
    }

    const data = await response.json();
    const results = (data.items || []).map((item, index) => ({
      position: item.position || index + 1,
      title: item.title || 'Untitled result',
      url: item.link || item.image?.contextLink || '#',
      snippet: truncateText(item.snippet || item.title || 'No description available.', 220),
      domain: item.displayLink || item.link?.split('/')[2] || 'web',
      type: searchType === 'image' ? 'image' : item.fileFormat ? 'document' : 'website',
      image: getSearchResultImage(item),
    }));

    return {
      results,
      query: safeQuery,
      totalResults: Number(data.searchInformation?.totalResults || results.length),
      searchTime: `${Number(data.searchInformation?.searchTime || 0).toFixed(2)}s`,
      source: 'Google Custom Search',
    };
  } catch (error) {
    console.error('Google Search API error:', error);
    return getMockSearchResults(safeQuery, safeLimit, 'Google search fallback mock');
  }
}

export async function getWikipediaSummary(query) {
  if (!query || typeof query !== 'string') {
    return null;
  }

  try {
    const searchParams = new URLSearchParams({
      action: 'query',
      list: 'search',
      srsearch: query,
      format: 'json',
      origin: '*',
      srlimit: '1',
      srprop: ''
    });
    const searchResponse = await fetch(`https://en.wikipedia.org/w/api.php?${searchParams.toString()}`);
    if (!searchResponse.ok) {
      throw new Error(`Wikipedia search returned ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    const page = searchData.query?.search?.[0];
    if (!page?.title) {
      return null;
    }

    const title = page.title;
    const summaryResponse = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
    if (!summaryResponse.ok) {
      throw new Error(`Wikipedia summary returned ${summaryResponse.status}`);
    }

    const summaryData = await summaryResponse.json();
    return {
      title: summaryData.title,
      extract: summaryData.extract || '',
      url: summaryData.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`,
      thumbnail: summaryData.thumbnail?.source || null,
      source: 'Wikipedia'
    };
  } catch (error) {
    console.error('Wikipedia lookup error:', error);
    return null;
  }
}

function getMockSearchResults(query, limit, source = 'Mock Search API') {
  const mockResults = Array.from({ length: limit }, (_, index) => ({
    position: index + 1,
    title: `${query} - Guide ${index + 1}`,
    url: `https://example.com/${query.replace(/\s+/g, '-')}/${index + 1}`,
    snippet: `Learn about ${query} with comprehensive guides and examples. Updated with latest best practices.`,
    domain: 'example.com',
    type: 'article',
  }));

  return {
    results: mockResults,
    query,
    totalResults: mockResults.length,
    searchTime: '0.6s',
    source,
  };
}

// Stock/Market data integration
export async function getMarketData() {
  try {
    // In production, integrate with Alpha Vantage, Yahoo Finance, or similar
    const mockMarketData = {
      lastUpdated: new Date().toISOString(),
      markets: [
        {
          symbol: 'TECH',
          name: 'Tech Sector Index',
          price: 5432.10,
          change: 145.25,
          changePercent: 2.74,
          trend: 'up',
        },
        {
          symbol: 'AI',
          name: 'AI Companies ETF',
          price: 287.50,
          change: 12.30,
          changePercent: 4.47,
          trend: 'up',
        },
      ],
      source: 'Market Data API',
    };
    
    return mockMarketData;
  } catch (error) {
    console.error('Market data error:', error);
    throw new Error('Failed to fetch market data');
  }
}

// Trending topics/insights
export async function getTrendingTopics() {
  try {
    // In production, integrate with Google Trends, Twitter API, or similar
    const mockTrendingTopics = {
      trending: [
        {
          rank: 1,
          topic: 'Artificial Intelligence',
          volume: 'Very High',
          trend: 'up',
          articles: 2450,
          mentions: 15000,
        },
        {
          rank: 2,
          topic: 'Web Development',
          volume: 'High',
          trend: 'stable',
          articles: 1820,
          mentions: 8500,
        },
        {
          rank: 3,
          topic: 'Cloud Computing',
          volume: 'High',
          trend: 'up',
          articles: 1650,
          mentions: 7200,
        },
        {
          rank: 4,
          topic: 'Machine Learning',
          volume: 'Medium',
          trend: 'up',
          articles: 1420,
          mentions: 6100,
        },
      ],
      sourceLanguage: 'en',
      geo: 'US',
      lastUpdated: new Date().toISOString(),
      source: 'Trending Topics API',
    };
    
    return mockTrendingTopics;
  } catch (error) {
    console.error('Trending topics error:', error);
    throw new Error('Failed to fetch trending topics');
  }
}

// Comparison analysis - compare different solutions
export async function compareResults(query, options) {
  try {
    const mockComparison = {
      topic: query,
      comparisons: [
        {
          name: 'Option A',
          pros: ['Fast', 'Reliable', 'Easy to use'],
          cons: ['Limited features', 'Higher cost'],
          rating: 4.2,
          price: '$99/month',
        },
        {
          name: 'Option B',
          pros: ['Feature-rich', 'Affordable', 'Great support'],
          cons: ['Steep learning curve'],
          rating: 4.5,
          price: '$49/month',
        },
        {
          name: 'Option C',
          pros: ['Most affordable', 'Open source', 'Active community'],
          cons: ['Less support', 'Requires technical skill'],
          rating: 4.0,
          price: 'Free',
        },
      ],
      recommendation: 'Option B offers the best balance of features and price',
      lastUpdated: new Date().toISOString(),
    };
    
    return mockComparison;
  } catch (error) {
    console.error('Comparison error:', error);
    throw new Error('Failed to generate comparison');
  }
}

// Advanced analysis - detailed insights
export async function getAdvancedAnalysis(query) {
  try {
    const mockAnalysis = {
      topic: query,
      overview: `Comprehensive analysis of ${query} including market trends, best practices, and expert insights.`,
      sections: [
        {
          title: 'Executive Summary',
          content: `Key findings and insights about ${query}...`,
        },
        {
          title: 'Industry Trends',
          content: 'Current market trends and predictions...',
        },
        {
          title: 'Best Practices',
          content: 'Expert recommendations and proven strategies...',
        },
        {
          title: 'Case Studies',
          content: 'Real-world examples and success stories...',
        },
      ],
      sentiment: 'positive',
      confidence: 0.92,
      sources: 15,
      lastUpdated: new Date().toISOString(),
    };
    
    return mockAnalysis;
  } catch (error) {
    console.error('Advanced analysis error:', error);
    throw new Error('Failed to perform advanced analysis');
  }
}
