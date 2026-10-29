/* Trang danh sách bài viết */
import { $, esc } from '../core/utils.js';
import { api } from '../core/api.js';
import { renderLayout } from '../ui/layout.js';
import { postCard } from '../ui/posts.js';

await renderLayout('blog');

try {
  const posts = await api.posts.list();
  $('#post-list').innerHTML = posts.length ? posts.map(postCard).join('')
    : '<div class="empty" style="grid-column:1/-1"><div class="big">📰</div><h3>Chưa có bài viết</h3></div>';
} catch (e) {
  $('#post-list').innerHTML = `<div class="alert alert-error" style="grid-column:1/-1">${esc(e.message)}</div>`;
}
