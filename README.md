# CoMind Arena · 6gen

Keşif Dünyası’nın estetiğini paylaşan, bağımsız web oyunu. Harita ve bölüm sistemi yok; doğrudan oyuna girilir.

## Çalıştırma

Node.js 22.12 veya üstü gerekir. Bu klasörde terminal açın:

```sh
npm install
npm run dev
```

Tarayıcı: http://127.0.0.1:5174

Windows’ta `Baslat.cmd` dosyasına çift tıklamak da geliştirme sunucusunu başlatır. Açılan terminal pencereyi kapatana veya Ctrl+C tuşlarına basana kadar çalışır.

```sh
npm test
npm run build
npm run preview
```

## GitHub Pages

Site adresi: https://tugcakilic17.github.io/comind-arena/

İlk kurulumda depoda **Settings → Pages → Build and deployment → Source → GitHub Actions** seçin. İş akışı zaten `.github/workflows/deploy-pages.yml` dosyasında bulunur; yeni bir şablon oluşturmanız gerekmez. **Actions → Deploy to GitHub Pages → Run workflow → main → Run workflow** ile ilk yayını başlatabilirsiniz. Sonraki `main` push işlemleri otomatik test, derleme ve yayın yapar.

Üretim derlemesi `/comind-arena/` altında çalışır. Yerelde `npm run dev` adresi değişmez; `npm run build` ardından `npm run preview` için http://127.0.0.1:4174/comind-arena/ kullanın. `dist/` ve `node_modules/` Git'e eklenmez; Actions bağımlılıkları kilit dosyasından kurar ve `dist/` çıktısını yayımlar.

Pages mevcut statik oyunu sunar. Hesap, çevrim içi oda ve ortak sıralama için ayrıca backend gerekir.

## İlk taslakta çalışanlar

- Altıgen kartlarla gerçek eşleştirme oyunu: her kartta 6 simge, her iki kart arasında tam 1 ortak simge.
- 31 kart ve 31 özgün SVG simgesi; 465 olası kart çifti için eşleşme kuralı test edilir.
- Bilgisayara karşı üç hızda oynama; rakip Kofen süre sonunda eşleşmeyi bulur.
- Aynı cihazda iki kişi: her oyuncu kendi kartındaki ortak simgeyi seçer. Dokunmatik çoklu giriş desteklenir; ilk işlenen doğru seçim puan alır.
- 90 saniye veya toplam 10 tur; yüksek puan kazanır. Mola, yeniden oynama ve sonuç ekranı.
- Maç sonunda kazanan, maç skoru ve yeniden oynama. Kofen ve yan yana modları genel sıralama puanı kazandırmaz; liderlik tablosu rekabetçi modla birlikte açılacak.
- Ses açma/kapama, klavye erişimi, modal pencereler ve küçük ekran düzeni.

## Sonraki aşama

Backend öncesi güncel kontrol ve geçiş notları: [design/FRONTEND-AUDIT.md](design/FRONTEND-AUDIT.md). Oyun, gerekli WebP görselleri decode edilip animasyon katmanı (veya sabit görünüm) hazır olduktan sonra başlar. Yükleme hatasında tekrar deneme/iptal sunulur. Ses ve zorluk bu tarayıcıda saklanır. Liderlik tablosunda 30 örnek oyunculu tasarım önizlemesi vardır: dokuz satır, merkezde 15. sıradaki “Sen”, ilk/önceki/sonraki/son sıra ve kendi sırana dönüş düğmeleri. Gerçek sıralama henüz bağlı değildir.

**Henüz backend, hesap, çevrim içi oda veya gerçek ortak liderlik tablosu yoktur.** Arayüzde bu alanlar açıkça “yakında” olarak belirtilir. Gerçek hesap veya davet bağlantısı oluşturulmaz.

Üyelik tasarlanırken CoMind Arena ve Keşif Dünyası için tek kimlik sistemi kullanılacak. Aynı veritabanında ortak `profiles` tablosu, oyunlara özgü ayrı tablo/şemalar düşünülebilir. Keşif Dünyası’nın bütün veritabanını şimdi kurmak gerekmez. İki ayrı site alan adının oturum açma yönlendirmeleri ayrıca tanımlanmalıdır; ortak hesap, siteler arası kendiliğinden oturum aktarımı anlamına gelmez.

Sonraki geliştirmeler:

1. Ortak kimlik sağlayıcı ile e-posta/Google kayıt ve giriş, doğrulama ve parola sıfırlama.
2. Kullanıcı ve oyun verileri için erişim kuralları. Liderlik puanları sunucuda doğrulanmalı.
3. Süresi sınırlı davet kodlarıyla çevrim içi odalar; sunucu tarafından yürütülen tur, zaman ve puan otoritesi.
4. İlgili bilgilendirme metinleri, onay kayıtları ve yaş/veli onayı akışının kesinleştirilmesi. Hukuki metinler bu prototipte oluşturulmadı.

## Tasarım

Keşif Dünyası’nın çocuksu, yumuşak ve hacimli görsel dili kullanılır: orman arka planı, mavi gökyüzü, mat krem yüzeyler, sıcak renkler ve hafif gölgeler. Cilalı plastik ve metalik altın görünümü yerine doğal tüy/kumaş/kâğıt hissi tercih edilir. Baloo 2 yazı tipi ve önceki görsel kaynaklar korunur; güncel Kofen, kullanıcının verdiği yeşil tüylü, sarı gagalı ve pembe yanaklı rozet karakteridir; kartta el sallar ve oyun avatarı aynı kimliği taşır. Kaynak Keşif Dünyası değiştirilmedi.

Giriş ekranında üç papağanlı altıgen kart bulunur: “Kofen’le Oyna” (tek kişilik), “Yan Yana Oynayalım” ve altında “Aynı cihazda 2 kişi” açıklaması, “Arkadaşını Çağır” (davet). Kullanıcının kırmızı gözlüklü, mavi gezgin ve yeşil kâşif papağanlarının kimlikleri korunur; kartlarda daha küçük ve ferah yerleşimle, mat yüzey ve yumuşak ışıkla görünürler. Kofen'in adı oyun içindeki puan, kart, geri bildirim, sonuç ve liderlik metinlerinde de kullanılır. Türkçe yazılar ve kartlar şeffaf PNG varlıklarının içindedir; mat adaçayı yeşili, bal sarısı ve lavanta oynat düğmeleri ayrı görsel katmanlarıdır. Eğik kartlar üzerine gelince düzleşip yükselir; küçük oynat düğmeleri tek seferlik baloncuk hareketiyle büyür ve basılınca gömülür. Hareket azaltma tercihi desteklenir. İlk iki kart oyunu başlatır; davet kartı henüz bağlı olmayan çevrim içi modu açıklar. Altta “Nasıl Oynanır?”, “Liderlik Tablosu” ve “Ayarlar” ahşap görsel düğmeleri korunur; koleksiyon yoktur. Hız ve ses ayarlar penceresindedir. Sol üstte kullanıcının son sağladığı CoMind Arena Parrot Badge görseli dosya içeriği değiştirilmeden kullanılır. Giriş düğmesi ahşap çerçevesiz mat krem yüzeylidir. Alt bilgi kaldırılmıştır; ana sayfa tek ekrana sığar. Gerçek üyelik henüz bağlı olmadığı için “Giriş yap” düğmesi mevcut durumu açıklayan bir pencere açar.

Oyun ekranında üst puan şeridi, Sen için ayrı mor oyuncu papağanı, yeşil Kofen avatarı, Ortak simgeyi bul! tabelası, iki büyük altıgen ve on ilerleme noktası bulunur. Paneller, kartlar, 31 oyun simgesi ve kontroller üretilmiş raster PNG varlıklarıdır. Süre, puan, ses ve mola çalışır. Kartlar uzun telefonlarda alt alta, kısa/yatay ekranlarda yan yana yerleşir; iki avatar telefonda da görünür. Orman fonu oyun sırasında hafif bulanıklaştırılıp yumuşatılır.

V16'da üst bar daraltılıp altıgenlere daha fazla yer ayrıldı, simgeler hafif küçültüldü. Puanı alan oyuncunun papağanı iki kanadını kaldırarak sevinir; yeni kart çiftinde normal pozuna döner. İlerleme noktaları ve küçük arayüz simgeleri ayrı HD PNG'lerdir; panel yüzeyleri de atlas veya border-image kırpması kullanmaz. Görseller ve tam üretim istemleri `public/assets/game-ui/GENERATION-GAME-V16.md` içindedir. İsteğe bağlı tarayıcı kontrolleri `tests/browser-check.mjs`, 20 görünümden oluşan yerleşim kontrolü `tests/layout-check.mjs` ile çalıştırılır.

Güncel V18 görünümünde oyuncu isimleri doğrudan panelde sade metindir. Altıgenler daha ince mat bal sarısı / adaçayı yeşili kenar, sıcak krem iç yüz ve çok hafif gölge kullanır. Panel desensiz, çerçevesiz sıcak kırık beyazdır. Dört yeni görsel ve tam istemleri `public/assets/game-ui/GENERATION-GAME-V18.md` içinde kayıtlıdır.

V19'da Phaser 3.90 eklendi. `src/game-motion.js`, oyun ekranındaki 12 PNG simgesini şeffaf Canvas üzerinde çizer ve basma, senkron iki-simge kutlaması, kısa yerel ışıltılar ve kart geçişlerini yönetir. Native düğmeler klavye/dokunma/odak katmanıdır. Kart değişirken giriş kilitlenir, mola animasyonları dondurur, hareket azaltma tercihinde simgeler sabit kalır. Motor yalnız oyun açılınca ayrı paket olarak yüklenir ve oyun kapanırken temizlenir. Sonuç ekranı kazanan papağan, skor ve yeniden oynama düğmesiyle aynı görsel dili kullanır.

`tests/motion-check.mjs` gerçek Phaser çizimini ve hareketini piksel örnekleriyle doğrular; dokunmatik, kilit, mola, yeniden boyutlandırma, yeniden başlatma/temizlik ve görsel geri dönüşünü kapsar. `tests/result-check.mjs` üç sonuç durumunu ve yeniden oynamayı kontrol eder. Bunlar mevcut `COMIND_PLAYWRIGHT_DIR` ayarıyla çalıştırılır. Phaser'ın [Tween sistemi](https://docs.phaser.io/phaser/concepts/tweens) ve [3.90 Texture API'si](https://docs.phaser.io/api-documentation/3.90.0/class/textures-texture) kullanılır.

V20 etkileşiminde hover hafif büyüme ve kısa dönüş yapar. Ayrı basma/bırakma zıplaması kaldırılmıştır; doğru eşleşme mevcut hover pozundan tek bir senkron büyüme/dönüş hareketine geçer. Simgelerin arkasında yuvarlak vurgu zemini yoktur. `tests/interaction-check.mjs` bu davranışı Canvas piksel örnekleriyle kontrol eder.

Orman fonu harita değildir; mevcut proje görselleri referans alınarak built-in ImageGen ile üretilmiştir. Son düzenlemede bu fon korundu. Üretim istemi ve varlık kaynakları `TASARIM-NOTLARI.md`, tüm görsel üretim kayıtları `public/assets/home-ui/GENERATION*.md` dosyalarında saklıdır. Mat sürümün 10 görseli ve tam istemleri `GENERATION-SOFT-V6.md`, kullanıcının son rozeti ve yeşil Kofen güncellemesi `GENERATION-GREEN-KOFEN-V7.md` içindedir. Kullanıcı referansları `design/references/` klasöründe korunur. Yazı tipi lisansı `public/assets/baloo-2-LICENSE.txt` dosyasındadır. Oyun içindeki raster simgelerin kaynak bölgeleri src/game-ui.js içinde, tasarım ve üretim istemleri public/assets/game-ui/GENERATION-GAME-V14.md içinde kayıtlıdır. Yardım ve sonuç gibi diğer alanların SVG simgeleri src/icons.js içinde korunur.

V21 oyun ekranı kullanıcının son referansına göre güncellendi. Canlı orman ve ahşap platform, yapraklı altın altıgenler, lavanta ve mint yüzeyler, etiket sekmeleri ve üst sekmeli tur tablası yerleşik ImageGen ile PNG olarak üretildi. Sol alttaki 6gen CoMind Arena logosu eklenmedi. Mevcut simgeler ve Phaser etkileşimleri korunur. Oyun sırasında geniş krem arka panel kaldırıldı; kontroller ve skor orman üzerinde referanstaki gibi yerleşir. Puan ve süre dinamik kalır; alt gösterge mevcut 10 eşleşme hedefine ilerlemeyi gösterir. Üretim istemleri, kaynaklar ve kullanılan dosyalar public/assets/game-ui/GENERATION-GAME-V21.md içindedir.

V22'de arka plan sade ve düşük kontrastlı orman PNG'siyle değiştirildi. Ahşap platform artık ayrı şeffaf görseldir; kartların tabanına bağlı yerleşir. Dar temas gölgesi, geniş yumuşak zemin gölgesi ve uyumlu ışık kartları platforma oturtur. Kart değişirken ahşap yüzey sabit kalır. Uzun telefon ve tabletlerde her kartın altında ayrı platform vardır. Üretim kayıtları: public/assets/game-ui/GENERATION-GAME-V22.md. Yerleşim kontrolü 22 ekran/mod birleşiminde platform temasını da doğrular.

V23'te V22'nin sade orman kompozisyonu korunarak yalnız renk ve ışık ana sayfa arka planıyla eşleştirildi. Yeni varlık public/assets/game-ui/forest-calm-warm-v23.png dosyasıdır. Ek doygunluk azaltımı kaldırıldı; ana sayfayla aynı hafif sıcak krem örtüsü uygulandı. Kartlar, platform ve temas gölgeleri korunur. Tam üretim istemi public/assets/game-ui/GENERATION-GAME-V23.md içinde kayıtlıdır.

V24'te simgeler yaklaşık %10 küçültülüp kart yüzeyinin merkezine doğru yukarı taşındı; dokunma alanları korunur. Tur yazısı ve on nokta, alt tablanın merkezine bağımsız olarak hizalanır. Her tamamlanan tur sırayla kaydedilir: Sen/1. Oyuncu mor, Kofen/2. Oyuncu yeşil nokta doldurur. Üst puan renkleri de aynı ayrımı kullanır. Oyun artık toplam 10 tur tamamlandığında veya 90 saniye dolduğunda biter; yüksek puan kazanır, 5–5 beraberlik desteklenir. Tur yazısı yeni kart çifti açılınca ilerler. Eşleşen iki simgenin senkron büyümesi %18'den %24'e, dönüşü 8'den 11 dereceye, yükselmesi 5'ten 7 piksele çıkarıldı; hareket azaltma tercihi ve çift tıklama kilidi korunur. Yeni tests/progress-check.mjs iki modda sıralı renkleri, 10 tur/beraberliği, yeniden başlatmayı, sayaç ve merkez hizasını doğrular.

V26 sonuç ekranı kullanıcının yapraklı krem panel referansına göre yenilendi. Üretilmiş çerçeve, daha küçük yeşil tekrar butonu ve ev simgeli krem ana ekran butonu kullanılır. Son gönderilen karakter referanslarına göre kırmızı gözlüklü oyuncu ve yeşil şapkalı kâşif Kofen için normal/sevinçli dört yeni PNG üretildi; aynı kimlikler oyun üst barında, skor şeridinde ve sonuç ekranında kullanılır. Yan yana modunun ikinci oyuncusu da yeşil kimliği kullanır. İlk oyuncunun puan ve tur noktaları kırmızı, ikinci oyuncunun yeşildir. Kofen ve yan yana maçları genel liderliğe yazılmaz; kayıt mesajı kaldırıldı. Ana sayfadaki liderlik düğmesi gelecekteki rekabetçi sıralamayı açıklar. Eski kayıtlar silinmez. Tüm yeni varlıklar ve tam üretim istemleri public/assets/game-ui/GENERATION-GAME-V26.md içindedir.

V27'de insan oyuncuya oyuna özel, aksesuarı olmayan lavanta/mor papağan atandı; normal ve sevinçli pozları aynı 3B estetikte yeniden üretildi. Oyun barı, skor, mola ve sonuçlar bu iki pozu kullanır. İlk oyuncunun puan/nokta renkleri tekrar mora döndü. Sonuç ekranı artık ana sayfanın ormanını kullanır; oyun içi sade fon korunur. Sonuç kompozisyonu baştan ölçeklendi: büyük ekranda daha geniş/yüksek panel, daha büyük başlık/skor/avatarlar ve ferah aralıklar; yeni ince çerçeveli skor şeridi kullanılır. Gerçek 1920×869 görünümünde panel yaklaşık 690×605 pikseldir. Tam varlık yolları ve üretim istemleri public/assets/game-ui/GENERATION-GAME-V27.md içindedir.

V28'de sonuç ekranının kompozisyonu yenilendi. Yeni boş krem panel ve yazısız yeşil buton ImageGen ile üretildi. Kazanan panelin arkasından görünür; iki skor portresi aynı çapta yuvarlak kırpılır. İç içe altın skor çerçevesi kaldırıldı. Başlık, açıklama, skorlar ve düğmeler normal içerik akışında yerleşir; buton metni rasterla birlikte esnemez. Ana ekran bağlantısı daha hafif ev simgeli metindir. Ana sayfa ormanı, mor oyuncu/yeşil Kofen kimlikleri ve maç akışı korunur. Kaynaklar ve istemler public/assets/game-ui/GENERATION-GAME-V28.md içindedir.
