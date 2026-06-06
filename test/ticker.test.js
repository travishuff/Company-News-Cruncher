import { describe, expect, it } from 'bun:test';

import { createWatsonController, privateTestExports } from '../server/watson.js';
import { invokeController } from './helpers.js';

describe('ticker quote controller', () => {
  it('parses Nasdaq quote responses into the UI quote shape', () => {
    const quote = privateTestExports.parseNasdaqQuote('AAPL', JSON.stringify({
      data: {
        symbol: 'AAPL',
        companyName: 'Apple Inc. Common Stock',
        marketStatus: 'Closed',
        primaryData: {
          lastSalePrice: '$307.34',
          netChange: '-3.89',
          percentageChange: '-1.25%',
          lastTradeTimestamp: 'Jun 5, 2026',
        },
      },
    }));

    expect(quote).toEqual({
      t: 'AAPL',
      l: '307.34',
      lt: 'Jun 5, 2026',
      name: 'Apple Inc. Common Stock',
      change: '-3.89',
      percentChange: '-1.25',
      marketStatus: 'Closed',
      source: 'Nasdaq',
    });
  });

  it('parses Twelve Data quote responses into the UI quote shape', () => {
    const quote = privateTestExports.parseTwelveDataQuote('AAPL', JSON.stringify({
      symbol: 'AAPL',
      name: 'Apple Inc.',
      datetime: '2026-06-05',
      close: '307.34000',
      change: '-3.89001',
      percent_change: '-1.24988',
      is_market_open: false,
    }));

    expect(quote).toEqual({
      t: 'AAPL',
      l: '307.34000',
      lt: '2026-06-05',
      name: 'Apple Inc.',
      change: '-3.89001',
      percentChange: '-1.24988',
      marketStatus: 'Closed',
      source: 'Twelve Data',
    });
  });

  it('responds to a valid ticker with a stock quote shape', async () => {
    const controller = createWatsonController({
      fetchTicker: async ticker => ({
        t: ticker,
        l: '307.34',
        lt: 'Jun 5, 2026',
        name: 'Apple Inc. Common Stock',
        change: '-3.89',
        percentChange: '-1.25',
        marketStatus: 'Closed',
        source: 'Nasdaq',
      }),
    });

    const { body, status } = await invokeController(controller.getTicker, { ticker: 'aapl' });

    expect(status).toBe(200);
    expect(body).toEqual({
      t: 'AAPL',
      l: '307.34',
      lt: 'Jun 5, 2026',
      name: 'Apple Inc. Common Stock',
      change: '-3.89',
      percentChange: '-1.25',
      marketStatus: 'Closed',
      source: 'Nasdaq',
    });
  });

  it('falls back without breaking the ticker UI contract when providers fail', async () => {
    const controller = createWatsonController({
      fetchTicker: async () => {
        throw new Error('provider unavailable');
      },
    });

    const { body, status } = await invokeController(controller.getTicker, { ticker: 'msft' });

    expect(status).toBe(200);
    expect(body.t).toBe('MSFT');
    expect(body.l).toBe('Unavailable');
    expect(body.source).toBe('Fallback');
    expect(typeof body.lt).toBe('string');
  });

  it('rejects a missing ticker', async () => {
    const controller = createWatsonController();

    const { body, status } = await invokeController(controller.getTicker, {});

    expect(status).toBe(400);
    expect(body).toEqual({
      error: 'Ticker is required.',
    });
  });
});
