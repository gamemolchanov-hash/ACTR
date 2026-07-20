/**
 * Canonical legal text — "Gizlilik ve Çerez Politikası" v3.0
 * (doc code KK-KVKK-GCP-2026-V3, effective 17.07.2026), FBG-394.
 *
 * The Turkish text is authoritative and MUST NOT be edited, shortened or
 * reformatted. It is shown verbatim on both /tr/legal/gizlilik and
 * /en/legal/gizlilik (the /en page adds a short "official text is in Turkish"
 * notice — see legal.gizlilik.enNotice). It lives in one module rather than the
 * i18n catalog because it is a single, non-translatable document; the UI chrome
 * (title, navLabel, notice) stays in messages/{en,tr}.json.
 *
 * `String.raw` keeps backslash escapes (`\.`, `\+`) byte-for-byte so the source
 * matches the client document; LegalMarkdown resolves them at render time.
 */
export const GIZLILIK_MARKDOWN = String.raw`
**AMERICAN CREATOR**

**GİZLİLİK VE ÇEREZ POLİTİKASI**

| Veri Sorumlusu | KIZIL KALİNA KOZMETİK ÜRÜNLERİ TİCARET İTHALAT VE İHRACAT LİMİTED ŞİRKETİ |
| :---- | :---- |
| **İnternet Sitesi** | https://american-creator.tr/ |
| **Doküman Kodu** | KK-KVKK-GCP-2026-V3 |
| **Sürüm** | 3.0 |
| **Yürürlük / Güncelleme** | 17.07.2026 |
| **Belge Sınıfı** | KAMUYA AÇIK |

# **1\. Amaç ve Kapsam**

İşbu Gizlilik ve Çerez Politikası (“Politika”), KIZIL KALİNA KOZMETİK ÜRÜNLERİ TİCARET İTHALAT VE İHRACAT LİMİTED ŞİRKETİ (“Şirket”) tarafından American Creator ticari markası altında işletilen https://american-creator.tr/ alan adlı elektronik ticaret platformunun kullanımı sırasında kişisel verilerin işlenmesine ve çerezler ile benzeri çevrim içi teknolojilerin kullanımına ilişkin genel esasları açıklar.

Politika; site ziyaretçileri, üyeler, müşteriler, potansiyel müşteriler, iletişim formu kullanıcıları, ürün hakkında talep veya şikâyette bulunan kişiler ve bunların kanuni temsilcileri bakımından uygulanır. Aydınlatma yükümlülüğü ile açık rıza süreçleri birbirinden ayrıdır. Açık rıza, yalnızca Kanunda yer alan diğer işleme şartlarının bulunmadığı ve rızanın özgür iradeyle verilebildiği işlemler için talep edilir.

# **2\. Tanımlar**

| Terim | Açıklama |
| ----- | ----- |
| Açık Rıza | Belirli bir konuya ilişkin, bilgilendirmeye dayanan ve özgür iradeyle açıklanan rıza. |
| İlgili Kişi | Kişisel verisi işlenen gerçek kişi. |
| Kişisel Veri | Kimliği belirli veya belirlenebilir gerçek kişiye ilişkin her türlü bilgi. |
| Özel Nitelikli Kişisel Veri | KVKK’nın 6 ncı maddesinde sayılan, daha yüksek koruma gerektiren veri kategorileri. |
| Veri İşleyen | Veri sorumlusunun verdiği yetkiye dayanarak onun adına kişisel veri işleyen gerçek veya tüzel kişi. |
| Veri Sorumlusu | Kişisel verilerin işleme amaç ve vasıtalarını belirleyen gerçek veya tüzel kişi. |
| Çerez | Bir internet sitesi tarafından terminal cihaza bırakılan veya cihazdan okunan küçük metin dosyası. |
| Tercih Merkezi | Zorunlu olmayan çerez kategorilerinin kabul, ret ve geri alma işlemlerinin yönetildiği arayüz. |

# **3\. Veri Sorumlusunun Kimliği**

| Bilgi | Açıklama |
| ----- | ----- |
| Ticaret Unvanı | KIZIL KALİNA KOZMETİK ÜRÜNLERİ TİCARET İTHALAT VE İHRACAT LİMİTED ŞİRKETİ |
| Ticari Marka | American Creator |
| MERSİS No | 0560146611100001 |
| Vergi Dairesi / VKN | Alanya Vergi Dairesi / 5601466111 |
| Ticaret Sicil No | 31978 — Alanya Ticaret ve Sanayi Odası |
| Merkez Adresi | Oba Mahallesi 225 Sokak Summer Park Sitesi B Blok No: 8B, İç Kapı No: 20, 07460 Alanya / Antalya, Türkiye |
| İnternet Sitesi | https://american-creator.tr/ |
| E-posta | info@american-creator.tr |
| Telefon | \+90 531 871 30 07 |

*info@american-creator.tr adresi Şirketin genel iletişim e-posta adresidir; kayıtlı elektronik posta (KEP) adresi olarak nitelendirilmez.*

# **4\. İlgili Kişi Grupları ve İşlenen Veri Kategorileri**

| İlgili Kişi Grubu | Veri Kategorileri | Başlıca Veri Unsurları |
| ----- | ----- | ----- |
| Ziyaretçi | İşlem güvenliği, cihaz ve çerez verileri | IP adresi, tarih-saat, tarayıcı/cihaz bilgisi, oturum ve çerez tercihleri. |
| Üye / Müşteri | Kimlik, iletişim, müşteri işlem, sipariş ve sözleşme | Ad-soyad, e-posta, telefon, teslimat/fatura adresi, üyelik ve sipariş bilgileri. |
| Ödeme Yapan / İade Alan Kişi | Finans ve işlem güvenliği | Ödeme sonucu, işlem referansı, iade için gerekli banka/hesap bilgisi; tam kart verisi Şirket tarafından tutulmaz. |
| Talep / Şikâyet Sahibi | Talep-şikâyet, hukuki işlem, görsel/işitsel | Mesaj içeriği, destek kayıtları, ilgilinin kendi isteğiyle gönderdiği fotoğraf veya belge. |
| Ürün Güvenliliği Bildirimi Yapan | Talep-şikâyet ve istisnai olarak özel nitelikli veri | Kozmetik ürünün istenmeyen etkisine ilişkin ilgilinin gönüllü olarak paylaştığı sağlık bilgisi. |
| Pazarlama İzni Veren | Pazarlama ve iletişim tercihleri | Ticari elektronik ileti onayı, kanal tercihi, izin/ret tarihi ve İYS kaydı. |

# **5\. Kişisel Verilerin Toplanma Yöntemleri**

Kişisel veriler; Site üzerindeki üyelik, sipariş, ödeme, iletişim, iade ve destek formları; çerez ve günlük kayıtları; e-posta, telefon ve mesajlaşma kanalları; iyzico ödeme bildirimleri; e-belge/muhasebe sistemleri; fulfillment, depo ve taşıma süreçlerinden gelen teslimat veya iade kayıtları üzerinden tamamen veya kısmen otomatik yollarla ya da bir veri kayıt sisteminin parçası olmak kaydıyla otomatik olmayan yollarla elde edilir.

# **6\. İşleme Amaçları ve Hukuki Sebepler**

| Veri / Süreç | İşleme Amaçları | KVKK Hukuki Sebebi |
| ----- | ----- | ----- |
| Üyelik ve hesap | Hesap oluşturma, kimlik doğrulama, hesap güvenliği, sipariş geçmişinin sunulması. | m.5/2-c sözleşmenin kurulması veya ifası; m.5/2-f meşru menfaat. |
| Sipariş ve satış | Siparişin alınması, ön bilgilendirme ve mesafeli satış kayıtlarının oluşturulması, müşteri hizmetleri. | m.5/2-c; m.5/2-ç hukuki yükümlülük; m.5/2-e hakkın tesisi, kullanılması veya korunması. |
| Ödeme | Ödeme oturumu oluşturulması, sonuç bilgisinin alınması, iade ve mutabakat. | m.5/2-c; m.5/2-ç; m.5/2-f. |
| Faturalandırma | e-Arşiv Fatura/e-Fatura süreçleri, muhasebe ve vergi yükümlülükleri. | m.5/2-ç; m.5/2-e. |
| Fulfillment ve kargo | Ürünün depodan hazırlanması, paketlenmesi, sevki, teslimatı; iadenin kabulü ve incelenmesi. | m.5/2-c; m.5/2-ç; m.5/2-e. |
| Güvenlik ve denetim | Yetkisiz erişimin, dolandırıcılığın ve kötüye kullanımın önlenmesi; olay inceleme. | m.5/2-f; somut olayda uygulanabilirse m.5/2-ç. |
| Talep ve şikâyet | Soruların cevaplanması, satış sonrası destek, uyuşmazlık yönetimi. | m.5/2-c; m.5/2-e; m.5/2-f. |
| Kozmetik ürün güvenliliği | İstenmeyen etkinin değerlendirilmesi ve yetkili makamlara bildirim yapılması. | m.6’da yer alan uygulanabilir işleme şartı; şart bulunmaması halinde ayrı açık rıza. |
| Ticari elektronik ileti | Kampanya ve ürün duyurularının izin verilen kanaldan gönderilmesi. | 6563 sayılı Elektronik Ticaretin Düzenlenmesi Hakkında Kanun ile Ticari İletişim ve Ticari Elektronik İletiler Hakkında Yönetmelik kapsamında alınan ticari elektronik ileti onayı. |
| Analitik ve pazarlama çerezleri | Site kullanımının ölçülmesi, reklam performansı ve kişiselleştirme. | m.5/1 açık rıza; çerez yerleştirilmeden önce kategori bazlı onay. |

# **7\. Kişisel Verilerin Aktarılması**

## **7.1. Yurt İçi Aktarım**

Kişisel veriler, amaçla bağlantılı ve sınırlı olmak üzere aşağıdaki alıcı gruplarına aktarılabilir:

* Ödeme işlemlerinin yürütülmesi için ödeme hizmeti sağlayıcıları ve bankalar.  
* e-belge, muhasebe ve mali müşavirlik süreçleri için Paraşüt dâhil olmak üzere e-belge/muhasebe hizmet sağlayıcıları ve mali müşavirler.  
* Sipariş hazırlama, depolama, iade inceleme ve teslimat için fulfillment/3PL işletmesi ile anlaşmalı taşıma/kargo hizmet sağlayıcıları.  
* Sunucu, bakım, siber güvenlik, e-posta/SMS ve müşteri destek hizmetleri sunan bilgi teknolojileri tedarikçileri.  
* Hukuki yükümlülük veya usulüne uygun talep halinde yetkili kamu kurumları, yargı mercileri, kolluk ve düzenleyici kuruluşlar.  
* Hakkın tesisi, kullanılması veya korunması için avukatlar, denetçiler ve danışmanlar.

Fulfillment/3PL işletmesi ve taşıyıcı, Şirketin talimatı doğrultusunda yürüttükleri sipariş/teslimat işlemleri bakımından veri işleyen sıfatıyla hareket eder. Kendi kanuni kayıt yükümlülükleri kapsamında bağımsız amaç belirledikleri sınırlı işlemler ayrıca değerlendirilir.

## **7.2. Yurt Dışına Aktarım**

Kişisel veriler, yurt dışında bulunan bir bulut, analitik, reklam, iletişim veya teknik destek sağlayıcısına ancak KVKK’nın 9 uncu maddesindeki şartlardan birinin sağlanması halinde aktarılır. Bu kapsamda yurt dışında bulunan barındırma (hosting), içerik dağıtım ağı (CDN), e-posta altyapısı, bulut, analiz, reklam, güvenlik ve teknik destek hizmet sağlayıcılarından yararlanılabilir. Düzenli aktarım bakımından yeterlilik kararı veya uygun güvence mekanizması (örneğin Kurul tarafından ilan edilen standart sözleşme) tesis edilir. Standart sözleşme kullanılması halinde Kuruma yapılması gereken bildirim süresi ve usulü ayrıca yerine getirilir. Açık rıza, düzenli ve sistematik aktarımın otomatik ikamesi olarak kullanılmaz.

| Şeffaflık İlkesiYurt dışına aktarım doğuran yeni bir sağlayıcı devreye alınmadan önce alıcı, ülke, veri kategorisi, aktarım amacı ve KVKK m.9 mekanizması tespit edilir; ilgili aydınlatma ve çerez envanteri güncellenir. |
| :---- |

# **8\. Ödeme, Faturalandırma, Fulfillment ve İade Süreçleri**

## **8.1. Ödeme**

Ödeme işlemleri iyzico altyapısı üzerinden yürütülür. Kart numarası, son kullanma tarihi ve güvenlik kodu gibi tam kart verileri Şirketin uygulama sunucularında saklanmaz. Şirket; sipariş kimliği, ödeme sonucu, işlem referansı, tutar, taksit/iade durumu ve mutabakat için gerekli sınırlı verileri işler.

## **8.2. Faturalandırma**

Fatura düzenlenmesi ve muhasebe kayıtlarının oluşturulması amacıyla kimlik, adres, sipariş ve vergiye ilişkin gerekli bilgiler Paraşüt ve uygulanabilir e-belge altyapısına aktarılabilir. İşleme, vergi ve ticaret mevzuatından doğan hukuki yükümlülüklerle sınırlıdır.

## **8.3. Fulfillment, Kargo ve İade**

Siparişin hazırlanması ve teslimatı için ad-soyad, telefon, teslimat adresi, sipariş numarası ve paket içeriğine ilişkin gerekli bilgiler fulfillment/3PL işletmesi ile taşıyıcıya aktarılır. Fulfillment hizmet sağlayıcısı, yalnızca siparişin hazırlanması, paketlenmesi, sevki, teslimatı ve iade süreçlerinin yürütülmesi için gerekli kişisel verilere erişebilir. İadeler fulfillment deposunda teslim alınabilir ve ürünün ambalaj, mühür, hijyen ve ayıp durumu yönünden incelenmesine ilişkin kayıtlar Şirkete iletilebilir. Bu süreçlerde amaçla bağlantılı, sınırlı ve ölçülü şekilde yalnızca işlemin yürütülmesi ve iade kararının oluşturulması için gerekli veriler işlenir.

# **9\. Kozmetik Ürün Şikâyetleri ve Özel Nitelikli Veriler**

İlgili kişinin bir kozmetik ürünün istenmeyen etkisine ilişkin sağlık bilgisi, fotoğraf veya tıbbi belge paylaşması halinde bu veriler, ayrı erişim yetkileri uygulanarak, veri minimizasyonu ilkesi gözetilerek ve yalnızca ürün güvenliliğinin değerlendirilmesi amacıyla işlenir. Sağlık verileri; kozmetik ürün güvenliliğine ilişkin bildirimlerin değerlendirilmesi, ilgili kişinin başvurusunun incelenmesi, Şirketin hukuki yükümlülüklerinin yerine getirilmesi, hakkın tesisi, kullanılması veya korunması ile gerektiğinde T.C. Sağlık Bakanlığı Türkiye İlaç ve Tıbbi Cihaz Kurumu (TİTCK) ve diğer yetkili kamu kurum ve kuruluşlarına yapılması zorunlu bildirimlerin gerçekleştirilmesi amacıyla, KVKK'nın 6 ncı maddesinde öngörülen ilgili işleme şartına dayanılarak işlenir. Kanunen gerekli işleme şartının bulunmadığı istisnai hâllerde, ilgili kişiden ayrıca açık rıza alınır. 

# **10\. Ticari Elektronik İletiler ve İYS**

Reklam ve pazarlama amaçlı e-posta, SMS, arama veya elektronik ileti, önceden alınmış geçerli onaya ve 6563 sayılı Kanun ile İYS düzenlemelerine uygun olarak gönderilir. Onay; satışın veya üyeliğin zorunlu koşulu değildir, önceden işaretlenmiş şekilde sunulmaz ve kullanıcı ret hakkını kolayca kullanabilir. İYS dışında alınan onaylar mevzuatta öngörülen sürede İYS’ye kaydedilir; ret talebinden sonra ticari ileti gönderimi mevzuatta öngörülen sürede durdurulur. Ticari elektronik ileti onayı ile KVKK kapsamında alınan açık rıza birbirinden bağımsız hukuki süreçlerdir. Bu süreçlere ilişkin aydınlatma metinleri, onay kayıtları, ispat mekanizmaları, versiyon bilgileri ve geri alma işlemleri ayrı olarak yönetilir.

# **11\. Çerezler ve Benzeri Teknolojiler**

Site; oturumun yürütülmesi, sepet ve güvenlik işlevlerinin sağlanması, tercihlerin hatırlanması ve kullanıcı onay verirse analitik veya pazarlama faaliyetlerinin yürütülmesi amacıyla çerezlerden yararlanabilir. Zorunlu olmayan çerezler, kullanıcının aktif ve kategori bazlı seçimi olmadan çalıştırılmaz.

| Kategori | Amaç | Varsayılan Durum | Hukuki Sebep |
| ----- | ----- | ----- | ----- |
| Zorunlu Çerezler | Oturum, sepet, CSRF koruması, ödeme ve güvenlik işlevleri. | Her zaman açık; hizmetin çalışması için gereklidir. | KVKK m.5/2-c ve/veya m.5/2-f; somut işleme göre m.5/2-ç. |
| Tercih / İşlevsel Çerezler | Dil, arayüz ve kullanıcının açıkça seçtiği işlevlerin hatırlanması. | Gerekli olmayan işlevler için kapalı. | Açık rıza veya kullanıcının açıkça talep ettiği işlev için uygun diğer şart. |
| Analitik ve Performans | Site kullanımının ve teknik performansın ölçülmesi. | Kapalı. | Açık rıza. |
| Pazarlama ve Hedefleme | Reklam, dönüşüm ölçümü ve yeniden hedefleme. | Kapalı. | Açık rıza. |

## **11.1. Temel Çerez Envanteri**

| Teknoloji / Çerez | Taraf | Amaç | Süre | Kategori |
| ----- | ----- | ----- | ----- | ----- |
| Laravel oturum çerezi (teknik adı yapılandırmaya göre değişebilir) | Birinci taraf | Oturumun, sepetin ve üyelik durumunun yürütülmesi. | Oturum veya yapılandırılmış kısa süre. | Zorunlu |
| XSRF-TOKEN veya eşdeğer CSRF çerezi | Birinci taraf | Sahte istek saldırılarına karşı form güvenliği. | Oturum veya yapılandırılmış kısa süre. | Zorunlu |
| Çerez tercih kaydı | Birinci taraf | Kabul, ret ve kategori tercihlerinin hatırlanması. | Azami 12 ay; politika değişikliğinde yenilenir. | Zorunlu |
| iyzico ödeme oturumu teknolojileri | Üçüncü taraf | Ödeme formunun güvenli yürütülmesi ve dolandırıcılığın önlenmesi. | Ödeme sağlayıcısının işlem süresi ve politikasına göre. | Zorunlu |
| Analitik sağlayıcı teknolojileri — yalnızca Tercih Merkezi’nde adı gösterilen ve onaylananlar | Birinci/üçüncü taraf | Kullanım ve performans ölçümü. | Tercih Merkezi’nde belirtilen süre. | Analitik |
| Reklam sağlayıcı teknolojileri — yalnızca Tercih Merkezi’nde adı gösterilen ve onaylananlar | Üçüncü taraf | Reklam performansı ve hedefleme. | Tercih Merkezi’nde belirtilen süre. | Pazarlama |

*Analitik veya pazarlama sağlayıcısı kullanılmadığı dönemde ilgili kategori ve sağlayıcı satırları Tercih Merkezi’nde gösterilmez. Sağlayıcı devreye alındığında gerçek çerez adı, alan adı, süre, amaç, taraf ve yurt dışı aktarım durumu teknik tarama ile envantere işlenir.*

## **11.2. Çerez Tercihlerinin Yönetimi**

* İlk katmanda “Tümünü Kabul Et”, “Tümünü Reddet” ve “Tercihleri Yönet” seçenekleri eşit erişilebilirlikte sunulur.  
* Zorunlu olmayan kategoriler önceden seçili değildir.  
* Siteyi kullanmaya devam etmek, sayfayı kaydırmak veya bannerı kapatmak açık rıza sayılmaz.  
* Kullanıcı tercihlerini dilediği zaman sayfadaki Çerez Tercihleri bağlantısından değiştirebilir ve rızasını verdiği kolaylıkla geri alabilir.  
* Tercih kaydı; kategori, belge/banner sürümü, tarih-saat ve asgari teknik ispat bilgisiyle tutulur.

# **12\. Saklama Süreleri**

| Kayıt Grubu | Saklama Kuralı | Süre Sonu İşlem |
| ----- | ----- | ----- |
| Sipariş, sözleşme, fatura ve ticari yazışmalar | İlgili kaydın tabi olduğu özel mevzuat süreleri uygulanır; ticari belge niteliğindeki kayıtlar bakımından TTK m.82 uyarınca 10 yıl, VUK kapsamındaki kayıtlar bakımından asgari 5 yıl dikkate alınır. | Silme, yok etme veya anonimleştirme; devam eden uyuşmazlık varsa hukuki muhafaza. |
| Mesafeli satış ve ön bilgilendirme kayıtları | Tüketici ve e-ticaret mevzuatında öngörülen süre ve ispat ihtiyacı boyunca. | İmha veya anonimleştirme. |
| Ticari elektronik ileti onay/ret kayıtları | Onayın geçerliliğinin sona ermesinden veya diğer kaydın oluşmasından itibaren 3 yıl. | İmha; devam eden uyuşmazlık varsa muhafaza. |
| Çerez tercih kayıtları | Tercih tarihinden itibaren azami 3 yıl; aktif tercih çerezi azami 12 ay. | İmha veya anonimleştirme. |
| Müşteri talep ve şikâyetleri | Talebin kapanmasından itibaren 3 yıl; ürün güvenliliği veya uyuşmazlık halinde uygulanabilir daha uzun süre. | İmha veya anonimleştirme. |
| Güvenlik ve erişim kayıtları | Risk, olay müdahalesi ve sistem gereksinimleriyle orantılı şirket saklama planı; olay/uyuşmazlık halinde hukuki sürenin sonuna kadar. | Döngüsel silme; hukuki muhafaza istisnası. |
| Üyelik hesabı | Hesap açık olduğu süre boyunca; hesap kapandıktan sonra sipariş ve kanuni kayıtlar ayrıştırılarak ilgili özel süre boyunca. | Hesap verilerinin silinmesi/anonimleştirilmesi; kanuni kayıtların sınırlı muhafazası. |

# **13\. Veri Güvenliği Tedbirleri**

Şirket, KVKK’nın 12 nci maddesi kapsamında riskle orantılı teknik ve idari tedbirleri uygular. Kamuya açık bu metin, doğrulanmamış ürün veya güvenlik özelliği taahhüdü içermez. Tedbir kategorileri başlıca şunlardır:

* Rol ve görev esaslı erişim, asgari yetki ve periyodik erişim gözden geçirmesi.  
* Web trafiğinde güncel TLS protokolleri ve güvenli kimlik bilgisi yönetimi.  
* Ödeme kartı verisinin Şirket sistemlerinden ayrıştırılması ve doğrudan ödeme sağlayıcısı üzerinden işlenmesi.  
* Uygulama, sistem ve güvenlik kayıtlarının izlenmesi; olay müdahale ve ihlal değerlendirme prosedürleri.  
* Yazılım güncelleme, bağımlılık yönetimi, yedekleme, geri dönüş ve iş sürekliliği kontrolleri.  
* Risk esaslı güvenlik değerlendirmeleri, zafiyet taramaları ve gerekli görülmesi halinde sızma testleri.  
* Veri işleyen tedarikçilerle gizlilik, güvenlik, alt işleyen, ihlal bildirimi, iade/imha ve denetim hükümlerinin sözleşmesel olarak düzenlenmesi.  
* Personel gizlilik yükümlülüğü, eğitim, fiziksel evrak ve erişim kontrolleri.

# **14\. Silme, Yok Etme ve Anonimleştirme**

İşleme sebebi ortadan kalkan kişisel veriler, resen veya ilgili kişinin talebi üzerine, uygulanabilir mevzuat ve Şirketin saklama-imha planı uyarınca silinir, yok edilir veya anonim hâle getirilir. Yedeklerde bulunan veriler, olağan yedek döngüsünde erişime kapalı tutularak üzerine yazılır veya güvenli şekilde yok edilir. Devam eden dava, inceleme veya hukuki yükümlülük bulunduğunda ilgili kayıtlar yalnızca bu amaçla sınırlı erişim altında muhafaza edilir.

# **15\. İlgili Kişinin Hakları ve Başvuru**

KVKK’nın 11 inci maddesi uyarınca ilgili kişiler; kişisel verilerinin işlenip işlenmediğini öğrenme, işlenmişse bilgi talep etme, işleme amacını ve amaca uygun kullanılıp kullanılmadığını öğrenme, yurt içi/yurt dışı alıcıları bilme, eksik veya yanlış verinin düzeltilmesini isteme, KVKK m.7 şartları kapsamında silme veya yok etme talep etme, bu işlemlerin alıcılara bildirilmesini isteme, münhasıran otomatik analiz sonucu aleyhe sonuca itiraz etme ve kanuna aykırı işleme nedeniyle zararın giderilmesini talep etme haklarına sahiptir.

Başvurular, Veri Sorumlusuna Başvuru Formu kullanılarak Oba Mahallesi 225 Sokak Summer Park Sitesi B Blok No: 8B, İç Kapı No: 20, 07460 Alanya / Antalya, Türkiye adresine şahsen veya noter aracılığıyla yazılı olarak; Şirkete daha önce bildirilen ve Şirket sisteminde kayıtlı bulunan e-posta adresinden info@american-creator.tr adresine; varsa ilan edilen KEP adresine, güvenli elektronik imzalı veya mobil imzalı olarak ya da mevzuatta öngörülen diğer yöntemlerle iletilebilir. Başvurular, niteliğine göre en kısa sürede ve en geç 30 gün içinde sonuçlandırılır. İşlemin ayrıca maliyet gerektirmesi halinde Kurulca belirlenen tarifedeki ücret uygulanabilir.

# **16\. Değişiklikler, Dil ve İletişim**

Politikanın güncel sürümü https://american-creator.tr/ üzerinde yayımlanır. Veri kategorisi, amaç, alıcı veya teknoloji değiştiğinde ilgili metinler işleme başlamadan önce güncellenir. Açık rızaya dayalı işlemlerde amaç veya kapsam esaslı biçimde değişirse yeni rıza alınır.

**Türkçe metin ile diğer dil sürümleri arasında farklılık bulunması hâlinde Türkçe metin esas alınır.**

İletişim: info@american-creator.tr  |  \+90 531 871 30 07  |  Oba Mahallesi 225 Sokak Summer Park Sitesi B Blok No: 8B, İç Kapı No: 20, 07460 Alanya / Antalya, Türkiye

## **Hukuki Dayanaklar**

* 6698 sayılı Kişisel Verilerin Korunması Kanunu, özellikle 4, 5, 6, 7, 8, 9, 10, 11, 12 ve 13 üncü maddeler.  
* Aydınlatma Yükümlülüğünün Yerine Getirilmesinde Uyulacak Usul ve Esaslar Hakkında Tebliğ.  
* Veri Sorumlusuna Başvuru Usul ve Esasları Hakkında Tebliğ.  
* Kişisel Verilerin Silinmesi, Yok Edilmesi veya Anonim Hale Getirilmesi Hakkında Yönetmelik.  
* Kişisel Verilerin Yurt Dışına Aktarılmasına İlişkin Usul ve Esaslar Hakkında Yönetmelik ve Kurum rehberleri.  
* Kişisel Verileri Koruma Kurumu Çerez Uygulamaları Hakkında Rehber.  
* 6563 sayılı Elektronik Ticaretin Düzenlenmesi Hakkında Kanun ile ticari elektronik ileti ve İYS düzenlemeleri.  
* 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği.  
* 6102 sayılı Türk Ticaret Kanunu ve 213 sayılı Vergi Usul Kanunu.  
* 5324 sayılı Kozmetik Kanunu ve uygulanabilir kozmetik ürün güvenliliği düzenlemeleri.
`;
