/**
 * Canonical legal text — "Kişisel Verilerin İşlenmesine İlişkin Aydınlatma
 * Metni" v3.0 (doc code KK-KVKK-AM-2026-V3, effective 22.07.2026), FBG-454.
 *
 * The Turkish text is authoritative and MUST NOT be edited, shortened or
 * reformatted. It is shown verbatim on both /tr/legal/kvkk and /en/legal/kvkk
 * (the /en page adds a short "official text is in Turkish" notice — see
 * legal.kvkk.enNotice). It lives in one module rather than the i18n catalog
 * because it is a single, non-translatable document; the UI chrome (title,
 * navLabel, notice) stays in messages/{en,tr}.json.
 *
 * `String.raw` keeps backslash escapes (`\|`, `\.`) byte-for-byte so the
 * source matches the client document; LegalMarkdown resolves them at render
 * time.
 *
 * Three deviations from the client's docx→md export, none changing a word:
 *  - the "Belgenin Niteliği" HTML `<table>` callout becomes a header-only pipe
 *    table (as the gizlilik/iade callouts do);
 *  - the three `<u>…</u>` cross-references become Markdown links: the KVKK
 *    başvuru form to its published PDF (/legal/kvkk-basvuru-formu.pdf), and the
 *    Açık Rıza / Ticari Elektronik İleti texts to their pages. Page links are
 *    written as bare `/legal/…` hrefs; LegalMarkdown's `locale` prop (the shared
 *    FBG-453 mechanism) prefixes them with the active locale at render time, so
 *    the reader stays on /tr or /en; the PDF is a static file and takes no locale.
 *  - the "Hukuki Dayanaklar" blockquote list becomes `* ` bullets.
 */
export const KVKK_MARKDOWN = String.raw`
**AMERICAN CREATOR**

**KİŞİSEL VERİLERİN İŞLENMESİNE İLİŞKİN AYDINLATMA METNİ**

| **Veri Sorumlusu** | KIZIL KALİNA KOZMETİK ÜRÜNLERİ TİCARET İTHALAT VE İHRACAT LİMİTED ŞİRKETİ |
|----|----|
| **İnternet Sitesi** | https://american-creator.tr/ |
| **Doküman Kodu** | KK-KVKK-AM-2026-V3 |
| **Sürüm** | 3.0 |
| **Yürürlük / Güncelleme** | 22.07.2026 |
| **Belge Sınıfı** | KAMUYA AÇIK |

| Belgenin Niteliği Bu metin KVKK madde 10 kapsamındaki bilgilendirme yükümlülüğünü yerine getirir. Herhangi bir açık rıza veya sözleşme kabulü talep etmez. Açık rıza gerektiren faaliyetler ayrı metin ve ayrı kullanıcı işlemleriyle yönetilir. |
| :---- |

# 1. Veri Sorumlusunun Kimliği

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

info@american-creator.tr Şirketin genel iletişim adresidir. Şirkete daha önce bildirilmiş ve sistemde kayıtlı e-posta adresinden yapılacak başvurular bu adrese iletilebilir; bu adres kayıtlı elektronik posta (KEP) adresi olarak nitelendirilmez.

# 2. Kapsam ve İlgili Kişi Grupları

Bu Aydınlatma Metni; Site ziyaretçileri, üyeler, müşteriler, ödeme yapan veya iade alan kişiler, iletişim/talep/şikâyet sahipleri, kozmetik ürün güvenliliği bildirimi yapan kişiler, kampanya katılımcıları ve bunların kanuni temsilcileri bakımından uygulanır.

Kişisel veriler; Site ziyareti, üyelik, sipariş, ödeme, faturalandırma, fulfillment, teslimat, iade, müşteri hizmetleri, ürün şikâyeti, ticari ileti tercihi ve çerez yönetimi süreçleriyle sınırlı olarak işlenir. Şirketin işleme amaçları değişirse yeni faaliyet başlamadan önce ilgili kişiye ayrıca aydınlatma yapılır.

# 3. İşlenen Kişisel Veri Kategorileri

| **Veri Kategorisi** | **Başlıca Veri Unsurları** |
|----|----|
| **Kimlik** | Ad-soyad; fatura veya kanuni işlem için zorunlu olduğunda T.C. kimlik numarası, yabancı kimlik/pasaport veya vergi bilgisi. |
| **İletişim** | E-posta, telefon, teslimat ve fatura adresi, iletişim tercihleri. |
| **Müşteri İşlem** | Üyelik, sepet, sipariş, ürün, kampanya, fatura, teslimat, iade, talep ve şikâyet kayıtları. |
| **Finans** | Ödeme yöntemi, işlem sonucu/referansı, iade ve mutabakat bilgileri; tam kart verisi Şirket sistemlerinde tutulmaz. |
| **İşlem Güvenliği** | IP adresi, tarih-saat, oturum, cihaz/tarayıcı bilgisi, güvenlik ve hata kayıtları, çerez tercih kaydı. |
| **Tercihler (Hesap İşlevleri)** | Kullanıcının talebi doğrultusunda oluşturduğu favoriler, tercihleri ve hesap ayarları. |
| **Davranış Analitiği** | Site kullanım bilgileri, ürün görüntüleme ve alışveriş eğilimleri; hizmetlerin geliştirilmesi, analiz ve istatistik amaçlarıyla işlenen veriler. |
| **Pazarlama ve Profilleme** | Kampanya tercihleri, iletişim kanal izinleri ve açık rıza bulunması hâlinde kişiselleştirilmiş öneri ve pazarlama segmentasyonu için kullanılan veriler. |
| **Hukuki İşlem** | Başvuru, uyuşmazlık, resmî makam talebi, savunma ve delil kayıtları. |
| **Görsel/İşitsel** | İlgili kişinin gönüllü olarak gönderdiği ürün/ambalaj fotoğrafı, video veya belge; çağrı kaydı yalnız fiilen uygulanır ve ayrıca aydınlatılır. |
| **Özel Nitelikli Veri** | Kozmetik ürün istenmeyen etkisi kapsamında ilgilinin gönüllü paylaştığı sağlık bilgisi veya tıbbi belge; yalnız KVKK m.6’daki uygun şartla ve gerekli ek tedbirlerle. |

T.C. kimlik numarası ve kimlik belgesi görüntüsü, daha az müdahaleci yöntem yeterliyse talep edilmez. Kimlik fotokopisi rutin üyelik veya sipariş koşulu değildir.

# 4. Kişisel Verilerin Toplanma Yöntemleri ve Kaynakları

Kişisel veriler; üyelik, sipariş, ödeme, iletişim, iade ve başvuru formları; e-posta, telefon ve mesajlaşma kanalları; çerez tercihleri ve güvenlik kayıtları; iyzico işlem bildirimleri; e-belge/muhasebe sistemleri; fulfillment, depo ve taşıyıcı teslimat/iade kayıtları üzerinden tamamen veya kısmen otomatik yollarla ya da bir veri kayıt sisteminin parçası olmak kaydıyla otomatik olmayan yollarla elde edilir.

Kişisel veri ilgili kişiden elde edilmezse, KVKK ve Aydınlatma Tebliği uyarınca makul sürede; iletişim amacıyla kullanılacaksa ilk iletişimde; aktarılacaksa en geç ilk aktarım anında aydınlatma yapılır.

# 5. İşleme Amaçları ve Hukuki Sebepler

| **Süreç** | **Amaç** | **KVKK Hukuki Sebebi** |
|----|----|----|
| **Site ve hesap** | Sitenin çalışması, üyelik oluşturma, kimlik doğrulama, hesap güvenliği ve sipariş geçmişinin sunulması. | KVKK m.5/2-c; güvenlik için m.5/2-f. |
| **Sipariş ve satış** | Siparişin alınması, Ön Bilgilendirme ve Mesafeli Satış kayıtlarının oluşturulması, ürünün hazırlanması ve satış sonrası destek. | m.5/2-c; m.5/2-ç; m.5/2-e. |
| **Ödeme** | Ödeme oturumu, işlem sonucu, iade, mutabakat, dolandırıcılığın önlenmesi. | m.5/2-c; m.5/2-ç; m.5/2-f. |
| **Faturalandırma** | e-Arşiv Fatura/e-Fatura, muhasebe, vergi ve ticari kayıt yükümlülükleri. | m.5/2-ç; m.5/2-e. |
| **Fulfillment ve kargo** | Depolama, toplama, paketleme, sevk, teslim, teslimat kanıtı, iade kabulü ve ön inceleme. | m.5/2-c; m.5/2-ç; m.5/2-e. |
| **Talep ve şikâyet** | Soruların cevaplanması, müşteri desteği, uyuşmazlık ve kalite yönetimi. | m.5/2-c; m.5/2-e; m.5/2-f. |
| **Güvenlik ve denetim** | Yetkisiz erişim, sahte işlem ve kötüye kullanımın önlenmesi; olay inceleme ve sistem bütünlüğü. | m.5/2-f; uygulanabilir hukuki yükümlülük varsa m.5/2-ç. |
| **Ticari elektronik ileti** | Kampanya ve tanıtım iletilerinin izin verilen kanal üzerinden gönderilmesi, onay/ret ve İYS kayıtlarının yönetimi. | 6563 sayılı Kanun kapsamında alınan ticari elektronik ileti onayı; kişisel verilerin işlenmesi bakımından KVKK m.5/1 kapsamında ilgili kişinin açık rızası. |
| **Pazarlama ve Profilleme** | Kullanıcı tercihleri ve alışveriş eğilimlerine göre kişiselleştirilmiş öneri/segmentasyon. | Yalnız ayrı açık rıza bulunduğunda m.5/1. |
| **Çerezler** | Zorunlu işlevler; kullanıcının seçimi varsa işlevsel, analitik veya pazarlama faaliyetleri. | Zorunlu işlemlerde m.5/2-c/f; zorunlu olmayanlarda açık rıza. |
| **Kozmetik ürün güvenliliği** | İstenmeyen etkinin değerlendirilmesi, risk yönetimi, geri çağırma ve yetkili makama bildirim. | Sağlık verileri bakımından KVKK m.6'da öngörülen uygulanabilir işleme şartı kapsamında; genel nitelikli kişisel veriler bakımından ise KVKK m.5/2-ç, m.5/2-e veya m.5/2-f kapsamında işlenir. İlgili işleme şartının bulunmadığı istisnai hâllerde ayrıca açık rıza alınır. |

# 6. Kişisel Verilerin Aktarılması

| **Alıcı Grubu** | **Aktarım Amacı** | **Rol / Sınır** |
|----|----|----|
| **İyzi Ödeme ve Elektronik Para Hizmetleri A.Ş. ve bankalar** | Ödeme, 3D Secure, dolandırıcılık önleme, iade ve mutabakat. | Ödeme kuruluşu kendi 6493 kapsamındaki yükümlülükleri bakımından bağımsız veri sorumlusu olarak da hareket eder. |
| **NİKAR GIDA TEKSTİL DIŞ TİCARET LİMİTED ŞİRKETİ** | Depolama, sipariş hazırlama, paketleme, sevk, iade kabulü ve ambalaj/hijyen/ayıp ön incelemesi. | Satıcı talimatıyla yürütülen süreçlerde veri işleyen; kendi zorunlu kanuni kayıtları varsa sınırlı bağımsız rol ayrıca değerlendirilir. |
| **Anlaşmalı taşıyıcı/kargo şirketi** | Teslimat, takip, teslim kanıtı, kayıp/hasar ve iade taşıması. | Teslimat talimatları kapsamında veri işleyen; taşıma mevzuatından doğan zorunlu kayıtlarında bağımsız veri sorumlusu olabilir. |
| **Paraşüt ve e-belge/muhasebe sağlayıcıları; mali müşavir** | Fatura, muhasebe, vergi ve mali raporlama. | Hizmetin niteliğine göre veri işleyen veya kendi mesleki yükümlülüklerinde bağımsız veri sorumlusu. |
| **Türkiye'de bulunan bilgi teknolojileri, barındırma, e-posta/SMS ve destek sağlayıcıları** | Sistem işletimi, barındırma, güvenlik, yedekleme, bildirim ve destek. | Sözleşme ve talimatlar çerçevesinde veri işleyen. |
| **Avukatlar, denetçiler, danışmanlar** | Hakkın tesisi, kullanılması, korunması, denetim ve danışmanlık. | Kendi mesleki yükümlülükleri kapsamında bağımsız veri sorumlusu olabilir. |
| **Yetkili kamu kurumları ve yargı mercileri** | Kanuni talepler, denetim, vergi, kolluk, tüketici ve ürün güvenliliği süreçleri; gerektiğinde TİTCK. | Hukuki yükümlülük ve hakkın tesisi/korunması. |

Fulfillment operatörü ve taşıyıcıya yalnız siparişin hazırlanması, teslimi ve iadesi için gerekli ad-soyad, telefon, adres, sipariş numarası, ürün/paket, teslimat ve iade bilgileri aktarılır. Bu tarafların verileri bağımsız pazarlama için kullanmasına izin verilmez.

# 7. Yurt Dışına Kişisel Veri Aktarımı

Şirket, kişisel verileri yurt dışına yalnızca gerekli olması ve uygulanabilir mevzuatın izin verdiği hâllerde aktarabilir. Böyle bir aktarımın söz konusu olması durumunda aktarım, 6698 sayılı Kanun'un 9 uncu maddesinde öngörülen şartlara uygun olarak gerçekleştirilir. Aktarımın niteliğine göre ilgili kişiler, aktarımın amacı, alıcı grubu ve uygulanacak hukuki güvence hakkında ayrıca bilgilendirilir.

# 8. Saklama Süreleri

| **Kayıt Grubu** | **Saklama Kuralı** |
|----|----|
| **Sipariş, sözleşme ve ticari yazışmalar** | İlgili kaydın tabi olduğu özel süre; ticari belge niteliğindekiler TTK m.82 kapsamında 10 yıl, vergi kayıtları VUK m.253 kapsamında en az 5 yıl. |
| **Ön bilgilendirme ve mesafeli satış kayıtları** | Yönetmelik kapsamındaki belge ve bilgilerin saklanması için en az 3 yıl; daha uzun ticari/vergi süresi varsa o süre. |
| **Üyelik hesabı** | Hesap açık olduğu sürece; kapanıştan sonra kanuni sipariş/fatura kayıtları ayrıştırılarak ilgili özel süre boyunca. |
| **Ticari ileti onay/ret kayıtları** | Onayın sona ermesinden veya diğer kaydın oluşmasından itibaren 3 yıl. |
| **Çerez tercih ve açık rıza ispat kayıtları** | Aktif tercih çerezi azami 12 ay; ispat kaydı tercih/rızanın sona ermesinden itibaren 3 yıl. |
| **Müşteri talep ve şikâyetleri** | Talebin kapanmasından itibaren kural olarak 3 yıl; uyuşmazlık veya ürün güvenliliği halinde uygulanabilir daha uzun süre. |
| **KVKK başvuruları** | Başvurunun sonuçlanmasından itibaren kural olarak 3 yıl; devam eden şikâyet/uyuşmazlık varsa hukuki muhafaza süresince. |
| **Güvenlik ve erişim kayıtları** | Risk ve sistem gereksinimleriyle orantılı şirket saklama-imha planı; olay/uyuşmazlık halinde hukuki muhafaza süresince. |

İşleme sebebi ortadan kalkan veriler, KVKK ve ilgili Yönetmelik uyarınca silinir, yok edilir veya anonim hale getirilir. Devam eden dava, denetim veya hukuki yükümlülük varsa kayıt yalnız bu amaçla, erişimi sınırlandırılarak muhafaza edilir.

# 9. Veri Güvenliği

Şirket, KVKK’nın 12 nci maddesi kapsamında riskle orantılı teknik ve idari tedbirler uygular. Tedbir kategorileri; rol ve görev esaslı erişim, asgari yetki, kimlik bilgisi yönetimi, güncel TLS ile aktarım güvenliği, ödeme kartı verisinin Şirket sistemlerinden ayrıştırılması, uygulama ve olay kayıtlarının izlenmesi, yazılım/bağımlılık güncellemeleri, yedekleme ve iş sürekliliği, tedarikçi sözleşmeleri, ihlal müdahalesi, personel gizliliği ve eğitimini içerir.

Kamuya açık bu metin belirli bir güvenlik ürünü veya mutlak güvenlik garantisi vermez. İlgili kişinin hesap şifresini gizli tutması ve yetkisiz kullanım şüphesini gecikmeksizin bildirmesi gerekir.

# 10. İlgili Kişinin Hakları ve Başvuru

İlgili kişiler KVKK’nın 11 inci maddesi kapsamındaki haklarını kullanabilir. Talepler; yazılı olarak merkez adresine, güvenli elektronik veya mobil imzalı belgeyle, Şirkete daha önce bildirilmiş ve sistemde kayıtlı e-posta adresinden info@american-creator.tr adresine veya mevzuatta öngörülen diğer yöntemlerle iletilebilir.

Başvurular niteliğine göre en kısa sürede ve en geç otuz gün içinde sonuçlandırılır. İşlemin ayrıca maliyet gerektirmesi halinde Kurulca belirlenen tarifedeki ücret uygulanabilir. Ayrıntılı usul ve zorunlu başvuru bilgileri [KVKK İlgili Kişi Başvuru Formu](/legal/kvkk-basvuru-formu.pdf)’nda açıklanır.

# 11. Açık Rıza, Ticari İleti ve Çerez Süreçlerinin Ayrılığı

Bu Aydınlatma Metninin sunulması veya okunduğuna ilişkin teknik kaydın tutulması açık rıza değildir. Kişiselleştirilmiş profilleme veya özel nitelikli veri işleme için açık rıza gerekiyorsa ayrı [Açık Rıza Metni](/legal/acik-riza) ve ayrı beyan kullanılır. Ticari elektronik ileti onayı, [Ticari Elektronik İleti Bilgilendirmesi ve Onay Metni](/legal/ticari-elektronik-ileti) kapsamında kanal bazında alınır. Zorunlu olmayan çerezler ise Çerez Tercih Merkezi üzerinden kategori bazında yönetilir.

# 12. Güncellemeler, Dil ve İletişim

Veri kategorisi, işleme amacı, hukuki sebep, alıcı grubu veya teknoloji değiştiğinde ilgili metin işleme başlamadan önce güncellenir. Güncel sürüm Site üzerinden yayımlanır. Türkçe metin ile diğer dil sürümleri arasında farklılık bulunması halinde Türkçe metin esas alınır.

İletişim: info@american-creator.tr \| +90 531 871 30 07 \| Oba Mahallesi 225 Sokak Summer Park Sitesi B Blok No: 8B, İç Kapı No: 20, 07460 Alanya / Antalya, Türkiye

# Hukuki Dayanaklar

* 6698 sayılı Kişisel Verilerin Korunması Kanunu, özellikle 4-13 üncü maddeler.
* Aydınlatma Yükümlülüğünün Yerine Getirilmesinde Uyulacak Usul ve Esaslar Hakkında Tebliğ.
* Veri Sorumlusuna Başvuru Usul ve Esasları Hakkında Tebliğ.
* Kişisel Verilerin Silinmesi, Yok Edilmesi veya Anonim Hale Getirilmesi Hakkında Yönetmelik.
* Kişisel Verilerin Yurt Dışına Aktarılmasına İlişkin Usul ve Esaslar Hakkında Yönetmelik (uygulanabilir olduğu ölçüde).
* Kişisel Verileri Koruma Kurulunun 18.02.2026 tarihli ve 2026/347 sayılı İlke Kararı.
* 6563, 6502, 6102 ve 213 sayılı Kanunlar; Mesafeli Sözleşmeler Yönetmeliği; 5324 sayılı Kozmetik Kanunu ve Kozmetik Ürünler Yönetmeliği.
`;
