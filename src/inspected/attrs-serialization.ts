import type { CanvasAttrs } from '../shared/types';

const MAX_ATTR_DEPTH = 4;
const MAX_ATTR_KEYS = 80;
const MAX_ATTR_ARRAY_ITEMS = 80;

function describeDomNode(value: object): string | undefined {
  const candidate = value as { nodeName?: unknown; nodeType?: unknown; tagName?: unknown };

  if (typeof candidate.nodeType !== 'number' || typeof candidate.nodeName !== 'string') {
    return undefined;
  }

  const name = typeof candidate.tagName === 'string' ? candidate.tagName.toLowerCase() : candidate.nodeName;
  return `[Node ${name}]`;
}

function describeSpecialObject(value: object): string | undefined {
  const domDescription = describeDomNode(value);

  if (domDescription) {
    return domDescription;
  }

  const tag = Object.prototype.toString.call(value).slice(8, -1);

  if (tag !== 'Object' && tag !== 'Array') {
    return `[${tag}]`;
  }

  return undefined;
}

function sanitizeArray(value: unknown[], depth: number, seen: WeakSet<object>): unknown[] {
  const result = value.slice(0, MAX_ATTR_ARRAY_ITEMS).map((item) => sanitizeAttrValue(item, depth + 1, seen));
  const omitted = value.length - result.length;

  if (omitted > 0) {
    result.push(`[${omitted} more items]`);
  }

  return result;
}

function sanitizeObject(value: Record<string, unknown>, depth: number, seen: WeakSet<object>): CanvasAttrs {
  const result: CanvasAttrs = {};
  const allKeys = Object.keys(value);
  const keys = allKeys.slice(0, MAX_ATTR_KEYS);

  keys.forEach((key) => {
    result[key] = sanitizeAttrValue(value[key], depth + 1, seen);
  });

  if (allKeys.length > keys.length) {
    result.__devtool_omitted__ = `${allKeys.length - keys.length} more keys`;
  }

  return result;
}

function sanitizeObjectGraph(value: object, depth: number, seen: WeakSet<object>): unknown {
  const description = describeSpecialObject(value);

  if (description) {
    return description;
  }

  if (depth >= MAX_ATTR_DEPTH) {
    return Array.isArray(value) ? `[Array(${value.length})]` : '[Object]';
  }

  seen.add(value);
  const result = Array.isArray(value)
    ? sanitizeArray(value, depth, seen)
    : sanitizeObject(value as Record<string, unknown>, depth, seen);
  seen.delete(value);
  return result;
}

function sanitizeAttrValue(value: unknown, depth: number, seen: WeakSet<object>): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'function') {
    return '[Function]';
  }

  if (typeof value !== 'object') {
    return typeof value === 'bigint' || typeof value === 'symbol' ? String(value) : value;
  }

  if (seen.has(value)) {
    return '[Circular]';
  }

  return sanitizeObjectGraph(value, depth, seen);
}

export function serializeAttrs(attrs: CanvasAttrs | undefined): CanvasAttrs | undefined {
  if (!attrs) {
    return undefined;
  }

  const seen = new WeakSet<object>([attrs]);
  return sanitizeObject(attrs, 0, seen);
}
