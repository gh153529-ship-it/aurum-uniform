/* Khung ảnh sản phẩm: ảnh thật (WebP) nếu có, không thì hiện hình áo minh hoạ */
import { esc } from '../core/utils.js';

const BASE = location.pathname.includes('/admin/') ? '../' : '';

function shirtSVG(hex = '#1a1a1a', categoryId = 1) {
  const collar = {
    1: '<path d="M84 34 L100 58 L116 34" fill="none" stroke="rgba(199,160,76,.9)" stroke-width="3"/><path d="M100 58 V92" stroke="rgba(199,160,76,.7)" stroke-width="2" stroke-dasharray="2 8"/>',
    2: '<path d="M80 32 L100 62 L120 32" fill="none" stroke="rgba(199,160,76,.9)" stroke-width="3"/><path d="M100 62 V176" stroke="rgba(199,160,76,.55)" stroke-width="2" stroke-dasharray="2 12"/>',
    3: '<path d="M82 32 L100 110 L118 32" fill="none" stroke="rgba(199,160,76,.9)" stroke-width="3"/><path d="M100 110 V178" stroke="rgba(199,160,76,.55)" stroke-width="2"/>',
    4: '<path d="M84 34 Q100 52 116 34" fill="none" stroke="rgba(199,160,76,.9)" stroke-width="3"/>',
    5: '<path d="M84 34 L100 58 L116 34" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="3"/><path d="M60 120 H140 M60 140 H140" stroke="#e9e9e2" stroke-width="7" opacity=".9"/><path d="M78 34 V180 M122 34 V180" stroke="#e9e9e2" stroke-width="6" opacity=".9"/>'
  }[categoryId] || '';
  return `<svg viewBox="0 0 200 200" aria-hidden="true">
    <path d="M70 30 L84 34 Q100 44 116 34 L130 30 L170 54 L156 86 L140 78 L140 180 L60 180 L60 78 L44 86 L30 54 Z"
      fill="${hex}" stroke="rgba(0,0,0,.25)" stroke-width="2" stroke-linejoin="round"/>${collar}</svg>`;
}

/**
 * @param {{image?:string, name?:string, cate_id?:number}} p  sản phẩm (hoặc dòng đơn hàng)
 * @param {{hex?:string, src?:string, cls?:string}} opts       src = ảnh riêng (vd ảnh biến thể)
 */
export function productImage(p, opts = {}) {
  const hex = opts.hex || (p.colors && p.colors[0] ? p.colors[0].hex : '#1a1a1a');
  const src = opts.src !== undefined ? opts.src : p.image;
  const cate = p.cate_id ?? p.categoryId ?? 1;
  return `<div class="pimg ${opts.cls || ''}">
    <div class="pimg-ph">${shirtSVG(hex, cate)}</div>
    ${src ? `<img src="${BASE}${esc(src)}" alt="${esc(p.name || p.product_name || '')}" width="600" height="600" loading="lazy" decoding="async" data-img>` : ''}
  </div>`;
}

/* Ảnh lỗi / chưa có file → bỏ thẻ img để lộ hình áo minh hoạ (không vỡ hình) */
document.addEventListener('error', e => {
  if (e.target instanceof HTMLImageElement && e.target.hasAttribute('data-img')) e.target.remove();
}, true);
