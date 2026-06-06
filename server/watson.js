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

function getBodyValue(body) {
  if (!body || typeof body !== 'object') return '';
  if (typeof body.company === 'string') return body.company;
  if (typeof body.ticker === 'string') return body.ticker;
  const firstKey = Object.keys(body)[0];
  return firstKey || '';
}

async function requestText(url, options = {}) {
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

function decodeHtml(value) {
  return String(value || '')
    .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function readXmlTag(xml, tagName) {
  const match = xml.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i'));
  return match ? decodeHtml(match[1]).trim() : '';
}

function parseFirstNewsItem(rss) {
  const itemMatch = rss.match(/<item\b[\s\S]*?<\/item>/i);
  if (!itemMatch) return null;

  return {
    title: readXmlTag(itemMatch[0], 'title'),
    url: readXmlTag(itemMatch[0], 'link'),
    publishedAt: readXmlTag(itemMatch[0], 'pubDate'),
  };
}

function normalizeTicker(rawTicker) {
  return String(rawTicker || '')
    .trim()
    .replace(/[^a-z0-9.-]/gi, '')
    .toUpperCase();
}

function sentimentFor(text) {
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

function conceptsFor(company, title) {
  const candidates = `${company} ${title}`
    .split(/[^a-z0-9.-]+/i)
    .map(word => word.trim())
    .filter(word => word.length > 2 && !STOP_WORDS.has(word.toLowerCase()));

  const unique = [];
  candidates.forEach(word => {
    if (!unique.some(item => item.toLowerCase() === word.toLowerCase())) unique.push(word);
  });

  return (unique.length ? unique : [company]).slice(0, 5).map((text, index) => ({
    text,
    relevance: (1 - index * 0.12).toFixed(2),
  }));
}

function fallbackNews(company) {
  return {
    title: `Latest coverage for ${company}`,
    url: '',
    publishedAt: new Date().toISOString(),
  };
}

function fallbackTicker(ticker) {
  return {
    t: ticker,
    l: 'Unavailable',
    lt: new Date().toISOString(),
    source: 'Fallback',
  };
}

function cleanQuoteValue(value) {
  const cleaned = String(value || '').replace(/[^0-9.-]/g, '');
  return cleaned || '';
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error('Quote response was not valid JSON', { cause: error });
  }
}

export function parseNasdaqQuote(ticker, text) {
  const payload = parseJson(text);
  const data = payload.data || {};
  const primaryData = data.primaryData || {};
  const price = cleanQuoteValue(primaryData.lastSalePrice);

  if (!price) {
    throw new Error('Nasdaq quote response did not include a price');
  }

  return {
    t: String(data.symbol || ticker).toUpperCase(),
    l: price,
    lt: primaryData.lastTradeTimestamp || new Date().toISOString(),
    name: data.companyName || '',
    change: cleanQuoteValue(primaryData.netChange),
    percentChange: String(primaryData.percentageChange || '').replace('%', ''),
    marketStatus: data.marketStatus || '',
    source: 'Nasdaq',
  };
}

export function parseTwelveDataQuote(ticker, text) {
  const payload = parseJson(text);

  if (payload.status === 'error' || !payload.close) {
    throw new Error(payload.message || 'Twelve Data quote response did not include a price');
  }

  return {
    t: String(payload.symbol || ticker).toUpperCase(),
    l: cleanQuoteValue(payload.close),
    lt: payload.datetime || new Date().toISOString(),
    name: payload.name || '',
    change: cleanQuoteValue(payload.change),
    percentChange: cleanQuoteValue(payload.percent_change),
    marketStatus: payload.is_market_open ? 'Open' : 'Closed',
    source: 'Twelve Data',
  };
}

async function fetchNews(company) {
  const query = encodeURIComponent(`${company} company`);
  const url = `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;
  const rss = await requestText(url);
  return parseFirstNewsItem(rss) || fallbackNews(company);
}

async function fetchTicker(ticker) {
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

export function createWatsonController(options = {}) {
  const fetchNewsImpl = options.fetchNews || fetchNews;
  const fetchTickerImpl = options.fetchTicker || fetchTicker;

  return {
    getNews: async (req, res) => {
      const company = getBodyValue(req.body).trim();
      if (!company) {
        res.status(400).json({ error: 'Company is required.' });
        return;
      }

      let article;
      try {
        article = await fetchNewsImpl(company);
      } catch {
        article = fallbackNews(company);
      }

      res.json({
        title: article.title,
        docSentiment: sentimentFor(article.title),
        concepts: conceptsFor(company, article.title),
        sourceUrl: article.url,
        publishedAt: article.publishedAt,
      });
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

const watsonController = createWatsonController();
const { getNews, getTicker } = watsonController;

export { getNews, getTicker };

export const privateTestExports = {
  cleanQuoteValue,
  parseNasdaqQuote,
  parseTwelveDataQuote,
};

export default watsonController;
