'use client';

import React from 'react';
import type { HeaderName, HeaderPair, ToolState } from '../types';
import { STATUS_LIST, TARGETS, HEADER_NAMES, DEFAULT_STATE } from '../types';

interface SidebarProps {
  state: ToolState;
  onChange: (next: ToolState) => void;
}

const STATUS_BY_CODE = new Map(STATUS_LIST.map((s) => [s.code, s]));

export const Sidebar: React.FC<SidebarProps> = ({ state, onChange }) => {
  const update = (patch: Partial<ToolState>) => onChange({ ...state, ...patch });

  const setHeader = (i: number, patch: Partial<HeaderPair>) => {
    const next = state.headers.map((h, idx) => (idx === i ? { ...h, ...patch } : h));
    update({ headers: next });
  };

  const removeHeader = (i: number) => {
    update({ headers: state.headers.filter((_, idx) => idx !== i) });
  };

  const addHeader = () => {
    const used = new Set(state.headers.map((h) => h.name));
    const free: HeaderName | undefined = HEADER_NAMES.map((h) => h.value).find(
      (n) => !used.has(n as HeaderName)
    );
    if (!free) return;
    update({ headers: [...state.headers, { name: free, value: '' }] });
  };

  const info = STATUS_BY_CODE.get(state.status);

  return (
    <div className="p-4 space-y-6 text-sm overflow-y-auto h-full" data-testid="snippet-sidebar">
      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Current status</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300" data-testid="sidebar-status">
          {state.status} — {info?.name ?? `${String(state.status)[0]}xx`}
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{info?.description}</p>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Response headers</h3>
        <ul className="space-y-2" data-testid="header-list">
          {state.headers.map((h, i) => (
            <li key={`${h.name}-${i}`} className="flex items-center gap-2">
              <select
                value={h.name}
                onChange={(e) => setHeader(i, { name: e.target.value as HeaderName })}
                data-testid={`header-name-${i}`}
                className="rounded border border-gray-300 bg-white px-1 py-0.5 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              >
                {HEADER_NAMES.map((n) => (
                  <option key={n.value} value={n.value}>
                    {n.label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={h.value}
                onChange={(e) => setHeader(i, { value: e.target.value })}
                data-testid={`header-value-${i}`}
                className="w-24 rounded border border-gray-300 bg-white px-1 py-0.5 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
              <button
                type="button"
                onClick={() => removeHeader(i)}
                data-testid={`header-remove-${i}`}
                aria-label={`Remove ${h.name} header`}
                className="rounded border border-gray-300 px-1 text-xs text-gray-500 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
        {state.headers.length < HEADER_NAMES.length ? (
          <button
            type="button"
            onClick={addHeader}
            data-testid="header-add"
            className="mt-2 rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            + Add header
          </button>
        ) : null}
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Saved snippets</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300" data-testid="sidebar-history-count">
          {state.history.length} entr{state.history.length === 1 ? 'y' : 'ies'} in history
          {state.history.length > 0 ? ' (newest first)' : ''}
        </p>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Targets</h3>
        <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
          {TARGETS.map((t) => (
            <li key={t.value} className="flex justify-between gap-2">
              <span>{t.label}</span>
              <span className="text-gray-500 dark:text-gray-400">
                {state.target === t.value ? 'active' : ''}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Keyboard shortcuts</h3>
        <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
          <li>
            <kbd>F</kbd> — fetch target
          </li>
          <li>
            <kbd>A</kbd> — axios target
          </li>
          <li>
            <kbd>E</kbd> — Express target
          </li>
          <li>
            <kbd>C</kbd> — cURL target
          </li>
          <li>
            <kbd>P</kbd> — Python target
          </li>
          <li>
            <kbd>Y</kbd> — Copy snippet
          </li>
        </ul>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Share</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300">
          Use the toolbar share button to create a URL containing the current status, headers and
          target; open it to restore the exact snippet configuration.
        </p>
      </div>

      <div>
        <button
          type="button"
          onClick={() => onChange({ ...DEFAULT_STATE, history: state.history })}
          data-testid="sidebar-reset"
          className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Reset defaults
        </button>
      </div>
    </div>
  );
};
