/**
 * Canonical legal template — "Ön Bilgilendirme Formu" v2.0 (doc code
 * KK-ET-OBF-2026-V2, effective 21.07.2026), FBG-401.
 *
 * Unlike the other seven documents of the pack this form is NOT a static page:
 * it is generated per order and shown to the buyer at the cart→payment step,
 * before the payment obligation arises (§14; Mesafeli Sözleşmeler Yönetmeliği).
 * The `{{…}}` tokens are filled with the concrete order data by
 * `renderOnBilgilendirmeFormu` (src/lib/on-bilgilendirme.ts) and the result is
 * rendered verbatim through `LegalMarkdown` (font ≥16px is applied centrally
 * there — the regulator's ön bilgilendirme minimum).
 *
 * The Turkish text is authoritative and MUST NOT be edited, shortened or
 * reformatted. Two docx→md defects were repaired without changing a single word
 * (same class of fix as FBG-394/396):
 *   - §2 "Alıcı ve Sipariş Bilgileri": the label/value pairs arrived glued into
 *     `#`-prefixed heading lines; they are restructured into a requisite table
 *     mirroring §1 (labels kept, colon separators dropped as the column does that).
 *   - §12 "Talep ve Şikâyetlerin İletilmesi": the body sentences arrived as `#`
 *     headings and the contact line was glued; the erroneous `#` is dropped and
 *     the contact line is un-glued with `<br>`.
 *   - Multi-field value blocks (§5/§6/§8/§9/§10/§12) carried Word soft line
 *     breaks (trailing double-space) which our parser would re-glue into one
 *     paragraph; they are made explicit with `<br>` (FBG-396 pattern).
 * Placeholder underscores that arrived backslash-escaped in the source
 * (`{{order\_number}}`) are normalised to `{{order_number}}`.
 *
 * `String.raw` keeps the `\.` (section numbers) and `\+` (phone) escapes
 * byte-for-byte; LegalMarkdown resolves them to literal `.`/`+` at render time.
 *
 * The §4 "Ürün Bilgileri" block repeats once per cart line (the canon marks this
 * in italics). It is therefore held out as `ON_BILGILENDIRME_PRODUCT_BLOCK` and
 * spliced in at the `{{product_blocks}}` sentinel; for a single-item order the
 * OUTPUT reproduces the client document exactly.
 */

/** The §4 per-product block — filled once per cart line, then joined. */
export const ON_BILGILENDIRME_PRODUCT_BLOCK = String.raw`**Ürün Bilgileri**

| Bilgi | Açıklama |
| ----- | ----- |
| Ürün Adı | {{product_name}} |
| Ürün Kodu (SKU) | {{sku}} |
| Varyant | {{variant_or_not_applicable}} |
| Temel Nitelikler | {{essential_characteristics}} |
| Miktar | {{quantity}} |
| KDV Dâhil Birim Fiyat | {{unit_price_vat_included}} {{currency}} |
| İndirim Tutarı | {{discount_amount}} {{currency}} |
| KDV Dâhil Toplam Ürün Bedeli | {{line_total}} {{currency}} |`;

/** Full form; `{{product_blocks}}` is replaced by the joined product blocks. */
export const ON_BILGILENDIRME_TEMPLATE = String.raw`
**AMERICAN CREATOR**

**ÖN BİLGİLENDİRME FORMU**

| Satıcı | KIZIL KALİNA KOZMETİK ÜRÜNLERİ TİCARET İTHALAT VE İHRACAT LİMİTED ŞİRKETİ |
| :---- | :---- |
| **İnternet Sitesi** | https://american-creator.tr/ |
| **Doküman Kodu** | KK-ET-OBF-2026-V2 |
| **Sürüm** | 2.0 |
| **Yürürlük / Güncelleme** | 21.07.2026 |
| **Belge Sınıfı** | KAMUYA AÇIK |

*Bu Ön Bilgilendirme Formu, 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği uyarınca, mesafeli satış sözleşmesi kurulmadan önce tüketicinin bilgilendirilmesi amacıyla hazırlanmıştır. Bu Form'da yer alan bilgiler, siparişin tamamlanmasından önce Alıcı'nın bilgisine sunulur.*

# **1\. Satici Bi̇lgi̇leri̇**

| Unvan | KIZIL KALİNA KOZMETİK ÜRÜNLERİ TİCARET İTHALAT VE İHRACAT LİMİTED ŞİRKETİ |
| :---- | :---- |
| **Marka** | American Creator |
| **Adres** | Oba Mahallesi 225 Sokak Summer Park Sitesi B Blok No: 8B, İç Kapı No: 20, 07460 Alanya / Antalya, Türkiye |
| **Telefon** | \+90 531 871 30 07 |
| **E-posta** | info@american-creator.tr |
| **Web Sitesi** | https://american-creator.tr |
| **Vergi Dairesi** | Alanya Vergi Dairesi |
| **Vergi No** | 5601466111 |
| **MERSİS No** | 0560146611100001 |
| **Ticaret Sicil No** | 31978 |

# **2\. Alıcı ve Sipariş Bilgileri**

| Sipariş Numarası | {{order_number}} |
| :---- | :---- |
| **Sipariş Tarihi ve Saati** | {{order_date_time}} |
| **Alıcı Adı Soyadı** | {{customer_full_name}} |
| **Telefon** | {{customer_phone}} |
| **E-posta** | {{customer_email}} |
| **Fatura Adresi** | {{billing_address}} |
| **Teslimat Adresi** | {{shipping_address}} |

# **3\. Sözleşmeni̇n Konusu**

İşbu Ön Bilgilendirme Formu, Alıcı'nın www.american-creator.tr internet sitesi üzerinden elektronik ortamda sipariş verdiği ürün veya ürünlerin satışı ve teslimine ilişkin hak ve yükümlülükler hakkında bilgilendirilmesini amaçlamaktadır.

# **4\. Ürün ve Bedel Bilgileri**

Siparişe konu her bir ürüne ilişkin bilgiler aşağıda yer almaktadır.

{{product_blocks}}

*(Bu bölüm siparişte yer alan her ürün için ayrı ayrı oluşturulur.)*

**Sipariş Özeti**

| Bilgi | Tutar |
| ----- | ----- |
| Ara Toplam | {{subtotal}} {{currency}} |
| Toplam İndirim | {{total_discount}} {{currency}} |
| Teslimat Bedeli | {{shipping_cost}} {{currency}} |
| Varsa Diğer Masraflar | {{additional_costs}} {{currency}} |
| Ödenecek Toplam Tutar | {{grand_total}} {{currency}} |

# **5\. Ödeme Bi̇lgi̇leri̇**

Ödeme işlemi, American Creator tarafından kullanılan iyzico ödeme altyapısı üzerinden gerçekleştirilmektedir.

Seçilen Ödeme Yöntemi: {{selected_payment_method}}<br>
Taksit Sayısı: {{installment_count_or_not_applicable}}<br>
Ödenecek Toplam Tutar: {{grand_total}} {{currency}}

Ödeme sırasında Alıcı'nın açıkça onaylamadığı herhangi bir ilave bedel tahsil edilmez.

# **6\. Tesli̇mat**

Teslimatlar yalnızca Türkiye Cumhuriyeti sınırları içerisinde yapılmaktadır.

Sipariş, ödemenin onaylanmasının ardından normal şartlarda 1 ila 2 iş günü içerisinde hazırlanarak aşağıda belirtilen taşıyıcıya teslim edilir:

Teslimat Taşıyıcısı: {{delivery_carrier_full_trade_name}}<br>
Teslimat Yöntemi: {{delivery_method}}<br>
Teslimat Bedeli: {{shipping_cost}}<br>
Tahmini Teslim Süresi: {{estimated_delivery_period}}<br>
Taahhüt Edilen Son Teslim Tarihi: {{promised_delivery_date}}

Taahhüt edilen son teslim tarihi, işbu sipariş bakımından esas alınır. Mücbir sebep, teslimatın objektif olarak imkânsızlaşması veya yürürlükteki mevzuatta kabul edilen benzeri bir durum ortaya çıkmadıkça bu tarih Alıcı aleyhine tek taraflı olarak değiştirilemez. Teslimatın imkânsızlaşması hâlinde Alıcı, durumun öğrenildiği tarihten itibaren üç gün içinde yazılı olarak veya kalıcı veri saklayıcısı aracılığıyla bilgilendirilir ve varsa teslimat masrafları da dâhil olmak üzere tahsil edilen tüm ödemeler bildirim tarihinden itibaren en geç on dört gün içinde iade edilir. Satıcı, aksi kararlaştırılmadıkça siparişi her hâlükârda en geç otuz gün içinde teslim etmekle yükümlüdür.

# **7\. Loji̇sti̇k Operasyonlari**

Satıcı, siparişlerin depolanması, hazırlanması, paketlenmesi ve taşıyıcıya teslim edilmesi amacıyla üçüncü taraf lojistik hizmet sağlayıcılarından yararlanabilir.

Siparişlerin depolanması, hazırlanması, paketlenmesi, taşıyıcıya teslim edilmesi ve iade edilen ürünlerin teslim alınmasına ilişkin lojistik operasyonlar NİKAR GIDA TEKSTİL DIŞ TİCARET LİMİTED ŞİRKETİ tarafından Satıcı adına yürütülmektedir.

Lojistik operasyonlarının üçüncü taraf bir hizmet sağlayıcısı tarafından yerine getirilmesi, Satıcı'nın Alıcı'ya karşı olan kanuni ve sözleşmesel sorumluluklarını ortadan kaldırmaz.

# **8\. Cayma Hakki**

Alıcı, herhangi bir gerekçe göstermeksizin ve cezai şart ödemeksizin, sözleşmenin kurulması ile malın teslimi arasındaki süre dâhil olmak üzere cayma hakkını kullanabilir.

Mal satışlarında on dört günlük cayma süresi, Alıcı'nın veya Alıcı tarafından belirlenen ve taşıyıcı olmayan üçüncü kişinin malı teslim aldığı tarihte başlar. Tek sipariş kapsamında birden fazla malın ayrı ayrı teslim edilmesi hâlinde süre, Alıcı'nın veya Alıcı tarafından belirlenen ve taşıyıcı olmayan üçüncü kişinin son malı teslim aldığı tarihte; birden fazla parçadan oluşan mallarda ise son parçanın teslim alındığı tarihte başlar.

Cayma hakkı, on dört günlük süre içerisinde Satıcı'ya yazılı olarak veya kalıcı veri saklayıcısı aracılığıyla açık bir cayma beyanının gönderilmesi suretiyle kullanılabilir.

Cayma Bildirimi E-posta Adresi: info@american-creator.tr

Cayma Bildirimi Posta Adresi:<br>
KIZIL KALİNA KOZMETİK ÜRÜNLERİ TİCARET İTHALAT VE İHRACAT LİMİTED ŞİRKETİ<br>
Oba Mahallesi 225 Sokak, Summer Park Sitesi B Blok No: 8B, İç Kapı No: 20, 07460 Alanya / Antalya, Türkiye

Alıcı, internet sitesinde yayımlanan Örnek Cayma Bildirim Formu'nu kullanabileceği gibi cayma kararını açıkça bildiren başka bir beyanda da bulunabilir. Örnek formun kullanılması zorunlu değildir.

Cayma bildiriminin elektronik ortamda iletilmesi hâlinde, bildirimin Satıcı'ya ulaştığına ilişkin teyit bilgisi Alıcı'ya kalıcı veri saklayıcısı aracılığıyla iletilir.

Alıcı, Satıcı malı kendisinin geri alacağına ilişkin bir teklifte bulunmadıkça, cayma bildirimini yönelttiği tarihten itibaren on dört gün içerisinde ürünü aşağıda belirtilen iade yöntemiyle geri gönderir.

# **9\. Cayma Hakkinin Kullanilamayacaği Durumlar**

Mesafeli Sözleşmeler Yönetmeliği'nin 15 inci maddesi uyarınca, aşağıdaki sözleşmelerde cayma hakkı kullanılamaz:

• Alıcı'nın istekleri veya kişisel ihtiyaçları doğrultusunda hazırlanan mallara ilişkin sözleşmeler,<br>
• çabuk bozulabilen veya son kullanma tarihi geçebilecek malların teslimine ilişkin sözleşmeler,<br>
• teslimden sonra koruyucu unsurları açılmış olması hâlinde iadesi sağlık ve hijyen açısından uygun olmayan mallara ilişkin sözleşmeler,<br>
• ilgili mevzuatta belirtilen diğer mal ve hizmetlere ilişkin sözleşmeler.

Kozmetik ürünlerde sağlık ve hijyen istisnası yalnızca ürün üzerinde sağlık veya hijyen amacıyla bulunan ambalaj, bant, mühür, güvenlik bandı, koruyucu membran, kapak koruması veya benzeri koruyucu unsurun teslimden sonra tüketici tarafından açılması ve ürünün bu nedenle sağlık veya hijyen açısından yeniden satışa uygun olmaması hâlinde uygulanır.

Taşıma kutusunun veya ürünün sağlık ve hijyen koruması niteliği taşımayan dış ya da dekoratif ambalajının açılması tek başına cayma hakkının kaybedilmesine neden olmaz.

Bu sipariş bakımından cayma hakkı istisnası uygulanan ürünler:

{{sku_hygiene_exception_list_or_none}}

# **10\. İade Yöntemi, İade Taşıyıcısı ve Ücret İadesi**

Satıcı tarafından cayma hakkı kapsamındaki iadeler için öngörülen taşıyıcı ve iade yöntemi aşağıda belirtilmiştir:

İade Taşıyıcısı: {{return_carrier_full_trade_name}}<br>
İade Yöntemi: {{return_method}}<br>
İade Talep Kanalı ve İade Kodu Alma Yöntemi: {{return_request_channel_and_code_method}}<br>
Anlaşmalı İade Yönteminde Alıcı'ya Yansıtılacak İade Masrafı: 0 TL

İade Adresi:

NİKAR GIDA TEKSTİL DIŞ TİCARET LİMİTED ŞİRKETİ<br>
Ziya Gökalp Mahallesi, Süleyman Demirel Bulvarı,<br>
The Office No: 7/E, Kapı No: D:136,<br>
Başakşehir / İstanbul, Türkiye

Yukarıda belirtilen taşıyıcı ve yöntem kullanılarak yapılan cayma hakkı kapsamındaki standart iadelerde iade masrafları Satıcı tarafından karşılanır.

Belirtilen iade taşıyıcısının Alıcı'nın bulunduğu yerde şubesinin bulunmaması hâlinde Satıcı, Alıcı'dan ilave bir masraf talep etmeksizin ürünün Alıcı'dan alınmasını sağlar.

Alıcı'nın ürünü Satıcı tarafından belirtilen iade taşıyıcısı dışında başka bir taşıyıcıyla göndermesi hâlinde, ilgili gönderim masrafı Alıcı tarafından karşılanır. Ancak ürünün ayıplı olması, belirtilen taşıyıcının Alıcı'nın bulunduğu yerde hizmet sunmaması veya farklı bir taşıyıcının kullanılmasının Satıcı'dan kaynaklanan bir nedenle zorunlu hâle gelmesi durumunda Alıcı iade masraflarından sorumlu tutulamaz.

Mal teslim edilmeden önce cayma hakkının kullanılması hâlinde, varsa malın Alıcı'ya teslim masrafları da dâhil olmak üzere tahsil edilen tüm ödemeler, cayma bildiriminin Satıcı'ya ulaştığı tarihten itibaren on dört gün içinde iade edilir.

Mal teslim edildikten sonra cayma hakkının kullanılması hâlinde, varsa malın Alıcı'ya teslim masrafları da dâhil olmak üzere tahsil edilen tüm ödemeler, ürünün yukarıda belirtilen iade taşıyıcısına teslim edildiği tarihten itibaren on dört gün içinde iade edilir. Ürünün belirtilenden farklı bir taşıyıcıyla gönderilmesi hâlinde bu süre, ürünün Satıcı'nın yetkilendirdiği fiziksel iade kabul noktası olan NİKAR GIDA TEKSTİL DIŞ TİCARET LİMİTED ŞİRKETİ'ne ulaştığı tarihte başlar.

Geri ödeme, Alıcı'nın satın alma sırasında kullandığı ödeme aracına uygun şekilde, Alıcı'ya herhangi bir masraf veya yükümlülük getirmeksizin ve tek seferde gerçekleştirilir.

# **11\. Ki̇şi̇sel Veri̇leri̇n Korunmasi**

Alıcı'nın sipariş kapsamında paylaştığı kişisel veriler, 6698 sayılı Kişisel Verilerin Korunması Kanunu'na uygun olarak işlenmektedir. Kişisel verilerin işlenmesine ilişkin ayrıntılı bilgiler, internet sitesinde yayımlanan “Kişisel Verilerin İşlenmesine İlişkin Aydınlatma Metni”nde yer almaktadır: {{kvkk_notice_url}}.

# **12\. Talep ve Şikâyetlerin İletilmesi**

Alıcı, sipariş, teslimat, ürün, ödeme, iade veya diğer tüketici işlemlerine ilişkin talep ve şikâyetlerini aşağıdaki kanallar aracılığıyla Satıcı'ya iletebilir:

E-posta: info@american-creator.tr<br>
Telefon: \+90 531 871 30 07<br>
Posta Adresi: Oba Mahallesi 225 Sokak, Summer Park Sitesi B Blok No: 8B, İç Kapı No: 20, 07460 Alanya / Antalya, Türkiye

Başvurular, başvurunun niteliğine göre makul süre içerisinde incelenerek Alıcı'ya bildirilen iletişim kanalı üzerinden cevaplandırılır.

# **13\. Uyuşmazliklarin Çözümü**

6502 sayılı Tüketicinin Korunması Hakkında Kanun uyarınca ortaya çıkabilecek uyuşmazlıklarda görevli ve yetkili Tüketici Hakem Heyetleri ile Tüketici Mahkemeleri, başvuru tarihindeki parasal sınırlar ve yürürlükteki mevzuat hükümlerine göre belirlenir.

# **14\. Onay Beyani**

Alıcı, ödeme yükümlülüğü doğuran siparişini vermeden önce işbu siparişe özgü Ön Bilgilendirme Formu'nun elektronik ortamda ve kalıcı veri saklayıcısı aracılığıyla kendisine sunulduğunu, içeriğini okuyup inceleme ve kaydetme imkânı bulduğunu teyit eder.

**Hukuki Dayanaklar**

* 6502 sayılı Tüketicinin Korunması Hakkında Kanun.

* Mesafeli Sözleşmeler Yönetmeliği.

* 6698 sayılı Kişisel Verilerin Korunması Kanunu.

* Ticaret Bakanlığı düzenlemeleri ve ilgili diğer mevzuat.
`;
