/* Trang chủ */
import { $, esc } from '../core/utils.js';
import { api } from '../core/api.js';
import { toProducts } from '../core/models.js';
import { CONFIG } from '../core/pricing.js';
import { renderLayout, productCard } from '../ui/layout.js';
import { productImage } from '../ui/image.js';
import { postCard } from '../ui/posts.js';
import { blogUrl } from '../core/links.js';

const { cats } = await renderLayout('home');
$('#home-blog-link').href = blogUrl();

// Bậc giá sỉ (dữ liệu tĩnh từ CONFIG, không cần chờ API)
$('#tier-list').innerHTML = [...CONFIG.wholesale].reverse().map((t, i) => `
  <div class="tier ${i === 2 ? 'hot' : ''}">
    <b>-${Math.round(t.rate * 100)}%</b>
    <span>${t.label}</span>
  </div>`).join('');

try {
  const [all, featured, latest] = await Promise.all([
    api.products.list().then(toProducts),
    api.products.list({ featured: true, _sort: 'bestseller', _limit: 4 }).then(toProducts),
    api.products.list({ _sort: 'newest', _limit: 4 }).then(toProducts)
  ]);

  const heroP = featured[0] || all[0];
  if (heroP) $('#hero-img').innerHTML = productImage(heroP, { hex: '#c9a54c', src: '' });   // hình minh hoạ, không dùng ảnh nền kem

  $('#home-cats').innerHTML = cats.map(cat => {
    const list = all.filter(p => p.cate_id === cat.id);
    const sample = list[0] || { cate_id: cat.id, name: cat.name, colors: [{ hex: '#1a1a1a' }] };
    return `<a href="products.html?cat=${cat.id}" class="cat-tile">
      ${productImage(sample, { hex: sample.colors[0]?.hex, src: '' })}
      <div><h3>${esc(cat.name)}</h3><span>${list.length} mẫu · Xem ngay →</span></div>
    </a>`;
  }).join('');

  $('#home-featured').innerHTML = featured.map(productCard).join('');
  $('#home-new').innerHTML = latest.map(productCard).join('');
} catch (e) {
  $('#home-featured').innerHTML = `<div class="alert alert-error" style="grid-column:1/-1">${esc(e.message)}</div>`;
}

// Cẩm nang đồng phục – 3 bài viết mới nhất (liên kết nội bộ tốt cho SEO)
try {
  const posts = await api.posts.list({ _limit: 3 });
  $('#home-posts').innerHTML = posts.map(postCard).join('');
} catch { $('#home-posts').closest('section').remove(); }
