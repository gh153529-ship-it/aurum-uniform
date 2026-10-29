/* Header, footer, thẻ sản phẩm và khối tổng tiền cho trang khách hàng */
import { esc, money, $, $$ } from '../core/utils.js';
import { Auth } from '../core/session.js';
import { Cart } from '../core/cart.js';
import { Catalog } from '../core/catalog.js';
import { CONFIG } from '../core/pricing.js';
import { toast } from './feedback.js';
import { productImage } from './image.js';
import { api } from '../core/api.js';
import { productUrl, blogUrl } from '../core/links.js';
import { Track } from '../core/track.js';

const ICON = {
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  user:   '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
  cart:   '<svg viewBox="0 0 24 24"><path d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h9.2a1 1 0 0 0 1-.8L20 8H6"/><circle cx="9" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/></svg>',
  menu:   '<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  phone:  '<svg viewBox="0 0 24 24"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
  fb:     '<svg viewBox="0 0 24 24" class="fill"><path d="M14 8h3V4h-3c-2.8 0-4.5 1.8-4.5 4.6V11H7v4h2.5v9h4v-9h3l.5-4h-3.5V9c0-.6.4-1 1-1Z"/></svg>',
  chat:   '<svg viewBox="0 0 24 24" class="fill"><path d="M12 2C6.4 2 2 6.1 2 11.3c0 2.9 1.4 5.5 3.7 7.2V22l3.4-1.9c.9.3 1.9.4 2.9.4 5.6 0 10-4.1 10-9.2S17.6 2 12 2Zm1 12.4-2.6-2.7-5 2.7 5.5-5.8 2.6 2.7 5-2.7-5.5 5.8Z"/></svg>'
};

async function renderHeader(active, user, cats) {
  const el = $('#site-header');
  if (!el) return;
  el.className = 'site-header';
  el.innerHTML = `
  <div class="topbar">
    <div class="container topbar-inner">
      <span>✦ Giảm đến <b>15%</b> cho đơn từ 100 áo · Miễn phí giao hàng đơn từ ${money(CONFIG.freeShipFrom)}</span>
      <span class="topbar-right">${ICON.phone} Hotline: <b>1900 6868</b></span>
    </div>
  </div>
  <div class="container nav-inner">
    <button class="icon-btn nav-toggle" aria-label="Mở menu">${ICON.menu}</button>
    <a href="index.html" class="logo"><span class="logo-mark">A</span><span class="logo-text">AURUM<small>UNIFORM</small></span></a>
    <nav class="main-nav">
      <a href="index.html" class="${active === 'home' ? 'active' : ''}">Trang chủ</a>
      <div class="has-drop">
        <a href="products.html" class="${active === 'products' ? 'active' : ''}">Sản phẩm ▾</a>
        <div class="drop">
          <a href="products.html">Tất cả sản phẩm</a>
          ${cats.map(x => `<a href="products.html?cat=${x.id}">${esc(x.name)}</a>`).join('')}
        </div>
      </div>
      <a href="index.html#bang-gia-si">Bảng giá sỉ</a>
      <a href="${blogUrl()}" class="${active === 'blog' ? 'active' : ''}">Tin tức</a>
      <a href="#lien-he">Liên hệ</a>
    </nav>
    <div class="nav-actions">
      <form class="nav-search" action="products.html">
        <input type="search" name="q" placeholder="Tìm áo đồng phục..." aria-label="Tìm kiếm">
        <button aria-label="Tìm">${ICON.search}</button>
      </form>
      <div class="has-drop user-menu">
        <a href="${user ? '#' : 'login.html'}" class="icon-btn" aria-label="Tài khoản">${ICON.user}</a>
        <div class="drop drop-right">
          ${user ? `
            <div class="drop-head">Xin chào,<b>${esc(user.name)}</b></div>
            ${user.role === 'admin' ? '<a href="admin/dashboard.html">Trang quản trị</a>' : ''}
            <a href="#" id="btn-logout">Đăng xuất</a>` : `
            <a href="login.html">Đăng nhập</a>
            <a href="register.html">Đăng ký</a>`}
        </div>
      </div>
      <a href="cart.html" class="icon-btn cart-btn" aria-label="Giỏ hàng">${ICON.cart}<span class="cart-count">0</span></a>
    </div>
  </div>`;

  $('.nav-toggle', el).addEventListener('click', () => el.classList.toggle('nav-open'));
  $('.nav-search', el).addEventListener('submit', e => { const q = e.target.q.value.trim(); if (q) Track.search(q); });
  $('#btn-logout', el)?.addEventListener('click', e => {
    e.preventDefault(); Auth.logout(); toast('Đã đăng xuất');
    setTimeout(() => { location.href = 'index.html'; }, 500);
  });
  Cart.updateBadge();
}

function renderFooter(cats, site) {
  const fb = site?.facebook || {};
  const el = $('#site-footer');
  if (!el) return;
  el.className = 'site-footer';
  el.id = 'lien-he';
  el.innerHTML = `
  <div class="container footer-grid">
    <div>
      <a href="index.html" class="logo"><span class="logo-mark">A</span><span class="logo-text">AURUM<small>UNIFORM</small></span></a>
      <p class="muted">Xưởng may đồng phục công sở cao cấp — thiết kế, may đo và in thêu logo trọn gói cho doanh nghiệp từ năm 2015.</p>
    </div>
    <div>
      <h4>Danh mục</h4>
      ${cats.map(x => `<a href="products.html?cat=${x.id}">${esc(x.name)}</a>`).join('')}
    </div>
    <div>
      <h4>Hỗ trợ</h4>
      <a href="index.html#bang-gia-si">Bảng giá sỉ</a>
      <a href="index.html#quy-trinh">Quy trình đặt may</a>
      <a href="${blogUrl()}">Tin tức – cẩm nang</a>
      <a href="cart.html">Giỏ hàng</a>
      <a href="login.html">Tài khoản</a>
    </div>
    <div>
      <h4>Liên hệ</h4>
      <p>📍 123 Nguyễn Huệ, Q.1, TP. Hồ Chí Minh</p>
      <p>☎ 1900 6868</p>
      <p>✉ sales@aurum.vn</p>
      <p>🕘 8:00 – 20:00 (T2 – CN)</p>
      ${fb.page_url ? `<a href="${esc(fb.page_url)}" target="_blank" rel="noopener" class="social-link">${ICON.fb} Fanpage ${esc(fb.page_name || '')}</a>` : ''}
    </div>
  </div>
  ${fb.page_url && fb.show_page_plugin ? `
  <div class="container fb-band">
    <div><h4>Theo dõi AURUM trên Facebook</h4><p class="muted">Cập nhật mẫu áo mới, ưu đãi và hình ảnh đồng phục khách hàng mỗi tuần.</p></div>
    <iframe title="Fanpage Facebook" loading="lazy" width="340" height="130" style="border:none;overflow:hidden;border-radius:8px;background:#fff"
      src="https://www.facebook.com/plugins/page.php?href=${encodeURIComponent(fb.page_url)}&tabs=&width=340&height=130&small_header=false&adapt_container_width=true&hide_cover=false&show_facepile=true"
      allow="encrypted-media"></iframe>
  </div>` : ''}
  <div class="footer-bottom"><div class="container">© ${new Date().getFullYear()} AURUM Uniform · Website bán áo đồng phục – vanilla JavaScript + REST API</div></div>`;
}

/** Nút nhắn tin Messenger nổi ở góc màn hình */
function renderMessenger(site) {
  const fb = site?.facebook || {};
  if (!fb.show_messenger || !fb.messenger_username) return;
  document.body.insertAdjacentHTML('beforeend',
    `<a class="float-messenger" href="https://m.me/${encodeURIComponent(fb.messenger_username)}" target="_blank" rel="noopener" aria-label="Nhắn tin Messenger">${ICON.chat}<span>Nhắn tin tư vấn</span></a>`);
  $('.float-messenger').addEventListener('click', () => Track.contact('messenger'));
}

/** Dựng header + footer; trả về { user, cats, site } để trang dùng tiếp */
export async function renderLayout(active) {
  let user = null, cats = [], site = null;
  try {
    [user, cats, site] = await Promise.all([Auth.current(), Catalog.categories(), api.settings.public().catch(() => null)]);
  } catch (e) {
    const box = $('main') || document.body;
    box.insertAdjacentHTML('afterbegin', `<div class="container"><div class="alert alert-error" style="margin:24px 0">${esc(e.message)}</div></div>`);
  }
  await renderHeader(active, user, cats);
  renderFooter(cats, site);
  renderMessenger(site);
  return { user, cats, site };
}

/** Nút chia sẻ (Facebook, Messenger, Zalo, sao chép link) – trang chi tiết sản phẩm & bài viết */
export function shareButtons(site, title) {
  const fb = site?.facebook || {};
  if (fb.show_share === false) return '';
  const url = document.querySelector('link[rel=canonical]')?.href || location.href;
  const u = encodeURIComponent(url);
  return `<div class="share-box"><span>Chia sẻ:</span>
    <a class="share fb" href="https://www.facebook.com/sharer/sharer.php?u=${u}" target="_blank" rel="noopener" data-share="facebook">${ICON.fb} Facebook</a>
    <a class="share zalo" href="https://zalo.me/share?url=${u}" target="_blank" rel="noopener" data-share="zalo">Zalo</a>
    <button type="button" class="share copy" data-copy="${esc(url)}" data-share="copy">🔗 Sao chép link</button>
  </div>`;
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-share]');
  if (!b) return;
  Track.share(b.dataset.share, b.dataset.copy || location.href);
  if (b.dataset.copy) { navigator.clipboard?.writeText(b.dataset.copy).then(() => toast('Đã sao chép đường dẫn')); }
});

/** Thẻ sản phẩm (trang chủ, danh sách, sản phẩm liên quan) – p là Product */
export function productCard(p) {
  const colors = p.colors;
  return `<article class="card">
    <a href="${productUrl(p)}" class="card-media">
      ${productImage(p, { hex: colors[0]?.hex })}
      <div class="badges">
        ${p.onSale ? `<span class="badge badge-sale">-${p.discountPercent}%</span>` : ''}
        ${!p.inStock ? '<span class="badge badge-out">Hết hàng</span>' : ''}
      </div>
    </a>
    <div class="card-body">
      <span class="card-cat">${esc(p.category_name)}</span>
      <h3 class="card-title"><a href="${productUrl(p)}">${esc(p.name)}</a></h3>
      <div class="swatches-mini">${colors.map(c => `<i style="background:${c.hex}" title="${esc(c.name)}"></i>`).join('')}</div>
      <div class="price-row">
        <span class="price">${p.hasPriceRange ? '<small class="price-from">Từ</small> ' : ''}${money(p.price)}</span>
        ${p.onSale ? `<span class="old-price">${money(p.oldPrice)}</span>` : ''}
      </div>
      <span class="wholesale-hint">Sỉ từ ${money(Math.round(p.price * (1 - CONFIG.wholesale[0].rate)))}/áo</span>
    </div>
  </article>`;
}

/** Bảng tổng tiền – dùng ở giỏ hàng, thanh toán, cảm ơn */
export function summaryHTML(t) {
  return `
    <div class="summary-row"><span>Tạm tính (${t.totalQty} áo)</span><span>${money(t.subtotal)}</span></div>
    <div class="summary-row discount"><span>Chiết khấu giá sỉ</span><span>${t.discount ? '-' + money(t.discount) : '0₫'}</span></div>
    <div class="summary-row"><span>Phí in / thêu</span><span>${money(t.printFee)}</span></div>
    <div class="summary-row"><span>Phí vận chuyển</span><span>${t.shipping ? money(t.shipping) : 'Miễn phí'}</span></div>
    ${t.coupon ? `<div class="summary-row discount"><span>Mã ${esc(t.coupon.code)}${t.removable ? ' <a href="#" class="link" id="rm-coupon">(bỏ)</a>' : ''}</span><span>-${money(t.coupon.amount)}</span></div>` : ''}
    <div class="summary-total"><span>Tổng cộng</span><b>${money(t.total)}</b></div>`;
}

export { $, $$ };
