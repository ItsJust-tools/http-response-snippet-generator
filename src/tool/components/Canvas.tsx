'use client';

import React from 'react';
import { generateSnippet, statusFor, summaryText } from '../tool-definition';
import { STATUS_LIST, TARGETS, type ToolState } from '../types';

interface CanvasProps {
  state: ToolState;
  onChange?: (state: ToolState) => void;
  onSaveHistory?: (text: string) => void;
}

const inputClass =
  'mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100';

function CopyButton({ value, testid }: { value: string; testid?: string }) {
  const [copied, setCopied] = React.useState(false);
  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable; ignore
    }
  }, [value]);
  return (
    <button
      type="button"
      onClick={handleCopy}
      data-testid={testid}
      className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
      aria-label="Copy snippet"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

const TARGET_LABEL: Record<string, string> = Object.fromEntries(
  TARGETS.map((t) => [t.value, t.label])
);

export const Canvas: React.FC<CanvasProps> = ({ state, onChange, onSaveHistory }) => {
  const update = (patch: Partial<ToolState>) => onChange?.({ ...state, ...patch });
  const [statusQuery, setStatusQuery] = React.useState('');
  const snippet = React.useMemo(() => generateSnippet(state), [state]);
  const info = statusFor(state.status);

  const filteredStatuses = React.useMemo(() => {
    const q = statusQuery.trim().toLowerCase();
    if (!q) return STATUS_LIST;
    return STATUS_LIST.filter(
      (s) => String(s.code).includes(q) || s.name.toLowerCase().includes(q)
    );
  }, [statusQuery]);

  return (
    <div className="p-4 space-y-6 overflow-y-auto h-full" data-testid="snippet-canvas">
      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Snippet target"
        data-testid="target-tabs"
      >
        {TARGETS.map((t) => (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={state.target === t.value}
            data-testid={`target-tab-${t.value}`}
            onClick={() => update({ target: t.value })}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
              state.target === t.value
                ? 'border-sky-500 bg-sky-50 text-sky-800 dark:bg-sky-900/40 dark:text-sky-100'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2" data-testid="status-picker">
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
            Status code
            <select
              value={state.status}
              onChange={(e) => update({ status: Number(e.target.value) })}
              data-testid="select-status"
              className={inputClass}
            >
              {STATUS_LIST.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.code} {s.name}
                </option>
              ))}
            </select>
          </label>
          <p
            className="mt-1 text-xs text-gray-500 dark:text-gray-400"
            data-testid="status-description"
          >
            {info.description}
          </p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
            Filter registry
            <input
              type="text"
              value={statusQuery}
              onChange={(e) => setStatusQuery(e.target.value)}
              data-testid="input-status-filter"
              placeholder="e.g. 429 or too many"
              className={inputClass}
            />
          </label>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400" data-testid="filter-count">
            {filteredStatuses.length} of {STATUS_LIST.length} statuses
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2" data-testid="retry-controls">
        <label className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={state.includeRetry}
            onChange={(e) => update({ includeRetry: e.target.checked })}
            data-testid="input-include-retry"
          />
          Include Retry-After retry block
        </label>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
          Retry-After (seconds)
          <input
            type="text"
            inputMode="numeric"
            value={state.retryAfterSeconds}
            onChange={(e) => update({ retryAfterSeconds: e.target.value })}
            data-testid="input-retry-after"
            className={inputClass}
          />
        </label>
      </div>

      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
        Error message
        <input
          type="text"
          value={state.message}
          onChange={(e) => update({ message: e.target.value })}
          data-testid="input-message"
          className={inputClass}
        />
      </label>

      <div
        className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
        data-testid="result-card"
        role="status"
      >
        <span className="mb-2 block text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400">
          Snippet — {TARGET_LABEL[state.target] ?? state.target}
        </span>
        <span className="flex items-center justify-between gap-2">
          <span
            className="block font-mono text-xs whitespace-pre-wrap text-gray-800 dark:text-gray-200"
            data-testid="snippet-output"
          >
            {snippet}
          </span>
          <CopyButton value={snippet} testid="copy-snippet" />
        </span>
        <span
          className="mt-2 block text-xs text-gray-600 dark:text-gray-300"
          data-testid="result-summary"
        >
          {summaryText(state)}
        </span>
        <button
          type="button"
          data-testid="btn-save-history"
          onClick={() => onSaveHistory?.(summaryText(state))}
          className="mt-3 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Save to history
        </button>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          History
        </h3>
        {state.history.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400" data-testid="history-empty">
            No saved snippets yet.
          </p>
        ) : (
          <ul className="space-y-1" data-testid="history-list">
            {state.history.map((entry, i) => (
              <li
                key={`${entry.createdAt}-${i}`}
                className="flex items-center justify-between gap-2 rounded-md border border-gray-200 px-3 py-1.5 text-xs dark:border-gray-800"
              >
                <span className="text-gray-700 dark:text-gray-300">{entry.text}</span>
                <CopyButton value={entry.text} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-center text-xs text-gray-500 dark:text-gray-400">
        All snippets are generated locally in your browser; nothing is uploaded.
      </p>
    </div>
  );
};
