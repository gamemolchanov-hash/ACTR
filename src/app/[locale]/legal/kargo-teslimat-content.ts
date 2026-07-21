/**
 * Canonical legal text — "Kargo ve Teslimat Politikası" v2.0
 * (doc code KK-TK-KTP-2026-V2, effective 20.07.2026), FBG-396.
 *
 * The Turkish text is authoritative and MUST NOT be edited, shortened or
 * reformatted. It is shown verbatim on both /tr/legal/kargo-teslimat and
 * /en/legal/kargo-teslimat (the /en page adds a short "official text is in
 * Turkish" notice — see legal.kargo_teslimat.enNotice). It lives in one module
 * rather than the i18n catalog because it is a single, non-translatable
 * document; the UI chrome (title, navLabel, notice) stays in messages/{en,tr}.json.
 *
 * `String.raw` keeps backslash escapes (`\.`, `\+`) byte-for-byte so the source
 * matches the client document; LegalMarkdown resolves them at render time.
 *
 * The ONLY deviation from the client's docx→md export is inside the §2 table:
 * the Satıcı and NİKAR requisite cells arrived with their fields concatenated
 * without a separator (`…ŞİRKETİMERSİS:…`, `…LİMİTED ŞİRKETİVKN:…`). Those glue
 * points are un-glued with `<br>` line breaks — no word is added, removed or
 * changed.
 */
export const KARGO_TESLIMAT_MARKDOWN = String.raw`
**AMERICAN CREATOR**

**KARGO VE TESLİMAT POLİTİKASI**

| Satıcı | KIZIL KALİNA KOZMETİK ÜRÜNLERİ TİCARET İTHALAT VE İHRACAT LİMİTED ŞİRKETİ |
| :---- | :---- |
| **Ticari Marka / Site** | American Creator / https://american-creator.tr/ |
| **Doküman Kodu** | KK-TK-KTP-2026-V2 |
| **Sürüm** | 2.0 |
| **Yürürlük / Güncelleme** | 20.07.2026 |
| **Belge Sınıfı** | KAMUYA AÇIK |

# **1\. Amaç, Kapsam ve Belgenin Niteliği**

İşbu Kargo ve Teslimat Politikası (“Politika”), American Creator internet sitesi üzerinden verilen siparişlerin onaylanması, fulfillment merkezinde hazırlanması, paketlenmesi, taşıyıcıya teslimi ve tüketiciye ulaştırılması süreçlerini düzenler. Politika, Ön Bilgilendirme Formu, Mesafeli Satış Sözleşmesi ve İade ve Cayma Politikası ile birlikte uygulanır. Siparişe özgü teslimat süresi, taşıyıcı, teslimat yöntemi ve kargo ücreti bilgileri, tüketicinin ödeme yükümlülüğü altına girmesinden önce ayrıca gösterilir.

Bu Politika tüketici işlemleri için hazırlanmıştır. Ticari veya mesleki amaçla hareket eden alıcılarla yapılan satışlarda, emredici hükümler saklı kalmak kaydıyla taraflar arasındaki ticari sözleşme ve Türk Ticaret Kanunu hükümleri uygulanır.

# **2\. Taraflar ve Operasyonel Hizmet Sağlayıcıları**

| Sıfat | Unvan / Bilgi | Hukuki ve Operasyonel Rol |
| ----- | ----- | ----- |
| Satıcı | KIZIL KALİNA KOZMETİK ÜRÜNLERİ TİCARET İTHALAT VE İHRACAT LİMİTED ŞİRKETİ<br>MERSİS: 0560146611100001<br>VKN: 5601466111 — Alanya Vergi Dairesi<br>Adres: Oba Mahallesi 225 Sokak Summer Park Sitesi B Blok No: 8B, İç Kapı No: 20, 07460 Alanya / Antalya, Türkiye<br>E-posta: info@american-creator.tr<br>Telefon: \+90 531 871 30 07 | Mesafeli satış sözleşmesinin tarafıdır. Ürün, fiyat, teslimat taahhüdü, tüketici başvuruları, sipariş iptali ve bedel iadesi bakımından tüketiciye karşı asli muhataptır. |
| Fulfillment / Lojistik Hizmet Sağlayıcısı | NİKAR GIDA TEKSTİL DIŞ TİCARET LİMİTED ŞİRKETİ<br>VKN: 6311761487 — İkitelli Vergi Dairesi<br>Adres: Ziya Gökalp Mahallesi, Süleyman Demirel Bulvarı, The Office No: 7/E, Kapı No: D:136, İstanbul, Türkiye<br>E-posta: nikarhome@outlook.com<br>Telefon: \+90 538 608 96 04 | Satıcının talimatları doğrultusunda stok kabulü, depolama, sipariş toplama, paketleme, taşıyıcıya teslim, iade gönderilerinin fiziksel kabulü ve ön incelemesi işlemlerini yürütür. Satış sözleşmesinin tarafı değildir ve Satıcının tüketiciye karşı sorumluluğunu ortadan kaldırmaz. |
| Taşıyıcı / Kargo Şirketi | Siparişe uygulanacak taşıyıcının ticaret unvanı, sipariş öncesi bilgilendirmede ve/veya sipariş onayında açıkça gösterilir. | Paketin fiziksel taşımasını, dağıtımını, teslim/teslim edilememe kayıtlarını ve gerektiğinde hasar tespit işlemlerini yürütür. Taşıyıcının kendi mevzuatından doğan sorumlulukları saklıdır. |

| Tüketiciye Karşı Tek Hukuki Muhatap Fulfillment veya kargo operasyonunun üçüncü kişilerce yürütülmesi, Satıcının 6502 sayılı Kanun ve Mesafeli Sözleşmeler Yönetmeliği kapsamındaki sorumluluğunu sınırlamaz. Siparişe, teslimata, hasara, eksikliğe, iptale ve iadeye ilişkin tüketici talepleri American Creator’a yöneltilir. |
| :---- |

# **3\. Teslimat Bölgesi ve Gönderim Kısıtlamaları**

Siparişler yalnızca Türkiye Cumhuriyeti sınırları içindeki, taşıyıcının hizmet sunduğu ve ödeme adımında kabul edilen adreslere teslim edilir. Yurt dışına gönderim yapılmaz. Gönderim kısıtlamaları, taşıyıcının hizmet vermediği bölgeler veya teslimat yöntemi sınırlamaları sipariş verilmeden önce gösterilir.

Tüketici, teslimat adresini eksiksiz ve doğru bildirmekle yükümlüdür. Askerî bölge, güvenlik kontrollü alan, ada, köy, geçici konaklama noktası veya taşıyıcının doğrudan dağıtım yapmadığı yerlere teslimatta şube teslimi ya da alternatif teslimat yöntemi uygulanabilir; varsa bu durum tüketiciye önceden bildirilir.

# **4\. Sipariş Onayı, Ödeme ve Hazırlık Başlangıcı**

Sipariş, ödemenin veya kullanılan ödeme yöntemine göre ödeme yetkilendirmesinin başarıyla tamamlanması ve Satıcı tarafından sipariş teyidinin kalıcı veri saklayıcısı ile tüketiciye iletilmesi üzerine hazırlık sürecine alınır. Ödeme başarısız, risk kontrolünde beklemede veya doğrulama gerektiriyorsa hazırlık süreci başlatılmayabilir. Satıcı, hukuka uygun dolandırıcılık ve işlem güvenliği kontrolleri kapsamında sipariş sahibinden ek doğrulama isteyebilir.

Tüketicinin, malın tesliminden önce cayma hakkını kullanmasına ilişkin bildirimi gecikmeksizin işleme alınır. Bildirimin ürün taşıyıcıya teslim edilmeden önce Satıcıya ulaşması hâlinde, sevkiyatın durdurulması için makul operasyonel tedbirler alınır. Bildirime rağmen ürünün taşıyıcıya teslim edilmiş veya sevkiyatının durdurulamamış olması, tüketicinin Mesafeli Sözleşmeler Yönetmeliği uyarınca sahip olduğu cayma hakkını ortadan kaldırmaz. Bu durumda cayma bildiriminin sonuçları, bedel iadesi ve gerektiğinde malın geri gönderilmesi, İade ve Cayma Politikası ile ilgili mevzuat hükümlerine göre yürütülür.

# **5\. Fulfillment Merkezinde Hazırlama ve Paketleme**

Ödemenin veya kullanılan ödeme yöntemine göre ödeme yetkilendirmesinin onaylanmasından sonra sipariş, NİKAR tarafından Satıcının stok ve paketleme talimatlarına göre hazırlanır. Operasyon; ürünün stoktan ayrılması, siparişle eşleştirilmesi, adet ve varyant kontrolü, gerektiğinde lot/seri kaydının doğrulanması, koruyucu paketleme, taşıma etiketi oluşturulması ve taşıyıcıya teslim aşamalarını kapsar.

Normal operasyon koşullarında siparişlerin, ödeme veya ödeme yetkilendirmesinin onaylanmasını izleyen 1-2 iş günü içinde taşıyıcıya teslim edilmesi hedeflenir. Bu süre bir hedef süredir; kampanya yoğunluğu, stok sayımı, resmî tatil, ürün güvenliği kontrolü veya siparişe özgü başka bir neden bulunması hâlinde sipariş ekranında ya da kalıcı veri saklayıcısı ile bildirilen farklı süre uygulanabilir. Siparişe ilişkin bağlayıcı teslimat süresi, tüketicinin ödeme yükümlülüğü altına girmesinden önce gösterilen ve sipariş teyidinde yer alan süredir.

# **6\. Taşıyıcı Seçimi ve Taşıyıcı Değişikliği**

Satıcı, teslimat bölgesi, paket özellikleri, operasyon kapasitesi ve hizmet seviyesi dikkate alınarak bir veya birden fazla anlaşmalı taşıyıcı kullanabilir. Siparişe atanan taşıyıcı ve varsa takip numarası tüketiciye e-posta, SMS veya hesap ekranı üzerinden bildirilir.

Taşıyıcının hizmet kesintisi, kapasite sorunu veya benzeri haklı operasyonel nedenlerle eşdeğer bir taşıyıcıya geçilebilir. Değişiklik, tüketicinin toplam fiyatını, kanuni haklarını veya sipariş için taahhüt edilen teslimat süresini tüketici aleyhine değiştiremez.

# **7\. Kargo Ücreti ve Kampanyalar**

Tüketiciden talep edilecek gönderim ücreti, varsa ücretsiz kargo eşiği, teslimat bölgesine bağlı ek ücretler ve kampanya koşulları, tüketicinin ödeme yükümlülüğü altına girmesinden önce açıkça gösterilir. Önceden bildirilmeyen bir nakliye veya teslimat bedeli tüketiciden talep edilmez. Ücretsiz kargo kampanyasının koşulları, kampanya süresi ve alt limitleri sipariş tarihinde geçerli olan açıklamalara göre uygulanır.

Cayma hakkı veya ayıplı mal nedeniyle yapılacak geri gönderimlere ilişkin masraflar, İade ve Cayma Politikası’nda ayrıca düzenlenir.

# **8\. Teslimat Süresi ve Otuz Günlük Üst Sınır**

Satıcı, kendisine ulaşan siparişi, tüketiciye önceden bildirilen ve sipariş teyidinde yer alan teslimat süresi içinde yerine getirir. Tüketicinin isteği veya kişisel ihtiyaçları doğrultusunda hazırlanan mallar hariç olmak üzere, mal satışlarında teslimat süresi her hâlükârda otuz günü geçemez.

Siparişin taahhüt edilen teslimat süresi içinde veya her hâlükârda uygulanabilir kanuni azami süre içinde yerine getirilmemesi hâlinde tüketici sözleşmeyi feshedebilir. Fesih hâlinde, teslimat masrafları dâhil tüketiciden tahsil edilen tüm ödemeler, fesih bildiriminin Satıcıya ulaştığı tarihten itibaren on dört gün içinde, 3095 sayılı Kanun uyarınca hesaplanan kanuni faiziyle birlikte ve tüketicinin satın alma sırasında kullandığı ödeme aracına uygun şekilde iade edilir.

# **9\. Parçalı Gönderim**

Bir siparişte yer alan ürünlerin farklı stok alanlarında bulunması veya güvenli taşıma amacıyla ayrı paketlenmesinin gerekmesi hâlinde sipariş, tüketiciye ek kargo bedeli yansıtılmaksızın birden fazla paket hâlinde gönderilebilir. Parçalı gönderimde, teknik olarak mümkün olduğu ölçüde her paket için ayrı takip bilgisi sağlanır.

Tek sipariş konusu malların ayrı ayrı teslim edilmesi hâlinde cayma hakkı süresi, tüketicinin veya tüketici tarafından belirlenen üçüncü kişinin son ürünü teslim aldığı gün başlar.

# **10\. Teslimat, Teslim Alan Kişi ve Takip Bilgileri**

Teslimat, tüketicinin bildirdiği adreste tüketiciye veya tüketici tarafından belirlenen üçüncü kişiye yapılır. Taşıyıcı, teslimat güvenliğini ve doğru kişiye teslimi sağlamak amacıyla, uygulanabilir olduğu ölçüde teslim kodu, imza veya benzeri doğrulama yöntemlerini kullanabilir. Kimlik ibrazının gerekli olduğu durumlarda doğrulamanın, yalnızca teslimin güvenli şekilde gerçekleştirilebilmesi amacıyla, ilgili mevzuata ve kişisel verilerin işlenmesinde amaçla bağlantılı, sınırlı ve ölçülü olma ilkesine uygun şekilde yapılması esastır. Açık bir hukuki dayanak bulunmadıkça kimlik belgesinin kopyası alınmaz ve teslimatın doğrulanması için gerekli olandan fazla kimlik bilgisi kaydedilmez. Kargo takip ekranındaki tahmini tarih bilgilendirme amaçlıdır; fiilî teslim tarihi, taşıyıcının teslim kaydı, teslim kodu, imza kaydı ve somut olayın diğer koşulları dikkate alınarak belirlenir.

Tüketici, teslimat adresi değişikliğini ürün taşıyıcıya verilmeden önce Satıcıya bildirmelidir. Taşıyıcıya teslimden sonra adres değişikliği garanti edilmez ve taşıyıcının kabulüne bağlıdır.

# **11\. Kayıp ve Hasar Riskinin Geçişi**

Satıcı, ürün tüketiciye veya tüketicinin taşıyıcı dışında belirlediği üçüncü kişiye fiilen teslim edilinceye kadar oluşan kayıp ve hasardan sorumludur. Ürünün fulfillment merkezinden anlaşmalı taşıyıcıya teslim edilmiş olması, tüketiciye teslim sayılmaz.

Tüketicinin Satıcının belirlediği taşıyıcı dışında başka bir taşıyıcıyla gönderim yapılmasını açıkça talep etmesi hâlinde, ürünün tüketicinin seçtiği taşıyıcıya tesliminden sonra oluşabilecek kayıp ve hasar bakımından Mesafeli Sözleşmeler Yönetmeliği’nin 17 nci maddesi uygulanır.

# **12\. Teslimat Sırasında Kontrol ve Hasarlı Paket**

Tüketicinin teslim sırasında paketin dış görünüşünü kontrol etmesi önerilir. Ezilme, yırtılma, açılma, ıslanma, kırılma veya ciddi deformasyon görülürse mümkünse taşıyıcı görevlisinden hasar tespit tutanağı istenmeli; paket, taşıyıcının sistemi elveriyorsa çekince kaydıyla teslim alınmalı veya teslim reddedilmelidir.

Hasar tespit tutanağının bulunmaması, tüketicinin ayıplı mal ve sözleşmeye aykırılık nedeniyle sahip olduğu kanuni hakları ortadan kaldırmaz. Tüketici, inceleme sürecini kolaylaştırmak amacıyla ürünün, dış ambalajın ve varsa hasarlı bölgenin fotoğraflarını, sipariş numarasını ve olaya ilişkin açıklamasını mümkün olan en kısa sürede Satıcıya iletebilir.

# **13\. Teslim Edilemeyen ve Satıcıya Dönen Siparişler**

Adresin yanlış veya eksik olması, alıcının adreste bulunmaması, teslim kodunun paylaşılmaması, teslimatın haklı neden olmaksızın kabul edilmemesi veya taşıyıcının saklama süresinde paketin teslim alınmaması hâlinde paket Satıcı adına fulfillment merkezine dönebilir.

Paketin teslim edilemeyerek Satıcıya dönmesi, tek başına tüketicinin cayma hakkını kullandığı veya sözleşmeyi feshettiği anlamına gelmez.

Paketin Satıcıya dönmesi hâlinde tüketiciyle iletişime geçilir. Yeniden gönderim, ancak tüketicinin açık talebi ve uygulanacak yeniden gönderim bedelini kabul etmesi üzerine gerçekleştirilir. İlk teslimatın gerçekleştirilememesinin tüketiciden kaynaklanması ve yeniden gönderim bedelinin uygulanabileceği hususunda tüketiciye sipariş öncesinde açık bilgilendirme yapılmış olması şartıyla, tüketiciden yalnızca yeniden gönderim için fiilen uygulanacak taşıma bedeli esas alınarak hesaplanan, vergiler dâhil toplam tutar talep edilebilir; bu tutar yeniden gönderim gerçekleştirilmeden önce tüketiciye bildirilir. Satıcı, fulfillment hizmet sağlayıcısı veya taşıyıcıdan kaynaklanan bir nedenle teslimatın gerçekleştirilememesi ya da tüketiciye teslimata ilişkin hatalı veya yetersiz bildirim yapılması hâlinde yeniden gönderim bedeli talep edilmez. Tüketici cayma hakkını kullanırsa, geri gönderim masrafları ve bedel iadesi bakımından İade ve Cayma Politikası ile ilgili mevzuat hükümleri uygulanır; teslim edilememe süreci ile cayma hakkının kullanılması birbirine karıştırılmaz.

# **14\. Stok Uyuşmazlığı ve İfanın İmkânsızlaşması**

Stok sistemleri eş zamanlı çalışmakla birlikte teknik hata veya sayım farkı ortaya çıkabilir. Malın yalnızca stokta bulunmaması, tek başına ifanın imkânsızlaşması sayılmaz. Sipariş konusu ürünün tedarik veya teslim edilmesi objektif olarak imkânsız hâle gelirse, bu durumun öğrenildiği tarihten itibaren tüketici üç gün içinde yazılı olarak veya kalıcı veri saklayıcısı ile bilgilendirilir ve teslimat masrafları dâhil tüketiciden tahsil edilen tüm ödemeler, bildirimin yapıldığı tarihten itibaren en geç on dört gün içinde, tüketicinin satın alma sırasında kullandığı ödeme aracına uygun şekilde iade edilir.

Satıcı, tüketicinin açık kabulü olmaksızın sipariş edilen ürün yerine farklı bir ürün göndermez. Eşdeğer ürün veya bekleme seçeneği sunulursa tüketici bunu kabul etmek zorunda değildir.

# **15\. Mücbir Sebep ve Operasyonel Kesintiler**

Doğal afet, salgın, savaş, yaygın ulaşım kesintisi, kamu otoritesi kararı, grev veya Satıcının makul kontrolü dışındaki benzeri olaylar teslimatı etkileyebilir. Satıcı, teslimatı etkileyen durum, gecikmenin öngörülen süresi ve mümkün olması hâlinde güncellenmiş teslimat takvimi hakkında tüketiciyi makul süre içinde bilgilendirir. Mücbir sebep kaydı, tüketicinin emredici kanuni haklarını, otuz günlük üst sınırı ve fesih hakkını ortadan kaldıracak şekilde yorumlanmaz.

# **16\. Kişisel Veriler**

Teslimat için gerekli olan ad-soyad, telefon, teslimat adresi, sipariş numarası ve paket bilgileri, siparişin hazırlanması, taşınması, teslimi, teslimat sorunlarının çözülmesi ve uyuşmazlıkların yönetilmesi amaçlarıyla fulfillment hizmet sağlayıcısına ve ilgili taşıyıcıya aktarılabilir. Kişisel verilerin işlenmesine ve aktarılmasına ilişkin ayrıntılı açıklamalar, American Creator Gizlilik ve Çerez Politikası ile İnternet Sitesi KVKK Aydınlatma Metni’nde yer almaktadır.

Teslimatın doğrulanması amacıyla kişisel veri işlenmesinin gerekli olduğu durumlarda, bu veriler teslimatın güvenli şekilde gerçekleştirilmesi, teslimin belgelendirilmesi, teslimatla ilgili başvuruların incelenmesi ve hukuki yükümlülüklerin yerine getirilmesi amaçlarıyla; ilgili mevzuata ve kişisel verilerin işlenmesinde amaçla bağlantılı, sınırlı ve ölçülü olma ilkesine uygun şekilde işlenir.

# **17\. İletişim, Uyuşmazlık ve Dil**

Teslimata ilişkin talepler info@american-creator.tr adresine, \+90 531 871 30 07 numaralı telefona veya Site üzerindeki iletişim kanallarına iletilebilir. Tüketici, yürürlükteki parasal sınırlar, görev ve yetki kuralları çerçevesinde yetkili Tüketici Hakem Heyetine veya dava şartı arabuluculuk hükümleri saklı kalmak kaydıyla görevli ve yetkili Tüketici Mahkemesine başvurabilir.

**Türkçe metin ile diğer dil sürümleri arasında farklılık bulunması hâlinde Türkçe metin esas alınır.**

**18\. Politikanın Güncellenmesi ve Yürürlük**

Satıcı, mevzuat değişiklikleri, teslimat süreçleri, hizmet sağlayıcıları veya operasyonel uygulamalarda meydana gelen değişiklikler doğrultusunda bu Politikayı güncelleyebilir.

Güncellenen Politika, internet sitesinde yayımlandığı tarihte yürürlüğe girer. Belgenin güncel sürüm ve yürürlük tarihi, dokümanın üst bölümünde gösterilir. Güncellemeler, tüketicinin güncelleme tarihinden önce kurulmuş sözleşmelerden doğan kazanılmış haklarını ortadan kaldıracak veya emredici mevzuat hükümlerini tüketici aleyhine sınırlayacak şekilde uygulanmaz.

# **19\. Taraflar Arası Sorumluluk Matrisi**

| Süreç | Fiilen Yürüten | Tüketiciye Karşı Asli Muhatap | Kontrol / Kanıt |
| ----- | ----- | ----- | ----- |
| Stok kabulü ve depolama | NİKAR GIDA TEKSTİL DIŞ TİCARET LİMİTED ŞİRKETİ | Satıcı | Stok hareketi, lot/ürün eşleştirmesi, sayım kayıtları |
| Toplama ve paketleme | NİKAR GIDA TEKSTİL DIŞ TİCARET LİMİTED ŞİRKETİ | Satıcı | Sipariş satırı, paketleme kontrolü, ağırlık ve gerektiğinde fotoğraf kaydı |
| Taşıyıcıya teslim | NİKAR GIDA TEKSTİL DIŞ TİCARET LİMİTED ŞİRKETİ | Satıcı | Manifesto, barkod ve taşıyıcı teslim taraması |
| Fiziksel taşıma ve dağıtım | Siparişe atanan taşıyıcı | Satıcı; taşıyıcının kendi kanuni sorumluluğu saklıdır | Takip olayları, teslim kodu/imza ve teslim edilememe nedeni |
| Hasarlı, eksik veya yanlış ürün bildiriminin incelenmesi  | Satıcı; gerekli hâllerde NİKAR ve taşıyıcıdan kayıt ve açıklama alınır  | Satıcı | Sipariş kaydı, ürün ve paket fotoğrafları, lot bilgisi, ağırlık kaydı, taşıyıcı teslim ve hasar kayıtları  |
| Teslimat gecikmesi, fesih ve bedel iadesi | Satıcı; ödeme işlemi ilgili banka veya ödeme hizmeti sağlayıcısı üzerinden gerçekleştirilir  | Satıcı | Bildirim zamanı, iade emri ve ödeme sonucu |

# **Hukuki Dayanaklar**

6502 sayılı Tüketicinin Korunması Hakkında Kanun, Mesafeli Sözleşmeler Yönetmeliği ve bu Yönetmelikte değişiklik yapan düzenlemeler, 3095 sayılı Kanuni Faiz ve Temerrüt Faizine İlişkin Kanun, 6698 sayılı Kişisel Verilerin Korunması Kanunu ile ilgili ikincil düzenlemeler.
`;
