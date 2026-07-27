# -*- coding: utf-8 -*-
"""KVKK İlgili Kişi Başvuru Formu (KK-KVKK-BF-2026-V2) → печатный PDF-бланк.

Канонический сборочный скрипт для public/legal/kvkk-basvuru-formu.pdf
(держим рецепт под контролем версий рядом с артефактом — иначе кегль/текст
PDF и его исходник молча расходятся). Требует weasyprint:

    pip install weasyprint && python scripts/make-kvkk-basvuru-pdf.py

Текст канона (06.2-kvkk-basvuru-formu.md) переносится дословно; docx-экранирование
(\\_, \\|) снято, подчёркивания-заполнители заменены на линии бланка, чекбоксы «□»
сохранены. Кегль основного текста и пояснений — 12pt (регуляторный минимум для
юр-документов, FBG-415). Канон Aydınlatma (kvkk-content.ts) ссылается на этот PDF."""
import os

from weasyprint import HTML

# Пишем прямо в витрину: репозиторный public/legal рядом со скриптом.
OUT = os.path.normpath(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "legal", "kvkk-basvuru-formu.pdf")
)

CSS = """
@page { size: A4; margin: 18mm 16mm 16mm 16mm;
  @bottom-center { content: "KK-KVKK-BF-2026-V2 · Sürüm 2.0 / 22.07.2026 · " counter(page) " / " counter(pages);
                   font-family: "DejaVu Sans"; font-size: 7.5pt; color: #7a7a7a; } }
body { font-family: "DejaVu Sans", sans-serif; font-size: 12pt; line-height: 1.5; color: #1a1a1a; }
.brand { font-size: 13pt; font-weight: bold; letter-spacing: 2px; text-align: center; }
.doctitle { font-size: 15pt; font-weight: bold; text-align: center; margin: 4px 0 14px; }
table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
td { border: 0.6pt solid #b9b9b9; padding: 5px 7px; vertical-align: top; }
td.k { width: 40%; font-weight: bold; background: #f4f4f4; }
.note { border: 0.8pt solid #1a1a1a; background: #fafafa; padding: 8px 10px; margin: 0 0 16px; font-size: 12pt;
        page-break-inside: avoid; }
.note b { display: block; margin-bottom: 3px; }
h2 { font-size: 13pt; margin: 16px 0 7px; padding-bottom: 3px; border-bottom: 0.8pt solid #1a1a1a;
     page-break-after: avoid; }
h3 { font-size: 12pt; margin: 12px 0 6px; }
p { margin: 0 0 9px; text-align: justify; }
.field { margin: 0 0 11px; }
.field .lbl { font-weight: bold; }
.rule { border-bottom: 0.6pt solid #6a6a6a; height: 13px; margin-top: 3px; }
.cb { margin: 0 0 7px; }
.fill { display: inline-block; min-width: 55mm; border-bottom: 0.6pt solid #6a6a6a; }
"""


def rows(pairs):
    return "".join(f'<tr><td class="k">{k}</td><td>{v}</td></tr>' for k, v in pairs)


def rule(n=1):
    return "".join('<div class="rule"></div>' for _ in range(n))


def field(label, n=1):
    return f'<div class="field"><span class="lbl">{label}</span>{rule(n)}</div>'


def cb(text):
    return f'<div class="cb">{text}</div>'


def paras(*items):
    return "".join(f"<p>{p}</p>" for p in items)


HEAD = [
    ("Veri Sorumlusu", "KIZIL KALİNA KOZMETİK ÜRÜNLERİ TİCARET İTHALAT VE İHRACAT LİMİTED ŞİRKETİ"),
    ("İnternet Sitesi", "https://american-creator.tr/"),
    ("Doküman Kodu", "KK-KVKK-BF-2026-V2"),
    ("Sürüm / Tarih", "2.0 / 22.07.2026"),
    ("Belge Sınıfı", "KAMUYA AÇIK"),
]

AMAC = (
    "Bu form, KVKK’nın 11 inci maddesindeki hakların kullanılması için hazırlanmıştır. Formun kullanılması "
    "zorunlu değildir; ancak başvurunun zorunlu unsurları içermesi gerekir. Kimlik fotokopisi rutin olarak "
    "talep edilmez; ek doğrulama yalnız başvurunun niteliği ve veri güvenliği riskiyle orantılı şekilde istenir."
)

AYDINLATMA = [
    "Bu form kapsamında paylaşılan kimlik, iletişim, başvuru içeriği, ek belge, temsil ve doğrulama bilgileri; "
    "başvurunun alınması, başvuru sahibinin ve yetkisinin doğrulanması, talebin değerlendirilmesi, "
    "cevaplandırılması, ilgili işlemlerin yerine getirilmesi, başvuru kayıtlarının tutulması, hukuki "
    "yükümlülüklerin yerine getirilmesi ve bir hakkın tesisi, kullanılması veya korunması amaçlarıyla "
    "KIZIL KALİNA KOZMETİK ÜRÜNLERİ TİCARET İTHALAT VE İHRACAT LİMİTED ŞİRKETİ tarafından işlenir.",
    "Kişisel veriler; başvurunun fiziki veya elektronik yollarla iletilmesi suretiyle tamamen veya kısmen "
    "otomatik yollarla ya da bir veri kayıt sisteminin parçası olmak kaydıyla otomatik olmayan yollarla elde "
    "edilir. Veriler, KVKK’nın 5 inci maddesinin ikinci fıkrasında yer alan hukuki yükümlülüğün yerine "
    "getirilmesi, bir hakkın tesisi, kullanılması veya korunması ve veri sorumlusunun meşru menfaati hukuki "
    "sebeplerine dayanılarak işlenir. Özel nitelikli kişisel veriler ise yalnızca başvurunun değerlendirilmesi "
    "için gerekli olması ve KVKK’nın 6 ncı maddesinde öngörülen uygun işleme şartının bulunması hâlinde işlenir.",
    "Veriler; hukuken yetkili kamu kurum ve kuruluşlarına, yargı mercilerine, başvurunun değerlendirilmesi için "
    "zorunlu olması hâlinde yetkili hizmet sağlayıcılara ve hukuki danışmanlara, yalnızca amaçla sınırlı ve "
    "gerekli güvenlik tedbirleri alınarak aktarılabilir. Başvuru kayıtları ve ekleri, ilgili mevzuattan, "
    "uyuşmazlık ve zamanaşımı sürelerinden ve Şirketin saklama ve imha kurallarından kaynaklanan süre boyunca "
    "saklanır; sürenin sonunda silinir, yok edilir veya anonim hâle getirilir.",
    "Ayrıntılı bilgiye internet sitesinde yayımlanan <u>Kişisel Verilerin İşlenmesine İlişkin Aydınlatma "
    "Metni</u>’nden ulaşılabilir. Başvurunun değerlendirilmesi için zorunlu olmadıkça sağlık verisi, biyometrik "
    "veri, ceza mahkûmiyeti bilgisi, kimlik belgesi fotokopisi veya başka özel nitelikli kişisel veri "
    "gönderilmemelidir.",
]

S1_NOT = (
    "Bu bilgiler, Veri Sorumlusuna Başvuru Usul ve Esasları Hakkında Tebliğ uyarınca başvuruda bulunması "
    "gereken zorunlu bilgilerdendir. Kimlik belgesi fotokopisi başvuruya rutin olarak eklenmemelidir. Şirket, "
    "yalnızca başvurunun doğrulanması için gerekli ve riskle orantılı hâllerde ek bilgi veya belge talep eder."
)

S3_ADRES = "Yazılı başvuru adresi: Oba Mahallesi 225 Sokak Summer Park Sitesi B Blok No: 8B, İç Kapı No: 20, 07460 Alanya / Antalya, Türkiye"
S3_P1 = (
    "Elektronik başvuru adresi: info@american-creator.tr. Bu adrese elektronik posta yoluyla yapılacak "
    "başvuruların, başvuru sahibi tarafından daha önce Şirkete bildirilmiş ve Şirket sisteminde kayıtlı bulunan "
    "elektronik posta adresinden gönderilmesi gerekir. Kayıtlı olmayan bir elektronik posta adresinden iletilen "
    "taleplerde, başvurunun niteliği ve veri güvenliği riski dikkate alınarak ek kimlik ve kanal doğrulaması "
    "yapılabilir. Başvuru tarihi, başvurunun Şirkete ulaştığı tarihtir."
)
S3_P2 = (
    "Kişisel veri içeren başvuruların, mümkün olduğu ölçüde daha önce Şirkete bildirilmiş ve Şirket sisteminde "
    "kayıtlı elektronik posta adresi, güvenli elektronik imza, mobil imza, KEP veya varsa güvenli başvuru "
    "portalı üzerinden iletilmesi önerilir. Başvuruya, talebin değerlendirilmesi için gerekli olmayan kimlik "
    "belgesi kopyaları, ödeme kartı bilgileri, sağlık belgeleri veya diğer özel nitelikli kişisel veriler "
    "eklenmemelidir."
)

S4_ITEMS = [
    "Kişisel verilerimin işlenip işlenmediğini öğrenmek istiyorum.",
    "İşlenen kişisel verilerim hakkında bilgi talep ediyorum.",
    "İşleme amacını ve verilerimin amaca uygun kullanılıp kullanılmadığını öğrenmek istiyorum.",
    "Kişisel verilerimin aktarıldığı üçüncü kişileri ve alıcı gruplarını öğrenmek istiyorum.",
    "Eksik veya yanlış işlenen kişisel verilerimin düzeltilmesini istiyorum.",
    "KVKK m.7 şartları kapsamında kişisel verilerimin silinmesini veya yok edilmesini istiyorum.",
    "Düzeltme, silme veya yok etme işleminin verilerin aktarıldığı alıcılara bildirilmesini istiyorum.",
    "Münhasıran otomatik sistemlerle analiz sonucu aleyhime ortaya çıkan sonuca itiraz ediyorum.",
    "Kanuna aykırı işleme nedeniyle uğradığım zararın giderilmesini talep ediyorum.",
]
S4_RIZA_P = (
    "Açık rızanın geri alınmasına ilişkin talep, geri alma bildiriminin Şirkete ulaştığı andan itibaren ileriye "
    "etkili olarak ilgili veri işleme faaliyetine yönlendirilir. Açık rızanın geri alınması, geri alma tarihinden "
    "önce açık rızaya dayanılarak gerçekleştirilen işlemenin hukuka uygunluğunu etkilemez."
)
S4_CEREZ_P = (
    "Çerez tercihlerine ilişkin talepler, Site üzerindeki çerez tercih yönetim aracı ve ilgili izin kayıtları "
    "üzerinden ayrıca işleme alınır. Zorunlu çerezler, internet sitesinin çalışması ve güvenliği için gerekli "
    "olduklarından devre dışı bırakılamayabilir."
)
S4_TICARI_P = (
    "Ticari elektronik ileti ret bildirimi, KVKK başvurusundan bağımsız olarak ilgili ticari elektronik ileti "
    "izin yönetimi sürecine derhal yönlendirilir. Ret talebi, 6563 sayılı Elektronik Ticaretin Düzenlenmesi "
    "Hakkında Kanun ve Ticari İletişim ve Ticari Elektronik İletiler Hakkında Yönetmelik uyarınca talebin "
    "Şirkete ulaşmasını izleyen en geç üç iş günü içinde uygulanır."
)

S5_P = (
    "Konuya ilişkin bilgi ve belgeler başvuruya eklenebilir. Başvurunun doğrulanması için gerekli olmayan kimlik "
    "belgesi fotokopisi, sağlık verisi veya başka hassas belge gönderilmemelidir. Ek belge istenirse ilgisiz "
    "bilgiler karartılabilir."
)

S6_ITEMS = [
    "Daha önce doğrulanmış veya başvuru kapsamında güvenli şekilde doğrulanacak elektronik posta adresime",
    "Tebligata esas adresime posta ile",
    "Elden teslim",
    "Başvuruda kullandığım güvenli elektronik kanala",
]
S6_P = (
    "Daha önce doğrulanmamış bir elektronik posta adresine kişisel veri içeren cevap gönderilmeden önce, "
    "açıklanacak verilerin niteliği ve oluşturabileceği riskle orantılı kimlik ve iletişim kanalı doğrulaması "
    "yapılır. Şirket; kayıtlı iletişim bilgisi üzerinden doğrulama, tek kullanımlık doğrulama kodu, güvenli "
    "bağlantı, parola korumalı dosya veya benzeri uygun güvenlik yöntemlerinden birini kullanabilir. Parola "
    "korumalı dosya kullanılması hâlinde parola, mümkün olduğunca ayrı bir iletişim kanalı üzerinden iletilir. "
    "Talep edilen cevap yönteminin veri güvenliği veya teknik nedenlerle uygun olmaması hâlinde Şirket, güvenli "
    "başka bir yöntem kullanır ve başvuru sahibini bilgilendirir."
)

S7_P = (
    "Başvuruda sunduğum bilgilerin doğru ve güncel olduğunu, başvurunun tarafıma veya temsil ettiğim kişiye ait "
    "olduğunu beyan ederim. Şirketin kimlik doğrulaması ve talebin açıklığa kavuşturulması için gerekli ve "
    "ölçülü ek bilgi isteyebileceğini biliyorum. Yetkisiz veya gerçeğe aykırı başvurudan doğan sorumluluk "
    "başvuru sahibine aittir."
)
S7_TABLE = [
    ("Adı Soyadı", '<span class="fill"></span>'),
    ("Tarih", '<span class="fill" style="min-width:20mm"></span> / <span class="fill" style="min-width:20mm"></span> / <span class="fill" style="min-width:28mm"></span>'),
    ("İmza (yazılı başvuruda)", '<span class="fill"></span>'),
    ("Vekil / Kanuni Temsilci", '<span class="fill"></span>'),
    ("Vekâletname / Yetki Belgesi", "□ Eklendi &nbsp;&nbsp; □ Uygulanamaz"),
]

S8_P1 = (
    "Başvuru, niteliğine göre en kısa sürede ve en geç otuz gün içinde ücretsiz sonuçlandırılır. İşlemin ayrıca "
    "maliyet gerektirmesi halinde Kurulca belirlenen tarifedeki ücret uygulanabilir; başvuru Şirketin hatasından "
    "kaynaklanmışsa alınan ücret iade edilir."
)
S8_P2 = (
    "Başvurunun reddedilmesi, cevabın yetersiz bulunması veya süresinde cevap verilmemesi halinde ilgili kişi; "
    "cevabı öğrendiği tarihten itibaren otuz gün ve her halde başvuru tarihinden itibaren altmış gün içinde "
    "Kişisel Verileri Koruma Kuruluna şikâyette bulunabilir."
)

S9_TABLE = [
    ("Başvuru Kayıt No", "&nbsp;"),
    ("Başvurunun Ulaşma Tarihi", "&nbsp;"),
    ("Kimlik Doğrulama Yöntemi", "&nbsp;"),
    ("Sorumlu Birim / Kişi", "&nbsp;"),
    ("Son Cevap Tarihi", "&nbsp;"),
    ("Karar / Sonuç", "&nbsp;"),
    ("İmha / Saklama Notu", "&nbsp;"),
    ("Başvuru Kategorisi", "□ KVKK &nbsp; □ Açık Rıza &nbsp; □ Ticari İleti &nbsp; □ Diğer"),
    ("Başvuru Kanalı", "&nbsp;"),
    ("Cevap Tarihi ve Kanalı", "&nbsp;"),
    ("Ret Gerekçesi (varsa)", "&nbsp;"),
]

DAYANAK = [
    "6698 sayılı Kişisel Verilerin Korunması Kanunu, özellikle 11, 13 ve 14 üncü maddeler.",
    "Veri Sorumlusuna Başvuru Usul ve Esasları Hakkında Tebliğ.",
    "Kişisel Verileri Koruma Kurumunun başvuru ve şikâyet usullerine ilişkin resmî duyuru ve kararları.",
]

# ── §4: talep konusu (checkbox list, some rows carry an inline fill + note) ──
s4 = "".join(cb("□ " + t) for t in S4_ITEMS)
s4 += cb('□ Açık rızamı geri alıyorum. İlgili faaliyet/modül: <span class="fill"></span>')
s4 += paras(S4_RIZA_P)
s4 += cb('□ Çerez tercihlerimi geri almak veya değiştirmek istiyorum. İlgili çerez kategorisi: <span class="fill"></span>')
s4 += paras(S4_CEREZ_P)
s4 += cb("□ Ticari elektronik ileti tercihim için ret bildirimi yapıyorum. Kanal: □ E-posta &nbsp; □ Mesaj &nbsp; □ Arama")
s4 += paras(S4_TICARI_P)
s4 += cb('□ Diğer: <span class="fill"></span>')

html = f"""<!doctype html><html lang="tr"><head><meta charset="utf-8">
<title>KVKK İlgili Kişi Başvuru Formu — American Creator</title><style>{CSS}</style></head><body>
<div class="brand">AMERICAN CREATOR</div>
<div class="doctitle">KVKK İLGİLİ KİŞİ BAŞVURU FORMU</div>
<table>{rows(HEAD)}</table>
<div class="note"><b>Formun Amacı</b>{AMAC}</div>

<h3>Kısa Aydınlatma</h3>
{paras(*AYDINLATMA)}

<h2>1. Başvuru Sahibinin Kimlik ve İletişim Bilgileri</h2>
{field("Adı ve Soyadı:")}
{field("T.C. Kimlik No / Yabancı Kimlik No / Pasaport No (gerektiğinde):")}
<div class="note"><b>Not:</b>{S1_NOT}</div>
{field("Tebligata Esas Yerleşim Yeri veya İş Yeri Adresi:", 2)}
{field("Daha Önce Şirkete Bildirilen E-posta Adresi:")}
{field("Telefon Numarası:")}

<h2>2. American Creator ile İlişkiniz</h2>
{cb("□ Site ziyaretçisi &nbsp; □ Üye &nbsp; □ Müşteri / Alıcı &nbsp; □ İade veya şikâyet sahibi &nbsp; □ Ticari ileti alıcısı &nbsp; □ Kanuni temsilci / Vekil &nbsp; □ Diğer: <span class=\"fill\" style=\"min-width:35mm\"></span>")}
{field("Varsa üyelik e-postası, sipariş numarası, talep/şikâyet numarası veya ilişki açıklaması:", 2)}

<h2>3. Başvuru Yöntemi</h2>
{cb("□ Şahsen yazılı başvuru &nbsp; □ Noter / iadeli taahhütlü posta &nbsp; □ Daha önce kayıtlı e-posta adresi &nbsp; □ Güvenli elektronik imza / mobil imza")}
<p>{S3_ADRES}</p>
{paras(S3_P1, S3_P2)}

<h2>4. Talep Konusu</h2>
{s4}
{field("Talebinizin ayrıntılı açıklaması, ilgili dönem, veri/süreç ve beklediğiniz işlem:", 5)}

<h2>5. Başvuruya Eklenen Bilgi ve Belgeler</h2>
{paras(S5_P)}
{field("Ekler:", 3)}

<h2>6. Cevabın İletilme Yöntemi</h2>
{"".join(cb("□ " + t) for t in S6_ITEMS)}
{paras(S6_P)}

<h2>7. Başvuru Sahibinin Beyanı</h2>
{paras(S7_P)}
<table>{rows(S7_TABLE)}</table>

<h2>8. Başvuruların Değerlendirilmesi</h2>
{paras(S8_P1, S8_P2)}

<h2>9. Şirket İç Kullanım Alanı</h2>
<table><tr><td class="k">Alan</td><td class="k">Kayıt</td></tr>{rows(S9_TABLE)}</table>

<h2>Hukuki Dayanaklar</h2>
{"".join(f'<div class="cb">• {d}</div>' for d in DAYANAK)}
</body></html>"""

HTML(string=html).write_pdf(OUT)
print("PDF:", OUT)
print("байт:", os.path.getsize(OUT))
