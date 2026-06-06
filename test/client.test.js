import { describe, expect, it } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';

describe('client UI contract', () => {
  it('ships the expected entry page and form controls', () => {
    const html = readFileSync(new URL('../client/index.html', import.meta.url), 'utf8');

    expect(html).toContain('Company News Cruncher');
    expect(html).toContain('<form class="subtitle" id="news-form">');
    expect(html).toContain('id="company"');
    expect(html).toContain('id="message-button"');
    expect(html).toContain('<form class="subtitle" id="ticker-form">');
    expect(html).toContain('id="ticker"');
    expect(html).toContain('id="ticker-button"');
  });

  it('wires searches through submit handlers with an Enter-key fallback', () => {
    const script = readFileSync(new URL('../client/js/index.js', import.meta.url), 'utf8');

    expect(script).toContain("document.querySelector('#news-form')");
    expect(script).toContain("document.querySelector('#ticker-form')");
    expect(script).toContain("newsForm.addEventListener('submit', getNewsAnalysis)");
    expect(script).toContain("tickerForm.addEventListener('submit', getTickerQuote)");
    expect(script).toContain('submitOnEnter(companyInput, newsForm)');
    expect(script).toContain('submitOnEnter(tickerInput, tickerForm)');
    expect(script).toContain('form.requestSubmit()');
    expect(script).toContain("postForm('/getNews', { company })");
    expect(script).toContain("postForm('/getTicker', { ticker })");
  });

  it('references existing stylesheet and script assets', () => {
    const html = readFileSync(new URL('../client/index.html', import.meta.url), 'utf8');
    const stylesheetMatch = html.match(/href="([^"]+\.css)"/);
    const scriptMatch = html.match(/src="([^"]+\.js)"/);

    expect(stylesheetMatch?.[1]).toBe('css/statuspage.css');
    expect(scriptMatch?.[1]).toBe('js/index.js');
    expect(existsSync(new URL(`../client/${stylesheetMatch[1]}`, import.meta.url))).toBe(true);
    expect(existsSync(new URL(`../client/${scriptMatch[1]}`, import.meta.url))).toBe(true);
  });

  it('shows an existing screenshot in the README', () => {
    const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
    const screenshotMatch = readme.match(/!\[[^\]]+\]\((client\/img\/CNC-screen\.png)\)/);

    expect(screenshotMatch?.[1]).toBe('client/img/CNC-screen.png');
    expect(existsSync(new URL(`../${screenshotMatch[1]}`, import.meta.url))).toBe(true);
  });
});
