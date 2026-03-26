const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;;

export async function login(email, password) {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof payload === 'string'
      ? payload
      : payload.message || 'Login failed';
    throw new Error(message);
  }

  localStorage.setItem('accessToken', payload.accessToken);
  localStorage.setItem('userId', payload.userId);
  localStorage.setItem('userEmail', payload.email);
  localStorage.setItem('userRole', payload.role);

  return payload;
}

export function logout() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('userId');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('userRole');
}

export function getAccessToken() {
  return localStorage.getItem('accessToken');
}

export function getCurrentUser() {
  return {
    userId: localStorage.getItem('userId'),
    email: localStorage.getItem('userEmail'),
    role: localStorage.getItem('userRole'),
  };
}
