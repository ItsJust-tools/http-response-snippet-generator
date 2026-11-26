import type { Tool, DeserializeResult } from '@itsjust/core';
import toolConfig from './tool.config';
import {
  DEFAULT_STATE,
  MAX_HISTORY,
  HEADER_NAMES,
  TARGETS,
  buildRequest,
  generateSnippet,
  parseStatus,
  statusFor,
  summaryText,
  type HeaderPair,
  type HistoryEntry,
  type Target,
  type ToolState,
} from './types';

const VALID_TARGETS: Target[] = TARGETS.map((t) => t.value);

function stringOr(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function validHeadersIn(value: unknown): HeaderPair[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (h): h is HeaderPair =>
        typeof h === 'object' &&
        h !== null &&
        HEADER_NAMES.some((n) => n.value === (h as HeaderPair).name) &&
        typeof (h as HeaderPair).value === 'string'
    )
    .map((h) => ({ name: h.name, value: h.value }));
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

/** Serialize tool state into a compact JSON string for share/import. */
export function serializeState(state: ToolState): string {
  return JSON.stringify({
    status: state.status,
    target: state.target,
    includeRetry: state.includeRetry,
    retryAfterSeconds: state.retryAfterSeconds,
    headers: state.headers,
    message: state.message,
    history: state.history,
  });
}

/** Validate and recover tool state from an arbitrary payload. */
export function deserializeState(data: unknown): DeserializeResult<ToolState> {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return {
      success: false,
      error: 'Invalid data format: expected HTTP response snippet generator state object',
    };
  }
  const v = data as Record<string, unknown>;
  const status = parseStatus(v.status) ?? DEFAULT_STATE.status;
  const target: Target = VALID_TARGETS.includes(v.target as Target)
    ? (v.target as Target)
    : DEFAULT_STATE.target;
  const state: ToolState = {
    status,
    target,
    includeRetry: typeof v.includeRetry === 'boolean' ? v.includeRetry : DEFAULT_STATE.includeRetry,
    retryAfterSeconds: stringOr(v.retryAfterSeconds, DEFAULT_STATE.retryAfterSeconds),
    headers: validHeadersIn(v.headers),
    message: stringOr(v.message, DEFAULT_STATE.message),
    history: validHistory(v.history),
  };
  return { success: true, data: state };
}

/** Append a history entry to state, capped at MAX_HISTORY, newest first. */
export function withHistory(state: ToolState, text: string, now = new Date()): ToolState {
  const entry: HistoryEntry = { text, createdAt: now.toISOString() };
  return { ...state, history: [entry, ...state.history].slice(0, MAX_HISTORY) };
}

/** True when a serialized string round-trips back to the same state. */
export function roundTrips(state: ToolState): boolean {
  try {
    const restored = deserializeState(JSON.parse(serializeState(state)));
    return restored.success && JSON.stringify(restored.data) === JSON.stringify(state);
  } catch {
    return false;
  }
}

export const httpResponseSnippetGeneratorTool: Tool<ToolState> = {
  id: toolConfig.id,
  name: toolConfig.name,
  version: toolConfig.version,
  config: toolConfig,
  initialState: { ...DEFAULT_STATE },
  serialize: serializeState,
  deserialize: deserializeState,
  exporters: [
    { format: 'png', loader: () => import('./exporters/png') },
    { format: 'jpeg', loader: () => import('./exporters/jpeg') },
    { format: 'webp', loader: () => import('./exporters/webp') },
    { format: 'pdf', loader: () => import('./exporters/pdf') },
  ],
};

export {
  buildRequest,
  generateSnippet,
  parseStatus,
  statusFor,
  summaryText,
  DEFAULT_STATE,
  MAX_HISTORY,
};
