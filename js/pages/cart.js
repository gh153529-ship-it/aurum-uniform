/* Trang giỏ hàng */
import { $, qs, esc, money } from '../core/utils.js';
import { Catalog } from '../core/catalog.js';
import { Cart } from '../core/cart.js';
import { CONFIG } from '../core/pricing.js';
import { renderLayout, summaryHTML } from '../ui/layout.js';
import { productImage } from '../ui/image.js';
import { productUrl } from '../core/links.js';
import { toast, confirmDialog } from '../ui/feedback.js';

await renderLayout('');
if (!$('#cart-root')) throw new Error('no cart root');

let products = [];
try { products = await Catalog.products(); }
catch (e) { $('#cart-items').innerHTML = `<div class="alert alert-error">${esc(e.message)}</div>`; }

function render() {
  const cart = Cart.detailed(products);
  $('#cart-qty').textContent = cart.totalQty;
  if (cart.removed) toast('Một số sản phẩm không còn được bán nên đã được gỡ khỏi giỏ', 'error');

  if (!cart.items.length) {
    $('#cart-root').innerHTML = `<div class="empty" style="grid-column:1/-1">
      <div class="big">🛒</div><h3>Giỏ hàng đang trống</h3>
      <p class="muted">Hãy chọn mẫu áo đồng phục phù hợp cho đội ngũ của bạn.</p>
      <a href="products.html" class="btn btn-dark">Xem sản phẩm</a></div>`;
    return;
  }

  $('#cart-items').innerHTML = cart.items.map(i => {
    const rate = Cart.rateFor(cart.items, i.productId);
    const unit = Math.round(i.price * (1 - rate));
    return `<div class="cart-item" data-key="${esc(i.key)}">
      <a href="${productUrl({ id: i.productId, slug: i.slug })}" class="cart-thumb">${productImage({ image: i.image, name: i.name, cate_id: i.categoryId }, { hex: i.colorHex })}</a>
      <div>
        <a href="${productUrl({ id: i.productId, slug: i.slug })}" class="cart-name">${esc(i.name)}</a>
        <div class="cart-variant">
          <span><i style="background:${i.colorHex}"></i> ${esc(i.color)}</span>
          <span>Size: <b>${esc(i.size)}</b></span>
        </div>
        ${i.print ? `<div class="print-tag">✎ In “${esc(i.print.text || '')}”${i.print.logo ? ' + logo ' + esc(i.print.logo) : ''} · ${esc(i.print.position)}</div>` : ''}
        <div class="qty qty-sm">
          <button data-act="dec" aria-label="Giảm">−</button>
          <input type="number" value="${i.qty}" min="1" data-act="set" aria-label="Số lượng">
          <button data-act="inc" aria-label="Tăng">+</button>
        </div>
        ${i.qty > i.stock ? `<small class="out-stock" style="display:block;margin-top:4px">${i.stock ? `Chỉ còn ${i.stock} sản phẩm trong kho` : 'Phân loại này đã hết hàng'}</small>` : ''}
      </div>
      <div class="cart-right">
        <span class="price">${money(unit * i.qty)}</span>
        <span class="unit">${money(unit)}/áo ${rate ? `<b style="color:var(--success)">(-${Math.round(rate * 100)}%)</b>` : ''}</span>
        <button class="remove-btn" data-act="remove">Xoá</button>
      </div>
    </div>`;
  }).join('');

  const afterDisc = cart.subtotal - cart.discount;
  const remain = CONFIG.freeShipFrom - afterDisc;
  $('#ship-progress').innerHTML = (remain > 0
    ? `Mua thêm <b>${money(remain)}</b> để được <b>miễn phí vận chuyển</b>`
    : '🎉 Đơn hàng của bạn được <b>miễn phí vận chuyển</b>') +
    `<div class="bar"><i style="width:${Math.min(100, afterDisc / CONFIG.freeShipFrom * 100)}%"></i></div>`;
  $('#summary').innerHTML = summaryHTML(cart);
}

$('#cart-root').addEventListener('click', async e => {
  const btn = e.target.closest('[data-act]');
  if (!btn || btn.tagName === 'INPUT') return;
  const key = btn.closest('.cart-item').dataset.key;
  const item = Cart.items().find(i => i.key === key);
  if (btn.dataset.act === 'inc') Cart.setQty(key, item.qty + 1);
  if (btn.dataset.act === 'dec') Cart.setQty(key, item.qty - 1);
  if (btn.dataset.act === 'remove') {
    if (!await confirmDialog('Xoá sản phẩm này khỏi giỏ hàng?', { ok: 'Xoá', danger: true })) return;
    Cart.remove(key); toast('Đã xoá sản phẩm');
  }
  render();
});
$('#cart-root').addEventListener('change', e => {
  if (e.target.dataset.act !== 'set') return;
  Cart.setQty(e.target.closest('.cart-item').dataset.key, Math.floor(Number(e.target.value)) || 1);
  render();
});
$('#btn-clear-cart').addEventListener('click', async () => {
  if (await confirmDialog('Xoá toàn bộ sản phẩm trong giỏ hàng?', { ok: 'Xoá hết', danger: true })) { Cart.clear(); render(); }
});
$('#btn-checkout').addEventListener('click', e => {
  const bad = Cart.detailed(products).items.find(i => i.qty > i.stock);
  if (bad) { e.preventDefault(); toast(`“${bad.name}” (${bad.color} / ${bad.size}) chỉ còn ${bad.stock} sản phẩm`, 'error'); }
});

if (qs('added')) {
  $('#added-alert').innerHTML = '<div class="alert alert-ok" style="margin-top:24px">✓ Đã thêm sản phẩm vào giỏ hàng thành công!</div>';
  history.replaceState(null, '', 'cart.html');
}
render();
