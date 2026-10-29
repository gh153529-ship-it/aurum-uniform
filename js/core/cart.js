/* Giỏ hàng (lưu localStorage). Mỗi dòng = 1 biến thể (màu × size) + tuỳ chọn in ấn */
import { KEYS } from './config.js';
import { calcTotals, wholesaleRate } from './pricing.js';
import { $$ } from './utils.js';

const read = () => { try { return JSON.parse(localStorage.getItem(KEYS.cart)) || []; } catch { return []; } };

export class Cart {
  static items() { return read(); }
  static count() { return read().reduce((s, i) => s + i.qty, 0); }

  static save(items) {
    localStorage.setItem(KEYS.cart, JSON.stringify(items));
    Cart.updateBadge();
  }

  static keyOf({ variantId, print }) {
    return `${variantId}#${print ? [print.text, print.position, print.logo].join('|') : ''}`;
  }

  static add(item) {
    const items = read();
    const key = Cart.keyOf(item);
    const found = items.find(i => i.key === key);
    if (found) found.qty += item.qty; else items.push({ ...item, key });
    Cart.save(items);
  }

  static setQty(key, qty) {
    const items = read();
    const it = items.find(i => i.key === key);
    if (it) it.qty = Math.max(1, Math.floor(qty) || 1);
    Cart.save(items);
  }

  static remove(key) { Cart.save(read().filter(i => i.key !== key)); }
  static clear() { Cart.save([]); }

  /**
   * Ghép giỏ hàng với dữ liệu sản phẩm mới nhất từ API.
   * Dòng nào không còn bán sẽ bị loại và được báo qua `removed`.
   */
  static detailed(products) {
    const byVariant = new Map();
    products.forEach(p => p.variants.forEach(v => byVariant.set(v.id, { p, v })));
    const raw = read();
    const items = [];
    raw.forEach(i => {
      const hit = byVariant.get(i.variantId);
      if (!hit) return;
      const { p, v } = hit;
      items.push({
        ...i, productId: p.id, slug: p.slug, name: p.name, categoryId: p.cate_id, color: v.color, colorHex: v.color_hex, size: v.size,
        price: v.price, image: v.image || p.image, stock: v.quantity
      });
    });
    if (items.length !== raw.length) Cart.save(items.map(({ key, variantId, qty, print }) => ({ key, variantId, qty, print })));
    return { items, removed: raw.length - items.length, ...calcTotals(items) };
  }

  /** Tổng số áo của từng mẫu – dùng để tính bậc giá sỉ */
  static qtyByProduct(items) {
    const map = {};
    items.forEach(i => { map[i.productId] = (map[i.productId] || 0) + i.qty; });
    return map;
  }

  static rateFor(items, productId) { return wholesaleRate(Cart.qtyByProduct(items)[productId] || 0); }

  static updateBadge() { $$('.cart-count').forEach(el => { el.textContent = Cart.count(); }); }
}
