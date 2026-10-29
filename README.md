# AURUM Uniform – Website bán áo đồng phục

Bài **Assignment – Lập trình JavaScript nâng cao (WEB2064)**, mở rộng cho **ASM Final – SEO & Digital Marketing (WEB2053)**.
Website bán áo đồng phục công ty viết bằng **vanilla JavaScript (ES Modules)**, giao diện HTML + CSS thuần, làm việc với backend qua **REST API** (Fetch + async/await) và có thể deploy lên hosting.

- **5 danh mục, 20 sản phẩm, 4 bài viết** mẫu – có ảnh WebP và ảnh chia sẻ Facebook riêng.
- Admin có **Cấu hình SEO sản phẩm**, **SEO bài viết**, **Tối ưu SEO hệ thống** (GA4, Search Console, sitemap, robots) và **Cấu hình Facebook** (Fanpage, nút chia sẻ, Messenger, Pixel).

- Giao diện: đen ấm + vàng champagne, font Be Vietnam Pro + Playfair Display, responsive.
- Frontend **không** chứa dữ liệu giả: mọi dữ liệu (danh mục, sản phẩm, biến thể, đơn hàng, khách hàng, thống kê) đều lấy từ API.

---

## 1. Cách chạy trên localhost

### Bước 1 – Cài Node.js (chỉ làm một lần)
Tải bản **LTS** tại https://nodejs.org rồi cài như phần mềm bình thường.
Kiểm tra: mở Terminal / Command Prompt, gõ `node -v` → hiện `v18…` trở lên là được.

### Bước 2 – Chạy dự án
**Cách nhanh (Windows):** giải nén, mở thư mục `aurum-uniform`, bấm đúp **`start.bat`**.
Lần đầu nó tự cài thư viện (`npm install`), sau đó tự mở trình duyệt.

**Cách thủ công (mọi hệ điều hành / VS Code):** mở thư mục `aurum-uniform` trong VS Code → *Terminal → New Terminal*, gõ:

```bash
npm install      # chỉ cần lần đầu – tạo thư mục node_modules
npm start        # chạy server
```

Thấy dòng `AURUM Uniform đang chạy: http://localhost:3000` là thành công.
Mở trình duyệt: **http://localhost:3000** (giao diện) – trang quản trị: **http://localhost:3000/admin/dashboard.html** – API: `http://localhost:3000/api`.
Sitemap: **http://localhost:3000/sitemap.xml** – robots: **http://localhost:3000/robots.txt**.

Giữ cửa sổ Terminal mở trong lúc dùng web; muốn tắt server bấm `Ctrl + C`.
Khi sửa code server mà muốn tự khởi động lại: dùng `npm run dev` thay cho `npm start`.

> **Không** mở file `.html` bằng cách bấm đúp (đường dẫn `file:///…`) – trình duyệt chặn ES Modules. Luôn mở qua `http://localhost:3000`.
> Nếu thích dùng Live Server (cổng 5500…) vẫn được: code tự trỏ API về `http://localhost:3000`, nhưng phải `npm start` ở một cửa sổ khác.

### Lỗi thường gặp
| Lỗi | Cách xử lý |
|---|---|
| `'node' / 'npm' is not recognized` | Chưa cài Node.js, hoặc cài xong chưa mở lại Terminal / VS Code |
| `EADDRINUSE: address already in use :::3000` | Cổng 3000 đang bị chiếm (thường do server cũ chưa tắt). Tắt cửa sổ cũ, hoặc chạy cổng khác: `set PORT=4000 && npm start` (Windows CMD) / `PORT=4000 npm start` (macOS, Linux) |
| Trang báo *“Không kết nối được máy chủ API”* | Server chưa chạy – quay lại Bước 2 |
| `npm` báo lỗi khi chạy trong PowerShell (*running scripts is disabled*) | Dùng Command Prompt thay PowerShell, hoặc trong VS Code chọn Terminal loại *Command Prompt* |
| Dữ liệu bị rối sau khi thử nghiệm | `npm run seed` hoặc Admin → *Khôi phục dữ liệu mẫu* |
| Ảnh sản phẩm hiện hình áo minh hoạ | Bình thường – chưa có file ảnh. Xem `images/products/HUONG-DAN-ANH.txt` |

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Quản trị | `admin@aurum.vn` | `admin123` |
| Khách hàng | `khach@aurum.vn` | `123456` |

Mã giảm giá thử: `WELCOME` (giảm 5%, tối đa 100.000₫), `AURUM50K` (giảm 50.000₫ cho đơn từ 1.000.000₫).

Tạo lại dữ liệu mẫu: `npm run seed` (hoặc Admin → *Khôi phục dữ liệu mẫu*).

---

## 2. Tính năng (Y2)

### Khách hàng (Member)
| Yêu cầu | Thực hiện |
|---|---|
| Xem danh sách sản phẩm | Trang `products.html`: phân trang, sắp xếp (bán chạy, mới nhất, giá tăng/giảm, tên), hiện giá “Từ …” khi các size có giá khác nhau |
| Xem sản phẩm theo danh mục | Lọc theo danh mục (sidebar, menu “Sản phẩm”, trang chủ), có đếm số mẫu từng danh mục |
| Lọc theo khoảng giá | 3 mức chọn nhanh **và** ô nhập tay *Từ – Đến* (kiểm tra “từ ≤ đến”); lọc ở phía API (`min_price`, `max_price`) |
| Đăng ký | Kiểm tra dữ liệu cả client lẫn server, báo trùng email, mật khẩu băm bằng scrypt |
| Đăng nhập | Token ký HMAC lưu `localStorage`, quản trị viên được chuyển vào Dashboard |
| Thêm sản phẩm vào giỏ | Chọn **màu × size** (biến thể có giá và tồn kho riêng; size hết hàng bị khoá), tuỳ chọn in/thêu logo, giá sỉ theo số lượng |
| Giỏ hàng | Đổi số lượng, xoá, cảnh báo quá tồn kho, thanh tiến độ miễn phí vận chuyển |
| Thanh toán giỏ hàng | Form kiểm tra dữ liệu, mã giảm giá, 3 phương thức thanh toán, xuất hoá đơn VAT. Server tính lại giá, kiểm tra và **trừ tồn kho** |
| Màn hình cảm ơn | `thank-you.html` hiển thị mã đơn, thông tin giao hàng, chi tiết, hướng dẫn chuyển khoản, in đơn |

Ngoài ra: tìm kiếm không dấu, lọc theo màu / còn hàng / giảm giá, bảng size, sản phẩm liên quan, hộp thoại xác nhận, thông báo toast.

### Trang quản trị (`/admin`)
| Yêu cầu | Thực hiện |
|---|---|
| Quản lý danh mục | Thêm / sửa / ẩn-hiện / **xoá** (chặn xoá khi còn sản phẩm hoặc danh mục con), hỗ trợ danh mục cha (`parent_id`) |
| Quản lý sản phẩm | Thêm / sửa / **xoá**, quản lý **biến thể Màu × Size** (tạo hàng loạt, sửa giá, tồn kho từng biến thể), **tải ảnh lên và tự nén sang WebP** |
| Quản lý khách hàng | Thêm / sửa / khoá-mở khoá / xoá (khách đã có đơn thì tự khoá thay vì xoá), xem đơn hàng của từng khách |
| Quản lý đơn hàng | Lọc theo trạng thái, thanh toán, ngày; xem chi tiết; đổi trạng thái (huỷ đơn **hoàn tồn kho**, mở lại đơn **trừ tồn kho**); xoá đơn đã huỷ; in đơn |
| Thống kê – số lượng sản phẩm được đặt mua | Tổng số áo bán, top 5 bán chạy, biểu đồ donut theo danh mục |
| Thống kê – doanh thu | Doanh thu theo kỳ (tất cả / tháng này / 30 ngày / năm nay), biểu đồ cột 6 tháng |
| Thống kê – hàng tồn | Tổng tồn, số mẫu hết / sắp hết hàng, bảng tồn theo sản phẩm kèm số biến thể hết hàng |

### SEO & Marketing (WEB2053) – trong trang quản trị, nhóm *SEO & Marketing*
| Yêu cầu | Ở đâu | Thực hiện |
|---|---|---|
| Cấu hình SEO của sản phẩm | *Quản lý sản phẩm* → nút **SEO** (hoặc ô điểm SEO) | Từ khoá chính, tiêu đề SEO, đường dẫn (slug), meta description, từ khoá meta; **xem trước kết quả Google**; **chấm điểm SEO** 9 tiêu chí (giống Yoast / RankMath) |
| Cấu hình SEO của bài viết | *Bài viết & SEO bài viết* → **SEO** / **Sửa** | Soạn bài (có xem trước), ảnh đại diện, thẻ + khung SEO như sản phẩm (10 tiêu chí, có kiểm tra liên kết nội bộ, độ dài ≥ 300 từ) |
| Tối ưu SEO của hệ thống | *Tối ưu SEO hệ thống* | Tiêu đề / mô tả trang chủ, địa chỉ website, ảnh Open Graph, bật/tắt index, robots.txt, **mã GA4**, **mã xác minh Search Console**, danh sách kiểm tra hệ thống, điểm SEO từng trang, liên kết công cụ (PageSpeed, Rich Results, Sharing Debugger) |
| Cấu hình chức năng Facebook | *Cấu hình Facebook* | Địa chỉ Fanpage, nhúng **Page Plugin** ở chân trang, nút **Chia sẻ** (Facebook/Zalo/sao chép link), nút nổi **Messenger** (m.me), **Meta Pixel**, App ID; xem trước thẻ chia sẻ |

Những gì server tự làm cho SEO (`server/seo.js`):
- Chèn `<title>`, `meta description`, `keywords`, `canonical`, `robots`, **Open Graph**, **JSON-LD** (Organization, WebSite, Product, BlogPosting, BreadcrumbList) vào từng trang **ngay trên server** – Google và Facebook đọc được mà không cần chạy JavaScript.
- Đường dẫn thân thiện: `/san-pham/<slug>`, `/tin-tuc`, `/tin-tuc/<slug>` (link cũ `product-detail.html?id=` tự chuyển hướng 301).
- `/sitemap.xml` (kèm ảnh) và `/robots.txt` sinh tự động; trang giỏ hàng, đăng nhập, admin gắn `noindex`.
- Khi admin nhập mã: chèn **Google Analytics 4** và **Meta Pixel**; website gửi sự kiện xem sản phẩm, thêm giỏ, mua hàng, tìm kiếm, chia sẻ (`js/core/track.js`).

> Meta đã ngừng nút Like / Comment cho website bên ngoài (10/02/2026) và plugin chat Messenger (2024), nên website dùng Page Plugin, nút Chia sẻ, link m.me và Pixel.

---

## 3. Tổ chức mã (Y3)

```
aurum-uniform/
├── index.html, products.html, product-detail.html, cart.html,
│   checkout.html, thank-you.html, login.html, register.html,
│   blog.html (tin tức), post.html (chi tiết bài viết)          ← trang khách hàng
├── admin/                       ← trang quản trị (dashboard, categories, products, customers, orders,
│                                   posts, seo, facebook) – seo-box.js: khung cấu hình SEO dùng chung
│   └── js/                      ← module riêng từng trang admin + admin.js (khung dùng chung)
├── styles/                      ← CSS: style.css (người dùng), admin.css (quản trị)
├── images/
│   ├── favicon.svg
│   ├── products/                ← ảnh sản phẩm (WebP) – xem HUONG-DAN-ANH.txt
│   ├── posts/                   ← ảnh bài viết (WebP)
│   ├── og/                      ← ảnh chia sẻ Facebook 1200×630 cho từng sản phẩm / bài viết
│   └── og-default.jpg           ← ảnh chia sẻ mặc định
├── js/
│   ├── core/                    ← lõi dùng chung
│   │   ├── api.js               ← ApiClient + Resource (fetch / async-await)
│   │   ├── pricing.js           ← giá sỉ, phí in, vận chuyển, mã giảm giá (DÙNG CHUNG client + server)
│   │   ├── models.js            ← class Product (màu, size, biến thể, giá, tồn kho)
│   │   ├── session.js           ← class Auth
│   │   ├── cart.js              ← class Cart
│   │   ├── links.js             ← đường dẫn thân thiện /san-pham/..., /tin-tuc/...
│   │   ├── seo-check.js         ← chấm điểm SEO (dùng ở admin)
│   │   ├── track.js             ← gửi sự kiện tới GA4 / Meta Pixel
│   │   └── catalog.js, config.js, env.js, utils.js
│   ├── ui/                      ← feedback.js (toast, modal, confirm), image.js, layout.js,
│   │                               posts.js (thẻ bài viết), rich.js (hiển thị nội dung bài)
│   └── pages/                   ← mỗi trang một module (home.js, products.js, …)
└── server/
    ├── server.js                ← REST API Node.js + Express
    ├── seo.js                   ← meta SEO, Open Graph, JSON-LD, sitemap.xml, robots.txt, GA4, Pixel
    ├── seed.js                  ← dữ liệu mẫu (sản phẩm, đơn hàng, tài khoản)
    ├── seed-content.js          ← bài viết mẫu + cấu hình SEO / Facebook mặc định
    ├── security.js              ← băm mật khẩu, token
    └── db.json                  ← cơ sở dữ liệu (JSON)
```

- **File đặt đúng thư mục**: hình ảnh trong `images/`, CSS trong `styles/`, JavaScript chia module trong `js/`.
- **Hình ảnh tối ưu**: dùng định dạng **WebP**; ảnh tải lên từ Admin được nén ở trình duyệt (cạnh dài ≤ 900px, chất lượng 82%) và server giới hạn ≤ 2MB; ảnh có `width/height`, `loading="lazy"`, `decoding="async"`, `object-fit: cover` nên **không vỡ hình**; khi chưa có file ảnh, trang tự hiển thị hình áo SVG thay thế.
- **JavaScript hiện đại (ES6+)**: `import/export` (ES Modules), `class` (kể cả trường private `#`), arrow function, destructuring, spread/rest, template literal, optional chaining `?.`, nullish `??`, `async/await`, `Promise.all`, top-level await, `Map/Set`.

---

## 4. Thiết kế cơ sở dữ liệu & API (Y1, Y4)

### Bảng dữ liệu (`server/db.json`)
| Bảng | Các trường |
|---|---|
| `categories` | `id`, `name`, `parent_id`, `slug`, `description`, `active` |
| `products` | `id`, `name`, `cate_id`, `detail`, `image`, `material`, `old_price`, `featured`, `active`, `created_at` |
| `product_variants` | `id`, `product_id`, `variant_name`, `color`, `color_hex`, `size`, `price`, `quantity`, `image`, `active` |
| `orders` | `id`, `code`, `user_id`, `created_date`, `status`, `payment`, `customer{}`, `subtotal`, `discount`, `print_fee`, `shipping`, `total_qty`, `coupon`, `total` |
| `order_details` | `id`, `order_id`, `product_id`, `variant_id`, `product_name`, `variant_name`, `color`, `size`, `image`, `quantity`, `unit_price`, `print` |
| `users` | `id`, `name`, `email`, `phone`, `address`, `password` (đã băm), `role`, `active`, `created_at` |
| `posts` | `id`, `title`, `slug`, `summary`, `content`, `image`, `tags`, `author`, `active`, `created_at`, `updated_at` + các trường SEO |
| `settings` | `seo{ site_name, site_url, home_title, home_description, home_keywords, title_suffix, og_image, allow_index, robots_extra, ga_id, gsc_verification }`, `facebook{ page_url, page_name, app_id, pixel_id, messenger_username, show_page_plugin, show_share, show_messenger }` |

Sản phẩm và bài viết có thêm các trường SEO: `slug`, `focus_keyword`, `seo_title`, `seo_description`, `seo_keywords`.

### Các resource API (`/api`)
| Resource | Quyền | Ghi chú |
|---|---|---|
| `GET /categories`, `/categories/:id` | công khai | `POST/PUT/PATCH/DELETE`: admin |
| `GET /products` | công khai | Tham số: `cate_id`, `min_price`, `max_price`, `color`, `in_stock`, `on_sale`, `q`, `featured`, `_sort`, `_page`, `_limit`; trả header `X-Total-Count`. Mỗi sản phẩm kèm `variants`, `min_price`, `stock`, `sold` |
| `POST/PUT/DELETE /products` | admin | Gửi kèm mảng `variants` để đồng bộ biến thể trong một lần |
| `/product_variants` | đọc công khai, ghi admin | Lọc `?product_id=`, `?id=` |
| `POST /auth/register`, `/auth/login`, `GET /auth/me` | công khai / đã đăng nhập | |
| `POST /orders` | công khai | Đặt hàng: server tính lại giá, kiểm tra và trừ tồn kho |
| `GET /orders/mine`, `GET /orders/lookup?code=&phone=` | đã đăng nhập / công khai | |
| `GET /orders`, `PATCH /orders/:id/status`, `DELETE /orders/:id` | admin | Huỷ đơn hoàn tồn kho |
| `/users` | admin | Khách đã có đơn → khoá thay vì xoá |
| `GET /stats?period=all\|month\|30\|year` | admin | Doanh thu, số lượng bán, hàng tồn, top sản phẩm… |
| `POST /upload` | admin | Nhận ảnh WebP/PNG/JPEG (base64) lưu vào `images/products/`, `images/posts/` hoặc `images/og/` |
| `GET /posts`, `/posts/:id` | công khai | `POST/PUT/PATCH/DELETE`: admin |
| `GET /settings/public` | công khai | Thông tin Facebook cho giao diện |
| `GET /settings`, `PUT /settings/seo`, `PUT /settings/facebook` | admin | Cấu hình SEO hệ thống, Facebook |

### Thư viện sử dụng
| Thư viện | Dùng để |
|---|---|
| **express** | Dựng REST API và phục vụ file tĩnh |
| **cors** | Cho phép giao diện (khác cổng/tên miền) gọi API |
| Node.js built-in (`fs`, `crypto`, `path`) | Lưu `db.json`, băm mật khẩu (scrypt), ký token (HMAC-SHA256) |
| Google Fonts (Be Vietnam Pro, Playfair Display) | Phông chữ |

Phía trình duyệt **không dùng framework hay thư viện JS nào** (vanilla JavaScript); biểu đồ Dashboard vẽ bằng Canvas.

---

## 5. Deploy lên hosting

**Cách A – Một dịch vụ (đơn giản nhất): Render / Railway / host Node.js bất kỳ**
1. Đẩy mã lên GitHub.
2. Render → *New Web Service* → chọn repo (hoặc dùng sẵn `render.yaml`).
3. Build: `npm install` – Start: `npm start`. Đặt biến môi trường `JWT_SECRET` (chuỗi bí mật bất kỳ).
   Để mã SEO **không bị mất khi server khởi động lại**, khai báo thêm (tab *Environment*): `SITE_URL`, `GA_ID`, `GSC_VERIFICATION`, `FB_PAGE_URL`, `MESSENGER_USERNAME` (tuỳ chọn `FB_PIXEL_ID`, `FB_APP_ID`).
4. Truy cập địa chỉ Render cấp – giao diện và API cùng một tên miền, không cần cấu hình thêm.

**Cách B – Tách giao diện (Netlify / Vercel / GitHub Pages) và API (Render)**
1. Deploy API như Cách A.
2. Mở `js/core/env.js`, điền `export const API_URL = 'https://<ten-app>.onrender.com';` rồi deploy thư mục dự án lên Netlify/Vercel/GitHub Pages.

> Gói miễn phí của Render không giữ file khi khởi động lại, nên `db.json` sẽ trở về dữ liệu mẫu. Muốn lưu lâu dài, dùng ổ đĩa bền vững (Render Disk + biến môi trường `DB_FILE`) hoặc chuyển sang cơ sở dữ liệu thật.

### Đẩy mã lên GitHub
```bash
git init
git add .
git commit -m "AURUM Uniform – assignment JavaScript nâng cao"
git branch -M main
git remote add origin https://github.com/<tai-khoan>/aurum-uniform.git
git push -u origin main
```

---

## 6. Bảo mật & kiểm tra dữ liệu
- Mật khẩu băm **scrypt** + salt; token đăng nhập ký **HMAC-SHA256**, hết hạn sau 7 ngày.
- Phân quyền ở server: khách không gọi được API quản trị; khách chỉ xem được đơn của mình.
- Giá và tồn kho luôn do **server** tính lại khi đặt hàng – không tin dữ liệu từ trình duyệt.
- Chống XSS: mọi dữ liệu hiển thị qua hàm `esc()`.
- Kiểm tra form ở cả client và server (email, số điện thoại 10–11 số bắt đầu bằng 0, MST 10/13 số…).
