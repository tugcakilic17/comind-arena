# Arkadaş maçı, liderlik ve ortak hesap — 22 Ekim 2026

23 Ekim güncellemesi: Oda oluştururken küçük “Oyun dünyası” seçicisinden
Koak / Deniz, Kofen / Orman, Komat / Matematik veya Kuik / Hikâye seçilir.
Varsayılan Kofen'dir. Seçim sunucuda doğrulanarak odanın `options.theme`
alanında saklanır; katılan herkes aynı arka planı ve 15 simgelik desteyi kullanır.
Tema oda oluşturulduktan sonra değişmez. Seçici kapalıyken yalnızca papağan
görseli ve adı görünür; dar ekranda ilk ayar satırına yerleşir. Önceden açılmış,
tema alanı olmayan odalar klasik 31 simgelik setle devam eder.

## Arkadaş odaları ve skor

Arkadaşını Çağır, ayrı hesaplarla **2, 3 veya 4 kişi** oynanır. Odayı açan kişi **5/10/15/20 doğru** hedefini ve her altıgen için **3–8 simge** seçer. Ayarlar odaya katılanlar için değişmez. Toplam tur sınırı veya 90 saniye bitişi yoktur; seçilen doğru sayısına **ilk ulaşan kişi** kazanır. Herkes aynı iki altıgeni görür; kendi altıgenindeki ortak simgeyi ilk seçen kişi bir doğru kazanır. Kart alma/verme modları bu ekranda bulunmaz.

Odanın dahili sekiz karakterli kimliği `?room=KOD` davet bağlantısında taşınır. Davet kartında bağlantı, kopyalama, WhatsApp ve QR kod bulunur. QR kod uygulama içinde üretilir ve aynı davet bağlantısını taşır; yeni odada yenilenir. WhatsApp düğmesi davet metnini paylaşım ekranında açar, otomatik mesaj göndermez. Kullanıcı Google’a giriş yapmamışsa davet bağlantısı giriş dönüşüne taşınır. Yenileme aynı maçı geri açar.

Telefondan QR ile katılabilmek için bağlantının telefondan erişilebilir oyun adresine ait olması gerekir. `localhost` üzerindeki geliştirme bağlantısı telefonun bilgisayara erişmesini sağlamaz; bu bilgi kullanıcıya açıklanır, davet kartında teknik açıklama gösterilmez. QR görselinin gerçek ekran görüntüsü bağımsız QR okuyucuyla masaüstü, telefon ve yatay ekranda çözülür; çıkan bağlantıyla ayrı bir hesap odaya katılır.

Oda 15 dakika içinde hazırlanmalıdır. Seçilen sayıda oyuncu katılıp hepsi **Hazırım, başlayalım** dediğinde üç saniye geri sayım başlar. Bekleme odasında bir misafir ayrılınca yeri boşalır ve hazır işaretleri sıfırlanır; oda sahibi ayrılırsa oda kapanır. Başlayan maçta ayrılanlar yarıştan çıkar; en az iki kişi kaldıkça maç devam eder. Tek kişi kalırsa o kazanır. Bağlantı kaybında 45 saniye geri dönüş süresi vardır; herkes kaybolduysa maç iptal edilir.

Liderlik puanı **yalnızca arkadaş maçlarından** kazanılır; aynı cihazdaki iki kişilik ve bilgisayara karşı maçlar puan yazmaz. Tamamlanan maçın sıralaması ve puanı sunucuda hesaplanır; onay bekleme adımı yoktur.

| Oyuncu sayısı | 1. | 2. | 3. | 4. |
| --- | --- | --- | --- | --- |
| 2 | +30 | −10 | | |
| 3 | +30 | +10 | −10 | |
| 4 | +30 | +10 | 0 | −10 |

Eşit skorlar aynı sırayı ve o sıranın puanını paylaşır (örneğin 1, 2, 2, 4). Ayrılan oyuncular kalan oyuncuların arkasında sıralanır; tek kalan oyuncu kazanır. İptal edilen odalar puan yazmaz. Kesinti mevcut toplam puanı aşamaz: 5 puanı olan sonuncu −5 alır, sıfırdaki oyuncu 0 alır. Sonuç ekranında maç skoru ve gerçekten işlenen liderlik puanı ayrı gösterilir. Yenileme/yeniden okuma ödülü tekrar yazmaz; eski bitmiş maçlar geriye dönük puanlanmaz.

`005-ranking-losses.sql` mevcut ödülleri koruyarak negatif değişimlere izin verir. Maç satırı ve oyuncu satırları aynı veritabanı işleminde kilitlenir; farklı maçlar eşzamanlı bitse de oyuncu sıfırın altına düşmez. `arena.awards` anahtarı oda/oyuncu çiftinde benzersizdir. Liderlik ve Keşif hesabı işlenen değişimlerin toplamını okur.

Kart çifti, doğru cevap, hedef, katılımcılar ve skor PostgreSQL’de tutulur. Oda işlemleri `FOR UPDATE` altında yapılır; eşzamanlı doğru cevaplar tek puanla sonuçlanır. İstemci bitiş skoru gönderemez. Eski tur veya 350 ms’den hızlı tekrar denemeleri reddedilir. Sunucu beş saniyede bir bağlantı/süre denetler. İstemci oyun sırasında 450 ms, bekleme sırasında 1500 ms aralıklarla odayı okur; arkadaş listesi yaklaşık üç saniyede bir güncellenir. Eski ağ yanıtları ekran/oda değişimlerini geri alamaz. Oyun saati sunucu saatine göre çizilir.

## Arkadaşlarım

Profildeki kalıcı **4 harf + 4 rakam** kullanıcı ID’siyle istek gönderilir. İstek ancak alıcı kabul edince arkadaşlığa dönüşür; gönderen kendi isteğini kabul edemez. Gelen/gönderilen istekler, kabul/ret/geri çekme ve arkadaş kaldırma desteklenir. Arkadaş listelerinde yalnızca ad, kullanıcı ID’si, avatar ve uygulama içi kimlik bulunur; e-posta ve Google kimliği paylaşılmaz.

Bekleyen odadaki bir kişi kabul edilmiş arkadaşını davet edebilir. Oda kurulmadan arkadaş satırlarında davet düğmesi gösterilmez; oda oluşturma üst sekmeden yapılır. Dolu veya başlamış odadan yeni davet gönderilmez. Alıcının **Oyun davetleri** bölümünde oda ayarları ve Katıl/Kapat seçenekleri görünür. Kabul etmek normal oda katılımı kurallarına tabidir; dolu, başlamış veya süresi dolmuş odaya girilemez. Başka açık odası olan kişi önce oradan ayrılır. Arkadaşlık/davet verileri kalıcıdır. `004-friends.sql`, çift yönlü benzersiz arkadaşlık ve oda daveti tablolarını idempotent olarak ekler.

## Sıralama

Tablo `arena.awards` toplamıdır; örnek kullanıcı ve skor içermez. Puan azalan, galibiyet azalan, maç sayısı artan, kullanıcı UUID artan sıralanır. Sıra numarası deterministiktir. Dokuz satır ve kendine dönme vardır. Görünen ad ve oyun istatistikleri yayınlanır; e-posta/Google kimliği/oturum bilgileri yayınlanmaz.

## Keşif Dünyası

`accounts.users` ve `accounts.sessions` iki oyunda ortaktır. Yerelde **localhost:5174** (Arena), **localhost:5173** (Keşif). Google callback localhost:5174 üzerinde kalır; `?app=kesif` başlatılırsa Google dönüşünden sonra izinli Keşif adresine yönlenir. Kullanıcı tarafından serbest bir dönüş URL'si kabul edilmez. İki uygulamadan da çıkış aynı sunucu oturumunu iptal eder.

Keşif'teki hesap düğmesi ve Profilim ortak adı ve Arena puanını gösterir. Keşif ilerlemesi `accounts.app_progress` içinde kullanıcıya özel saklanır. Misafir kayıtları eski cihaz anahtarında, hesap kayıtları UUID'ye özel anahtarda ayrı kalır; misafir verisi otomatik olarak başka hesaba atanmaz. Hesap açılırken sunucu kaydı yüklenir. Hata durumunda cihazdaki kayıt korunur.

İlerleme güncellemeleri revision karşılaştırmasıyla yazılır; başka cihaz daha yeni kaydetmişse sunucu 409 döner. Kullanıcı sunucu kaydını açmayı seçebilir; cihazdaki önceki kopya `kesif-dunyasi:progress:v1:user:UUID:backup:ZAMAN` anahtarında yedeklenir. Keşif ilerlemesi mevcut oyunun istemci kurallarıyla hesaplanan bir kayıt/senkronizasyon özelliğidir; bu veri Arena rekabet puanı kazandırmaz. Keşif oyunları için sunucu otoriteli ayrı ödül doğrulaması eklenmedi.

## Çalıştırma ve yayın

Arena klasöründe `npm run dev:all` veya `Baslat.cmd` her iki web uygulamasını, ortak backend'i ve yerel PostgreSQL'i açar. Keşif başka konumdaysa `KESIF_PROJECT_DIR` kullanılır. Yalnız Arena için `npm run dev:full` korunur. `.env` sadece backend'de kalır.

Üretim önerisi aynı HTTPS alan adında `/comind-arena/` ve `/kesif-dunyasi/` yolları, kökte `/api/`. `APP_URL=https://alanadi/comind-arena/`, `KESIF_URL=https://alanadi/kesif-dunyasi/`, `KESIF_DIST=/sunucudaki/kesif/apps/web/dist` tanımlanır. İki proje kendi build komutlarıyla derlenir; `SERVE_STATIC=true` backend iki derlemeyi sunabilir. Google callback `https://alanadi/api/auth/google/callback` olarak eklenir. Başka alan adlarında otomatik ortak oturum bu kuruluma dahil değildir.

Migration 001–005 idempotent olarak sırayla uygulanır. Üretimde yöneticiyle `npm run db:migrate`, runtime'da `AUTO_MIGRATE=false` kullanın. Runtime rolünün `accounts` ve `arena` tablolarında gerekli okuma/yazma izinleri olmalıdır. HTTPS reverse proxy dışarıdan gelen Host'u korumalıdır. PostgreSQL dış internete açılmaz. Düzenli yedek ve geri yükleme denemesi firma tarafından sağlanır.

## Doğrulama

- `npm test`: 43 oyun/hesap/PostgreSQL testi; 2–4 kişi, 3–8 simge, kişi başına hedef, eşzamanlı seçim, ayrılma/bağlantı kaybı, oturum/CSRF ve arkadaş/davet yetkileri.
- `npm run test:online`: geçici PostgreSQL ve gerçek HTTP üzerinde dört ayrı tarayıcı hesabıyla arkadaş isteği/onayı, uygulama içi davet, yapıştırılan URL ve doğrudan bağlantı, kopyalama/WhatsApp metni, 4 kişilik ilk 5 doğru maçı, 3 kişilik maçtan ayrılma, yenilemeyle dönüş, sıralamaya göre gerçek puan kazanma/kaybetme ve liderlik tablosuna yazılması. Önceki sıralama kayıtlarının Keşif’te görünmesi, ortak kimlik/ilerleme/çıkış da kontrol edilir. Test kullanıcıları yalnızca geçici veritabanındadır; gerçek API’de test girişi bulunmaz.
- `node tests/friends-fit-check.mjs`: çalışan Vite üzerinde 45 masaüstü/telefon/yatay telefon düzeni; oda oluşturma ve paylaşım düğmeleri kaydırmadan görünür. Uzun arkadaş listesi kendi paneli içinde kayar.
- `npm run build`: üretim derlemesi. Görsel kontroller `test-results/online/` içine kaydedilir.


## Arkadaş paneli görünümü

Başlık ortadadır; önceki alt açıklama ve ayrı Davete katıl sekmesi kaldırıldı. Oda ayarları ve Davetin mi var? kartı aynı ekranda, telefonda üst üste gösterilir. Küçük yeşil papağan ortak panel görseliyle üst kenardan bakar. Kartlar çerçevenin içinden en az 20 piksel uzaktadır; iki örnek ekran boyutu dahil 45 yerleşim ölçülür. Düğmeler tek bir CSS geçişiyle hover sırasında şişer, basıldığında sıkışır; hareket azaltma tercihi korunur. Panel dışına tıklama ana ekrana döner ve bekleme odasındaki üyeliği temizler. `npm run test:friends-panel` bu davranışları ve seçim sonrasında odak korunmasını kontrol eder.

Çerçeve artık içeriğin doğal yüksekliğine bağlı değildir: oda oluşturma, bekleme ve arkadaş listesi aynı ekran ölçüsünde aynı 1020 piksele kadar genişlik / 610 piksele kadar yükseklik alanını kullanır. İç kartlar ayrı ve daha dar bir içerik alanına yerleştirilir. Görsel uygunluk testi, HTML sınırlarına ek olarak çerçeve görselindeki gerçek pikselleri örnekler; kart köşelerinin krem yüzeyde kaldığını, alt yaprakları veya altın kenarlığı örtmediğini denetler.

Son görsel düzenlemede çerçeve 1020×610 üst sınırına dengelendi; içerikten bağımsız boyut korunur. Seçimler gök mavisi, bal sarısı ve lila; oda/davet kartları yeşil, sıcak sarı ve turkuaz renkler kullanır. Ana ekran düğmesi iç kartlarla hizalıdır. Hover hareketine tek seferlik baloncuklar, ana ekran giriş/çıkışına 200–320 ms sayfa geçişi ve sekme değişimlerine 220 ms solma eklenmiştir; hareket azaltma tercihi hepsini kapatır.
