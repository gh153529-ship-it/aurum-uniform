/* =========================================================
   Lớp gọi API (Fetch + async/await)
   Mọi trang đều đi qua đây – không có dữ liệu giả trong trình duyệt.
   ========================================================= */
import { API_BASE, KEYS } from './config.js';

export class ApiError extends Error {
  constructor(message, status = 0, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.fieldErrors = (data && data.errors) || {};
  }
}

class ApiClient {
  constructor(base) { this.base = base; }

  get token() { return localStorage.getItem(KEYS.token); }

  async request(method, path, { params, body, withTotal = false } = {}) {
    const url = new URL(this.base + path, location.href);
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') return;
      [].concat(v).forEach(x => url.searchParams.append(k, x));
    });

    const headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (this.token) headers.Authorization = `Bearer ${this.token}`;

    let res;
    try {
      res = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    } catch {
      throw new ApiError('Không kết nối được máy chủ API. Hãy chạy "npm start" rồi mở http://localhost:3000');
    }
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new ApiError((data && data.message) || `Lỗi ${res.status}`, res.status, data);
    return withTotal ? { items: data, total: Number(res.headers.get('X-Total-Count')) || (data || []).length } : data;
  }

  get(path, params) { return this.request('GET', path, { params }); }
  post(path, body) { return this.request('POST', path, { body }); }
  put(path, body) { return this.request('PUT', path, { body }); }
  patch(path, body) { return this.request('PATCH', path, { body }); }
  delete(path) { return this.request('DELETE', path); }
}

/** CRUD chuẩn REST cho một resource */
class Resource {
  constructor(client, name) { this.client = client; this.path = '/' + name; }
  list(params) { return this.client.get(this.path, params); }
  page(params) { return this.client.request('GET', this.path, { params, withTotal: true }); }
  get(id, params) { return this.client.get(`${this.path}/${id}`, params); }
  create(data) { return this.client.post(this.path, data); }
  update(id, data) { return this.client.put(`${this.path}/${id}`, data); }
  patch(id, data) { return this.client.patch(`${this.path}/${id}`, data); }
  remove(id) { return this.client.delete(`${this.path}/${id}`); }
}

class OrderResource extends Resource {
  checkout(payload) { return this.create(payload); }
  mine() { return this.client.get('/orders/mine'); }
  lookup(code, phone) { return this.client.get('/orders/lookup', { code, phone }); }
  setStatus(id, status) { return this.client.patch(`/orders/${id}/status`, { status }); }
}

const client = new ApiClient(API_BASE);

export const api = {
  client,
  categories: new Resource(client, 'categories'),
  products: new Resource(client, 'products'),
  variants: new Resource(client, 'product_variants'),
  users: new Resource(client, 'users'),
  orders: new OrderResource(client, 'orders'),
  orderDetails: new Resource(client, 'order_details'),
  posts: new Resource(client, 'posts'),
  settings: {
    public: () => client.get('/settings/public'),
    all: () => client.get('/settings'),
    save: (group, data) => client.put(`/settings/${group}`, data)
  },
  auth: {
    login: (email, password) => client.post('/auth/login', { email, password }),
    register: data => client.post('/auth/register', data),
    me: () => client.get('/auth/me')
  },
  stats: period => client.get('/stats', { period }),
  upload: (name, data, folder = 'products') => client.post('/upload', { name, data, folder }),
  resetData: () => client.post('/admin/reset')
};
