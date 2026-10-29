/* =========================================================
   AURUM UNIFORM – REST API (Node.js + Express + db.json)
   Chạy:  npm start   →  http://localhost:3000
   Server vừa cung cấp API (/api/...) vừa phục vụ giao diện web.
   ========================================================= */
import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { COUPONS, ORDER_STATUS, PAYMENT_METHODS, calcTotals, withCoupon, hasPrint } from '../js/core/pricing.js';
import { hashPassword, verifyPassword, signToken, verifyToken } from './security.js';
import { buildSeed, orderCode } from './seed.js';
import { DEFAULT_SETTINGS } from './seed-content.js';
import { createSeoRouter } from './seo.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DB_FILE = process.env.DB_FILE || path.join(__dirname, 'db.json');
const PORT = process.env.PORT || 3000;
const LOW_STOCK = 50;

/* ---------- Tiện ích ---------- */
class HttpError extends Error {
  constructor(status, message, extra = {}) { super(message); this.status = status; this.extra = extra; }
}
const bad = (msg, extra) => new HttpError(400, msg, extra);
const norm = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
const slugify = s => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const isEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || '').trim());
const isPhone = v => /^0\d{9,10}$/.test(String(v || '').replace(/\s/g, ''));
const str = v => String(v ?? '').trim();
const int = v => (Number.isInteger(Number(v)) && v !== '' && v !== null ? Number(v) : NaN);
const today = () => new Date().toISOString().slice(0, 10);
/** Slug không trùng: thêm -2, -3... nếu đã có */
function uniqueSlug(base, taken) {
  const root = base || 'trang';
  let slug = root;
  for (let i = 2; taken.has(slug); i++) slug = `${root}-${i}`;
  return slug;
}
const takenSlugs = (table, exceptId) => new Set(table.filter(x => x.id !== exceptId).map(x => x.slug));
/** Kiểm tra & làm sạch các trường SEO dùng chung cho sản phẩm và bài viết */
function seoFields(body, table, id, fallbackName) {
  const seo_title = str(body.seo_title), seo_description = str(body.seo_description);
  if (seo_title.length > 70) throw bad('Tiêu đề SEO tối đa 70 ký tự', { errors: { seo_title: 'Tiêu đề SEO tối đa 70 ký tự' } });
  if (seo_description.length > 200) throw bad('Mô tả SEO tối đa 200 ký tự', { errors: { seo_description: 'Mô tả SEO tối đa 200 ký tự' } });
  const wanted = slugify(body.slug || fallbackName);
  if (body.slug && takenSlugs(table, id).has(wanted)) throw bad('Đường dẫn (slug) đã được dùng', { errors: { slug: 'Đường dẫn (slug) đã được dùng' } });
  return {
    slug: uniqueSlug(wanted, takenSlugs(table, id)), seo_title, seo_description,
    seo_keywords: str(body.seo_keywords).slice(0, 255), focus_keyword: str(body.focus_keyword).slice(0, 80)
  };
}

/* ---------- "Cơ sở dữ liệu" JSON ---------- */
class JsonDB {
  constructor(file) {
    this.file = file;
    if (fs.existsSync(file)) this.data = JSON.parse(fs.readFileSync(file, 'utf8'));
    else { this.data = buildSeed(); this.save(); }
    this.migrate();
  }
  /** db.json cũ (chưa có bài viết / cài đặt / slug) → tự bổ sung, không mất dữ liệu */
  migrate() {
    const d = this.data;
    let changed = false;
    if (!d.posts) { d.posts = buildSeed().posts; changed = true; }
    if (!d.settings) d.settings = {};
    for (const [group, defs] of Object.entries(DEFAULT_SETTINGS)) {
      d.settings[group] = { ...defs, ...(d.settings[group] || {}) };
    }
    const used = new Set();
    d.products.forEach(p => {
      if (!p.slug || used.has(p.slug)) { p.slug = uniqueSlug(slugify(p.name), used); changed = true; }
      used.add(p.slug);
      for (const k of ['seo_title', 'seo_description', 'seo_keywords', 'focus_keyword']) if (p[k] === undefined) { p[k] = ''; changed = true; }
    });
    // Biến môi trường (đặt trên Render...) luôn được ưu tiên – không bị mất khi server khởi động lại
    const ENV = {
      SITE_URL: ['seo', 'site_url'], GA_ID: ['seo', 'ga_id'], GSC_VERIFICATION: ['seo', 'gsc_verification'],
      FB_PAGE_URL: ['facebook', 'page_url'], FB_PIXEL_ID: ['facebook', 'pixel_id'], FB_APP_ID: ['facebook', 'app_id'],
      MESSENGER_USERNAME: ['facebook', 'messenger_username']
    };
    for (const [key, [group, field]] of Object.entries(ENV)) {
      if (process.env[key] && d.settings[group][field] !== process.env[key]) { d.settings[group][field] = process.env[key]; changed = true; }
    }
    if (changed) this.save();
  }
  t(name) { return this.data[name]; }
  nextId(name) { return this.data[name].reduce((m, x) => Math.max(m, x.id), 0) + 1; }
  save() {
    const tmp = this.file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2));
    fs.renameSync(tmp, this.file);
  }
  /** Khôi phục dữ liệu mẫu nhưng giữ nguyên cấu hình SEO / Facebook (mã GA, Search Console...) */
  reset() { const settings = this.data.settings; this.data = { ...buildSeed(), settings }; this.migrate(); this.save(); }
}
const db = new JsonDB(DB_FILE);

/* ---------- Truy vấn dùng chung ---------- */
const findCategory = id => db.t('categories').find(c => c.id === Number(id));
const findProduct = id => db.t('products').find(p => p.id === Number(id));
const publicUser = ({ password, ...u }) => u;

function soldByProduct() {
  const valid = new Set(db.t('orders').filter(o => o.status !== 'cancelled').map(o => o.id));
  const map = {};
  db.t('order_details').forEach(d => { if (valid.has(d.order_id)) map[d.product_id] = (map[d.product_id] || 0) + d.quantity; });
  return map;
}

function serializeProduct(p, { admin = false, sold = {} } = {}) {
  const variants = db.t('product_variants').filter(v => v.product_id === p.id && (admin || v.active));
  const live = variants.filter(v => v.active);
  const prices = live.map(v => v.price);
  const cat = findCategory(p.cate_id);
  return {
    ...p,
    category_name: cat ? cat.name : '',
    variants,
    min_price: prices.length ? Math.min(...prices) : 0,
    max_price: prices.length ? Math.max(...prices) : 0,
    stock: live.reduce((s, v) => s + v.quantity, 0),
    sold: sold[p.id] || 0
  };
}

function serializeOrder(o) {
  return { ...o, details: db.t('order_details').filter(d => d.order_id === o.id) };
}

/* ---------- Xác thực ---------- */
function authenticate(req, _res, next) {
  const h = req.headers.authorization || '';
  const payload = h.startsWith('Bearer ') ? verifyToken(h.slice(7)) : null;
  req.user = payload ? db.t('users').find(u => u.id === payload.uid && u.active) || null : null;
  next();
}
const requireAuth = (req, _res, next) => (req.user ? next() : next(new HttpError(401, 'Vui lòng đăng nhập để tiếp tục.')));
const requireAdmin = (req, _res, next) => {
  if (!req.user) return next(new HttpError(401, 'Vui lòng đăng nhập để tiếp tục.'));
  if (req.user.role !== 'admin') return next(new HttpError(403, 'Bạn không có quyền thực hiện thao tác này.'));
  next();
};

/* ---------- Lọc / sắp xếp / phân trang dùng chung ---------- */
const RESERVED = new Set(['_page', '_limit', '_sort', '_order', 'q', 'scope']);
function queryList(list, query, searchFields = []) {
  let out = list;
  for (const [key, raw] of Object.entries(query)) {
    if (RESERVED.has(key)) continue;
    const vals = [].concat(raw).map(String);
    out = out.filter(r => key in r && vals.includes(String(r[key])));
  }
  if (query.q) {
    const kw = norm(query.q);
    out = out.filter(r => searchFields.some(f => norm(r[f]).includes(kw)));
  }
  if (query._sort) {
    const dir = query._order === 'desc' ? -1 : 1;
    out = [...out].sort((a, b) => {
      const x = a[query._sort], y = b[query._sort];
      return (typeof x === 'string' ? x.localeCompare(y, 'vi') : (x > y) - (x < y)) * dir;
    });
  }
  const total = out.length;
  const limit = Math.max(0, int(query._limit) || 0);
  if (limit) { const page = Math.max(1, int(query._page) || 1); out = out.slice((page - 1) * limit, page * limit); }
  return { rows: out, total };
}
const send = (res, { rows, total }) => { res.set('X-Total-Count', total); res.json(rows); };

/* =========================================================
   APP
   ========================================================= */
const app = express();
app.set('trust proxy', true);   // chạy sau proxy (Render...) vẫn lấy đúng https://tên-miền
app.use(cors({ exposedHeaders: ['X-Total-Count'] }));
app.use(express.json({ limit: '3mb' }));
app.use('/api', authenticate);

/* ---------- AUTH ---------- */
const auth = express.Router();
auth.post('/register', (req, res) => {
  const { name, email, phone, password, address } = req.body || {};
  const errors = {};
  if (str(name).length < 2) errors.name = 'Vui lòng nhập họ tên';
  if (!isEmail(email)) errors.email = 'Email không hợp lệ';
  if (!isPhone(phone)) errors.phone = 'Số điện thoại gồm 10–11 số, bắt đầu bằng 0';
  if (String(password || '').length < 6) errors.password = 'Mật khẩu tối thiểu 6 ký tự';
  if (!errors.email && db.t('users').some(u => u.email.toLowerCase() === str(email).toLowerCase())) errors.email = 'Email này đã được đăng ký';
  if (Object.keys(errors).length) throw bad('Dữ liệu đăng ký chưa hợp lệ', { errors });

  const user = {
    id: db.nextId('users'), name: str(name), email: str(email).toLowerCase(), phone: str(phone).replace(/\s/g, ''),
    address: str(address), password: hashPassword(password), role: 'customer', active: true, created_at: today()
  };
  db.t('users').push(user); db.save();
  res.status(201).json({ user: publicUser(user) });
});

auth.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  const u = db.t('users').find(x => x.email.toLowerCase() === str(email).toLowerCase());
  if (!u || !verifyPassword(password, u.password)) throw new HttpError(401, 'Email hoặc mật khẩu không đúng.');
  if (!u.active) throw new HttpError(403, 'Tài khoản đã bị khoá. Vui lòng liên hệ cửa hàng.');
  res.json({ token: signToken({ uid: u.id }), user: publicUser(u) });
});

auth.get('/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));
app.use('/api/auth', auth);

/* ---------- CATEGORIES ---------- */
function categoryData(body, id) {
  const name = str(body.name);
  if (name.length < 2) throw bad('Tên danh mục tối thiểu 2 ký tự', { errors: { name: 'Tên danh mục tối thiểu 2 ký tự' } });
  if (db.t('categories').some(c => norm(c.name) === norm(name) && c.id !== id))
    throw bad('Tên danh mục đã tồn tại', { errors: { name: 'Tên danh mục đã tồn tại' } });
  const parent = body.parent_id === '' || body.parent_id == null ? null : Number(body.parent_id);
  if (parent !== null) {
    if (!findCategory(parent)) throw bad('Danh mục cha không tồn tại');
    if (id && parent === id) throw bad('Danh mục không thể là cha của chính nó');
  }
  return { name, parent_id: parent, slug: slugify(body.slug || name), description: str(body.description), active: body.active !== false };
}
const cats = express.Router();
cats.get('/', (req, res) => {
  const all = req.user?.role === 'admin' && req.query.scope === 'admin';
  const list = db.t('categories').filter(c => all || c.active);
  const counts = {};
  db.t('products').forEach(p => { counts[p.cate_id] = (counts[p.cate_id] || 0) + 1; });
  send(res, queryList(list.map(c => ({ ...c, product_count: counts[c.id] || 0 })), req.query, ['name', 'slug']));
});
cats.get('/:id', (req, res) => {
  const c = findCategory(req.params.id);
  if (!c || (!c.active && req.user?.role !== 'admin')) throw new HttpError(404, 'Không tìm thấy danh mục');
  res.json(c);
});
cats.post('/', requireAdmin, (req, res) => {
  const c = { id: db.nextId('categories'), ...categoryData(req.body || {}) };
  db.t('categories').push(c); db.save(); res.status(201).json(c);
});
const updateCategory = (req, res) => {
  const c = findCategory(req.params.id);
  if (!c) throw new HttpError(404, 'Không tìm thấy danh mục');
  Object.assign(c, categoryData({ ...c, ...req.body }, c.id)); db.save(); res.json(c);
};
cats.put('/:id', requireAdmin, updateCategory);
cats.patch('/:id', requireAdmin, updateCategory);
cats.delete('/:id', requireAdmin, (req, res) => {
  const c = findCategory(req.params.id);
  if (!c) throw new HttpError(404, 'Không tìm thấy danh mục');
  if (db.t('products').some(p => p.cate_id === c.id)) throw new HttpError(409, 'Danh mục đang có sản phẩm nên không thể xoá. Hãy chuyển sản phẩm sang danh mục khác hoặc chọn "Ẩn".');
  if (db.t('categories').some(x => x.parent_id === c.id)) throw new HttpError(409, 'Danh mục đang có danh mục con nên không thể xoá.');
  db.data.categories = db.t('categories').filter(x => x.id !== c.id); db.save();
  res.json({ ok: true });
});
app.use('/api/categories', cats);

/* ---------- PRODUCTS (kèm biến thể) ---------- */
function variantData(v, productId) {
  const color = str(v.color), size = str(v.size);
  const price = int(v.price), quantity = int(v.quantity);
  if (!color || !size) throw bad('Biến thể phải có màu và size');
  if (!(price > 0)) throw bad(`Biến thể ${color} / ${size}: giá phải lớn hơn 0`);
  if (!(quantity >= 0)) throw bad(`Biến thể ${color} / ${size}: tồn kho phải là số nguyên ≥ 0`);
  return {
    product_id: productId, variant_name: `${color} / ${size}`, color, color_hex: str(v.color_hex) || '#1a1a1a', size,
    price, quantity, image: str(v.image), active: v.active !== false
  };
}

function productData(body, id) {
  const name = str(body.name);
  const errors = {};
  if (name.length < 3) errors.name = 'Tên tối thiểu 3 ký tự';
  if (!findCategory(body.cate_id)) errors.cate_id = 'Chọn danh mục hợp lệ';
  const old = Number(body.old_price) || 0;
  if (Object.keys(errors).length) throw bad('Dữ liệu sản phẩm chưa hợp lệ', { errors });
  return {
    name, cate_id: Number(body.cate_id), detail: str(body.detail), image: str(body.image), material: str(body.material),
    old_price: old, featured: !!body.featured, active: body.active !== false,
    ...seoFields(body, db.t('products'), id, name), updated_at: today()
  };
}

/** Đồng bộ danh sách biến thể gửi lên: có id → sửa, không id → thêm, thiếu → xoá (hoặc ẩn nếu đã có trong đơn hàng) */
function syncVariants(productId, list) {
  if (!Array.isArray(list)) return;
  const seen = new Set();
  const incoming = list.map(v => {
    const d = variantData(v, productId);
    const key = `${d.color}|${d.size}`;
    if (seen.has(key)) throw bad(`Biến thể ${d.color} / ${d.size} bị trùng`);
    seen.add(key);
    return { id: Number(v.id) || null, d };
  });
  const table = db.t('product_variants');
  const keepIds = new Set(incoming.filter(x => x.id).map(x => x.id));
  const used = new Set(db.t('order_details').map(d => d.variant_id));

  table.filter(v => v.product_id === productId && !keepIds.has(v.id)).forEach(v => {
    if (used.has(v.id)) { v.active = false; } else table.splice(table.indexOf(v), 1);
  });
  incoming.forEach(({ id, d }) => {
    const cur = id && table.find(v => v.id === id && v.product_id === productId);
    if (cur) Object.assign(cur, d); else table.push({ id: db.nextId('product_variants'), ...d });
  });
}

const prods = express.Router();
const productSort = {
  'price-asc': (a, b) => a.min_price - b.min_price, 'price-desc': (a, b) => b.min_price - a.min_price,
  name: (a, b) => a.name.localeCompare(b.name, 'vi'), newest: (a, b) => b.created_at.localeCompare(a.created_at),
  bestseller: (a, b) => b.sold - a.sold, 'id-desc': (a, b) => b.id - a.id
};

prods.get('/', (req, res) => {
  const admin = req.user?.role === 'admin' && req.query.scope === 'admin';
  const sold = soldByProduct();
  const activeCats = new Set(db.t('categories').filter(c => c.active).map(c => c.id));
  const q = req.query;
  let list = db.t('products').filter(p => admin || (p.active && activeCats.has(p.cate_id)))
    .map(p => serializeProduct(p, { admin, sold }));

  if (q.cate_id) { const ids = [].concat(q.cate_id).map(Number); list = list.filter(p => ids.includes(p.cate_id)); }
  if (q.featured) list = list.filter(p => String(p.featured) === q.featured);
  if (q.min_price) list = list.filter(p => p.min_price >= Number(q.min_price));
  if (q.max_price) list = list.filter(p => p.min_price <= Number(q.max_price));
  if (q.color) { const cs = [].concat(q.color); list = list.filter(p => p.variants.some(v => v.active && cs.includes(v.color))); }
  if (q.in_stock === '1') list = list.filter(p => p.stock > 0);
  if (q.on_sale === '1') list = list.filter(p => p.old_price > p.min_price);
  if (q.q) { const kw = norm(q.q); list = list.filter(p => norm(`${p.name} ${p.category_name}`).includes(kw)); }
  if (q.slug) list = list.filter(p => p.slug === q.slug);
  if (productSort[q._sort]) list.sort(productSort[q._sort]);

  const total = list.length;
  const limit = Math.max(0, int(q._limit) || 0);
  if (limit) { const page = Math.max(1, int(q._page) || 1); list = list.slice((page - 1) * limit, page * limit); }
  send(res, { rows: list, total });
});

prods.get('/:id', (req, res) => {
  const p = findProduct(req.params.id);
  const admin = req.user?.role === 'admin';
  const cat = p && findCategory(p.cate_id);
  if (!p || (!admin && (!p.active || !cat?.active))) throw new HttpError(404, 'Không tìm thấy sản phẩm');
  res.json(serializeProduct(p, { admin, sold: soldByProduct() }));
});

const saveProduct = (isNew) => (req, res) => {
  const body = req.body || {};
  let p;
  if (isNew) {
    const newId = db.nextId('products');
    p = { id: newId, ...productData(body, newId), created_at: today() };
    if (!Array.isArray(body.variants) || !body.variants.length) throw bad('Sản phẩm cần ít nhất 1 biến thể (màu / size)');
    db.t('products').push(p);
  } else {
    p = findProduct(req.params.id);
    if (!p) throw new HttpError(404, 'Không tìm thấy sản phẩm');
    Object.assign(p, productData({ ...p, ...body }, p.id));
    if (Array.isArray(body.variants) && !body.variants.length) throw bad('Sản phẩm cần ít nhất 1 biến thể (màu / size)');
  }
  try { syncVariants(p.id, body.variants); }
  catch (e) { if (isNew) db.data.products = db.t('products').filter(x => x.id !== p.id); throw e; }
  db.save();
  res.status(isNew ? 201 : 200).json(serializeProduct(p, { admin: true, sold: soldByProduct() }));
};
prods.post('/', requireAdmin, saveProduct(true));
prods.put('/:id', requireAdmin, saveProduct(false));
prods.patch('/:id', requireAdmin, saveProduct(false));
prods.delete('/:id', requireAdmin, (req, res) => {
  const p = findProduct(req.params.id);
  if (!p) throw new HttpError(404, 'Không tìm thấy sản phẩm');
  if (db.t('order_details').some(d => d.product_id === p.id)) {
    p.active = false; db.save();
    return res.json({ ok: true, softDeleted: true, message: 'Sản phẩm đã phát sinh đơn hàng nên không thể xoá hẳn. Đã chuyển sang trạng thái ngừng bán.' });
  }
  db.data.products = db.t('products').filter(x => x.id !== p.id);
  db.data.product_variants = db.t('product_variants').filter(v => v.product_id !== p.id);
  db.save(); res.json({ ok: true });
});
app.use('/api/products', prods);

/* ---------- PRODUCT_VARIANTS ---------- */
const vars = express.Router();
vars.get('/', (req, res) => {
  const admin = req.user?.role === 'admin' && req.query.scope === 'admin';
  const activeProducts = new Set(db.t('products').filter(p => p.active).map(p => p.id));
  const list = db.t('product_variants').filter(v => admin || (v.active && activeProducts.has(v.product_id)));
  send(res, queryList(list, req.query, ['variant_name']));
});
vars.get('/:id', (req, res) => {
  const v = db.t('product_variants').find(x => x.id === Number(req.params.id));
  if (!v || (!v.active && req.user?.role !== 'admin')) throw new HttpError(404, 'Không tìm thấy biến thể');
  res.json(v);
});
vars.post('/', requireAdmin, (req, res) => {
  const productId = Number(req.body?.product_id);
  if (!findProduct(productId)) throw bad('Sản phẩm không tồn tại');
  const d = variantData(req.body, productId);
  if (db.t('product_variants').some(v => v.product_id === productId && v.color === d.color && v.size === d.size)) throw bad('Biến thể này đã tồn tại');
  const v = { id: db.nextId('product_variants'), ...d };
  db.t('product_variants').push(v); db.save(); res.status(201).json(v);
});
const updateVariant = (req, res) => {
  const v = db.t('product_variants').find(x => x.id === Number(req.params.id));
  if (!v) throw new HttpError(404, 'Không tìm thấy biến thể');
  Object.assign(v, variantData({ ...v, ...req.body }, v.product_id)); db.save(); res.json(v);
};
vars.put('/:id', requireAdmin, updateVariant);
vars.patch('/:id', requireAdmin, updateVariant);
vars.delete('/:id', requireAdmin, (req, res) => {
  const v = db.t('product_variants').find(x => x.id === Number(req.params.id));
  if (!v) throw new HttpError(404, 'Không tìm thấy biến thể');
  if (db.t('order_details').some(d => d.variant_id === v.id)) { v.active = false; db.save(); return res.json({ ok: true, softDeleted: true }); }
  db.data.product_variants = db.t('product_variants').filter(x => x.id !== v.id); db.save(); res.json({ ok: true });
});
app.use('/api/product_variants', vars);

/* ---------- USERS (khách hàng) ---------- */
function userData(body, id) {
  const errors = {};
  const email = str(body.email).toLowerCase();
  const pw = String(body.password || '');
  if (str(body.name).length < 2) errors.name = 'Vui lòng nhập họ tên';
  if (!isEmail(email)) errors.email = 'Email không hợp lệ';
  else if (db.t('users').some(u => u.email.toLowerCase() === email && u.id !== id)) errors.email = 'Email đã được sử dụng';
  if (!isPhone(body.phone)) errors.phone = 'Số điện thoại không hợp lệ';
  if (id ? pw && pw.length < 6 : pw.length < 6) errors.password = 'Mật khẩu tối thiểu 6 ký tự';
  if (Object.keys(errors).length) throw bad('Dữ liệu khách hàng chưa hợp lệ', { errors });
  const data = { name: str(body.name), email, phone: str(body.phone).replace(/\s/g, ''), address: str(body.address), active: body.active !== false };
  if (pw) data.password = hashPassword(pw);
  return data;
}
const users = express.Router();
users.use(requireAdmin);
users.get('/', (req, res) => send(res, queryList(db.t('users').map(publicUser), req.query, ['name', 'email', 'phone'])));
users.get('/:id', (req, res) => {
  const u = db.t('users').find(x => x.id === Number(req.params.id));
  if (!u) throw new HttpError(404, 'Không tìm thấy khách hàng');
  res.json(publicUser(u));
});
users.post('/', (req, res) => {
  const u = { id: db.nextId('users'), ...userData(req.body || {}), role: 'customer', created_at: today() };
  db.t('users').push(u); db.save(); res.status(201).json(publicUser(u));
});
const updateUser = (req, res) => {
  const u = db.t('users').find(x => x.id === Number(req.params.id));
  if (!u) throw new HttpError(404, 'Không tìm thấy khách hàng');
  const data = userData({ ...u, password: '', ...req.body }, u.id);
  if (u.role === 'admin' && data.active === false) throw bad('Không thể khoá tài khoản quản trị');
  Object.assign(u, data); db.save(); res.json(publicUser(u));
};
users.put('/:id', updateUser);
users.patch('/:id', updateUser);
users.delete('/:id', (req, res) => {
  const u = db.t('users').find(x => x.id === Number(req.params.id));
  if (!u) throw new HttpError(404, 'Không tìm thấy khách hàng');
  if (u.role === 'admin') throw new HttpError(409, 'Không thể xoá tài khoản quản trị.');
  if (db.t('orders').some(o => o.user_id === u.id)) {
    u.active = false; db.save();
    return res.json({ ok: true, softDeleted: true, message: 'Khách hàng đã có đơn hàng nên không thể xoá hẳn. Tài khoản đã được khoá.' });
  }
  db.data.users = db.t('users').filter(x => x.id !== u.id); db.save(); res.json({ ok: true });
});
app.use('/api/users', users);

/* ---------- ORDERS & ORDER_DETAILS ---------- */
function cleanPrint(p) {
  if (!p) return null;
  const out = { text: str(p.text).slice(0, 60), position: str(p.position).slice(0, 30) || 'Ngực trái', logo: str(p.logo).slice(0, 120) };
  return hasPrint(out) ? out : null;
}

function validateCustomer(c = {}) {
  const errors = {};
  if (!str(c.name)) errors.name = 'Vui lòng nhập họ tên';
  if (!isPhone(c.phone)) errors.phone = 'Số điện thoại không hợp lệ';
  if (!isEmail(c.email)) errors.email = 'Email không hợp lệ';
  if (!str(c.address)) errors.address = 'Vui lòng nhập địa chỉ giao hàng';
  if (c.vat && (!/^\d{10}(-\d{3})?$/.test(str(c.vat.taxCode)) || !str(c.vat.company))) errors.vat = 'Thông tin hoá đơn VAT không hợp lệ';
  if (Object.keys(errors).length) throw bad('Thông tin đặt hàng chưa hợp lệ', { errors });
  return {
    name: str(c.name), phone: str(c.phone), email: str(c.email), address: str(c.address), note: str(c.note).slice(0, 500),
    vat: c.vat ? { taxCode: str(c.vat.taxCode), company: str(c.vat.company) } : null
  };
}

const orders = express.Router();

/** Đặt hàng: khách vãng lai hoặc thành viên. Giá và tồn kho luôn do server tính lại. */
orders.post('/', (req, res) => {
  const { items, payment, couponCode } = req.body || {};
  const customer = validateCustomer(req.body?.customer);
  if (!PAYMENT_METHODS[payment]) throw bad('Phương thức thanh toán không hợp lệ');
  if (!Array.isArray(items) || !items.length) throw bad('Giỏ hàng đang trống');

  const lines = items.map(it => {
    const v = db.t('product_variants').find(x => x.id === Number(it.variantId) && x.active);
    const p = v && findProduct(v.product_id);
    const cat = p && findCategory(p.cate_id);
    const qty = int(it.qty);
    if (!v || !p || !p.active || !cat?.active) throw bad('Có sản phẩm trong giỏ không còn được bán. Vui lòng cập nhật giỏ hàng.');
    if (!(qty >= 1)) throw bad('Số lượng không hợp lệ');
    return { v, p, qty, print: cleanPrint(it.print) };
  });

  const need = new Map();
  lines.forEach(l => need.set(l.v.id, (need.get(l.v.id) || 0) + l.qty));
  for (const [id, qty] of need) {
    const v = db.t('product_variants').find(x => x.id === id);
    if (v.quantity < qty) throw new HttpError(409, `“${findProduct(v.product_id).name}” (${v.variant_name}) chỉ còn ${v.quantity} sản phẩm.`);
  }

  let totals = calcTotals(lines.map(l => ({ productId: l.p.id, price: l.v.price, qty: l.qty, print: l.print })));
  if (couponCode) {
    totals = withCoupon(totals, couponCode);
    if (!totals.coupon) throw bad(COUPONS[String(couponCode).toUpperCase()] ? 'Đơn hàng chưa đủ điều kiện dùng mã giảm giá này' : 'Mã giảm giá không hợp lệ');
  } else totals.coupon = null;

  const now = new Date();
  const order = {
    id: db.nextId('orders'), code: '', user_id: req.user ? req.user.id : null, created_date: now.toISOString(),
    status: 'pending', payment, customer, subtotal: totals.subtotal, discount: totals.discount, print_fee: totals.printFee,
    shipping: totals.shipping, total_qty: totals.totalQty, coupon: totals.coupon, total: totals.total
  };
  order.code = orderCode(now, order.id);
  db.t('orders').push(order);
  let detailId = db.nextId('order_details');
  lines.forEach(({ v, p, qty, print }) => db.t('order_details').push({
    id: detailId++, order_id: order.id, product_id: p.id, variant_id: v.id, product_name: p.name, variant_name: v.variant_name,
    color: v.color, color_hex: v.color_hex, size: v.size, image: v.image || p.image, quantity: qty, unit_price: v.price, print
  }));
  need.forEach((qty, id) => { db.t('product_variants').find(x => x.id === id).quantity -= qty; });
  db.save();
  res.status(201).json(serializeOrder(order));
});

orders.get('/mine', requireAuth, (req, res) =>
  send(res, queryList(db.t('orders').filter(o => o.user_id === req.user.id).map(serializeOrder), { _sort: 'created_date', _order: 'desc' })));

/** Tra cứu đơn cho trang cảm ơn: cần mã đơn + SĐT (hoặc là chủ đơn / admin) */
orders.get('/lookup', (req, res) => {
  const o = db.t('orders').find(x => x.code === str(req.query.code));
  const owner = o && req.user && (req.user.role === 'admin' || o.user_id === req.user.id);
  const phoneOk = o && str(req.query.phone).replace(/\s/g, '') === o.customer.phone.replace(/\s/g, '');
  if (!o || !(owner || phoneOk)) throw new HttpError(404, 'Không tìm thấy đơn hàng');
  res.json(serializeOrder(o));
});

orders.get('/', requireAdmin, (req, res) => {
  const list = db.t('orders').map(serializeOrder).map(o => ({ ...o, customer_name: o.customer.name, customer_phone: o.customer.phone, customer_email: o.customer.email }));
  send(res, queryList(list, req.query, ['code', 'customer_name', 'customer_phone', 'customer_email']));
});
orders.get('/:id', requireAuth, (req, res) => {
  const o = db.t('orders').find(x => x.id === Number(req.params.id));
  if (!o || (req.user.role !== 'admin' && o.user_id !== req.user.id)) throw new HttpError(404, 'Không tìm thấy đơn hàng');
  res.json(serializeOrder(o));
});

/** Đổi trạng thái: huỷ đơn → hoàn tồn kho, mở lại đơn đã huỷ → trừ tồn kho */
const changeStatus = (req, res) => {
  const o = db.t('orders').find(x => x.id === Number(req.params.id));
  const next = req.body?.status;
  if (!o) throw new HttpError(404, 'Không tìm thấy đơn hàng');
  if (!ORDER_STATUS[next]) throw bad('Trạng thái không hợp lệ');
  if (next !== o.status && (next === 'cancelled' || o.status === 'cancelled')) {
    const sign = next === 'cancelled' ? 1 : -1;
    const rows = db.t('order_details').filter(d => d.order_id === o.id);
    if (sign < 0) {
      const lack = rows.find(d => (db.t('product_variants').find(v => v.id === d.variant_id)?.quantity ?? 0) < d.quantity);
      if (lack) throw new HttpError(409, `Không đủ tồn kho để mở lại đơn: ${lack.product_name} (${lack.variant_name})`);
    }
    rows.forEach(d => { const v = db.t('product_variants').find(x => x.id === d.variant_id); if (v) v.quantity += sign * d.quantity; });
  }
  o.status = next; db.save(); res.json(serializeOrder(o));
};
orders.patch('/:id/status', requireAdmin, changeStatus);
orders.put('/:id/status', requireAdmin, changeStatus);
orders.delete('/:id', requireAdmin, (req, res) => {
  const o = db.t('orders').find(x => x.id === Number(req.params.id));
  if (!o) throw new HttpError(404, 'Không tìm thấy đơn hàng');
  if (o.status !== 'cancelled') throw new HttpError(409, 'Chỉ có thể xoá đơn hàng đã huỷ.');
  db.data.orders = db.t('orders').filter(x => x.id !== o.id);
  db.data.order_details = db.t('order_details').filter(d => d.order_id !== o.id);
  db.save(); res.json({ ok: true });
});
app.use('/api/orders', orders);

app.get('/api/order_details', requireAdmin, (req, res) => send(res, queryList(db.t('order_details'), req.query, ['product_name'])));

/* ---------- THỐNG KÊ (admin) ---------- */
function inPeriod(iso, period) {
  const d = new Date(iso), now = new Date();
  if (period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  if (period === 'year') return d.getFullYear() === now.getFullYear();
  if (period === '30') return now - d <= 30 * 864e5;
  return true;
}

app.get('/api/stats', requireAdmin, (req, res) => {
  const period = str(req.query.period) || 'all';
  const allOrders = db.t('orders');
  const inRange = allOrders.filter(o => inPeriod(o.created_date, period));
  const valid = inRange.filter(o => o.status !== 'cancelled');
  const validIds = new Set(valid.map(o => o.id));
  const details = db.t('order_details').filter(d => validIds.has(d.order_id));
  const prods = db.t('products');
  const variants = db.t('product_variants').filter(v => v.active);

  // Doanh thu 6 tháng gần nhất (không phụ thuộc bộ lọc thời gian)
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => new Date(now.getFullYear(), now.getMonth() - 5 + i, 1));
  const revenueByMonth = months.map(m => ({
    label: `T${m.getMonth() + 1}/${String(m.getFullYear()).slice(2)}`,
    value: allOrders.filter(o => {
      const d = new Date(o.created_date);
      return o.status !== 'cancelled' && d.getMonth() === m.getMonth() && d.getFullYear() === m.getFullYear();
    }).reduce((s, o) => s + o.total, 0)
  }));

  const soldMap = {}, revMap = {};
  details.forEach(d => {
    soldMap[d.product_id] = (soldMap[d.product_id] || 0) + d.quantity;
    revMap[d.product_id] = (revMap[d.product_id] || 0) + d.quantity * d.unit_price;
  });

  const stockRows = prods.filter(p => p.active || variants.some(v => v.product_id === p.id)).map(p => {
    const vs = variants.filter(v => v.product_id === p.id);
    return {
      id: p.id, name: p.name, category: findCategory(p.cate_id)?.name || '', stock: vs.reduce((s, v) => s + v.quantity, 0),
      variants: vs.length, variants_out: vs.filter(v => v.quantity === 0).length,
      variants_low: vs.filter(v => v.quantity > 0 && v.quantity < 10).length, active: p.active
    };
  });
  const totalStock = stockRows.reduce((s, r) => s + r.stock, 0);

  res.json({
    revenue: valid.reduce((s, o) => s + o.total, 0),
    completedRevenue: valid.filter(o => o.status === 'completed').reduce((s, o) => s + o.total, 0),
    soldQty: details.reduce((s, d) => s + d.quantity, 0),
    validOrders: valid.length,
    orderCount: inRange.length,
    pendingCount: inRange.filter(o => o.status === 'pending').length,
    cancelledCount: inRange.filter(o => o.status === 'cancelled').length,
    totalStock,
    productCount: prods.length,
    outCount: stockRows.filter(r => r.stock === 0).length,
    lowCount: stockRows.filter(r => r.stock > 0 && r.stock < LOW_STOCK).length,
    lowThreshold: LOW_STOCK,
    revenueByMonth,
    qtyByCategory: db.t('categories').map(c => ({
      id: c.id, name: c.name,
      value: details.filter(d => findProduct(d.product_id)?.cate_id === c.id).reduce((s, d) => s + d.quantity, 0)
    })),
    topProducts: prods.map(p => ({ id: p.id, name: p.name, image: p.image, cate_id: p.cate_id, category: findCategory(p.cate_id)?.name || '', sold: soldMap[p.id] || 0, revenue: revMap[p.id] || 0 }))
      .filter(x => x.sold).sort((a, b) => b.sold - a.sold).slice(0, 5),
    stock: stockRows.sort((a, b) => a.stock - b.stock),
    recentOrders: [...allOrders].sort((a, b) => b.created_date.localeCompare(a.created_date)).slice(0, 6).map(serializeOrder),
    pendingAll: allOrders.filter(o => o.status === 'pending').length
  });
});

/* ---------- Tải ảnh (admin) – ảnh đã được trình duyệt nén sang WebP; folder: products | posts | og ---------- */
app.post('/api/upload', requireAdmin, (req, res) => {
  const { name, data } = req.body || {};
  const folder = ['products', 'posts', 'og'].includes(req.body?.folder) ? req.body.folder : 'products';
  const m = /^data:image\/(webp|png|jpeg);base64,([A-Za-z0-9+/=]+)$/.exec(String(data || ''));
  if (!m) throw bad('Chỉ nhận ảnh WebP / PNG / JPEG');
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > 2 * 1024 * 1024) throw bad('Ảnh quá lớn (tối đa 2MB sau khi nén)');
  const ext = m[1] === 'jpeg' ? 'jpg' : m[1];
  const dir = path.join(ROOT, 'images', folder);
  fs.mkdirSync(dir, { recursive: true });
  const base = slugify(String(name || 'anh').replace(/\.[^.]+$/, '')) || 'anh';
  let file = `${base}.${ext}`;
  for (let i = 2; fs.existsSync(path.join(dir, file)); i++) file = `${base}-${i}.${ext}`;
  fs.writeFileSync(path.join(dir, file), buf);
  res.status(201).json({ path: `images/${folder}/${file}`, size: buf.length });
});

/* ---------- POSTS (bài viết / tin tức) ---------- */
function postData(body, id) {
  const title = str(body.title);
  const errors = {};
  if (title.length < 5) errors.title = 'Tiêu đề tối thiểu 5 ký tự';
  if (str(body.content).length < 50) errors.content = 'Nội dung tối thiểu 50 ký tự';
  if (Object.keys(errors).length) throw bad('Dữ liệu bài viết chưa hợp lệ', { errors });
  return {
    title, summary: str(body.summary).slice(0, 400), content: str(body.content), image: str(body.image),
    tags: str(body.tags).slice(0, 200), author: str(body.author) || 'AURUM Uniform', active: body.active !== false,
    ...seoFields(body, db.t('posts'), id, title), updated_at: today()
  };
}
const posts = express.Router();
posts.get('/', (req, res) => {
  const admin = req.user?.role === 'admin' && req.query.scope === 'admin';
  const list = db.t('posts').filter(x => admin || x.active);
  const sorted = [...list].sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id);
  send(res, queryList(sorted, req.query, ['title', 'summary', 'tags']));
});
posts.get('/:id', (req, res) => {
  const x = db.t('posts').find(p => p.id === Number(req.params.id));
  if (!x || (!x.active && req.user?.role !== 'admin')) throw new HttpError(404, 'Không tìm thấy bài viết');
  res.json(x);
});
posts.post('/', requireAdmin, (req, res) => {
  const id = db.nextId('posts');
  const x = { id, ...postData(req.body || {}, id), created_at: today() };
  db.t('posts').push(x); db.save(); res.status(201).json(x);
});
const updatePost = (req, res) => {
  const x = db.t('posts').find(p => p.id === Number(req.params.id));
  if (!x) throw new HttpError(404, 'Không tìm thấy bài viết');
  Object.assign(x, postData({ ...x, ...req.body }, x.id)); db.save(); res.json(x);
};
posts.put('/:id', requireAdmin, updatePost);
posts.patch('/:id', requireAdmin, updatePost);
posts.delete('/:id', requireAdmin, (req, res) => {
  const x = db.t('posts').find(p => p.id === Number(req.params.id));
  if (!x) throw new HttpError(404, 'Không tìm thấy bài viết');
  db.data.posts = db.t('posts').filter(p => p.id !== x.id); db.save(); res.json({ ok: true });
});
app.use('/api/posts', posts);

/* ---------- SETTINGS (cấu hình SEO hệ thống + Facebook) ---------- */
const isUrl = v => /^https?:\/\/[^\s]+$/i.test(v);
function cleanSettings(group, body) {
  const cur = db.t('settings')[group];
  const out = {};
  for (const [k, def] of Object.entries(DEFAULT_SETTINGS[group])) {
    const v = body[k] === undefined ? cur[k] : body[k];
    out[k] = typeof def === 'boolean' ? v === true || v === 'true' : str(v);
  }
  const errors = {};
  if (group === 'seo') {
    out.site_url = out.site_url.replace(/\/+$/, '');
    if (out.site_url && !isUrl(out.site_url)) errors.site_url = 'Địa chỉ phải bắt đầu bằng http:// hoặc https://';
    if (out.ga_id && !/^G-[A-Z0-9]{4,}$/i.test(out.ga_id)) errors.ga_id = 'Mã GA4 có dạng G-XXXXXXXXXX';
    out.ga_id = out.ga_id.toUpperCase();
    // Cho phép dán cả thẻ <meta ... content="..."> của Search Console
    const m = /content=["']([^"']+)["']/.exec(out.gsc_verification);
    if (m) out.gsc_verification = m[1];
    if (out.gsc_verification && !/^[\w-]{10,}$/.test(out.gsc_verification)) errors.gsc_verification = 'Mã xác minh không hợp lệ';
    if (out.home_title.length > 70) errors.home_title = 'Tiêu đề tối đa 70 ký tự';
    if (out.home_description.length > 200) errors.home_description = 'Mô tả tối đa 200 ký tự';
  } else {
    if (out.page_url && !/^https?:\/\/(www\.|m\.)?facebook\.com\/.+/i.test(out.page_url)) errors.page_url = 'Nhập địa chỉ fanpage dạng https://www.facebook.com/ten-trang';
    if (out.app_id && !/^\d{5,20}$/.test(out.app_id)) errors.app_id = 'App ID chỉ gồm chữ số';
    if (out.pixel_id && !/^\d{5,20}$/.test(out.pixel_id)) errors.pixel_id = 'Pixel ID chỉ gồm chữ số';
    out.messenger_username = out.messenger_username.replace(/^https?:\/\/(m\.me|www\.facebook\.com)\//i, '').replace(/\/.*$/, '');
  }
  if (Object.keys(errors).length) throw bad('Cấu hình chưa hợp lệ', { errors });
  return out;
}
/** Phần công khai: trang khách hàng cần để hiện nút Facebook, mạng xã hội... */
app.get('/api/settings/public', (_req, res) => {
  const { seo, facebook } = db.t('settings');
  res.json({ site_name: seo.site_name, facebook: { ...facebook, pixel_id: undefined } });
});
app.get('/api/settings', requireAdmin, (_req, res) => res.json(db.t('settings')));
app.put('/api/settings/:group', requireAdmin, (req, res) => {
  const group = req.params.group;
  if (!DEFAULT_SETTINGS[group]) throw new HttpError(404, 'Nhóm cấu hình không tồn tại');
  db.t('settings')[group] = cleanSettings(group, req.body || {});
  db.save(); res.json(db.t('settings'));
});

/* ---------- Khôi phục dữ liệu mẫu (admin) ---------- */
app.post('/api/admin/reset', requireAdmin, (_req, res) => { db.reset(); res.json({ ok: true }); });

app.get('/api/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));
app.use('/api', (_req, _res, next) => next(new HttpError(404, 'API không tồn tại')));

/* ---------- Giao diện web: SEO (meta, sitemap, robots) rồi tới file tĩnh ---------- */
app.use(['/server', '/node_modules', '/package.json', '/package-lock.json', '/render.yaml'], (_req, res) => res.sendStatus(404));
app.use(createSeoRouter({ db, ROOT, findCategory }));
app.use(express.static(ROOT, { extensions: ['html'], dotfiles: 'ignore' }));

/* ---------- Xử lý lỗi ---------- */
app.use((err, _req, res, _next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Dữ liệu gửi lên không hợp lệ' });
  if (err.type === 'entity.too.large') return res.status(413).json({ message: 'Dữ liệu gửi lên quá lớn' });
  if (!(err instanceof HttpError)) console.error(err);
  res.status(err.status || 500).json({ message: err.status ? err.message : 'Lỗi máy chủ', ...(err.extra || {}) });
});

app.listen(PORT, () => {
  console.log(`\n  AURUM Uniform đang chạy:  http://localhost:${PORT}`);
  console.log(`  API:                      http://localhost:${PORT}/api\n`);
});
