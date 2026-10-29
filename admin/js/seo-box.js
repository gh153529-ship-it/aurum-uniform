/* Khung "Cấu hình SEO" dùng chung cho form sản phẩm và bài viết:
   từ khoá chính, tiêu đề SEO, đường dẫn, mô tả, từ khoá meta,
   xem trước kết quả Google + chấm điểm SEO trực tiếp khi gõ. */
import { $, esc, slugify } from '../../js/core/utils.js';
import { seoChecks, scoreClass, LIMITS } from '../../js/core/seo-check.js';

/**
 * @param {object} item     dữ liệu hiện có (sản phẩm / bài viết) hoặc {}
 * @param {'product'|'post'} kind
 */
export function seoBoxHTML(item = {}, kind = 'product') {
  const prefix = kind === 'post' ? '/tin-tuc/' : '/san-pham/';
  return `<fieldset class="seo-box" id="seo-box">
    <legend>🔍 Cấu hình SEO</legend>
    <div class="seo-cols">
      <div class="form-grid">
        <div class="field"><label for="seo-kw">Từ khoá chính (focus keyword)</label>
          <input class="input" id="seo-kw" value="${esc(item.focus_keyword || '')}" placeholder="VD: áo polo đồng phục">
          <span class="hint">Cụm từ khách hàng hay gõ trên Google mà bạn muốn trang này lên top.</span></div>
        <div class="field"><label for="seo-title">Tiêu đề SEO (thẻ &lt;title&gt;) <span class="counter" data-for="seo-title"></span></label>
          <input class="input" id="seo-title" maxlength="70" value="${esc(item.seo_title || '')}" placeholder="Để trống sẽ dùng tên ${kind === 'post' ? 'bài viết' : 'sản phẩm'}"></div>
        <div class="field"><label for="seo-slug">Đường dẫn (slug)</label>
          <div class="slug-row"><span class="slug-prefix">${prefix}</span><input class="input" id="seo-slug" value="${esc(item.slug || '')}" placeholder="tu-dong-tao-tu-ten"><button type="button" class="btn btn-outline btn-sm" id="seo-slug-gen">Tạo từ tên</button></div></div>
        <div class="field"><label for="seo-desc">Mô tả SEO (meta description) <span class="counter" data-for="seo-desc"></span></label>
          <textarea class="input" id="seo-desc" rows="3" maxlength="200" placeholder="1–2 câu tóm tắt, có từ khoá chính, kêu gọi hành động">${esc(item.seo_description || '')}</textarea></div>
        <div class="field"><label for="seo-keywords">Từ khoá meta (cách nhau bởi dấu phẩy)</label>
          <input class="input" id="seo-keywords" value="${esc(item.seo_keywords || '')}" placeholder="áo polo, đồng phục công ty, ..."></div>
      </div>
      <div>
        <div class="serp-label">Xem trước trên Google</div>
        <div class="serp" id="seo-serp"></div>
        <div class="seo-score-head"><span>Điểm SEO</span><b id="seo-score"></b></div>
        <ul class="seo-checks" id="seo-checks"></ul>
      </div>
    </div>
  </fieldset>`;
}

/**
 * Gắn sự kiện cho khung SEO.
 * @param {HTMLElement} root   modal chứa form
 * @param {() => {name:string, content:string, image:string}} ctx  lấy dữ liệu khác của form (tên, nội dung, ảnh)
 * @param {'product'|'post'} kind
 * @param {string} siteUrl  địa chỉ website (để hiện trong bản xem trước)
 */
export function bindSeoBox(root, ctx, kind = 'product', siteUrl = location.origin) {
  const f = id => $('#' + id, root);
  const prefix = kind === 'post' ? '/tin-tuc/' : '/san-pham/';
  const domain = siteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
  let slugTouched = !!f('seo-slug').value;

  const update = () => {
    const c = ctx();
    if (!slugTouched) f('seo-slug').value = slugify(c.name);
    const v = values();
    const title = v.seo_title || c.name;
    const desc = v.seo_description || c.content.replace(/[#*[\]()]/g, '').slice(0, 160);
    f('seo-serp').innerHTML = `
      <div class="serp-site"><span class="serp-fav">A</span><div><b>${esc(domain)}</b><small>${esc(domain)} › ${esc(prefix.replace(/\//g, ''))} › ${esc(v.slug || '...')}</small></div></div>
      <div class="serp-title">${esc(title.length > 60 ? title.slice(0, 60) + '…' : title)}</div>
      <div class="serp-desc">${esc(desc.length > 160 ? desc.slice(0, 160) + '…' : desc)}</div>`;
    const { score, checks } = seoChecks({ kind, ...v, seo_title: title, content: c.content, image: c.image });
    f('seo-score').textContent = score + '/100';
    f('seo-score').className = 'score-' + scoreClass(score);
    f('seo-checks').innerHTML = checks.map(x => `<li class="${x.ok ? 'ok' : 'no'}">${x.ok ? '✔' : '✖'} ${esc(x.label)}</li>`).join('');
    root.querySelectorAll('.counter').forEach(el => {
      const len = f(el.dataset.for).value.length;
      const [min, max] = el.dataset.for === 'seo-title' ? [LIMITS.titleMin, LIMITS.titleMax] : [LIMITS.descMin, LIMITS.descMax];
      el.textContent = `${len}/${max}`;
      el.className = 'counter ' + (len >= min && len <= max ? 'good' : len ? 'ok' : '');
    });
  };
  const values = () => ({
    focus_keyword: f('seo-kw').value.trim(), seo_title: f('seo-title').value.trim(), slug: slugify(f('seo-slug').value),
    seo_description: f('seo-desc').value.trim(), seo_keywords: f('seo-keywords').value.trim()
  });

  f('seo-slug').addEventListener('input', () => { slugTouched = true; });
  f('seo-slug').addEventListener('change', () => { f('seo-slug').value = slugify(f('seo-slug').value); update(); });
  f('seo-slug-gen').addEventListener('click', () => { slugTouched = false; update(); });
  root.addEventListener('input', update);
  root.addEventListener('change', update);
  update();
  return { values, update };
}
