/* Thông báo, hộp thoại, xác nhận và hiển thị lỗi form */
import { $, $$ } from '../core/utils.js';

export function toast(msg, type = 'ok') {
  let box = $('#toast-box');
  if (!box) { box = document.createElement('div'); box.id = 'toast-box'; box.setAttribute('role', 'status'); document.body.appendChild(box); }
  const el = document.createElement('div');
  el.className = 'toast toast-' + type;
  el.textContent = msg;
  box.appendChild(el);
  setTimeout(() => el.classList.add('out'), 2800);
  setTimeout(() => el.remove(), 3200);
}

export function openModal(html, cls = '') {
  closeModal();
  const wrap = document.createElement('div');
  wrap.className = 'modal-backdrop';
  wrap.innerHTML = `<div class="modal ${cls}" role="dialog" aria-modal="true">
    <button class="modal-close" aria-label="Đóng" data-close>&times;</button>${html}</div>`;
  wrap.addEventListener('click', e => { if (e.target === wrap || e.target.closest('[data-close]')) closeModal(); });
  document.body.appendChild(wrap);
  document.body.classList.add('no-scroll');
  return wrap.querySelector('.modal');
}

export function closeModal() {
  $$('.modal-backdrop').forEach(m => m.remove());
  document.body.classList.remove('no-scroll');
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

/** Hộp thoại xác nhận trả về Promise<boolean> (thay cho confirm()) */
export function confirmDialog(message, { title = 'Xác nhận', ok = 'Đồng ý', danger = false } = {}) {
  return new Promise(resolve => {
    const m = openModal(`<h3>${title}</h3><p class="muted" style="margin:0 0 18px">${message}</p>
      <div class="modal-actions">
        <button class="btn btn-outline" data-no>Huỷ</button>
        <button class="btn ${danger ? 'btn-danger' : 'btn-dark'}" data-yes>${ok}</button>
      </div>`, 'modal-sm');
    const backdrop = m.parentElement;
    const done = v => { backdrop.removeEventListener('click', onClose); closeModal(); resolve(v); };
    const onClose = e => { if (e.target === backdrop || e.target.closest('[data-close]')) resolve(false); };
    backdrop.addEventListener('click', onClose);
    $('[data-yes]', m).addEventListener('click', () => done(true));
    $('[data-no]', m).addEventListener('click', () => done(false));
    $('[data-yes]', m).focus();
  });
}

export function setFieldError(input, msg) {
  const field = input.closest('.field');
  if (!field) return;
  let err = field.querySelector('.field-error');
  if (!err) { err = document.createElement('small'); err.className = 'field-error'; field.appendChild(err); }
  err.textContent = msg || '';
  field.classList.toggle('has-error', !!msg);
}

/** Đổ lỗi từng trường do server trả về vào form: { fieldName: message } */
export function showServerErrors(map, errors) {
  Object.entries(map).forEach(([field, input]) => setFieldError(input, errors[field] || ''));
}
