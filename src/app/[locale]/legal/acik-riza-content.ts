/**
 * Canonical legal text — "Açık Rıza Metni" v3.0 (doc code KK-KVKK-AR-2026-V3,
 * effective 22.07.2026), FBG-455.
 *
 * The Turkish text is authoritative and MUST NOT be edited, shortened or
 * reformatted. It is shown verbatim on both /tr/legal/acik-riza and
 * /en/legal/acik-riza (the /en page adds a short "official text is in Turkish"
 * notice — see legal.acik_riza.enNotice). It lives in one module rather than the
 * i18n catalog because it is a single, non-translatable document; the UI chrome
 * (title, navLabel, notice) stays in messages/{en,tr}.json.
 *
 * `String.raw` keeps the escaped pipes in §1's contact line (`… \| +90 … \| …`)
 * byte-for-byte so the source matches the client document; LegalMarkdown resolves
 * each `\|` to a literal `|` at render time (they are NOT inside a table, so they
 * cannot break table parsing).
 *
 * Faithful conversions of the docx→md export (no legal word added or removed):
 *   - The three single-cell HTML callout boxes (`<table><thead><th>…</th></thead>`
 *     with no body — "Ayrı ve Modüler Rıza" intro plus the two "Web Onay Kutusu"
 *     Modül A / Modül B consent boxes) become header-only one-column pipe tables;
 *     the bold heading and its paragraph are joined with a `<br>` hard break, as
 *     done for the note-box callouts in ticari-elektronik-ileti-content.ts.
 *   - The `> •` blockquote bullet groups (§2 "Rızanın Temel Özellikleri" and
 *     "Hukuki Dayanaklar") become `•`-prefixed paragraphs, matching how bullet
 *     lists are rendered in uyelik-sozlesmesi-content.ts (LegalMarkdown has no
 *     blockquote grammar; the `•` glyph is preserved verbatim).
 *   - The empty `#` heading the export left between Modül A and Modül B (a page
 *     break artifact with no text) is dropped; it carries no canon content.
 *
 * The Unicode consent checkboxes `□` are kept as plain document text — this page
 * only publishes the wording; wiring the boxes to real registration/checkout
 * forms is out of scope (FBG-455).
 *
 * Perelinking: the only underlined document name in the canon (§7,
 * `<u>Kişisel Verilerin İşlenmesine İlişkin Aydınlatma Metni</u>`) is rendered as
 * an in-page link to /legal/kvkk; LegalMarkdown prefixes it with the active
 * locale so it stays in the page's language. "KVKK İlgili Kişi Başvuru Formu"
 * (§7) and the §5 process descriptions are left as plain text (no link).
 */
export const ACIK_RIZA_MARKDOWN = String.raw`
**AMERICAN CREATOR**

**AÇIK RIZA METNİ**

| **Veri Sorumlusu** | KIZIL KALİNA KOZMETİK ÜRÜNLERİ TİCARET İTHALAT VE İHRACAT LİMİTED ŞİRKETİ |
| :---- | :---- |
| **İnternet Sitesi** | https://american-creator.tr/ |
| **Doküman Kodu** | KK-KVKK-AR-2026-V3 |
| **Sürüm** | 3.0 |
| **Yürürlük / Güncelleme** | 22.07.2026 |
| **Belge Sınıfı** | KAMUYA AÇIK |

| **Ayrı ve Modüler Rıza**<br>Aşağıdaki rıza beyanları farklı amaçlara ilişkindir ve birbirinden bağımsız kutularla sunulur. Hiçbir kutu önceden işaretlenmez. Rıza vermemek üyeliği, siparişi, ödemeyi, teslimatı veya kanuni hakları etkilemez. |
| :---- |

# 1. Veri Sorumlusu ve Metnin Kapsamı

Veri sorumlusu KIZIL KALİNA KOZMETİK ÜRÜNLERİ TİCARET İTHALAT VE İHRACAT LİMİTED ŞİRKETİ’dir. İletişim: info@american-creator.tr \| +90 531 871 30 07 \| Oba Mahallesi 225 Sokak Summer Park Sitesi B Blok No: 8B, İç Kapı No: 20, 07460 Alanya / Antalya, Türkiye.

Bu metin yalnızca KVKK’da başka bir işleme şartı bulunmayan ve açık rızaya dayanılması gereken faaliyetler için kullanılır. Sözleşmenin kurulması/ifası, hukuki yükümlülük, hakkın tesisi veya meşru menfaat gibi başka bir şart bulunan işlemler için rıza talep edilmez.

Aydınlatma Metni, ticari elektronik ileti onayı ve çerez tercihleri bu belgeden ayrıdır. Bu belgelerin tek kutuda birleştirilmesi veya rızanın hizmetin ön koşulu yapılması yasaktır.

# 2. Rızanın Temel Özellikleri

• Belirli bir konuya ilişkin, bilgilendirmeye dayanan ve özgür iradeyle açıklanan olumlu beyan olmalıdır.

• Sessizlik, Siteyi kullanmaya devam etmek, sayfayı kaydırmak veya önceden işaretlenmiş kutu rıza sayılmaz.

• Rıza her zaman, ücretsiz ve verildiği kadar kolay bir yöntemle geri alınabilir; geri alma önceki hukuka uygun işlemleri etkilemez.

• Amaç veya kapsam esaslı şekilde değişirse yeni rıza alınır.

# 3. MODÜL A - Kişiselleştirilmiş Ürün ve Kampanya Profili

Bu modül yalnız kişiselleştirme özelliği fiilen kullanılıyorsa gösterilir. Sipariş geçmişi, favoriler, sepet hareketleri, Site içi ürün/kategori tercihleri ve kampanya tercihleri; müşteri segmentasyonu, Site içinde kişiselleştirilmiş ürün sıralaması ve kullanıcının ilgisine uygun kampanya önerilerinin oluşturulması amacıyla analiz edilebilir.

Bu rıza, e-posta, SMS, telefon veya WhatsApp üzerinden ticari elektronik ileti gönderilmesine tek başına izin vermez. Böyle bir gönderim için ayrıca kanal bazlı ticari ileti onayı gerekir. Zorunlu olmayan çerezlerden elde edilen veri ancak Çerez Tercih Merkezi’nde ilgili kategori kabul edilmişse kullanılır.

Veriler; yalnız bu hizmetin yürütülmesi için gerekli CRM, yazılım ve pazarlama analizi tedarikçileriyle, veri işleyen sözleşmeleri ve amaçla sınırlılık ilkesi çerçevesinde paylaşılabilir. Yurt dışına düzenli aktarım varsa KVKK m.9’daki uygun mekanizma ayrıca tesis edilir.

| **Web Onay Kutusu - Modül A**<br>□ Alışveriş ve Site içi tercihlerimin analiz edilerek bana özel ürün sıralaması, öneri ve kampanya profili oluşturulması amacıyla kişisel verilerimin işlenmesine açık rıza veriyorum. |
| :---- |

# 4. MODÜL B - Kozmetik Ürün İstenmeyen Etki Bildirimi

Bu modül yalnız ilgili kişinin bir kozmetik ürüne ilişkin tahriş, alerjik reaksiyon veya başka bir istenmeyen etki bildirirken sağlık bilgisi, fotoğraf veya tıbbi belge paylaşması ve bu özel nitelikli verinin işlenmesi için KVKK m.6’da başka bir şart bulunmaması halinde gösterilir.

Paylaşılan veriler; olayın değerlendirilmesi, ilgili kişiyle iletişim, ürün/lot araştırması, risk ve düzeltici faaliyet yönetimi, hukuki hakların korunması ve gerektiğinde ürün bakımından sorumlu kişi, imalatçı/ithalatçı veya Türkiye İlaç ve Tıbbî Cihaz Kurumu ile iletişim kurulması amaçlarıyla sınırlı olarak işlenir.

Gerekli olmayan tıbbi belge veya kimlik verisi talep edilmez. İlgili kişi belgelerdeki ilgisiz bilgileri karartabilir. Erişim, yalnız ürün güvenliliği ve hukuk sürecinde görevli kişilerle sınırlandırılır.

| **Web/Form Onay Kutusu - Modül B**<br>□ Kozmetik ürünle ilişkilendirdiğim istenmeyen etkinin değerlendirilmesi amacıyla gönüllü olarak paylaştığım sağlık bilgilerimin, fotoğraf ve belgelerin yukarıda açıklanan amaçlarla işlenmesine açık rıza veriyorum. |
| :---- |

# 5. Bu Metin Kapsamında Olmayan Ayrı Onaylar

| **Süreç** | **Nasıl Yönetilir?** |
| :---- | :---- |
| **Ticari elektronik ileti** | E-posta, mesaj ve arama kanalları için Ticari Elektronik İleti Bilgilendirmesi ve Onay Metni’nde ayrı kutular. |
| **Analitik ve pazarlama çerezleri** | Çerez Banner ve Tercih Merkezi’nde kategori bazlı, varsayılan kapalı seçimler. |
| **Düzenli yurt dışı aktarım** | Açık rıza yerine öncelikle KVKK m.9 yeterlilik/uygun güvence mekanizması; gerekli olursa yalnız arızi olaya özgü ayrı rıza. |
| **Kullanıcı görselinin reklamda yayımlanması** | Somut görsel, kanal, süre ve kullanım kapsamını belirten ayrı yayın/kullanım izni. |

# 6. Rızanın Geri Alınması ve Sonuçları

Rıza; hesap tercihleri veya ilgili form üzerinden, Çerez Tercih Merkezi’nden (çerezler bakımından), info@american-creator.tr adresine daha önce kayıtlı e-posta üzerinden başvuru yapılarak ya da müşteri hizmetleri aracılığıyla geri alınabilir. Kimlik doğrulaması, başvurunun riskiyle orantılı şekilde yapılır.

Açık rızanın geri alınması, geri alma bildiriminin Veri Sorumlusuna ulaştığı andan itibaren hüküm doğurur.

Geri alma üzerine rızaya dayalı yeni işlemler durdurulur. Saklanması için başka bir hukuki sebep bulunmayan veriler silinir, yok edilir veya anonim hale getirilir. Kanuni yükümlülük, uyuşmazlık veya hakkın korunması nedeniyle saklanması gereken kayıtlar yalnız bu amaçla sınırlı erişim altında tutulabilir.

# 7. İlgili Kişinin Hakları

İlgili kişi KVKK’nın 11 inci maddesindeki haklarını [Kişisel Verilerin İşlenmesine İlişkin Aydınlatma Metni](/legal/kvkk) ve KVKK İlgili Kişi Başvuru Formu’nda açıklanan yöntemlerle kullanabilir.

# 8. Elektronik Rıza İspat Kaydı

Rıza kaydında yalnız gerekli ölçüde; ilgili modül, beyan sürümü, kullanıcı/ziyaretçi referansı, olumlu veya olumsuz seçim, tarih-saat, kaynak ekran ve asgari teknik ispat bilgisi tutulur. Rıza kutuları aydınlatma, üyelik sözleşmesi veya ticari ileti onayıyla birleştirilmez.

# Hukuki Dayanaklar

• 6698 sayılı Kişisel Verilerin Korunması Kanunu, özellikle 3, 4, 5, 6, 7, 9, 10 ve 11 inci maddeler.

• Aydınlatma Yükümlülüğünün Yerine Getirilmesinde Uyulacak Usul ve Esaslar Hakkında Tebliğ.

• Kişisel Verileri Koruma Kurulunun 18.02.2026 tarihli ve 2026/347 sayılı İlke Kararı.

• Kişisel Verilerin Yurt Dışına Aktarılmasına İlişkin Usul ve Esaslar Hakkında Yönetmelik.

• Özel Nitelikli Kişisel Verilerin İşlenmesine İlişkin KVKK Kurumu Rehberi.
`;
