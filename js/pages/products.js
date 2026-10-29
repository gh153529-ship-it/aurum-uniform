/* Danh sách sản phẩm – lọc theo danh mục, KHOẢNG GIÁ, màu, tìm kiếm, sắp xếp, phân trang (lọc ở phía API) */
import { $, $$, qs, esc, money, debounce } from '../core/utils.js';
import { api } from '../core/api.js';
import { Catalog } from '../core/catalog.js';
import { toProducts } from '../core/models.js';
import { renderLayout, productCard } from '../ui/layout.js';

const PER_PAGE = 9;
const PRICE_PRESETS = [
  ['all', 'Tất cả', '', ''],
  ['0-150000', 'Dưới 150.000₫', 0, 150000],
  ['150000-300000', '150.000₫ – 300.000₫', 150000, 300000],
  ['300000-99999999', 'Trên 300.000₫', 300000, '']
];

const { cats } = await renderLayout('products');
const all = await Catalog.products().catch(() => []);        // dùng để đếm theo danh mục + gom màu

const state = {
  cat: Number(qs('cat')) || 0,
  q: (qs('q') || '').trim(),
  min: '', max: '',
  colors: new Set(),
  inStock: false, sale: false,
  sort: 'default',
  page: 1
};
if (state.cat && !cats.some(x => x.id === state.cat)) state.cat = 0;

/* ---- Dựng bộ lọc ---- */
const renderCatFilter = () => {
  $('#cat-filter').innerHTML =
    `<a href="#" data-cat="0" class="${state.cat === 0 ? 'active' : ''}">Tất cả <small>${all.length}</small></a>` +
    cats.map(x => `<a href="#" data-cat="${x.id}" class="${state.cat === x.id ? 'active' : ''}">${esc(x.name)} <small>${all.filter(p => p.cate_id === x.id).length}</small></a>`).join('');
};

const colorMap = new Map();
all.forEach(p => p.colors.forEach(c => colorMap.set(c.name, c.hex)));
$('#color-filter').innerHTML = [...colorMap].map(([name, hex]) =>
  `<label title="${esc(name)}"><input type="checkbox" value="${esc(name)}"><i style="background:${hex}"></i></label>`).join('');

/** Đồng bộ ô chọn nhanh + ô nhập tay với state.min / state.max */
function syncPriceInputs() {
  const hit = PRICE_PRESETS.find(([, , a, b]) => String(a) === String(state.min) && String(b) === String(state.max));
  $$('input[name=price]').forEach(r => { r.checked = !!hit && r.value === hit[0]; });
  $('#price-min').value = state.min === '' ? '' : state.min;
  $('#price-max').value = state.max === '' ? '' : state.max;
}

const priceLabel = () => {
  const a = state.min === '' ? null : Number(state.min), b = state.max === '' ? null : Number(state.max);
  if (a !== null && b !== null) return `${money(a)} – ${money(b)}`;
  return a !== null ? `Từ ${money(a)}` : `Đến ${money(b)}`;
};

/* ---- Gọi API với bộ lọc hiện tại ---- */
let ticket = 0;
async function render() {
  renderCatFilter();
  const cat = cats.find(x => x.id === state.cat);
  const title = state.q ? `Kết quả cho “${state.q}”` : (cat ? cat.name : 'Tất cả sản phẩm');
  $('#page-title').textContent = title;
  $('#crumb-current').textContent = cat ? cat.name : 'Sản phẩm';
  document.title = title + ' – AURUM Uniform';

  const mine = ++ticket;
  $('#product-list').classList.add('loading');
  let items, total;
  try {
    ({ items, total } = await api.products.page({
      cate_id: state.cat || '', q: state.q, min_price: state.min, max_price: state.max,
      color: [...state.colors], in_stock: state.inStock ? 1 : '', on_sale: state.sale ? 1 : '',
      _sort: state.sort === 'default' ? '' : state.sort, _page: state.page, _limit: PER_PAGE
    }));
  } catch (e) {
    $('#product-list').innerHTML = `<div class="alert alert-error" style="grid-column:1/-1">${esc(e.message)}</div>`;
    return;
  }
  if (mine !== ticket) return;                   // bỏ kết quả của request cũ
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  if (state.page > pages) { state.page = pages; return render(); }

  $('#product-list').classList.remove('loading');
  $('#result-count').innerHTML = `Hiển thị <b>${total}</b> sản phẩm`;
  $('#product-list').innerHTML = items.length ? toProducts(items).map(productCard).join('') :
    `<div class="empty" style="grid-column:1/-1"><div class="big">🔍</div><h3>Không tìm thấy sản phẩm phù hợp</h3><p class="muted">Hãy thử bỏ bớt điều kiện lọc.</p></div>`;
  $('#pagination').innerHTML = pages > 1 ? Array.from({ length: pages }, (_, i) =>
    `<button data-page="${i + 1}" class="${i + 1 === state.page ? 'active' : ''}">${i + 1}</button>`).join('') : '';

  const chips = [];
  if (cat) chips.push(['cat', cat.name]);
  if (state.q) chips.push(['q', 'Từ khoá: ' + state.q]);
  if (state.min !== '' || state.max !== '') chips.push(['price', priceLabel()]);
  state.colors.forEach(c => chips.push(['color:' + c, c]));
  if (state.inStock) chips.push(['inStock', 'Còn hàng']);
  if (state.sale) chips.push(['sale', 'Giảm giá']);
  $('#active-chips').innerHTML = chips.map(([k, t]) => `<button class="chip" data-chip="${esc(k)}">${esc(t)} ✕</button>`).join('');

  const params = new URLSearchParams();
  if (state.cat) params.set('cat', state.cat);
  if (state.q) params.set('q', state.q);
  history.replaceState(null, '', 'products.html' + (params.toString() ? '?' + params : ''));
}

const refresh = () => { state.page = 1; render(); };
const toTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

/* ---- Sự kiện ---- */
$('#cat-filter').addEventListener('click', e => {
  const a = e.target.closest('a[data-cat]');
  if (!a) return;
  e.preventDefault();
  state.cat = Number(a.dataset.cat); refresh(); toTop();
});

$$('input[name=price]').forEach(r => r.addEventListener('change', () => {
  const [, , min, max] = PRICE_PRESETS.find(p => p[0] === r.value);
  state.min = min; state.max = max; syncPriceInputs(); refresh();
}));

function applyCustomPrice() {
  const min = $('#price-min').value.trim(), max = $('#price-max').value.trim();
  const a = min === '' ? '' : Math.max(0, Math.floor(Number(min))), b = max === '' ? '' : Math.max(0, Math.floor(Number(max)));
  const err = $('#price-error');
  if ((min !== '' && Number.isNaN(a)) || (max !== '' && Number.isNaN(b))) { err.textContent = 'Giá phải là số'; return; }
  if (a !== '' && b !== '' && a > b) { err.textContent = 'Giá "từ" phải nhỏ hơn hoặc bằng giá "đến"'; return; }
  err.textContent = '';
  state.min = a; state.max = b; syncPriceInputs(); refresh();
}
$('#price-apply').addEventListener('click', applyCustomPrice);
['#price-min', '#price-max'].forEach(s => $(s).addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); applyCustomPrice(); } }));

$('#color-filter').addEventListener('change', e => {
  e.target.checked ? state.colors.add(e.target.value) : state.colors.delete(e.target.value);
  refresh();
});
$('#f-instock').addEventListener('change', e => { state.inStock = e.target.checked; refresh(); });
$('#f-sale').addEventListener('change', e => { state.sale = e.target.checked; refresh(); });
$('#sort').addEventListener('change', e => { state.sort = e.target.value; state.page = 1; render(); });
$('#pagination').addEventListener('click', e => {
  const b = e.target.closest('button[data-page]');
  if (!b) return;
  state.page = Number(b.dataset.page); render(); toTop();
});
$('#filter-toggle').addEventListener('click', () => $('#filters').classList.toggle('show'));

$('#btn-clear').addEventListener('click', () => {
  Object.assign(state, { cat: 0, q: '', min: '', max: '', inStock: false, sale: false });
  state.colors.clear();
  $$('#color-filter input').forEach(i => { i.checked = false; });
  $('#f-instock').checked = $('#f-sale').checked = false;
  $('#price-error').textContent = '';
  const box = $('.nav-search input'); if (box) box.value = '';
  syncPriceInputs(); refresh();
});

$('#active-chips').addEventListener('click', e => {
  const b = e.target.closest('[data-chip]');
  if (!b) return;
  const k = b.dataset.chip;
  if (k === 'cat') state.cat = 0;
  else if (k === 'q') { state.q = ''; const box = $('.nav-search input'); if (box) box.value = ''; }
  else if (k === 'price') { state.min = state.max = ''; syncPriceInputs(); }
  else if (k === 'inStock') { state.inStock = false; $('#f-instock').checked = false; }
  else if (k === 'sale') { state.sale = false; $('#f-sale').checked = false; }
  else if (k.startsWith('color:')) {
    const name = k.slice(6); state.colors.delete(name);
    $$('#color-filter input').forEach(i => { if (i.value === name) i.checked = false; });
  }
  refresh();
});

const searchBox = $('.nav-search input');
if (searchBox) searchBox.value = state.q;

syncPriceInputs();
render();
