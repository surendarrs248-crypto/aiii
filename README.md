# Black Box AI Search Engine

This repository contains a full-stack conversational search engine prototype inspired by ChatGPT, Gemini, and Perplexity.

- **Express** backend API with semantic ranking, relevance scoring, and assistant-style guidance
- **React + Vite** frontend with a polished professional search UI
- **AI-enhanced search** with local ranking and optional OpenAI query summarization
- **Assistant panel** with query intent, follow-up suggestions, and source-aware results

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Run the full stack app:
   ```bash
   npm run dev
   ```
3. Open the client at `http://localhost:5173` and the API runs at `http://localhost:4000`

## Production Build

1. Build the frontend:
   ```bash
   npm run build
   ```
2. Start the server:
   ```bash
   npm start
   ```

## Optional OpenAI Integration

If you provide an `OPENAI_API_KEY`, the search API can generate richer AI summaries for queries.

Create a `.env` file in the project root:

```bash
OPENAI_API_KEY=your_api_key_here
```

Then start the server normally.

## Optional Google Search and Local Weather Integration

To enable Google Custom Search and GPS-based weather, add these environment variables:

```bash
OPENWEATHER_API_KEY=your_openweathermap_api_key
GOOGLE_SEARCH_API_KEY=your_google_custom_search_api_key
GOOGLE_CSE_ID=your_google_custom_search_engine_id
```

When provided, the app will use Google Custom Search for web results and local geolocation to retrieve weather data.
