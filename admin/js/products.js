/* Quản lý sản phẩm: xem, thêm, sửa, xoá + quản lý biến thể (Màu × Size: giá, tồn kho) + tải ảnh WebP */
import { $, $$, qs, esc, money, norm, num, skuOf } from '../../js/core/utils.js';
import { api } from '../../js/core/api.js';
import { Product, toProducts } from '../../js/core/models.js';
import { SIZE_ORDER, LOW_STOCK } from '../../js/core/config.js';
import { productImage } from '../../js/ui/image.js';
import { productUrl } from '../../js/core/links.js';
import { openModal, closeModal, toast, confirmDialog, setFieldError, showServerErrors } from '../../js/ui/feedback.js';
import { renderAdminLayout, paginate, pagerHTML, bindPager, showLoadError, compressToDataUrl } from './admin.js';
import { seoBoxHTML, bindSeoBox } from './seo-box.js';
import { seoChecks, scoreClass } from '../../js/core/seo-check.js';

await renderAdminLayout('products', 'Quản lý sản phẩm');

const COLOR_LIST = [
  ['Đen', '#1a1a1a'], ['Trắng', '#f5f5f2'], ['Xanh navy', '#1f2a44'], ['Xám', '#8a8d91'], ['Vàng gold', '#c9a54c'],
  ['Đỏ đô', '#6d1f2b'], ['Xanh da trời', '#9cc3e6'], ['Be', '#d9c8a9'], ['Xanh rêu', '#4b5a3a'], ['Cam', '#e46a1e'], ['Vàng chanh', '#d6de3a']
];
const SHIRT_SIZES = ['38', '39', '40', '41', '42', '43'];
const sortSizes = (a, b) => SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b);

let page = 1, cats = [], products = [], siteUrl = location.origin;
const productSeo = p => seoChecks({ kind: 'product', ...p, content: p.detail });

$('#f-cat').innerHTML = '<option value="">Tất cả danh mục</option>';
async function load() {
  let settings;
  [cats, products, settings] = await Promise.all([api.categories.list({ scope: 'admin' }), api.products.list({ scope: 'admin' }).then(toProducts), api.settings.all()]);
  siteUrl = settings.seo.site_url || location.origin;
  const cur = $('#f-cat').value || qs('cat') || '';
  $('#f-cat').innerHTML = '<option value="">Tất cả danh mục</option>' + cats.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
  $('#f-cat').value = cur;
}

function stockTag(p) {
  if (p.stock === 0) return '<span class="tag tag-off">Hết hàng</span>';
  return p.stock < LOW_STOCK ? '<span class="tag tag-warn">Sắp hết</span>' : '<span class="tag tag-on">Còn hàng</span>';
}

function render() {
  const kw = norm($('#search').value);
  const cat = $('#f-cat').value, st = $('#f-stock').value, sort = $('#f-sort').value;
  const list = products.filter(p =>
    (!kw || norm(p.name + ' ' + skuOf(p.id)).includes(kw)) &&
    (!cat || p.cate_id === Number(cat)) &&
    (!st || (st === 'out' ? p.stock === 0 : st === 'low' ? p.stock > 0 && p.stock < LOW_STOCK : p.stock > 0)));
  const sorters = {
    new: (a, b) => b.id - a.id, name: (a, b) => a.name.localeCompare(b.name, 'vi'),
    'price-asc': (a, b) => a.price - b.price, 'price-desc': (a, b) => b.price - a.price, stock: (a, b) => a.stock - b.stock
  };
  list.sort(sorters[sort]);
  const pg = paginate(list, page, 8); page = pg.page;

  $('#rows').innerHTML = pg.rows.length ? pg.rows.map(p => {
    const c = cats.find(x => x.id === p.cate_id);
    return `<tr>
      <td><div class="cell-prod"><div class="thumb">${productImage(p, { hex: p.colors[0]?.hex })}</div><div><b>${esc(p.name)}</b><small>${skuOf(p.id)} ${p.featured ? '· <span class="gold">★ Nổi bật</span>' : ''} ${p.active ? '' : '· <span class="muted">Ngừng bán</span>'}</small></div></div></td>
      <td>${c ? esc(c.name) + (c.active ? '' : ' <small class="muted">(ẩn)</small>') : '—'}</td>
      <td class="num"><b>${money(p.price)}</b>${p.hasPriceRange ? `<br><small class="muted">đến ${money(p.maxPrice)}</small>` : ''}${p.onSale ? `<br><small class="old-price">${money(p.oldPrice)}</small>` : ''}</td>
      <td><div class="swatches-mini">${p.colors.map(x => `<i style="background:${x.hex}" title="${esc(x.name)}"></i>`).join('')}</div><small class="muted">${p.variants.length} biến thể · ${p.sizes.join(', ')}</small></td>
      <td class="num"><b>${num(p.stock)}</b></td>
      <td class="num">${num(p.sold)}</td>
      <td>${p.active ? stockTag(p) : '<span class="tag tag-off">Ngừng bán</span>'}</td>
      <td class="center"><button class="seo-badge score-${scoreClass(productSeo(p).score)}" data-seo="${p.id}" title="Mở cấu hình SEO">${productSeo(p).score}</button></td>
      <td><div class="actions">
        <a class="act" href="${productUrl(p)}" target="_blank" rel="noopener">Xem</a>
        <button class="act" data-seo="${p.id}">SEO</button>
        <button class="act primary" data-edit="${p.id}">Sửa</button>
        <button class="act danger" data-del="${p.id}">Xoá</button>
      </div></td></tr>`;
  }).join('') : '<tr><td colspan="9" class="empty-row">Không tìm thấy sản phẩm</td></tr>';
  $('#foot').innerHTML = pagerHTML(pg);
}

async function refresh() { try { await load(); render(); } catch (e) { showLoadError(e); } }

/* ---------- Cấu hình SEO riêng của 1 sản phẩm ---------- */
function openSeoForm(p) {
  const m = openModal(`<h3>Cấu hình SEO – ${esc(p.name)}</h3>
    <p class="muted" style="margin-top:-6px">Thông tin này được chèn vào thẻ &lt;title&gt;, meta description, Open Graph (khi chia sẻ Facebook) và sitemap.xml.</p>
    <form id="sf" novalidate>${seoBoxHTML(p, 'product')}
      <div class="modal-actions">
        <a class="btn btn-outline" href="${productUrl(p)}" target="_blank" rel="noopener">Xem trang</a>
        <button type="button" class="btn btn-outline" data-close>Huỷ</button>
        <button type="submit" class="btn btn-dark">Lưu cấu hình SEO</button>
      </div></form>`, 'wide');
  const seo = bindSeoBox(m, () => ({ name: p.name, content: p.detail || '', image: p.image }), 'product', siteUrl);
  $('#sf', m).addEventListener('submit', async e => {
    e.preventDefault();
    try {
      await api.products.patch(p.id, seo.values());
      closeModal(); toast('Đã lưu cấu hình SEO'); refresh();
    } catch (err) {
      showServerErrors({ slug: $('#seo-slug', m), seo_title: $('#seo-title', m), seo_description: $('#seo-desc', m) }, err.fieldErrors);
      if (!Object.keys(err.fieldErrors).length) toast(err.message, 'error');
    }
  });
}

/* ---------- Form thêm / sửa ---------- */
function openForm(p) {
  const editing = !!p;
  // Bản sao có thể chỉnh sửa của danh sách biến thể
  let rows = (p ? p.allVariants : []).map(v => ({ ...v }));
  const customColors = [];
  if (p) p.colors.forEach(c => { if (!COLOR_LIST.some(([n]) => n === c.name)) customColors.push([c.name, c.hex]); });
  const palette = () => [...COLOR_LIST, ...customColors];
  const hexOf = name => (palette().find(([n]) => n === name) || [, '#1a1a1a'])[1];

  const m = openModal(`<h3>${editing ? 'Sửa sản phẩm ' + skuOf(p.id) : 'Thêm sản phẩm mới'}</h3>
    <form class="form-grid" id="pf" novalidate>
      <div class="form-grid two">
        <div class="field"><label for="pf-name">Tên sản phẩm <span class="req">*</span></label>
          <input class="input" id="pf-name" value="${esc(p ? p.name : '')}" placeholder="VD: Polo Aurum Classic"></div>
        <div class="field"><label for="pf-cat">Danh mục <span class="req">*</span></label>
          <select class="select" id="pf-cat"><option value="">— Chọn danh mục —</option>
            ${cats.map(c => `<option value="${c.id}" ${p && p.cate_id === c.id ? 'selected' : ''}>${esc(c.name)}${c.active ? '' : ' (đang ẩn)'}</option>`).join('')}
          </select></div>
      </div>
      <div class="form-grid two">
        <div class="field"><label for="pf-old">Giá gốc (₫) – để hiện % giảm giá</label>
          <input class="input" id="pf-old" type="number" min="0" step="1000" value="${p && p.oldPrice ? p.oldPrice : ''}" placeholder="để trống nếu không giảm"></div>
        <div class="field"><label for="pf-material">Chất liệu</label>
          <input class="input" id="pf-material" value="${esc(p ? p.material : '')}" placeholder="VD: Cotton cá sấu 4 chiều"></div>
      </div>

      <div class="field"><label for="pf-image">Ảnh sản phẩm (WebP)</label>
        <div class="img-preview">
          <div class="thumb" id="pf-preview"></div>
          <div style="flex:1">
            <input class="input" id="pf-image" value="${esc(p ? p.image : '')}" placeholder="images/products/ten-anh.webp">
            <input type="file" id="pf-file" accept="image/*" style="margin-top:8px; font-size:13px">
            <span class="hint" id="pf-file-hint">Chọn ảnh từ máy: hệ thống tự nén sang WebP (≤ 900px) và lưu vào <code>images/products/</code>.</span>
          </div>
        </div></div>

      <div class="field"><label for="pf-detail">Mô tả</label>
        <textarea class="input" id="pf-detail" rows="3">${esc(p ? p.detail : '')}</textarea></div>

      <fieldset class="variant-box">
        <legend>Biến thể (Màu × Size) <span class="req">*</span></legend>
        <div class="gen">
          <div><b>Màu</b><div class="check-list" id="g-colors"></div>
            <div class="add-color"><input class="input input-sm" id="g-cname" placeholder="Màu khác..."><input type="color" id="g-chex" value="#c9a54c" aria-label="Chọn màu"><button type="button" class="btn btn-outline btn-sm" id="g-cadd">Thêm</button></div></div>
          <div><b>Size</b>
            <div class="check-list" id="g-sizes">${[...SIZE_ORDER.slice(0, 6), ...SHIRT_SIZES].map(s => `<label class="check-pill"><input type="checkbox" value="${s}">${s}</label>`).join('')}</div></div>
          <div class="gen-defaults">
            <div class="field"><label for="g-price">Giá bán (₫)</label><input class="input input-sm" id="g-price" type="number" min="1000" step="1000" value="${rows[0] ? rows[0].price : ''}"></div>
            <div class="field"><label for="g-qty">Tồn kho</label><input class="input input-sm" id="g-qty" type="number" min="0" value="20"></div>
            <button type="button" class="btn btn-dark btn-sm" id="g-make">+ Tạo biến thể</button>
          </div>
        </div>
        <div class="table-wrap" style="max-height:240px; overflow:auto">
          <table class="data variant-table"><thead><tr><th>Màu</th><th>Size</th><th class="num">Giá (₫)</th><th class="num">Tồn kho</th><th></th></tr></thead><tbody id="v-rows"></tbody></table>
        </div>
        <span class="hint" id="v-hint"></span>
      </fieldset>

      ${seoBoxHTML(p || {}, 'product')}

      <div class="form-grid two">
        <label class="switch-row"><input type="checkbox" id="pf-featured" ${p && p.featured ? 'checked' : ''}> Hiển thị ở mục “Sản phẩm nổi bật”</label>
        <label class="switch-row"><input type="checkbox" id="pf-active" ${!p || p.active ? 'checked' : ''}> Đang kinh doanh</label>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-outline" data-close>Huỷ</button>
        <button type="submit" class="btn btn-dark">${editing ? 'Lưu thay đổi' : 'Thêm sản phẩm'}</button>
      </div>
    </form>`, 'wide');

  /* ----- Ảnh ----- */
  const preview = () => {
    const first = rows.find(r => r.active !== false);
    $('#pf-preview', m).innerHTML = productImage({ image: $('#pf-image', m).value.trim(), cate_id: Number($('#pf-cat', m).value) || 1, name: 'preview' }, { hex: first ? first.color_hex : '#1a1a1a' });
  };
  $('#pf-image', m).addEventListener('change', preview);
  $('#pf-cat', m).addEventListener('change', preview);
  $('#pf-file', m).addEventListener('change', async e => {
    const f = e.target.files[0];
    if (!f) return;
    const hint = $('#pf-file-hint', m);
    hint.textContent = 'Đang nén và tải ảnh lên...';
    try {
      const dataUrl = await compressToDataUrl(f);
      const res = await api.upload(f.name, dataUrl);
      $('#pf-image', m).value = res.path;
      hint.textContent = `Đã nén ${(f.size / 1024).toFixed(0)}KB → ${(res.size / 1024).toFixed(0)}KB và lưu tại ${res.path}`;
      preview();
    } catch (err) { hint.textContent = ''; toast(err.message, 'error'); }
  });

  /* ----- Biến thể ----- */
  const colorBox = $('#g-colors', m);
  const renderPalette = () => {
    const checked = new Set($$('input:checked', colorBox).map(i => i.value));
    colorBox.innerHTML = palette().map(([n, h]) => `<label class="check-pill"><input type="checkbox" value="${esc(n)}" ${checked.has(n) ? 'checked' : ''}><i style="background:${h}"></i>${esc(n)}</label>`).join('');
  };
  const renderRows = () => {
    const sorted = rows.map((r, i) => ({ r, i })).sort((a, b) => a.r.color.localeCompare(b.r.color, 'vi') || sortSizes(a.r.size, b.r.size));
    $('#v-rows', m).innerHTML = sorted.length ? sorted.map(({ r, i }) => `<tr data-i="${i}" class="${r.active === false ? 'row-off' : ''}">
      <td><span class="dot" style="background:${r.color_hex}"></span>${esc(r.color)}</td><td><b>${esc(r.size)}</b></td>
      <td class="num"><input class="input input-sm" type="number" min="1000" step="1000" data-f="price" value="${r.price}"></td>
      <td class="num"><input class="input input-sm" type="number" min="0" data-f="quantity" value="${r.quantity}"></td>
      <td><button type="button" class="act danger" data-rm="${i}" title="Xoá biến thể">✕</button></td></tr>`).join('')
      : '<tr><td colspan="5" class="empty-row">Chưa có biến thể – chọn màu, size rồi bấm “Tạo biến thể”</td></tr>';
    const total = rows.filter(r => r.active !== false).reduce((s, r) => s + (Number(r.quantity) || 0), 0);
    $('#v-hint', m).textContent = `${rows.length} biến thể · tổng tồn kho ${num(total)}`;
    preview();
  };
  renderPalette(); renderRows();
  const seo = bindSeoBox(m, () => ({ name: $('#pf-name', m).value.trim(), content: $('#pf-detail', m).value, image: $('#pf-image', m).value.trim() }), 'product', siteUrl);

  $('#g-cadd', m).addEventListener('click', () => {
    const name = $('#g-cname', m).value.trim();
    if (!name) return;
    if (palette().some(([n]) => norm(n) === norm(name))) { toast('Màu này đã có trong danh sách', 'error'); return; }
    customColors.push([name, $('#g-chex', m).value]);
    $('#g-cname', m).value = '';
    renderPalette();
  });

  $('#g-make', m).addEventListener('click', () => {
    const colors = $$('#g-colors input:checked', m).map(i => i.value);
    const sizes = $$('#g-sizes input:checked', m).map(i => i.value);
    const price = Number($('#g-price', m).value), qty = Number($('#g-qty', m).value);
    if (!colors.length || !sizes.length) { toast('Chọn ít nhất 1 màu và 1 size', 'error'); return; }
    if (!(price > 0)) { setFieldError($('#g-price', m), 'Nhập giá bán'); return; }
    setFieldError($('#g-price', m), '');
    if (!(qty >= 0) || !Number.isInteger(qty)) { setFieldError($('#g-qty', m), 'Số nguyên ≥ 0'); return; }
    setFieldError($('#g-qty', m), '');
    let added = 0;
    colors.forEach(c => sizes.forEach(s => {
      const exist = rows.find(r => r.color === c && r.size === s);
      if (exist) { exist.active = true; return; }
      rows.push({ id: null, color: c, color_hex: hexOf(c), size: s, price, quantity: qty, image: '', active: true }); added++;
    }));
    toast(added ? `Đã thêm ${added} biến thể` : 'Các biến thể này đã tồn tại');
    renderRows();
  });

  $('#v-rows', m).addEventListener('input', e => {
    const tr = e.target.closest('tr'); if (!tr || !e.target.dataset.f) return;
    rows[Number(tr.dataset.i)][e.target.dataset.f] = e.target.value === '' ? '' : Number(e.target.value);
    const total = rows.reduce((s, r) => s + (Number(r.quantity) || 0), 0);
    $('#v-hint', m).textContent = `${rows.length} biến thể · tổng tồn kho ${num(total)}`;
  });
  $('#v-rows', m).addEventListener('click', e => {
    const b = e.target.closest('[data-rm]'); if (!b) return;
    rows.splice(Number(b.dataset.rm), 1); renderRows();
  });

  /* ----- Lưu ----- */
  $('#pf', m).addEventListener('submit', async e => {
    e.preventDefault();
    const f = id => $('#' + id, m);
    const old = Number(f('pf-old').value) || 0;
    const minPrice = Math.min(...rows.map(r => Number(r.price) || Infinity));
    const checks = [
      [f('pf-name'), f('pf-name').value.trim().length >= 3, 'Tên tối thiểu 3 ký tự'],
      [f('pf-cat'), !!f('pf-cat').value, 'Chọn danh mục'],
      [f('pf-old'), !old || old > minPrice, 'Giá gốc phải lớn hơn giá bán thấp nhất']
    ];
    let ok = true;
    checks.forEach(([input, pass, msg]) => { setFieldError(input, pass ? '' : msg); if (!pass) ok = false; });
    if (!rows.length) { toast('Sản phẩm cần ít nhất 1 biến thể', 'error'); ok = false; }
    const badRow = rows.find(r => !(Number(r.price) > 0) || !Number.isInteger(Number(r.quantity)) || Number(r.quantity) < 0);
    if (badRow) { toast(`Kiểm tra giá / tồn kho của biến thể ${badRow.color} / ${badRow.size}`, 'error'); ok = false; }
    if (!ok) return;

    const body = {
      name: f('pf-name').value.trim(), cate_id: Number(f('pf-cat').value), old_price: old, material: f('pf-material').value.trim(),
      image: f('pf-image').value.trim(), detail: f('pf-detail').value.trim(), featured: f('pf-featured').checked, active: f('pf-active').checked,
      ...seo.values(),
      variants: rows.map(r => ({ id: r.id, color: r.color, color_hex: r.color_hex, size: r.size, price: Number(r.price), quantity: Number(r.quantity), image: r.image || '', active: r.active !== false }))
    };
    const btn = $('button[type=submit]', m); btn.disabled = true;
    try {
      if (editing) await api.products.update(p.id, body); else await api.products.create(body);
      closeModal();
      toast(editing ? 'Đã cập nhật sản phẩm' : 'Đã thêm sản phẩm “' + body.name + '”');
      refresh();
    } catch (err) {
      btn.disabled = false;
      showServerErrors({ name: f('pf-name'), cate_id: f('pf-cat'), slug: f('seo-slug'), seo_title: f('seo-title'), seo_description: f('seo-desc') }, err.fieldErrors);
      if (!Object.keys(err.fieldErrors).length) toast(err.message, 'error');
    }
  });
}

$('#btn-add').addEventListener('click', () => openForm(null));
['#search', '#f-cat', '#f-stock', '#f-sort'].forEach(s => $(s).addEventListener(s === '#search' ? 'input' : 'change', () => { page = 1; render(); }));
$('#rows').addEventListener('click', async e => {
  const sb = e.target.closest('[data-seo]');
  if (sb) return openSeoForm(products.find(x => x.id === Number(sb.dataset.seo)));
  const ed = e.target.closest('[data-edit]');
  if (ed) return openForm(products.find(x => x.id === Number(ed.dataset.edit)));
  const del = e.target.closest('[data-del]');
  if (del) {
    const p = products.find(x => x.id === Number(del.dataset.del));
    if (!await confirmDialog(`Xoá sản phẩm “${esc(p.name)}” cùng toàn bộ biến thể? Nếu sản phẩm đã có đơn hàng, hệ thống sẽ chuyển sang “Ngừng bán”.`, { title: 'Xoá sản phẩm', ok: 'Xoá', danger: true })) return;
    try {
      const res = await api.products.remove(p.id);
      toast(res.softDeleted ? res.message : 'Đã xoá sản phẩm', res.softDeleted ? 'ok' : 'ok');
      refresh();
    } catch (err) { toast(err.message, 'error'); }
  }
});
bindPager($('#foot'), n => { page = n; render(); });

await refresh();
// Mở thẳng cấu hình SEO từ trang "Tối ưu SEO": products.html?seo=<id>
if (qs('seo')) { const p = products.find(x => x.id === Number(qs('seo'))); if (p) openSeoForm(p); }
