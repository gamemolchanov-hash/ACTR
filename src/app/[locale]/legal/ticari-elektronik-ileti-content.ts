/**
 * Canonical legal text — "Ticari Elektronik İleti Bilgilendirmesi ve Onay Metni"
 * v2.0 (doc code KK-ET-TEI-2026-V2, effective 21.07.2026), FBG-397.
 *
 * The Turkish text is authoritative and MUST NOT be edited, shortened or
 * reformatted. It is shown verbatim on both /tr/legal/ticari-elektronik-ileti
 * and /en/legal/ticari-elektronik-ileti (the /en page adds a short "official
 * text is in Turkish" notice — see legal.ticari_elektronik_ileti.enNotice). It
 * lives in one module rather than the i18n catalog because it is a single,
 * non-translatable document; the UI chrome (title, navLabel, notice) stays in
 * messages/{en,tr}.json.
 *
 * `String.raw` keeps backslash escapes byte-for-byte so the source matches the
 * client document; LegalMarkdown resolves them at render time:
 *   - `\.` in section numbers (`1\.`), `\+` in the phone number → literal `.`/`+`
 *   - `\_` inside the mustache placeholders (`{{ $consent\_at }}`,
 *     `{{ $sms\_opt\_out\_instruction }}`, `{{ $campaign\_url }}`,
 *     `{{ $campaign\_text }}`) → literal `_`, so the whole `{{ $consent_at }}`
 *     token stays visible on the page (§16, §18)
 *   - `\>` in "Hesabım \> İletişim Tercihleri" (§16) → literal `>`
 * The `☐` empty-checkbox glyphs (§15) are ordinary Unicode, not Markdown tokens,
 * and render as-is. The bold names of the other legal documents
 * (**Gizlilik ve Çerez Politikası**, …) are intentionally left as bold text, not
 * links — cross-document links are a separate task once all documents are live.
 *
 * The ONLY deviation from the client's docx→md export is inside §18: the three
 * footer examples arrived with the callout label glued to the footer text
 * (`E-posta footer KIZIL KALİNA…`, `Telefon araması "American Creator…`). Those
 * glue points are un-glued with `<br>` line breaks — no word is added, removed
 * or changed. §2 requisites already arrive as clean key-value rows in this
 * export, so nothing is glued there.
 */
export const TICARI_ELEKTRONIK_ILETI_MARKDOWN = String.raw`
**AMERICAN CREATOR**

**TİCARİ ELEKTRONİK İLETİ BİLGİLENDİRMESİ VE ONAY METNİ**

| Hizmet Sağlayıcı / Şirket | KIZIL KALİNA KOZMETİK ÜRÜNLERİ TİCARET İTHALAT VE İHRACAT LİMİTED ŞİRKETİ |
| :---- | :---- |
| **İnternet Sitesi** | https://american-creator.tr/ |
| **Doküman Kodu** | KK-ET-TEI-2026-V2 |
| **Sürüm** | 2.0 |
| **Yürürlük / Güncelleme** | 21.07.2026 |
| **Belge Sınıfı** | KAMUYA AÇIK |

# **BÖLÜM A — TİCARİ ELEKTRONİK İLETİ BİLGİLENDİRMESİ**

| Belgenin niteliği Bu bölüm bilgilendirme amacı taşır. Ticari elektronik ileti onayı, Bölüm B’de ayrı, isteğe bağlı ve kanal bazlı beyanlarla alınır. Üyelik Sözleşmesinin kabulü, KVKK aydınlatmasının sunulması veya alışveriş yapılması ticari ileti onayı sayılmaz. |
| :---- |

# **1\. Amaç ve Kapsam**

İşbu Ticari Elektronik İleti Bilgilendirmesi (“Bilgilendirme”), American Creator tarafından kampanya, indirim, yeni ürün, özel teklif, etkinlik, anket, kutlama ve marka tanıtımı amaçlarıyla gönderilebilecek ticari elektronik iletilerin kapsamını; onayın alınması, İleti Yönetim Sistemine (“İYS”) kaydedilmesi ve reddetme hakkının kullanılmasına ilişkin esasları açıklar.

Bilgilendirme; 6563 sayılı Elektronik Ticaretin Düzenlenmesi Hakkında Kanun, Ticari İletişim ve Ticari Elektronik İletiler Hakkında Yönetmelik ve İYS düzenlemeleri esas alınarak hazırlanmıştır. Kişisel verilerin işlenmesine ilişkin aydınlatma, Gizlilik ve Çerez Politikası ile ilgili KVKK metinlerinde ayrıca yapılır.

# **2\. Hizmet Sağlayıcının Kimliği**

| Ticaret Unvanı | KIZIL KALİNA KOZMETİK ÜRÜNLERİ TİCARET İTHALAT VE İHRACAT LİMİTED ŞİRKETİ |
| :---- | :---- |
| **Ticari Marka** | American Creator |
| **MERSİS No** | 0560146611100001 |
| **Vergi Dairesi / VKN** | Alanya Vergi Dairesi / 5601466111 |
| **Ticaret Sicil No** | 31978 — Alanya Ticaret ve Sanayi Odası |
| **Merkez Adresi** | Oba Mahallesi 225 Sokak Summer Park Sitesi B Blok No: 8B, İç Kapı No: 20, 07460 Alanya / Antalya, Türkiye |
| **E-posta** | info@american-creator.tr |
| **Telefon** | \+90 531 871 30 07 |
| **İnternet Sitesi** | https://american-creator.tr/ |

# **3\. Tanımlar**

| Terim | Açıklama |
| ----- | ----- |
| Alıcı | Ticari elektronik iletinin gönderildiği elektronik iletişim adresinin sahibi gerçek veya tüzel kişi. |
| Hizmet Sağlayıcı | Ticari elektronik iletiyi kendi mal, hizmet veya markası için gönderen Şirket. |
| Aracı Hizmet Sağlayıcı | Şirketin talimatıyla iletinin oluşturulması, gönderilmesi veya izin yönetimi için teknik altyapı sağlayan kuruluş. |
| Ticari Elektronik İleti | Mal veya hizmetlerin tanıtımı, pazarlanması ya da işletmenin tanınırlığının artırılması amacıyla elektronik ortamda gönderilen veri, ses veya görüntü içerikli ileti. |
| İYS | Ticari elektronik ileti onay ve ret bilgilerinin kaydedildiği ve alıcıların tercihlerini yönetebildiği ulusal İleti Yönetim Sistemi. |
| Onay | Belirli iletişim kanalında ticari elektronik ileti gönderilmesini kabul eden, önceden ve olumlu şekilde açıklanan irade beyanı. |
| Ret | Alıcının belirli bir iletişim kanalındaki ticari elektronik ileti onayını ücretsiz ve gerekçesiz olarak geri alması. |

# **4\. Ticari İleti Amaçları**

Geçerli onay bulunan kanallarda aşağıdaki amaçlarla ileti gönderilebilir:

• Kampanya, indirim, kupon, hediye ve promosyonların duyurulması.

• Yeni ürün, yeniden stok, koleksiyon, kategori veya hizmet tanıtımı.

• American Creator marka etkinlikleri, eğitimleri ve organizasyonlarının duyurulması.

• Müşteri memnuniyeti, ürün deneyimi ve tercih anketlerinin iletilmesi.

• Doğum günü veya benzeri kutlama ve temenni mesajlarıyla marka iletişimi kurulması.

İletinin içeriği, alıcının verdiği onayın amacı ve kanalıyla uyumlu olmalıdır. Onay, başka bir şirketin bağımsız pazarlama faaliyetleri için kullanılamaz.

# **5\. İletişim Kanalları ve Kanal Bazlı Tercih**

İYS’de izinler e-posta, mesaj ve arama kanalları bakımından ayrı ayrı yönetilir. Site üzerinde yalnızca fiilen kullanılan kanallar gösterilir:

| İYS / Site Kanalı | Örnek İletişim | Uygulama Kuralı |
| ----- | ----- | ----- |
| E-POSTA | Pazarlama e-postası ve e-bülten. | Ayrı onay kutusu; her e-postada tek tıklamayla ücretsiz abonelikten çıkma bağlantısı. |
| MESAJ | SMS; fiilen devreye alınırsa WhatsApp veya benzeri mesajlaşma kanalı. | Ayrı onay kutusu; mesaj kanalında ücretsiz ve kolay ret yöntemi. Kullanılan alt kanal açıkça belirtilir. |
| ARAMA | Canlı veya otomatik tanıtım araması. | Ayrı onay kutusu; aramanın başlangıcında hizmet sağlayıcı ve ticari amaç belirtilir, ret imkânı sunulur. |

SMS ve WhatsApp, Şirketin kendi sistemlerinde ayrı alt kanal tercihleri olarak yönetilebilir. Bununla birlikte, bu iletişim yöntemleri İYS’de tek bir “MESAJ” kanalı altında yönetildiğinden, herhangi bir mesaj gönderimi için hem İYS’de MESAJ kanalının onaylı olması hem de Şirket sistemlerinde ilgili alt kanalın — SMS veya WhatsApp — açık olması gerekir. Bu iki koşuldan herhangi birinin bulunmaması hâlinde ilgili alt kanaldan ticari elektronik ileti gönderilmez.

Push notification, WhatsApp veya başka bir kanal fiilen kullanılmıyorsa onay ekranında yer almaz. Yeni kanal devreye alınmadan önce Bilgilendirme, KVKK metinleri, İYS eşlemesi ve teknik ret akışı güncellenir.

# **6\. Onay Gerektirmeyen İşlemsel Bildirimler**

Mevcut üyelik, satın alma veya teslimat ilişkisinin yürütülmesi için gerekli olan aşağıdaki bildirimler, pazarlama amacı taşımamaları şartıyla ticari elektronik ileti onayından bağımsız olarak gönderilebilir:

• Üyelik oluşturma teyidi, e-posta/telefon doğrulaması, parola sıfırlama ve hesap güvenliği uyarıları.

• Sipariş alındı, ödeme sonucu, e-Arşiv Fatura/e-Fatura, kargoya teslim, teslimat, iade ve para iadesi bildirimleri.

• Ürün güvenliliği, geri çağırma, içerik veya kullanım uyarısı ve kanuni bilgilendirmeler.

• Üyenin başlattığı talep, şikâyet veya destek sürecine verilen yanıtlar.

Bu bildirimlere kampanya, indirim, ürün önerisi, çapraz satış veya marka özendirmesi eklenmez. İşlemsel ve pazarlama şablonları teknik olarak ayrı tutulur.

# **7\. Onayın Alınmasına İlişkin Esaslar**

• Onay, ticari ileti gönderilmeden önce Şirket tarafından veya mevzuata uygun şekilde İYS üzerinden alınır.

• Onay kutusu önceden işaretli olamaz; sessizlik, Siteyi kullanmaya devam etme, üyelik oluşturma veya sipariş verme onay sayılmaz.

• Onay; üyelik, satış, ödeme, indirimli fiyat veya temel hizmetten yararlanmanın ön koşulu yapılamaz.

• Her kanal için ayrı ve açık seçim sunulur. Kullanıcı yalnızca e-postayı, yalnızca mesajı veya yalnızca aramayı seçebilir.

• Elektronik onay kaydında, uygulanabildiği ölçüde, alıcının adı-soyadı veya müşteri/hesap tanımlayıcısı, ilgili elektronik iletişim adresi, seçilen kanal ve varsa alt kanal, marka, olumlu irade beyanı, onay kaynağı, gösterilen metnin sürümü, tarih-saat bilgisi ve gerektiğinde işlemin doğrulanmasına imkân sağlayacak teknik kayıtlar bulunur.

• Elektronik ortamda alınan onayın kaydedildiği bilgisi, reddetme imkânı da sunularak aynı gün içinde ilgili elektronik iletişim adresine iletilir.

• Alıcının e-posta adresine, telefonuna veya mesaj kanalına ticari elektronik ileti gönderilerek ilk kez onay talep edilemez.

# **8\. Ticari Elektronik İletinin İçeriği**

Gönderilen ticari elektronik ileti, aşağıdaki asgari unsurları içermelidir:

• İletinin başlığında veya içeriğinde Şirketin ticaret unvanı ve MERSİS numarası; sınırlı alanlı SMS gibi iletilerde en az MERSİS numarası.

• American Creator marka adı ve elektronik iletişim aracına uygun en az bir erişilebilir iletişim bilgisi.

• İletinin niteliği içerikten açıkça anlaşılmıyorsa SMS başlangıcında, e-posta konu satırında veya arama başlangıcında “KAMPANYA”, “TANITIM” veya benzeri belirleyici ifade.

• İndirim, hediye, yarışma veya promosyon varsa geçerlilik süresi ve yararlanma şartlarına açık erişim bağlantısı veya müşteri hizmetleri bilgisi.

• İletinin gönderildiği aynı kanalda, kolay ve ücretsiz bir ret/çıkış yöntemi.

# **9\. İYS Kaydı ve Operasyonel Yönetim**

Şirket, hizmet sağlayıcı sıfatıyla İYS’ye kayıt olur ve American Creator markası için kanal izinlerini yönetir. İYS dışında Site, çağrı merkezi veya diğer kanallardan alınan onay ve ret bilgileri en geç üç iş günü içinde İYS’ye kaydedilir veya güncellenir.

İleti gönderiminden önce ilgili kanalın İYS durumu kontrol edilir. İYS’de ret bulunan veya geçerli onayı bulunmayan gerçek kişi alıcılara pazarlama iletisi gönderilmez. İYS’de MESAJ kanalının ret durumunda olması, Şirketin yerel sistemlerinde kayıtlı SMS ve WhatsApp tercihlerinden bağımsız olarak, her iki mesaj alt kanalında da gönderimi engeller. Tacir veya esnaflara uygulanabilecek kanuni istisnalar, ret hakkı ve Şirketin risk politikası ayrıca değerlendirilir; American Creator tüketici odaklı listelerde onay esasını uygular.

İYS ile Şirket sistemleri arasında uyuşmazlık bulunması halinde, alıcı lehine daha kısıtlayıcı tercih uygulanır ve kayıtlar gecikmeksizin mutabık hâle getirilir.

# **10\. Reddetme Hakkı**

Alıcı, ticari elektronik ileti onayını istediği zaman, gerekçe göstermeden ve ücretsiz olarak geri alabilir. Ret bildirimi, bildirimin yapıldığı iletişim kanalındaki onayı geçersiz kılar. İYS üzerinden MESAJ kanalına ilişkin ret verilmesi hâlinde, Şirket sistemlerinde SMS ve WhatsApp ayrı alt tercihler olarak tutulsa dahi, bu ret her iki alt kanaldan yapılacak ticari elektronik ileti gönderimlerini de durdurur. E-posta veya arama kanalına ilişkin ret ise yalnızca ilgili kanala uygulanır.

• E-posta kanalında: Her pazarlama e-postasındaki “Abonelikten Çık” bağlantısı veya hesap tercihleri.

• Mesaj kanalında: İletide gösterilen ücretsiz kısa kod, ret anahtar kelimesi veya aynı mesajlaşma kanalındaki kolay ret işlevi.

• Arama kanalında: Görüşme sırasında ret beyanı, müşteri hizmetleri veya hesap tercihleri.

• İYS üzerinden: iys.org.tr, İYS uygulaması veya İYS’nin sunduğu diğer erişim kanalları.

Şirket, ret talebinin kendisine ulaşması üzerine ilgili iletişim adresini teknik olarak gönderim dışı bırakır. Ticari elektronik ileti gönderimi her hâlükârda ret bildiriminin ulaşmasını izleyen en geç üç iş günü içinde durdurulur ve gerekli güncellemeler aynı süre içinde İYS’ye bildirilir veya İYS ile eşitlenir.

# **11\. Kişisel Verilerin İşlenmesi**

Ticari ileti izinlerinin yönetimi için ad-soyad, e-posta adresi, telefon numarası, marka ve kanal tercihleri, onay/ret tarihi, onay kaynağı, metin sürümü ve ispat kayıtları işlenebilir. Ayrıntılı bilgi **Gizlilik ve Çerez Politikası** ile ilgili KVKK aydınlatma metinlerinde yer alır.

KVKK kapsamındaki kişisel veri işleme faaliyetleri ile ticari elektronik ileti onayı birbirinden bağımsız hukuki süreçlerdir. Ticari elektronik ileti onayı yalnızca 6563 sayılı Kanun kapsamında değerlendirilir. KVKK kapsamında açık rıza gerektiren veri işleme faaliyetleri için ise gerektiğinde ayrıca açık rıza alınır.

# **12\. Aracı Hizmet Sağlayıcılar ve Diğer Operasyon Tarafları**

Şirket, e-posta, SMS, çağrı veya İYS entegrasyonu için yetkili aracı hizmet sağlayıcılardan ve teknik tedarikçilerden yararlanabilir. Bu sağlayıcılar, Şirketin talimatıyla ve kendi kanuni yükümlülükleri çerçevesinde çalışır; onay kontrolü, güvenlik, ret uygulaması ve kayıtların korunmasına ilişkin sözleşmesel hükümler tesis edilir.

Fulfillment operatörü NİKAR GIDA TEKSTİL DIŞ TİCARET LİMİTED ŞİRKETİ ile anlaşmalı taşıyıcılar, üyelik veya sipariş süreçlerinde kendilerine iletilen iletişim bilgilerini bağımsız pazarlama amacıyla kullanamaz. Bu taraflar yalnızca sipariş hazırlama, teslimat, iade veya operasyonel bilgilendirme amacıyla ileti kurabilir; iletiye ürün tanıtımı ekleyemez.

Fiilen kullanılan hizmet sağlayıcılar, bunların kişisel verilerin korunması mevzuatı kapsamındaki rolleri, veri işleme yerleri ve varsa yurt dışı aktarım süreçleri, ilgili KVKK aydınlatma metinlerinde Şirketin güncel operasyonel yapısına uygun olarak açıklanır. Şirket, operasyonel yapısında meydana gelen değişiklikler doğrultusunda ilgili KVKK metinlerini gerektiğinde günceller.

# **13\. İspat ve Saklama Süresi**

Onayın usulüne uygun alındığını ve ret talebinin uygulandığını ispat yükümlülüğü, ilgili mevzuat çerçevesinde Şirkete ve varsa aracı hizmet sağlayıcıya aittir. Onay ve ret kayıtları, ilgili metin sürümü ve gerektiğinde ispat amacıyla kullanılabilecek teknik kayıtlarla birlikte bütünlüğü korunacak şekilde saklanır. Onay kayıtları, onayın geçerliliğinin sona erdiği tarihten; ticari elektronik iletiye ilişkin diğer kayıtlar ise kayıt tarihinden itibaren üç yıl süreyle saklanır. Devam eden şikâyet, inceleme veya uyuşmazlık bulunması halinde ilgili kayıtlar yalnızca bu amaçla ve gerekli süre boyunca hukuki muhafaza altında tutulabilir.

# **14\. Başvuru, Şikâyet ve İletişim**

İleti tercihleri Site hesabı, her iletideki ret yöntemi, müşteri hizmetleri, info@american-creator.tr veya İYS üzerinden yönetilebilir. Ticari elektronik ileti şikâyetleri, mevzuatta belirtilen usulle İYS/e-Devlet üzerinden veya yetkili Ticaret İl Müdürlüğüne yapılabilir. KVKK kapsamındaki talepler, ilgili aydınlatma metninde belirtilen kanallardan Şirkete iletilir.

İletişim: info@american-creator.tr | \+90 531 871 30 07 | Oba Mahallesi 225 Sokak Summer Park Sitesi B Blok No: 8B, İç Kapı No: 20, 07460 Alanya / Antalya, Türkiye.

Türkçe metin ile diğer dil sürümleri arasında farklılık bulunması hâlinde Türkçe metin esas alınır.

# **BÖLÜM B — TİCARİ ELEKTRONİK İLETİ ONAY BEYANLARI**

| Önemli Aşağıdaki seçimler birbirinden ve Üyelik Sözleşmesinden bağımsızdır. Hiçbiri önceden işaretli olamaz. Site yalnızca fiilen kullandığı kanalları gösterir. Kullanıcı hiçbir kutuyu seçmeden üyelik ve alışveriş işlemlerini tamamlayabilmelidir. |
| :---- |

# **15\. Kanal Bazlı Web Onay Metinleri**

☐ American Creator tarafından kampanya, indirim, yeni ürün, yeniden stok ve özel tekliflere ilişkin ticari elektronik iletilerin e-posta adresime gönderilmesini kabul ediyorum. Ticari Elektronik İleti Bilgilendirmesi’ni inceledim; onayımı dilediğim zaman ücretsiz olarak geri alabileceğimi biliyorum.

☐ American Creator tarafından kampanya, indirim, yeni ürün, yeniden stok ve özel tekliflere ilişkin ticari elektronik iletilerin cep telefonuma mesaj (SMS) yoluyla gönderilmesini kabul ediyorum. Ticari Elektronik İleti Bilgilendirmesi’ni inceledim; onayımı dilediğim zaman ücretsiz olarak geri alabileceğimi biliyorum.

☐ American Creator tarafından kampanya, indirim, yeni ürün ve özel tekliflere ilişkin ticari elektronik ileti amacıyla telefonla aranmayı kabul ediyorum. Ticari Elektronik İleti Bilgilendirmesi’ni inceledim; onayımı dilediğim zaman ücretsiz olarak geri alabileceğimi biliyorum.

*WhatsApp veya başka bir mesajlaşma kanalı fiilen kullanılacaksa, kullanıcıya SMS’ten ayrı gösterilecek aşağıdaki ilave seçim kullanılabilir:*

☐ American Creator tarafından kampanya, indirim, yeni ürün ve özel tekliflere ilişkin ticari elektronik iletilerin WhatsApp hesabıma gönderilmesini kabul ediyorum. Bu seçimin İYS’de “MESAJ” kanalıyla yönetileceğini ve onayımı ücretsiz olarak geri alabileceğimi biliyorum.

# **16\. Aynı Gün Gönderilecek Onay Teyit Metinleri**

| Kanal | Hazır Metin |
| ----- | ----- |
| E-posta konu satırı | Ticari Elektronik İleti Tercihiniz Kaydedildi |
| E-posta gövdesi | American Creator için e-posta kanalındaki ticari elektronik ileti onayınız {{ $consent\_at }} tarihinde kaydedilmiştir. Tercihinizi Hesabım \> İletişim Tercihleri, her pazarlama e-postasındaki “Abonelikten Çık” bağlantısı veya İYS üzerinden ücretsiz olarak değiştirebilirsiniz. |
| SMS | American Creator: Mesaj kanalındaki ticari elektronik ileti onayınız kaydedildi. Ücretsiz ret: {{ $sms\_opt\_out\_instruction }} veya İYS. MERSİS: 0560146611100001 |
| Arama tercihi | American Creator için arama kanalındaki ticari ileti tercihiniz kaydedildi. Tercihinizi Hesabım, müşteri hizmetleri veya İYS üzerinden ücretsiz değiştirebilirsiniz. |

# **17\. Tercih Değişikliği ve Ret Sonrası Kullanıcı Mesajları**

| İşlem | Kullanıcıya Gösterilecek Mesaj |
| ----- | ----- |
| E-posta onayı verildi | E-posta ileti tercihiniz kaydedildi. |
| Mesaj onayı verildi | Mesaj ileti tercihiniz kaydedildi. |
| Arama onayı verildi | Arama ileti tercihiniz kaydedildi. |
| Bir kanal kapatıldı | Seçtiğiniz kanaldaki ticari ileti onayınız geri alındı. Gönderimler en geç üç iş günü içinde durdurulacaktır. |
| Tüm kanallar kapatıldı | Tüm ticari elektronik ileti tercihleriniz ret olarak kaydedildi. İşlemsel ve kanuni bildirimler pazarlama içermeksizin devam edebilir. |
| Kayıt hatası | Tercihiniz kaydedilemedi. Lütfen tekrar deneyin veya info@american-creator.tr üzerinden bize ulaşın. |

# **18\. Gönderim Şablonlarında Zorunlu Alt Bilgi**

E-posta alt bilgisi örneği:

| E-posta footer<br>KIZIL KALİNA KOZMETİK ÜRÜNLERİ TİCARET İTHALAT VE İHRACAT LİMİTED ŞİRKETİ | MERSİS: 0560146611100001 | info@american-creator.tr | Bu e-postayı artık almak istemiyorsanız Abonelikten Çık bağlantısını kullanabilirsiniz. İletişim tercihlerinizi İYS üzerinden de yönetebilirsiniz. |
| :---- |

SMS yapısı örneği:

| SMS KAMPANYA | American Creator: {{ $campaign\_text }} Koşullar: {{ $campaign\_url }} Ret: {{ $sms\_opt\_out\_instruction }} MERSİS: 0560146611100001 |
| :---- |

Arama başlangıç metni örneği:

| Telefon araması<br>“American Creator adına KIZIL KALİNA KOZMETİK ÜRÜNLERİ TİCARET İTHALAT VE İHRACAT LİMİTED ŞİRKETİ tarafından kampanya bilgilendirmesi için arıyoruz. Bu kanaldaki ticari ileti izninizi görüşme sırasında veya İYS üzerinden geri alabilirsiniz.” |
| :---- |

# **Hukuki Dayanaklar**

• 6563 sayılı Elektronik Ticaretin Düzenlenmesi Hakkında Kanun.

• Ticari İletişim ve Ticari Elektronik İletiler Hakkında Yönetmelik, özellikle 5, 6, 7, 8, 9, 10, 10/A, 11, 12 ve 13 üncü maddeler.

• Ticari Elektronik İleti Yönetim Sistemi Entegratörleri Hakkında Tebliğ.

• 6698 sayılı Kişisel Verilerin Korunması Kanunu ve Kişisel Verileri Koruma Kurulunun 18.02.2026 tarihli ve 2026/347 sayılı İlke Kararı.

• Ticaret Bakanlığı ve İleti Yönetim Sistemi resmî uygulama açıklamaları.
`;
