/* Đường dẫn tới sản phẩm / bài viết – dùng chung cho mọi trang (kể cả admin) */
import { PRETTY_URLS } from './config.js';

const PREFIX = location.pathname.includes('/admin/') ? '../' : '';

export const productUrl = p => (PRETTY_URLS && p.slug ? `/san-pham/${p.slug}` : `${PREFIX}product-detail.html?id=${p.id}`);
export const postUrl = x => (PRETTY_URLS && x.slug ? `/tin-tuc/${x.slug}` : `${PREFIX}post.html?id=${x.id}`);
export const blogUrl = () => (PRETTY_URLS ? '/tin-tuc' : `${PREFIX}blog.html`);
export const absUrl = path => new URL(path, location.origin + '/').href;
