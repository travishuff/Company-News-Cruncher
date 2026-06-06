import { describe, expect, it } from 'bun:test';

import { createWatsonController } from '../server/watson.js';
import { invokeController } from './helpers.js';

describe('news analysis controller', () => {
  it('returns the UI response shape for a company search', async () => {
    const controller = createWatsonController({
      fetchNews: async () => ({
        title: 'Apple shares rise after product launch',
        url: 'https://example.com/apple-news',
        publishedAt: 'Fri, 05 Jun 2026 17:43:53 GMT',
      }),
    });

    const { body, status } = await invokeController(controller.getNews, { company: 'Apple' });

    expect(status).toBe(200);
    expect(body).toMatchObject({
      title: 'Apple shares rise after product launch',
      sourceUrl: 'https://example.com/apple-news',
      publishedAt: 'Fri, 05 Jun 2026 17:43:53 GMT',
    });
    expect(body.docSentiment).toMatchObject({
      type: 'positive',
    });
    expect(body.concepts[0]).toMatchObject({
      text: 'Apple',
      relevance: '1.00',
    });
  });

  it('rejects a missing company', async () => {
    const controller = createWatsonController();

    const { body, status } = await invokeController(controller.getNews, {});

    expect(status).toBe(400);
    expect(body).toEqual({
      error: 'Company is required.',
    });
  });
});
