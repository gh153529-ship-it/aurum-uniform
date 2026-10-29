/* Băm mật khẩu (scrypt) và token đăng nhập ký HMAC – chỉ dùng module có sẵn của Node.js */
import crypto from 'node:crypto';

const SECRET = process.env.JWT_SECRET || 'aurum-uniform-dev-secret-doi-khi-deploy';

export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  return `${salt}:${crypto.scryptSync(String(password), salt, 64).toString('hex')}`;
}

export function verifyPassword(password, stored = '') {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  const actual = crypto.scryptSync(String(password), salt, expected.length);
  return crypto.timingSafeEqual(expected, actual);
}

const sign = body => crypto.createHmac('sha256', SECRET).update(body).digest('base64url');

export function signToken(payload, ttlMs = 7 * 24 * 3600 * 1000) {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + ttlMs })).toString('base64url');
  return `${body}.${sign(body)}`;
}

export function verifyToken(token) {
  try {
    const [body, sig] = String(token).split('.');
    const good = Buffer.from(sign(body)), got = Buffer.from(sig || '');
    if (good.length !== got.length || !crypto.timingSafeEqual(good, got)) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    return payload.exp > Date.now() ? payload : null;
  } catch { return null; }
}
