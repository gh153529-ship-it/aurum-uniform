/* Quản lý khách hàng: xem, thêm, sửa, khoá / mở khoá, xoá */
import { $, esc, money, norm, fmtDate } from '../../js/core/utils.js';
import { api } from '../../js/core/api.js';
import { ORDER_STATUS } from '../../js/core/pricing.js';
import { Valid } from '../../js/core/utils.js';
import { openModal, closeModal, toast, confirmDialog, setFieldError, showServerErrors } from '../../js/ui/feedback.js';
import { renderAdminLayout, paginate, pagerHTML, bindPager, showLoadError } from './admin.js';

await renderAdminLayout('customers', 'Quản lý khách hàng');

let page = 1, users = [], orders = [];
async function load() {
  const [u, o] = await Promise.all([api.users.list(), api.orders.list()]);
  users = u.filter(x => x.role === 'customer'); orders = o;
}
const statsOf = id => {
  const os = orders.filter(o => o.user_id === id);
  return { count: os.length, spent: os.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0) };
};

function render() {
  const kw = norm($('#search').value), st = $('#f-status').value;
  const list = users
    .filter(u => (!kw || norm(u.name + ' ' + u.email + ' ' + u.phone).includes(kw)) && (st === '' || String(+u.active) === st))
    .sort((a, b) => b.id - a.id);
  const pg = paginate(list, page, 8); page = pg.page;

  $('#rows').innerHTML = pg.rows.length ? pg.rows.map(u => {
    const s = statsOf(u.id);
    return `<tr>
      <td><div class="cell-prod" style="min-width:180px"><span class="avatar" style="width:36px;height:36px">${esc(u.name.charAt(0))}</span><div><b>${esc(u.name)}</b><small>KH-${String(u.id).padStart(4, '0')}</small></div></div></td>
      <td>${esc(u.email)}<br><small class="muted">${esc(u.phone)}</small></td>
      <td style="max-width:240px">${esc(u.address || '—')}</td>
      <td class="center">${s.count}</td>
      <td class="num"><b>${money(s.spent)}</b></td>
      <td>${fmtDate(u.created_at)}</td>
      <td>${u.active ? '<span class="tag tag-on">Hoạt động</span>' : '<span class="tag tag-off">Đã khoá</span>'}</td>
      <td><div class="actions">
        <button class="act" data-orders="${u.id}">Đơn hàng</button>
        <button class="act primary" data-edit="${u.id}">Sửa</button>
        <button class="act danger" data-del="${u.id}">Xoá</button>
      </div></td></tr>`;
  }).join('') : '<tr><td colspan="8" class="empty-row">Không có khách hàng nào</td></tr>';
  $('#foot').innerHTML = pagerHTML(pg);
}
async function refresh() { try { await load(); render(); } catch (e) { showLoadError(e); } }

function openForm(u) {
  const editing = !!u;
  const m = openModal(`<h3>${editing ? 'Sửa thông tin khách hàng' : 'Thêm khách hàng mới'}</h3>
    <form class="form-grid" id="uf" novalidate>
      <div class="field"><label for="uf-name">Họ tên / Tên công ty <span class="req">*</span></label>
        <input class="input" id="uf-name" value="${esc(u ? u.name : '')}"></div>
      <div class="form-grid two">
        <div class="field"><label for="uf-email">Email <span class="req">*</span></label>
          <input class="input" id="uf-email" type="email" value="${esc(u ? u.email : '')}"></div>
        <div class="field"><label for="uf-phone">Số điện thoại <span class="req">*</span></label>
          <input class="input" id="uf-phone" value="${esc(u ? u.phone : '')}"></div>
      </div>
      <div class="field"><label for="uf-address">Địa chỉ</label>
        <input class="input" id="uf-address" value="${esc(u ? u.address : '')}"></div>
      <div class="field"><label for="uf-pw">Mật khẩu ${editing ? '' : '<span class="req">*</span>'}</label>
        <input class="input" id="uf-pw" type="password" autocomplete="new-password" placeholder="${editing ? 'Để trống nếu không đổi mật khẩu' : 'Tối thiểu 6 ký tự'}"></div>
      <label class="switch-row"><input type="checkbox" id="uf-active" ${!u || u.active ? 'checked' : ''}> Tài khoản đang hoạt động (bỏ chọn để khoá)</label>
      <div class="modal-actions">
        <button type="button" class="btn btn-outline" data-close>Huỷ</button>
        <button type="submit" class="btn btn-dark">${editing ? 'Lưu thay đổi' : 'Thêm khách hàng'}</button>
      </div>
    </form>`);

  $('#uf', m).addEventListener('submit', async e => {
    e.preventDefault();
    const f = id => $('#' + id, m);
    const pw = f('uf-pw').value;
    const checks = [
      [f('uf-name'), f('uf-name').value.trim().length >= 2, 'Vui lòng nhập họ tên'],
      [f('uf-email'), Valid.email(f('uf-email').value), 'Email không hợp lệ'],
      [f('uf-phone'), Valid.phone(f('uf-phone').value), 'Số điện thoại không hợp lệ'],
      [f('uf-pw'), editing ? (!pw || pw.length >= 6) : pw.length >= 6, 'Mật khẩu tối thiểu 6 ký tự']
    ];
    let ok = true;
    checks.forEach(([input, pass, msg]) => { setFieldError(input, pass ? '' : msg); if (!pass) ok = false; });
    if (!ok) return;
    const data = {
      name: f('uf-name').value.trim(), email: f('uf-email').value.trim(), phone: f('uf-phone').value.trim(),
      address: f('uf-address').value.trim(), active: f('uf-active').checked, ...(pw ? { password: pw } : {})
    };
    try {
      if (editing) await api.users.update(u.id, data); else await api.users.create(data);
      closeModal();
      toast(editing ? 'Đã cập nhật khách hàng' : 'Đã thêm khách hàng “' + data.name + '”');
      refresh();
    } catch (err) {
      showServerErrors({ name: f('uf-name'), email: f('uf-email'), phone: f('uf-phone'), password: f('uf-pw') }, err.fieldErrors);
      if (!Object.keys(err.fieldErrors).length) toast(err.message, 'error');
    }
  });
}

function showOrders(u) {
  const os = orders.filter(o => o.user_id === u.id).sort((a, b) => b.created_date.localeCompare(a.created_date));
  openModal(`<h3>Đơn hàng của ${esc(u.name)}</h3>
    <div class="table-wrap"><table class="data">
      <thead><tr><th>Mã đơn</th><th>Ngày đặt</th><th class="num">Tổng tiền</th><th>Trạng thái</th></tr></thead>
      <tbody>${os.length ? os.map(o => `<tr><td><a class="link" href="orders.html?code=${o.code}">${esc(o.code)}</a></td><td>${fmtDate(o.created_date)}</td><td class="num">${money(o.total)}</td><td><span class="tag ${ORDER_STATUS[o.status].cls}">${ORDER_STATUS[o.status].label}</span></td></tr>`).join('')
        : '<tr><td colspan="4" class="empty-row">Khách hàng chưa có đơn hàng</td></tr>'}</tbody>
    </table></div>`);
}

$('#btn-add').addEventListener('click', () => openForm(null));
$('#search').addEventListener('input', () => { page = 1; render(); });
$('#f-status').addEventListener('change', () => { page = 1; render(); });
$('#rows').addEventListener('click', async e => {
  const ed = e.target.closest('[data-edit]');
  if (ed) return openForm(users.find(x => x.id === Number(ed.dataset.edit)));
  const od = e.target.closest('[data-orders]');
  if (od) return showOrders(users.find(x => x.id === Number(od.dataset.orders)));
  const del = e.target.closest('[data-del]');
  if (del) {
    const u = users.find(x => x.id === Number(del.dataset.del));
    if (!await confirmDialog(`Xoá khách hàng “${esc(u.name)}”? Nếu khách đã có đơn hàng, tài khoản sẽ được khoá thay vì xoá.`, { title: 'Xoá khách hàng', ok: 'Xoá', danger: true })) return;
    try { const res = await api.users.remove(u.id); toast(res.softDeleted ? res.message : 'Đã xoá khách hàng'); refresh(); }
    catch (err) { toast(err.message, 'error'); }
  }
});
bindPager($('#foot'), n => { page = n; render(); });

await refresh();
