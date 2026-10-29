/* Tối ưu SEO hệ thống: thẻ meta trang chủ, robots, sitemap, Open Graph,
   Google Analytics 4, Google Search Console + kiểm tra SEO toàn trang */
import { $, esc } from '../../js/core/utils.js';
import { api } from '../../js/core/api.js';
import { seoChecks, scoreClass, LIMITS } from '../../js/core/seo-check.js';
import { toast, showServerErrors } from '../../js/ui/feedback.js';
import { renderAdminLayout, showLoadError, compressToDataUrl } from './admin.js';

await renderAdminLayout('seo', 'Tối ưu SEO hệ thống');

let settings, products, posts;
try {
  [settings, products, posts] = await Promise.all([api.settings.all(), api.products.list({ scope: 'admin' }), api.posts.list({ scope: 'admin' })]);
} catch (e) { showLoadError(e); throw e; }

const origin = () => (settings.seo.site_url || location.origin).replace(/\/$/, '');
const s = settings.seo;
const checked = v => (v ? 'checked' : '');

$('#page').innerHTML = `
  <div class="stats" id="seo-stats"></div>

  <div class="grid-2">
    <form class="panel" id="f-general" novalidate>
      <div class="panel-head"><h3>Thiết lập SEO chung</h3><button class="btn btn-dark btn-sm">Lưu thiết lập</button></div>
      <div class="form-grid">
        <div class="form-grid two">
          <div class="field"><label for="site_name">Tên website / thương hiệu</label><input class="input" id="site_name" value="${esc(s.site_name)}"></div>
          <div class="field"><label for="site_url">Địa chỉ website chính thức</label><input class="input" id="site_url" value="${esc(s.site_url)}" placeholder="https://aurum-uniform.onrender.com">
            <span class="hint">Dùng cho thẻ canonical, sitemap, Open Graph. Để trống = tự lấy theo tên miền đang truy cập.</span></div>
        </div>
        <div class="field"><label for="home_title">Tiêu đề trang chủ <span class="counter" data-for="home_title" data-min="${LIMITS.titleMin}" data-max="${LIMITS.titleMax}"></span></label><input class="input" id="home_title" maxlength="70" value="${esc(s.home_title)}"></div>
        <div class="field"><label for="home_description">Mô tả trang chủ (meta description) <span class="counter" data-for="home_description" data-min="${LIMITS.descMin}" data-max="${LIMITS.descMax}"></span></label><textarea class="input" id="home_description" rows="3" maxlength="200">${esc(s.home_description)}</textarea></div>
        <div class="field"><label for="home_keywords">Từ khoá trang chủ</label><input class="input" id="home_keywords" value="${esc(s.home_keywords)}"></div>
        <div class="field"><label for="title_suffix">Hậu tố tiêu đề các trang khác</label><input class="input" id="title_suffix" value="${esc(s.title_suffix)}" placeholder=" | AURUM Uniform">
          <span class="hint">VD trang danh mục: “Áo polo đồng phục – Mẫu đẹp, giá sỉ<b>${esc(s.title_suffix)}</b>”.</span></div>
        <div class="field"><label for="og_image">Ảnh chia sẻ mặc định (Open Graph, 1200×630)</label>
          <div class="img-preview">
            <div class="og-thumb" id="og-preview"></div>
            <div style="flex:1"><input class="input" id="og_image" value="${esc(s.og_image)}">
              <input type="file" id="og-file" accept="image/*" style="margin-top:8px; font-size:13px">
              <span class="hint" id="og-hint">Ảnh hiện khi chia sẻ link website lên Facebook, Zalo, Messenger.</span></div>
          </div></div>
        <label class="switch-row"><input type="checkbox" id="allow_index" ${checked(s.allow_index)}> Cho phép Google lập chỉ mục (index) website</label>
        <div class="field"><label for="robots_extra">Dòng bổ sung cho robots.txt (nâng cao)</label><textarea class="input" id="robots_extra" rows="2" placeholder="VD: Disallow: /thu-nghiem/">${esc(s.robots_extra)}</textarea></div>
      </div>
    </form>

    <div style="display:grid; gap:18px; align-content:start">
      <div class="panel">
        <div class="panel-head"><h3>Xem trước trang chủ trên Google</h3></div>
        <div class="serp" id="home-serp"></div>
      </div>
      <div class="panel">
        <div class="panel-head"><h3>Sitemap &amp; robots.txt</h3></div>
        <p class="hint" style="margin-top:0">Tự động cập nhật khi thêm / sửa sản phẩm và bài viết.</p>
        <div class="link-list">
          <a href="/sitemap.xml" target="_blank" rel="noopener">🗺 /sitemap.xml <small>${products.filter(p => p.active).length + posts.filter(p => p.active).length + 8} đường dẫn</small></a>
          <a href="/robots.txt" target="_blank" rel="noopener">🤖 /robots.txt</a>
        </div>
      </div>
      <div class="panel">
        <div class="panel-head"><h3>Kiểm tra SEO hệ thống</h3><b id="sys-score"></b></div>
        <ul class="seo-checks" id="sys-checks"></ul>
      </div>
    </div>
  </div>

  <form class="panel" id="f-google" novalidate style="margin-bottom:18px">
    <div class="panel-head"><h3>Google Analytics 4 &amp; Google Search Console</h3><button class="btn btn-dark btn-sm">Lưu mã Google</button></div>
    <div class="form-grid two">
      <div class="field"><label for="ga_id">Mã đo lường GA4 (Measurement ID) <span id="ga-status"></span></label>
        <input class="input" id="ga_id" value="${esc(s.ga_id)}" placeholder="G-XXXXXXXXXX">
        <span class="hint">analytics.google.com → Quản trị → Luồng dữ liệu → Web → <b>Mã đo lường</b>. Website tự gửi các sự kiện: xem trang, xem sản phẩm, thêm giỏ, mua hàng, tìm kiếm, chia sẻ.</span>
        <a class="link" href="https://analytics.google.com/" target="_blank" rel="noopener">Mở Google Analytics ↗</a></div>
      <div class="field"><label for="gsc_verification">Mã xác minh Search Console (thẻ HTML) <span id="gsc-status"></span></label>
        <input class="input" id="gsc_verification" value="${esc(s.gsc_verification)}" placeholder='Dán cả thẻ <meta name="google-site-verification" content="..."> cũng được'>
        <span class="hint">search.google.com/search-console → Thêm sản phẩm → <b>Tiền tố URL</b> → phương thức <b>Thẻ HTML</b>. Sau khi xác minh, gửi sitemap: <code>sitemap.xml</code></span>
        <a class="link" href="https://search.google.com/search-console" target="_blank" rel="noopener">Mở Google Search Console ↗</a></div>
    </div>
  </form>

  <div class="panel" style="margin-bottom:18px">
    <div class="panel-head"><h3>Công cụ kiểm tra bên ngoài</h3><span class="hint" style="margin:0">Chỉ dùng được khi website đã đưa lên internet</span></div>
    <div class="tool-grid" id="tools"></div>
  </div>

  <div class="panel">
    <div class="panel-head"><h3>Điểm SEO từng trang</h3>
      <div class="seg" id="seg"><button class="active" data-k="product">Sản phẩm</button><button data-k="post">Bài viết</button></div></div>
    <div class="table-wrap"><table class="data">
      <thead><tr><th>Trang</th><th>Từ khoá chính</th><th>Cần cải thiện</th><th class="center">Điểm</th><th class="num"></th></tr></thead>
      <tbody id="audit-rows"></tbody></table></div>
  </div>`;

/* ---------- Kiểm tra SEO ---------- */
const pChecks = products.filter(p => p.active).map(p => ({ ...p, kind: 'product', r: seoChecks({ kind: 'product', ...p, content: p.detail }) }));
const bChecks = posts.filter(p => p.active).map(p => ({ ...p, kind: 'post', r: seoChecks({ kind: 'post', ...p }) }));

function systemChecks() {
  const v = id => $('#' + id).value.trim();
  return [
    { ok: !!v('site_url'), label: 'Khai báo địa chỉ website chính thức' },
    { ok: $('#allow_index').checked, label: 'Cho phép Google lập chỉ mục (robots: index)' },
    { ok: v('home_title').length >= LIMITS.titleMin && v('home_title').length <= LIMITS.titleMax, label: `Tiêu đề trang chủ ${LIMITS.titleMin}–${LIMITS.titleMax} ký tự` },
    { ok: v('home_description').length >= LIMITS.descMin && v('home_description').length <= LIMITS.descMax, label: `Mô tả trang chủ ${LIMITS.descMin}–${LIMITS.descMax} ký tự` },
    { ok: !!v('og_image'), label: 'Có ảnh chia sẻ mặc định (Open Graph)' },
    { ok: !!settings.seo.ga_id, label: 'Đã gắn Google Analytics 4' },
    { ok: !!settings.seo.gsc_verification, label: 'Đã gắn mã xác minh Google Search Console' },
    { ok: !!settings.facebook.page_url, label: 'Đã liên kết Fanpage Facebook' },
    { ok: true, label: 'Sitemap.xml & robots.txt tự động' },
    { ok: true, label: 'Đường dẫn thân thiện /san-pham/..., /tin-tuc/...' },
    { ok: true, label: 'Dữ liệu có cấu trúc JSON-LD (Product, BlogPosting, Breadcrumb, Organization)' },
    { ok: true, label: 'Ảnh WebP, lazy-load, có thuộc tính alt' }
  ];
}

function renderChecks() {
  const sys = systemChecks();
  const sysScore = Math.round(100 * sys.filter(x => x.ok).length / sys.length);
  $('#sys-score').textContent = sysScore + '/100';
  $('#sys-score').className = 'score-' + scoreClass(sysScore);
  $('#sys-checks').innerHTML = sys.map(x => `<li class="${x.ok ? 'ok' : 'no'}">${x.ok ? '✔' : '✖'} ${esc(x.label)}</li>`).join('');

  const all = [...pChecks, ...bChecks];
  const avg = all.length ? Math.round(all.reduce((t, x) => t + x.r.score, 0) / all.length) : 0;
  const good = list => list.filter(x => x.r.score >= 80).length;
  $('#seo-stats').innerHTML = `
    <div class="stat dark"><div class="stat-label">Điểm SEO toàn website</div><div class="stat-value">${Math.round((sysScore + avg) / 2)}/100</div><div class="stat-sub">Hệ thống ${sysScore} · Nội dung ${avg}</div><div class="stat-ico">🔍</div></div>
    <div class="stat"><div class="stat-label">Sản phẩm đạt SEO tốt</div><div class="stat-value">${good(pChecks)}/${pChecks.length}</div><div class="stat-sub">Điểm ≥ 80</div><div class="stat-ico">👕</div></div>
    <div class="stat"><div class="stat-label">Bài viết đạt SEO tốt</div><div class="stat-value">${good(bChecks)}/${bChecks.length}</div><div class="stat-sub">Điểm ≥ 80</div><div class="stat-ico">📰</div></div>
    <div class="stat"><div class="stat-label">Công cụ Google</div><div class="stat-value" style="font-size:20px; margin-top:12px">${settings.seo.ga_id ? '✔ GA4' : '✖ GA4'} · ${settings.seo.gsc_verification ? '✔ GSC' : '✖ GSC'}</div><div class="stat-sub">Analytics · Search Console</div><div class="stat-ico">📈</div></div>`;
}

let kind = 'product';
function renderAudit() {
  const list = (kind === 'product' ? pChecks : bChecks).sort((a, b) => a.r.score - b.r.score);
  $('#audit-rows').innerHTML = list.map(x => {
    const bad = x.r.checks.filter(c => !c.ok);
    return `<tr>
      <td><b>${esc(x.name || x.title)}</b><br><small class="muted">/${kind === 'product' ? 'san-pham' : 'tin-tuc'}/${esc(x.slug)}</small></td>
      <td>${x.focus_keyword ? esc(x.focus_keyword) : '<span class="muted">—</span>'}</td>
      <td>${bad.length ? `<ul class="issue-list">${bad.map(c => `<li>${esc(c.label)}</li>`).join('')}</ul>` : '<span class="tag tag-on">Đạt tất cả tiêu chí</span>'}</td>
      <td class="center"><span class="seo-badge score-${scoreClass(x.r.score)}">${x.r.score}</span></td>
      <td class="num"><a class="act primary" href="${kind === 'product' ? 'products' : 'posts'}.html?seo=${x.id}">Sửa SEO</a></td></tr>`;
  }).join('');
}
$('#seg').addEventListener('click', e => {
  const b = e.target.closest('[data-k]'); if (!b) return;
  kind = b.dataset.k; $('#seg').querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b)); renderAudit();
});

/* ---------- Xem trước + bộ đếm ký tự ---------- */
function preview() {
  const domain = origin().replace(/^https?:\/\//, '');
  $('#home-serp').innerHTML = `
    <div class="serp-site"><span class="serp-fav">A</span><div><b>${esc($('#site_name').value)}</b><small>${esc(origin())}</small></div></div>
    <div class="serp-title">${esc($('#home_title').value)}</div>
    <div class="serp-desc">${esc($('#home_description').value)}</div>`;
  $('#og-preview').innerHTML = $('#og_image').value ? `<img src="../${esc($('#og_image').value.replace(/^\//, ''))}" alt="Ảnh chia sẻ">` : '<span>Chưa có ảnh</span>';
  document.querySelectorAll('.counter[data-for]').forEach(el => {
    const len = $('#' + el.dataset.for).value.length;
    el.textContent = `${len}/${el.dataset.max}`;
    el.className = 'counter ' + (len >= Number(el.dataset.min) && len <= Number(el.dataset.max) ? 'good' : 'ok');
  });
  $('#ga-status').innerHTML = settings.seo.ga_id ? '<span class="tag tag-on">Đang hoạt động</span>' : '<span class="tag tag-warn">Chưa gắn</span>';
  $('#gsc-status').innerHTML = settings.seo.gsc_verification ? '<span class="tag tag-on">Đã gắn mã</span>' : '<span class="tag tag-warn">Chưa gắn</span>';
  const site = encodeURIComponent(origin() + '/');
  const sample = products.find(p => p.active);
  const sampleUrl = encodeURIComponent(origin() + (sample ? `/san-pham/${sample.slug}` : '/'));
  $('#tools').innerHTML = [
    ['⚡', 'PageSpeed Insights', 'Tốc độ tải trang & Core Web Vitals', `https://pagespeed.web.dev/analysis?url=${site}`],
    ['🧩', 'Rich Results Test', 'Kiểm tra dữ liệu có cấu trúc (sản phẩm mẫu)', `https://search.google.com/test/rich-results?url=${sampleUrl}`],
    ['📘', 'Facebook Sharing Debugger', 'Xem ảnh & tiêu đề khi chia sẻ link', `https://developers.facebook.com/tools/debug/?q=${site}`],
    ['🔎', 'Tìm “site:” trên Google', 'Xem các trang đã được Google lập chỉ mục', `https://www.google.com/search?q=site:${encodeURIComponent(origin().replace(/^https?:\/\//, ''))}`]
  ].map(([i, t, d, href]) => `<a class="tool" href="${href}" target="_blank" rel="noopener"><span>${i}</span><div><b>${t}</b><small>${d}</small></div></a>`).join('');
  renderChecks();
}
$('#page').addEventListener('input', preview);
$('#page').addEventListener('change', preview);

/* ---------- Tải ảnh Open Graph ---------- */
$('#og-file').addEventListener('change', async e => {
  const file = e.target.files[0]; if (!file) return;
  $('#og-hint').textContent = 'Đang tải ảnh...';
  try {
    const res = await api.upload(file.name, await compressToDataUrl(file, 1200, 0.85), 'og');
    $('#og_image').value = res.path; $('#og-hint').textContent = 'Đã tải lên ' + res.path + ' – bấm “Lưu thiết lập”.'; preview();
  } catch (err) { $('#og-hint').textContent = ''; toast(err.message, 'error'); }
});

/* ---------- Lưu ---------- */
async function save(form, ids) {
  const body = {};
  ids.forEach(id => { const el = $('#' + id); body[id] = el.type === 'checkbox' ? el.checked : el.value.trim(); });
  const btn = $('button', form); btn.disabled = true;
  try {
    settings = await api.settings.save('seo', body);
    Object.entries(settings.seo).forEach(([k, v]) => { const el = $('#' + k); if (el && el.type !== 'checkbox') el.value = v; });
    showServerErrors(Object.fromEntries(ids.map(id => [id, $('#' + id)])), {});
    toast('Đã lưu cấu hình SEO'); preview();
  } catch (err) {
    showServerErrors(Object.fromEntries(ids.map(id => [id, $('#' + id)])), err.fieldErrors);
    toast(err.message, 'error');
  } finally { btn.disabled = false; }
}
$('#f-general').addEventListener('submit', e => { e.preventDefault(); save(e.target, ['site_name', 'site_url', 'home_title', 'home_description', 'home_keywords', 'title_suffix', 'og_image', 'allow_index', 'robots_extra']); });
$('#f-google').addEventListener('submit', e => { e.preventDefault(); save(e.target, ['ga_id', 'gsc_verification']); });

preview(); renderAudit();
