/* Trang chi tiết sản phẩm – chọn biến thể Màu × Size, giá sỉ, in ấn, thêm giỏ */
import { $, $$, qs, esc, money, num, skuOf } from '../core/utils.js';
import { api } from '../core/api.js';
import { Product, toProducts } from '../core/models.js';
import { Cart } from '../core/cart.js';
import { CONFIG, calcTotals, wholesaleRate } from '../core/pricing.js';
import { renderLayout, productCard, shareButtons } from '../ui/layout.js';
import { Track } from '../core/track.js';
import { productImage } from '../ui/image.js';
import { toast, openModal } from '../ui/feedback.js';

const { site } = await renderLayout('products');

const notFound = () => {
  $('#detail-root').innerHTML = `<div class="empty" style="margin-top:40px"><div class="big">🧥</div>
    <h3>Không tìm thấy sản phẩm</h3><p class="muted">Sản phẩm có thể đã ngừng kinh doanh.</p>
    <a href="products.html" class="btn btn-dark">Về trang sản phẩm</a></div>`;
};

let p;
// Id lấy từ ?id= hoặc từ server (đường dẫn thân thiện /san-pham/<slug>)
const productId = qs('id') || window.__PAGE__?.id;
try { p = new Product(await api.products.get(productId)); } catch { notFound(); throw new Error('stop'); }
if (!p.variants.length) { notFound(); throw new Error('stop'); }

document.title = p.seo_title || p.name + ' – AURUM Uniform';
$('#d-share').innerHTML = shareButtons(site, p.name);
Track.viewItem(p);
const firstColor = (p.colors.find(c => p.colorStock(c.name) > 0) || p.colors[0]).name;
const sel = { color: firstColor, size: null, qty: 1 };
const current = () => (sel.size ? p.variantOf(sel.color, sel.size) : null);

/* ---- Thông tin cơ bản ---- */
$('#crumbs').innerHTML = `<a href="index.html">Trang chủ</a><span>/</span><a href="products.html?cat=${p.cate_id}">${esc(p.category_name)}</a><span>/</span>${esc(p.name)}`;
$('#d-cat').textContent = p.category_name;
$('#d-name').textContent = p.name;
$('#d-sku').textContent = skuOf(p.id);
$('#d-sold').textContent = num(p.sold);
$('#print-fee').textContent = money(CONFIG.printFee);
$('#t-desc').innerHTML = `<p>${esc(p.detail)}</p>
  <p>Sản phẩm phù hợp làm đồng phục cho: văn phòng, cửa hàng, nhà hàng – khách sạn, sự kiện doanh nghiệp. Nhận in / thêu logo, tên và số áo theo yêu cầu.</p>`;
$('#t-spec').innerHTML = `<table class="tier-table" style="max-width:520px">
  <tr><td>Danh mục</td><td>${esc(p.category_name)}</td></tr>
  <tr><td>Chất liệu</td><td>${esc(p.material || 'Đang cập nhật')}</td></tr>
  <tr><td>Màu sắc</td><td>${p.colors.map(c => esc(c.name)).join(', ')}</td></tr>
  <tr><td>Kích thước</td><td>${p.sizes.join(', ')}</td></tr>
  <tr><td>Xuất xứ</td><td>Việt Nam</td></tr></table>`;

/* ---- Giá & tồn kho theo biến thể đang chọn ---- */
function renderPrice() {
  const v = current();
  const price = v ? v.price : p.price;
  $('#d-price').innerHTML = !v && p.hasPriceRange ? `<small class="price-from">Từ</small> ${money(price)}` : money(price);
  const old = p.oldPrice;
  const showOld = old > price;
  $('#d-old').textContent = showOld ? money(old) : '';
  $('#d-save').textContent = showOld ? '-' + Math.round((1 - price / old) * 100) + '%' : '';
  $('#d-save').hidden = !showOld;

  const stock = v ? v.quantity : p.colorStock(sel.color);
  $('#d-stock').innerHTML = stock > 0
    ? `<span class="in-stock">● ${v ? 'Còn' : 'Màu này còn'} ${num(stock)} sản phẩm${stock < 10 ? ' – sắp hết' : ''}</span>`
    : '<span class="out-stock">● Tạm hết hàng</span>';
}

/* ---- Ảnh ---- */
function renderGallery() {
  $('#gallery-main').innerHTML = productImage(p, { hex: p.colorHex(sel.color), src: p.imageFor(sel.color) });
  $('#gallery-thumbs').innerHTML = p.colors.map(c =>
    `<button data-color="${esc(c.name)}" class="${c.name === sel.color ? 'active' : ''}" title="${esc(c.name)}">${productImage(p, { hex: c.hex, src: p.imageFor(c.name) === p.image ? '' : p.imageFor(c.name) })}</button>`).join('');
}

/* ---- Màu, size ---- */
function renderOptions() {
  $('#d-colors').innerHTML = p.colors.map(c =>
    `<button class="swatch ${c.name === sel.color ? 'active' : ''} ${p.colorStock(c.name) ? '' : 'sold-out'}" data-color="${esc(c.name)}" style="background:${c.hex}" title="${esc(c.name)}${p.colorStock(c.name) ? '' : ' (hết hàng)'}" aria-label="${esc(c.name)}"></button>`).join('');
  $('#d-color-name').textContent = sel.color;
  $('#d-sizes').innerHTML = p.sizes.map(s => {
    const v = p.variantOf(sel.color, s);
    const out = !v || v.quantity <= 0;
    return `<button class="size-btn ${s === sel.size ? 'active' : ''} ${out ? 'is-out' : ''}" data-size="${s}" ${out ? 'disabled' : ''} title="${out ? 'Hết hàng' : 'Còn ' + v.quantity}">${s}</button>`;
  }).join('');
}

function pickColor(name) {
  sel.color = name;
  const v = current();                       // size đang chọn có còn ở màu mới không?
  if (!v || v.quantity <= 0) sel.size = null;
  renderOptions(); renderGallery(); setQty(sel.qty);
}
$('#d-colors').addEventListener('click', e => { const b = e.target.closest('[data-color]'); if (b) pickColor(b.dataset.color); });
$('#gallery-thumbs').addEventListener('click', e => { const b = e.target.closest('[data-color]'); if (b) pickColor(b.dataset.color); });
$('#d-sizes').addEventListener('click', e => {
  const b = e.target.closest('[data-size]');
  if (!b || b.disabled) return;
  sel.size = b.dataset.size; renderOptions(); setQty(sel.qty);
});

/* ---- Số lượng & giá sỉ ---- */
const qtyInput = $('#d-qty');
function setQty(n) {
  n = Math.max(1, Math.floor(Number(n) || 1));
  const v = current();
  if (v) n = Math.min(n, Math.max(1, v.quantity));
  sel.qty = n; qtyInput.value = n;
  renderPrice(); updateTotal();
}
$$('.qty [data-step]').forEach(b => b.addEventListener('click', () => setQty(sel.qty + Number(b.dataset.step))));
qtyInput.addEventListener('change', () => setQty(qtyInput.value));
$$('[data-quick]').forEach(b => b.addEventListener('click', () => setQty(b.dataset.quick)));

const tiers = [...CONFIG.wholesale].reverse();
function renderTiers(unit) {
  const rate = wholesaleRate(sel.qty);
  const rows = [{ min: 1, rate: 0, label: '1 – 19 áo' }, ...tiers];
  $('#d-tiers').innerHTML = `<tr><th>Số lượng</th><th>Chiết khấu</th><th>Đơn giá</th></tr>` +
    rows.map(t => `<tr class="${t.rate === rate ? 'on' : ''}"><td>${t.label}</td><td>${t.rate ? '-' + Math.round(t.rate * 100) + '%' : '—'}</td><td>${money(Math.round(unit * (1 - t.rate)))}</td></tr>`).join('');
  const next = tiers.find(t => sel.qty < t.min);
  $('#d-tier-note').textContent = next ? `Thêm ${next.min - sel.qty} áo để được giảm ${Math.round(next.rate * 100)}%` : 'Bạn đang hưởng mức giá sỉ tốt nhất';
}

/* ---- In ấn ---- */
const printOn = $('#print-on');
printOn.addEventListener('change', () => { $('#print-fields').classList.toggle('hidden', !printOn.checked); updateTotal(); });
$('#print-text').addEventListener('input', updateTotal);
$('#print-logo').addEventListener('change', updateTotal);

function currentPrint() {
  if (!printOn.checked) return null;
  const text = $('#print-text').value.trim();
  const file = $('#print-logo').files[0];
  if (!text && !file) return null;
  return { text, position: $('#print-pos').value, logo: file ? file.name : '' };
}

function updateTotal() {
  const v = current();
  const unit = v ? v.price : p.price;
  renderTiers(unit);
  const t = calcTotals([{ productId: p.id, price: unit, qty: sel.qty, print: currentPrint() }]);
  $('#lt-qty').textContent = sel.qty;
  const parts = [];
  if (t.discount) parts.push('Giảm sỉ -' + money(t.discount));
  if (t.printFee) parts.push('Phí in +' + money(t.printFee));
  $('#lt-detail').innerHTML = parts.length ? '<br>' + parts.join(' · ') : '';
  $('#lt-total').textContent = money(t.subtotal - t.discount + t.printFee);
}

/* ---- Thêm vào giỏ ---- */
function addToCart() {
  if (!p.inStock) { toast('Sản phẩm tạm hết hàng', 'error'); return false; }
  const v = current();
  if (!v) {
    toast('Vui lòng chọn kích thước', 'error');
    $('#d-sizes').scrollIntoView({ behavior: 'smooth', block: 'center' });
    return false;
  }
  if (printOn.checked && !currentPrint()) { toast('Nhập nội dung in hoặc chọn logo', 'error'); $('#print-text').focus(); return false; }
  const inCart = Cart.items().filter(i => i.variantId === v.id).reduce((s, i) => s + i.qty, 0);
  if (inCart + sel.qty > v.quantity) {
    toast(`Kho chỉ còn ${v.quantity} sản phẩm (giỏ hàng đã có ${inCart})`, 'error'); return false;
  }
  Cart.add({ variantId: v.id, qty: sel.qty, print: currentPrint() });
  Track.addToCart(p, v, sel.qty);
  return true;
}
// Theo yêu cầu: sau khi thêm sản phẩm sẽ chuyển sang trang giỏ hàng
$('#btn-add').addEventListener('click', () => { if (addToCart()) location.href = 'cart.html?added=1'; });
$('#btn-buy').addEventListener('click', () => { if (addToCart()) location.href = 'checkout.html'; });
if (!p.inStock) $('#btn-add').disabled = $('#btn-buy').disabled = true;

/* ---- Bảng size ---- */
$('#btn-size-guide').addEventListener('click', e => {
  e.preventDefault();
  const shirt = p.sizes.includes('38');
  openModal(`<h3>Bảng size ${shirt ? 'sơ mi (theo cổ áo)' : 'áo đồng phục'}</h3>
    <p class="muted" style="margin:0">Số đo tính bằng cm. Nếu ở giữa 2 size, nên chọn size lớn hơn.</p>
    ${shirt ? `<table class="size-table">
      <tr><th>Size</th><th>Vòng cổ</th><th>Chiều cao</th><th>Cân nặng</th><th>Vòng ngực</th></tr>
      <tr><td>38</td><td>38</td><td>155 – 162</td><td>48 – 55 kg</td><td>88 – 92</td></tr>
      <tr><td>39</td><td>39</td><td>160 – 167</td><td>55 – 62 kg</td><td>92 – 96</td></tr>
      <tr><td>40</td><td>40</td><td>165 – 172</td><td>62 – 68 kg</td><td>96 – 100</td></tr>
      <tr><td>41</td><td>41</td><td>168 – 175</td><td>68 – 75 kg</td><td>100 – 104</td></tr>
      <tr><td>42</td><td>42</td><td>172 – 180</td><td>75 – 82 kg</td><td>104 – 108</td></tr>
      <tr><td>43</td><td>43</td><td>175 – 185</td><td>82 – 90 kg</td><td>108 – 114</td></tr>
    </table>` : `<table class="size-table">
      <tr><th>Size</th><th>Chiều cao</th><th>Cân nặng</th><th>Ngang ngực</th><th>Dài áo</th></tr>
      <tr><td>S</td><td>150 – 160</td><td>45 – 52 kg</td><td>48</td><td>66</td></tr>
      <tr><td>M</td><td>160 – 165</td><td>52 – 60 kg</td><td>50</td><td>68</td></tr>
      <tr><td>L</td><td>165 – 172</td><td>60 – 68 kg</td><td>52</td><td>70</td></tr>
      <tr><td>XL</td><td>170 – 177</td><td>68 – 76 kg</td><td>54</td><td>72</td></tr>
      <tr><td>XXL</td><td>175 – 185</td><td>76 – 88 kg</td><td>57</td><td>74</td></tr>
    </table>`}
    <p style="font-size:13.5px; margin-top:14px">💡 Đặt từ 20 áo: AURUM hỗ trợ <b>gửi áo mẫu thử size</b> tận nơi miễn phí.</p>`);
});

/* ---- Tabs ---- */
$$('.tab-nav button').forEach(b => b.addEventListener('click', () => {
  $$('.tab-nav button').forEach(x => x.classList.toggle('active', x === b));
  $$('.tab-panel').forEach(x => x.classList.toggle('active', x.id === b.dataset.tab));
}));

renderGallery(); renderOptions(); renderPrice(); updateTotal();

/* ---- Liên quan (cùng danh mục trước) ---- */
try {
  const others = toProducts(await api.products.list()).filter(x => x.id !== p.id)
    .sort((a, b) => (b.cate_id === p.cate_id) - (a.cate_id === p.cate_id)).slice(0, 4);
  $('#related').innerHTML = others.map(productCard).join('');
} catch { /* bỏ qua: mục liên quan không bắt buộc */ }
