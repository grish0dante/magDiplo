import { reactive } from 'vue';
import api from './api';

export const session = reactive({
  user: null,
  token: localStorage.getItem('mc_token') || '',
});

export function setSession(data) {
  session.user = data.user;
  session.token = data.token;
  localStorage.setItem('mc_token', data.token);
}

export function logout() {
  session.user = null;
  session.token = '';
  localStorage.removeItem('mc_token');
}

export async function restoreSession() {
  if (!session.token) return;

  try {
    session.user = (await api.get('/auth/me')).data.user;
  } catch {
    logout();
  }
}
