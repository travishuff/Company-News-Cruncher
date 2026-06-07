import type { RequestHandler } from 'express';

type SentimentType = 'positive' | 'negative' | 'neutral';

interface Sentiment {
  type: SentimentType;
  score: string;
}

interface Concept {
  text: string;
  relevance: string;
}

interface NewsArticle {
  title: string;
  url: string;
  publishedAt: string;
}

export interface NewsResponse {
  title: string;
  docSentiment: Sentiment;
  concepts: Concept[];
  sourceUrl: string;
  publishedAt: string;
}

export interface TickerQuote {
  t: string;
  l: string;
  lt: string;
  source: string;
  name?: string;
  change?: string;
  percentChange?: string;
  marketStatus?: string;
}

interface ControllerOptions {
  fetchNews?: (company: string) => Promise<NewsArticle>;
  fetchTicker?: (ticker: string) => Promise<TickerQuote>;
}

interface AppController {
  getNews: RequestHandler;
  getTicker: RequestHandler;
}

interface RequestTextOptions {
  headers?: HeadersInit;
  timeoutMs?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

const POSITIVE_WORDS = new Set([
  'beat',
  'beats',
  'boost',
  'breakthrough',
  'growth',
  'gain',
  'gains',
  'good',
  'higher',
  'launch',
  'profit',
  'profits',
  'record',
  'rise',
  'rises',
  'strong',
  'surge',
  'up',
  'win',
]);

const NEGATIVE_WORDS = new Set([
  'cuts',
  'decline',
  'drop',
  'drops',
  'fall',
  'falls',
  'lawsuit',
  'loss',
  'miss',
  'probe',
  'risk',
  'slump',
  'slowdown',
  'weak',
  'warning',
]);

const STOP_WORDS = new Set([
  'about',
  'after',
  'amid',
  'and',
  'are',
  'company',
  'from',
  'for',
  'into',
  'latest',
  'market',
  'news',
  'over',
  'says',
  'the',
  'with',
]);

function getBodyValue(body: unknown): string {
  if (!body || typeof body !== 'object') return '';
  if (!isRecord(body)) return '';
  if (typeof body.company === 'string') return body.company;
  if (typeof body.ticker === 'string') return body.ticker;
  const firstKey = Object.keys(body)[0];
  return firstKey || '';
}

async function requestText(url: string, options: RequestTextOptions = {}): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, options.timeoutMs || 8000);

  try {
    const response = await fetch(url, {
      headers: options.headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Request failed with ${response.status}`);
    }

    return response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function decodeHtml(value: string): string {
  return String(value || '')
    .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function readXmlTag(xml: string, tagName: string): string {
  const match = xml.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i'));
  const value = match?.[1];
  return value ? decodeHtml(value).trim() : '';
}

function parseFirstNewsItem(rss: string): NewsArticle | null {
  const itemMatch = rss.match(/<item\b[\s\S]*?<\/item>/i);
  if (!itemMatch) return null;

  return {
    title: readXmlTag(itemMatch[0], 'title'),
    url: readXmlTag(itemMatch[0], 'link'),
    publishedAt: readXmlTag(itemMatch[0], 'pubDate'),
  };
}

function normalizeTicker(rawTicker: string): string {
  return String(rawTicker || '')
    .trim()
    .replace(/[^a-z0-9.-]/gi, '')
    .toUpperCase();
}

function sentimentFor(text: string): Sentiment {
  const words = String(text || '').toLowerCase().match(/[a-z]+/g) || [];
  const score = words.reduce((total, word) => {
    if (POSITIVE_WORDS.has(word)) return total + 1;
    if (NEGATIVE_WORDS.has(word)) return total - 1;
    return total;
  }, 0);
  const normalizedScore = words.length ? Math.max(-1, Math.min(1, score / 4)) : 0;

  if (normalizedScore > 0.1) return { type: 'positive', score: normalizedScore.toFixed(2) };
  if (normalizedScore < -0.1) return { type: 'negative', score: normalizedScore.toFixed(2) };
  return { type: 'neutral', score: '0.00' };
}

function conceptsFor(company: string, title: string): Concept[] {
  const candidates = `${company} ${title}`
    .split(/[^a-z0-9.-]+/i)
    .map(word => word.trim())
    .filter(word => word.length > 2 && !STOP_WORDS.has(word.toLowerCase()));

  const unique: string[] = [];
  candidates.forEach(word => {
    if (!unique.some(item => item.toLowerCase() === word.toLowerCase())) unique.push(word);
  });

  return (unique.length ? unique : [company]).slice(0, 5).map((text, index) => ({
    text,
    relevance: (1 - index * 0.12).toFixed(2),
  }));
}

function fallbackNews(company: string): NewsArticle {
  return {
    title: `Latest coverage for ${company}`,
    url: '',
    publishedAt: new Date().toISOString(),
  };
}

function fallbackTicker(ticker: string): TickerQuote {
  return {
    t: ticker,
    l: 'Unavailable',
    lt: new Date().toISOString(),
    source: 'Fallback',
  };
}

function cleanQuoteValue(value: unknown): string {
  const cleaned = String(value || '').replace(/[^0-9.-]/g, '');
  return cleaned || '';
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error('Quote response was not valid JSON', { cause: error });
  }
}

export function parseNasdaqQuote(ticker: string, text: string): TickerQuote {
  const payload = parseJson(text);
  if (!isRecord(payload)) {
    throw new Error('Nasdaq quote response was not an object');
  }

  const data = isRecord(payload.data) ? payload.data : {};
  const primaryData = isRecord(data.primaryData) ? data.primaryData : {};
  const price = cleanQuoteValue(primaryData.lastSalePrice);

  if (!price) {
    throw new Error('Nasdaq quote response did not include a price');
  }

  return {
    t: String(stringValue(data.symbol) || ticker).toUpperCase(),
    l: price,
    lt: stringValue(primaryData.lastTradeTimestamp) || new Date().toISOString(),
    name: stringValue(data.companyName),
    change: cleanQuoteValue(primaryData.netChange),
    percentChange: String(primaryData.percentageChange || '').replace('%', ''),
    marketStatus: stringValue(data.marketStatus),
    source: 'Nasdaq',
  };
}

export function parseTwelveDataQuote(ticker: string, text: string): TickerQuote {
  const payload = parseJson(text);
  if (!isRecord(payload)) {
    throw new Error('Twelve Data quote response was not an object');
  }

  if (payload.status === 'error' || !payload.close) {
    throw new Error(stringValue(payload.message) || 'Twelve Data quote response did not include a price');
  }

  return {
    t: String(stringValue(payload.symbol) || ticker).toUpperCase(),
    l: cleanQuoteValue(payload.close),
    lt: stringValue(payload.datetime) || new Date().toISOString(),
    name: stringValue(payload.name),
    change: cleanQuoteValue(payload.change),
    percentChange: cleanQuoteValue(payload.percent_change),
    marketStatus: payload.is_market_open ? 'Open' : 'Closed',
    source: 'Twelve Data',
  };
}

async function fetchNews(company: string): Promise<NewsArticle> {
  const query = encodeURIComponent(`${company} company`);
  const url = `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;
  const rss = await requestText(url);
  return parseFirstNewsItem(rss) || fallbackNews(company);
}

async function fetchTicker(ticker: string): Promise<TickerQuote> {
  const nasdaqUrl = `https://api.nasdaq.com/api/quote/${encodeURIComponent(ticker)}/info?assetclass=stocks`;

  try {
    const nasdaqText = await requestText(nasdaqUrl, {
      headers: {
        Accept: 'application/json',
        Referer: `https://www.nasdaq.com/market-activity/stocks/${ticker.toLowerCase()}`,
        'User-Agent': 'Mozilla/5.0',
      },
    });
    return parseNasdaqQuote(ticker, nasdaqText);
  } catch {
    const twelveDataUrl = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(ticker)}&apikey=demo`;
    const twelveDataText = await requestText(twelveDataUrl, {
      headers: {
        Accept: 'application/json',
      },
    });
    return parseTwelveDataQuote(ticker, twelveDataText);
  }
}

export function createAppController(options: ControllerOptions = {}): AppController {
  const fetchNewsImpl = options.fetchNews || fetchNews;
  const fetchTickerImpl = options.fetchTicker || fetchTicker;

  return {
    getNews: async (req, res) => {
      const company = getBodyValue(req.body).trim();
      if (!company) {
        res.status(400).json({ error: 'Company is required.' });
        return;
      }

      let article: NewsArticle;
      try {
        article = await fetchNewsImpl(company);
      } catch {
        article = fallbackNews(company);
      }

      const response: NewsResponse = {
        title: article.title,
        docSentiment: sentimentFor(article.title),
        concepts: conceptsFor(company, article.title),
        sourceUrl: article.url,
        publishedAt: article.publishedAt,
      };

      res.json(response);
    },

    getTicker: async (req, res) => {
      const ticker = normalizeTicker(getBodyValue(req.body));
      if (!ticker) {
        res.status(400).json({ error: 'Ticker is required.' });
        return;
      }

      try {
        res.json(await fetchTickerImpl(ticker));
      } catch {
        res.json(fallbackTicker(ticker));
      }
    },
  };
}

const appController = createAppController();
const { getNews, getTicker } = appController;

export { getNews, getTicker };

export const privateTestExports = {
  cleanQuoteValue,
  parseNasdaqQuote,
  parseTwelveDataQuote,
};

export default appController;
