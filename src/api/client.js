import { getAccessToken, logout } from './auth';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

export async function authFetch(path, options = {}) {
  const token = getAccessToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    logout();
    throw new Error('Your session has expired. Please log in again.');
  }

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof payload === 'string'
      ? payload
      : payload.message || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload;
}

export async function uploadFile(path, file) {
  const token = getAccessToken();

  const formData = new FormData();
  formData.append('file', file);

  const headers = {
    // Don't set Content-Type - browser will set it with proper boundary
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (response.status === 401) {
    logout();
    throw new Error('Your session has expired. Please log in again.');
  }

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof payload === 'string'
      ? payload
      : payload.message || `Upload failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload;
}
