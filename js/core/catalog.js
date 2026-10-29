/* Bộ nhớ đệm danh mục / sản phẩm trong một lần tải trang (tránh gọi API lặp lại) */
import { api } from './api.js';
import { toProducts } from './models.js';

let cats, prods;
export const Catalog = {
  categories() { return (cats ||= api.categories.list()); },
  async products() { return toProducts(await (prods ||= api.products.list())); },
  invalidate() { cats = prods = undefined; }
};
