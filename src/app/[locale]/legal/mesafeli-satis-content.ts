/**
 * Canonical legal text — "Mesafeli Satış Sözleşmesi" v4.0
 * (doc code KK-MSS-2026-V4, effective 22.07.2026), FBG-456.
 *
 * Unlike the sibling static policies this document is, by its own "Uygulama
 * Niteliği" clause, a DYNAMIC contract template: it is filled per order (product,
 * price, carrier, return address, buyer data) and delivered to the buyer on a
 * durable medium — the same pattern as the Ön Bilgilendirme Formu (FBG-401).
 * Two representations are therefore exported:
 *
 *  - `MESAFELI_SATIS_TEMPLATE` — the canon with its 31 `{{…}}` order tokens kept
 *    verbatim, for the future checkout render (a dependent task fills them like
 *    `renderOnBilgilendirmeFormu` does the OBF). This is the single source of
 *    truth; the public view is derived from it.
 *  - `MESAFELI_SATIS_MARKDOWN` — the public /legal/mesafeli-satis view, where
 *    every order token is replaced by a visible blank ("___________") so a reader
 *    sees the contract shape without raw `{{tokens}}`. The surrounding wording is
 *    untouched. A single fixed blank is used for every field via one global regex
 *    (`/\{\{[a-z0-9_]+\}\}/g`); the blank length is deliberately NOT tuned per
 *    field type, to keep the rendered document consistent.
 *
 * The Turkish text is authoritative and MUST NOT be edited, shortened or
 * reformatted. On /en the page adds a short "official text is in Turkish" notice
 * (see legal.mesafeli_satis.enNotice); the UI chrome (title, navLabel, notice)
 * stays in messages/{en,tr}.json.
 *
 * `String.raw` mirrors the sibling modules and keeps any backslash escape
 * byte-for-byte (this canon currently uses none) so the source matches the
 * client document; LegalMarkdown resolves them at render time.
 *
 * Three structural deviations from the client's docx→md export, none changing a
 * word of the contract:
 *  - the "Uygulama Niteliği" HTML `<table>` callout becomes a header-only pipe
 *    table (as the kvkk/gizlilik/iade callouts do), its two paragraphs kept apart
 *    with a `<br>`;
 *  - the nine `<u>…</u>` cross-references become Markdown links: five internal
 *    pages (Üyelik Sözleşmesi → /legal/uyelik-sozlesmesi, Kargo ve Teslimat
 *    Politikası → /legal/kargo-teslimat, İade ve Cayma Politikası → /legal/iade,
 *    Gizlilik ve Çerez Politikası → /legal/gizlilik, Kişisel Verilerin
 *    İşlenmesine İlişkin Aydınlatma Metni → /legal/kvkk) and the Cayma Bildirim
 *    Formu → its published PDF (/legal/cayma-bildirim-formu.pdf). Page links are
 *    bare `/legal/…` hrefs; LegalMarkdown's `locale` prop (the shared FBG-453
 *    mechanism) prefixes them with the active locale at render time, so the
 *    reader stays on /tr or /en; the PDF is a static file and takes no locale.
 *    "Ön Bilgilendirme Formu" is NOT linked — it has no public page (it is the
 *    per-order form rendered on checkout);
 *  - the §12 and "Hukuki Dayanaklar" `> •` blockquote lists become `* ` bullets.
 */
export const MESAFELI_SATIS_TEMPLATE = String.raw`
**AMERICAN CREATOR**

**MESAFELİ SATIŞ SÖZLEŞMESİ**

| **Satıcı** | KIZIL KALİNA KOZMETİK ÜRÜNLERİ TİCARET İTHALAT VE İHRACAT LİMİTED ŞİRKETİ |
|----|----|
| **İnternet Sitesi** | https://american-creator.tr/ |
| **Doküman Kodu** | KK-MSS-2026-V4 |
| **Sürüm** | 4.0 |
| **Yürürlük / Güncelleme** | 22.07.2026 |
| **Belge Sınıfı** | KAMUYA AÇIK |

| **Uygulama Niteliği**<br>Bu metin, her sipariş için ürün, fiyat, taşıyıcı, iade adresi ve alıcı bilgileri doldurularak kalıcı veri saklayıcısı ile alıcıya iletilecek dinamik sözleşme şablonudur. Ön Bilgilendirme Formu ve sipariş özeti sözleşmenin ayrılmaz parçasıdır. |
| :---- |

# 1. Taraflar ve Operasyonel Hizmet Sağlayıcıları

## 1.1. Satıcı

| **Ticaret Unvanı** | KIZIL KALİNA KOZMETİK ÜRÜNLERİ TİCARET İTHALAT VE İHRACAT LİMİTED ŞİRKETİ |
|----|----|
| **Ticari Marka** | American Creator |
| **MERSİS No** | 0560146611100001 |
| **Vergi Dairesi / VKN** | Alanya Vergi Dairesi / 5601466111 |
| **Ticaret Sicil No** | 31978 - Alanya Ticaret ve Sanayi Odası |
| **Merkez Adresi** | Oba Mahallesi 225 Sokak Summer Park Sitesi B Blok No: 8B, İç Kapı No: 20, 07460 Alanya / Antalya, Türkiye |
| **İnternet Sitesi** | https://american-creator.tr/ |
| **E-posta** | info@american-creator.tr |
| **Telefon** | +90 531 871 30 07 |

## 1.2. Alıcı

| **Adı Soyadı / Unvanı** | {{customer_full_name}} |
|-------------------------|------------------------|
| **E-posta**             | {{customer_email}}     |
| **Telefon**             | {{customer_phone}}     |
| **Teslimat Adresi**     | {{shipping_address}}   |
| **Fatura Adresi**       | {{billing_address}}    |

Satıcı ve Alıcı ayrı ayrı “Taraf”, birlikte “Taraflar” olarak anılır. Alıcı, ticari veya mesleki olmayan amaçlarla hareket ettiği ölçüde 6502 sayılı Kanun anlamında tüketicidir.

## 1.3. Fulfillment ve Taşıma Tarafları

| **Fulfillment / İade Kabul Operatörü** | NİKAR GIDA TEKSTİL DIŞ TİCARET LİMİTED ŞİRKETİ |
|----|----|
| **VKN / Vergi Dairesi** | 6311761487 / İkitelli Vergi Dairesi |
| **Operasyon ve İade Kabul Adresi** | Süleyman Demirel Bulvarı, The Office No: 7/E, Kapı No: D:136, Ziya Gökalp Mahallesi, Başakşehir / İstanbul, Türkiye |
| **Operasyon İletişimi** | +90 538 608 96 04 / nikarhome@outlook.com |
| **Teslimat Taşıyıcısı** | {{delivery_carrier_full_trade_name}} |
| **İade İçin Öngörülen Taşıyıcı** | {{return_carrier_full_trade_name}} |
| **İade Gönderi Kodu / Yöntemi** | {{return_code_or_request_method}} |

NİKAR GIDA TEKSTİL DIŞ TİCARET LİMİTED ŞİRKETİ, Satıcı adına depolama, sipariş hazırlama, paketleme, taşıyıcıya teslim ve iade kabul/ön inceleme işlemlerini yürütür; ürünlerin satıcısı ve işbu Sözleşme’nin tarafı değildir. Taşıyıcı da fiziksel taşıma hizmetini yürütür. Bu tarafların kullanılması, Satıcı’nın Alıcı’ya karşı kanundan ve Sözleşme’den doğan sorumluluklarını kaldırmaz veya sınırlandırmaz.

# 2. Tanımlar

| **Terim** | **Açıklama** |
|----|----|
| **Alıcı / Tüketici** | Site üzerinden ticari veya mesleki olmayan amaçlarla ürün satın alan gerçek veya tüzel kişi. |
| **Kalıcı Veri Saklayıcısı** | Alıcının kendisine gönderilen bilgiyi makul süre incelemesine ve değiştirilmeden saklayıp kopyalamasına elveren e-posta, kısa mesaj, hesap alanı, indirilebilir PDF ve benzeri araç veya ortam. |
| **Kanun** | 6502 sayılı Tüketicinin Korunması Hakkında Kanun. |
| **Yönetmelik** | Mesafeli Sözleşmeler Yönetmeliği ve yürürlükteki değişiklikleri. |
| **Ön Bilgilendirme Formu** | Sözleşme kurulmadan önce Alıcıya sunulan zorunlu bilgileri içeren siparişe özgü belge. |
| **Ürün** | Site üzerinden satışa sunulan kozmetik, kişisel bakım, parfümeri, makyaj ve tırnak tasarım ürünleri ile siparişe konu diğer taşınır mallar. |
| **Site** | https://american-creator.tr/ |
| **Fulfillment Operatörü** | Satıcı adına lojistik operasyonları yürüten NİKAR GIDA TEKSTİL DIŞ TİCARET LİMİTED ŞİRKETİ. |

# 3. Sözleşmenin Konusu, Kapsamı ve Belgeler Arası Öncelik

İşbu Sözleşme, Alıcının Site üzerinden sipariş verdiği ürünlerin satışı, ödemesi, hazırlanması, teslimatı, cayma, iade, ayıplı mal, ürün güvenliliği ve uyuşmazlık süreçlerinde Tarafların hak ve yükümlülüklerini düzenler.

Siparişe özgü Ön Bilgilendirme Formu, sipariş özeti, ödeme ekranı, kampanya koşulları ve sipariş onayı işbu Sözleşme’nin ayrılmaz parçalarıdır. [Üyelik Sözleşmesi](/legal/uyelik-sozlesmesi) hesap kullanımını; [Kargo ve Teslimat Politikası](/legal/kargo-teslimat) operasyonel teslimat esaslarını; [İade ve Cayma Politikası](/legal/iade) iade süreçlerini; [Gizlilik ve Çerez Politikası](/legal/gizlilik) ile [Kişisel Verilerin İşlenmesine İlişkin Aydınlatma Metni](/legal/kvkk) kişisel veri süreçlerini düzenler. Çelişki halinde emredici mevzuat ve ilgili işleme özgü sipariş belgesi esas alınır.

Üyelik, satışın zorunlu koşulu değildir. Misafir alışveriş imkânı sunulması halinde Sözleşme üyelik hesabı olmaksızın da kurulabilir.

# 4. Ön Bilgilendirme ve Sözleşmenin Kurulması

Alıcı; ödeme yükümlülüğü altına girmeden önce ürünün temel nitelikleri, Satıcı bilgileri, vergiler dahil toplam fiyat, teslimat ve ek masraflar, ödeme yöntemi, tahmini teslim süresi, cayma hakkı, iade için öngörülen taşıyıcı, cayma istisnaları, ayıplı mala ilişkin haklar ve uyuşmazlık çözüm yolları hakkında açık, sade ve okunabilir şekilde bilgilendirilir.

Ön Bilgilendirme Formunun Alıcıya sunulduğuna ve teyit edildiğine ilişkin ispat yükü Satıcıya aittir. Önceden bildirilmeyen veya Alıcının açıkça onaylamadığı ek ücret talep edilemez.

Alıcı, ödeme yükümlülüğü altına girmeden önce Ön Bilgilendirme Formu'nu edindiğini teyit eder ve işbu Sözleşme'yi elektronik ortamda kabul eder. Sözleşme, Alıcı'nın ödeme yükümlülüğünü açıkça gösteren “Öde ve Siparişi Tamamla” veya eşdeğer ifadeli sipariş düğmesini etkinleştirmesi ve ödeme işleminin ödeme hizmeti sağlayıcısı tarafından başarıyla yetkilendirilmesiyle elektronik ortamda kurulur. Siparişin alındığına ilişkin otomatik bildirim, sipariş bilgilerinin Satıcı sistemine ulaştığını gösterir; Satıcı'nın emredici mevzuata aykırı şekilde siparişi sonradan keyfî olarak reddetme hakkı bulunduğu anlamına gelmez.

Sipariş ve Sözleşme, siparişin tamamlanmasından sonra Alıcının e-posta adresine PDF veya başka bir kalıcı veri saklayıcısı ile gönderilir ve varsa hesap alanında erişilebilir tutulur.

# 5. Siparişe Konu Ürünler ve Toplam Bedel

| **Sipariş Numarası** | {{order_number}} |
|----|----|
| **Sipariş Tarihi / Saati** | {{order_date_time}} |
| **Ürün Adı** | {{product_name}} |
| **Ürün Kodu / SKU** | {{sku}} |
| **Varyant** | {{variant}} |
| **Temel Nitelikler** | {{essential_characteristics}} |
| **Miktar** | {{quantity}} |
| **Birim Fiyatı** | {{unit_price_vat_included}} |
| **İndirim Tutarı** | {{discount_amount}} |
| **KDV Dâhil Ürün Toplamı** | {{line_total}} |
| **Ara Toplam** | {{subtotal}} |
| **Toplam İndirim** | {{total_discount}} |
| **Teslimat Bedeli** | {{shipping_cost}} |
| **Varsa Diğer Masraflar** | {{additional_costs}} |
| **Ödenecek Toplam Tutar** | {{grand_total}} |
| **Para Birimi** | {{currency}} |
| **Ödeme Yöntemi** | {{selected_payment_method}} |
| **Taksit Bilgisi** | {{installment_count_or_not_applicable}} |
| **Teslimat Yöntemi** | {{delivery_method}} |
| **Teslimat Taşıyıcısı** | {{delivery_carrier_full_trade_name}} |
| **Tahmini Teslim Süresi** | {{estimated_delivery_period}} |
| **Taahhüt Edilen Son Teslim Tarihi** | {{promised_delivery_date}} |

Siparişe konu ürünlerin adı, kodu, miktarı, birim fiyatı, vergi ve indirim bilgileri sipariş özetinde ayrı ayrı gösterilir. Fiyatlar aksi açıkça belirtilmedikçe Türk Lirası cinsinden ve yürürlükteki vergiler dahil olarak sunulur.

# 6. Ödeme ve Ödeme Güvenliği

Ödeme işlemleri, 6493 sayılı Kanun kapsamında Türkiye Cumhuriyet Merkez Bankası tarafından yetkilendirilen İyzi Ödeme ve Elektronik Para Hizmetleri A.Ş. (“iyzico”) altyapısı ve ilgili bankalar üzerinden yürütülebilir. Tam kart numarası, güvenlik kodu ve benzeri kart doğrulama verileri Satıcının uygulama sunucularında saklanmaz.

Ödeme işleminin banka veya ödeme hizmeti sağlayıcısı tarafından yetkilendirilmemesi, başarısız olması veya Alıcı hesabından tahsilatın gerçekleşmemesi hâlinde sipariş tamamlanmaz. Ödeme işleminin başarıyla yetkilendirilmesi ve tutarın Alıcı'nın ödeme aracından tahsil edilmesinden sonra ödeme hizmeti sağlayıcısı ile Satıcı arasındaki mutabakat, bloke, aktarım veya benzeri iç ödeme süreçlerinden kaynaklanan riskler Alıcı'ya yüklenemez. Satıcı, dolandırıcılık veya yetkisiz işlem riskini önlemek amacıyla olayın niteliğiyle ölçülü ek doğrulama talep edebilir. Doğrulamanın sağlanamaması nedeniyle siparişin iptal edilmesi hâlinde tahsil edilmiş tutarlar mevzuata uygun süre ve yöntemle Alıcı'ya iade edilir.

Kartın yetkisiz kullanıldığı iddiaları kart çıkaran kuruluş ve ödeme hizmeti sağlayıcısı tarafından ilgili ödeme mevzuatı çerçevesinde değerlendirilir. İşbu hüküm tüketicinin bankasına, ödeme kuruluşuna veya yetkili mercilere başvuru haklarını sınırlamaz.

# 7. Siparişin Değerlendirilmesi, Stok ve Bariz Hata

Satıcı siparişi stok, ödeme güvenliği, teslimat imkânı, ürün güvenliliği ve sipariş bilgilerinin doğruluğu bakımından değerlendirebilir. Tüketici siparişleri keyfî veya gerekçesiz şekilde iptal edilmez.

Bir ürünün yalnızca stokta bulunmaması ifanın imkânsızlaştığı anlamına gelmez. İfanın objektif olarak imkânsız hale gelmesi halinde Alıcı durumun öğrenilmesinden itibaren üç gün içinde yazılı olarak veya kalıcı veri saklayıcısı ile bilgilendirilir; teslimat masrafları dahil tahsil edilen tüm ödemeler bildirimden itibaren en geç on dört gün içinde iade edilir. Alıcının açık kabulü olmadan farklı veya muadil ürün gönderilmez.

Ortalama bir tüketici tarafından da fark edilebilecek açık bir yazım, sistem, fiyat veya ürün eşleştirme hatası bulunması halinde Satıcı durumu gecikmeksizin bildirir. Alıcı doğru koşullarla devam etmeyi kabul edebilir veya siparişi masrafsız iptal edebilir. Bu hüküm Satıcıya geçerli siparişleri keyfî şekilde değiştirme hakkı vermez.

# 8. Hazırlama, Fulfillment ve Teslimat

Siparişlerin depolanması, stoktan ayrılması, adet/ürün kontrolü, paketlenmesi, sevkiyat etiketinin hazırlanması ve taşıyıcıya teslimi NİKAR GIDA TEKSTİL DIŞ TİCARET LİMİTED ŞİRKETİ tarafından Satıcı adına yürütülebilir. Operatörün hazırladığı kayıt, fotoğraf, tartım ve paketleme kanıtları siparişin incelenmesinde kullanılabilir; bu kayıtlar Alıcının itiraz ve ispat haklarını ortadan kaldırmaz.

Siparişler yalnızca Türkiye Cumhuriyeti sınırları içindeki kabul edilen adreslere gönderilir. Normal operasyon şartlarında hazırlama süresi sipariş ekranında gösterilir. Satıcı, aksi kararlaştırılmadıkça siparişi en geç otuz gün içinde yerine getirir; daha kısa bir teslim süresi taahhüt edilmişse bu süreye uyulur.

Ürün, Alıcıya veya Alıcının teslimat adresinde belirlediği üçüncü kişiye fiilen teslim edilinceye kadar kayıp ve hasar riski Satıcıya aittir. Alıcının Satıcının belirlediği taşıyıcı dışında başka bir taşıyıcıyı açıkça seçmesi halinde risk, ürünün bu taşıyıcıya teslimiyle Alıcıya geçer.

Alıcı teslimat adresini doğru ve eksiksiz bildirmelidir. Yanlış/eksik adres, teslim alınmama veya Alıcının belirlediği kişinin haklı neden olmaksızın teslimatı reddetmesi nedeniyle doğan makul yeniden gönderim masrafı, Satıcının kusuru bulunmadığı ölçüde Alıcıya önceden bildirilerek talep edilebilir. Tekrar gönderimin gerçekleştirilebilmesi için Alıcı'nın ayrıca onayı alınır. Bu durum cayma hakkı kapsamındaki ücretsiz iade masraflarıyla karıştırılmaz.

Paketin tesliminde gözle görülür ezilme, yırtılma, açılma, ıslanma veya benzeri hasar bulunması halinde hasar tespit tutanağı istenmesi tavsiye edilir. Tutanak düzenlenmemesi, Alıcının ayıplı mal, eksik teslim veya taşıma hasarına ilişkin kanuni haklarını ortadan kaldırmaz.

# 9. Cayma Hakkı

Alıcı, ürünün kendisine veya belirlediği üçüncü kişiye teslim edildiği tarihten itibaren on dört gün içinde herhangi bir gerekçe göstermeksizin ve cezai şart ödemeksizin Sözleşmeden cayabilir. Alıcı, ürün teslim edilmeden önce de cayma hakkını kullanabilir.

Tek siparişte birden fazla ürünün ayrı ayrı tesliminde süre son ürünün; birden fazla parçadan oluşan üründe son parçanın teslim edildiği gün başlar. Cayma hakkının süresinde kullanıldığına ilişkin ispat yükü Alıcıya aittir.

# 10. Cayma Bildirimi ve İade Süreci

Cayma bildirimi, on dört günlük süre içinde Satıcıya yazılı olarak, e-posta yoluyla veya başka bir kalıcı veri saklayıcısı aracılığıyla yöneltilir. Örnek Cayma Formunun kullanılması zorunlu değildir. Yalnızca telefon görüşmesi kalıcı veri saklayıcısı niteliğinde olmadığından, telefonla iletilen talebin ayrıca yazılı veya elektronik kanaldan teyit edilmesi gerekir.

| **Cayma / İade E-postası** | info@american-creator.tr |
|----|----|
| **İade Kabul Adresi** | American Creator İade Birimi - NİKAR GIDA TEKSTİL DIŞ TİCARET LİMİTED ŞİRKETİ, Süleyman Demirel Bulvarı, The Office No: 7/E, Kapı No: D:136, Ziya Gökalp Mahallesi, Başakşehir / İstanbul, Türkiye |
| **İade İçin Öngörülen Taşıyıcı** | {{return_carrier_full_trade_name}} |
| **İade Talep Kanalı ve İade Kodunun Alınma Yöntemi** | {{return_request_channel_and_code_method}} |

Alıcı, Satıcı malı kendisinin geri alacağına dair bir teklifte bulunmadıkça, cayma bildirimini yönelttiği tarihten itibaren on dört gün içinde ürünü Satıcıya veya Satıcının yetkilendirdiği iade kabul operatörüne gönderir.

Ürünün Ön Bilgilendirme Formunda belirtilen taşıyıcıyla gönderilmesi halinde Alıcı iade masrafından sorumlu tutulamaz. İade taşıyıcısının bildirilmemesi halinde de Alıcıdan iade masrafı talep edilemez. Belirtilen taşıyıcının Alıcının bulunduğu yerde şubesi yoksa Satıcı, Alıcıdan ek masraf talep etmeden ürünün alınmasını sağlar.

Ürün, taşıma sırasında zarar görmeyecek şekilde paketlenmeli; mümkün olduğu ölçüde ürünle birlikte teslim edilen aksesuar, standart parça ve kampanya ürünleriyle gönderilmelidir. Dış taşıma kutusunun bulunmaması veya açılması, ürünün niteliği ve hijyen bütünlüğü etkilenmediği sürece cayma hakkını tek başına ortadan kaldırmaz.

# 11. Bedel İadesi

Cayma hakkına konu ürünün Ön Bilgilendirme Formunda belirtilen taşıyıcıya teslim edildiği tarihten itibaren en geç on dört gün içinde, standart teslimat masrafları dahil tahsil edilen tüm ödemeler Alıcıya iade edilir. Ürün öngörülen taşıyıcı dışında bir taşıyıcıyla gönderilmişse bu süre ürünün Satıcıya veya yetkilendirdiği kişiye ulaştığı tarihte başlar.

Ürün teslim edilmeden önce cayma hakkı kullanılmışsa geri ödeme, cayma bildiriminin Satıcıya ulaştığı tarihten itibaren en geç on dört gün içinde yapılır. Geri ödeme, satın almada kullanılan ödeme aracına uygun olarak, tek seferde ve Alıcıya ek masraf yüklenmeden gerçekleştirilir. Alıcının standart teslimat yönteminden daha pahalı bir yöntemi seçmesi halinde standart teslimat bedelini aşan kısım iade edilmeyebilir.

Satıcının iade talimatını ödeme kuruluşuna süresinde iletmesinden sonra tutarın karta veya hesaba yansıması bankanın ve ödeme kuruluşunun operasyon sürelerine bağlı olabilir. Satıcı, kendi işlem tarihini ve referansını Alıcıyla paylaşır.

# 12. Cayma Hakkının Kullanılamadığı Haller ve Kozmetik Hijyen İstisnası

Yönetmeliğin 15 inci maddesinde sayılan hallerde cayma hakkı kullanılamaz. American Creator ürünleri bakımından özellikle aşağıdaki durumlar önem taşır:

* Alıcının istekleri veya kişisel ihtiyaçları doğrultusunda özel olarak hazırlanan ürünler.
* Çabuk bozulabilen veya son kullanma tarihi hızla geçebilecek ürünler.
* Tesliminden sonra ürün üzerinde sağlık veya hijyen amacıyla bulunan ambalaj, bant, mühür, güvenlik bandı, koruyucu membran, kapak koruması veya benzeri koruyucu unsurun tüketici tarafından açılması ve ürünün bu nedenle sağlık veya hijyen açısından yeniden satışa uygun olmaması hâlinde cayma hakkı kullanılamaz. Yalnızca dış taşıma kutusunun, sevkiyat ambalajının veya sağlık ve hijyen koruması niteliği taşımayan olağan ürün ambalajının açılması bu istisnanın uygulanması için yeterli değildir.
* Teslimden sonra başka ürünlerle karışan ve niteliği gereği ayrıştırılması mümkün olmayan ürünler.

Kozmetik ve kişisel bakım ürünlerinde hijyen istisnası yalnızca koruyucu unsurun teslimden sonra açılması ve ürünün bu nedenle sağlık veya hijyen bakımından iadeye uygun olmaması şartlarının birlikte bulunması halinde uygulanır. Ürünün yalnızca kozmetik olması, dış kargo kutusunun açılması veya ürün kutusunun dıştan incelenmesi tek başına cayma hakkını ortadan kaldırmaz.

Cayma hakkı istisnası, ayıplı, yanlış, eksik, hasarlı veya mevzuata aykırı ürünlere ilişkin kanuni hakları ortadan kaldırmaz.

# 13. Değer Kaybı, Kampanyalı ve Hediyeli Siparişler

Alıcı, cayma süresi içinde ürünü yalnızca niteliğini, özelliklerini ve işleyişini belirlemek amacıyla gerekli olduğu ölçüde kullanabilir. Bu sınırın aşılması nedeniyle oluşan değer kaybından yalnızca fiilen meydana gelen, ispatlanabilen ve hukuken talep edilebilir değer kaybı ölçüsünde sorumludur. Değer kaybı otomatik olarak uygulanmaz. Satıcı, değer kaybının kapsamını ve miktarını somut delillerle ortaya koymakla yükümlüdür.

Ürünün bu sınırların ötesinde kullanılması nedeniyle değer kaybı meydana gelmesi hâlinde, Alıcı yalnızca fiilen oluşan, ispatlanabilen ve hukuken talep edilebilir değer kaybından sorumludur.

Ücret iadesinden otomatik olarak herhangi bir tutar düşülmez. Değer kaybına ilişkin herhangi bir değerlendirme yalnızca ürünün somut durumu, oluştuğu iddia edilen zararın niteliği, hukuki dayanağı ve mevcut deliller birlikte değerlendirilerek yapılabilir.

Depo, lojistik hizmet sağlayıcısı veya iade kabul personeli tek başına değer kaybı tespiti yapamaz ve ücret iadesinden kesinti kararı veremez. Bu kişiler yalnızca ürünün teslim anındaki fiili durumuna ilişkin teknik inceleme ve kayıt işlemlerini yürütür.

Herhangi bir kesinti yapılabilmesi için oluştuğu iddia edilen değer kaybının somut delillerle ortaya konulması ve ilgili mevzuata göre hukuken talep edilebilir nitelikte olması gerekir.

Ürün üzerinde yalnızca olağan inceleme kapsamında gerçekleştirilen işlemler nedeniyle değer kaybı bulunduğu kabul edilemez.

Ürünün teslimi sırasında mevcut olmayan hasar, eksiklik veya değer kaybına ilişkin değerlendirmelerde, Satıcı gerekli gördüğü ölçüde fotoğraf, video, teslim kayıtları, taşıma kayıtları ve diğer teknik delillerden yararlanabilir.

# 14. Ayıplı Mal ve Seçimlik Haklar

Ürünün sözleşmede, ambalajda, etikette, tanıtımda veya reklamda belirtilen özellikleri taşımaması; objektif olarak sahip olması gereken nitelikleri içermemesi; kullanım amacını karşılamaması ya da maddi, hukuki veya ekonomik eksiklik içermesi halinde ürün ayıplı sayılabilir.

Alıcı, Kanunun 11 inci maddesi uyarınca; ürünü geri vermeye hazır olduğunu bildirerek sözleşmeden dönme, ürünü alıkoyup ayıp oranında bedel indirimi, aşırı masraf gerektirmediği takdirde ücretsiz onarım veya imkân varsa ayıpsız misliyle değiştirme haklarından birini kullanabilir. Seçimlik hakkın yerine getirilmesinden doğan gerekli masraflar kanunen sorumlu tarafça karşılanır.

Ayıplı mala ilişkin zamanaşımı ve ispat kuralları Kanunun 10 ve 12 nci maddelerine tabidir. Teslim tutanağı düzenlenmemesi veya ürünün teslim alınması, gizli ya da sonradan ortaya çıkan ayıplara ilişkin hakları ortadan kaldırmaz.

# 15. Kozmetik Ürün Bilgileri, Kullanım ve İstenmeyen Etkiler

Kozmetik mevzuatı uyarınca ürün üzerinde, ürün ambalajında veya gerekli hâllerde ürüne eşlik eden bilgi belgesinde yer alması gereken içerik, kullanım şekli, uyarılar, sorumlu kişi bilgileri, parti/lot bilgisi, saklama koşulları ve diğer zorunlu bilgiler ilgili mevzuata uygun şekilde sunulur. Site üzerinde yer alan ürün açıklamaları, zorunlu ürün etiketlemesinin yerine geçmez; yalnızca bilgilendirici ve tamamlayıcı niteliktedir. Alıcı ürünü ürün etiketi ve kullanım talimatlarına uygun şekilde kullanmalıdır.

Ekran ayarları nedeniyle renk ve ton görünümünde sınırlı farklılıklar oluşabilir; bu açıklama ürünün tanıtımında veya sözleşmede taahhüt edilen temel niteliklere aykırılığı meşrulaştırmaz. Site üzerindeki ürün bilgileri tıbbi teşhis veya tedavi tavsiyesi değildir.

Satıcı, yalnızca ürünün teslimden sonra etiket talimatlarına açıkça aykırı kullanılması, yetkisiz şekilde karıştırılması/değiştirilmesi veya tüketicinin kontrolündeki uygunsuz saklama koşullarından kaynaklanan zararlardan, kendi kusuru ve ürünün ayıbı bulunmadığı ölçüde sorumlu tutulamaz. Bu hüküm ürün güvenliliği, ayıplı mal ve kusur sorumluluğunu ortadan kaldırmaz.

Tahriş, alerjik reaksiyon veya başka bir istenmeyen etki şüphesinde ürünün kullanımı durdurulmalı ve Satıcı'ya ürün adı, SKU, lot veya parti numarası, kullanım şekli, olay tarihi ve gözlenen etki bilgileriyle bildirim yapılmalıdır. Sağlık bilgisi, fotoğraf veya tıbbî belge paylaşılması hâlinde bu veriler ayrı [Kişisel Verilerin İşlenmesine İlişkin Aydınlatma Metni](/legal/kvkk) kapsamında, erişim sınırlandırması ve veri minimizasyonu uygulanarak işlenir. Bildirim, olayın niteliğine göre değerlendirilir ve gerekli hâllerde ilgili SKU bakımından Sorumlu Kişi, ithalatçı, imalatçı ve Türkiye İlaç ve Tıbbî Cihaz Kurumu nezdinde yürürlükteki kozmetovijilans kurallarına uygun işlem yapılır.

# 16. Kişisel Veriler ve Ticari Elektronik İletiler

Satıcı, Alıcının kişisel verilerini siparişin alınması, ödeme, faturalandırma, fulfillment, teslimat, iade, müşteri desteği, güvenlik ve hukuki yükümlülüklerin yerine getirilmesi amaçlarıyla KVKK’ya uygun işler. Gerekli ad-soyad, telefon, adres, sipariş ve paket bilgileri amaçla sınırlı olarak fulfillment operatörüne ve taşıyıcıya aktarılabilir. Ayrıntılar [Kişisel Verilerin İşlenmesine İlişkin Aydınlatma Metni](/legal/kvkk) ve [Gizlilik ve Çerez Politikası](/legal/gizlilik)’nda yer alır.

Ticari elektronik ileti onayı, açık rıza ve çerez tercihleri işbu Sözleşmenin kurulmasının veya siparişin tamamlanmasının zorunlu şartı değildir; ilgili onaylar ayrı metin ve kullanıcı işlemleriyle yönetilir. Sipariş, ödeme, güvenlik, teslimat, iade ve ürün güvenliliğine ilişkin işlemsel bildirimler pazarlama içermemek şartıyla bu onaylardan bağımsız olarak gönderilebilir.

# 17. Mücbir Sebep ve Sorumluluğun Sınırları

Doğal afet, savaş, salgın, grev, yaygın ulaşım veya iletişim kesintisi, resmî makam kararı, büyük ölçekli siber olay ve Tarafların makul kontrolü dışındaki benzeri olaylar yükümlülükleri etkileyebilir. Etkilenen Taraf diğer Tarafı makul sürede bilgilendirir ve etkinin azaltılması için gerekli çabayı gösterir.

Satıcı; Alıcının yanlış bilgi vermesi, hesabını veya ödeme aracını yetkisiz kişiye kullandırması, etiket talimatına aykırı kullanım ya da Alıcının kontrolündeki uygunsuz saklama nedeniyle ortaya çıkan zararlardan kendi kusuru bulunmadığı ölçüde sorumlu değildir. Hiçbir sorumluluk sınırlaması tüketicinin emredici mevzuattan doğan haklarını, ayıplı mal, ürün güvenliliği, kişisel veri ve ağır kusur sorumluluğunu ortadan kaldıracak şekilde yorumlanamaz.

# 18. Bildirimler, Kayıtlar ve Sözleşmenin Saklanması

Sipariş, ödeme, teslimat, iade ve güvenlik bildirimleri Alıcının bildirdiği e-posta, telefon, hesap alanı veya diğer kalıcı veri saklayıcıları üzerinden yapılabilir. Alıcı iletişim bilgilerindeki değişiklikleri güncellemelidir.

Satıcı; Ön Bilgilendirme Formu, işbu Sözleşme, sipariş özeti, elektronik kabul, ödeme, teslimat, cayma ve iade kayıtlarını mesafeli sözleşmelere ilişkin mevzuatta öngörülen asgari süre boyunca ve her hâlükârda en az üç yıl saklar. Vergi, muhasebe, ticaret, ödeme hizmetleri, ürün güvenliliği, uyuşmazlık ve ispat yükümlülüklerine tabi kayıtlar ilgili özel mevzuatta öngörülen daha uzun süreler boyunca saklanabilir. Kişisel veriler bakımından saklama ve imha süreleri işleme amacı ve hukuki sebebe göre ayrıca belirlenir.

# 19. Şikâyetler ve Uyuşmazlıkların Çözümü

Alıcı, sipariş ve ürünlere ilişkin talep ve şikâyetlerini info@american-creator.tr e-posta adresi veya +90 531 871 30 07 numaralı telefon üzerinden Satıcı'ya iletebilir. Fulfillment operatörüne veya taşıyıcıya yapılan bildirim, Satıcı'ya başvuru hakkını sınırlamaz; hukuki muhatap Satıcı'dır.

İşbu Sözleşmeye Türk hukuku uygulanır. Tüketici, uyuşmazlık tarihindeki parasal görev sınırları içinde yerleşim yerindeki veya tüketici işleminin yapıldığı yerdeki Tüketici Hakem Heyetine başvurabilir. Hakem heyeti görev sınırını aşan tüketici uyuşmazlıklarında, Kanunun 73/A maddesindeki istisnalar saklı kalmak üzere, tüketici mahkemesinde dava açılmadan önce arabulucuya başvurulması dava şartıdır. Tüketici mahkemesi bulunmayan yerlerde Asliye Hukuk Mahkemesi tüketici mahkemesi sıfatıyla görev yapar.

# 20. Yürürlük, Kabul ve Dil

İşbu Sözleşme, Alıcının elektronik kabulü ve ödeme yükümlülüğü doğuran siparişi tamamlamasıyla yürürlüğe girer. Bir hükmün geçersizliği diğer hükümlerin geçerliliğini etkilemez. Hükümler tüketicinin emredici haklarını sınırlayacak şekilde yorumlanamaz.

**Türkçe metin** ile diğer dil sürümleri arasında farklılık bulunması halinde Türkçe metin esas alınır.

# Elektronik Kabul Kaydı

| **Sözleşme Sürümü**         | KK-MSS-2026-V4 / 4.0        |
|-----------------------------|-----------------------------|
| **Ön Bilgilendirme Sürümü** | {{pre_information_version}} |
| **Sipariş Numarası**        | {{order_number}}            |
| **Alıcı**                   | {{customer_full_name}}      |

Site'de ayrı bir belge olarak yayımlanan [Cayma Bildirim Formu](/legal/cayma-bildirim-formu.pdf), Alıcı tarafından kullanılabilir. Alıcı, bu formu kullanabileceği gibi cayma kararını açıkça ortaya koyan başka bir beyanla da cayma hakkını kullanabilir. Formun kullanılması zorunlu değildir.

# Hukuki Dayanaklar

* 6502 sayılı Tüketicinin Korunması Hakkında Kanun, özellikle 4, 8-12, 48, 68, 73 ve 73/A maddeleri.
* Mesafeli Sözleşmeler Yönetmeliği ve 24.05.2025 tarihli, 32909 sayılı Resmî Gazete’de yayımlanan değişiklikler (01.01.2026 yürürlük).
* 6098 sayılı Türk Borçlar Kanunu; 6100 sayılı Hukuk Muhakemeleri Kanunu; 5464 sayılı Banka Kartları ve Kredi Kartları Kanunu; 6493 sayılı Kanun.
* 5324 sayılı Kozmetik Kanunu, 7223 sayılı Ürün Güvenliği ve Teknik Düzenlemeler Kanunu ve Kozmetik Ürünler Yönetmeliği.
* 6698 sayılı Kişisel Verilerin Korunması Kanunu ve ilgili ikincil mevzuat.
`;

/**
 * Fixed blank shown in place of every order token on the public page. One length
 * for all fields (see module header) — do NOT size it per field type.
 */
const PUBLIC_BLANK = '___________';

/**
 * Public /legal/mesafeli-satis view: the template with every `{{order_token}}`
 * replaced by a visible blank, so no raw token reaches the reader. Derived from
 * the single template above; the surrounding contract wording is untouched.
 */
export const MESAFELI_SATIS_MARKDOWN = MESAFELI_SATIS_TEMPLATE.replace(
  /\{\{[a-z0-9_]+\}\}/g,
  PUBLIC_BLANK,
);
