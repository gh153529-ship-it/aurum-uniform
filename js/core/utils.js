/* Hàm tiện ích dùng chung (không phụ thuộc module khác) */

export const money = n => (Number(n) || 0).toLocaleString('vi-VN') + '₫';
export const qs = name => new URLSearchParams(location.search).get(name);
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const esc = s => String(s ?? '').replace(/[&<>"']/g, ch =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

/** Bỏ dấu tiếng Việt để tìm kiếm: "áo sơ mi" khớp "ao so mi" */
export const norm = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();

export const slugify = s => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
export const fmtDate = iso => new Date(iso).toLocaleDateString('vi-VN');
export const fmtDateTime = iso => new Date(iso).toLocaleString('vi-VN',
  { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
export const num = n => (Number(n) || 0).toLocaleString('vi-VN');
export const skuOf = id => 'AU-' + String(id).padStart(4, '0');

export const debounce = (fn, wait = 250) => {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
};

export const Valid = {
  email: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v).trim()),
  phone: v => /^0\d{9,10}$/.test(String(v).replace(/\s/g, '')),
  required: v => String(v ?? '').trim().length > 0
};
