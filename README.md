# HTTP Response Snippet Generator

Wrap an HTTP status code with custom headers and turn it into ready-to-paste error-handling snippets for fetch, axios, Express, cURL and Python requests.

**Live:** https://http-response-snippet-generator.itsjust.tools

## Features

- Status code picker covering the standard HTTP registry (200–504) with names and plain-language descriptions
- Registry filter/search by code or name
- Snippet generator for fetch, axios, Express, cURL and Python requests
- Optional Retry-After retry block with configurable delay
- Configurable response headers (Content-Type, Retry-After, Location, Cache-Control, WWW-Authenticate)
- One-click copy of the generated snippet
- Shareable URL: the full snippet configuration round-trips through a state parameter
- Saved snippet history and JSON/image/PDF export

Everything runs locally in the browser; nothing is uploaded.

## Development

```bash
npm ci
npm run dev
```

## Testing

```bash
CI=true npm test -- --coverage
npm run build
```

## Docker

```bash
docker build -t itsjust-http-response-snippet-generator .
docker run -p 3000:3000 itsjust-http-response-snippet-generator
```
