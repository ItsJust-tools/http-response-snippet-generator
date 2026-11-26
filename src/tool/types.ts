export type Target = 'fetch' | 'axios' | 'express' | 'curl' | 'python';

export type HeaderName =
  'content-type' | 'retry-after' | 'location' | 'cache-control' | 'www-authenticate';

export interface HeaderPair {
  name: HeaderName;
  value: string;
}

export interface StatusInfo {
  code: number;
  name: string;
  description: string;
}

/** Subset of the standard HTTP status registry relevant for error/snippet handling. */
export const STATUS_LIST: StatusInfo[] = [
  { code: 200, name: 'OK', description: 'Standard success response.' },
  { code: 201, name: 'Created', description: 'Resource created; return a Location header.' },
  { code: 204, name: 'No Content', description: 'Success with an empty body.' },
  {
    code: 301,
    name: 'Moved Permanently',
    description: 'Permanent redirect; clients may cache it.',
  },
  { code: 302, name: 'Found', description: 'Temporary redirect.' },
  { code: 304, name: 'Not Modified', description: 'Cached copy is still fresh.' },
  { code: 400, name: 'Bad Request', description: 'Malformed request syntax or invalid payload.' },
  {
    code: 401,
    name: 'Unauthorized',
    description: 'Authentication missing or invalid; send WWW-Authenticate.',
  },
  {
    code: 403,
    name: 'Forbidden',
    description: 'Authenticated but not allowed to access the resource.',
  },
  { code: 404, name: 'Not Found', description: 'No resource at the requested URI.' },
  {
    code: 405,
    name: 'Method Not Allowed',
    description: 'HTTP method not supported; set Allow header.',
  },
  { code: 408, name: 'Request Timeout', description: 'Client took too long to send the request.' },
  { code: 409, name: 'Conflict', description: 'Request conflicts with current resource state.' },
  { code: 410, name: 'Gone', description: 'Resource permanently removed.' },
  { code: 413, name: 'Content Too Large', description: 'Payload exceeds server limits.' },
  { code: 415, name: 'Unsupported Media Type', description: 'Content-Type not supported.' },
  {
    code: 422,
    name: 'Unprocessable Content',
    description: 'Syntactically valid but semantically invalid.',
  },
  { code: 429, name: 'Too Many Requests', description: 'Rate limit hit; pair with Retry-After.' },
  { code: 500, name: 'Internal Server Error', description: 'Unexpected server-side failure.' },
  { code: 501, name: 'Not Implemented', description: 'Server does not support the functionality.' },
  { code: 502, name: 'Bad Gateway', description: 'Upstream returned an invalid response.' },
  {
    code: 503,
    name: 'Service Unavailable',
    description: 'Temporarily overloaded or down; pair with Retry-After.',
  },
  { code: 504, name: 'Gateway Timeout', description: 'Upstream did not respond in time.' },
];

export const DEFAULT_STATUS = 429;

export const TARGETS: { value: Target; label: string }[] = [
  { value: 'fetch', label: 'fetch' },
  { value: 'axios', label: 'axios' },
  { value: 'express', label: 'Express' },
  { value: 'curl', label: 'cURL' },
  { value: 'python', label: 'Python requests' },
];

export const HEADER_NAMES: { value: HeaderName; label: string }[] = [
  { value: 'content-type', label: 'Content-Type' },
  { value: 'retry-after', label: 'Retry-After' },
  { value: 'location', label: 'Location' },
  { value: 'cache-control', label: 'Cache-Control' },
  { value: 'www-authenticate', label: 'WWW-Authenticate' },
];

export interface ToolState {
  /** Selected HTTP status code. */
  status: number;
  /** Snippet target language/framework. */
  target: Target;
  /** Whether a Retry-After based retry block is included. */
  includeRetry: boolean;
  /** Retry-After delay in seconds. */
  retryAfterSeconds: string;
  /** Configured response headers, newest last. */
  headers: HeaderPair[];
  /** Text shown as the error/message payload in the snippet. */
  message: string;
  /** Saved snippets, newest first. */
  history: HistoryEntry[];
}

export interface HistoryEntry {
  /** Short human readable description of the snippet. */
  text: string;
  /** ISO timestamp when the entry was saved. */
  createdAt: string;
}

export const DEFAULT_STATE: ToolState = {
  status: DEFAULT_STATUS,
  target: 'fetch',
  includeRetry: true,
  retryAfterSeconds: '30',
  headers: [
    { name: 'content-type', value: 'application/json' },
    { name: 'retry-after', value: '30' },
  ],
  message: 'Rate limit exceeded. Try again later.',
  history: [],
};

export const MAX_HISTORY = 20;

export function parseStatus(input: unknown): number | null {
  const n = typeof input === 'number' ? input : Number.parseInt(String(input ?? ''), 10);
  if (!Number.isInteger(n) || n < 100 || n > 599) return null;
  return n;
}

export function statusFor(code: number): StatusInfo {
  return (
    STATUS_LIST.find((s) => s.code === code) ?? {
      code,
      name: `${String(code)[0]}xx`,
      description: 'Non-registry status code.',
    }
  );
}

export function parseRetrySeconds(input: unknown, fallback: number): number {
  const n = typeof input === 'number' ? input : Number.parseInt(String(input ?? ''), 10);
  if (!Number.isInteger(n) || n < 0 || n > 86400) return fallback;
  return n;
}

function validHistory(value: unknown): HistoryEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (entry): entry is HistoryEntry =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as HistoryEntry).text === 'string' &&
        typeof (entry as HistoryEntry).createdAt === 'string'
    )
    .slice(0, MAX_HISTORY);
}
void validHistory;
/** Serialize a snippet generation request into a portable record. */
export function buildRequest(state: ToolState) {
  const retrySeconds = parseRetrySeconds(
    state.retryAfterSeconds,
    parseRetrySeconds(DEFAULT_STATE.retryAfterSeconds, 30)
  );
  return {
    status: state.status,
    target: state.target,
    includeRetry: state.includeRetry,
    retryAfterSeconds: retrySeconds,
    headers: state.headers,
    message: state.message,
  };
}

const q = (s: string): string => JSON.stringify(s);

/** Generate the ready-to-paste snippet for the current state. */
export function generateSnippet(state: ToolState): string {
  const req = buildRequest(state);
  const status = req.status;
  const message = req.message || statusFor(status).name;
  const headers = req.headers.filter(
    (h) =>
      !(h.name === 'retry-after' && !req.includeRetry) ||
      h.name !== 'retry-after' ||
      req.includeRetry
  );
  const list =
    req.includeRetry && !headers.some((h) => h.name === 'retry-after')
      ? [...headers, { name: 'retry-after' as HeaderName, value: String(req.retryAfterSeconds) }]
      : headers;
  const retry = req.includeRetry;

  if (state.target === 'fetch') {
    const headerLines = list.map((h) => `    ${q(h.name)}: ${q(h.value)},`).join('\n');
    return (
      [
        `const response = await fetch(${q('/api/resource')}, {`,
        "  method: 'POST',",
        '  headers: {',
        '    ' + q('content-type') + ': ' + q('application/json') + ',',
        '  },',
        '});',
        '',
        `if (response.status === ${status}) {`,
        `  // ${statusFor(status).name}: ${statusFor(status).description}`,
        `  console.error(${q(message)});` +
          (headerLines ? `\n  // Expected response headers:\n${headerLines}` : ''),
        retry
          ? `  const retryAfter = Number(response.headers.get('retry-after') ?? ${req.retryAfterSeconds});\n  if (retryAfter > 0) {\n    await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));\n  }`
          : '',
        '}',
      ]
        .filter((line) => line !== '')
        .join('\n') + (retry ? '' : '')
    );
  }

  if (state.target === 'axios') {
    const retryBlock = retry
      ? `\n\n// Retry honoring Retry-After\nconst retryAfter = Number(response?.headers['retry-after'] ?? ${req.retryAfterSeconds});\nif (retryAfter > 0) {\n  await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));\n}`
      : '';
    return [
      `import axios from 'axios';`,
      '',
      'try {',
      `  const response = await axios.get(${q('/api/resource')});`,
      '  return response.data;',
      `} catch (error) {`,
      `  if (error.response?.status === ${status}) {`,
      `    // ${statusFor(status).name}: ${statusFor(status).description}`,
      `    console.error(${q(message)});`,
      `    return null;`,
      '  }',
      '  throw error;',
      '}' + retryBlock,
    ].join('\n');
  }

  if (state.target === 'express') {
    const headerLines = list.map((h) => `  res.set(${q(h.name)}, ${q(h.value)});`).join('\n');
    const retryComment = retry
      ? `\n  // Client should wait Retry-After seconds before retrying`
      : '';
    return [
      `app.get(${q('/api/resource')}, (req, res) => {`,
      headerLines ? headerLines + '\n' : '',
      `  res.status(${status}).json({`,
      `    error: ${q(message)},`,
      `    status: ${status},`,
      `  });` + retryComment,
      '});',
    ]
      .filter((line) => line !== '')
      .join('\n');
  }

  if (state.target === 'curl') {
    const headerLines = list.map((h) => `  -H ${q(`${h.name}: ${h.value}`)} \\`).join('\n');
    return [
      `curl -i \\`,
      `  -X POST \\`,
      headerLines,
      `  --data ${q(JSON.stringify({ error: message }))} \\`,
      `  ${q('https://api.example.com/resource')} # -> ${status} ${statusFor(status).name}`,
    ]
      .filter((line) => line !== '' && line !== undefined)
      .join('\n');
  }

  const retryBlock = retry
    ? "\n\n# Honor Retry-After before the next attempt\nretry_after = int(response.headers.get('retry-after', " +
      req.retryAfterSeconds +
      ')\nif retry_after > 0:\n    time.sleep(retry_after)'
    : '';
  const headerLines = list
    .filter((h) => h.name !== 'content-type')
    .map((h) => `    ${q(h.name)}: ${q(h.value)},`)
    .join('\n');
  return (
    [
      'import requests',
      retry ? 'import time' : '',
      '',
      `response = requests.get(${q('https://api.example.com/resource')})`,
      `if response.status_code == ${status}:`,
      `    # ${statusFor(status).name}: ${statusFor(status).description}`,
      `    print(${q(message)})`,
      headerLines ? `    # Expected response headers:\n${headerLines}` : '',
      retry
        ? "    retry_after = int(response.headers.get('retry-after', " +
          req.retryAfterSeconds +
          ')\n    if retry_after > 0:\n        time.sleep(retry_after)'
        : '',
    ]
      .filter((line) => line !== '')
      .join('\n') + retryBlock
  );
}

/** One-line human readable summary of the current state. */
export function summaryText(state: ToolState): string {
  const info = statusFor(state.status);
  return `${state.status} ${info.name} → ${TARGETS.find((t) => t.value === state.target)?.label ?? state.target}`;
}
