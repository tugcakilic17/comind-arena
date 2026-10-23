# CoMind Arena · 6gen

Keşif Dünyası’nın estetiğini paylaşan, bağımsız web oyunu. Harita ve bölüm sistemi yok; doğrudan oyuna girilir.

## Çalıştırma

Node.js 22.12 veya üstü gerekir. Bu klasörde terminal açın:

```sh
npm install
npm run dev:full
```

Tarayıcı: http://localhost:5174

Her iki oyunu birlikte açmak için `npm run dev:all` veya `Baslat.cmd` kullanın: Arena **http://localhost:5174/**, Keşif Dünyası **http://localhost:5173/**. Keşif Dünyası başka klasördeyse `KESIF_PROJECT_DIR` ile proje kökünü belirtin.

`dev:full`, yerel PostgreSQL'i (yalnızca 127.0.0.1:55432), hesap backend'ini (3001) ve Vite'ı (5174) birlikte başlatır. İlk açılışta veritabanı hazırlanır. Veriler ve yerel veritabanı parolası Git'e eklenmeyen `.local/` dizininde kalır. `.env.example` dosyasını `.env` olarak kopyalayarak Google istemci bilgilerini tanımlayın. Yalnızca arayüz geliştirmek için `npm run dev` kullanılabilir.

Google girişinin kurulumu, ortak hesap yapısı ve sunucuya geçiş: [design/AUTH-SETUP.md](design/AUTH-SETUP.md).

**Sunucuya teslim:** `npm run release` arayüz + backend + ortak oyun modülleri + migration'ları içeren, gizli bilgi barındırmayan bir `release/comind-arena` klasörü hazırlar. Ana alan adına yayın için `npm run release -- --base=/` kullanın. Kurulum, Docker/HTTPS ve PostgreSQL adımları: [deploy/README.md](deploy/README.md). Canlı sunucuya dağıtım yapılmadı.

## Arkadaş davetini kendin dene

`Arkadas_Testini_Ac.cmd` dosyasına çift tıkla veya `npm run demo:friends` çalıştır. Üç ayrı Edge penceresinde Ada, Bora ve Cem test hesapları açılır. Bunlar birbirine arkadaş olarak eklenmiştir; gerçek hesabın ve kayıtların kullanılmaz. Test için ayrıca geliştirme sunucusu başlatman gerekmez.

1. Ada penceresinde üç oyuncu ve ilk beş doğru seçili gelir. **Oda oluştur** düğmesine bas. Odada üç oyuncu yeri ve paylaşılabilir davet bağlantısı görünür.
2. **Arkadaş listemden davet et** üzerinden Bora ve Cem'i davet et. Diğer pencerelerde **Arkadaşlarım → Oyun davetleri → Katıl** yolunu izle. Alternatif olarak bağlantıyı kopyalayıp diğer test penceresinin adres çubuğunda açabilirsin.
3. Üç pencerede de **Hazırım, başlayalım** düğmesine bas. Geri sayımın ardından herkes aynı iki altıgendeki ortak simgeyi arar. Üç oyuncunun puanı ayrı gösterilir; doğruyu ilk seçen puan alır, ilk beşe ulaşan kazanır.
4. İki veya dört kişiyi denemek için yeni oda açarken oyuncu sayısını değiştir. Bu başlatıcı üç hesap açtığından dört kişilik oda dördüncü oyuncuyu bekleme görünümünü gösterir.

Testi bitirmek için üç test penceresini kapat veya açılan terminalde Ctrl+C tuşlarına bas. Geçici hesaplar ve oda kayıtları silinir. Test bağlantıları bu bilgisayardaki test ortamında çalışır; başka bir cihazdan gerçek davet için uygulamanın internete açık sunucuda çalışması gerekir.

Otomatik kontrol: `node scripts/friends-demo.mjs --check` davet gönderme, katılma, üç kişinin hazırlanması ve ortak skor güncellemesini doğrular.

Windows’ta `Baslat.cmd` dosyasına çift tıklamak da geliştirme sunucusunu başlatır. Açılan terminal pencereyi kapatana veya Ctrl+C tuşlarına basana kadar çalışır.

```sh
npm test
npm run build
npm run preview
```

## Sunucuda yayın

Yayın adresi: https://comindarena.com/

`npm run release` güncel frontend, backend ve veritabanı migration dosyalarını `release/comind-arena` klasöründe hazırlar. Sunucuda Node.js, PostgreSQL ve HTTPS gerekir; kurulum: [deploy/README.md](deploy/README.md).

Üretim derlemesi varsayılan olarak `/` altında çalışır. Yerelde `npm run dev` adresi değişmez; `npm run build` ardından `npm run preview` için http://127.0.0.1:4174/ kullanın. `dist/`, `release/` ve `node_modules/` Git'e eklenmez.

GitHub Actions yalnızca test ve derleme kontrolü yapar; otomatik yayın göndermez. Canlıya kurulum sunucuda ayrıca yapılır.

## Ekran uyumu kontrolü

Ana sayfa, giriş, Google giriş bildirimi, yardım, ayarlar, sıralama, davet, yükleme hatası, oyun, mola, geri dönme ve iki sonuç durumu 320–2560 piksel genişlikte, dikey/yatay 24 pencere boyutunda kontrol edilir. Kontrol, açık ekranı yeniden boyutlandırır; taşan yazıları, örtülen düğmeleri, skor yerleşimini ve kaydırma sonrası düğmelere erişimi denetler. Çok kısa pencerelerde paneller ve sonuç sayfası gerektiğinde kaydırılır.

Geliştirme sunucusu açıkken, kurulu Playwright paketinin dizinini `COMIND_PLAYWRIGHT_DIR` ile belirtip `npm run test:responsive` çalıştırın. Üretim önizlemesi için `COMIND_TEST_URL=http://127.0.0.1:4174/` kullanılabilir. Rapor ve ekran görüntüleri Git'e eklenmeyen `test-results/responsive/` klasörüne yazılır.

## İlk taslakta çalışanlar

- Altıgen kartlarla gerçek eşleştirme oyunu: her kartta 6 simge, her iki kart arasında tam 1 ortak simge.
- 31 kart ve 31 özgün SVG simgesi; 465 olası kart çifti için eşleşme kuralı test edilir.
- Bilgisayara karşı üç hızda oynama; rakip Kofen süre sonunda eşleşmeyi bulur.
- Aynı cihazda iki kişi: her oyuncu kendi kartındaki ortak simgeyi seçer. Dokunmatik çoklu giriş desteklenir; ilk işlenen doğru seçim puan alır.
- 90 saniye veya toplam 10 tur; yüksek puan kazanır. Mola, yeniden oynama ve sonuç ekranı.
- Arkadaşını Çağır: 2–4 ayrı hesapla davet bağlantısı, kopyalama ve WhatsApp paylaşımı; 5/10/15/20 doğru hedefi ve 3–8 simge seçimi. Kullanıcı ID’siyle onaylı arkadaşlık ve oda daveti. Hedefe ilk ulaşan kazanır; liderlik puanı yalnızca arkadaş maçlarından kazanılır. 2 kişide +30/−10, 3 kişide +30/+10/−10, 4 kişide +30/+10/0/−10 uygulanır. Eşit skorda aynı sıra ve puan paylaşılır; toplam sıfırın altına inmez.
- Ses açma/kapama, klavye erişimi, modal pencereler ve küçük ekran düzeni.

## Sonraki aşama

Güncel hesap/maç kuralları: [design/ONLINE-ACCOUNTS.md](design/ONLINE-ACCOUNTS.md). Liderlik tablosu PostgreSQL'deki tamamlanmış maçlardan okunur. İlk/önceki/sonraki/son sıra ve kendi sırana dönüş çalışır. Henüz maç yoksa gerçek boş durum, ağ hatasında yeniden deneme gösterilir; örnek oyuncu yoktur.

**Google hesabı, gerçek arkadaş odaları, sunucu puanı, liderlik ve Keşif Dünyası ortak hesap bağlantısı yerelde çalışır.** Canlı kullanım firmanın sunucusunda backend ve PostgreSQL kurulumu gerektirir.

Ortak hesaplar `accounts.users` içinde tutulur; Google'ın sabit `sub` kimliği eşsizdir. Keşif Dünyası aynı backend'e bağlanır; hesap adı, Arena puanı ve hesaba özel keşif kayıtları kullanılır. Bu kurulum ortak çerez için aynı site adını kullanır: yerelde localhost'un iki portu, üretimde aynı HTTPS alan adının iki yolu.

Sonraki geliştirmeler:

1. Firmanın sunucusunda iki oyunu, API'yi, PostgreSQL'i ve HTTPS'i yayınlama; üretim Google dönüş adresini tanımlama.
2. Gerçek trafik ölçümlerine göre yoklama sıklığı, eşzamanlı kapasite ve bakım ayarlarını değerlendirme.
3. Firma için yedekleme, izleme ve hesap sahipliğini tamamlama.
4. İlgili bilgilendirme metinleri, onay kayıtları ve yaş/veli onayı akışının kesinleştirilmesi. Hukuki metinler bu prototipte oluşturulmadı.

## Tasarım

Keşif Dünyası’nın çocuksu, yumuşak ve hacimli görsel dili kullanılır: orman arka planı, mavi gökyüzü, mat krem yüzeyler, sıcak renkler ve hafif gölgeler. Cilalı plastik ve metalik altın görünümü yerine doğal tüy/kumaş/kâğıt hissi tercih edilir. Baloo 2 yazı tipi ve önceki görsel kaynaklar korunur; güncel Kofen, kullanıcının verdiği yeşil tüylü, sarı gagalı ve pembe yanaklı rozet karakteridir; kartta el sallar ve oyun avatarı aynı kimliği taşır. Kaynak Keşif Dünyası değiştirilmedi.

Giriş ekranında üç papağanlı altıgen kart bulunur: “Kofen’le Oyna” (tek kişilik), “Yan Yana Oynayalım” ve altında “Aynı cihazda 2 kişi” açıklaması, “Arkadaşını Çağır” (davet). Kullanıcının kırmızı gözlüklü, mavi gezgin ve yeşil kâşif papağanlarının kimlikleri korunur; kartlarda daha küçük ve ferah yerleşimle, mat yüzey ve yumuşak ışıkla görünürler. Kofen'in adı oyun içindeki puan, kart, geri bildirim, sonuç ve liderlik metinlerinde de kullanılır. Türkçe yazılar ve kartlar şeffaf PNG varlıklarının içindedir; mat adaçayı yeşili, bal sarısı ve lavanta oynat düğmeleri ayrı görsel katmanlarıdır. Eğik kartlar üzerine gelince düzleşip yükselir; küçük oynat düğmeleri tek seferlik baloncuk hareketiyle büyür ve basılınca gömülür. Hareket azaltma tercihi desteklenir. İlk iki kart oyunu başlatır; davet kartı henüz bağlı olmayan çevrim içi modu açıklar. Altta “Nasıl Oynanır?”, “Liderlik Tablosu” ve “Ayarlar” ahşap görsel düğmeleri korunur; koleksiyon yoktur. Hız ve ses ayarlar penceresindedir. Sol üstte kullanıcının son sağladığı CoMind Arena Parrot Badge görseli dosya içeriği değiştirilmeden kullanılır. Giriş düğmesi ahşap çerçevesiz mat krem yüzeylidir. Alt bilgi kaldırılmıştır; ana sayfa tek ekrana sığar. Gerçek üyelik henüz bağlı olmadığı için “Giriş yap” düğmesi mevcut durumu açıklayan bir pencere açar.

Oyun ekranında üst puan şeridi, Sen için ayrı mor oyuncu papağanı, yeşil Kofen avatarı, Ortak simgeyi bul! tabelası, iki büyük altıgen ve on ilerleme noktası bulunur. Paneller, kartlar, 31 oyun simgesi ve kontroller üretilmiş raster PNG varlıklarıdır. Süre, puan, ses ve mola çalışır. Kartlar uzun telefonlarda alt alta, kısa/yatay ekranlarda yan yana yerleşir; iki avatar telefonda da görünür. Orman fonu oyun sırasında hafif bulanıklaştırılıp yumuşatılır.

V16'da üst bar daraltılıp altıgenlere daha fazla yer ayrıldı, simgeler hafif küçültüldü. Puanı alan oyuncunun papağanı iki kanadını kaldırarak sevinir; yeni kart çiftinde normal pozuna döner. İlerleme noktaları ve küçük arayüz simgeleri ayrı HD PNG'lerdir; panel yüzeyleri de atlas veya border-image kırpması kullanmaz. Görseller ve tam üretim istemleri `design/generation/game-ui/GENERATION-GAME-V16.md` içindedir. İsteğe bağlı tarayıcı kontrolleri `tests/browser-check.mjs`, 20 görünümden oluşan yerleşim kontrolü `tests/layout-check.mjs` ile çalıştırılır.

Güncel V18 görünümünde oyuncu isimleri doğrudan panelde sade metindir. Altıgenler daha ince mat bal sarısı / adaçayı yeşili kenar, sıcak krem iç yüz ve çok hafif gölge kullanır. Panel desensiz, çerçevesiz sıcak kırık beyazdır. Dört yeni görsel ve tam istemleri `design/generation/game-ui/GENERATION-GAME-V18.md` içinde kayıtlıdır.

V19'da Phaser 3.90 eklendi. `src/game-motion.js`, oyun ekranındaki 12 PNG simgesini şeffaf Canvas üzerinde çizer ve basma, senkron iki-simge kutlaması, kısa yerel ışıltılar ve kart geçişlerini yönetir. Native düğmeler klavye/dokunma/odak katmanıdır. Kart değişirken giriş kilitlenir, mola animasyonları dondurur, hareket azaltma tercihinde simgeler sabit kalır. Motor yalnız oyun açılınca ayrı paket olarak yüklenir ve oyun kapanırken temizlenir. Sonuç ekranı kazanan papağan, skor ve yeniden oynama düğmesiyle aynı görsel dili kullanır.

`tests/motion-check.mjs` gerçek Phaser çizimini ve hareketini piksel örnekleriyle doğrular; dokunmatik, kilit, mola, yeniden boyutlandırma, yeniden başlatma/temizlik ve görsel geri dönüşünü kapsar. `tests/result-check.mjs` üç sonuç durumunu ve yeniden oynamayı kontrol eder. Bunlar mevcut `COMIND_PLAYWRIGHT_DIR` ayarıyla çalıştırılır. Phaser'ın [Tween sistemi](https://docs.phaser.io/phaser/concepts/tweens) ve [3.90 Texture API'si](https://docs.phaser.io/api-documentation/3.90.0/class/textures-texture) kullanılır.

V20 etkileşiminde hover hafif büyüme ve kısa dönüş yapar. Ayrı basma/bırakma zıplaması kaldırılmıştır; doğru eşleşme mevcut hover pozundan tek bir senkron büyüme/dönüş hareketine geçer. Simgelerin arkasında yuvarlak vurgu zemini yoktur. `tests/interaction-check.mjs` bu davranışı Canvas piksel örnekleriyle kontrol eder.

Orman fonu harita değildir; mevcut proje görselleri referans alınarak built-in ImageGen ile üretilmiştir. Son düzenlemede bu fon korundu. Üretim istemi ve varlık kaynakları `TASARIM-NOTLARI.md`, tüm görsel üretim kayıtları `design/generation/home-ui/GENERATION*.md` dosyalarında saklıdır. Mat sürümün 10 görseli ve tam istemleri `GENERATION-SOFT-V6.md`, kullanıcının son rozeti ve yeşil Kofen güncellemesi `GENERATION-GREEN-KOFEN-V7.md` içindedir. Kullanıcı referansları `design/references/` klasöründe korunur. Yazı tipi lisansı `public/assets/baloo-2-LICENSE.txt` dosyasındadır. Oyun içindeki raster simgelerin kaynak bölgeleri src/game-ui.js içinde, tasarım ve üretim istemleri design/generation/game-ui/GENERATION-GAME-V14.md içinde kayıtlıdır. Yardım ve sonuç gibi diğer alanların SVG simgeleri src/icons.js içinde korunur.

V21 oyun ekranı kullanıcının son referansına göre güncellendi. Canlı orman ve ahşap platform, yapraklı altın altıgenler, lavanta ve mint yüzeyler, etiket sekmeleri ve üst sekmeli tur tablası yerleşik ImageGen ile PNG olarak üretildi. Sol alttaki 6gen CoMind Arena logosu eklenmedi. Mevcut simgeler ve Phaser etkileşimleri korunur. Oyun sırasında geniş krem arka panel kaldırıldı; kontroller ve skor orman üzerinde referanstaki gibi yerleşir. Puan ve süre dinamik kalır; alt gösterge mevcut 10 eşleşme hedefine ilerlemeyi gösterir. Üretim istemleri, kaynaklar ve kullanılan dosyalar design/generation/game-ui/GENERATION-GAME-V21.md içindedir.

V22'de arka plan sade ve düşük kontrastlı orman PNG'siyle değiştirildi. Ahşap platform artık ayrı şeffaf görseldir; kartların tabanına bağlı yerleşir. Dar temas gölgesi, geniş yumuşak zemin gölgesi ve uyumlu ışık kartları platforma oturtur. Kart değişirken ahşap yüzey sabit kalır. Uzun telefon ve tabletlerde her kartın altında ayrı platform vardır. Üretim kayıtları: design/generation/game-ui/GENERATION-GAME-V22.md. Yerleşim kontrolü 22 ekran/mod birleşiminde platform temasını da doğrular.

V23'te V22'nin sade orman kompozisyonu korunarak yalnız renk ve ışık ana sayfa arka planıyla eşleştirildi. Yeni varlık public/assets/game-ui/forest-calm-warm-v23.png dosyasıdır. Ek doygunluk azaltımı kaldırıldı; ana sayfayla aynı hafif sıcak krem örtüsü uygulandı. Kartlar, platform ve temas gölgeleri korunur. Tam üretim istemi design/generation/game-ui/GENERATION-GAME-V23.md içinde kayıtlıdır.

V24'te simgeler yaklaşık %10 küçültülüp kart yüzeyinin merkezine doğru yukarı taşındı; dokunma alanları korunur. Tur yazısı ve on nokta, alt tablanın merkezine bağımsız olarak hizalanır. Her tamamlanan tur sırayla kaydedilir: Sen/1. Oyuncu mor, Kofen/2. Oyuncu yeşil nokta doldurur. Üst puan renkleri de aynı ayrımı kullanır. Oyun artık toplam 10 tur tamamlandığında veya 90 saniye dolduğunda biter; yüksek puan kazanır, 5–5 beraberlik desteklenir. Tur yazısı yeni kart çifti açılınca ilerler. Eşleşen iki simgenin senkron büyümesi %18'den %24'e, dönüşü 8'den 11 dereceye, yükselmesi 5'ten 7 piksele çıkarıldı; hareket azaltma tercihi ve çift tıklama kilidi korunur. Yeni tests/progress-check.mjs iki modda sıralı renkleri, 10 tur/beraberliği, yeniden başlatmayı, sayaç ve merkez hizasını doğrular.

V26 sonuç ekranı kullanıcının yapraklı krem panel referansına göre yenilendi. Üretilmiş çerçeve, daha küçük yeşil tekrar butonu ve ev simgeli krem ana ekran butonu kullanılır. Son gönderilen karakter referanslarına göre kırmızı gözlüklü oyuncu ve yeşil şapkalı kâşif Kofen için normal/sevinçli dört yeni PNG üretildi; aynı kimlikler oyun üst barında, skor şeridinde ve sonuç ekranında kullanılır. Yan yana modunun ikinci oyuncusu da yeşil kimliği kullanır. İlk oyuncunun puan ve tur noktaları kırmızı, ikinci oyuncunun yeşildir. Kofen ve yan yana maçları genel liderliğe yazılmaz; kayıt mesajı kaldırıldı. Ana sayfadaki liderlik düğmesi gelecekteki rekabetçi sıralamayı açıklar. Eski kayıtlar silinmez. Tüm yeni varlıklar ve tam üretim istemleri design/generation/game-ui/GENERATION-GAME-V26.md içindedir.

V27'de insan oyuncuya oyuna özel, aksesuarı olmayan lavanta/mor papağan atandı; normal ve sevinçli pozları aynı 3B estetikte yeniden üretildi. Oyun barı, skor, mola ve sonuçlar bu iki pozu kullanır. İlk oyuncunun puan/nokta renkleri tekrar mora döndü. Sonuç ekranı artık ana sayfanın ormanını kullanır; oyun içi sade fon korunur. Sonuç kompozisyonu baştan ölçeklendi: büyük ekranda daha geniş/yüksek panel, daha büyük başlık/skor/avatarlar ve ferah aralıklar; yeni ince çerçeveli skor şeridi kullanılır. Gerçek 1920×869 görünümünde panel yaklaşık 690×605 pikseldir. Tam varlık yolları ve üretim istemleri design/generation/game-ui/GENERATION-GAME-V27.md içindedir.

V28'de sonuç ekranının kompozisyonu yenilendi. Yeni boş krem panel ve yazısız yeşil buton ImageGen ile üretildi. Kazanan panelin arkasından görünür; iki skor portresi aynı çapta yuvarlak kırpılır. İç içe altın skor çerçevesi kaldırıldı. Başlık, açıklama, skorlar ve düğmeler normal içerik akışında yerleşir; buton metni rasterla birlikte esnemez. Ana ekran bağlantısı daha hafif ev simgeli metindir. Ana sayfa ormanı, mor oyuncu/yeşil Kofen kimlikleri ve maç akışı korunur. Kaynaklar ve istemler design/generation/game-ui/GENERATION-GAME-V28.md içindedir.


## Oyun hazırlığı ve kart modları

Kofen’le Oyna ve Yan Yana Oynayalım artık önce hazırlık panelini açar. Tek kişilik oyunda Koak, Komat, Kofen veya Kuik ve zorluk seçilir. Her iki akışta altıgen başına 3–8 simge, Elini Bitir / Kart Topla ve saat yönünde dönüş seçilebilir. Ayrıca 5/10/15/20 doğru cevap hedefi seçilir (varsayılan 10); simge sayısı bu hedeften bağımsızdır. Her oyuncu hedef kadar kartla başlar. Her görünen kart çifti tam bir ortak simge içerir. Eski cardCount tercihi symbolCount alanına taşınır. Seçimler yerel tercihlerde saklanır.

Elini Bitir, doğru eşleşmede oyuncunun üst kartını rakibin destesinin altına aktarır. Kart Topla, rakibin üst kartını oyuncunun destesinin altına alır. İki modda da seçilen doğru cevap hedefine **ilk ulaşan oyuncu** kazanır; toplam tur sayısı ve kart farkı oyunu bitirmez. Yanlış seçim puan getirmez. Süre göstergesi geçen zamanı sayar, 90 saniyede maç kesilmez; duraklatma süreyi ve botu durdurur. Üst sayaçlar ve sonuç ekranı her oyuncunun doğru cevap sayısını gösterir. Büyük hedeflerde deste tekrar kullanılabilir; görünen iki üst kartın aynı olması engellenir. Bu iki yerel oyun genel sıralamaya puan yazmaz. Mevcut çevrimiçi maç kuralları ayrıdır.

Hazırlık paneli masaüstünde iki sütunlu seçeneklerle tek pencereye sığar; dar ekranlarda dokunarak kaydırılır. İnce sıcak renkli kaydırma çubuğunda ok düğmeleri yoktur. Seçenekler hover sırasında hafifçe yükselir, seçimde kısa bir zıplama yapar; papağanlar selamlama hareketiyle tepki verir. Hareket azaltma tercihi korunur. Mavi Koak, kırmızı Komat, yeşil Kofen ve küçük turuncu Kuik kendi şeffaf görsellerini kullanır. Seçim kartlarının kenarlıkları ve gölgeleri hafiftir; isimler görsellerden ayrı boşlukla yerleşir. Kısa masaüstü pencerelerinde de 600 piksel yüksekliğe kadar panel kaydırmadan sığar. Oyun ve sonuç ekranları seçimdeki ayakta duran görsel yerine normal ve iki kanadı kaldırılmış sevinç portrelerini kullanır; iki poz da oyun açılmadan yüklenir. Komat/Kofen mevcut pozlarını, Koak/Kuik bunlarla uyumlu yeni pozlarını kullanır. Kaynaklar ve tam istemler `design/generation/characters/GENERATION-POSES-V2.md` içindedir. Built-in image_gen kaynakları, WebP kopyaları ve tam istemler `design/generation/characters/GENERATION.md` içindedir.

Simgeler her dağıtımda sabit yuvalar yerine kart yüzeyine rastgele ve birbirini kapatmadan yerleşir; küçük/büyük boyutlar ve 0–359 derece açılar bağımsızdır. Yerleşim simge sayısına ve görselin gerçek en-boy oranına göre ölçeklenir. Her kart açık küçük/orta/büyük boyut kademeleri içerir; en büyük simge en küçüğün yaklaşık iki katıdır. Çakışma ve kenar payı, atlasın alfa kanalından ölçülmüş sekiz kenarlı görünür simge sınırlarıyla kontrol edilir. Böylece şeffaf görsel köşeleri gereksiz alan ayırmaz ve standart simge boyutu daha büyük tutulur; sınır verileri src/symbol-outlines.js içindedir. Yerleşim sınırı iki kart görselinin gerçek iç yüzeyinden ölçülür; düz üst/alt kenarlar da kullanılabilir alana dahildir. Kompozisyon seçimi hem iç bölgelerdeki hem de her kenardaki boşluğu değerlendirir. Simgeler önce yüzeye yayılır, ardından kendi çevrelerindeki alana göre büyütülür; açıları ve belirgin küçük/büyük boyut farkı korunur. Her adımda görünür simge sınırları ve kenar payı yeniden kontrol edilir. Hover/tıklama hareketi başlangıç açısından bağımsız küçük bir açı farkını animasyonlandırır; Phaser’ın ±180 derece normalizasyonu tam tur dönüşe neden olmaz. Önceki Phaser hover ve eşleşme animasyonları dönüş açıkken de korunur. Kart başına Phaser kapsayıcısı, kart sanatı ve yerel dokunma alanlarıyla aynı dönüşü izler; simgelerin kendi animasyonları bundan bağımsız kalır. Kart aktarımı iki modun yönünü izler, duraklatmada durur ve ekran değişiminde temizlenir. Hareket azaltma tercihi sürekli dönüşü ve aktarım hareketini kapatır. Dikey mobil görünümde rakip üstte, oyuncu alttadır; kısa telefonlarda oyun dikey kaydırılabilir.

Ayarlar artık Profilim, ses ve hediye kodu formunu içerir. `POST /api/gifts/redeem`, biçim ve istek kaynağı kontrolü ile hız sınırı uygular; bütün geçerli kodlar için `status: inactive` döndürür. Aktif kampanya, ödül kaydı veya hediye dağıtımı yoktur. İleride gerçek kampanyalar eklenirken kodun tek kullanımlılığı, hesap yetkilendirmesi ve ödül verme işlemi sunucuda aynı veritabanı işlemi içinde uygulanmalıdır. Bu sunucu değişikliği çalışan API sürecinin yeniden başlatılmasıyla devreye girer. Papağanların özel ortam temaları sonraki aşamadır.

Doğrulama: `npm test`, `npm run build`, `npm run test:setup`, `npm run test:setup-motion`, `npm run test:parrots`, `npm run test:symbols`, `npm run test:responsive`. Yeni tarayıcı kontrolleri için geliştirme sunucusu 5174 portunda çalışmalıdır. Eski sürümlere ait diğer tasarım kontrol betikleri önceki 10 tur / puan düzenine göre yazılmıştır.


## Oyuncu profili ve kısa kullanıcı kodu

Ayarlar, liderlik ve mola pencerelerindeki gerçek yapraklı krem paneli kullanır. Profil, ses ve hediye alanları mint, sarı ve şeftali kartlarıyla ayrılır; düğmelerde kısa hover/basma hareketleri bulunur. Profilin hesap düğmesi kartın altına hizalanır. Ana sayfadaki hesap düğmesinde ek yuva veya kapsül kullanılmaz; seçilen papağan şeffaf olarak adın yanında görünür.

Her hesaba sunucuda benzersiz, kalıcı **4 harf + 4 rakam** kullanıcı kodu atanır; ayarlardan kopyalanabilir. İç UUID, ortak hesap/oturum/maç bağlantıları için korunur. `003-player-profile.sql`, mevcut hesapları ve oturumları koruyarak kodları doldurur. Kod çakışmaları tekrar denenir. Arkadaşlarım sekmesinde bu kodla istek gönderilir; alıcı kabul edince oda daveti gönderilebilir. Güncel akış [ONLINE-ACCOUNTS.md](design/ONLINE-ACCOUNTS.md) içindedir.

Profilde **Düzenle** ile İnci (beyaz), Lavanta veya Pudra seçilebilir. Önizleme Kaydet'e kadar mevcut seçimi değiştirmez; Vazgeç geri alır. Giriş yapılmış hesaplarda `PATCH /api/auth/profile` seçimi kalıcı kaydeder; oturum, kaynak, seçenek ve hız sınırı sunucuda kontrol edilir. Misafir seçimi yalnız bu tarayıcıda saklanır. Kayıt başarısızsa eski seçim korunur ve tekrar denenebilir. Seçim hesap başlığında, yerel oyun ve sonuçlarda, kendi liderlik avatarında kullanılır; normal/sevinme görselleri oyun başlamadan yüklenir. Ortak Keşif hesabının UUID kimliği değişmez.

Yeni renklerin PNG asılları, WebP kopyaları ve yerleşik imagegen promptları `design/generation/characters/GENERATION-PLAYER-COLORS-V1.md` içindedir. Doğrulama: `node --test tests/auth.test.js`, `node tests/auth-ui-check.mjs`, `npm run test:profile`, `npm run test:responsive`, `npm run build`.


### Ana sayfa ve kaydırmasız ayarlar

Ortadaki 6gen görseli kaldırıldı; erişilebilir ana başlık korunur. Üç oyun kartı mevcut alanı daha büyük kullanır. Masaüstü ve yatay ekranda yan yana, dar ekranlarda mevcut yüksekliğe göre iki sıra veya üç dikey kart görünür. Hesap adı ve seçilen papağan, oyundaki gerçek boyalı skor şeridi üzerinde gösterilir; papağan için ek daire/yuva kullanılmaz.

Ayarların başlığı, açıklaması ve Tamam düğmesi ortadadır; mevcut küçük yeşil kuş üst çerçeveden bakar. Çerçevenin normalleştirilmiş görseli ayrı bir `overflow:clip` dekor katmanında tutulur; içerik kırpılmaz. Böylece raster görselin saydam tuval kenarları kaydırma çubuğu üretmez. Masaüstünde profil/ses/hediye yan yana kalır. Dar veya kısa ekranlarda Profilim, Ses ve Hediye bölüm düğmeleriyle tek bölüm gösterilir; tüm içerik gerçek ölçülerle ekrana sığar. Profil düzenleme aynı kartta kimlik detaylarının yerini alır. `npm run test:settings-fit`, oturum açılmış hesapta 26 ekran ölçüsünde normal/düzenleme/ses/hediye, kopyalama ve hediye yanıtı durumlarının hiçbirinde yatay/dikey kaydırma, dışarı taşan veya örtülü kontrol olmadığını kontrol eder. Genel responsive kontrolü de yardım ve ayarlarda kaydırmayı hata sayar.


### Yüz portreleri ve profil rozeti

Ana sayfadaki üç oyun kartı ölçülü biçimde küçültüldü; ortadaki 6gen görseli geri eklenmedi. Sağ üstteki rozet, gönderilen referanstaki yuvarlak altın portre halkası, krem isim levhası ve yaprak yerleşimiyle HTML/CSS olarak oluşturulur; örnekteki mavi karakter kopyalanmaz, kullanıcının seçtiği nötr papağan gösterilir. Profil, ayarlar ve renk seçicilerindeki görseller sonuç ekranındakiyle aynı %125 yüz kadrajını ve yuvarlak kırpmayı kullanır. Seçicilerde görünür İnci/Lavanta/Pudra isimleri yoktur; ekran okuyucular için renk açıklamaları korunur.

Giriş yapılmışken sağ üstteki isim **Profilim** penceresini açar. Aynı profil kartı kısa oyuncu kodunu/kopyalamayı, papağan seçimini ve çıkış yapmayı içerir; giriş yapılmamış düğme Google girişini açmaya devam eder. Ayarlardaki Profilimi aç düğmesi de bu pencereye gider. Kaydet, Vazgeç, hata sonrası yeniden deneme ve mevcut oturum davranışları korunur. `test:profile`, `test:settings-fit` ve `tests/auth-ui-check.mjs` yeni profil penceresini ve portreleri de kapsar.


### Arkadaş odaları

Arkadaşını Çağır panelinde Oda oluştur / Arkadaşlarım sekmeleri bulunur; davet bağlantısı/kodu aynı ekrandaki Davetin mi var? kartından girilir. Panel dışına tıklamak açık bekleme odasından ayrılarak ana ekrana döner. Oda sahibi 2–4 kişi, 5/10/15/20 doğru ve 3–8 simge seçer. Bağlantı veya kodla katılım, kopyalama, WhatsApp paylaşımı, kullanıcı ID’siyle onaylı arkadaşlık ve uygulama içi oda daveti desteklenir. Herkes aynı iki kartta yarışır; doğru hedefine ilk ulaşan kazanır. Bu maçlar sıralamaya göre liderlik puanı üretir; aynı cihazdaki iki kişilik maçlar ve bilgisayara karşı maçlar üretmez. `005-ranking-losses.sql` imzalı puan değişimlerini destekler, mevcut kayıtları korur. Her sonuç tek kez işlenir ve kesinti mevcut toplam puanla sınırlanır. Yeni kontroller: `npm run test:online`, `node tests/friends-fit-check.mjs` (Vite açıkken).
