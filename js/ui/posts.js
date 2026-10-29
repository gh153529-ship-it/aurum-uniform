/* Thẻ bài viết (trang chủ, trang tin tức, bài liên quan) */
import { esc, fmtDate } from '../core/utils.js';
import { postUrl } from '../core/links.js';

const BASE = location.pathname.includes('/admin/') ? '../' : '';

export function postCover(x, cls = '') {
  return `<div class="post-cover ${cls}">
    <span class="post-cover-ph">${esc(x.title)}</span>
    ${x.image ? `<img src="${BASE}${esc(x.image)}" alt="${esc(x.title)}" width="800" height="450" loading="lazy" decoding="async" data-img>` : ''}
  </div>`;
}

export function postCard(x) {
  return `<article class="post-card">
    <a href="${postUrl(x)}">${postCover(x)}</a>
    <div class="post-card-body">
      <time datetime="${esc(x.created_at)}">${fmtDate(x.created_at)}</time>
      <h3><a href="${postUrl(x)}">${esc(x.title)}</a></h3>
      <p>${esc(x.summary)}</p>
      <a href="${postUrl(x)}" class="link">Đọc tiếp →</a>
    </div>
  </article>`;
}
