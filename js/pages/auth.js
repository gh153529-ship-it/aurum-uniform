/* Đăng nhập & đăng ký (gọi API) */
import { $, $$, qs, esc, Valid } from '../core/utils.js';
import { api } from '../core/api.js';
import { Auth } from '../core/session.js';
import { renderLayout } from '../ui/layout.js';
import { toast, openModal, closeModal, setFieldError, showServerErrors } from '../ui/feedback.js';

await renderLayout('');

const alertBox = $('#form-alert');
const showAlert = (msg, type = 'error') => { alertBox.innerHTML = msg ? `<div class="alert alert-${type}">${msg}</div>` : ''; };

/** chỉ cho phép chuyển hướng tới trang nội bộ */
const safeRedirect = () => { const r = qs('redirect') || ''; return /^[\w\-/]+\.html$/.test(r) ? r : ''; };
const goAfterLogin = user => { location.href = user.role === 'admin' ? 'admin/dashboard.html' : (safeRedirect() || 'index.html'); };

const setBusy = (btn, busy, label) => { btn.disabled = busy; if (label) btn.textContent = busy ? 'Đang xử lý...' : label; };

$$('.pw-toggle').forEach(b => b.addEventListener('click', () => {
  const input = $('#' + b.dataset.for);
  input.type = input.type === 'password' ? 'text' : 'password';
  b.textContent = input.type === 'password' ? 'Hiện' : 'Ẩn';
}));

/* ---------- ĐĂNG NHẬP ---------- */
const loginForm = $('#login-form');
if (loginForm) {
  const cur = await Auth.current().catch(() => null);
  if (cur) showAlert(`Bạn đang đăng nhập với <b>${esc(cur.email)}</b>. Đăng nhập tài khoản khác sẽ thay thế phiên hiện tại.`, 'ok');
  if (qs('registered')) showAlert('Đăng ký thành công! Mời bạn đăng nhập.', 'ok');
  if (qs('need')) showAlert(qs('need') === 'admin' ? 'Vui lòng đăng nhập bằng tài khoản quản trị.' : 'Vui lòng đăng nhập để tiếp tục.');
  if (qs('email')) $('#email').value = qs('email');

  $$('[data-demo]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    const admin = a.dataset.demo === 'admin';
    $('#email').value = admin ? 'admin@aurum.vn' : 'khach@aurum.vn';
    $('#password').value = admin ? 'admin123' : '123456';
  }));

  $('#forgot').addEventListener('click', e => {
    e.preventDefault();
    const m = openModal(`<h3>Quên mật khẩu</h3><p class="muted">Nhập email đã đăng ký, AURUM sẽ gửi hướng dẫn đặt lại mật khẩu.</p>
      <div class="field"><input class="input" id="fp-email" type="email" placeholder="ban@congty.vn"></div>
      <button class="btn btn-dark btn-block" style="margin-top:14px" id="fp-send">Gửi yêu cầu</button>`);
    $('#fp-send', m).addEventListener('click', () => {
      if (!Valid.email($('#fp-email', m).value)) { toast('Email không hợp lệ', 'error'); return; }
      closeModal(); toast('Đã gửi hướng dẫn tới email của bạn (minh hoạ)');
    });
  });

  loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    const email = $('#email'), pw = $('#password'), btn = $('button[type=submit]', loginForm);
    let ok = true;
    if (!Valid.email(email.value)) { setFieldError(email, 'Email không hợp lệ'); ok = false; } else setFieldError(email, '');
    if (pw.value.length < 6) { setFieldError(pw, 'Mật khẩu tối thiểu 6 ký tự'); ok = false; } else setFieldError(pw, '');
    if (!ok) return;
    const label = btn.textContent;
    setBusy(btn, true, label);
    try {
      const user = await Auth.login(email.value.trim(), pw.value);
      showAlert('');
      toast('Đăng nhập thành công. Xin chào ' + user.name + '!');
      setTimeout(() => goAfterLogin(user), 600);
    } catch (err) {
      showAlert(esc(err.message));
      setBusy(btn, false, label);
    }
  });
}

/* ---------- ĐĂNG KÝ ---------- */
const regForm = $('#register-form');
if (regForm) {
  regForm.addEventListener('submit', async e => {
    e.preventDefault();
    const f = id => $('#' + id);
    const checks = [
      [f('name'), v => v.trim().length >= 2, 'Vui lòng nhập họ tên'],
      [f('email'), Valid.email, 'Email không hợp lệ'],
      [f('phone'), Valid.phone, 'Số điện thoại gồm 10–11 số, bắt đầu bằng 0'],
      [f('password'), v => v.length >= 6, 'Mật khẩu tối thiểu 6 ký tự'],
      [f('confirm'), v => v === f('password').value && v.length > 0, 'Mật khẩu nhập lại không khớp']
    ];
    let ok = true;
    checks.forEach(([input, test, msg]) => { const pass = test(input.value); setFieldError(input, pass ? '' : msg); if (!pass) ok = false; });
    if (!f('agree').checked) { showAlert('Bạn cần đồng ý với điều khoản sử dụng.'); ok = false; } else showAlert('');
    if (!ok) return;

    const btn = $('button[type=submit]', regForm), label = btn.textContent;
    setBusy(btn, true, label);
    try {
      const email = f('email').value.trim().toLowerCase();
      await api.auth.register({
        name: f('name').value.trim(), email, phone: f('phone').value.replace(/\s/g, ''),
        password: f('password').value, address: f('address').value.trim()
      });
      showAlert('Đăng ký thành công! Đang chuyển tới trang đăng nhập...', 'ok');
      setTimeout(() => { location.href = 'login.html?registered=1&email=' + encodeURIComponent(email); }, 900);
    } catch (err) {
      showServerErrors({ name: f('name'), email: f('email'), phone: f('phone'), password: f('password') }, err.fieldErrors);
      if (!Object.keys(err.fieldErrors).length) showAlert(esc(err.message));
      setBusy(btn, false, label);
    }
  });
}
