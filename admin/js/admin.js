/* =========================================================
   AURUM UNIFORM – Khung trang quản trị (ES module dùng chung)
   Kiểm tra quyền admin, sidebar, topbar, phân trang, chi tiết đơn hàng
   ========================================================= */
import { $, esc, money, fmtDateTime } from '../../js/core/utils.js';
import { api } from '../../js/core/api.js';
import { Auth } from '../../js/core/session.js';
import { ORDER_STATUS, PAYMENT_METHODS } from '../../js/core/pricing.js';
import { productImage } from '../../js/ui/image.js';
import { openModal, closeModal, toast, confirmDialog } from '../../js/ui/feedback.js';

/* Chỉ tài khoản admin mới được vào – nếu không, chuyển hướng và dừng mọi module phía sau */
let admin = null;
try { admin = await Auth.current(); } catch { /* server tắt: để trang tự báo lỗi */ }
if (!admin || admin.role !== 'admin') {
  location.replace('../login.html?need=admin');
  await new Promise(() => {});
}

const ICON = {
  dashboard: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>',
  categories: '<svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h10"/></svg>',
  products: '<svg viewBox="0 0 24 24"><path d="M8 3 4 5l-1 5 3 1v10h12V11l3-1-1-5-4-2a4 4 0 0 1-8 0Z"/></svg>',
  customers: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="4"/><path d="M2 21c1-4 4-6 7-6s6 2 7 6"/><path d="M16 4a4 4 0 0 1 0 8M22 21c-.6-2.6-2-4.4-4-5.3"/></svg>',
  orders: '<svg viewBox="0 0 24 24"><path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6M9 13h8M9 17h6"/></svg>',
  posts: '<svg viewBox="0 0 24 24"><path d="M4 4h12v16H4z"/><path d="M16 8h4v10a2 2 0 0 1-2 2h-2M7 8h6M7 12h6M7 16h4"/></svg>',
  seo: '<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m20 20-4.8-4.8M8 11l2 2 3.5-4"/></svg>',
  facebook: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M15.5 8H14c-1.4 0-2 .8-2 2v11M9.5 13h5.5"/></svg>'
};

export async function renderAdminLayout(active, title) {
  let pending = 0;
  try { pending = (await api.orders.page({ status: 'pending', _limit: 1 })).total; } catch { /* không chặn giao diện */ }
  const links = [
    ['dashboard', 'dashboard.html', 'Dashboard'],
    ['categories', 'categories.html', 'Quản lý danh mục'],
    ['products', 'products.html', 'Quản lý sản phẩm'],
    ['customers', 'customers.html', 'Quản lý khách hàng'],
    ['orders', 'orders.html', 'Quản lý đơn hàng', pending]
  ];
  const marketing = [
    ['posts', 'posts.html', 'Bài viết & SEO bài viết'],
    ['seo', 'seo.html', 'Tối ưu SEO hệ thống'],
    ['facebook', 'facebook.html', 'Cấu hình Facebook']
  ];
  const navLinks = list => list.map(([k, href, label, count]) => `<a href="${href}" class="${k === active ? 'active' : ''}">${ICON[k]}${label}${count ? `<span class="count">${count}</span>` : ''}</a>`).join('');
  $('#sidebar').className = 'sidebar';
  $('#sidebar').innerHTML = `
    <a href="dashboard.html" class="logo"><span class="logo-mark">A</span><span class="logo-text">AURUM<small>ADMIN</small></span></a>
    <div class="side-label">Quản trị</div>
    <nav class="side-nav">${navLinks(links)}</nav>
    <div class="side-label">SEO &amp; Marketing</div>
    <nav class="side-nav">${navLinks(marketing)}</nav>
    <div class="side-foot">
      <a href="../index.html" target="_blank" rel="noopener">↗ Xem trang bán hàng</a>
      <a href="#" id="btn-reset">↺ Khôi phục dữ liệu mẫu</a>
      <a href="#" id="btn-admin-logout">⎋ Đăng xuất</a>
    </div>`;

  $('#admin-top').className = 'admin-top';
  $('#admin-top').innerHTML = `
    <button class="side-toggle" aria-label="Menu">☰</button>
    <h1>${esc(title)}</h1>
    <div class="admin-user"><div><b>${esc(admin.name)}</b><small>${esc(admin.email)}</small></div><span class="avatar">${esc(admin.name.charAt(0))}</span></div>`;
  document.title = title + ' – AURUM Admin';

  $('.side-toggle').addEventListener('click', () => $('.admin').classList.toggle('side-open'));
  $('#btn-admin-logout').addEventListener('click', e => { e.preventDefault(); Auth.logout(); location.href = '../login.html'; });
  $('#btn-reset').addEventListener('click', async e => {
    e.preventDefault();
    if (!await confirmDialog('Khôi phục toàn bộ dữ liệu mẫu? Mọi thay đổi (sản phẩm, bài viết, đơn hàng, tài khoản mới) sẽ bị xoá. Cấu hình SEO & Facebook được giữ nguyên.', { title: 'Khôi phục dữ liệu mẫu', ok: 'Khôi phục', danger: true })) return;
    try { await api.resetData(); location.reload(); } catch (err) { toast(err.message, 'error'); }
  });
}

/** Nén ảnh trong trình duyệt → WebP (cạnh dài ≤ maxSide) trước khi tải lên server */
export async function compressToDataUrl(file, maxSide = 900, quality = 0.82) {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale); canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/webp', quality);
}

/** Hiển thị lỗi tải dữ liệu thay cho bảng trống */
export function showLoadError(err) {
  const host = $('#page') || document.body;
  host.insertAdjacentHTML('afterbegin', `<div class="alert alert-error" style="margin-bottom:16px">${esc(err.message)}</div>`);
}

/* ---------- Phân trang dùng chung cho các bảng ---------- */
export function paginate(list, page, perPage = 8) {
  const pages = Math.max(1, Math.ceil(list.length / perPage));
  page = Math.min(Math.max(1, page), pages);
  return { rows: list.slice((page - 1) * perPage, page * perPage), page, pages, total: list.length, from: list.length ? (page - 1) * perPage + 1 : 0, to: Math.min(page * perPage, list.length) };
}
export function pagerHTML(pg) {
  let html = `<button data-page="${pg.page - 1}" ${pg.page === 1 ? 'disabled' : ''}>‹</button>`;
  for (let i = 1; i <= pg.pages; i++) html += `<button data-page="${i}" class="${i === pg.page ? 'active' : ''}">${i}</button>`;
  html += `<button data-page="${pg.page + 1}" ${pg.page === pg.pages ? 'disabled' : ''}>›</button>`;
  return `<span>Hiển thị ${pg.from}–${pg.to} / ${pg.total}</span><div class="pager">${html}</div>`;
}

/** Gắn sự kiện chuyển trang cho vùng #foot */
export function bindPager(foot, setPage) {
  foot.addEventListener('click', e => { const b = e.target.closest('[data-page]'); if (b && !b.disabled) setPage(Number(b.dataset.page)); });
}

/* ---------- Chi tiết đơn hàng (Dashboard & Quản lý đơn hàng) ---------- */
export function openOrderModal(o, onChange) {
  const st = ORDER_STATUS[o.status];
  const c = o.customer;
  const modal = openModal(`
    <div class="order-head">
      <div><h3>Đơn hàng #${esc(o.code)}</h3><span class="muted" style="font-size:13.5px">Đặt lúc ${fmtDateTime(o.created_date)}</span></div>
      <span class="tag ${st.cls}" style="align-self:flex-start">${st.label}</span>
    </div>
    <div class="order-cols">
      <div class="panel">
        <h4>Khách hàng</h4>
        <p><b>${esc(c.name)}</b> ${o.user_id ? '<span class="tag tag-gold">Thành viên</span>' : '<span class="tag tag-warn">Khách vãng lai</span>'}</p>
        <p>☎ ${esc(c.phone)}</p><p>✉ ${esc(c.email)}</p>
        ${c.vat ? `<p>🧾 VAT: ${esc(c.vat.company)} – MST ${esc(c.vat.taxCode)}</p>` : ''}
      </div>
      <div class="panel">
        <h4>Giao hàng & thanh toán</h4>
        <p>📍 ${esc(c.address)}</p>
        <p>💳 ${PAYMENT_METHODS[o.payment]}</p>
        ${c.note ? `<p>📝 ${esc(c.note)}</p>` : ''}
      </div>
    </div>
    <div class="table-wrap">
      <table class="data">
        <thead><tr><th>Sản phẩm</th><th>Phân loại</th><th>In ấn</th><th class="num">Đơn giá</th><th class="center">SL</th><th class="num">Thành tiền</th></tr></thead>
        <tbody>${o.details.map(d => `<tr>
          <td><div class="cell-prod"><div class="thumb">${productImage({ image: d.image, name: d.product_name }, { hex: d.color_hex })}</div><b>${esc(d.product_name)}</b></div></td>
          <td>${esc(d.color)} / ${esc(d.size)}</td>
          <td>${d.print ? `${esc(d.print.text || '')}${d.print.logo ? ' + logo ' + esc(d.print.logo) : ''}<br><small class="muted">${esc(d.print.position)}</small>` : '—'}</td>
          <td class="num">${money(d.unit_price)}</td><td class="center">${d.quantity}</td><td class="num">${money(d.unit_price * d.quantity)}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>
    <div class="order-total">
      <div class="summary-row"><span>Tạm tính</span><span>${money(o.subtotal)}</span></div>
      <div class="summary-row discount"><span>Chiết khấu sỉ</span><span>-${money(o.discount)}</span></div>
      ${o.coupon ? `<div class="summary-row discount"><span>Mã ${esc(o.coupon.code)}</span><span>-${money(o.coupon.amount)}</span></div>` : ''}
      <div class="summary-row"><span>Phí in / thêu</span><span>${money(o.print_fee)}</span></div>
      <div class="summary-row"><span>Vận chuyển</span><span>${o.shipping ? money(o.shipping) : 'Miễn phí'}</span></div>
      <div class="summary-total"><span>Tổng cộng</span><b>${money(o.total)}</b></div>
    </div>
    <div class="status-flow">
      <b>Cập nhật trạng thái:</b>
      <select class="select select-sm" id="om-status">
        ${Object.entries(ORDER_STATUS).map(([k, v]) => `<option value="${k}" ${k === o.status ? 'selected' : ''}>${v.label}</option>`).join('')}
      </select>
      <button class="btn btn-dark btn-sm" id="om-save">Lưu</button>
      <button class="btn btn-outline btn-sm" id="om-print">🖨 In</button>
    </div>`, 'wide');

  $('#om-print', modal).addEventListener('click', () => window.print());
  $('#om-save', modal).addEventListener('click', async () => {
    const next = $('#om-status', modal).value;
    if (next === o.status) { closeModal(); return; }
    try {
      await api.orders.setStatus(o.id, next);   // server tự hoàn / trừ tồn kho khi huỷ / mở lại đơn
      closeModal();
      toast(`Đơn ${o.code}: ${ORDER_STATUS[next].label}`);
      onChange?.();
    } catch (err) { toast(err.message, 'error'); }
  });
}
