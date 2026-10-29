/* Hiển thị nội dung bài viết viết theo cú pháp gọn (an toàn – luôn escape trước):
     ## Tiêu đề phụ   ### Tiêu đề nhỏ   - gạch đầu dòng   **in đậm**   [chữ](đường-dẫn)
   Đoạn văn cách nhau bằng một dòng trống. */
import { esc } from '../core/utils.js';

const inline = s => esc(s)
  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  .replace(/\[([^\]]+)\]\(((?:https?:\/\/|\/)[^\s)]*)\)/g, (_m, text, href) => {
    const external = /^https?:\/\//.test(href) && !href.startsWith(location.origin);
    return `<a href="${href}"${external ? ' target="_blank" rel="noopener"' : ''}>${text}</a>`;
  });

export function renderRich(text) {
  const out = [];
  let list = null, para = [];
  const flushPara = () => { if (para.length) out.push(`<p>${para.map(inline).join('<br>')}</p>`); para = []; };
  const flushList = () => { if (list) out.push(`<ul>${list.map(x => `<li>${inline(x)}</li>`).join('')}</ul>`); list = null; };

  for (const raw of String(text || '').replace(/\r/g, '').split('\n')) {
    const line = raw.trim();
    if (!line) { flushPara(); flushList(); continue; }
    const li = /^-\s+(.*)$/.exec(line);
    if (li) { flushPara(); (list ||= []).push(li[1]); continue; }
    flushList();
    const h = /^(#{2,3})\s+(.*)$/.exec(line);
    if (h) { flushPara(); out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); continue; }
    para.push(line);
  }
  flushPara(); flushList();
  return out.join('\n');
}

/** Đếm số từ (dùng cho kiểm tra SEO) */
export const wordCount = text => String(text || '').replace(/[#*[\]()]/g, ' ').split(/\s+/).filter(w => w && w !== '-').length;
