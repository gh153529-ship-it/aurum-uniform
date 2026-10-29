/* Trang cảm ơn sau khi thanh toán thành công */
import { $, qs, esc, money, fmtDateTime } from '../core/utils.js';
import { api } from '../core/api.js';
import { KEYS } from '../core/config.js';
import { CONFIG, ORDER_STATUS, PAYMENT_METHODS } from '../core/pricing.js';
import { renderLayout, summaryHTML } from '../ui/layout.js';
import { productImage } from '../ui/image.js';
import { Track } from '../core/track.js';

await renderLayout('');

const notFound = () => {
  $('#thanks-root').innerHTML = `<div class="empty"><div class="big">📦</div><h3>Không tìm thấy đơn hàng</h3>
    <a href="index.html" class="btn btn-dark">Về trang chủ</a></div>`;
};

const code = qs('code');
let last = {};
try { last = JSON.parse(sessionStorage.getItem(KEYS.lastOrder)) || {}; } catch { /* không có */ }

let order;
try { order = await api.orders.lookup(code, last.code === code ? last.phone : ''); } catch { notFound(); throw new Error('stop'); }

// Ghi nhận chuyển đổi (GA4 purchase / Pixel Purchase) – chỉ 1 lần cho mỗi đơn
try {
  if (!sessionStorage.getItem('au_tracked_' + order.code)) { Track.purchase(order); sessionStorage.setItem('au_tracked_' + order.code, '1'); }
} catch { /* trình duyệt chặn sessionStorage */ }

const c = order.customer;
$('#t-code').textContent = order.code;
$('#t-info').innerHTML = `
  <div><span>Người nhận</span>${esc(c.name)}</div>
  <div><span>Số điện thoại</span>${esc(c.phone)}</div>
  <div><span>Email</span>${esc(c.email)}</div>
  <div><span>Ngày đặt</span>${fmtDateTime(order.created_date)}</div>
  <div style="grid-column:1/-1"><span>Địa chỉ giao hàng</span>${esc(c.address)}</div>
  <div><span>Thanh toán</span>${PAYMENT_METHODS[order.payment]}</div>
  <div><span>Trạng thái</span>${ORDER_STATUS[order.status].label}</div>
  ${c.note ? `<div style="grid-column:1/-1"><span>Ghi chú</span>${esc(c.note)}</div>` : ''}
  ${c.vat ? `<div style="grid-column:1/-1"><span>Xuất hoá đơn VAT</span>${esc(c.vat.company)} – MST ${esc(c.vat.taxCode)}</div>` : ''}`;

$('#t-items').innerHTML = order.details.map(d => `<div class="mini-item">
  <div class="mini-thumb">${productImage({ image: d.image, name: d.product_name }, { hex: d.color_hex })}<em>${d.quantity}</em></div>
  <div><b>${esc(d.product_name)}</b><br><span class="muted">${esc(d.color)} · Size ${esc(d.size)}${d.print ? ' · In: ' + esc(d.print.text || d.print.logo) + ' (' + esc(d.print.position) + ')' : ''}</span></div>
  <span>${money(d.unit_price * d.quantity)}</span></div>`).join('');

$('#t-summary').innerHTML = summaryHTML({
  subtotal: order.subtotal, discount: order.discount, printFee: order.print_fee, shipping: order.shipping,
  totalQty: order.total_qty, coupon: order.coupon, total: order.total
});

if (order.payment === 'bank') {
  $('#t-bank').classList.remove('hidden');
  $('#t-bank-info').innerHTML = `<div class="info-grid">
    <div><span>Ngân hàng</span>${CONFIG.bank.name}</div>
    <div><span>Số tài khoản</span><b>${CONFIG.bank.number}</b></div>
    <div><span>Chủ tài khoản</span>${CONFIG.bank.owner}</div>
    <div><span>Số tiền</span><b>${money(order.total)}</b></div>
    <div style="grid-column:1/-1"><span>Nội dung chuyển khoản</span><b>${order.code} ${esc(c.phone)}</b></div></div>`;
}
$('#btn-print')?.addEventListener('click', () => window.print());
