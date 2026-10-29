/* Model sản phẩm: bọc dữ liệu thô từ API và cung cấp các thuộc tính tiện dụng */
import { SIZE_ORDER } from './config.js';

export class Product {
  constructor(raw) {
    Object.assign(this, raw);
    this.allVariants = raw.variants || [];
    this.variants = this.allVariants.filter(v => v.active !== false);
  }

  get price() { return this.min_price; }
  get maxPrice() { return this.max_price; }
  get hasPriceRange() { return this.max_price > this.min_price; }
  get oldPrice() { return this.old_price || 0; }
  get onSale() { return this.oldPrice > this.price; }
  get discountPercent() { return this.onSale ? Math.round((1 - this.price / this.oldPrice) * 100) : 0; }
  get inStock() { return this.stock > 0; }

  /** Danh sách màu (không trùng), giữ thứ tự xuất hiện */
  get colors() {
    const map = new Map();
    this.variants.forEach(v => { if (!map.has(v.color)) map.set(v.color, { name: v.color, hex: v.color_hex }); });
    return [...map.values()];
  }

  get sizes() {
    const set = new Set(this.variants.map(v => v.size));
    return [...set].sort((a, b) => SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b));
  }

  variantOf(color, size) { return this.variants.find(v => v.color === color && v.size === size) || null; }
  variantsOf(color) { return this.variants.filter(v => v.color === color); }
  colorStock(color) { return this.variantsOf(color).reduce((s, v) => s + v.quantity, 0); }
  colorHex(color) { return (this.colors.find(c => c.name === color) || {}).hex || '#1a1a1a'; }

  /** Ảnh hiển thị cho một màu: ảnh riêng của biến thể nếu có, không thì ảnh sản phẩm */
  imageFor(color) {
    const v = this.variantsOf(color).find(x => x.image);
    return v ? v.image : this.image;
  }

  findVariant(id) { return this.variants.find(v => v.id === Number(id)) || null; }
}

export const toProducts = list => list.map(p => new Product(p));
