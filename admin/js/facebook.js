/* Cấu hình các chức năng Facebook của website:
   Fanpage (nhúng trang), nút Chia sẻ, nút nhắn tin Messenger, Meta Pixel, App ID (Open Graph) */
import { $, esc } from '../../js/core/utils.js';
import { api } from '../../js/core/api.js';
import { toast, showServerErrors } from '../../js/ui/feedback.js';
import { renderAdminLayout, showLoadError } from './admin.js';

await renderAdminLayout('facebook', 'Cấu hình Facebook');

let settings;
try { settings = await api.settings.all(); } catch (e) { showLoadError(e); throw e; }
const fb = settings.facebook;
const checked = v => (v ? 'checked' : '');

$('#page').innerHTML = `
  <div class="grid-2">
    <form class="panel" id="f-fb" novalidate>
      <div class="panel-head"><h3>Kết nối Fanpage &amp; chức năng Facebook</h3><button class="btn btn-dark btn-sm">Lưu cấu hình</button></div>
      <div class="form-grid">
        <div class="form-grid two">
          <div class="field"><label for="page_url">Địa chỉ Fanpage</label><input class="input" id="page_url" value="${esc(fb.page_url)}" placeholder="https://www.facebook.com/aurumuniform"></div>
          <div class="field"><label for="page_name">Tên Fanpage</label><input class="input" id="page_name" value="${esc(fb.page_name)}"></div>
        </div>

        <h4 class="sub-head">Hiển thị trên website</h4>
        <label class="switch-row"><input type="checkbox" id="show_page_plugin" ${checked(fb.show_page_plugin)}> Nhúng khung Fanpage ở chân trang (Page Plugin – có nút Theo dõi)</label>
        <label class="switch-row"><input type="checkbox" id="show_share" ${checked(fb.show_share)}> Nút “Chia sẻ Facebook / Zalo / Sao chép link” ở trang sản phẩm &amp; bài viết</label>
        <label class="switch-row"><input type="checkbox" id="show_messenger" ${checked(fb.show_messenger)}> Nút nổi “Nhắn tin tư vấn” qua Messenger</label>
        <div class="field"><label for="messenger_username">Tên người dùng Fanpage cho Messenger (m.me/<b>...</b>)</label>
          <input class="input" id="messenger_username" value="${esc(fb.messenger_username)}" placeholder="aurumuniform">
          <span class="hint">Xem ở Fanpage → Giới thiệu, hoặc dán cả link https://m.me/ten-trang.</span></div>

        <h4 class="sub-head">Đo lường &amp; chia sẻ</h4>
        <div class="form-grid two">
          <div class="field"><label for="pixel_id">Meta Pixel ID (Dataset ID)</label><input class="input" id="pixel_id" value="${esc(fb.pixel_id)}" placeholder="VD: 1234567890123456">
            <span class="hint">Meta Business Suite → Trình quản lý sự kiện. Website tự gửi: PageView, ViewContent, AddToCart, Purchase, Search, Contact – dùng để chạy quảng cáo chuyển đổi.</span></div>
          <div class="field"><label for="app_id">Facebook App ID (tuỳ chọn)</label><input class="input" id="app_id" value="${esc(fb.app_id)}" placeholder="VD: 987654321098765">
            <span class="hint">Chèn thẻ <code>fb:app_id</code> để xem thống kê chia sẻ trong Facebook for Developers.</span></div>
        </div>
      </div>
    </form>

    <div style="display:grid; gap:18px; align-content:start">
      <div class="panel">
        <div class="panel-head"><h3>Xem trước khi chia sẻ link</h3></div>
        <div class="fb-card" id="fb-card"></div>
        <a class="link" style="font-size:13px" target="_blank" rel="noopener" id="fb-debug">Kiểm tra bằng Facebook Sharing Debugger ↗</a>
      </div>
      <div class="panel">
        <div class="panel-head"><h3>Khung Fanpage trên website</h3></div>
        <div id="fb-plugin"></div>
      </div>
      <div class="panel note">
        <h3 style="font-size:15px; margin-top:0">Lưu ý về plugin Facebook</h3>
        <p>Meta đã ngừng <b>nút Like / Comment cho website bên ngoài</b> (từ 10/02/2026) và <b>plugin chat Messenger</b> (từ 2024). Vì vậy website dùng các chức năng còn hoạt động: <b>Page Plugin</b>, <b>nút Chia sẻ</b>, <b>liên kết m.me</b>, <b>Meta Pixel</b> và thẻ <b>Open Graph</b>.</p>
        <div class="link-list">
          <a href="https://business.facebook.com/" target="_blank" rel="noopener">📊 Meta Business Suite ↗</a>
          <a href="https://www.facebook.com/events_manager2/" target="_blank" rel="noopener">🎯 Trình quản lý sự kiện (Pixel) ↗</a>
          <a href="https://adsmanager.facebook.com/" target="_blank" rel="noopener">📣 Trình quản lý quảng cáo ↗</a>
        </div>
      </div>
    </div>
  </div>`;

function preview() {
  const site = (settings.seo.site_url || location.origin).replace(/\/$/, '');
  const img = settings.seo.og_image ? `../${settings.seo.og_image.replace(/^\//, '')}` : '';
  $('#fb-card').innerHTML = `
    ${img ? `<img src="${esc(img)}" alt="">` : '<div class="fb-card-noimg">Chưa có ảnh chia sẻ</div>'}
    <div class="fb-card-body"><small>${esc(site.replace(/^https?:\/\//, '').toUpperCase())}</small>
      <b>${esc(settings.seo.home_title)}</b><span>${esc(settings.seo.home_description)}</span></div>`;
  $('#fb-debug').href = `https://developers.facebook.com/tools/debug/?q=${encodeURIComponent(site + '/')}`;
  const url = $('#page_url').value.trim();
  $('#fb-plugin').innerHTML = url && /facebook\.com\//.test(url)
    ? `<iframe title="Fanpage" width="340" height="130" style="border:none;overflow:hidden;max-width:100%" loading="lazy"
        src="https://www.facebook.com/plugins/page.php?href=${encodeURIComponent(url)}&tabs=&width=340&height=130&small_header=false&adapt_container_width=true&hide_cover=false&show_facepile=true"></iframe>
       <p class="hint">${$('#show_page_plugin').checked ? 'Đang hiển thị ở chân trang website.' : 'Đang tắt – bật “Nhúng khung Fanpage” để hiện.'}</p>`
    : '<p class="hint">Nhập địa chỉ Fanpage để xem trước.</p>';
}
$('#page_url').addEventListener('change', preview);
$('#show_page_plugin').addEventListener('change', preview);

const IDS = ['page_url', 'page_name', 'messenger_username', 'pixel_id', 'app_id', 'show_page_plugin', 'show_share', 'show_messenger'];
$('#f-fb').addEventListener('submit', async e => {
  e.preventDefault();
  const body = Object.fromEntries(IDS.map(id => { const el = $('#' + id); return [id, el.type === 'checkbox' ? el.checked : el.value.trim()]; }));
  const fields = Object.fromEntries(IDS.map(id => [id, $('#' + id)]));
  try {
    settings = await api.settings.save('facebook', body);
    $('#messenger_username').value = settings.facebook.messenger_username;
    showServerErrors(fields, {}); toast('Đã lưu cấu hình Facebook'); preview();
  } catch (err) { showServerErrors(fields, err.fieldErrors); toast(err.message, 'error'); }
});

preview();
