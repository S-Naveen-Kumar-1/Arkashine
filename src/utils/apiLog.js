// src/utils/apiLog.js
//
// In-memory ring buffer of HTTP calls made through the shared axios client
// (see store.js), shown in the debug panel's API tab. Kept outside redux so
// logging every request doesn't re-render the whole app.

import { Buffer } from 'buffer';

const MAX_ENTRIES = 200;
const MAX_BODY_CHARS = 3000;
const SECRET_KEYS = /pass(word)?|token|refresh|secret|otp|aadhaar/i;

let _entries = [];
let _nextId = 1;
const _listeners = new Set();

function _emit() {
  _listeners.forEach(fn => fn(_entries));
}

function _mask(value) {
  if (Array.isArray(value)) return value.map(_mask);
  if (value && typeof value === 'object') {
    const out = {};
    Object.keys(value).forEach(k => {
      out[k] = SECRET_KEYS.test(k) ? '***' : _mask(value[k]);
    });
    return out;
  }
  return value;
}

export function describeBody(body) {
  if (body == null || body === '') return '';
  if (body instanceof ArrayBuffer) {
    // PDF downloads use responseType 'arraybuffer', so a server error page
    // arrives as bytes too — show small non-PDF bodies as text.
    const text = Buffer.from(body).toString('utf8');
    if (body.byteLength > MAX_BODY_CHARS || text.startsWith('%PDF')) {
      return `[binary ${body.byteLength} bytes]`;
    }
    return describeBody(text);
  }
  if (typeof FormData !== 'undefined' && body instanceof FormData) {
    return '[form-data]';
  }
  let text;
  if (typeof body === 'string') {
    try {
      text = JSON.stringify(_mask(JSON.parse(body)), null, 2);
    } catch (_) {
      text = body;
    }
  } else {
    try {
      text = JSON.stringify(_mask(body), null, 2);
    } catch (_) {
      text = String(body);
    }
  }
  return text.length > MAX_BODY_CHARS
    ? `${text.slice(0, MAX_BODY_CHARS)}\n… (${text.length} chars)`
    : text;
}

export function startApiLog(config) {
  const entry = {
    id: _nextId++,
    method: (config.method || 'get').toUpperCase(),
    url: config.url || '',
    params: config.params ? describeBody(config.params) : '',
    request: describeBody(config.data),
    startedAt: Date.now(),
    status: null, // null = pending
    ms: null,
    response: '',
    error: null,
  };
  _entries = [..._entries, entry].slice(-MAX_ENTRIES);
  _emit();
  return entry.id;
}

export function finishApiLog(id, { status, data, error }) {
  _entries = _entries.map(e =>
    e.id === id
      ? {
          ...e,
          status: status ?? 0,
          ms: Date.now() - e.startedAt,
          response: describeBody(data),
          error: error || null,
        }
      : e,
  );
  _emit();
}

export function clearApiLog() {
  _entries = [];
  _emit();
}

export function getApiLog() {
  return _entries;
}

export function subscribeApiLog(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}
