document.addEventListener('DOMContentLoaded', () => {
  const newsForm = queryElement<HTMLFormElement>('#news-form');
  const companyInput = queryElement<HTMLInputElement>('#company');
  const newsRoot = queryElement<HTMLElement>('.root');
  const tickerForm = queryElement<HTMLFormElement>('#ticker-form');
  const tickerInput = queryElement<HTMLInputElement>('#ticker');
  const tickerRoot = queryElement<HTMLElement>('.root2');
  const dateRoot = queryElement<HTMLElement>('#date');

  dateRoot.append(Date());

  newsForm.addEventListener('submit', getNewsAnalysis);
  tickerForm.addEventListener('submit', getTickerQuote);
  submitOnEnter(companyInput, newsForm);
  submitOnEnter(tickerInput, tickerForm);

  function preventSubmit(event: SubmitEvent): void {
    event.preventDefault();
  }

  function submitOnEnter(input: HTMLInputElement, form: HTMLFormElement): void {
    input.addEventListener('keydown', event => {
      if (event.key !== 'Enter') return;

      event.preventDefault();
      form.requestSubmit();
    });
  }

  async function postForm<T>(url: string, data: Record<string, string>): Promise<T> {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
      body: new URLSearchParams(data),
    });
    const payload = await response.json();

    if (!response.ok) {
      throw payload as unknown;
    }

    return payload as T;
  }

  function replaceChildren(root: Element, children: Array<Node | null>): void {
    root.replaceChildren(...children.filter((child): child is Node => child !== null));
  }

  function paragraph(text: string): HTMLParagraphElement {
    const element = document.createElement('p');
    element.textContent = text;
    return element;
  }

  function sourceLink(url: string): HTMLParagraphElement | null {
    if (!url) return null;

    const wrapper = document.createElement('p');
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'Read source article';
    wrapper.append(link);
    return wrapper;
  }

  function getErrorMessage(error: unknown, fallback: string): string {
    if (isRecord(error) && typeof error.error === 'string') return error.error;
    return fallback;
  }

  async function getNewsAnalysis(event: SubmitEvent): Promise<void> {
    preventSubmit(event);

    const company = companyInput.value.trim();
    if (!company) {
      replaceChildren(newsRoot, [paragraph('Company is required.')]);
      return;
    }

    companyInput.value = '';
    replaceChildren(newsRoot, [paragraph('Loading news analysis...')]);

    try {
      const message = await postForm<NewsResponse>('/getNews', { company });
      const concepts = message.concepts || [];
      const firstConcept = concepts[0] || { text: 'Unavailable', relevance: '0.00' };
      const sentiment = message.docSentiment || { type: 'neutral', score: '0.00' };

      replaceChildren(newsRoot, [
        paragraph(`Title: ${message.title}`),
        paragraph(`Sentiment: ${sentiment.type}`),
        paragraph(`score: ${sentiment.score}`),
        paragraph(`concept 1: ${firstConcept.text}`),
        paragraph(`relevance: ${firstConcept.relevance}`),
        sourceLink(message.sourceUrl),
      ]);
    } catch (error) {
      replaceChildren(newsRoot, [paragraph(getErrorMessage(error, 'News analysis failed.'))]);
    }
  }

  async function getTickerQuote(event: SubmitEvent): Promise<void> {
    preventSubmit(event);

    const ticker = tickerInput.value.trim();
    if (!ticker) {
      replaceChildren(tickerRoot, [paragraph('Ticker is required.')]);
      return;
    }

    tickerInput.value = '';
    replaceChildren(tickerRoot, [paragraph('Loading quote...')]);

    try {
      const message = await postForm<TickerResponse>('/getTicker', { ticker });
      const change = message.change
        ? `Change: ${message.change}${message.percentChange ? ` (${message.percentChange}%)` : ''}`
        : null;

      replaceChildren(tickerRoot, [
        paragraph(`${message.t} ${message.l}`),
        change ? paragraph(change) : null,
        message.marketStatus ? paragraph(`Market: ${message.marketStatus}`) : null,
        paragraph(message.lt),
        message.source ? paragraph(`Source: ${message.source}`) : null,
      ]);
    } catch (error) {
      replaceChildren(tickerRoot, [paragraph(getErrorMessage(error, 'Ticker lookup failed.'))]);
    }
  }
});

interface NewsResponse {
  title: string;
  sourceUrl: string;
  docSentiment?: {
    type: string;
    score: string;
  };
  concepts?: Array<{
    text: string;
    relevance: string;
  }>;
}

interface TickerResponse {
  t: string;
  l: string;
  lt: string;
  source?: string;
  change?: string;
  percentChange?: string;
  marketStatus?: string;
}

function queryElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Missing required element: ${selector}`);
  }
  return element;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
