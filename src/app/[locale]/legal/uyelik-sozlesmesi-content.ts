/**
 * Canonical legal text — "Üyelik Sözleşmesi" v2.0 (doc code KK-ET-UYS-2026-V2,
 * effective 21.07.2026), FBG-398.
 *
 * The Turkish text is authoritative and MUST NOT be edited, shortened or
 * reformatted. It is shown verbatim on both /tr/legal/uyelik-sozlesmesi and
 * /en/legal/uyelik-sozlesmesi (the /en page adds a short "official text is in
 * Turkish" notice — see legal.uyelik_sozlesmesi.enNotice). It lives in one
 * module rather than the i18n catalog because it is a single, non-translatable
 * document; the UI chrome (title, navLabel, notice) stays in messages/{en,tr}.json.
 *
 * `String.raw` keeps backslash escapes byte-for-byte so the source matches the
 * client document; LegalMarkdown resolves them at render time:
 *   - `\.` in section numbers (`1\.`) → literal `.`
 *   - `\+` in the phone number (`\+90 531 871 30 07`, §2/§23) → literal `+`
 *
 * The bold names of the other legal documents (**Kargo ve Teslimat Politikası**,
 * **İade ve Cayma Politikası**, **Gizlilik ve Çerez Politikası**, **Ticari
 * Elektronik İleti Bilgilendirmesi ve Onay Metni** — §10, §13, §14) are
 * intentionally left as bold text, not links: cross-document links are a
 * separate task once all eight documents are live.
 *
 * The requisite/definition/role tables (§2 "Şirket ve İletişim Bilgileri", §3
 * "Tanımlar", §7 "Rolleri") arrive as clean pipe-separated rows in this export,
 * so — unlike some earlier docx→md exports (FBG-394/396) — no field is glued and
 * no `<br>` un-gluing is applied. Not a single word is added, removed or changed.
 */
export const UYELIK_SOZLESMESI_MARKDOWN = String.raw`
**AMERICAN CREATOR**

**ÜYELİK SÖZLEŞMESİ**

| Hizmet Sağlayıcı / Şirket | KIZIL KALİNA KOZMETİK ÜRÜNLERİ TİCARET İTHALAT VE İHRACAT LİMİTED ŞİRKETİ |
| :---- | :---- |
| **İnternet Sitesi** | https://american-creator.tr/ |
| **Doküman Kodu** | KK-ET-UYS-2026-V2 |
| **Sürüm** | 2.0 |
| **Yürürlük / Güncelleme** | 21.07.2026 |
| **Belge Sınıfı** | KAMUYA AÇIK |

# **1\. Amaç, Taraflar ve Belgenin Niteliği**

İşbu Üyelik Sözleşmesi (“Sözleşme”), https://american-creator.tr/ alan adlı elektronik ticaret platformunu (“Site”) American Creator ticari markasıyla işleten KIZIL KALİNA KOZMETİK ÜRÜNLERİ TİCARET İTHALAT VE İHRACAT LİMİTED ŞİRKETİ (“Şirket”) ile Site üzerinde üyelik hesabı oluşturan, on sekiz yaşını doldurmuş ve fiil ehliyetine sahip gerçek kişi (“Üye”) arasındaki üyelik ilişkisini düzenler.

Sözleşme; hesabın oluşturulması, kullanılması, güvenliği, üyelik işlevleri, tarafların hak ve yükümlülükleri ile üyeliğin sona ermesine ilişkin hükümleri içerir. Üyelik, ücretsiz bir dijital hesap hizmetidir; tek başına ürün satın alma, belirli bir süre üyeliği sürdürme veya ticari elektronik ileti onayı verme yükümlülüğü doğurmaz.

Ürün satışı, her sipariş bakımından ayrıca sunulan Ön Bilgilendirme Formu ve Mesafeli Satış Sözleşmesi kapsamında kurulur. Kargo, teslimat, cayma ve iade süreçleri ilgili özel politikalara tabidir. Bu Sözleşme, tüketicinin emredici mevzuattan doğan haklarını sınırlandırmaz.

# **2\. Şirket ve İletişim Bilgileri**

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

*info@american-creator.tr adresi genel iletişim adresidir; kayıtlı elektronik posta (KEP) adresi olarak nitelendirilmez.*

# **3\. Tanımlar**

| Terim | Açıklama |
| ----- | ----- |
| Hesap | Üyenin kayıtlı e-posta adresi ve güvenlik bilgileriyle eriştiği kişisel üyelik alanı. |
| Üye | Sözleşmeyi kabul ederek Site üzerinde Hesap oluşturan gerçek kişi. |
| Kullanıcı | Siteyi üyelik hesabı oluşturmadan ziyaret eden kişi. |
| Sipariş | Site üzerinden ürün satın alınmasına yönelik, ayrı ön bilgilendirme ve mesafeli satış sürecine tabi işlem. |
| Fulfillment Operatörü | Şirket adına depolama, sipariş hazırlama, paketleme ve iade kabulü hizmeti yürüten NİKAR GIDA TEKSTİL DIŞ TİCARET LİMİTED ŞİRKETİ. |
| Taşıyıcı | Siparişin fiziksel taşınması ve teslimatı için Şirketçe görevlendirilen kargo/taşıma hizmet sağlayıcısı. |
| Kalıcı Veri Saklayıcısı | Bilginin amacına uygun makul süre boyunca erişilebilir ve değiştirilmeden saklanabilir olmasını sağlayan e-posta, hesap alanı veya benzeri araç. |

# **4\. Sözleşmenin Kurulması, Sürümü ve Erişim**

Sözleşme, Üyenin üyelik formunda zorunlu alanları doldurması, Sözleşmeye erişebilmesi ve önceden işaretlenmemiş “Üyelik Sözleşmesi’ni okudum ve kabul ediyorum” kutusunu aktif olarak işaretleyerek üyelik işlemini tamamlamasıyla elektronik ortamda kurulur.

Şirket; kabul edilen Sözleşme sürümünü, kabul tarih-saatini ve üyelik hesabıyla ilişkilendirilen asgari teknik ispat kayıtlarını hukuka uygun şekilde saklar. Üyeye, kabul ettiği sürüme Hesap üzerinden erişim sağlanır veya Sözleşmenin bir örneği kayıtlı e-posta adresine kalıcı veri saklayıcısı ile iletilir.

Üyelik formunda kişisel verilerin işlenmesine ilişkin aydınlatma metinleri ayrıca erişilebilir kılınır. Aydınlatma metninin sunulması veya okunduğunun belirtilmesi, açık rıza ya da ticari elektronik ileti onayı anlamına gelmez.

# **5\. Üyelik Koşulları**

• Üye, on sekiz yaşını doldurduğunu ve üyelik işlemini yapmaya yetecek fiil ehliyetine sahip olduğunu beyan eder.

• Üyelik sırasında verilen ad-soyad, e-posta, telefon ve diğer bilgilerin doğru, güncel ve Üyeye ait olması gerekir. Değişiklikler Hesap üzerinden gecikmeksizin güncellenir.

• Başkasına ait kimlik, iletişim veya ödeme bilgilerinin izinsiz kullanılması; sahte hesap oluşturulması; kampanya, kupon veya üyelik avantajlarının kötüye kullanılması yasaktır.

• Aynı kişiye ait olduğu değerlendirilen mükerrer veya kötüye kullanım amacı taşıyan hesaplar, somut olayın özellikleri dikkate alınarak ek doğrulama sürecine tabi tutulabilir, geçici olarak sınırlandırılabilir veya kapatılabilir. Hesapların birleştirilmesi ancak Üyenin doğrulanmış talebi üzerine gerçekleştirilebilir.

• Şirket, hukuki zorunluluk, güvenlik riski, teknik uyumsuzluk, sahtecilik şüphesi veya üyelik koşullarının karşılanmaması halinde başvuruyu reddedebilir. Ayrımcı veya keyfî uygulama yapılamaz.

# **6\. Üyelik Hizmetinin Kapsamı**

Hesap; üyelik bilgilerinin yönetilmesi, sipariş geçmişinin görüntülenmesi, teslimat/fatura adreslerinin kaydedilmesi, favori listeleri, destek talepleri ve Site üzerinde sunulan diğer kişiselleştirilmiş işlevlerden yararlanılması amacıyla kullanılabilir. İşlevlerin kapsamı Site sürümüne göre değişebilir; kullanılmayan veya teknik olarak sunulmayan bir özellik, Şirket bakımından taahhüt oluşturmaz.

Üyelik hesabı, ödeme veya kredi aracı değildir. Hesapta görünen kupon, puan, indirim veya avantajlar; varsa ilgili kampanya koşullarına tabidir, kişiye özeldir ve aksi açıkça belirtilmedikçe nakde çevrilemez veya devredilemez.

# **7\. Satıcı ve Operasyonel Hizmet Sağlayıcıların Rolleri**

| Taraf / Sağlayıcı | Rol | Üyeye Karşı Konum |
| ----- | ----- | ----- |
| KIZIL KALİNA KOZMETİK ÜRÜNLERİ TİCARET İTHALAT VE İHRACAT LİMİTED ŞİRKETİ | Üyelik hizmet sağlayıcısı, Site işletmecisi ve siparişlerde satıcı. | Sözleşmenin tarafıdır; üyelik ve tüketici işlemlerindeki asli hukuki muhataptır. |
| NİKAR GIDA TEKSTİL DIŞ TİCARET LİMİTED ŞİRKETİ | Fulfillment: depolama, toplama, paketleme ve iade kabulü. | Üyelik Sözleşmesinin tarafı değildir. Sipariş verilmesi halinde Şirket adına ve talimatıyla operasyon yürütür. |
| Anlaşmalı taşıyıcı/kargo işletmesi | Fiziksel taşıma ve teslimat. | Üyelik Sözleşmesinin tarafı değildir. Taşıma mevzuatından doğan kendi sorumlulukları saklıdır; Satıcının tüketiciye karşı sorumluluğu devam eder. |
| iyzico ve bankalar | Ödeme oturumu, tahsilat, doğrulama ve iade altyapısı. | Üyelik oluşturulması için ödeme gerekmez. Ödeme sağlayıcısı yalnızca sipariş/ödeme işlemi olduğunda devreye girer. |

Fulfillment Operatörü veya taşıyıcıya görev verilmesi, Şirketin Üyeye ve tüketiciye karşı kanundan veya sözleşmeden doğan sorumluluklarını ortadan kaldırmaz. Şirket ile hizmet sağlayıcılar arasındaki iç sorumluluk, rücu ve hizmet seviyesi ilişkileri Üyeye karşı ileri sürülemez.

# **8\. Hesap Güvenliği**

• Üye, güçlü ve benzersiz bir parola kullanmak, giriş bilgilerini üçüncü kişilerle paylaşmamak ve ortak cihazlarda oturumu kapatmakla yükümlüdür.

• Yetkisiz erişim, hesap devri, şüpheli işlem veya iletişim bilgilerinin izinsiz değiştirilmesi fark edildiğinde Şirkete derhal bildirim yapılmalıdır.

• Şirket; güvenlik riski halinde oturumu sonlandırabilir, parola yenileme veya ek doğrulama talep edebilir ve hesabı geçici olarak sınırlandırabilir.

• Hesap üzerinden yapılan bir işlemin elektronik kaydı, tek başına Üyenin kusurunu kesin olarak göstermez. Yetkisiz kullanım iddiası somut olay, güvenlik kayıtları ve tarafların özen yükümlülükleri birlikte değerlendirilerek incelenir.

# **9\. Site Kullanım Kuralları**

Üye, Siteyi hukuka, dürüstlük kurallarına, üçüncü kişilerin haklarına ve Sözleşmeye uygun kullanır. Aşağıdaki faaliyetler yasaktır:

• Siteye, sunucuya veya diğer hesaplara yetkisiz erişim girişimi; zararlı yazılım, otomatik saldırı, yük testi veya güvenlik açığı istismarı.

• Şirketin yazılı izni olmaksızın sistematik veri çekme, bot, scraper, robot veya benzeri otomasyonla içerik ya da fiyat toplama.

• Sahte sipariş, ters ibraz kötüye kullanımı, kampanya/kupon manipülasyonu, aynı avantajdan haksız biçimde birden fazla yararlanma veya dolandırıcılık teşkil eden işlemler.

• Hukuka aykırı, hakaret içeren, yanıltıcı, kişisel veri veya fikri mülkiyet ihlali oluşturan içerik paylaşımı.

Tüketicinin kanundan doğan cayma hakkını kullanması, ayıplı mal veya hizmet nedeniyle başvuruda bulunması, hukuka uygun şekilde ters ibraz talebinde bulunması, tüketici hakem heyetine, mahkemeye veya yetkili idari mercilere başvurması ile KVKK kapsamındaki haklarını kullanması bu madde kapsamında ihlal veya kötüye kullanım olarak değerlendirilemez.

İhlal halinde Şirket, olayın ağırlığı ve tekrar durumu dikkate alınarak içeriği kaldırabilir, işlemi incelemeye alabilir, hesabı sınırlandırabilir veya sona erdirebilir; kanuni bildirim ve başvuru yükümlülükleri saklıdır.

# **10\. Siparişler ve Özel Satış Belgeleri**

Her sipariş, üyelik ilişkisinden ayrı bir satış işlemidir. Sipariş verilmeden önce ürünün temel nitelikleri, toplam fiyat, teslimat, cayma hakkı, iade masrafları ve diğer zorunlu bilgiler Ön Bilgilendirme Formu ile sunulur; satış ilişkisi Mesafeli Satış Sözleşmesi kapsamında kurulur.

Sipariş hazırlama ve teslimat için **Kargo ve Teslimat Politikası**; cayma, iade, hijyen istisnası ve ayıplı ürün süreçleri için **İade ve Cayma Politikası** uygulanır. Bu belgelerin güncel sürümleri Site üzerinde erişilebilir tutulur.

Üye, teslimat, fatura ve iletişim bilgilerini sipariş onayından önce kontrol eder. Yanlış veya eksik bilginin düzeltilmesi mümkün olduğu ölçüde sağlanır. Üyenin kusurundan kaynaklanan, makul ve belgelenebilir yeniden gönderim masrafları emredici tüketici hükümleri saklı kalmak üzere Üyeye yansıtılabilir.

Stok, fiyat veya kampanya bilgisinde objektif olarak fark edilebilir açık bir sistem hatası bulunması halinde Şirket, durumu gecikmeksizin bildirir; siparişin ifası mümkün değilse tahsil edilen bedel kanuni süre içinde aynı ödeme aracına uygun şekilde iade edilir. Bu hüküm, Şirkete keyfî sipariş iptali hakkı vermez.

# **11\. Ürün Yorumları ve Kullanıcı İçerikleri**

Site üzerinde yorum, değerlendirme, soru-cevap veya görsel yükleme özelliği sunulması halinde Üye; paylaştığı içeriğin gerçeğe ve hukuka uygun olmasından sorumludur. İçerikte üçüncü kişilere ait kişisel veri, sağlık verisi, iletişim bilgisi, hakaret, ayrımcılık, yanıltıcı sağlık/ürün iddiası, telif veya marka ihlali bulunamaz.

Şirket, içerikleri yalnızca hukuka uygunluk, kişisel veri güvenliği, konu dışılık, spam ve platform kuralları bakımından ölçülü biçimde denetleyebilir. Sadece olumsuz görüş içermesi, hukuka uygun bir yorumun kaldırılması için tek başına gerekçe oluşturmaz.

Üye, içeriğin Site üzerinde görüntülenmesi, teknik olarak çoğaltılması ve hizmetin sunulması amacıyla sınırlı, bedelsiz, münhasır olmayan ve üyelik/yorum hizmetiyle bağlantılı bir kullanım izni verir. Bu izin, içeriğin reklam amacıyla Üyenin kimliğiyle kullanılmasını otomatik olarak kapsamaz.

# **12\. Fikri ve Sınai Mülkiyet Hakları**

Siteye ait yazılım, tasarım, metin, görsel, veri tabanı, marka, logo, alan adı ve diğer unsurlar Şirkete veya lisans veren hak sahiplerine aittir. Üyelik, Üyeye herhangi bir fikri veya sınai mülkiyet hakkı devretmez. İçerik, yalnızca kişisel ve ticari olmayan kullanım için görüntülenebilir; kanunun izin verdiği haller dışında izinsiz çoğaltılamaz, yayımlanamaz, değiştirilemez veya ticari amaçla kullanılamaz.

# **13\. Kişisel Verilerin Korunması ve Çerezler**

Üyelik kapsamında kişisel verilerin toplanma yöntemleri, amaçları, hukuki sebepleri, alıcı grupları, saklama kuralları ve ilgili kişi hakları **Gizlilik ve Çerez Politikası** ile ilgili KVKK aydınlatma metinlerinde açıklanır. Üyelik Sözleşmesinin kabulü, açık rıza verilmesi anlamına gelmez.

Sipariş verilmesi halinde ad-soyad, telefon, teslimat adresi, sipariş numarası ve gerekli paket bilgileri; siparişin hazırlanması, teslimatı ve iade süreçlerinin yürütülmesi amacıyla ilgili alıcı grupları olan fulfillment operatörü ve taşıyıcı ile amaçla bağlantılı, sınırlı ve ölçülü şekilde paylaşılabilir.

Zorunlu olmayan çerezler, Üyenin çerez tercih merkezinde verdiği ayrı ve kategori bazlı seçime göre yönetilir. Çerez kabulü üyeliğin veya alışverişin ön koşulu değildir.

# **14\. Ticari Elektronik İletiler ve Hizmet Bildirimleri**

Kampanya, indirim, yeni ürün ve tanıtım amaçlı e-posta, mesaj veya aramalar yalnızca geçerli kanal onayı bulunması halinde ve **Ticari Elektronik İleti Bilgilendirmesi ve Onay Metni** uyarınca gönderilir. Ticari elektronik ileti onayı üyelik şartı değildir; önceden işaretli sunulamaz ve üyelik onayıyla birleştirilemez.

Üyelik güvenliği, parola sıfırlama, hesap değişikliği, sipariş teyidi, ödeme, fatura, teslimat, iade, ürün güvenliliği veya kanuni bilgilendirme mesajları, ilgili işlem ilişkisinin yürütülmesi için gönderilebilir. Onay gerektirmeyen bu bildirimlere reklam veya ürün özendirmesi eklenmez.

# **15\. Hesabın Askıya Alınması**

Şirket; yetkisiz erişim, sahtecilik, ödeme veya kampanya kötüye kullanımı, Sözleşme ihlali, üçüncü kişi haklarının ihlali, teknik güvenlik tehdidi veya yetkili makam talebi halinde hesabı geçici olarak askıya alabilir. Acil güvenlik veya kanuni zorunluluk bulunmadıkça Üyeye gerekçe ve mümkünse giderim imkânı bildirilir.

Askıya alma; tamamlanmış sipariş, cayma, iade, ayıplı ürün, fatura, garanti veya kişisel veri başvuru haklarını ortadan kaldırmaz. Devam eden sipariş ve iadeler, güvenlik incelemesiyle uyumlu şekilde sonuçlandırılır.

# **16\. Üyeliğin Sona Erdirilmesi ve Hesap Silme Talebi**

Üye, Hesap içindeki “Hesabımı Kapat” işlevi üzerinden veya info@american-creator.tr adresine kayıtlı e-posta hesabından başvurarak üyeliğini her zaman ücretsiz olarak sona erdirebilir. Kimlik doğrulama amacıyla talep sahibiyle sınırlı ek bilgi istenebilir.

Üyeliğin sona ermesi, kapanış tarihinden önce doğmuş sipariş, ödeme, teslimat, iade, cayma, ayıplı ürün, borç veya alacak ilişkilerini etkilemez. Kanunen saklanması gereken sipariş, fatura, sözleşme ve uyuşmazlık kayıtları, yalnızca ilgili hukuki amaçla sınırlı erişimde tutulur; diğer hesap verileri saklama-imha planına göre silinir, yok edilir veya anonim hâle getirilir.

Üyelik sona erdirildiğinde, American Creator markası altında üyelik sırasında verilen ticari elektronik ileti izinleri de operasyonel olarak kapatılır ve İYS kayıtları ilgili mevzuatta öngörülen süre içinde güncellenir. Üyenin İYS üzerinden yaptığı daha güncel tercih saklıdır.

# **17\. Hizmet Sürekliliği, Bakım ve Üçüncü Taraf Bağlantıları**

Şirket, Siteyi güvenli ve işlevsel biçimde sunmak için makul özeni gösterir. Planlı bakım, altyapı arızası, siber olay, iletişim kesintisi, üçüncü taraf teknik hizmeti veya mücbir sebep nedeniyle geçici erişim kesintileri yaşanabilir. Kesintisiz, her cihazla uyumlu veya tamamen hatasız hizmet garanti edilmez.

Site içinde üçüncü taraf sayfalara verilen bağlantılar, bu sayfaların Şirket tarafından işletildiği anlamına gelmez. Üçüncü tarafların kendi sözleşme ve gizlilik koşulları uygulanır; Şirket, kendi kusuru veya yönlendirmesinden kaynaklanmayan üçüncü taraf içeriklerinden sorumlu değildir.

# **18\. Sorumluluk Esasları**

Taraflar, kendi kusurları ve ihlalleri ölçüsünde sorumludur. Şirketin sorumluluğunu ağır kusur, bedensel zarar, kişisel verilerin korunması, tüketici hakları veya diğer emredici mevzuat bakımından kaldıran ya da sınırlandıran bir hüküm uygulanmaz.

Üye; yanlış bilgi verme, şifreyi bilerek paylaşma, başkasına ait veri kullanma veya yasaklı faaliyet nedeniyle doğrudan oluşan ve uygun illiyet bağı bulunan zararları kusuru oranında karşılar. Genel, sınırsız veya cezai nitelikte bir tazmin yükümlülüğü doğmaz.

# **19\. Mücbir Sebep**

Doğal afet, yangın, savaş, terör, salgın, grev, enerji veya iletişim altyapısı kesintisi, yaygın siber saldırı, resmî makam kararı, ithalat/tedarik engeli ve tarafların makul kontrolü dışındaki benzeri olaylar mücbir sebep sayılabilir. Etkilenen yükümlülük, olayın etkisi ve süresiyle sınırlı olarak askıya alınır; taraflar zararı azaltmak için makul çabayı gösterir. Tüketicinin kanuni fesih ve bedel iadesi hakları saklıdır.

# **20\. Sözleşme Değişiklikleri**

Şirket, mevzuat, güvenlik, teknik altyapı veya hizmet kapsamındaki değişiklikler nedeniyle Sözleşmeyi güncelleyebilir. Üyenin haklarını önemli ölçüde etkileyen değişiklikler yürürlüğe girmeden önce Hesap, Site veya kayıtlı e-posta üzerinden açıkça bildirilir; yeni sürüm ve tarih gösterilir.

Değişiklikler tamamlanmış siparişlere geriye yürütülemez. Üyeye ek ücret, yeni asli borç veya önceden bulunmayan önemli bir yükümlülük getiren değişiklikler, emredici mevzuatın izin verdiği ölçüde ayrıca açık kabul alınmadan uygulanmaz. Üye, değişikliği kabul etmemesi halinde üyeliğini ücretsiz sona erdirebilir.

# **21\. Bildirimler ve Elektronik Kayıtlar**

Üyelik ve hesap güvenliğine ilişkin bildirimler; Site, Hesap veya kayıtlı e-posta adresi üzerinden yapılabilir. Üye, iletişim bilgilerinin güncelliğini sağlar. Pazarlama içerikli bildirimler yalnızca ayrı ticari ileti onayı kapsamında gönderilir.

Hukuka uygun şekilde oluşturulan üyelik kabul kayıtları, sistem günlükleri, e-posta yazışmaları, sipariş ve ödeme kayıtları, tarafların kanuni itiraz ve ispat hakları saklı kalmak üzere 6100 sayılı Hukuk Muhakemeleri Kanunu çerçevesinde delil olarak değerlendirilebilir.

# **22\. Uygulanacak Hukuk ve Uyuşmazlıkların Çözümü**

Sözleşmeye Türk hukuku uygulanır. Üyenin tüketici sıfatı taşıdığı uyuşmazlıklarda, uyuşmazlık tarihindeki parasal sınırlar ve görev kuralları çerçevesinde Üyenin yerleşim yerindeki veya işlemin yapıldığı yerdeki Tüketici Hakem Heyetleri ile Tüketici Mahkemeleri yetkilidir; uygulanabilir dava şartı arabuluculuk hükümleri saklıdır.

Tüketici işlemi niteliğinde olmayan uyuşmazlıklarda kanunen yetkili mahkeme ve icra daireleri uygulanır. Bu Sözleşme, tüketicinin kanunen yetkili mercilere başvuru hakkını sözleşmeyle başka bir yere münhasıran bağlamaz.

# **23\. Bölünebilirlik, Dil, Yürürlük ve İletişim**

Sözleşmenin bir hükmünün geçersiz veya uygulanamaz olması, diğer hükümlerin geçerliliğini etkilemez. Geçersiz hüküm, amacı ve emredici mevzuat gözetilerek uygulanabilir en yakın hükümle sınırlı biçimde değerlendirilir.

Türkçe metin ile diğer dil sürümleri arasında farklılık bulunması hâlinde Türkçe metin esas alınır.

Sözleşme, Üyenin 4 üncü maddede açıklanan elektronik kabul işlemini tamamladığı tarihte yürürlüğe girer. İletişim: info@american-creator.tr | \+90 531 871 30 07 | Oba Mahallesi 225 Sokak Summer Park Sitesi B Blok No: 8B, İç Kapı No: 20, 07460 Alanya / Antalya, Türkiye.

# **Hukuki Dayanaklar**

• 6563 sayılı Elektronik Ticaretin Düzenlenmesi Hakkında Kanun.

• Elektronik Ticarette Hizmet Sağlayıcı ve Aracı Hizmet Sağlayıcılar Hakkında Yönetmelik.

• 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği.

• 6698 sayılı Kişisel Verilerin Korunması Kanunu ve ilgili ikincil düzenlemeler.

• 6098 sayılı Türk Borçlar Kanunu, 6102 sayılı Türk Ticaret Kanunu, 6100 sayılı Hukuk Muhakemeleri Kanunu ve 5846 sayılı Fikir ve Sanat Eserleri Kanunu.
`;
