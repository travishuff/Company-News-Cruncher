import { describe, expect, it } from 'bun:test';

import { createAppController } from '../server/controllers.ts';
import type { NewsResponse } from '../server/controllers.ts';
import { invokeController } from './helpers.ts';

describe('news analysis controller', () => {
  it('returns the UI response shape for a company search', async () => {
    const controller = createAppController({
      fetchNews: async () => ({
        title: 'Apple shares rise after product launch',
        url: 'https://example.com/apple-news',
        publishedAt: 'Fri, 05 Jun 2026 17:43:53 GMT',
      }),
    });

    const { body, status } = await invokeController<NewsResponse>(controller.getNews, { company: 'Apple' });

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
    const controller = createAppController();

    const { body, status } = await invokeController<{ error: string }>(controller.getNews, {});

    expect(status).toBe(400);
    expect(body).toEqual({
      error: 'Company is required.',
    });
  });
});
