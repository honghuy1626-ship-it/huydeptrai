# Huong Dan Them Bai SEO Cho Muc Kien Thuc

Tai lieu nay dung cho Codex va nguoi quan tri website ELLY khi can them bai SEO moi vao muc `kien-thuc`.

Khi nguoi dung noi: **"Them bai moi: [ten chu de]"**, hay lam theo dung quy trinh nay. Khong tao lai website, khong xoa file cu, khong doi giao dien chinh.

## Cau Truc Hien Tai

- Trang tong hop bai viet: `kien-thuc.html`
- Thu muc bai viet: `kien-thuc/`
- Template bai SEO: `kien-thuc/template-bai-viet-seo.html`
- Sitemap: `sitemap.xml`
- Robots: `robots.txt`
- CSS/JS dung chung: `style.css`, `script.js`

## Cach Dat Ten File Bai Viet

1. Dat file trong thu muc `kien-thuc/`.
2. Ten file viet thuong, khong dau, ngan gon, dung dau gach ngang.
3. Ket thuc bang `.html`.
4. Khong dung khoang trang, dau tieng Viet, ky tu dac biet.

Vi du:

```text
kien-thuc/phun-moi-bi-tham-lai-phai-lam-sao.html
kien-thuc/chon-mau-moi-cho-da-ngam.html
kien-thuc/chan-may-bi-lech-co-sua-duoc-khong.html
```

Khong dat ten trung voi file dang co. Khong doi ten cac file HTML cu.

## Cau Truc HTML Chuan Cho Bai SEO

Khi tao bai moi, copy tu:

```text
kien-thuc/template-bai-viet-seo.html
```

Sau do thay cac placeholder sau:

- `{{ARTICLE_TITLE}}`: tieu de bai viet.
- `{{ARTICLE_DESCRIPTION}}`: mo ta SEO 140-160 ky tu.
- `{{ARTICLE_KEYWORDS}}`: 3-6 tu khoa lien quan.
- `{{ARTICLE_SLUG}}`: ten file khong co `.html`.
- `{{ARTICLE_IMAGE}}`: anh dai dien, vi du `../assets/pricing-moi-1.jpg`.
- `{{ARTICLE_IMAGE_ABSOLUTE}}`: URL anh day du tren GitHub Pages.
- `{{ARTICLE_CATEGORY}}`: nhom chu de, vi du `Cham soc moi`, `Dang may`, `Phun xam tai nha`.
- `{{ARTICLE_PAIN_POINT}}`: noi dau hoac noi lo cua khach hang.
- `{{ARTICLE_INTRO}}`: doan mo dau ngan, danh vao van de khach dang tim.
- `{{DATE_PUBLISHED}}`: ngay dang, dinh dang `YYYY-MM-DD`.
- `{{DATE_MODIFIED}}`: ngay sua moi nhat, dinh dang `YYYY-MM-DD`.
- `{{SERVICE_NAME}}`: dich vu muon day CTA, vi du `Phun moi collagen`.
- `{{RELATED_LINKS}}`: danh sach link bai lien quan.

Moi bai can co:

- 1 the `<h1>` duy nhat.
- Cac muc `<h2>` de chia noi dung chinh.
- Neu can chia nho y trong muc, dung `<h3>`.
- FAQ cuoi bai bang cac cau hoi that cua khach.
- CTA dat lich cuoi bai.
- Link ve `../index.html` va `../kien-thuc.html`.
- Anh co `alt` ro rang, mo ta dung noi dung anh.

## Cach Cap Nhat `kien-thuc.html`

Sau khi tao file bai moi, them bai vao trang tong hop `kien-thuc.html` theo dung layout hien co.

Can them bai vao cac vi tri phu hop:

1. Neu bai rat quan trong, co the them vao `news-topline` hoac khu vuc bai noi bat.
2. Neu la bai thong thuong, them vao danh sach `.news-list` bang cau truc:

```html
<article class="news-row">
  <a class="news-thumb" href="kien-thuc/{{ARTICLE_SLUG}}.html">
    <img src="{{THUMB_IMAGE}}" alt="{{ARTICLE_TITLE}}" loading="lazy" />
  </a>
  <div>
    <span class="news-kicker">Tu van theo noi lo</span>
    <h2><a href="kien-thuc/{{ARTICLE_SLUG}}.html">{{ARTICLE_TITLE}}</a></h2>
    <p>{{ARTICLE_DESCRIPTION}}</p>
    <a class="read-more" href="kien-thuc/{{ARTICLE_SLUG}}.html">Doc bai tu van</a>
  </div>
</article>
```

Luu y:

- Duong dan tu `kien-thuc.html` den bai viet phai la `kien-thuc/ten-file.html`.
- Anh trong `kien-thuc.html` dung duong dan tu goc, vi du `assets/pricing-moi-1.jpg`.
- Khong them `template-bai-viet-seo.html` vao danh sach bai.

## Cach Cap Nhat `sitemap.xml`

Them 1 khoi URL moi vao `sitemap.xml`:

```xml
  <url>
    <loc>https://honghuy1626-ship-it.github.io/huydeptrai/kien-thuc/{{ARTICLE_SLUG}}.html</loc>
    <lastmod>{{DATE_MODIFIED}}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
```

Luu y:

- Khong them `kien-thuc/template-bai-viet-seo.html` vao sitemap.
- Template da co `noindex` va duoc chan trong `robots.txt`; khong xoa neu van can lam mau cho bai sau.
- Cap nhat `lastmod` cua `kien-thuc.html` neu trang tong hop co them link bai moi.
- Neu bai cu duoc sua noi dung, cap nhat `lastmod` cua bai do.

## Cach Them Bai Lien Quan

Moi bai can co 3-5 bai lien quan trong khoi:

```html
<div class="related-list">
  <a href="bai-lien-quan-1.html">Tieu de bai lien quan 1</a>
  <a href="bai-lien-quan-2.html">Tieu de bai lien quan 2</a>
  <a href="bai-lien-quan-3.html">Tieu de bai lien quan 3</a>
</div>
```

Quy tac chon bai lien quan:

- Bai ve moi lien ket voi bai ve mau moi, cham soc moi, moi tham, moi len mau.
- Bai ve may lien ket voi bai ve dang may, tan bot, dieu khac, cham soc chan may.
- Bai ve phun xam tai nha lien ket voi bai ve quy trinh, chuan bi, an toan, dat lich.
- Nen cap nhat nguoc lai 1-3 bai cu de tro link ve bai moi neu cung chu de.

## Checklist Truoc Khi Push GitHub

Truoc khi commit/push, kiem tra:

- File bai moi nam trong `kien-thuc/`.
- Ten file khong dau, khong khoang trang, khong trung file cu.
- Bai co title rieng.
- Bai co meta description rieng.
- Canonical dung URL cua bai.
- Open Graph day du: `og:title`, `og:description`, `og:type`, `og:url`, `og:image`.
- JSON-LD co `Article` va `BreadcrumbList`.
- Co breadcrumb hien thi, link ve trang chu va trang kien thuc.
- Co 1 H1, cac H2/H3 hop ly.
- Tat ca anh co `alt`.
- CTA dat lich dung `href="#booking"` va co `data-booking-open`.
- Co nut goi dien `tel:0786266268`.
- Co link Zalo `https://zalo.me/0786266268`.
- Co link Messenger `https://m.me/61555486805617`.
- `kien-thuc.html` co link den bai moi.
- `sitemap.xml` co URL bai moi.
- Khong dua template vao sitemap hoac danh sach bai.
- Chay kiem tra link noi bo, khong co link chet.
- Chay `git diff --check` truoc khi commit.

## Lenh Kiem Tra Nhanh

```powershell
git diff --check
git status --short
```

Neu can kiem tra link bang script, uu tien kiem tra cac thuoc tinh `href` va `src` trong file HTML, bo qua link bat dau bang `https:`, `tel:`, `mailto:`, `#`, `data:`.
