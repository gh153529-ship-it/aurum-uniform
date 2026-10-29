/* Dashboard: thống kê số lượng sản phẩm được đặt mua, doanh thu, hàng tồn (số liệu do API /stats tính) */
import { $, $$, esc, money, num, fmtDate } from '../../js/core/utils.js';
import { api } from '../../js/core/api.js';
import { ORDER_STATUS } from '../../js/core/pricing.js';
import { productImage } from '../../js/ui/image.js';
import { renderAdminLayout, openOrderModal, showLoadError } from './admin.js';

await renderAdminLayout('dashboard', 'Dashboard');

let period = 'all', stockFilter = 'all', data = null;

/* ---------- Biểu đồ vẽ bằng Canvas (không dùng thư viện) ---------- */
function setupCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const { width, height } = canvas.getBoundingClientRect();
  canvas.width = width * dpr; canvas.height = height * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  return { ctx, width, height };
}
const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const shortMoney = n => n >= 1e9 ? (n / 1e9).toFixed(1).replace('.0', '') + ' tỷ' : n >= 1e6 ? (n / 1e6).toFixed(1).replace('.0', '') + ' tr' : n >= 1e3 ? Math.round(n / 1e3) + 'k' : String(n);

function barChart(canvas, tip, labels, values) {
  const { ctx, width, height } = setupCanvas(canvas);
  const pad = { l: 52, r: 10, t: 16, b: 30 };
  const w = width - pad.l - pad.r, h = height - pad.t - pad.b;
  const max = Math.max(...values, 1) * 1.15;
  ctx.font = '12px ' + css('--font');
  for (let i = 0; i <= 4; i++) {
    const y = pad.t + h - (h * i) / 4;
    ctx.strokeStyle = '#eee7d6'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + w, y); ctx.stroke();
    ctx.fillStyle = '#8b8577'; ctx.textAlign = 'right';
    ctx.fillText(shortMoney(Math.round((max * i) / 4)), pad.l - 8, y + 4);
  }
  const slot = w / values.length, bw = Math.min(46, slot * 0.55);
  const bars = values.map((v, i) => {
    const x = pad.l + slot * i + (slot - bw) / 2, bh = (v / max) * h, y = pad.t + h - bh;
    const last = i === values.length - 1;
    const g = ctx.createLinearGradient(0, y, 0, y + bh);
    g.addColorStop(0, last ? '#ecd596' : '#d4b058'); g.addColorStop(1, last ? '#c9a54c' : '#9c7c2e');
    ctx.fillStyle = g;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, bw, bh, [6, 6, 0, 0]); else ctx.rect(x, y, bw, bh);
    ctx.fill();
    ctx.fillStyle = '#5d584c'; ctx.textAlign = 'center';
    ctx.fillText(labels[i], x + bw / 2, height - 10);
    return { x, y, bw, v, label: labels[i] };
  });
  canvas.onmousemove = e => {
    const mx = e.clientX - canvas.getBoundingClientRect().left;
    const b = bars.find(b => mx >= b.x - 6 && mx <= b.x + b.bw + 6);
    if (!b) { tip.style.opacity = 0; return; }
    tip.innerHTML = `${b.label}: <b>${money(b.v)}</b>`;
    tip.style.left = b.x + b.bw / 2 + 'px'; tip.style.top = b.y + 'px'; tip.style.opacity = 1;
  };
  canvas.onmouseleave = () => { tip.style.opacity = 0; };
}

function donutChart(canvas, items, centerText) {
  const { ctx, width, height } = setupCanvas(canvas);
  const total = items.reduce((s, x) => s + x.value, 0);
  const cx = width / 2, cy = height / 2, R = Math.min(width, height) / 2 - 6, r = R * 0.62;
  let a = -Math.PI / 2;
  if (!total) {
    ctx.strokeStyle = '#eee7d6'; ctx.lineWidth = R - r;
    ctx.beginPath(); ctx.arc(cx, cy, (R + r) / 2, 0, Math.PI * 2); ctx.stroke();
  }
  items.forEach(it => {
    const ang = total ? (it.value / total) * Math.PI * 2 : 0;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, a, a + ang); ctx.closePath();
    ctx.fillStyle = it.color; ctx.fill();
    a += ang;
  });
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#14110d'; ctx.textAlign = 'center';
  ctx.font = 'bold 22px ' + css('--serif'); ctx.fillText(centerText, cx, cy + 4);
  ctx.font = '12px ' + css('--font'); ctx.fillStyle = '#8b8577'; ctx.fillText('áo đã bán', cx, cy + 22);
}

/* ---------- Hiển thị ---------- */
function render() {
  const s = data;
  $('#s-revenue').textContent = money(s.revenue);
  $('#s-revenue-sub').innerHTML = `Đã hoàn thành: <b style="color:var(--gold-2)">${money(s.completedRevenue)}</b>`;
  $('#s-sold').textContent = num(s.soldQty);
  $('#s-sold-sub').innerHTML = `Từ <b>${s.validOrders}</b> đơn hàng hợp lệ`;
  $('#s-stock').textContent = num(s.totalStock);
  $('#s-stock-sub').innerHTML = `${s.productCount} mẫu · <b class="down">${s.outCount} hết hàng</b> · ${s.lowCount} sắp hết`;
  $('#s-orders').textContent = s.orderCount;
  $('#s-orders-sub').innerHTML = `<b style="color:#9a6b00">${s.pendingCount}</b> chờ xác nhận · <b class="down">${s.cancelledCount}</b> đã huỷ`;

  barChart($('#chart-revenue'), $('#tip-revenue'), s.revenueByMonth.map(m => m.label), s.revenueByMonth.map(m => m.value));

  const palette = ['#c9a54c', '#14110d', '#8a7a55', '#d9c8a9', '#5d584c', '#e2c579'];
  const byCat = s.qtyByCategory.map((c, i) => ({ ...c, color: palette[i % palette.length] }));
  donutChart($('#chart-cat'), byCat, num(s.soldQty));
  $('#legend-cat').innerHTML = byCat.map(x => `<div><i style="background:${x.color}"></i>${esc(x.name)}<b>${num(x.value)} áo</b></div>`).join('');

  $('#tbl-top').innerHTML = `<thead><tr><th>#</th><th>Sản phẩm</th><th class="num">Đã bán</th><th class="num">Doanh số</th></tr></thead><tbody>` +
    (s.topProducts.length ? s.topProducts.map((x, i) => `<tr><td><b class="gold">${i + 1}</b></td>
      <td><div class="cell-prod" style="min-width:0"><div class="thumb">${productImage(x)}</div><div><b>${esc(x.name)}</b><small>${esc(x.category)}</small></div></div></td>
      <td class="num">${num(x.sold)}</td><td class="num">${money(x.revenue)}</td></tr>`).join('')
      : '<tr><td colspan="4" class="empty-row">Chưa có dữ liệu trong khoảng thời gian này</td></tr>') + '</tbody>';

  const maxStock = Math.max(...s.stock.map(p => p.stock), 1);
  const rows = s.stock.filter(p => stockFilter === 'all' || p.stock < s.lowThreshold);
  $('#tbl-stock').innerHTML = `<thead><tr><th>Sản phẩm</th><th class="num">Tồn kho</th><th>Trạng thái</th></tr></thead><tbody>` +
    (rows.length ? rows.map(p => {
      const cls = p.stock === 0 ? 'zero' : p.stock < s.lowThreshold ? 'low' : '';
      const tag = p.stock === 0 ? '<span class="tag tag-off">Hết hàng</span>' : p.stock < s.lowThreshold ? '<span class="tag tag-warn">Sắp hết</span>' : '<span class="tag tag-on">Còn hàng</span>';
      const note = p.variants_out ? `<small class="muted">${p.variants_out}/${p.variants} biến thể hết</small>` : '';
      return `<tr><td>${esc(p.name)}${note ? '<br>' + note : ''}</td><td class="num"><b>${num(p.stock)}</b><div class="stock-bar" style="margin-left:auto"><i class="${cls}" style="width:${Math.max(3, p.stock / maxStock * 100)}%"></i></div></td><td>${tag}</td></tr>`;
    }).join('') : '<tr><td colspan="3" class="empty-row">Không có sản phẩm sắp hết hàng 🎉</td></tr>') + '</tbody>';

  $('#tbl-recent').innerHTML = `<thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Ngày đặt</th><th class="num">SL áo</th><th class="num">Tổng tiền</th><th>Trạng thái</th><th></th></tr></thead><tbody>` +
    s.recentOrders.map(o => `<tr><td><b>${esc(o.code)}</b></td><td>${esc(o.customer.name)}</td><td>${fmtDate(o.created_date)}</td>
      <td class="num">${o.total_qty}</td><td class="num"><b>${money(o.total)}</b></td>
      <td><span class="tag ${ORDER_STATUS[o.status].cls}">${ORDER_STATUS[o.status].label}</span></td>
      <td class="num"><button class="act" data-order="${o.id}">Chi tiết</button></td></tr>`).join('') + '</tbody>';
}

async function load() {
  try { data = await api.stats(period); render(); } catch (e) { showLoadError(e); }
}

$('#period').addEventListener('click', e => {
  const b = e.target.closest('[data-p]'); if (!b) return;
  period = b.dataset.p;
  $$('#period button').forEach(x => x.classList.toggle('active', x === b));
  load();
});
$('#stock-filter').addEventListener('click', e => {
  const b = e.target.closest('[data-f]'); if (!b) return;
  stockFilter = b.dataset.f;
  $$('#stock-filter button').forEach(x => x.classList.toggle('active', x === b));
  if (data) render();
});
$('#tbl-recent').addEventListener('click', e => {
  const b = e.target.closest('[data-order]');
  if (!b) return;
  const o = data.recentOrders.find(x => x.id === Number(b.dataset.order));
  openOrderModal(o, async () => { await renderAdminLayout('dashboard', 'Dashboard'); load(); });
});
let t;
window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => data && render(), 150); });

await load();
