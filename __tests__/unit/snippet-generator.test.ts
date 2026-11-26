import { describe, it, expect } from 'vitest';
import {
  generateSnippet,
  buildRequest,
  parseStatus,
  statusFor,
  summaryText,
  deserializeState,
  serializeState,
  withHistory,
  roundTrips,
  httpResponseSnippetGeneratorTool,
} from '@/tool/tool-definition';
import { DEFAULT_STATE, MAX_HISTORY, STATUS_LIST, type ToolState } from '@/tool/types';

const state = (patch: Partial<ToolState> = {}): ToolState => ({ ...DEFAULT_STATE, ...patch });

describe('parseStatus', () => {
  it('accepts valid standard and custom codes', () => {
    expect(parseStatus(200)).toBe(200);
    expect(parseStatus(429)).toBe(429);
    expect(parseStatus('404')).toBe(404);
    expect(parseStatus(599)).toBe(599);
    expect(parseStatus(100)).toBe(100);
  });

  it('rejects non-integer or out-of-range values', () => {
    expect(parseStatus(99)).toBeNull();
    expect(parseStatus(600)).toBeNull();
    expect(parseStatus(40.5)).toBeNull();
    expect(parseStatus('abc')).toBeNull();
    expect(parseStatus('')).toBeNull();
    expect(parseStatus(undefined)).toBeNull();
    expect(parseStatus(null)).toBeNull();
  });
});

describe('statusFor', () => {
  it('returns registry info for known codes', () => {
    expect(statusFor(429).name).toBe('Too Many Requests');
    expect(statusFor(404).description).toContain('resource');
  });

  it('falls back for custom codes', () => {
    const info = statusFor(599);
    expect(info.code).toBe(599);
    expect(info.name).toBe('5xx');
    expect(info.description).toContain('Non-registry');
  });

  it('covers the full registry with unique codes', () => {
    const codes = STATUS_LIST.map((s) => s.code);
    expect(new Set(codes).size).toBe(codes.length);
    codes.forEach((c) => {
      expect(statusFor(c).code).toBe(c);
      expect(statusFor(c).name.length).toBeGreaterThan(0);
    });
  });
});

describe('generateSnippet', () => {
  it('emits a fetch snippet with the configured status', () => {
    const out = generateSnippet(state({ target: 'fetch', status: 429 }));
    expect(out).toContain('response.status === 429');
    expect(out).toContain('Too Many Requests');
  });

  it('emits an axios snippet with try/catch and status check', () => {
    const out = generateSnippet(state({ target: 'axios', status: 404 }));
    expect(out).toContain('error.response?.status === 404');
    expect(out).toContain('Not Found');
  });

  it('emits an Express snippet that sets headers and status', () => {
    const out = generateSnippet(state({ target: 'express', status: 500 }));
    expect(out).toContain('res.status(500)');
    expect(out).toContain('res.set("content-type", "application/json")');
  });

  it('emits a cURL snippet with headers and expected status', () => {
    const out = generateSnippet(state({ target: 'curl', status: 503 }));
    expect(out).toContain('curl -i');
    expect(out).toContain('"retry-after: 30"');
    expect(out).toContain('503 Service Unavailable');
  });

  it('emits a Python requests snippet with status check', () => {
    const out = generateSnippet(state({ target: 'python', status: 401 }));
    expect(out).toContain('response.status_code == 401');
    expect(out).toContain('Unauthorized');
  });

  it('includes the retry block only when enabled', () => {
    const withRetry = generateSnippet(state({ target: 'fetch', includeRetry: true }));
    expect(withRetry).toContain('retry-after');

    const noRetry = generateSnippet(state({ target: 'fetch', includeRetry: false }));
    expect(noRetry).toContain('response.status === 429');
    expect(noRetry).not.toMatch(/retry/);

    const pyRetry = generateSnippet(state({ target: 'python', includeRetry: true }));
    expect(pyRetry).toContain('time.sleep');
    const pyNoRetry = generateSnippet(state({ target: 'python', includeRetry: false }));
    expect(pyNoRetry).not.toContain('time.sleep');
  });

  it('uses Retry-After seconds in generated retry code', () => {
    const out = generateSnippet(state({ target: 'fetch', retryAfterSeconds: '120' }));
    expect(out).toContain('?? 120');
  });

  it('handles empty history and long messages', () => {
    const long = 'x'.repeat(500);
    const out = generateSnippet(state({ message: long, target: 'express' }));
    expect(out).toContain(long);
  });

  it('every target produces non-empty output', () => {
    (['fetch', 'axios', 'express', 'curl', 'python'] as const).forEach((t) => {
      expect(generateSnippet(state({ target: t })).length).toBeGreaterThan(50);
    });
  });
});

describe('buildRequest', () => {
  it('normalizes retry seconds and clamps invalid values to defaults', () => {
    expect(buildRequest(state({ retryAfterSeconds: '45' })).retryAfterSeconds).toBe(45);
    expect(buildRequest(state({ retryAfterSeconds: 'abc' })).retryAfterSeconds).toBe(30);
    expect(buildRequest(state({ retryAfterSeconds: '-5' })).retryAfterSeconds).toBe(30);
    expect(buildRequest(state({ retryAfterSeconds: '999999' })).retryAfterSeconds).toBe(30);
  });

  it('passes through status, target, headers and message', () => {
    const s = state({ status: 503, target: 'curl', message: 'Down' });
    const req = buildRequest(s);
    expect(req.status).toBe(503);
    expect(req.target).toBe('curl');
    expect(req.message).toBe('Down');
    expect(req.headers).toEqual(DEFAULT_STATE.headers);
  });
});

describe('summaryText', () => {
  it('summarizes status and target label', () => {
    expect(summaryText(state({ target: 'python', status: 404 }))).toBe(
      '404 Not Found → Python requests'
    );
    expect(summaryText(state({ target: 'fetch' }))).toBe('429 Too Many Requests → fetch');
  });
});

describe('serialize / deserialize round-trip', () => {
  it('round-trips full state exactly', () => {
    const full = state({
      status: 503,
      target: 'curl',
      includeRetry: false,
      retryAfterSeconds: '60',
      message: ' maintenance',
      history: withHistory(state(), '503 Service Unavailable → cURL').history,
    });
    expect(roundTrips(full)).toBe(true);
  });

  it('round-trips default state', () => {
    expect(roundTrips(DEFAULT_STATE)).toBe(true);
  });

  it('deserialize repairs invalid payloads to defaults', () => {
    const r = deserializeState({ nope: true });
    expect(r.success).toBe(true);
    if (!r.success) throw new Error('unreachable');
    expect(r.data.status).toBe(DEFAULT_STATE.status);
    expect(r.data.target).toBe(DEFAULT_STATE.target);
    expect(r.data.headers).toEqual([]);
    expect(r.data.history).toEqual([]);
  });

  it('deserialize rejects wrong shapes', () => {
    expect(deserializeState(null).success).toBe(false);
    expect(deserializeState([1, 2]).success).toBe(false);
    expect(deserializeState('str').success).toBe(false);
  });

  it('deserialize validates enums and status range', () => {
    const badTarget = deserializeState({ ...DEFAULT_STATE, target: 'sql' });
    expect(badTarget.success).toBe(true);
    if (badTarget.success) expect(badTarget.data.target).toBe('fetch');

    const badStatus = deserializeState({ ...DEFAULT_STATE, status: 42 });
    if (badStatus.success) expect(badStatus.data.status).toBe(DEFAULT_STATE.status);

    const ok = deserializeState({ ...DEFAULT_STATE, status: 200 });
    if (ok.success) expect(ok.data.status).toBe(200);
  });

  it('deserialize filters invalid headers', () => {
    const r = deserializeState({
      ...DEFAULT_STATE,
      headers: [
        { name: 'content-type', value: 'application/json' },
        { name: 'x-evil', value: 'nope' },
        { name: 'retry-after', value: '9' },
        'garbage',
      ],
    });
    expect(r.success).toBe(true);
    if (!r.success) throw new Error('unreachable');
    expect(r.data.headers).toEqual([
      { name: 'content-type', value: 'application/json' },
      { name: 'retry-after', value: '9' },
    ]);
  });

  it('deserialize drops malformed history entries and caps length', () => {
    const overflow = Array.from({ length: MAX_HISTORY + 5 }, (_, i) => ({
      text: `s-${i}`,
      createdAt: `2026-01-0${(i % 9) + 1}T00:00:0${i % 9}.000Z`,
    }));
    const r = deserializeState({
      ...DEFAULT_STATE,
      history: [
        ...overflow,
        { text: 1 as unknown as string, createdAt: null as unknown as string },
      ],
    });
    expect(r.success).toBe(true);
    if (!r.success) throw new Error('unreachable');
    expect(r.data.history).toHaveLength(MAX_HISTORY);
    expect(r.data.history[0]?.text).toBe('s-0');
  });

  it('serialize emits stable JSON with all keys', () => {
    const out = serializeState(DEFAULT_STATE);
    expect(JSON.parse(out)).toEqual({
      status: DEFAULT_STATE.status,
      target: 'fetch',
      includeRetry: true,
      retryAfterSeconds: DEFAULT_STATE.retryAfterSeconds,
      headers: DEFAULT_STATE.headers,
      message: DEFAULT_STATE.message,
      history: [],
    });
    expect(serializeState(DEFAULT_STATE)).toBe(serializeState(DEFAULT_STATE));
  });

  it('withHistory caps history at MAX_HISTORY', () => {
    let s = state();
    for (let i = 0; i < MAX_HISTORY + 3; i++) {
      s = withHistory(s, `entry-${i}`, new Date(2026, 0, 1, 0, 0, i));
    }
    expect(s.history).toHaveLength(MAX_HISTORY);
    expect(s.history[0]?.text).toBe(`entry-${MAX_HISTORY + 2}`);
  });
});

describe('httpResponseSnippetGeneratorTool', () => {
  it('exposes identity and exporters', async () => {
    expect(httpResponseSnippetGeneratorTool.id).toBe('http-response-snippet-generator');
    expect(httpResponseSnippetGeneratorTool.name).toBe('HTTP Response Snippet Generator');
    expect(httpResponseSnippetGeneratorTool.exporters).toHaveLength(4);
    const first = httpResponseSnippetGeneratorTool.exporters?.[0];
    expect(first).toBeDefined();
    if (!first) throw new Error('missing exporter');
    const png = await first.loader();
    const resolved = 'default' in png ? png.default : png.exporter;
    expect(resolved.format).toBe('png');
  });

  it('uses initialState matching DEFAULT_STATE', () => {
    expect(httpResponseSnippetGeneratorTool.initialState).toEqual(DEFAULT_STATE);
  });

  it('deserialize is used by the Tool contract and repairs garbage', () => {
    const r = httpResponseSnippetGeneratorTool.deserialize({ status: 9999 });
    expect(r.success).toBe(true);
    if (!r.success) throw new Error('unreachable');
    expect(r.data.status).toBe(DEFAULT_STATE.status);
  });
});
