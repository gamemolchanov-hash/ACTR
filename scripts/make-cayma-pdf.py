# -*- coding: utf-8 -*-
"""Cayma Bildirim Formu (KK-TK-CBF-2026-V1) → печатный PDF-бланк.

Канонический сборочный скрипт для public/legal/cayma-bildirim-formu.pdf
(держим рецепт под контролем версий рядом с артефактом — иначе кегль/текст
PDF и его исходник молча расходятся). Требует weasyprint:

    pip install weasyprint && python scripts/make-cayma-pdf.py

Текст канона переносится дословно; docx-экранирование (\\+, \\_) снято,
подчёркивания-заполнители заменены на линии бланка. Кегль основного текста
и пояснений — 12pt (регуляторный минимум для юр-документов, FBG-415)."""
import os

from weasyprint import HTML

# Пишем прямо в витрину: репозиторный public/legal рядом со скриптом.
OUT = os.path.normpath(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "legal", "cayma-bildirim-formu.pdf")
)

CSS = """
@page { size: A4; margin: 18mm 16mm 16mm 16mm;
  @bottom-center { content: "KK-TK-CBF-2026-V1 · Sürüm 1.0 / 20.07.2026 · " counter(page) " / " counter(pages);
                   font-family: "DejaVu Sans"; font-size: 7.5pt; color: #7a7a7a; } }
body { font-family: "DejaVu Sans", sans-serif; font-size: 12pt; line-height: 1.5; color: #1a1a1a; }
.brand { font-size: 13pt; font-weight: bold; letter-spacing: 2px; text-align: center; }
.doctitle { font-size: 15pt; font-weight: bold; text-align: center; margin: 4px 0 14px; }
table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
td { border: 0.6pt solid #b9b9b9; padding: 5px 7px; vertical-align: top; }
td.k { width: 34%; font-weight: bold; background: #f4f4f4; }
.note { border: 0.8pt solid #1a1a1a; background: #fafafa; padding: 8px 10px; margin: 0 0 16px; font-size: 12pt; }
.note b { display: block; margin-bottom: 3px; }
h2 { font-size: 13pt; margin: 16px 0 7px; padding-bottom: 3px; border-bottom: 0.8pt solid #1a1a1a; }
.field { margin: 0 0 11px; }
.field .lbl { font-weight: bold; }
.rule { border-bottom: 0.6pt solid #6a6a6a; height: 13px; margin-top: 3px; }
.decl { font-weight: bold; margin: 6px 0 14px; }
ul { padding-left: 0; list-style: none; margin: 0; }
li { margin-bottom: 7px; padding-left: 12px; text-indent: -12px; }
"""

HEAD = [
    ("Belge Sahibi", "KIZIL KALİNA KOZMETİK ÜRÜNLERİ TİCARET İTHALAT VE İHRACAT LİMİTED ŞİRKETİ"),
    ("İnternet Sitesi", "https://american-creator.tr/"),
    ("Doküman Kodu", "KK-TK-CBF-2026-V1"),
    ("Sürüm / Tarih", "1.0 / 20.07.2026"),
    ("Belge Sınıfı", "KAMUYA AÇIK"),
]

MUHATAP = [
    ("Satıcı", "KIZIL KALİNA KOZMETİK ÜRÜNLERİ TİCARET İTHALAT VE İHRACAT LİMİTED ŞİRKETİ"),
    ("Adres", "Oba Mahallesi 225 Sokak Summer Park Sitesi B Blok No: 8B, İç Kapı No: 20, 07460 Alanya / Antalya, Türkiye"),
    ("E-posta", "info@american-creator.tr"),
    ("Telefon", "+90 531 871 30 07"),
    ("Fiziksel Ürün İade Adresi", "NİKAR GIDA TEKSTİL DIŞ TİCARET LİMİTED ŞİRKETİ — Ziya Gökalp Mahallesi, "
                                  "Süleyman Demirel Bulvarı, The Office No: 7/E, Kapı No: D:136, İstanbul, Türkiye"),
]

FIELDS = [
    "Tüketicinin Adı Soyadı:", "Adres:", "Telefon:", "E-posta:", "Sipariş Numarası:",
    "Sipariş Tarihi:", "Teslim Tarihi:", "Cayma Hakkının Kullanıldığı Ürün(ler):",
    "Cayma Hakkının Kullanıldığı Ürün(ler)in Toplam Bedeli:",
]

REMINDERS = [
    "• Cayma bildirimi teslim tarihinden itibaren on dört gün içinde yapılmalıdır; teslimden önce de cayma mümkündür.",
    "• Satıcı ürünü kendisi almayı teklif etmedikçe ürün, cayma bildiriminden itibaren on gün içinde geri gönderilmelidir.",
    "• Sağlık veya hijyen açısından iadesi uygun olmayan kozmetik ürünlerde koruyucu ambalajın, jelatinin, bandın, "
    "mührün veya benzeri güvenlik unsurunun teslimden sonra açılması hâlinde cayma hakkı kullanılamaz. "
    "Ayıplı mala ilişkin tüketici hakları saklıdır.",
    "• Anlaşmalı taşıyıcı ve iade kodu kullanıldığında tüketiciye iade kargo bedeli yüklenmez.",
]

def rows(pairs):
    return "".join(f'<tr><td class="k">{k}</td><td>{v}</td></tr>' for k, v in pairs)

html = f"""<!doctype html><html lang="tr"><head><meta charset="utf-8">
<title>Cayma Bildirim Formu — American Creator</title><style>{CSS}</style></head><body>
<div class="brand">AMERICAN CREATOR</div>
<div class="doctitle">CAYMA BİLDİRİM FORMU</div>
<table>{rows(HEAD)}</table>
<div class="note"><b>Kullanım Bilgisi</b>Bu formun kullanılması zorunlu değildir. Cayma hakkı, on dört günlük süre
dolmadan Satıcıya yöneltilen açık bir beyanla da kullanılabilir. Ürün iade edilmeden önce Satıcı ile iletişime
geçilmesi ve Satıcının sağladığı ücretsiz iade talimatlarının kullanılması tavsiye edilir.</div>
<h2>1. Bildirimin Muhatabı</h2>
<table>{rows(MUHATAP)}</table>
<h2>2. Tüketici ve Sipariş Bilgileri</h2>
{"".join(f'<div class="field"><span class="lbl">{f}</span><div class="rule"></div></div>' for f in FIELDS)}
<h2>3. Cayma Beyanı</h2>
<div class="decl">Yukarıda belirtilen ürünün/ürünlerin satışına ilişkin mesafeli satış sözleşmesinden cayma hakkımı
kullandığımı bildiririm.</div>
<div class="field"><span class="lbl">Tarih:</span><div class="rule"></div></div>
<div class="field"><span class="lbl">İmza (yalnız kâğıt üzerinde gönderiliyorsa):</span><div class="rule"></div></div>
<h2>4. Tüketici İçin Kısa Hatırlatma</h2>
<ul>{"".join(f'<li>{r}</li>' for r in REMINDERS)}</ul>
</body></html>"""

HTML(string=html).write_pdf(OUT)
print("PDF:", OUT)
print("байт:", os.path.getsize(OUT))
