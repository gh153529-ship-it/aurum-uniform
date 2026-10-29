/* Trang thanh toán – gửi đơn lên API, server tính lại giá và trừ tồn kho */
import { $, $$, esc, money, Valid } from '../core/utils.js';
import { api } from '../core/api.js';
import { Catalog } from '../core/catalog.js';
import { Cart } from '../core/cart.js';
import { CONFIG, COUPONS, withCoupon, couponAmount } from '../core/pricing.js';
import { KEYS } from '../core/config.js';
import { renderLayout, summaryHTML } from '../ui/layout.js';
import { productImage } from '../ui/image.js';
import { toast, setFieldError, showServerErrors } from '../ui/feedback.js';

const PROVINCES = ['TP. Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ', 'Huế', 'An Giang', 'Bắc Ninh', 'Cà Mau', 'Cao Bằng',
  'Đắk Lắk', 'Điện Biên', 'Đồng Nai', 'Đồng Tháp', 'Gia Lai', 'Hà Tĩnh', 'Hưng Yên', 'Khánh Hoà', 'Lai Châu', 'Lâm Đồng',
  'Lạng Sơn', 'Lào Cai', 'Nghệ An', 'Ninh Bình', 'Phú Thọ', 'Quảng Ngãi', 'Quảng Ninh', 'Quảng Trị', 'Sơn La', 'Tây Ninh',
  'Thái Nguyên', 'Thanh Hoá', 'Tuyên Quang', 'Vĩnh Long'];

const { user } = await renderLayout('');
const products = await Catalog.products().catch(() => []);
const cart = Cart.detailed(products);

const emptyState = () => {
  $('#checkout-form').outerHTML = `<div class="empty" style="margin-top:32px"><div class="big">🛒</div>
    <h3>Chưa có sản phẩm để thanh toán</h3><a href="products.html" class="btn btn-dark">Xem sản phẩm</a></div>`;
};
if (!cart.items.length) { emptyState(); throw new Error('empty cart'); }

let coupon = null;

/* ---- Điền sẵn thông tin ---- */
$('#c-province').innerHTML = '<option value="">— Chọn tỉnh/thành —</option>' + PROVINCES.map(p => `<option>${p}</option>`).join('');
if (user) {
  $('#c-name').value = user.name; $('#c-phone').value = user.phone; $('#c-email').value = user.email;
  $('#c-address').value = user.address || '';
  const prov = PROVINCES.find(p => (user.address || '').includes(p.replace('TP. ', '')));
  if (prov) $('#c-province').value = prov;
  $('#login-hint').innerHTML = `Đang đặt hàng với tài khoản <b>${esc(user.email)}</b>.`;
} else {
  $('#login-hint').innerHTML = `Bạn đã có tài khoản? <a class="link" href="login.html?redirect=checkout.html">Đăng nhập</a> để điền nhanh thông tin.`;
}
$('#bank-info').innerHTML = `Ngân hàng: <b>${CONFIG.bank.name}</b><br>Số TK: <b>${CONFIG.bank.number}</b><br>Chủ TK: <b>${CONFIG.bank.owner}</b><br>Nội dung: <b>Mã đơn hàng + SĐT</b>`;

/* ---- Tóm tắt đơn (cùng công thức với server) ---- */
const totals = () => ({ ...withCoupon(cart, coupon), removable: true });

function renderSummary() {
  const t = totals();
  $('#co-qty').textContent = t.totalQty;
  $('#co-items').innerHTML = cart.items.map(i => `<div class="mini-item">
    <div class="mini-thumb">${productImage({ image: i.image, name: i.name, cate_id: i.categoryId }, { hex: i.colorHex })}<em>${i.qty}</em></div>
    <div><b>${esc(i.name)}</b><br><span class="muted">${esc(i.color)} · ${esc(i.size)}${i.print ? ' · In: ' + esc(i.print.text || i.print.logo) : ''}</span></div>
    <span>${money(i.price * i.qty)}</span></div>`).join('');
  $('#co-summary').innerHTML = summaryHTML(t);
  $('#rm-coupon')?.addEventListener('click', e => { e.preventDefault(); coupon = null; renderSummary(); });
}

$('#btn-coupon').addEventListener('click', () => {
  const code = $('#coupon').value.trim().toUpperCase();
  if (!COUPONS[code]) { toast('Mã giảm giá không hợp lệ. Thử: WELCOME hoặc AURUM50K', 'error'); return; }
  if (!couponAmount(code, cart)) { toast('Đơn hàng chưa đủ điều kiện: ' + COUPONS[code].label, 'error'); return; }
  coupon = code; renderSummary(); toast('Đã áp dụng mã ' + code);
});

/* ---- Phương thức thanh toán ---- */
$$('input[name=payment]').forEach(r => r.addEventListener('change', () => {
  $$('[data-extra]').forEach(x => x.classList.toggle('hidden', x.dataset.extra !== r.value));
}));
$('#c-vat').addEventListener('change', e => $('#vat-fields').classList.toggle('hidden', !e.target.checked));

/* ---- Đặt hàng ---- */
let submitting = false;
$('#checkout-form').addEventListener('submit', async e => {
  e.preventDefault();
  if (submitting) return;
  const f = id => $('#' + id);
  const rules = [
    [f('c-name'), Valid.required, 'Vui lòng nhập họ tên'],
    [f('c-phone'), Valid.phone, 'Số điện thoại không hợp lệ'],
    [f('c-email'), Valid.email, 'Email không hợp lệ'],
    [f('c-province'), Valid.required, 'Chọn tỉnh / thành phố'],
    [f('c-ward'), Valid.required, 'Nhập phường / xã'],
    [f('c-address'), Valid.required, 'Nhập địa chỉ chi tiết']
  ];
  if (f('c-vat').checked) rules.push([f('c-taxcode'), v => /^\d{10}(-\d{3})?$/.test(v.trim()), 'MST gồm 10 hoặc 13 số'], [f('c-company'), Valid.required, 'Nhập tên công ty']);
  let firstBad = null;
  rules.forEach(([input, test, msg]) => {
    const ok = test(input.value);
    setFieldError(input, ok ? '' : msg);
    if (!ok && !firstBad) firstBad = input;
  });
  if (firstBad) { firstBad.focus(); toast('Vui lòng kiểm tra lại thông tin', 'error'); return; }
  if (!f('c-agree').checked) { toast('Bạn cần đồng ý với chính sách đổi trả', 'error'); return; }

  const btn = $('button[type=submit]', f('checkout-form')), label = btn.textContent;
  submitting = true; btn.disabled = true; btn.textContent = 'Đang đặt hàng...';
  try {
    const order = await api.orders.checkout({
      customer: {
        name: f('c-name').value.trim(), phone: f('c-phone').value.trim(), email: f('c-email').value.trim(),
        address: [f('c-address').value.trim(), f('c-ward').value.trim(), f('c-province').value].join(', '),
        note: f('c-note').value.trim(),
        vat: f('c-vat').checked ? { taxCode: f('c-taxcode').value.trim(), company: f('c-company').value.trim() } : null
      },
      payment: $('input[name=payment]:checked').value,
      couponCode: coupon,
      items: cart.items.map(i => ({ variantId: i.variantId, qty: i.qty, print: i.print || null }))
    });
    Cart.clear();
    Catalog.invalidate();
    sessionStorage.setItem(KEYS.lastOrder, JSON.stringify({ code: order.code, phone: order.customer.phone }));
    location.href = 'thank-you.html?code=' + encodeURIComponent(order.code);
  } catch (err) {
    submitting = false; btn.disabled = false; btn.textContent = label;
    showServerErrors({ name: f('c-name'), phone: f('c-phone'), email: f('c-email'), address: f('c-address') }, err.fieldErrors);
    toast(err.message, 'error');
  }
});

renderSummary();
