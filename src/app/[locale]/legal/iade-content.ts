/**
 * Canonical legal text — "İade ve Cayma Politikası" v2.0
 * (doc code KK-TK-ICP-2026-V2, effective 20.07.2026), FBG-399.
 *
 * The Turkish text is authoritative and MUST NOT be edited, shortened or
 * reformatted. It is shown verbatim on both /tr/legal/iade and /en/legal/iade
 * (the /en page adds a short "official text is in Turkish" notice — see
 * legal.iade.enNotice). It lives in one module rather than the i18n catalog
 * because it is a single, non-translatable document; the UI chrome (title,
 * navLabel, notice) stays in messages/{en,tr}.json.
 *
 * `String.raw` keeps backslash escapes (`\.`, `\+`) byte-for-byte so the source
 * matches the client document; LegalMarkdown resolves them at render time.
 *
 * Two deviations from the client's docx→md export, neither changing a word:
 *  - §2 table: the Satıcı and NİKAR requisite cells arrived with their fields
 *    concatenated without a separator (`…ŞİRKETİMERSİS:…`, `…DairesiAdres:…`).
 *    Those glue points are un-glued with `<br>` line breaks (as in FBG-396).
 *  - §4: the two "Örnek Cayma Bildirim Formu" mentions are turned into Markdown
 *    links to the separately published PDF (/legal/cayma-bildirim-formu.pdf),
 *    per the client's requirement; only the link markup is added around the
 *    existing phrase — no surrounding word is altered.
 */
export const IADE_MARKDOWN = String.raw`
**AMERICAN CREATOR**

**İADE VE CAYMA POLİTİKASI**

| Satıcı | KIZIL KALİNA KOZMETİK ÜRÜNLERİ TİCARET İTHALAT VE İHRACAT LİMİTED ŞİRKETİ |
| :---- | :---- |
| **Ticari Marka / Site** | American Creator / https://american-creator.tr/ |
| **Doküman Kodu** | KK-TK-ICP-2026-V2 |
| **Sürüm** | 2.0 |
| **Yürürlük / Güncelleme** | 20.07.2026 |
| **Belge Sınıfı** | KAMUYA AÇIK |

# **1\. Amaç, Kapsam ve Belgenin Niteliği**

İşbu İade ve Cayma Politikası (“Politika”), American Creator üzerinden satın alınan ürünlerde cayma hakkının kullanılması, kanuni istisnalar, iade lojistiği, ürün incelemesi, bedel iadesi, ayıplı veya yanlış ürün talepleri ve değişim süreçlerine ilişkin esasları açıklar. Politika, Ön Bilgilendirme Formu ve Mesafeli Satış Sözleşmesi ile birlikte uygulanır.

Bu Politika, ticari veya mesleki olmayan amaçlarla hareket eden tüketiciler bakımından uygulanır. Ticari alıcıların iade ve fesih hakları, emredici hükümler saklı kalmak üzere taraflar arasındaki ticari sözleşmeye tabidir.

# **2\. Satıcı, Fulfillment Operatörü ve İade Muhatabı**

| Sıfat | Bilgiler | Rol |
| ----- | ----- | ----- |
| Satıcı ve Hukuki Muhatap | KIZIL KALİNA KOZMETİK ÜRÜNLERİ TİCARET İTHALAT VE İHRACAT LİMİTED ŞİRKETİ<br>MERSİS: 0560146611100001<br>VKN: 5601466111 — Alanya Vergi Dairesi<br>Adres: Oba Mahallesi 225 Sokak Summer Park Sitesi B Blok No: 8B, İç Kapı No: 20, 07460 Alanya / Antalya, Türkiye<br>E-posta: info@american-creator.tr<br>Telefon: \+90 531 871 30 07 | Cayma bildiriminin, şikâyetin, ayıplı mal talebinin ve itirazın hukuki muhatabıdır. İade kabulü, ret kararı, değişim ve bedel iadesine ilişkin nihai kararı verir. |
| Fiziksel İade Kabul ve Ön İnceleme Noktası | NİKAR GIDA TEKSTİL DIŞ TİCARET LİMİTED ŞİRKETİ<br>VKN: 6311761487 — İkitelli Vergi Dairesi<br>İade adresi: Ziya Gökalp Mahallesi, Süleyman Demirel Bulvarı, The Office No: 7/E, Kapı No: D:136, İstanbul, Türkiye<br>E-posta: nikarhome@outlook.com<br>Telefon: \+90 538 608 96 04 | Satıcının yetkilendirdiği fulfillment/lojistik hizmet sağlayıcısıdır. Ürünü teslim alır, karantinaya ayırır, sipariş/ürün eşleşmesini ve ambalaj-hijyen durumunu Satıcının protokolüne göre inceler, bulguları Satıcıya raporlar. Satış sözleşmesinin tarafı değildir. |
| Anlaşmalı İade Taşıyıcısı | Taşıyıcının ticaret unvanı ve iade yöntemi, tüketici ödeme yükümlülüğü altına girmeden önce Ön Bilgilendirme Formu’nda; ayrıca iade talimatında gösterilir. | Satıcının sağladığı iade kodu veya teslim alma talimatı üzerinden ürünü ücretsiz olarak fulfillment merkezine taşır. |

| Önemli Ürünün fiziksel olarak NİKAR’a gönderilmesi, Satıcının tüketiciye karşı hukuki sorumluluğunu devretmez. Cayma ve ayıplı mal bildirimleri American Creator’a yöneltilir; NİKAR yalnızca Satıcı adına fiziksel kabul ve ön inceleme yapar. |
| :---- |

# **3\. Cayma Hakkı ve Süresi**

Tüketici, kanuni istisnalar saklı kalmak üzere, on dört gün içinde herhangi bir gerekçe göstermeksizin ve cezai şart ödemeksizin mesafeli satış sözleşmesinden cayabilir. Mal satışlarında süre, tüketicinin veya tüketici tarafından belirlenen taşıyıcı dışındaki üçüncü kişinin ürünü teslim aldığı gün başlar. Tüketici, sözleşmenin kurulmasından ürünün teslimine kadar olan sürede de cayma hakkını kullanabilir.

Tek siparişte ayrı ayrı teslim edilen ürünlerde son ürünün; birden fazla parçadan oluşan üründe son parçanın teslim edildiği gün esas alınır. Ürünün Satıcı tarafından taşıyıcıya verilmesi tüketiciye teslim sayılmaz.

# **4\. Cayma Bildiriminin Yapılması**

Cayma bildiriminin on dört günlük süre dolmadan Satıcıya yazılı olarak veya kalıcı veri saklayıcısı ile yöneltilmesi yeterlidir. Bildirim aşağıdaki yöntemlerden biriyle yapılabilir:

• info@american-creator.tr adresine sipariş numarası ve cayma iradesini içeren e-posta gönderilmesi.

• Site üzerindeki iade/cayma talep ekranının kullanılması; sistem kullanılıyorsa talebin alındığına ilişkin teyit tüketiciye derhal iletilir.

• Oba Mahallesi 225 Sokak Summer Park Sitesi B Blok No: 8B, İç Kapı No: 20, 07460 Alanya / Antalya, Türkiye adresine yazılı bildirim gönderilmesi.

• Site’de ayrıca yayımlanan [Örnek Cayma Bildirim Formu](/legal/cayma-bildirim-formu.pdf)’nun kullanılması.

Cayma hakkının süresinde kullanıldığına ilişkin ispat yükü tüketiciye ait olduğundan, bildirim teyidinin ve gönderim kaydının saklanması önerilir. Ürünün yalnızca kargoya verilmesi, cayma iradesinin Satıcıya ulaştığının ispatını zorlaştırabileceğinden, tüketicinin cayma bildirimini gönderimden önce veya gönderimle eş zamanlı olarak Satıcıya yazılı şekilde ya da kalıcı veri saklayıcısı ile iletmesi önerilir. Site üzerinden ayrıca iade talebi oluşturulması zorunlu değildir.

[Örnek Cayma Bildirim Formu](/legal/cayma-bildirim-formu.pdf) Site'de ayrı bir belge olarak yayımlanmaktadır. Bu formun kullanılması zorunlu olmayıp, tüketici cayma kararını açıkça ortaya koyan başka bir yazılı beyan veya kalıcı veri saklayıcısı ile de cayma hakkını kullanabilir.

# **5\. Ürünün Geri Gönderilmesi**

Satıcı ürünü kendisinin geri alacağını açıkça teklif etmedikçe, tüketici cayma bildiriminin Satıcıya ulaştığı tarihten itibaren on dört gün içinde ürünü Satıcının yetkilendirdiği kişiye veya iade adresine göndermelidir. Cayma hakkının usulüne uygun şekilde kullanılması için tüketicinin süresi içinde cayma bildirimini Satıcıya ulaştırmış olması yeterlidir. Satıcı, ücretsiz iade sürecinin organize edilebilmesi amacıyla tüketiciye iade kodu, anlaşmalı taşıyıcı bilgileri ve paketleme talimatını kalıcı veri saklayıcısı ile iletir. İade kodunun kullanılmaması veya teknik nedenlerle oluşturulamaması, süresinde yapılmış cayma bildiriminin geçerliliğini ortadan kaldırmaz.

Bedel iadesinin hangi tarihten itibaren hesaplanacağı, ürünün teslim edilip edilmediğine ve iadenin Ön Bilgilendirme Formu'nda belirtilen anlaşmalı taşıyıcı aracılığıyla mı yoksa başka bir taşıyıcıyla mı yapıldığına göre Mesafeli Sözleşmeler Yönetmeliği hükümleri uyarınca belirlenir.

1\. Tüketici cayma bildirimini Satıcıya iletir. Site üzerinden iade talebi oluşturulması veya sistemin kullanılması zorunlu olmayıp, sürecin daha hızlı yürütülmesini sağlar.

2\. Satıcı, anlaşmalı taşıyıcıyı, iade kodunu veya adresten teslim alma yöntemini bildirir.

3\. Ürün, taşıma sırasında zarar görmeyecek şekilde dış taşıma kutusuna yerleştirilir; sipariş numarası pakete veya iade belgesine eklenir.

4\. Ürün, anlaşmalı taşıyıcıya teslim edilir veya organize edilen adresten alıma hazır edilir.

5\. NİKAR ürünü teslim alır, fiziksel ön incelemeyi yapar ve raporu Satıcıya iletir.

6\. Satıcı, tüketiciye inceleme sonucunu ve uygulanacak işlemi bildirir.

Faturanın pakete eklenmemesi tek başına cayma hakkını ortadan kaldırmaz; sipariş numarası ve tüketiciyi/siparişi eşleştirmeye yarayan bilgiler sürecin hızlı yürütülmesi için gereklidir.

# **6\. Kozmetik ve Hijyen Ürünlerinde Cayma Hakkı İstisnası**

Mesafeli Sözleşmeler Yönetmeliği’nin 15 inci maddesinin birinci fıkrasının (ç) bendi uyarınca, teslimden sonra ürün üzerinde sağlık veya hijyen amacıyla bulunan ambalaj, bant, mühür, güvenlik bandı, koruyucu membran, kapak koruması veya benzeri koruyucu unsurun tüketici tarafından açılması ve ürünün bu nedenle sağlık veya hijyen açısından yeniden satışa uygun olmaması hâlinde cayma hakkı kullanılamaz. Yalnızca dış taşıma kutusunun, sevkiyat ambalajının veya sağlık ve hijyen koruması niteliği taşımayan olağan ürün ambalajının açılması bu istisnanın uygulanması için yeterli değildir.

Sağlık ve hijyen istisnasının uygulanıp uygulanmayacağı, ilgili ürünün teknik özellikleri, koruyucu unsurunun niteliği ve bu unsurun tüketici tarafından açılmış olup olmadığı dikkate alınarak her ürün bakımından ayrı ayrı değerlendirilir.

İlgili ürünün sağlık veya hijyen amacıyla kullanılan koruyucu unsura sahip olduğu ve bu unsurun açılması hâlinde cayma hakkının kullanılamayacağı, uygulanabilir olduğu ölçüde ürün sayfasında ve tüketici ödeme yükümlülüğü altına girmeden önce Ön Bilgilendirme Formu’nda açıkça gösterilir. Sağlık ve hijyen istisnası, ürünün ayıplı, yanlış, eksik veya taşıma sırasında hasarlı olması hâlinde tüketicinin 6502 sayılı Kanundan doğan haklarını ortadan kaldırmaz.

# **7\. Diğer Cayma Hakkı İstisnaları**

Mesafeli Sözleşmeler Yönetmeliği’nin 15 inci maddesi kapsamında, somut ürüne uygulanabildiği ölçüde aşağıdaki hâllerde cayma hakkı bulunmaz:

• Tüketicinin istekleri veya kişisel ihtiyaçları doğrultusunda hazırlanan, kişiselleştirilen veya özel üretilen ürünler.

• Çabuk bozulabilen veya son kullanma tarihi kısa sürede geçebilecek ürünler.

• Teslimden sonra başka ürünlerle karışan ve doğası gereği ayrıştırılması mümkün olmayan ürünler.

İstisnalar dar yorumlanır ve her bir istisna yalnızca Mesafeli Sözleşmeler Yönetmeliği’nde öngörülen kendi şartlarının somut ürün bakımından gerçekleşmesi hâlinde uygulanır. Koruyucu unsurun açılmasına ilişkin şart yalnızca niteliği gereği bu koşula bağlı olan istisnalar bakımından dikkate alınır.

# **8\. İade Kargo Ücreti ve Anlaşmalı Taşıyıcı**

Cayma hakkının kullanımında tüketici, Satıcının Ön Bilgilendirme Formu’nda belirttiği taşıyıcı ve iade yöntemi üzerinden gönderim yaptığında iade masrafından sorumlu tutulmaz. Satıcı taşıyıcı belirtmemişse tüketiciden iade masrafı talep edilmez. Belirtilen taşıyıcının tüketicinin bulunduğu yerde şubesi yoksa Satıcı, tüketiciden ilave masraf istemeden ürünün adresten alınmasını veya eşdeğer ücretsiz bir yöntemi sağlar.

Ücretsiz iade sürecinin doğru izlenebilmesi için tüketici, Satıcının verdiği iade kodunu veya adresten alım talimatını kullanmalıdır. Bununla birlikte, iade kodunun kullanılmaması veya teknik nedenlerle oluşturulamaması, süresinde Satıcıya ulaştırılmış cayma bildiriminin geçerliliğini etkilemez. Tüketici farklı bir taşıyıcı veya olağandışı/premium taşıma hizmeti kullanmak isterse, gönderimden önce Satıcıyla yazılı koordinasyon kurmalıdır. Bu hüküm, tüketicinin emredici mevzuattan doğan ücretsiz iade hakkını sınırlamaz.

Ayıplı, hasarlı, eksik veya yanlış ürünün iade, değişim veya inceleme için gönderilmesinde tüketiciye kargo masrafı yüklenmez.

Tüketicinin Ön Bilgilendirme Formu'nda belirtilen anlaşmalı taşıyıcı yerine farklı bir taşıyıcı kullanması hâlinde, bedel iadesine ilişkin süreler Mesafeli Sözleşmeler Yönetmeliği uyarınca ürünün Satıcıya veya yetkilendirdiği kişiye ulaştığı tarihten itibaren hesaplanır.

# **9\. Fiziksel İade Adresi**

American Creator siparişlerine ilişkin fiziksel iade kabul ve inceleme adresi: NİKAR GIDA TEKSTİL DIŞ TİCARET LİMİTED ŞİRKETİ — Ziya Gökalp Mahallesi, Süleyman Demirel Bulvarı, The Office No: 7/E, Kapı No: D:136, İstanbul, Türkiye.

İade adresine gönderim yapılmadan önce cayma bildiriminin Satıcıya ulaştırılması ve ücretsiz, izlenebilir iade sürecinin yürütülebilmesi amacıyla Satıcının verdiği güncel iade kodu veya taşıma talimatının kullanılması gerekir. Site üzerinden ayrıca iade talebi oluşturulması zorunlu değildir. İade kodunun bulunmaması veya teknik nedenlerle oluşturulamaması, süresinde Satıcıya ulaştırılmış cayma bildiriminin hukuki geçerliliğini ortadan kaldırmaz. Adresin operasyonel olarak değişmesi hâlinde, tüketiciye gönderimden önce kalıcı veri saklayıcısı ile yeni adres bildirilir. İade adresinin fulfillment işletmesine ait olması, Satıcının hukuki muhatap olduğu gerçeğini değiştirmez.

# **10\. İade Ürünün İncelenmesi**

NİKAR, ürünü Satıcının yazılı inceleme protokolüne göre teslim alır ve aşağıdaki hususlarda ön inceleme yapar:

• Ürünün sipariş numarası, ürün kodu, varyant, adet ve gerektiğinde lot/seri bilgisiyle eşleşmesi.

• Ürün üzerinde sağlık veya hijyen amacıyla kullanılan koruyucu mühür, güvenlik bandı, hijyen bandı, koruyucu membran veya benzeri koruyucu unsurun açılıp açılmadığı ve bunun ürünün yeniden satışına etkisi.

• Denenme, kullanım, eksilme, sızıntı, kırılma, kontaminasyon veya yeniden satışa engel hijyen riski bulunup bulunmadığı.

• Set, aksesuar, aparat ve kampanya/promosyon ürünlerinin eksiksizliği.

• İade taşıması sırasında yetersiz paketlemeden kaynaklanan hasar olup olmadığı.

İnceleme sırasında gerektiği ölçüde fotoğraf, video, tartım ve teslim kayıtları oluşturulabilir. Bu kayıtlar yalnızca iade kararının verilmesi, kalite kontrolü ve olası uyuşmazlığın ispatı amacıyla işlenir. Nihai kabul veya ret kararı Satıcıya aittir; tüketici, karara American Creator nezdinde itiraz edebilir.

İnceleme sonucunda iadenin tamamen veya kısmen reddedilmesi ya da değer kaybı uygulanması hâlinde, kararın dayanağını oluşturan inceleme kayıtları, fotoğraflar, video kayıtları veya diğer ilgili deliller talep edilmesi hâlinde ilgili mevzuat ve üçüncü kişilerin hakları gözetilerek tüketici ile paylaşılabilir. Karar gerekçeli olarak tüketiciye bildirilir.

# **11\. Bedel İadesi**

Ürünün tüketiciye henüz teslim edilmediği hâllerde Satıcı, cayma bildiriminin kendisine ulaştığı tarihten itibaren on dört gün içinde, varsa teslimat masrafları da dâhil olmak üzere tahsil edilen tüm ödemeleri iade eder.

Ürünün tüketiciye teslim edilmiş olması hâlinde ise Satıcı; tüketicinin Ön Bilgilendirme Formu'nda belirtilen taşıyıcı aracılığıyla ürünü iade etmesi durumunda ürünün bu taşıyıcıya teslim edildiği tarihten, farklı bir taşıyıcı kullanılması hâlinde ise ürünün Satıcıya veya yetkilendirdiği kişiye ulaştığı tarihten itibaren on dört gün içinde tahsil edilen tüm ödemeleri iade eder.

Geri ödeme, tüketicinin satın alırken kullandığı ödeme aracına uygun, tek seferde ve tüketiciye ek masraf veya yükümlülük getirmeden yapılır. Satıcı iade emrini süresinde ödeme kuruluşuna iletir; tutarın kart veya hesaba fiilen yansıma zamanı banka, kart kuruluşu veya ödeme kuruluşunun operasyonel işlem sürelerine bağlı olabilir. Bu operasyonel süre, Satıcının yasal iade talimatını süresinde verme yükümlülüğünü ortadan kaldırmaz.

Taksitli kart işlemlerinde iadenin karta yansıma biçimi, kart çıkaran kuruluşun mevzuata ve kendi işlem sistemine göre yürüttüğü sürece bağlıdır.

# **12\. Ürünün Değer Kaybı ve İade Paketleme Yükümlülüğü**

Hijyen istisnası kapsamına girmeyen ürünlerde tüketici, ürünü işleyişine, teknik özelliklerine ve kullanım talimatına uygun şekilde kullanması nedeniyle meydana gelen değişiklik ve bozulmalardan sorumlu değildir.

Üründe değer kaybı bulunduğunun ileri sürülmesi hâlinde, bu durum her somut olay bakımından ayrıca değerlendirilir. Bedelden otomatik olarak herhangi bir kesinti yapılamaz; değer kaybına ilişkin bir talep ancak fiilî zararın ve bunun hukuki dayanağının ortaya konulması hâlinde ileri sürülebilir.

Sağlık veya hijyen istisnası kapsamına girmeyen ürünlerde yalnızca ambalajın açılmış olması veya ürünün niteliğini, özelliklerini ve işleyişini değerlendirmek amacıyla olağan şekilde incelenmiş olması tek başına değer kaybı oluşturmaz.

Hijyen ürünü bakımından koruyucu unsurun açılması hâlinde ise 6 ncı maddede düzenlenen cayma hakkı istisnası uygulanır.

Tüketici ürünü, iade taşımasında zarar görmeyecek şekilde paketlemelidir. Ürünün orijinal ürün kutusu, taşıma etiketi yapıştırılarak tek başına kargo ambalajı olarak kullanılmamalı; dış taşıma kutusu veya koruyucu ambalaj kullanılmalıdır.

Tüketici, ürünü teslim aldığı andaki durumunu koruyacak şekilde muhafaza etmek ve iade sürecinde makul özeni göstermekle yükümlüdür.

# **13\. Ayıplı, Hasarlı, Eksik veya Yanlış Ürünler**

Teslim edilen ürünün siparişe uygun olmaması, eksik veya yanlış gönderilmesi, kırık/sızıntılı ulaşması, üretim hatası taşıması, objektif olarak sahip olması gereken özellikleri taşımaması veya Site’de açıklanan niteliklere aykırı olması hâlinde tüketicinin 6502 sayılı Kanunun 11 inci maddesindeki seçimlik hakları saklıdır:

• Ürünü geri vermeye hazır olduğunu bildirerek sözleşmeden dönme.

• Ürünü alıkoyup ayıp oranında satış bedelinden indirim isteme.

• Aşırı bir masraf gerektirmediği takdirde, bütün masrafları Satıcıya ait olmak üzere ücretsiz onarım isteme; ürünün niteliği gereği onarım elverişli değilse bu seçenek uygulanmayabilir.

• İmkân varsa ürünün ayıpsız bir misliyle değiştirilmesini isteme.

Satıcı, tüketicinin mevzuata uygun seçimini yerine getirmekle yükümlüdür. Ambalajın açılmış olması veya ürünün denenmiş olması, ayıbın incelenmesi için gerekli olduğu ölçüde tüketicinin ayıplı mal haklarını ortadan kaldırmaz. Görünür taşıma hasarında tutanak ve fotoğraf sunulması incelemeyi kolaylaştırır; tutanağın bulunmaması kanuni hakkı kendiliğinden düşürmez.

# **14\. Değişim Politikası**

Ayıplı malda ayıpsız misliyle değişim, tüketicinin kanuni seçimlik haklarından biridir ve imkân bulunduğu ölçüde yerine getirilir. Ayıplı olmayan bir üründe ise bağımsız bir “doğrudan değişim” hakkı tanınmış sayılmaz. Tüketici, cayma hakkı şartları mevcutsa ürünü iade ederek istediği ürünü yeni bir siparişle satın alabilir.

Satıcı, belirli dönem veya ürünlerde ayrıca gönüllü değişim imkânı sunarsa bu uygulamanın kapsamı, süresi, stok koşulu ve kargo yöntemi kampanya metninde açıkça belirtilir. Böyle bir kampanya, kanuni hakları sınırlamaz ve diğer ürünlere genişletilmiş sürekli bir taahhüt oluşturmaz.

# **15\. Setler, Kampanyalar ve Promosyon Ürünleri**

Set veya kampanya kapsamında birlikte satılan ürünlerde iadenin kampanya bütünlüğünü etkileyip etkilemediği, sipariş tarihindeki açık kampanya koşullarına göre değerlendirilir. Kampanya ürünü veya hediye, iade edilen ana ürüne bağlı verilmişse tüketiciden bunun da iade edilmesi istenebilir. Herhangi bir bedel mahsup işlemi yalnızca önceden açıkça bildirilen, şeffaf ve mevzuata uygun koşullar çerçevesinde yapılır.

Set içindeki ürünlerden birinin ayıplı olması hâlinde tüketicinin ayıplı mala ilişkin seçimlik hakları saklıdır; kampanya kuralı bu hakları bertaraf edecek şekilde uygulanmaz.

# **16\. İade Talebinin Kabul Edilemeyeceği Hâller**

Aşağıdaki durumlarda, tüketicinin ayıplı mal hakları saklı olmak üzere cayma iadesi reddedilebilir:

• Tüketici tarafından sağlık veya hijyen amacıyla kullanılan koruyucu mühür, güvenlik bandı, hijyen bandı, koruyucu membran veya benzeri koruyucu unsur açılmış ve bu nedenle yeniden satışı sağlık veya hijyen açısından uygun olmayan, Mesafeli Sözleşmeler Yönetmeliği'nin 15 inci maddesinin birinci fıkrasının (ç) bendi kapsamına giren ürünler.

• Siparişle ilgisi bulunmayan, farklı, sahte, değiştirilmiş veya içeriği ikame edilmiş ürün gönderilmesi.

• Kanuni süre geçtikten sonra ve ayrı bir gönüllü iade taahhüdü bulunmaksızın yapılan talepler.

• Tüketicinin talebine göre kişiselleştirilen veya diğer kanuni istisnalara giren ürünler.

Ret kararı gerekçesi ve tespitler tüketiciye bildirilir. Ret edilen ürünün akıbeti tüketiciyle koordine edilir; Satıcı, gerektiğinde delilleri muhafaza edebilir ve kötüye kullanım şüphesi bulunan işlemler bakımından kanundan doğan haklarını saklı tutar.

# **17\. Kozmetik Ürünlerde İstenmeyen Etki Bildirimi**

Cilt tahrişi, alerjik reaksiyon veya başka bir istenmeyen etki bildirimi, standart cayma veya iade incelemesinden ayrı olarak ürün güvenliliği kapsamında değerlendirilir.

Tüketici, ürünü kullanmayı durdurmalı ve mümkünse ürün ambalajını, lot numarasını ve satın alma bilgilerini muhafaza etmelidir. Ciddi veya devam eden belirtiler bulunması hâlinde gecikmeksizin bir sağlık kuruluşuna başvurulması tavsiye edilir.

Bildirimde ürün adı, lot bilgisi, kullanım şekli, olayın tarihi ve açıklaması ile varsa fotoğraf veya tıbbi değerlendirme paylaşılabilir. American Creator, olayın değerlendirilmesi için gerekli olmayan sağlık verileri veya tıbbi belgeleri talep etmez.

Bildirim, ürün güvenliliğinin değerlendirilmesi amacıyla üreticiye ve ilgili ürünün sorumlu kişisine iletilebilir. Mevzuatın bildirim yükümlülüğü öngördüğü hâllerde, ciddi istenmeyen etkiler dâhil gerekli bildirimler ilgili sorumlu aktör tarafından yürürlükteki süre ve usullere uygun olarak TİTCK’ya iletilir ve kozmetovijilans süreci yürütülür.

İstenmeyen etki bildirimi kapsamında paylaşılan sağlık verileri ve diğer özel nitelikli kişisel veriler, yalnızca olayın değerlendirilmesi, ürün güvenliliğinin sağlanması ve hukuki yükümlülüklerin yerine getirilmesi amacıyla KVKK'nın 6 ncı maddesi ile ilgili Aydınlatma Metni uyarınca sınırlı yetkili kişiler tarafından işlenir.

# **18\. Kişisel Veriler ve Kayıtların Saklanması**

İade ve cayma sürecinde kimlik, iletişim, sipariş, ödeme/iade, kargo, ürün inceleme, fotoğraf ve şikâyet verileri; talebin sonuçlandırılması, tüketici mevzuatına uyum, ürün güvenliliği ve hakkın tesisi/kullanılması/korunması amaçlarıyla işlenir. İlgili mevzuat uyarınca saklanması zorunlu işlem kayıtları, uygulanabilir yasal saklama süreleri boyunca muhafaza edilir. Mesafeli Sözleşmeler Yönetmeliği kapsamında saklanması gereken kayıtlar en az üç yıl süreyle korunur.

# **19\. İletişim, İtiraz ve Uyuşmazlık**

Cayma, iade, ayıplı mal ve inceleme sonucuna itiraz bildirimleri info@american-creator.tr adresine, Site üzerindeki ilgili talep kanallarına veya 4 üncü maddede belirtilen diğer yazılı yöntemlerle iletilebilir. \+90 531 871 30 07 numaralı telefon hattı üzerinden süreç hakkında bilgi ve destek alınabilir; cayma bildiriminin geçerli şekilde yapılabilmesi için bildirimin yazılı olarak veya kalıcı veri saklayıcısı ile Satıcıya yöneltilmesi gerekir. Yürürlükteki parasal sınırlar çerçevesinde yetkili tüketici hakem heyetine; Kanunun 73/A maddesi uyarınca dava şartı arabuluculuk hükümleri saklı kalmak üzere tüketici mahkemelerine başvurulabilir.

**Türkçe metin ile diğer dil sürümleri arasında farklılık bulunması hâlinde Türkçe metin esas alınır.**

# **20\. İade Süreci Sorumluluk Matrisi**

| Süreç | Fiilen Yürüten | Nihai Yetki / Tüketici Muhatabı | Temel Kayıt |
| ----- | ----- | ----- | ----- |
| Cayma veya ayıplı mal bildirimi | American Creator müşteri hizmetleri / Site | Satıcı | Talep zamanı, kanal, sipariş ve ürün |
| İade kodu ve taşıyıcı talimatı | Satıcı / entegre taşıyıcı sistemi | Satıcı | Taşıyıcı adı, kod, son gönderim tarihi |
| Fiziksel iade kabulü | NİKAR GIDA TEKSTİL DIŞ TİCARET LİMİTED ŞİRKETİ | Satıcı | Teslim taraması, paket ağırlığı, teslim zamanı |
| Hijyen, ambalaj, ürün ve lot ön incelemesi | NİKAR GIDA TEKSTİL DIŞ TİCARET LİMİTED ŞİRKETİ | Satıcı | Kontrol listesi, fotoğraf/video ve bulgular |
| Kabul / ret / ayıplı mal seçimlik hakkı kararı | Satıcı | Satıcı | Gerekçeli karar ve tüketici bildirimi |
| Bedel iadesi | Satıcı / iyzico / banka | Satıcı | İade emri, iade süresinin başlangıç tarihi, tutar, ödeme tarihi ve ödeme sonucu |
| Kozmetovijilans | Satıcı \+ üretici/sorumlu kişi; gerektiğinde TİTCK | Mevzuata göre ilgili sorumlu aktör | Vaka, lot, değerlendirme ve bildirim kayıtları |

# **Hukuki Dayanaklar**

• 6502 sayılı Tüketicinin Korunması Hakkında Kanun; özellikle m.4, m.8-12, m.48, m.68 ve m.73/A.

• Mesafeli Sözleşmeler Yönetmeliği; özellikle m.5, m.6, m.9-16, m.20 ve Yönetmelik ekinde yer alan Örnek Cayma Formu.

• 24.05.2025 tarihli ve 32909 sayılı Resmî Gazete’de yayımlanan ve 01.01.2026 tarihinde yürürlüğe giren değişiklikler.

• 5324 sayılı Kozmetik Kanunu, uygulanabilir Kozmetik Ürünler Yönetmeliği ve TİTCK kozmetovijilans düzenlemeleri.

• 6698 sayılı Kişisel Verilerin Korunması Kanunu.
`;
