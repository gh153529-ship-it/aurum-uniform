/* Chấm điểm SEO cho sản phẩm / bài viết (giống Yoast, RankMath) – dùng ở trang quản trị */
import { norm, slugify } from './utils.js';

export const LIMITS = { titleMin: 30, titleMax: 60, descMin: 120, descMax: 160 };

const words = s => String(s || '').replace(/[#*[\]()]/g, ' ').split(/\s+/).filter(w => w && w !== '-').length;

/**
 * @param {object} d  { kind: 'product'|'post', focus_keyword, seo_title, seo_description, slug, content, image }
 * @returns {{ score:number, checks:{ok:boolean, label:string}[] }}
 */
export function seoChecks(d) {
  const kw = norm(d.focus_keyword);
  const title = String(d.seo_title || ''), desc = String(d.seo_description || '');
  const minWords = d.kind === 'post' ? 300 : 25;
  const n = words(d.content);
  const checks = [
    { ok: !!kw, label: 'Đã đặt từ khoá chính' },
    { ok: !!kw && norm(title).includes(kw), label: 'Từ khoá chính có trong tiêu đề SEO' },
    { ok: title.length >= LIMITS.titleMin && title.length <= LIMITS.titleMax, label: `Tiêu đề SEO dài ${LIMITS.titleMin}–${LIMITS.titleMax} ký tự (hiện ${title.length})` },
    { ok: desc.length >= LIMITS.descMin && desc.length <= LIMITS.descMax, label: `Mô tả SEO dài ${LIMITS.descMin}–${LIMITS.descMax} ký tự (hiện ${desc.length})` },
    { ok: !!kw && norm(desc).includes(kw), label: 'Từ khoá chính có trong mô tả SEO' },
    { ok: !!kw && String(d.slug || '').includes(slugify(kw)), label: 'Từ khoá chính có trong đường dẫn (slug)' },
    { ok: !!kw && norm(d.content).includes(kw), label: d.kind === 'post' ? 'Từ khoá chính xuất hiện trong nội dung bài' : 'Từ khoá chính xuất hiện trong mô tả sản phẩm' },
    { ok: n >= minWords, label: `Nội dung đủ dài ≥ ${minWords} từ (hiện ${n})` },
    { ok: !!d.image, label: 'Có ảnh đại diện' }
  ];
  if (d.kind === 'post') checks.push({ ok: /\]\(\//.test(d.content || ''), label: 'Có liên kết nội bộ tới sản phẩm / trang khác' });
  return { score: Math.round(100 * checks.filter(c => c.ok).length / checks.length), checks };
}

export const scoreClass = s => (s >= 80 ? 'good' : s >= 50 ? 'ok' : 'bad');
