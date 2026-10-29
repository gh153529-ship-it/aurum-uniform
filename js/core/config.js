import { API_URL } from './env.js';

const host = location.hostname;
const isLocal = location.protocol === 'file:' || host === 'localhost' || host === '127.0.0.1';
// Trang do server Node phục vụ luôn có window.__PAGE__ → gọi API cùng địa chỉ (chạy được ở mọi cổng).
// Mở bằng Live Server (cổng 5500...) hoặc file:// → tự trỏ API về http://localhost:3000
const servedByNode = typeof window !== 'undefined' && !!window.__PAGE__;
const autoBase = !servedByNode && isLocal && location.port !== '3000' ? 'http://localhost:3000' : '';

export const API_BASE = (API_URL || autoBase).replace(/\/$/, '') + '/api';

/** Đường dẫn thân thiện (/san-pham/..., /tin-tuc/...) chỉ có khi web chạy bằng server Node (npm start) */
export const PRETTY_URLS = !(API_URL || autoBase);

export const KEYS = Object.freeze({
  token: 'au_token',
  cart: 'au_cart',
  lastOrder: 'au_last_order'
});

export const SIZE_ORDER = ['S', 'M', 'L', 'XL', 'XXL', '3XL', '38', '39', '40', '41', '42', '43'];
export const LOW_STOCK = 50;
