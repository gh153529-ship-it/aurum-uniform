/* Quản lý bài viết (tin tức) + cấu hình SEO từng bài */
import { $, qs, esc, norm, fmtDate } from '../../js/core/utils.js';
import { api } from '../../js/core/api.js';
import { postUrl } from '../../js/core/links.js';
import { seoChecks, scoreClass } from '../../js/core/seo-check.js';
import { renderRich, wordCount } from '../../js/ui/rich.js';
import { postCover } from '../../js/ui/posts.js';
import { openModal, closeModal, toast, confirmDialog, setFieldError, showServerErrors } from '../../js/ui/feedback.js';
import { renderAdminLayout, paginate, pagerHTML, bindPager, showLoadError, compressToDataUrl } from './admin.js';
import { seoBoxHTML, bindSeoBox } from './seo-box.js';

await renderAdminLayout('posts', 'Bài viết & SEO bài viết');

let page = 1, posts = [], siteUrl = location.origin;
const postSeo = x => seoChecks({ kind: 'post', ...x });

async function load() {
  const [list, settings] = await Promise.all([api.posts.list({ scope: 'admin' }), api.settings.all()]);
  posts = list; siteUrl = settings.seo.site_url || location.origin;
}

function render() {
  const kw = norm($('#search').value), st = $('#f-status').value;
  const list = posts.filter(x => (!kw || norm(`${x.title} ${x.tags}`).includes(kw)) && (st === '' || String(Number(x.active)) === st));
  const pg = paginate(list, page, 8); page = pg.page;
  $('#rows').innerHTML = pg.rows.length ? pg.rows.map(x => {
    const s = postSeo(x).score;
    return `<tr>
      <td><div class="cell-prod"><div class="thumb post-thumb">${postCover(x)}</div><div><b>${esc(x.title)}</b><small>${postUrl(x).replace('../', '/')}</small></div></div></td>
      <td>${x.focus_keyword ? `<span class="tag tag-gold">${esc(x.focus_keyword)}</span>` : '<span class="muted">—</span>'}</td>
      <td>${fmtDate(x.created_at)}<br><small class="muted">${wordCount(x.content)} từ</small></td>
      <td>${x.active ? '<span class="tag tag-on">Hiển thị</span>' : '<span class="tag tag-off">Ẩn</span>'}</td>
      <td class="center"><button class="seo-badge score-${scoreClass(s)}" data-seo="${x.id}" title="Mở cấu hình SEO">${s}</button></td>
      <td><div class="actions">
        <a class="act" href="${postUrl(x)}" target="_blank" rel="noopener">Xem</a>
        <button class="act" data-seo="${x.id}">SEO</button>
        <button class="act primary" data-edit="${x.id}">Sửa</button>
        <button class="act danger" data-del="${x.id}">Xoá</button>
      </div></td></tr>`;
  }).join('') : '<tr><td colspan="6" class="empty-row">Chưa có bài viết</td></tr>';
  $('#foot').innerHTML = pagerHTML(pg);
}
async function refresh() { try { await load(); render(); } catch (e) { showLoadError(e); } }

/* ---------- Form viết / sửa bài ---------- */
function openForm(x, focusSeo = false) {
  const editing = !!x;
  const m = openModal(`<h3>${editing ? 'Sửa bài viết' : 'Viết bài mới'}</h3>
    <form class="form-grid" id="bf" novalidate>
      <div class="field"><label for="bf-title">Tiêu đề bài viết (H1) <span class="req">*</span></label>
        <input class="input" id="bf-title" value="${esc(x?.title || '')}" placeholder="VD: Cách chọn áo polo đồng phục công ty"></div>
      <div class="field"><label for="bf-summary">Tóm tắt (sapo)</label>
        <textarea class="input" id="bf-summary" rows="2" maxlength="400">${esc(x?.summary || '')}</textarea></div>
      <div class="field"><label for="bf-image">Ảnh đại diện (16:9)</label>
        <div class="img-preview">
          <div class="thumb post-thumb-lg" id="bf-preview"></div>
          <div style="flex:1">
            <input class="input" id="bf-image" value="${esc(x?.image || '')}" placeholder="images/posts/ten-anh.webp">
            <input type="file" id="bf-file" accept="image/*" style="margin-top:8px; font-size:13px">
            <span class="hint" id="bf-file-hint">Ảnh được nén sang WebP (≤ 1200px) và lưu vào <code>images/posts/</code>.</span>
          </div>
        </div></div>
      <div class="field">
        <label for="bf-content">Nội dung <span class="req">*</span>
          <span class="editor-tabs"><button type="button" class="active" data-tab="write">Soạn</button><button type="button" data-tab="preview">Xem trước</button></span></label>
        <textarea class="input editor" id="bf-content" rows="14" placeholder="Viết nội dung...">${esc(x?.content || '')}</textarea>
        <div class="post-content editor-preview hidden" id="bf-preview-body"></div>
        <span class="hint">Cú pháp: <code>## Tiêu đề phụ</code> · <code>- gạch đầu dòng</code> · <code>**in đậm**</code> · liên kết <code>[chữ](/san-pham/polo-aurum-classic)</code> · cách 1 dòng trống để xuống đoạn. <b id="bf-words"></b></span>
      </div>
      <div class="form-grid two">
        <div class="field"><label for="bf-tags">Thẻ (tags)</label><input class="input" id="bf-tags" value="${esc(x?.tags || '')}" placeholder="áo polo, kinh nghiệm"></div>
        <div class="field"><label for="bf-author">Tác giả</label><input class="input" id="bf-author" value="${esc(x?.author || 'AURUM Uniform')}"></div>
      </div>
      ${seoBoxHTML(x || {}, 'post')}
      <label class="switch-row"><input type="checkbox" id="bf-active" ${!x || x.active ? 'checked' : ''}> Hiển thị bài viết trên website</label>
      <div class="modal-actions">
        <button type="button" class="btn btn-outline" data-close>Huỷ</button>
        <button type="submit" class="btn btn-dark">${editing ? 'Lưu thay đổi' : 'Đăng bài'}</button>
      </div>
    </form>`, 'wide');
  const f = id => $('#' + id, m);

  const preview = () => { f('bf-preview').innerHTML = postCover({ title: f('bf-title').value || 'Ảnh bài viết', image: f('bf-image').value.trim() }); };
  const words = () => { f('bf-words').textContent = `· ${wordCount(f('bf-content').value)} từ`; };
  f('bf-image').addEventListener('change', preview);
  f('bf-content').addEventListener('input', words);
  preview(); words();

  f('bf-file').addEventListener('change', async e => {
    const file = e.target.files[0]; if (!file) return;
    const hint = f('bf-file-hint'); hint.textContent = 'Đang nén và tải ảnh lên...';
    try {
      const res = await api.upload(file.name, await compressToDataUrl(file, 1200), 'posts');
      f('bf-image').value = res.path; hint.textContent = `Đã lưu ${res.path} (${(res.size / 1024).toFixed(0)}KB)`;
      preview(); f('bf-image').dispatchEvent(new Event('change', { bubbles: true }));
    } catch (err) { hint.textContent = ''; toast(err.message, 'error'); }
  });

  m.querySelector('.editor-tabs').addEventListener('click', e => {
    const b = e.target.closest('[data-tab]'); if (!b) return;
    m.querySelectorAll('.editor-tabs button').forEach(x => x.classList.toggle('active', x === b));
    const pv = b.dataset.tab === 'preview';
    f('bf-content').classList.toggle('hidden', pv);
    f('bf-preview-body').classList.toggle('hidden', !pv);
    if (pv) f('bf-preview-body').innerHTML = renderRich(f('bf-content').value);
  });

  const seo = bindSeoBox(m, () => ({ name: f('bf-title').value.trim(), content: f('bf-content').value, image: f('bf-image').value.trim() }), 'post', siteUrl);
  if (focusSeo) setTimeout(() => f('seo-box').scrollIntoView({ block: 'start' }), 50);

  f('bf').addEventListener('submit', async e => {
    e.preventDefault();
    const title = f('bf-title').value.trim(), content = f('bf-content').value.trim();
    setFieldError(f('bf-title'), title.length >= 5 ? '' : 'Tiêu đề tối thiểu 5 ký tự');
    setFieldError(f('bf-content'), content.length >= 50 ? '' : 'Nội dung tối thiểu 50 ký tự');
    if (title.length < 5 || content.length < 50) return;
    const body = {
      title, content, summary: f('bf-summary').value.trim(), image: f('bf-image').value.trim(), tags: f('bf-tags').value.trim(),
      author: f('bf-author').value.trim(), active: f('bf-active').checked, ...seo.values()
    };
    const btn = $('button[type=submit]', m); btn.disabled = true;
    try {
      if (editing) await api.posts.update(x.id, body); else await api.posts.create(body);
      closeModal(); toast(editing ? 'Đã cập nhật bài viết' : 'Đã đăng bài viết'); refresh();
    } catch (err) {
      btn.disabled = false;
      showServerErrors({ title: f('bf-title'), content: f('bf-content'), slug: f('seo-slug'), seo_title: f('seo-title'), seo_description: f('seo-desc') }, err.fieldErrors);
      if (!Object.keys(err.fieldErrors).length) toast(err.message, 'error');
    }
  });
}

$('#btn-add').addEventListener('click', () => openForm(null));
$('#search').addEventListener('input', () => { page = 1; render(); });
$('#f-status').addEventListener('change', () => { page = 1; render(); });
$('#rows').addEventListener('click', async e => {
  const find = el => posts.find(x => x.id === Number(el));
  const sb = e.target.closest('[data-seo]'); if (sb) return openForm(find(sb.dataset.seo), true);
  const ed = e.target.closest('[data-edit]'); if (ed) return openForm(find(ed.dataset.edit));
  const del = e.target.closest('[data-del]');
  if (del) {
    const x = find(del.dataset.del);
    if (!await confirmDialog(`Xoá bài viết “${esc(x.title)}”?`, { title: 'Xoá bài viết', ok: 'Xoá', danger: true })) return;
    try { await api.posts.remove(x.id); toast('Đã xoá bài viết'); refresh(); } catch (err) { toast(err.message, 'error'); }
  }
});
bindPager($('#foot'), n => { page = n; render(); });

await refresh();
if (qs('seo')) { const x = posts.find(p => p.id === Number(qs('seo'))); if (x) openForm(x, true); }
