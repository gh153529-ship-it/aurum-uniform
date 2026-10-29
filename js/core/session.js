/* Phiên đăng nhập: token lưu ở localStorage, thông tin người dùng lấy từ API */
import { api } from './api.js';
import { KEYS } from './config.js';

export class Auth {
  static #user;               // undefined = chưa hỏi server

  static get token() { return localStorage.getItem(KEYS.token); }

  static async current() {
    if (!Auth.token) return null;
    if (Auth.#user !== undefined) return Auth.#user;
    try {
      Auth.#user = (await api.auth.me()).user;
    } catch (e) {
      if (e.status === 401 || e.status === 403) { localStorage.removeItem(KEYS.token); Auth.#user = null; }
      else throw e;
    }
    return Auth.#user;
  }

  static async login(email, password) {
    const { token, user } = await api.auth.login(email, password);
    localStorage.setItem(KEYS.token, token);
    Auth.#user = user;
    return user;
  }

  static logout() {
    localStorage.removeItem(KEYS.token);
    Auth.#user = null;
  }

  static async isAdmin() {
    const u = await Auth.current().catch(() => null);
    return !!u && u.role === 'admin';
  }
}
