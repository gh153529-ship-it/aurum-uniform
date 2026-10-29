/* Quản lý đơn hàng: xem, lọc, xem chi tiết, đổi trạng thái, xoá đơn đã huỷ */
import { $, esc, money, norm, fmtDateTime } from '../../js/core/utils.js';
import { api } from '../../js/core/api.js';
import { ORDER_STATUS } from '../../js/core/pricing.js';
import { toast, confirmDialog } from '../../js/ui/feedback.js';
import { renderAdminLayout, paginate, pagerHTML, bindPager, openOrderModal, showLoadError } from './admin.js';

await renderAdminLayout('orders', 'Quản lý đơn hàng');

const PAY_SHORT = { cod: 'COD', bank: 'Chuyển khoản', ewallet: 'Ví điện tử' };
let page = 1, status = '', orders = [];

const load = async () => { orders = await api.orders.list(); };

function renderTabs() {
  const tabs = [['', 'Tất cả', orders.length], ...Object.entries(ORDER_STATUS).map(([k, v]) => [k, v.label, orders.filter(o => o.status === k).length])];
  $('#f-status').innerHTML = tabs.map(([k, label, n]) => `<button data-s="${k}" class="${k === status ? 'active' : ''}">${label} (${n})</button>`).join('');
}

function render() {
  renderTabs();
  const kw = norm($('#search').value), pay = $('#f-payment').value, from = $('#f-from').value, to = $('#f-to').value;
  const list = orders.filter(o => {
    const local = new Date(o.created_date).toLocaleDateString('sv-SE');      // YYYY-MM-DD theo giờ máy
    return (!status || o.status === status) &&
      (!kw || norm(o.code + ' ' + o.customer.name + ' ' + o.customer.phone + ' ' + o.customer.email).includes(kw)) &&
      (!pay || o.payment === pay) && (!from || local >= from) && (!to || local <= to);
  }).sort((a, b) => b.created_date.localeCompare(a.created_date));
  const pg = paginate(list, page, 10); page = pg.page;

  $('#rows').innerHTML = pg.rows.length ? pg.rows.map(o => `<tr>
    <td><b>${esc(o.code)}</b></td>
    <td>${esc(o.customer.name)}<br><small class="muted">${esc(o.customer.phone)}</small></td>
    <td>${fmtDateTime(o.created_date)}</td>
    <td class="center">${o.total_qty}</td>
    <td class="num"><b>${money(o.total)}</b></td>
    <td>${PAY_SHORT[o.payment] || o.payment}</td>
    <td><span class="tag ${ORDER_STATUS[o.status].cls}">${ORDER_STATUS[o.status].label}</span></td>
    <td><div class="actions">
      <button class="act primary" data-view="${o.id}">Xem chi tiết</button>
      ${o.status === 'cancelled' ? `<button class="act danger" data-del="${o.id}">Xoá</button>` : ''}
    </div></td></tr>`).join('') : '<tr><td colspan="8" class="empty-row">Không có đơn hàng phù hợp</td></tr>';
  $('#foot').innerHTML = pagerHTML(pg).replace('<span>', `<span>Tổng giá trị: <b>${money(list.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0))}</b> · `);
}

const refresh = async () => { try { await load(); await renderAdminLayout('orders', 'Quản lý đơn hàng'); render(); } catch (e) { showLoadError(e); } };

$('#f-status').addEventListener('click', e => { const b = e.target.closest('[data-s]'); if (b) { status = b.dataset.s; page = 1; render(); } });
['#f-payment', '#f-from', '#f-to'].forEach(s => $(s).addEventListener('change', () => { page = 1; render(); }));
$('#search').addEventListener('input', () => { page = 1; render(); });
$('#btn-clear').addEventListener('click', () => {
  $('#search').value = ''; $('#f-payment').value = ''; $('#f-from').value = ''; $('#f-to').value = '';
  status = ''; page = 1; render();
});
$('#rows').addEventListener('click', async e => {
  const v = e.target.closest('[data-view]');
  if (v) return openOrderModal(orders.find(o => o.id === Number(v.dataset.view)), refresh);
  const del = e.target.closest('[data-del]');
  if (del) {
    const o = orders.find(x => x.id === Number(del.dataset.del));
    if (!await confirmDialog(`Xoá hẳn đơn hàng ${esc(o.code)}? Thao tác không thể hoàn tác.`, { title: 'Xoá đơn hàng', ok: 'Xoá', danger: true })) return;
    try { await api.orders.remove(o.id); toast('Đã xoá đơn hàng'); refresh(); } catch (err) { toast(err.message, 'error'); }
  }
});
bindPager($('#foot'), n => { page = n; render(); });

// Mở thẳng một đơn khi đi từ trang khách hàng: orders.html?code=AU...
const code = new URLSearchParams(location.search).get('code');
if (code) $('#search').value = code;
await refresh();
if (code) { const o = orders.find(x => x.code === code); if (o) openOrderModal(o, refresh); }
