/* Quản lý danh mục: xem, thêm, sửa, ẩn/hiện, xoá */
import { $, esc, norm, slugify } from '../../js/core/utils.js';
import { api } from '../../js/core/api.js';
import { openModal, closeModal, toast, confirmDialog, setFieldError, showServerErrors } from '../../js/ui/feedback.js';
import { renderAdminLayout, paginate, pagerHTML, bindPager, showLoadError } from './admin.js';

await renderAdminLayout('categories', 'Quản lý danh mục');

let page = 1, cats = [];
const load = async () => { cats = await api.categories.list({ scope: 'admin' }); };
const nameOf = id => (cats.find(c => c.id === id) || {}).name;

function render() {
  const kw = norm($('#search').value);
  const st = $('#f-status').value;
  const list = cats.filter(c => (!kw || norm(c.name + ' ' + c.slug).includes(kw)) && (st === '' || String(+c.active) === st));
  const pg = paginate(list, page, 8); page = pg.page;

  $('#rows').innerHTML = pg.rows.length ? pg.rows.map(c => `<tr>
    <td>#${c.id}</td>
    <td><b>${esc(c.name)}</b>${c.parent_id ? `<br><small class="muted">Thuộc: ${esc(nameOf(c.parent_id) || '—')}</small>` : ''}</td>
    <td><code>${esc(c.slug)}</code></td>
    <td style="max-width:320px">${esc(c.description || '—')}</td>
    <td class="center">${c.product_count}</td>
    <td>${c.active ? '<span class="tag tag-on">Hiển thị</span>' : '<span class="tag tag-off">Đang ẩn</span>'}</td>
    <td><div class="actions">
      <button class="act primary" data-edit="${c.id}">Sửa</button>
      <button class="act" data-toggle="${c.id}">${c.active ? 'Ẩn' : 'Hiện'}</button>
      <button class="act danger" data-del="${c.id}">Xoá</button>
    </div></td></tr>`).join('')
    : '<tr><td colspan="7" class="empty-row">Không có danh mục nào</td></tr>';
  $('#foot').innerHTML = pagerHTML(pg);
}

async function refresh() { try { await load(); render(); } catch (e) { showLoadError(e); } }

function openForm(cat) {
  const editing = !!cat;
  const parents = cats.filter(c => !cat || c.id !== cat.id);
  const m = openModal(`<h3>${editing ? 'Sửa danh mục #' + cat.id : 'Thêm danh mục mới'}</h3>
    <form class="form-grid" id="cat-form" novalidate>
      <div class="field"><label for="cf-name">Tên danh mục <span class="req">*</span></label>
        <input class="input" id="cf-name" value="${esc(cat ? cat.name : '')}" placeholder="VD: Áo polo"></div>
      <div class="form-grid two">
        <div class="field"><label for="cf-slug">Đường dẫn (slug)</label>
          <input class="input" id="cf-slug" value="${esc(cat ? cat.slug : '')}" placeholder="tự tạo từ tên nếu để trống"></div>
        <div class="field"><label for="cf-parent">Danh mục cha</label>
          <select class="select" id="cf-parent"><option value="">— Không có (danh mục gốc) —</option>
            ${parents.map(c => `<option value="${c.id}" ${cat && cat.parent_id === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
          </select></div>
      </div>
      <div class="field"><label for="cf-desc">Mô tả</label>
        <textarea class="input" id="cf-desc" rows="3">${esc(cat ? cat.description : '')}</textarea></div>
      <label class="switch-row"><input type="checkbox" id="cf-active" ${!cat || cat.active ? 'checked' : ''}> Hiển thị trên trang bán hàng</label>
      <div class="modal-actions">
        <button type="button" class="btn btn-outline" data-close>Huỷ</button>
        <button type="submit" class="btn btn-dark">${editing ? 'Lưu thay đổi' : 'Thêm danh mục'}</button>
      </div>
    </form>`);
  const nameInput = $('#cf-name', m), slugInput = $('#cf-slug', m);
  nameInput.addEventListener('input', () => { if (!editing) slugInput.value = slugify(nameInput.value); });
  nameInput.focus();

  $('#cat-form', m).addEventListener('submit', async e => {
    e.preventDefault();
    const name = nameInput.value.trim();
    if (name.length < 2) { setFieldError(nameInput, 'Tên danh mục tối thiểu 2 ký tự'); return; }
    const data = {
      name, slug: slugInput.value.trim() || slugify(name), parent_id: $('#cf-parent', m).value || null,
      description: $('#cf-desc', m).value.trim(), active: $('#cf-active', m).checked
    };
    try {
      if (editing) await api.categories.update(cat.id, data); else await api.categories.create(data);
      closeModal();
      toast(editing ? 'Đã cập nhật danh mục' : 'Đã thêm danh mục “' + name + '”');
      refresh();
    } catch (err) {
      showServerErrors({ name: nameInput }, err.fieldErrors);
      if (!err.fieldErrors.name) toast(err.message, 'error');
    }
  });
}

$('#btn-add').addEventListener('click', () => openForm(null));
$('#search').addEventListener('input', () => { page = 1; render(); });
$('#f-status').addEventListener('change', () => { page = 1; render(); });
$('#rows').addEventListener('click', async e => {
  const ed = e.target.closest('[data-edit]');
  if (ed) return openForm(cats.find(c => c.id === Number(ed.dataset.edit)));
  const tg = e.target.closest('[data-toggle]');
  if (tg) {
    const c = cats.find(x => x.id === Number(tg.dataset.toggle));
    try { await api.categories.patch(c.id, { active: !c.active }); toast(`Đã ${c.active ? 'ẩn' : 'hiện'} danh mục “${c.name}”`); refresh(); }
    catch (err) { toast(err.message, 'error'); }
    return;
  }
  const del = e.target.closest('[data-del]');
  if (del) {
    const c = cats.find(x => x.id === Number(del.dataset.del));
    if (!await confirmDialog(`Xoá danh mục “${esc(c.name)}”?`, { title: 'Xoá danh mục', ok: 'Xoá', danger: true })) return;
    try { await api.categories.remove(c.id); toast('Đã xoá danh mục'); refresh(); }
    catch (err) { toast(err.message, 'error'); }
  }
});
bindPager($('#foot'), n => { page = n; render(); });

await refresh();
