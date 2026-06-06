import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('server route contract', () => {
  it('keeps form search routes uncached so each submitted value is handled independently', () => {
    const server = readFileSync(new URL('../server/server.js', import.meta.url), 'utf8');

    expect(server).not.toContain('apicache');
    expect(server).toContain("app.post('/getNews', getNews)");
    expect(server).toContain("app.post('/getTicker', getTicker)");
  });
});
