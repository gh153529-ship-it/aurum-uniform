/* =========================================================
   AURUM UNIFORM – SEO phía server
   - Chèn thẻ <title>, meta description/keywords, canonical, robots,
     Open Graph (Facebook), JSON-LD (Google), Google Analytics, Meta Pixel,
     mã xác minh Google Search Console vào từng trang HTML trước khi gửi đi.
   - Đường dẫn thân thiện: /san-pham/<slug>, /tin-tuc, /tin-tuc/<slug>
   - Sinh tự động /robots.txt và /sitemap.xml
   ========================================================= */
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';

const escHtml = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const escXml = escHtml;
const jsonForScript = v => JSON.stringify(v).replace(/</g, '\\u003c');
const plain = s => String(s ?? '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*#>`_-]+/g, ' ').replace(/\s+/g, ' ').trim();
const clip = (s, n) => (s.length <= n ? s : s.slice(0, s.lastIndexOf(' ', n - 1)) + '…');

/** Các trang không cần Google lập chỉ mục */
const NOINDEX_PAGES = new Set(['cart.html', 'checkout.html', 'thank-you.html', 'login.html', 'register.html']);

export function createSeoRouter({ db, ROOT, findCategory }) {
  const router = express.Router();
  const S = () => db.t('settings');
  const baseUrl = req => (S().seo.site_url || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');
  const abs = (req, p) => (/^https?:\/\//.test(p) ? p : `${baseUrl(req)}/${String(p).replace(/^\/+/, '')}`);
  const fileExists = rel => rel && fs.existsSync(path.join(ROOT, rel));

  const productUrl = p => `/san-pham/${p.slug}`;
  const postUrl = x => `/tin-tuc/${x.slug}`;
  const liveProducts = () => db.t('products').filter(p => p.active && findCategory(p.cate_id)?.active);
  const livePosts = () => db.t('posts').filter(x => x.active);

  /* ---------- Dựng khối <head> ---------- */
  function headTags(req, m) {
    const seo = S().seo, fb = S().facebook;
    const title = m.title || seo.home_title;
    const desc = clip(plain(m.description || seo.home_description), 170);
    const url = abs(req, m.path ?? req.originalUrl);
    const image = abs(req, m.image && fileExists(m.image) ? m.image : seo.og_image);
    const robots = !seo.allow_index || m.noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large';
    const tags = [
      `<title>${escHtml(title)}</title>`,
      `<meta name="description" content="${escHtml(desc)}">`,
      m.keywords || seo.home_keywords ? `<meta name="keywords" content="${escHtml(m.keywords || seo.home_keywords)}">` : '',
      `<meta name="robots" content="${robots}">`,
      m.noindex ? '' : `<link rel="canonical" href="${escHtml(url)}">`,
      `<meta property="og:site_name" content="${escHtml(seo.site_name)}">`,
      `<meta property="og:locale" content="vi_VN">`,
      `<meta property="og:type" content="${m.ogType || 'website'}">`,
      `<meta property="og:title" content="${escHtml(title)}">`,
      `<meta property="og:description" content="${escHtml(desc)}">`,
      `<meta property="og:url" content="${escHtml(url)}">`,
      `<meta property="og:image" content="${escHtml(image)}">`,
      `<meta property="og:image:alt" content="${escHtml(m.imageAlt || title)}">`,
      fb.app_id ? `<meta property="fb:app_id" content="${escHtml(fb.app_id)}">` : '',
      `<meta name="twitter:card" content="summary_large_image">`,
      seo.gsc_verification ? `<meta name="google-site-verification" content="${escHtml(seo.gsc_verification)}">` : '',
      ...(m.jsonld || []).map(j => `<script type="application/ld+json">${jsonForScript(j)}</script>`),
      `<script>window.__PAGE__=${jsonForScript(m.page || {})}</script>`,
      analytics()
    ];
    return tags.filter(Boolean).join('\n  ');
  }

  /** Google Analytics 4 + Meta Pixel (chỉ chèn khi admin đã nhập mã) */
  function analytics() {
    const { ga_id } = S().seo, { pixel_id } = S().facebook;
    let out = '';
    if (ga_id) out += `<script async src="https://www.googletagmanager.com/gtag/js?id=${escHtml(ga_id)}"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config',${jsonForScript(ga_id)});</script>`;
    if (pixel_id) out += `
  <script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init',${jsonForScript(pixel_id)});fbq('track','PageView');</script>`;
    return out;
  }

  /** Đọc file HTML, thay <title> bằng khối SEO, thêm <base> cho đường dẫn nhiều cấp */
  function render(req, res, file, meta, status = 200) {
    let html = fs.readFileSync(path.join(ROOT, file), 'utf8');
    const nested = req.path.split('/').filter(Boolean).length > 1;
    const head = (nested ? '<base href="/">\n  ' : '') + headTags(req, meta);
    html = html.replace(/<title>[\s\S]*?<\/title>/, head);
    res.status(status).type('html').send(html);
  }

  const organization = req => ({
    '@context': 'https://schema.org', '@type': 'Organization', name: S().seo.site_name, url: baseUrl(req) + '/',
    logo: abs(req, 'images/favicon.svg'), telephone: '1900 6868', email: 'sales@aurum.vn',
    address: { '@type': 'PostalAddress', streetAddress: '123 Nguyễn Huệ, Q.1', addressLocality: 'TP. Hồ Chí Minh', addressCountry: 'VN' },
    ...(S().facebook.page_url ? { sameAs: [S().facebook.page_url] } : {})
  });
  const breadcrumb = (req, items) => ({
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, p], i) => ({ '@type': 'ListItem', position: i + 1, name, item: abs(req, p) }))
  });

  /* ---------- Trang chủ ---------- */
  router.get(['/', '/index.html'], (req, res) => render(req, res, 'index.html', {
    path: '/', page: { type: 'home' },
    jsonld: [organization(req), {
      '@context': 'https://schema.org', '@type': 'WebSite', name: S().seo.site_name, url: baseUrl(req) + '/',
      potentialAction: { '@type': 'SearchAction', target: `${baseUrl(req)}/products.html?q={search_term_string}`, 'query-input': 'required name=search_term_string' }
    }]
  }));

  /* ---------- Danh sách sản phẩm / danh mục ---------- */
  router.get('/products.html', (req, res) => {
    const cat = req.query.cat && findCategory(req.query.cat);
    const suffix = S().seo.title_suffix;
    if (cat && cat.active) return render(req, res, 'products.html', {
      path: `/products.html?cat=${cat.id}`, page: { type: 'category', id: cat.id },
      title: `${cat.name} đồng phục – Mẫu đẹp, giá sỉ${suffix}`,
      description: `${cat.description} Xem ${liveProducts().filter(p => p.cate_id === cat.id).length} mẫu ${cat.name.toLowerCase()} tại AURUM: in thêu logo, giá sỉ từ 20 áo.`,
      keywords: `${cat.name.toLowerCase()} đồng phục, ${cat.name.toLowerCase()}, may đồng phục`,
      jsonld: [breadcrumb(req, [['Trang chủ', '/'], ['Sản phẩm', '/products.html'], [cat.name, `/products.html?cat=${cat.id}`]])]
    });
    render(req, res, 'products.html', {
      path: '/products.html', page: { type: 'products' }, noindex: !!(req.query.q || req.query.min || req.query.max),
      title: `Tất cả sản phẩm đồng phục${suffix}`,
      description: 'Danh sách áo polo, sơ mi, áo thun, áo khoác và đồng phục bảo hộ tại AURUM. Lọc theo danh mục, màu sắc, khoảng giá – đặt may số lượng lớn giá xưởng.'
    });
  });

  /* ---------- Chi tiết sản phẩm ---------- */
  router.get('/product-detail.html', (req, res, next) => {
    const p = db.t('products').find(x => x.id === Number(req.query.id));
    if (p?.slug) return res.redirect(301, productUrl(p));
    next();
  });
  router.get('/san-pham/:slug', (req, res) => {
    const p = liveProducts().find(x => x.slug === req.params.slug);
    if (!p) return render(req, res, 'product-detail.html', { noindex: true, title: 'Không tìm thấy sản phẩm' + S().seo.title_suffix, page: { type: 'product', id: null } }, 404);
    const cat = findCategory(p.cate_id);
    const vs = db.t('product_variants').filter(v => v.product_id === p.id && v.active);
    const prices = vs.map(v => v.price);
    const stock = vs.reduce((s, v) => s + v.quantity, 0);
    const ogImg = fileExists(`images/og/product-${p.id}.jpg`) ? `images/og/product-${p.id}.jpg` : p.image;
    render(req, res, 'product-detail.html', {
      path: productUrl(p), page: { type: 'product', id: p.id }, ogType: 'product',
      title: p.seo_title || p.name + S().seo.title_suffix,
      description: p.seo_description || p.detail, keywords: p.seo_keywords, image: ogImg, imageAlt: p.name,
      jsonld: [{
        '@context': 'https://schema.org', '@type': 'Product', name: p.name, sku: 'AU-' + String(p.id).padStart(4, '0'),
        image: [abs(req, p.image)], description: plain(p.detail), category: cat?.name, material: p.material,
        brand: { '@type': 'Brand', name: S().seo.site_name },
        offers: {
          '@type': 'AggregateOffer', priceCurrency: 'VND', lowPrice: prices.length ? Math.min(...prices) : 0,
          highPrice: prices.length ? Math.max(...prices) : 0, offerCount: vs.length,
          availability: stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', url: abs(req, productUrl(p))
        }
      }, breadcrumb(req, [['Trang chủ', '/'], [cat?.name || 'Sản phẩm', `/products.html?cat=${p.cate_id}`], [p.name, productUrl(p)]])]
    });
  });

  /* ---------- Tin tức ---------- */
  router.get(['/blog.html'], (_req, res) => res.redirect(301, '/tin-tuc'));
  router.get('/post.html', (req, res, next) => {
    const x = db.t('posts').find(p => p.id === Number(req.query.id));
    if (x) return res.redirect(301, postUrl(x));
    next();
  });
  router.get('/tin-tuc', (req, res) => render(req, res, 'blog.html', {
    path: '/tin-tuc', page: { type: 'blog' },
    title: `Tin tức & cẩm nang đồng phục${S().seo.title_suffix}`,
    description: 'Kinh nghiệm chọn áo đồng phục công ty, bảng size, cách in thêu logo, tiêu chuẩn đồng phục bảo hộ – chia sẻ từ xưởng may AURUM.',
    keywords: 'cẩm nang đồng phục, kinh nghiệm may đồng phục, tin tức đồng phục'
  }));
  router.get('/tin-tuc/:slug', (req, res) => {
    const x = livePosts().find(p => p.slug === req.params.slug);
    if (!x) return render(req, res, 'post.html', { noindex: true, title: 'Không tìm thấy bài viết' + S().seo.title_suffix, page: { type: 'post', id: null } }, 404);
    const ogImg = fileExists(`images/og/post-${x.id}.jpg`) ? `images/og/post-${x.id}.jpg` : x.image;
    render(req, res, 'post.html', {
      path: postUrl(x), page: { type: 'post', id: x.id }, ogType: 'article',
      title: x.seo_title || x.title + S().seo.title_suffix,
      description: x.seo_description || x.summary, keywords: x.seo_keywords, image: ogImg, imageAlt: x.title,
      jsonld: [{
        '@context': 'https://schema.org', '@type': 'BlogPosting', headline: x.title, description: x.summary,
        image: [abs(req, x.image)], datePublished: x.created_at, dateModified: x.updated_at || x.created_at,
        author: { '@type': 'Organization', name: x.author || S().seo.site_name },
        publisher: { '@type': 'Organization', name: S().seo.site_name, logo: { '@type': 'ImageObject', url: abs(req, 'images/favicon.svg') } },
        mainEntityOfPage: abs(req, postUrl(x))
      }, breadcrumb(req, [['Trang chủ', '/'], ['Tin tức', '/tin-tuc'], [x.title, postUrl(x)]])]
    });
  });

  /* ---------- Các trang còn lại (giỏ hàng, đăng nhập...) ---------- */
  router.get(/^\/([a-z-]+)\.html$/, (req, res, next) => {
    const file = req.params[0] + '.html';
    if (!fileExists(file)) return next();
    const titles = { 'cart.html': 'Giỏ hàng', 'checkout.html': 'Thanh toán', 'thank-you.html': 'Đặt hàng thành công', 'login.html': 'Đăng nhập', 'register.html': 'Đăng ký tài khoản' };
    render(req, res, file, { noindex: NOINDEX_PAGES.has(file), title: (titles[file] || S().seo.site_name) + S().seo.title_suffix, page: { type: req.params[0] } });
  });

  /* ---------- Trang quản trị: không cho Google lập chỉ mục ---------- */
  router.get(/^\/admin\/([a-z-]+)\.html$/, (req, res, next) => {
    const file = `admin/${req.params[0]}.html`;
    if (!fileExists(file)) return next();
    const html = fs.readFileSync(path.join(ROOT, file), 'utf8')
      .replace('<head>', '<head>\n  <meta name="robots" content="noindex, nofollow">\n  <script>window.__PAGE__={"type":"admin"}</script>');
    res.type('html').send(html);
  });

  /* ---------- robots.txt ---------- */
  router.get('/robots.txt', (req, res) => {
    const seo = S().seo;
    const lines = seo.allow_index
      ? ['User-agent: *', 'Allow: /', 'Disallow: /admin/', 'Disallow: /api/', ...[...NOINDEX_PAGES].map(f => `Disallow: /${f}`)]
      : ['User-agent: *', 'Disallow: /'];
    if (seo.robots_extra) lines.push('', seo.robots_extra.trim());
    lines.push('', `Sitemap: ${baseUrl(req)}/sitemap.xml`);
    res.type('text/plain').send(lines.join('\n') + '\n');
  });

  /* ---------- sitemap.xml ---------- */
  router.get('/sitemap.xml', (req, res) => {
    const latest = (list, key = 'created_at') => list.map(x => x.updated_at || x[key]).sort().pop() || new Date().toISOString().slice(0, 10);
    const urls = [
      { loc: '/', lastmod: latest(liveProducts()), freq: 'daily', pr: '1.0' },
      { loc: '/products.html', lastmod: latest(liveProducts()), freq: 'daily', pr: '0.9' },
      ...db.t('categories').filter(c => c.active).map(c => ({ loc: `/products.html?cat=${c.id}`, lastmod: latest(liveProducts().filter(p => p.cate_id === c.id)), freq: 'weekly', pr: '0.8' })),
      ...liveProducts().map(p => ({ loc: productUrl(p), lastmod: p.updated_at || p.created_at, freq: 'weekly', pr: '0.8', img: p.image, title: p.name })),
      { loc: '/tin-tuc', lastmod: latest(livePosts()), freq: 'weekly', pr: '0.7' },
      ...livePosts().map(x => ({ loc: postUrl(x), lastmod: x.updated_at || x.created_at, freq: 'monthly', pr: '0.6', img: x.image, title: x.title }))
    ];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.map(u => `  <url>
    <loc>${escXml(abs(req, u.loc))}</loc>
    <lastmod>${escXml(String(u.lastmod).slice(0, 10))}</lastmod>
    <changefreq>${u.freq}</changefreq>
    <priority>${u.pr}</priority>${u.img && fileExists(u.img) ? `
    <image:image><image:loc>${escXml(abs(req, u.img))}</image:loc><image:title>${escXml(u.title)}</image:title></image:image>` : ''}
  </url>`).join('\n')}
</urlset>`;
    res.type('application/xml').send(xml);
  });

  return router;
}
