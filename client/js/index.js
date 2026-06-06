document.addEventListener('DOMContentLoaded', () => {
  const newsForm = document.querySelector('#news-form');
  const companyInput = document.querySelector('#company');
  const newsRoot = document.querySelector('.root');
  const tickerForm = document.querySelector('#ticker-form');
  const tickerInput = document.querySelector('#ticker');
  const tickerRoot = document.querySelector('.root2');
  const dateRoot = document.querySelector('#date');

  dateRoot.append(Date());

  newsForm.addEventListener('submit', getNewsAnalysis);
  tickerForm.addEventListener('submit', getTickerQuote);
  submitOnEnter(companyInput, newsForm);
  submitOnEnter(tickerInput, tickerForm);

  function preventSubmit(event) {
    event.preventDefault();
  }

  function submitOnEnter(input, form) {
    input.addEventListener('keydown', event => {
      if (event.key !== 'Enter') return;

      event.preventDefault();
      form.requestSubmit();
    });
  }

  async function postForm(url, data) {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
      body: new URLSearchParams(data),
    });
    const payload = await response.json();

    if (!response.ok) {
      throw payload;
    }

    return payload;
  }

  function replaceChildren(root, children) {
    root.replaceChildren(...children.filter(Boolean));
  }

  function paragraph(text) {
    const element = document.createElement('p');
    element.textContent = text;
    return element;
  }

  function sourceLink(url) {
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

  function getErrorMessage(error, fallback) {
    return error && error.error ? error.error : fallback;
  }

  async function getNewsAnalysis(event) {
    preventSubmit(event);

    const company = companyInput.value.trim();
    if (!company) {
      replaceChildren(newsRoot, [paragraph('Company is required.')]);
      return;
    }

    companyInput.value = '';
    replaceChildren(newsRoot, [paragraph('Loading news analysis...')]);

    try {
      const message = await postForm('/getNews', { company });
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

  async function getTickerQuote(event) {
    preventSubmit(event);

    const ticker = tickerInput.value.trim();
    if (!ticker) {
      replaceChildren(tickerRoot, [paragraph('Ticker is required.')]);
      return;
    }

    tickerInput.value = '';
    replaceChildren(tickerRoot, [paragraph('Loading quote...')]);

    try {
      const message = await postForm('/getTicker', { ticker });
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
