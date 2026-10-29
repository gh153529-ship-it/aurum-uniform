/* =========================================================
   AURUM UNIFORM – Dữ liệu mẫu: bài viết (tin tức) + cài đặt SEO / Facebook
   Nội dung bài viết viết theo cú pháp gọn:
     ## Tiêu đề phụ      - gạch đầu dòng      **in đậm**      [chữ](đường-dẫn)
   Liên kết (product:ID) được đổi thành đường dẫn sản phẩm thật khi tạo dữ liệu mẫu.
   ========================================================= */

export const POSTS = [
  {
    id: 1,
    title: 'Cách chọn áo polo đồng phục công ty đẹp, bền và đúng ngân sách',
    slug: 'cach-chon-ao-polo-dong-phuc-cong-ty',
    seo_title: 'Cách chọn áo polo đồng phục công ty đẹp, bền',
    focus_keyword: 'áo polo đồng phục công ty',
    tags: 'áo polo, đồng phục công ty, kinh nghiệm',
    image: 'images/posts/post-1.webp',
    created_at: '2026-09-02',
    summary: 'Áo polo đồng phục công ty là lựa chọn phổ biến nhất vì lịch sự mà vẫn thoải mái. Bài viết hướng dẫn chọn chất vải, màu sắc, form áo và cách tính ngân sách khi đặt may số lượng lớn.',
    content: `Áo polo đồng phục công ty là lựa chọn được nhiều doanh nghiệp ưu tiên nhất hiện nay: đủ lịch sự để tiếp khách, đủ thoải mái để mặc cả ngày. Tuy vậy, chọn sai chất vải hoặc màu sắc sẽ khiến áo nhanh xuống màu, mất form chỉ sau vài tháng. Dưới đây là 4 bước AURUM thường tư vấn cho khách hàng.

## 1. Chọn chất vải theo môi trường làm việc
- **Cotton cá sấu 65/35**: thấm hút tốt, ít nhăn, giữ form – phù hợp văn phòng, showroom.
- **Polyester Coolmax**: nhẹ, khô nhanh – phù hợp nhân viên kỹ thuật, giao hàng, làm việc ngoài trời.
- **Cá sấu pha spandex**: co giãn, tôn dáng – phù hợp spa, cửa hàng mỹ phẩm.

## 2. Chọn màu theo nhận diện thương hiệu
Màu áo nên lấy từ màu chủ đạo trong logo. Màu tối (đen, navy) dễ phối và ít lộ vết bẩn; màu sáng (trắng, be) tạo cảm giác sạch sẽ, thân thiện. Có thể phối viền cổ và tay áo bằng màu phụ để tạo điểm nhấn như mẫu [Polo Phối Viền Gold](product:2).

## 3. Chọn form áo cho nam và nữ
Nên đặt riêng form nữ (ôm nhẹ, eo thon) thay vì dùng chung form nam. Tham khảo mẫu [Polo Nữ Form Ôm Eva](product:13) dành riêng cho nhân viên nữ.

## 4. Tính ngân sách đặt may
Giá áo polo đồng phục phụ thuộc vào số lượng, chất vải và kiểu in thêu. Với AURUM, đơn từ 20 áo đã được giảm giá sỉ, từ 100 áo giảm đến 15%. Mẫu bán chạy nhất là [Polo Aurum Classic](product:1) – giá chỉ từ 165.000₫/áo.

**Gợi ý:** hãy đặt 1–2 áo mẫu để kiểm tra chất vải và size trước khi may số lượng lớn. Xem toàn bộ [áo polo đồng phục](/products.html?cat=1) tại AURUM.`
  },
  {
    id: 2,
    title: 'Bảng size áo đồng phục chuẩn và cách đo size cho cả công ty',
    slug: 'bang-size-ao-dong-phuc-chuan',
    focus_keyword: 'bảng size áo đồng phục',
    tags: 'bảng size, đo size, đồng phục',
    image: 'images/posts/post-2.webp',
    created_at: '2026-09-16',
    summary: 'Bảng size áo đồng phục chuẩn theo chiều cao, cân nặng và cách tổ chức đo size cho hàng trăm nhân viên mà không bị nhầm lẫn khi đặt may.',
    content: `Đặt sai size là lỗi phổ biến nhất khi may đồng phục số lượng lớn. Một bảng size áo đồng phục rõ ràng và quy trình thu thập size khoa học sẽ giúp doanh nghiệp tiết kiệm thời gian đổi trả.

## Bảng size áo polo, áo thun (theo chiều cao – cân nặng)
- **Size S**: cao 150–160 cm, nặng 45–52 kg
- **Size M**: cao 160–165 cm, nặng 52–60 kg
- **Size L**: cao 165–172 cm, nặng 60–68 kg
- **Size XL**: cao 170–177 cm, nặng 68–76 kg
- **Size XXL**: cao 175–185 cm, nặng 76–88 kg

## Bảng size áo sơ mi (theo vòng cổ)
Áo sơ mi nên chọn theo số đo vòng cổ (38 – 43). Ví dụ người cao 165–172 cm, nặng 62–68 kg thường mặc size 40. Tham khảo [Sơ Mi Oxford Nam](product:4) có đủ size 38 đến 43.

## Cách thu thập size cho cả công ty
- Gửi biểu mẫu online cho nhân viên điền chiều cao, cân nặng và size thường mặc.
- Đặt 1 bộ áo mẫu đủ size để nhân viên mặc thử.
- Nếu một người ở giữa hai size, nên chọn size lớn hơn.
- Đặt dư 3–5% số lượng để dự phòng nhân viên mới.

## Câu hỏi thường gặp về bảng size áo đồng phục
- **Nhân viên nữ có nên dùng chung bảng size với nam?** Không nên. Áo nữ thường ngắn hơn và hẹp vai hơn khoảng 2–3 cm, vì vậy hãy tách riêng danh sách size nam và nữ.
- **Người có vòng bụng lớn nên chọn size thế nào?** Nên tăng một size so với bảng chiều cao – cân nặng, hoặc đặt may riêng size lớn như 3XL.
- **Áo có bị co sau khi giặt không?** Vải cotton có thể co khoảng 2–3% sau vài lần giặt đầu, vì vậy với áo thun cotton 100% nên chọn rộng hơn một chút.

**Mẹo:** với đơn từ 20 áo, AURUM hỗ trợ gửi áo mẫu thử size tận nơi miễn phí. Xem [tất cả sản phẩm](/products.html) để chọn mẫu phù hợp.`
  },
  {
    id: 3,
    title: 'In hay thêu logo lên áo đồng phục: nên chọn cách nào?',
    slug: 'in-theu-logo-ao-dong-phuc',
    seo_title: 'In thêu logo áo đồng phục: nên in hay thêu?',
    focus_keyword: 'in thêu logo áo đồng phục',
    tags: 'in logo, thêu logo, đồng phục',
    image: 'images/posts/post-3.webp',
    created_at: '2026-10-01',
    summary: 'So sánh in lụa, in chuyển nhiệt và thêu vi tính khi in thêu logo áo đồng phục: độ bền, chi phí, thời gian sản xuất và loại áo phù hợp.',
    content: `Logo là phần quan trọng nhất trên áo đồng phục. Mỗi cách in thêu logo áo đồng phục có ưu – nhược điểm riêng, phụ thuộc vào chất vải, số lượng và ngân sách.

## Thêu vi tính
- **Ưu điểm**: sang trọng, bền gần như vĩnh viễn, không bong tróc.
- **Nhược điểm**: khó thể hiện chi tiết nhỏ, chi phí cao hơn in.
- **Phù hợp**: áo polo, sơ mi, [Blazer Aurum Signature](product:7).

## In lụa
- **Ưu điểm**: màu tươi, giá rẻ khi in số lượng lớn.
- **Nhược điểm**: mỗi màu cần một khuôn in, không hợp logo nhiều màu.
- **Phù hợp**: [áo thun team building](product:10), áo sự kiện.

## In chuyển nhiệt / in decal
- **Ưu điểm**: in được hình nhiều màu, làm nhanh với số lượng ít.
- **Nhược điểm**: độ bền thấp hơn nếu giặt máy ở nhiệt độ cao.
- **Phù hợp**: áo thun, áo khoác gió, áo bảo hộ.

## Những lưu ý khi in thêu logo áo đồng phục
- Gửi file logo dạng vector (AI, PDF, SVG) để hình in sắc nét, không bị vỡ nét.
- Logo thêu nên có chiều ngang từ 7 đến 9 cm ở ngực trái; logo in sau lưng có thể rộng 25–30 cm.
- Với vải mỏng màu sáng, tránh in mảng màu quá lớn vì dễ bí và nặng áo.
- Luôn yêu cầu xưởng gửi ảnh mẫu thêu hoặc in thử trước khi sản xuất hàng loạt.

## Bảng tóm tắt lựa chọn
Áo văn phòng nên thêu để tạo cảm giác cao cấp; áo sự kiện nên in lụa để tiết kiệm; áo bảo hộ nên in decal phản quang để tăng an toàn.

AURUM nhận in thêu logo trọn gói chỉ từ 15.000₫/áo. Xem [bảng giá sỉ](/index.html#bang-gia-si) để biết mức chiết khấu theo số lượng.`
  },
  {
    id: 4,
    title: 'Áo bảo hộ lao động: 5 tiêu chuẩn doanh nghiệp cần biết',
    slug: 'tieu-chuan-ao-bao-ho-lao-dong',
    focus_keyword: 'áo bảo hộ lao động',
    tags: 'bảo hộ lao động, phản quang, công trình',
    image: 'images/posts/post-4.webp',
    created_at: '2026-10-20',
    summary: 'Áo bảo hộ lao động cần đáp ứng tiêu chuẩn về chất vải, độ nhận diện, đường may và sự thoải mái. Tìm hiểu 5 tiêu chí để chọn đồng phục bảo hộ an toàn cho công nhân.',
    content: `Áo bảo hộ lao động không chỉ là đồng phục mà còn là thiết bị bảo vệ người lao động. Khi đặt may, doanh nghiệp nên kiểm tra 5 tiêu chuẩn dưới đây.

## 1. Chất vải bền, chống xé rách
Vải kaki 65/35 hoặc kaki Thành Công dày là lựa chọn phổ biến vì chịu ma sát tốt, ít bám bụi. Tham khảo [Bộ Quần Áo Bảo Hộ Kaki](product:19).

## 2. Độ nhận diện cao với dải phản quang
Người làm việc ở công trường, đường giao thông hoặc kho bãi ban đêm cần áo có dải phản quang tối thiểu 5 cm. Mẫu [Áo Bảo Hộ Phản Quang](product:17) dùng màu cam và vàng chanh dễ nhận biết từ xa.

## 3. Đường may chắc chắn
Đường may 3 kim ở vai, nách và đáy quần giúp áo không bung chỉ khi vận động mạnh.

## 4. Thoáng khí, thấm mồ hôi
Trong khí hậu nóng ẩm, áo cần có lưới thoáng khí ở lưng hoặc nách. Với môi trường trong nhà, có thể dùng [Thun Bảo Hộ Cotton Dày](product:20).

## 5. Thiết kế tiện dụng
Túi hộp có nắp, chỗ gắn thẻ tên, bút và bộ đàm giúp công việc thuận tiện hơn – như mẫu [Áo Kỹ Sư Công Trình](product:18).

## Kinh nghiệm đặt may áo bảo hộ lao động số lượng lớn
Doanh nghiệp nên chia đồng phục bảo hộ theo từng bộ phận: công nhân trực tiếp sản xuất dùng bộ kaki dày, kỹ sư và giám sát dùng áo kỹ sư có túi hộp, nhân viên kho và giao nhận dùng áo thun bảo hộ thoáng mát. In tên công ty và mã bộ phận ở sau lưng giúp quản lý nhân sự dễ dàng hơn. Ngoài ra, nên chuẩn bị mỗi người hai bộ để thay giặt hằng ngày, giúp áo bền màu và giữ vệ sinh lao động.

Xem toàn bộ [đồng phục bảo hộ](/products.html?cat=5) tại AURUM – nhận in logo và tên công ty theo yêu cầu.`
  }
];

export const DEFAULT_SETTINGS = {
  seo: {
    site_name: 'AURUM Uniform',
    site_url: '',
    home_title: 'AURUM Uniform – Xưởng may đồng phục công ty, áo polo, sơ mi giá sỉ',
    home_description: 'Xưởng may đồng phục công ty AURUM: áo polo, sơ mi, áo thun, áo khoác, đồng phục bảo hộ. In thêu logo trọn gói, giá sỉ từ 20 áo, giao toàn quốc.',
    home_keywords: 'đồng phục công ty, áo polo đồng phục, may đồng phục, áo thun đồng phục, đồng phục bảo hộ',
    title_suffix: ' | AURUM Uniform',
    og_image: 'images/og-default.jpg',
    allow_index: true,
    robots_extra: '',
    ga_id: '',
    gsc_verification: ''
  },
  facebook: {
    page_url: '',
    page_name: 'AURUM Uniform',
    app_id: '',
    pixel_id: '',
    messenger_username: '',
    show_page_plugin: true,
    show_share: true,
    show_messenger: true
  }
};
