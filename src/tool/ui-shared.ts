import { DEFAULT_STATE, TARGETS, type ToolState } from './types';

export const TARGET_VALUES: { value: ToolState['target']; label: string }[] = TARGETS;

export function isState(value: unknown): value is ToolState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<ToolState>;
  return typeof v.status === 'number' && Number.isInteger(v.status) && DEFAULT_STATE !== undefined;
}
