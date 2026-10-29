/* Trang chi tiết bài viết */
import { $, qs, esc, fmtDate } from '../core/utils.js';
import { api } from '../core/api.js';
import { toProducts } from '../core/models.js';
import { blogUrl, postUrl } from '../core/links.js';
import { renderLayout, productCard, shareButtons } from '../ui/layout.js';
import { renderRich, wordCount } from '../ui/rich.js';
import { postCover } from '../ui/posts.js';

const { site } = await renderLayout('blog');

const postId = qs('id') || window.__PAGE__?.id;
let x;
try { x = await api.posts.get(postId); } catch {
  $('#post-root').innerHTML = `<div class="empty" style="margin-top:40px"><div class="big">📰</div>
    <h3>Không tìm thấy bài viết</h3><a href="${blogUrl()}" class="btn btn-dark">Xem tin tức khác</a></div>`;
  throw new Error('stop');
}

document.title = x.seo_title || x.title + ' – AURUM Uniform';
$('#crumbs').innerHTML = `<a href="index.html">Trang chủ</a><span>/</span><a href="${blogUrl()}">Tin tức</a><span>/</span>${esc(x.title)}`;
$('#p-title').textContent = x.title;
$('#p-meta').innerHTML = `<span>✍ ${esc(x.author || 'AURUM Uniform')}</span><span>📅 ${fmtDate(x.created_at)}</span><span>⏱ ${Math.max(1, Math.round(wordCount(x.content) / 220))} phút đọc</span>`;
$('#p-cover').innerHTML = postCover(x, 'post-cover-lg');
$('#p-summary').textContent = x.summary;
$('#p-content').innerHTML = renderRich(x.content);
$('#p-tags').innerHTML = x.tags ? `<div class="post-tags">${x.tags.split(',').map(t => t.trim()).filter(Boolean).map(t => `<span>#${esc(t)}</span>`).join('')}</div>` : '';
$('#p-share').innerHTML = shareButtons(site, x.title);

try {
  const [recent, featured] = await Promise.all([
    api.posts.list({ _limit: 5 }),
    api.products.list({ featured: true, _sort: 'bestseller', _limit: 4 }).then(toProducts)
  ]);
  $('#p-recent').innerHTML = recent.filter(r => r.id !== x.id).slice(0, 4)
    .map(r => `<a href="${postUrl(r)}" class="recent-link"><b>${esc(r.title)}</b><small>${fmtDate(r.created_at)}</small></a>`).join('');
  $('#p-products').innerHTML = featured.map(productCard).join('');
} catch { /* phần phụ, bỏ qua lỗi */ }
