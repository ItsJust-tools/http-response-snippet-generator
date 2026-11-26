import type { ToolConfig } from '@itsjust/core';
import packageJson from '../../package.json';

export const templateBaseVersion = packageJson.version;

const toolConfig = {
  id: 'http-response-snippet-generator',
  name: 'HTTP Response Snippet Generator',
  description:
    'Wrap an HTTP status code and custom headers into ready-to-paste error-handling snippets for fetch, axios, Express, cURL and Python requests, with optional retry logic.',
  version: '1.0.0',
  exportFormats: ['json', 'png', 'jpeg', 'webp', 'pdf'],
  features: {
    export: true,
    autoSave: true,
    undoRedo: true,
    sidebar: true,
    statusBar: true,
    darkMode: true,
  },
  theme: {
    accent: '#0ea5e9',
    accentHover: '#0284c7',
    accentSubtle: 'rgba(14, 165, 233, 0.08)',
    brand: 'Response Snippets',
    icon: '⇄',
  },
  shortcuts: [
    {
      title: 'HTTP Response Snippet Generator',
      shortcuts: [
        {
          keys: 'Ctrl+Enter',
          label: 'Regenerate snippets',
          description: 'rebuild the snippet output from the current inputs',
        },
        {
          keys: 'Ctrl+S',
          label: 'Save snippet',
          description: 'pin the current snippet to the saved list',
        },
        {
          keys: 'Ctrl+Shift+C',
          label: 'Clear all',
          description: 'reset status, headers and snippet options',
        },
        {
          keys: 'Ctrl+Shift+E',
          label: 'Export report',
          description: 'download the current snippets as a JSON report',
        },
      ],
    },
  ],
} satisfies ToolConfig;

export default toolConfig;
