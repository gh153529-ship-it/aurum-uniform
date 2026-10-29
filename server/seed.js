/* =========================================================
   AURUM UNIFORM – Dữ liệu mẫu cho db.json
   Bảng: categories, products, product_variants, orders, order_details,
   users, posts (bài viết) và settings (cấu hình SEO / Facebook).
   Chạy:  npm run seed   (tạo lại db.json từ đầu)
   ========================================================= */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { calcTotals } from '../js/core/pricing.js';
import { hashPassword } from './security.js';
import { POSTS, DEFAULT_SETTINGS } from './seed-content.js';

const COLORS = {
  black: { name: 'Đen',          hex: '#1a1a1a' },
  white: { name: 'Trắng',        hex: '#f5f5f2' },
  navy:  { name: 'Xanh navy',    hex: '#1f2a44' },
  gray:  { name: 'Xám',          hex: '#8a8d91' },
  gold:  { name: 'Vàng gold',    hex: '#c9a54c' },
  wine:  { name: 'Đỏ đô',        hex: '#6d1f2b' },
  sky:   { name: 'Xanh da trời', hex: '#9cc3e6' },
  beige: { name: 'Be',           hex: '#d9c8a9' },
  green: { name: 'Xanh rêu',     hex: '#4b5a3a' },
  orange:{ name: 'Cam',          hex: '#e46a1e' },
  lime:  { name: 'Vàng chanh',   hex: '#d6de3a' }
};
const STD = ['S', 'M', 'L', 'XL', 'XXL'];
const SIZE_WEIGHT = { S: 0.8, M: 1.3, L: 1.3, XL: 1, XXL: 0.6, '38': 0.7, '39': 1, '40': 1.3, '41': 1.2, '42': 0.9, '43': 0.6 };
const SIZE_SURCHARGE = { XXL: 10000, '3XL': 20000 };

const CATEGORIES = [
  { id: 1, name: 'Áo polo',         parent_id: null, slug: 'ao-polo',       description: 'Áo polo đồng phục cổ bẻ, lịch sự và thoáng mát.', active: true },
  { id: 2, name: 'Áo sơ mi',        parent_id: null, slug: 'ao-so-mi',      description: 'Sơ mi công sở nam nữ, form chuẩn văn phòng.',     active: true },
  { id: 3, name: 'Áo khoác / Vest', parent_id: null, slug: 'ao-khoac-vest', description: 'Áo khoác gió, blazer và vest đồng phục.',        active: true },
  { id: 4, name: 'Áo thun cổ tròn', parent_id: null, slug: 'ao-thun',       description: 'Áo thun team building, sự kiện công ty.',         active: true },
  { id: 5, name: 'Đồng phục bảo hộ', parent_id: null, slug: 'dong-phuc-bao-ho', description: 'Áo bảo hộ lao động, áo phản quang, đồng phục kỹ sư – công nhân.', active: true }
];

// [id, cate_id, name, giá, giá gốc, tồn tổng, màu, size, chất liệu, nổi bật, ngày tạo, mô tả]
const PRODUCTS = [
  [1, 1, 'Polo Aurum Classic', 165000, 195000, 420, ['black', 'white', 'navy', 'gold'], STD, 'Cotton cá sấu 4 chiều 65/35', true, '2026-05-02',
    'Mẫu polo bán chạy nhất của AURUM. Vải cá sấu co giãn 4 chiều, thấm hút tốt, giữ form sau nhiều lần giặt. Phù hợp đồng phục văn phòng, cửa hàng, showroom.'],
  [2, 1, 'Polo Phối Viền Gold', 185000, 0, 260, ['black', 'navy', 'wine'], STD, 'Cotton cá sấu Mỹ', true, '2026-06-11',
    'Polo phối viền vàng ở cổ và tay áo, tạo điểm nhấn sang trọng cho đồng phục doanh nghiệp, nhà hàng, khách sạn.'],
  [3, 1, 'Polo Airy Cool Tech', 155000, 175000, 35, ['white', 'gray', 'sky'], STD, 'Polyester Coolmax', false, '2026-07-20',
    'Chất liệu Coolmax siêu nhẹ, khô nhanh — lựa chọn tốt cho nhân viên làm việc ngoài trời, kỹ thuật, giao hàng.'],
  [4, 2, 'Sơ Mi Oxford Nam', 245000, 280000, 310, ['white', 'sky', 'navy'], ['38', '39', '40', '41', '42', '43'], 'Oxford cotton 100%', true, '2026-04-15',
    'Sơ mi Oxford dài tay, cổ đứng có nút cài, chống nhăn nhẹ. Đồng phục chuẩn cho ngân hàng, văn phòng, bất động sản.'],
  [5, 2, 'Sơ Mi Lụa Nữ Thanh Lịch', 265000, 0, 180, ['white', 'beige', 'black'], STD, 'Lụa Hàn mềm mịn', true, '2026-08-01',
    'Sơ mi nữ chất lụa rủ, form suông tôn dáng, phù hợp lễ tân, chăm sóc khách hàng, nhân viên văn phòng.'],
  [6, 2, 'Sơ Mi Ngắn Tay Công Sở', 215000, 239000, 18, ['white', 'sky'], STD, 'Kate silk', false, '2026-03-22',
    'Sơ mi ngắn tay mát mẻ cho mùa hè, chất kate silk ít nhăn, dễ ủi, giá tốt cho đơn hàng số lượng lớn.'],
  [7, 3, 'Blazer Aurum Signature', 690000, 790000, 95, ['black', 'navy', 'gray'], STD, 'Tuyết mưa cao cấp, lót lụa', true, '2026-02-10',
    'Blazer may đo form chuẩn, lót lụa thoáng khí. Thêu logo công ty trên ngực trái — đồng phục quản lý, sales cao cấp.'],
  [8, 3, 'Áo Khoác Gió 2 Lớp', 320000, 0, 140, ['black', 'navy', 'green'], STD, 'Vải dù chống nước, lót lưới', false, '2026-09-05',
    'Áo khoác gió 2 lớp chống nước nhẹ, có mũ tháo rời. Phù hợp đồng phục kỹ thuật, công trường, sự kiện ngoài trời.'],
  [9, 3, 'Gile Vest Đồng Phục', 285000, 310000, 60, ['black', 'gray'], STD, 'Kaki pha', false, '2026-01-18',
    'Gile vest đồng phục nhà hàng, quầy bar, khách sạn. Thiết kế gọn gàng, có túi tiện dụng.'],
  [10, 4, 'Thun Team Building Basic', 95000, 120000, 850, ['black', 'white', 'gold', 'wine', 'navy'], STD, 'Cotton 100% 2 chiều', true, '2026-06-28',
    'Áo thun cổ tròn giá tốt nhất cho team building, hội thảo, sự kiện. In tên, logo, slogan theo yêu cầu.'],
  [11, 4, 'Thun Premium Oversize', 135000, 0, 240, ['black', 'beige', 'green'], STD, 'Cotton compact 250gsm', false, '2026-09-18',
    'Áo thun dày dặn form oversize trẻ trung, dành cho startup, agency, cửa hàng thời trang.'],
  [12, 4, 'Thun Raglan Phối Tay', 115000, 129000, 0, ['white', 'black'], STD, 'Cotton pha spandex', false, '2026-05-30',
    'Thun raglan phối màu tay áo năng động, thích hợp đồng phục sự kiện thể thao, lớp học, câu lạc bộ.'],
  [13, 1, 'Polo Nữ Form Ôm Eva', 175000, 199000, 230, ['white', 'beige', 'navy'], ['S', 'M', 'L', 'XL'], 'Cotton cá sấu pha spandex', false, '2026-08-14',
    'Polo nữ form ôm nhẹ tôn dáng, cổ bo dệt mềm. Đồng phục cho spa, thẩm mỹ viện, cửa hàng mỹ phẩm, nhân viên bán hàng.'],
  [14, 2, 'Sơ Mi Caro Trẻ Trung', 235000, 0, 150, ['sky', 'gray'], STD, 'Cotton caro sợi nhuộm', false, '2026-07-07',
    'Sơ mi caro nhỏ thanh lịch mà không cứng nhắc, hợp đồng phục công ty công nghệ, agency, quán cà phê.'],
  [15, 3, 'Hoodie Đồng Phục Nỉ Bông', 289000, 329000, 200, ['black', 'gray', 'navy'], STD, 'Nỉ bông cotton 330gsm', true, '2026-09-25',
    'Hoodie nỉ bông dày dặn, mũ 2 lớp, túi kangaroo. Đồng phục mùa lạnh cho công ty, lớp học, câu lạc bộ – in thêu logo sắc nét.'],
  [16, 4, 'Thun Cổ Tim Sự Kiện', 105000, 0, 380, ['white', 'black', 'orange'], STD, 'Cotton 65/35', false, '2026-08-22',
    'Áo thun cổ tim giá tốt cho hội chợ, sự kiện ra mắt sản phẩm, chạy bộ cộng đồng. In nhanh trong 48 giờ.'],
  [17, 5, 'Áo Bảo Hộ Phản Quang', 145000, 165000, 520, ['orange', 'lime'], STD, 'Vải lưới thoáng khí + dải phản quang 5cm', true, '2026-06-03',
    'Áo gile phản quang có dải phản quang 5cm, nhìn rõ từ xa vào ban đêm. Dành cho công nhân công trường, giao thông, kho vận.'],
  [18, 5, 'Áo Kỹ Sư Công Trình', 255000, 0, 160, ['navy', 'gray'], STD, 'Kaki Thành Công 2 lớp', false, '2026-07-15',
    'Áo kỹ sư dài tay nhiều túi hộp, phối dải phản quang ở vai. Bền, thoáng, đứng form – chuẩn đồng phục kỹ sư xây dựng, điện lực.'],
  [19, 5, 'Bộ Quần Áo Bảo Hộ Kaki', 315000, 350000, 90, ['navy', 'orange'], STD, 'Kaki 65/35 dày, chống xù', false, '2026-04-28',
    'Bộ quần áo bảo hộ lao động kaki dày, đường may 3 kim chắc chắn, chống bám bụi. Phù hợp nhà máy, xưởng cơ khí, kho bãi.'],
  [20, 5, 'Thun Bảo Hộ Cotton Dày', 125000, 0, 270, ['gray', 'navy', 'orange'], STD, 'Cotton 100% 280gsm', false, '2026-09-30',
    'Áo thun bảo hộ cổ trụ vải dày, thấm mồ hôi tốt, chịu giặt nhiều lần. Đồng phục cho công nhân, nhân viên kho, giao nhận.']
];

/* Từ khoá chính (focus keyword) cho SEO từng sản phẩm */
const FOCUS = {
  1: 'áo polo đồng phục', 2: 'áo polo phối viền', 3: 'áo polo thể thao đồng phục', 4: 'áo sơ mi oxford đồng phục',
  5: 'sơ mi nữ công sở', 6: 'sơ mi ngắn tay đồng phục', 7: 'áo blazer đồng phục', 8: 'áo khoác gió đồng phục',
  9: 'áo gile đồng phục', 10: 'áo thun team building', 11: 'áo thun oversize đồng phục', 12: 'áo thun raglan',
  13: 'áo polo nữ đồng phục', 14: 'sơ mi caro đồng phục', 15: 'áo hoodie đồng phục', 16: 'áo thun cổ tim sự kiện',
  17: 'áo bảo hộ phản quang', 18: 'áo kỹ sư công trình', 19: 'quần áo bảo hộ lao động', 20: 'áo thun bảo hộ'
};
const UNOPTIMIZED = new Set([9, 12]);
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const cut = (s, n) => (s.length <= n ? s : s.slice(0, s.lastIndexOf(' ', n - 1)) + '…');
export const slugify = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** Chia tổng tồn kho cho các biến thể theo tỉ trọng size, tổng luôn khớp */
function splitStock(total, sizes, colorCount) {
  const weights = [];
  for (let c = 0; c < colorCount; c++) sizes.forEach(s => weights.push(SIZE_WEIGHT[s] || 1));
  const sum = weights.reduce((a, b) => a + b, 0);
  const qty = weights.map(w => Math.floor(total * w / sum));
  let rest = total - qty.reduce((a, b) => a + b, 0);
  for (let i = 0; rest > 0; i = (i + 1) % qty.length, rest--) qty[i]++;
  return qty;
}

const USERS = [
  [1, 'Quản trị viên',     'admin@aurum.vn',      '0900000000', 'admin123', 'Q.1, TP. Hồ Chí Minh',                  'admin',    true,  '2026-01-01'],
  [2, 'Nguyễn Văn An',     'khach@aurum.vn',      '0912345678', '123456',   '12 Lê Lợi, Q.1, TP. Hồ Chí Minh',       'customer', true,  '2026-03-12'],
  [3, 'Trần Thị Bích',     'bich.tran@gmail.com', '0987654321', '123456',   '45 Trần Phú, Hải Châu, Đà Nẵng',        'customer', true,  '2026-04-20'],
  [4, 'Công ty Minh Phát', 'hr@minhphat.vn',      '0283456789', '123456',   'KCN Tân Bình, TP. Hồ Chí Minh',         'customer', true,  '2026-05-05'],
  [5, 'Lê Hoàng Long',     'long.le@yahoo.com',   '0934111222', '123456',   '88 Cầu Giấy, Hà Nội',                   'customer', true,  '2026-06-17'],
  [6, 'Phạm Thu Hà',       'ha.pham@gmail.com',   '0978555666', '123456',   '21 Nguyễn Trãi, Ninh Kiều, Cần Thơ',    'customer', false, '2026-07-02']
];

// [số tháng trước, ngày, userId, [[productId, chỉ số màu, size, SL, nội dung in]], trạng thái, thanh toán]
const ORDER_PLAN = [
  [5, 6,  4, [[1, 0, 'M', 40, 'Logo Minh Phát'], [1, 0, 'L', 25, 'Logo Minh Phát']], 'completed', 'bank'],
  [5, 19, 2, [[4, 0, '40', 3, '']],                                                   'completed', 'cod'],
  [4, 3,  3, [[5, 1, 'S', 6, ''], [5, 1, 'M', 4, '']],                                 'completed', 'cod'],
  [4, 22, 5, [[10, 2, 'L', 60, 'AURUM RUN 2026']],                                    'completed', 'bank'],
  [3, 9,  4, [[7, 0, 'L', 12, 'Logo Minh Phát']],                                     'completed', 'bank'],
  [3, 27, 2, [[2, 1, 'M', 8, '']],                                                    'cancelled', 'cod'],
  [2, 4,  3, [[6, 0, 'M', 10, ''], [4, 1, '39', 5, '']],                               'completed', 'ewallet'],
  [2, 18, 5, [[11, 0, 'XL', 15, 'Team Long']],                                        'completed', 'cod'],
  [1, 2,  4, [[3, 0, 'M', 30, 'MP Tech'], [8, 0, 'L', 20, 'MP Tech']],                 'completed', 'bank'],
  [1, 21, 2, [[10, 0, 'M', 25, '']],                                                  'shipping',  'cod'],
  [0, 1,  3, [[1, 2, 'S', 12, 'Spa Bích'], [9, 0, 'M', 4, '']],                        'shipping',  'ewallet'],
  [0, 4,  5, [[7, 1, 'XL', 2, '']],                                                   'pending',   'cod'],
  [0, 6,  2, [[2, 0, 'L', 5, 'An Corp']],                                             'pending',   'bank']
];

export const orderCode = (date, id) =>
  'AU' + String(date.getFullYear()).slice(2) + String(date.getMonth() + 1).padStart(2, '0') + String(1000 + id);

export function buildSeed(now = new Date()) {
  const users = USERS.map(([id, name, email, phone, pw, address, role, active, created_at]) =>
    ({ id, name, email, phone, address, password: hashPassword(pw), role, active, created_at }));

  const products = [], variants = [];
  PRODUCTS.forEach(([id, cate_id, name, price, old, stock, colorKeys, sizes, material, featured, created_at, detail]) => {
    const kw = FOCUS[id] || name.toLowerCase();
    const kwInName = slugify(kw).split('-').every(w => slugify(name).split('-').includes(w));
    // 2 sản phẩm (9, 12) cố ý để SEO chưa tối ưu – dùng làm ví dụ cải thiện trong trang "Tối ưu SEO"
    const optimized = !UNOPTIMIZED.has(id);
    const fullDetail = optimized ? `${detail} ${cap(kw)} tại AURUM nhận in, thêu logo theo yêu cầu, giá sỉ từ 20 áo.` : detail;
    const lowerDetail = detail.charAt(0).toLowerCase() + detail.slice(1);
    const kwWords = slugify(kw).split('-');
    const extra = slugify(name).split('-').filter(w => { const i = kwWords.indexOf(w); if (i < 0) return true; kwWords.splice(i, 1); return false; }).join('-');
    products.push({
      id, name, cate_id, detail: fullDetail, image: `images/products/p${id}.webp`, material, old_price: old, featured, active: true, created_at,
      slug: optimized && !kwInName ? `${slugify(kw)}${extra ? '-' + extra : ''}` : slugify(name),
      focus_keyword: kw,
      seo_title: kwInName ? `${name} – May đồng phục giá xưởng` : `${name} – ${cap(kw)} giá xưởng`,
      seo_description: cut(kwInName ? `${name}: ${lowerDetail}` : `${name} – ${kw}: ${lowerDetail}`, 158),
      seo_keywords: [...new Set([kw, name.toLowerCase(), 'đồng phục công ty', 'AURUM'])].join(', ')
    });
    const qty = splitStock(stock, sizes, colorKeys.length);
    let i = 0;
    colorKeys.forEach(ck => sizes.forEach(size => {
      variants.push({
        id: variants.length + 1, product_id: id, variant_name: `${COLORS[ck].name} / ${size}`,
        color: COLORS[ck].name, color_hex: COLORS[ck].hex, size,
        price: price + (SIZE_SURCHARGE[size] || 0), quantity: qty[i++], image: '', active: true
      });
    }));
  });

  const orders = [], details = [];
  ORDER_PLAN.forEach(([mAgo, day, userId, lines, status, payment], i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - mAgo, day, 9 + (i % 8), 15 + i);
    const user = users.find(u => u.id === userId);
    const orderId = i + 1;
    const rows = lines.map(([pid, ci, size, quantity, printText]) => {
      const product = products.find(p => p.id === pid);
      const colorName = COLORS[PRODUCTS.find(x => x[0] === pid)[6][ci]].name;
      const v = variants.find(x => x.product_id === pid && x.color === colorName && x.size === size);
      return {
        order_id: orderId, product_id: pid, variant_id: v.id, product_name: product.name, variant_name: v.variant_name,
        color: v.color, color_hex: v.color_hex, size, image: product.image, quantity, unit_price: v.price,
        print: printText ? { text: printText, position: 'Ngực trái', logo: '' } : null
      };
    });
    const t = calcTotals(rows.map(r => ({ productId: r.product_id, price: r.unit_price, qty: r.quantity, print: r.print })));
    orders.push({
      id: orderId, code: orderCode(d, orderId), user_id: userId, created_date: d.toISOString(), status, payment,
      customer: { name: user.name, phone: user.phone, email: user.email, address: user.address, note: '', vat: null },
      subtotal: t.subtotal, discount: t.discount, print_fee: t.printFee, shipping: t.shipping,
      total_qty: t.totalQty, coupon: null, total: t.total
    });
    rows.forEach(r => details.push({ id: details.length + 1, ...r }));
  });

  const productLink = (_m, pid) => `(/san-pham/${products.find(p => p.id === Number(pid)).slug})`;
  const posts = POSTS.map(x => ({
    ...x, content: x.content.replace(/\(product:(\d+)\)/g, productLink), author: 'AURUM Uniform', active: true, updated_at: x.created_at,
    seo_title: x.seo_title || x.title, seo_description: x.summary.length > 160 ? cut(x.summary, 158) : x.summary,
    seo_keywords: `${x.focus_keyword}, ${x.tags}`
  }));

  return {
    categories: CATEGORIES.map(c => ({ ...c })), products, product_variants: variants, users, orders, order_details: details,
    posts, settings: structuredClone(DEFAULT_SETTINGS)
  };
}

/* Chạy trực tiếp:  node server/seed.js --force */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = path.join(path.dirname(fileURLToPath(import.meta.url)), 'db.json');
  if (fs.existsSync(file) && !process.argv.includes('--force')) {
    console.log('db.json đã tồn tại. Thêm --force để tạo lại.');
  } else {
    fs.writeFileSync(file, JSON.stringify(buildSeed(), null, 2));
    console.log('Đã tạo server/db.json');
  }
}
