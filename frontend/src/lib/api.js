export const ORIGIN = 'http://127.0.0.1:8000';
export const API = `${ORIGIN}/api`;

/** Turns a backend path such as /api/files/... into a full URL. */
export function absUrl(path) {
  if (!path) return '';
  return path.startsWith('http') ? path : `${ORIGIN}${path}`;
}

function errorMessage(data, status) {
  if (data && typeof data.detail === 'string') return data.detail;
  if (data && Array.isArray(data.detail)) return data.detail.map((d) => d.msg).join(', ');
  return `Request failed (${status})`;
}

/** JSON API call. Pass `form` (FormData) for uploads. Throws an Error with .status on failure. */
export async function api(path, { method = 'GET', body, token, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) {
    payload = form;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  let response;
  try {
    response = await fetch(API + path, { method, headers, body: payload });
  } catch {
    const error = new Error('Cannot reach the server. Check that the backend is running.');
    error.status = 0;
    throw error;
  }
  const isJson = (response.headers.get('content-type') || '').includes('application/json');
  const data = isJson ? await response.json() : null;
  if (!response.ok) {
    const error = new Error(errorMessage(data, response.status));
    error.status = response.status;
    throw error;
  }
  return data;
}

/** Downloads a protected or public file with the login token and saves it locally. */
export async function download(path, token, filename) {
  const response = await fetch(absUrl(path), { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(errorMessage(data, response.status));
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || 'download';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Builds a FormData object from a plain object and optional file fields. */
export function formData(fields = {}, files = {}) {
  const form = new FormData();
  Object.entries(fields).forEach(([key, value]) => form.append(key, value ?? ''));
  Object.entries(files).forEach(([key, value]) => {
    if (Array.isArray(value)) value.forEach((file) => form.append(key, file));
    else if (value) form.append(key, value);
  });
  return form;
}
