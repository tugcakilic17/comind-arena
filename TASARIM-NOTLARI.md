# 6gen görsel yönü — 20 Ekim 2026

## Tek akışlı seçim ve sade hover · V20

Ayrı pointerdown / pointerup sıkışma ve geri dönme hareketleri kaldırıldı. Eşleşme hareketi, simgelerin hover'dan kalan gerçek ölçek ve açısını başlangıç alır; poz sıfırlamadan doğrudan tek büyüme/dönüş tepesine çıkar ve yerine döner. Önce küçülme, ikinci büyüme ve ikinci toparlanma basamakları yoktur. Aynı ortak zaman çizelgesi iki simgeyi senkron yönetir. Yanlış seçimde de ek sıkışma yerine tek küçük dönüş ve geri dönüş vardır.

Mouse hover bir kez %7.5 büyür, 5° / −2° / 2° küçük dönüşle yerleşir; çıkınca normal ölçü/açıya döner. Parmak girişinde hover başlatılmaz. Hover, doğru ve yanlış seçimde simgelerin arkasındaki yuvarlak zemin ve gölgeler kaldırıldı; klavye odak çizgisi korunur. Görsel geri dönüşü ve hareket azaltma davranışları aynı düzeni izler.

`tests/interaction-check.mjs` gerçek Canvas pikselleriyle hover büyümesini, temiz zemini, hover çıkışında tam başlangıç pozunu, basılı tutarken ek bir sıkışma olmamasını ve iki eşleşmenin ikinci bir küçülme olmadan büyümesini doğrular. Phaser yaşam döngüsü / mola / dokunma / azaltılmış hareket kontrolleri ve üretim derlemesi de geçti. Yeni görsel üretilmedi.

## Phaser ile eşleşme hareketi, kart geçişleri ve sonuç ekranı · V19

Kullanıcının isteğiyle Phaser 3.90.0 çalışma bağımlılığı olarak kuruldu. `src/game-motion.js` oyun açılınca motoru dinamik yükler; mevcut PNG atlasındaki 12 simge gerçek Phaser Image nesneleri olarak şeffaf Canvas üzerinde çizilir. Görünür simge ölçüleri ve yönleri native düğmelerden alınır; klavye, dokunma, odak ve erişilebilir etiketler DOM'da kalır. En fazla 2× ekran piksel yoğunluğu, yeniden boyutlandırma hizalaması, native görsel geri dönüşü ve sahne temizliği uygulanır. Motor paketi ana sayfa başlangıç paketine dahil edilmez; üretim çıktısı ayrı Phaser parçasıdır (yaklaşık 319 kB gzip).

Basılı tutmada hafif sıkışma; yanlış seçimde kısa geri toparlanma; doğru eşleşmede iki simgeyi aynı zaman çizelgesinde yöneten senkron sıkışma → büyüme/küçük ters yönlü dönüş → yerine oturma hareketi vardır. Her simgenin çevresinde dört küçük PNG ışıltı kısa süre görünür; arada kalıcı yıldız yoktur. Puanı alan papağan sevinmeye devam eder. Eşleşme 760 ms tutulur; kart çifti 160 ms çıkış ve 220 ms giriş geçişi yapar. Ayrı oyun evreleri geçiş sırasında çift puanı ve yeni seçimi engeller. Mola sırasında motor zaman ölçeği sıfırlanır ve avatar hareketi durur; devam ederken mola süresi animasyona eklenmez. Hareket azaltma tercihinde simgeler sabit kalır, puan ve metin geri bildirimi devam eder.

Sonuç ekranı mevcut kırık beyaz PNG paneli, puan şeridi, sevinç papağanları ve ayrı oynat görseliyle yeniden yerleştirildi. Kazananın papağanı görünür; beraberlikte iki oyuncu kutlar. “Bir daha oynayalım” yeni karşılaşmayı sıfır puanla başlatır. Yeni görsel üretilmedi; V16/V18 varlıkları yeniden kullanılır.

Doğrulama: üretim derlemesi ve dört mantık testi; mevcut tarayıcı oyun akışı; iki modda 20 responsive görünüm; `tests/motion-check.mjs` ile gerçek Canvas piksel değişimi, senkron iki simge, giriş kilidi, mola, HD çizim, resize, dokunmatik, art arda yeniden başlatma/temizlik, hareket azaltma ve doku yüklenemediğinde geri dönüş; `tests/result-check.mjs` ile oyuncu/Kofen/beraberlik, telefonda sonuç yerleşimi ve yeniden oynama. Ekran çıktıları `test-results/` altında yereldir.

## Sade oyuncu isimleri ve ortak mat malzeme dili · V18

Kullanıcının onayladığı estetik değerlendirmeye göre SEN / KOFEN plakaları kaldırıldı. İsimler “Sen” ve “Kofen” biçiminde, doğrudan panel üzerinde sıcak kahverengi / sakin yeşil canlı metin olarak görünür. Adların çevresinde PNG, çerçeve veya kapsül yoktur. İki oyunculu mod aynı düzeni 1. Oyuncu / 2. Oyuncu ile kullanır.

İki altıgen görseli aynı silüet korunarak daha ince, düşük kabartmalı mat kenarla yeniden üretildi. Bal sarısı metalik parlaklıktan arındırıldı, yeşil adaçayına yaklaştırıldı. Panelin geniş/dikey yüzeyleri desensiz, çerçevesiz nötr sıcak kırık beyaza dönüştürüldü; sıcak krem kart içlerinden hafif ayrılır. Yapraklı başlık ve oyun simgeleri korunur. Kart grubunun önceki aşağı konumu ve masaüstü ölçüleri korunur. Uzun telefonlarda ve kısa yatay ekranlarda isimlere yer bırakmak için kart ölçüsü kullanılabilir yüksekliğe uyarlanır.

Dört PNG yerleşik image_gen ile üretildi; kaynaklar korunarak `public/assets/game-ui/*-v18.png` olarak kaydedildi. Dosyalar, referanslar ve tam istemler `public/assets/game-ui/GENERATION-GAME-V18.md` içindedir. Derleme, dört oyun mantığı testi, tarayıcı oyun akışı ve iki modda 10 ekran ölçüsünün yerleşim kontrolleri geçti. Masaüstü ve telefon sonuçları görsel olarak incelendi. Aşağıdaki bölümler önceki sürümlerin kaydıdır.

## Kart grubunun dengesi ve etiket bağlantısı

Kullanıcının son geri bildirimine göre masaüstü/tablet görünümünde altıgenler ve etiketleri 22 px aşağı alındı; kart ölçüsü korunur. Aradaki dekoratif yıldız DOM'dan kaldırıldı, iki sütunlu yerleşim aynı kart aralığını koruyacak şekilde düzenlendi. SEN / KOFEN etiketleri biraz daha kompakt, daha güçlü yazılı ve tepe çerçevesine bindirilmiş olarak yerleştirilir; üst başlıkla daha fazla boşluk vardır. Dar ve kısa ekranlarda ek aşağı kaydırma uygulanmaz, kısa telefonlarda etiketler ayrıca küçültülür. Mevcut PNG varlıkları yeniden kullanılır; yeni görsel üretilmedi.

## Kenarlıksız panel ve tepe etiketleri · V17

Kullanıcının yeni referansındaki yerleşime göre ana oyun panelinin altın çerçevesi ve iç çizgisi tamamen kaldırıldı; geniş ve dikey düz krem yüzeyler ayrı şeffaf PNG olarak yeniden üretildi. Başlık küçük yapraklı tabela, oyuncu etiketleri altıgenlerin tepesine bağlı bal sarısı SEN ve yeşil KOFEN plakaları olarak düzenlendi. İki oyunculu modda aynı plakalar 1. OYUNCU / 2. OYUNCU metni taşır. Plaka zeminleri raster, oyuncu adları erişilebilir canlı metindir.

Altıgen hedef ölçüsü 1.15 katsayısıyla büyütüldü: 1440×900 görünümünde 500 → 575 px, 1366×768 görünümünde 414 → 476 px. İki kartın çevresindeki grid genişliği içerik ölçüsüne göre sınırlandı ve orta boşluk daraltıldı. Daha küçük ekranlarda viewport sınırlarına uyarlanır. Simge ölçüsü kartın büyümesiyle artmasın diye yüzde oranı ters katsayıyla ayarlandı. Avatar yuvaları masaüstünde 54 → 64 px; sevinç pozu daha büyük ve belirgin zıplama ile görünür. Telefon/yatay ölçüler ayrıca ayarlandı.

Yerleşik image_gen ile beş PNG üretildi. Tam dosya/istem kaydı: `public/assets/game-ui/GENERATION-GAME-V17.md`. Kullanıcı referansı `design/references/game-plaques-reference-v17.png` içinde korunur. Oyun mantığı, derleme, tarayıcı akışı ve iki modda 10 ekran ölçüsünün yerleşimi kontrol edilir. Aşağıdaki bölümler önceki sürümlerin kaydıdır.

## Daha ferah oyun alanı, net ilerleme ve papağan sevinci · V16

Üst puan şeridi ve başlık daha az yükseklik kullanır; alt oyun paneline daha fazla yer ayrılır. Altıgenler artık 500 px'e kadar büyür; simge alanı %31'den %25'e çekilip iç görsel %93 ölçekle gösterilir. Büyük ekranda simgeler hafif küçülürken kartların çevresindeki boşluk artar. Küçük ekranda 44 px asgari simge düğmesi korunur. Uzun telefonlarda kartlar alt alta kalır.

Mor oyuncu papağanı ve yeşil Kofen için önden bakan, aynı boyutlu normal ve iki kanadı kalkmış sevinç pozları ayrı PNG olarak üretildi. Avatarlar eşit merkezlenmiş yuvalardadır. Puanı alan oyuncunun pozu 750 ms'lik eşleşme geri bildirimi sırasında değişir; yeni kart çiftinde sıfırlanır. İki oyunculu modda ikinci oyuncu için de çalışır. Hareket azaltma tercihinde zıplama uygulanmaz, sevinç pozu görünür.

İlerleme zemini ve boş/dolu noktaları, parıltı, doğru/yanlış işaretleri ayrı yüksek çözünürlüklü PNG'lerdir. Puan şeridi, kart sahibi etiketi ve geniş/dikey oyun panelleri de tam görsel olarak gösterilir; eski kontrol atlası ve panel border-image kırpması arayüzden kaldırıldı. Eşleştirme simgeleri mevcut 31 simgeli kaynağını korur. Tam görsellerin yalnızca şeffaf kenar boşlukları yerleşim sırasında normalize edilir; kaynak pikseller değiştirilmez.

14 görsel yerleşik image_gen ile üretildi. Dosyalar ve tam istemler: `public/assets/game-ui/GENERATION-GAME-V16.md`. `npm run build`, dört oyun mantığı testi, tarayıcı akışı ve her iki mod için 10 ekran ölçüsünde taşma/hizalama/tıklanabilirlik kontrolleri geçti. Önceki üretimler korunur; aşağıdaki bölümler tarihçedir.

## Kontrol görsellerinin netliği ve sade süre

Geri sayımın altındaki sn yazısı kaldırıldı; saat ve sayı tek satırda ortalanır. Kullanıcının beğendiği krem/yeşil/ochre tasarım korunarak geri, ses açık/kapalı, duraklat/devam ve kronometre için ayrı 1254×1254 şeffaf PNG'ler üretildi. Bu kontroller atlas kırpması yerine doğal img elemanlarıdır. Ortak simgeyi bul! tabelası da temiz kenarlı yeni PNG ile değiştirildi ve görünür ölçüsü korunarak yerleştirildi. Normal ve yüksek piksel yoğunluklu tarayıcı görüntüleri incelendi. Dosyalar ve tam built-in ImageGen istemleri `public/assets/game-ui/GENERATION-SHARP-CONTROLS-V15.md` içindedir. Altıgenler, oyun simgeleri ve avatarlar korunur.

## Altıgenlerin ölçüsü

Kullanıcının ilk oyun ekranı geri bildirimine göre altıgen yüz/çerçeve görselleri %12 büyütüldü. Simge ve etkileşim katmanının ölçüsü/konumu korunur; böylece simgeler aynı büyüklükte kalırken çevrelerinde daha geniş krem boşluk oluşur. Kart sahibi etiketleri yeni çerçeveye göre yukarı taşındı; telefonda başlıkla araları korunur. Yeni görsel üretilmedi.

## Güncel oyun ekranı: raster kartlar, simgeler ve ayrı oyuncu papağanı

Kofen’le Oyna ekranı kullanıcının örneğindeki puan şeridi, iki altıgen kart, üst tabela ve on noktalı ilerleme düzeniyle yeniden hazırlandı. Sıcak krem, mat bal sarısı ve yaprak yeşili varlıklar ana sayfanın estetiğine uyar. Kart yüzleri/çerçeveleri, 31 oyun simgesi, geri/ses/duraklat kontrolleri, kronometre, ara parıltı ve ilerleme noktaları üretilmiş raster PNG'lerdir. Kod bu illüstrasyonları çizmez; görselleri yerleştirir ve oyun durumuna bağlar.

Üst alanda Kofen'in mevcut yeşil papağan avatarı ve Sen için ayrı mor, turkuaz gözlü, şeftali gagalı papağan kullanılır. Telefonlarda ikisi de görünür. Tüm simge kimlikleri ve ortak eşleşme kuralı korunur. Süre/puan, ses, mola, sonuç ve yerel iki oyuncu aynı oyun mantığıyla çalışır. Kartlar ekran oranına göre yan yana veya alt alta yerleşir. Ana sayfa değişmedi.

Dosyalar ve tam built-in ImageGen istemleri `public/assets/game-ui/GENERATION-GAME-V14.md` içindedir. Önceki görseller korunur. Aşağıdaki bölümler önceki sürümlerin kaydıdır.

## Güncel hareketler: girişte baloncuk, ana sayfada polenler

Giriş düğmesi, oynat düğmeleriyle aynı `play-bubble` sıkışma/esneme animasyonunu hover ve klavye odağında kullanır. Dış katman hafif yaylanarak büyür, basıldığında görsel sıkışır. Mevcut pencere açılma hareketi korunur.

Yalnızca ana sayfada, içeriğin arkasında 24 küçük dekoratif polen tanesi süzülür. Krem/altın noktalar ve ince karahindiba tüyleri farklı hızlarda kıvrılarak yükselir; negatif gecikmeler sahneyi ilk açılıştan itibaren doldurur. Telefonlarda yarısı gizlenir. Katman tıklama almaz, erişilebilirlik ağacından gizlidir ve oyun ekranında oluşturulmaz. Hareket azaltma tercihinde polenler gizlenir, baloncuk ve pencere animasyonları durur. Efekt CSS şekilleri ve animasyonlarıyla uygulanır; yeni raster görsel üretilmedi.

## Güncel üst alan: yapraksız krem marka ve daha büyük giriş

Kullanıcının onayıyla üstteki iki raster görsel sadeleştirildi: çevrelerindeki yapraklar, çiçekler ve krem yüzeydeki yaprak desenleri kaldırıldı. CoMind'in beyaz dış kenarı ve harf konturu kaldırıldı; CSS'te beyaz/açık renk drop-shadow yerine yalnızca hafif koyu gölge bırakıldı. Giriş düğmesi masaüstünde 245×86 px, telefonda 154×60 px alana büyütüldü (yaklaşık %20). Dar ekranlarda marka genişliği esneyerek yan yana yerleşim korunur.

Yeni şeffaf PNG'ler `brand-clean-cream-v12.png` ve `login-clean-cream-v12.png` olarak `public/assets/home-ui/` içindedir. Built-in ImageGen istemleri ve dosyalar `GENERATION-CLEAN-HEADER-V12.md` içinde kayıtlıdır. Ortadaki 6gen logosunun yaprakları, arka plan ve kartlar korunur. Aşağıdaki bölümler önceki sürümlerin kaydıdır.

## Güncel üst görseller: kullanıcının yapraklı marka ve giriş tasarımları

Sol üstte `CoMind Arena Leafy Game Badge.png`, sağ üstte `Whimsical Leafy Giriş Yap Button.png` kullanılır. Kullanıcının özgün dosyaları değiştirilmeden `public/assets/home-ui/brand-user-leafy-v11.png` ve `login-user-leafy-v11.png` olarak kopyalandı. Her ikisi 2172×724 şeffaf PNG'dir. Mevcut dengeli üst alan ölçüleri, tıklama ve pencere animasyonları korunur. Ortadaki 6gen logosu ve oyun kartları değişmedi. Bu adımda yeni görsel üretilmedi. Aşağıdaki bölümler önceki sürümlerin kaydıdır.

## Güncel marka hiyerarşisi: CoMind sol üst, 6gen ortada

Kullanıcının düzeltmesi doğrultusunda papağanlı CoMind Arena marka rozeti sol üste alındı ve masaüstünde 340×112 px alanda daha belirgin gösterilir. İnce krem kenar ve yumuşak koyu gölge, yeşil karakteri arka plan yapraklarından ayırır; dosyanın kendisi değişmedi. Ortadaki başlık, yeni verilen `6gen CoMind Arena Logo.png` dosyasının birebir kopyasıdır.

Önceki sade CSS giriş düğmesi yerine temanın mat hacimli dilinde yeşil, krem yazılı ve küçük yaprak detaylı bir PNG üretildi. Masaüstünde 204×72 px, telefonda 128×50 px alanda gösterilir; şeffaf kenar boşlukları bu ölçülere dahildir. Basma hareketi ve pencere açılma animasyonu korunur. Üretim istemi ve dosyalar `public/assets/home-ui/GENERATION-HEADER-V10.md` içindedir. Kartlar, renkleri ve arka plan korunur. Aşağıdaki bölümler önceki sürümlerin kaydıdır.

## Güncel kart renkleri: yeşil Kofen, mavi/kırmızı ikili, mavi davet

Yan Yana Oynayalım kartında sağdaki yeşil kâşif, aynı küçük ölçekte gözlüklü kırmızı papağanla değiştirildi. Mavi karakterle çak yapma pozu, tüm yazılar, açık sarı kart ve ayrı oynat alanı korunur. Kofen'in düğmesi karakterin sıcak yaprak yeşiline, yan yana düğmesi kırmızı karakterin mercan tonuna, davet düğmesi mavi karakterin gök mavisine uyarlandı. Düğmelerin küçük ölçüsü ve mevcut baloncuk/kart hareketleri değişmedi.

Dört PNG built-in ImageGen ile ayrı ayrı düzenlenip `public/assets/home-ui/*-v9.png` olarak eklendi. Tam istemler ve referanslar `GENERATION-COLOR-MATCH-V9.md` içindedir. Önceki dosyalar korunur.

## Güncel üst alan: tek merkez logo ve sade giriş

Kullanıcının verdiği özgün CoMind Arena rozeti artık ortadaki eski 6gen/papağan başlığının yerine kullanılır. Sol üstteki küçük tekrar kaldırıldı. Dosyanın içeriği değiştirilmedi.

Sağ üstteki iri raster giriş düğmesi yerine, mat krem zeminli ve adaçayı yeşili hesap simgeli kompakt bir düğme kullanılır. Masaüstünde 46 px, telefonda 42 px yüksekliğindedir. Hover ve basma geri bildirimi hafiftir. Tıklamada mevcut üyelik bilgilendirme penceresi yükselip belirir; arka plan yumuşakça bulanıklaşır. Hareket azaltma tercihi animasyonları kapatır. Üyelik altyapısının henüz bağlı olmadığı bilgisi korunur.

Arka plan, mod kartları, küçük oynat düğmeleri ve alt menüler korunur. 10 ekran ölçüsünde tek ekrana sığma, pencere açılışı, Escape ile kapanma, odağın düğmeye dönmesi ve mevcut tarayıcı oyun kontrolleri doğrulandı. Aşağıdaki bölümler önceki sürümlerin kaydıdır.

## Güncel Kofen: kullanıcının yeşil rozet karakteri

Kullanıcının son verdiği `CoMind Arena Parrot Badge.png` görseli sol üstte dosya içeriği değiştirilmeden kullanılıyor (`brand-user-parrot-badge-v7.png`). Bu açık istek, önceki çerçevesiz marka tercihinin bu alan için yerini alır. Küçük ekran başlık genişliği, logo ve giriş düğmesi yan yana sığacak şekilde ayarlandı.

Kofen’le Oyna kartındaki kırmızı karakter, rozetteki aynı yeşil tüylü, sarı gagalı, kahverengi gözlü ve pembe yanaklı papağanın el sallayan haliyle değiştirildi. Şapka/gözlük/kolye eklenmedi. Kartın mat yüzeyi, küçük karakter ölçüsü, yazısı ve bağımsız oynat katmanı korunur. Oyun içi avatar da aynı yeşil kimlikle eşleşir. Diğer kartlar, orta başlık, arka plan ve hareketler değişmedi.

İki yeni görsel built-in ImageGen ile üretildi; dosyalar ve tam istemler `public/assets/home-ui/GENERATION-GREEN-KOFEN-V7.md` içindedir. Rozetin orijinali ile proje kopyasının birebir aynı olduğu, üç dosyada şeffaf alfa, masaüstü/telefon yerleşimi ve yeşil avatarla oyunun başlaması doğrulandı. Aşağıdaki bölümler önceki sürümlerin kaydıdır.

## Güncel yön: mat yüzeyler, çerçevesiz üst alan, Kofen

Kullanıcının geri bildirimi üzerine v5'teki aşırı cilalı/parlak görünüm yeni raster üretimlerle düzeltildi. Geniş yayılmış ışık, mat tüy/kumaş/kâğıt yüzeyleri, daha sakin yeşil/sarı/lavanta tonları ve yumuşak gölgeler kullanıldı. Arka plan resmi değiştirilmedi. Bu bir genel doygunluk filtresi değildir; 10 yeni şeffaf PNG built-in ImageGen ile üretildi.

Sol üstteki CoMind markası artık yalnızca yeşil papağan ve yazıdır; tahta/krem dış plaka ve altın çerçeve yoktur. Giriş alanı çerçevesiz mat krem düğmedir. Başlıktaki metalik altın parlamalar ve alt ahşap tabela kaldırıldı. Kartların ölçüsü korunurken papağanlar daha küçük ve ferah yerleşimle yeniden hazırlandı. Kart kenarları mat krem ve hafif sıcak gölgeli hale getirildi. Alttaki üç ahşap menü korunur.

Karakter adı canlı arayüzün tamamında Kofen'dir: “Kofen’le Oyna”, puan tablosu, kart sahibi, geri bildirim, sonuç ve liderlik açıklamaları. Yeni mat kırmızı karakter avatarı kullanılır. Yan Yana Oynayalım kartında ayrıca “Aynı cihazda 2 kişi” açıklaması bulunur.

Adaçayı yeşili, bal sarısı ve lavanta oynat görselleri ayrı katmanlar olarak yeniden üretildi. Küçük ölçüleri, tek seferlik baloncuk/basma hareketleri ve kart eğimi/düzleşmesi korunur; hover parlaklığı hafifletildi. Üst liderlik, koleksiyon, alt bilgi ve dış ses düğmesi yoktur.

Dosyalar `public/assets/home-ui/*-v6.png`, tam üretim istemleri `GENERATION-SOFT-V6.md` içindedir. Önceki dosyalar tarihçe olarak korunur. Kontroller: 10 PNG'de şeffaf alfa, mevcut tarayıcı oyun akışı, 10 ekran boyutunda tek ekrana sığma, animasyonlar/hareket azaltma, Kofen avatarı ve Kofen'in puan/kart/sonuç/liderlik metinleri doğrulandı. Aşağıdaki bölümler önceki sürümlerin kaydıdır.

## Kullanıcının papağanlarıyla yeni kimlik

Üç kullanıcı referansındaki mavi gezgin, kırmızı gözlüklü ve yeşil kâşif papağan karakterleri built-in ImageGen ile arayüze uyarlandı. Ortadaki 6gen / CoMind Arena başlığı üç karakteri bir araya getirir; sol üstteki marka plakasında genel altıgen simgesi yerine yeşil kâşif papağan bulunur.

Mod başlıkları çocuklara daha sıcak hitap edecek şekilde değişti: “Piko’yla Oyna” (kırmızı gözlüklü Piko, tek kişilik), “Yan Yana Oynayalım” (mavi ve yeşil papağanlar, aynı cihazda iki kişi), “Arkadaşını Çağır” (mektuplu mavi papağan, çevrim içi davet). Ekran okuyucu açıklamaları modların teknik ayrımını da belirtir. Oyun içindeki Piko avatarı aynı kırmızı karakterle eşleştirildi. Davet altyapısı henüz bağlı değildir; açıklama penceresi korunur.

Altı yeni PNG `public/assets/home-ui/` klasöründedir; tam üretim istemleri `GENERATION-PARROTS-V5.md` dosyasındadır. Referansların kopyaları `design/references/` altındadır. Kullanıcının görsellerindeki arka planlar kullanılmadı; mevcut orman fonu, bağımsız küçük oynat düğmeleri, baloncuk hareketi, kart eğimi/düzleşmesi, alt menüler ve belirgin giriş düğmesi korundu.

Mevcut tarayıcı oyun akış kontrolü geçti; ayrıca 10 ekran boyutunda tek ekrana sığma, marka/giriş ayrımı, hareketler, yeni Piko avatarının yüklenmesi ve altı PNG'nin şeffaflığı doğrulandı. Aşağıdaki bölümler önceki tasarım sürümlerinin kaydıdır.

## Ayrı oynat düğmeleri ve kart hareketi

Son sürümde v2 kartlar ImageGen ile düzenlendi: yalnızca altlarındaki oynat düğmesi kaldırıldı; ikonlar, Türkçe yazılar ve çerçeveler korundu. `mode-*-base-v3.png` kart tabanlarının üzerine `play-green-v3.png`, `play-yellow-v3.png` ve `play-purple-v3.png` ayrı şeffaf görsel katmanları yerleştirildi. Aynı erişilebilir HTML düğmesi hem kart hem oynat alanını kapsar; iç içe düğme yoktur.

Kartlar masaüstünde -3°, +1,5° ve +3°; telefonda -2°, +2° ve -2° eğiktir. Üzerine gelince düzleşir ve önceki yükselme tepkisi korunur. Oynat katmanı ayrıca büyür/parlar, basılıyken küçülüp aşağı iner. Klavye odağı, dokunma ve hareket azaltma tercihi desteklenir.

Üstteki giriş düğmesi menülerle aynı ahşap dilde `login-wood-v3.png` görselini kullanır. Üst liderlik düğmesi ve alt bilgi yoktur. Ana sayfa tek ekrana sığar. Yedi yeni varlığın tamamı `public/assets/home-ui/` klasöründedir; built-in üretim istemlerinin tamamı `GENERATION-V3.md` dosyasında kayıtlıdır. v2 görseller silinmedi.

Doğrulama: oyun birim testleri, üretim derlemesi ve mevcut tarayıcı akış kontrolü geçti. Ayrıca gerçek hareket tercihinde kartın eğik duruşu/düzleşmesi, ayrı oynat katmanının büyümesi/basılması, dokunarak iki kişilik oyuna geçiş, giriş penceresi, hareket azaltma ve 10 ekran boyutunda tek ekran yerleşimi kontrol edildi. Yedi PNG'nin şeffaf alfa içerdiği doğrulandı. Aşağıdaki bölümler önceki sürümlerin kaydıdır.

## Son ana sayfa güncellemesi

Kullanıcının yeni ekran referansındaki üç altıgen mod kartı ve üç ahşap alt menü, built-in ImageGen ile ayrı ayrı gerçek şeffaf PNG olarak üretildi ve `public/assets/home-ui/` klasörüne kopyalandı. Robot/iki oyuncu/bağlantı ikonları, Türkçe başlıklar, oynat düğmeleri ve yapraklı çerçeveler görsellerin içindedir. Alt menüde yalnızca Nasıl Oynanır, Liderlik Tablosu ve Ayarlar vardır; koleksiyon eklenmedi. Mevcut orman arka planı korundu. Önceki büyük giriş paneli yeni ana sayfada kullanılmıyor; varlığı silinmedi. Tam istem seti aynı klasördeki `GENERATION.md` dosyasındadır. Aşağıdaki giriş paneli açıklamaları önceki tasarımın kaydıdır.

Solo ve yerel kartlar doğrudan oyunu başlatır; çevrim içi kart açıklama penceresi açar. Hız ve ses ayarları çalışan ayarlar penceresine taşındı. Masaüstünde kartlar yan yana, telefonda iki kart ve altında ortalanmış davet kartı gösterilir. Üç ahşap menü telefonda da aynı sırada yan yanadır. Güncellenmiş tarayıcı kontrolü altı varlığın yüklenmesini, ayarları, davet açıklamasını, oyun işleyişini ve mobil taşmayı doğrular.

Kullanıcının yönlendirmesi: Keşif Dünyası’nın parlak, çocuksu, hacimli harita estetiği korunacak; 6gen içinde dünya/oyun haritası olmayacak. Dikkati dağıtmayan ormanımsı fon kullanılacak. Giriş/mod seçimi ve oyun ekranı birbirinden ayrı tutulacak. Reklam başlıkları ve açıklamalar oyun sırasında görünmeyecek.

## Kaynaklar

İncelenen mevcut proje: `C:/Users/tugca/Desktop/guncel_projeler/kesif-dunyasi`.

- `apps/web/public/assets/world_map/background/world-home-v10.png`: renk ve hacimli oyuncak estetiği referansı. Yeni projede harita olarak kullanılmıyor.
- `apps/web/public/assets/game_map/forest-valley-original.png`: orman, yuvarlak ağaçlar ve ışık referansı. Yeni projede harita olarak kullanılmıyor.
- `apps/web/public/assets/ui/game-intro/frame.png` → `public/assets/intro-frame.png`: gerçek yıldızlı, altın kenarlı, yapraklı çerçeve. Giriş panelinin arka planında kullanılıyor.
- `apps/web/public/assets/world_map/ui/forest-tree-icon-v1.png` → `public/assets/forest-tree.png`: mola ekranındaki orman simgesi.
- Baloo 2 ve Piko avatarı önceki taslaktan korunuyor.

## Üretilen fon

Yöntem: built-in `image_gen.imagegen`. İki referans görüntüyle yeni bir fon üretildi; mevcut harita düzenlenmedi.

Projede kullanılan dosya: `C:/Users/tugca/Desktop/comind-arena/public/assets/forest-clearing-v1.png`.

Orijinal çıktı: `C:/Users/tugca/.codex/generated_images/01a1582b-25b5-7b80-b063-b4b17ef552a8/exec-06ed3cfa-a2be-4aeb-b7e4-a49554b687dd.png`.

Son üretim istemi:

> Create one landscape 16:9 background image asset for a children's web matching game. The two supplied images are STYLE REFERENCES ONLY, not an edit target. Match their gorgeous playful 3D toy/clay storybook aesthetic closely: lush rounded lime and emerald tree canopies, soft chunky pines, rounded grassy hills, soft warm daylight, bright cyan blue sky with puffy white clouds, gently glossy toy material, very child friendly and charming. Scene: ground level quiet woodland clearing, with trees and bush foliage framing the far LEFT and RIGHT edges and upper corners. A LARGE EMPTY OPEN clearing occupies the central 70% of the image, with muted smooth pale mint and ivory grass and a softly blurred far treeline. Keep the center low contrast and very low detail to sit BEHIND game cards without distraction. More saturated lively green plants and a few tiny daisies only at extreme outer edges. The perspective is at eye level into a forest, NOT an aerial game map. No path, road, buildings, cabins, bridges, rivers, islands, game symbols, people, animals, lettering, words, logos, frames, UI, cards, buttons or watermark. A quiet ambient forest background with the same rounded modeled trees as the supplied references. No border. This is a finished raster game asset.

## Ekran ayrımı

- `screen-home`: mod seçimi ve küçük yardım; üstte hesap ve liderlik düğmeleri.
- `screen-game`: yalnızca oyun. Genel site başlığı/alt bilgisi DOM’a eklenmez. Geri, ses ve mola kontrolleri oyun araç çubuğundadır. Ekran okuyucu başlığı ve tur bilgisi görsel olarak gizlidir.
- `screen-result`: sonuç, yeniden oyna ve ana ekrana dön; genel menü geri gelir.

Üyelik, çevrim içi oda ve ortak veritabanı bu tasarım değişikliği kapsamında eklenmedi; önceki prototip sınırları geçerli.

## Doğrulama

`npm test` oyun destesini ve yerel kayıtları sınar. `npm run build` üretim çıktısını oluşturur.

`tests/browser-check.mjs`, yüklü Playwright ile giriş/oyun ayrımını, görsel varlıkların yüklenmesini, puanlamayı, Piko’yu, iki kişilik oyunu, molayı, sonuçları ve telefon yerleşimini kontrol eder. `COMIND_PLAYWRIGHT_DIR` ortam değişkenine Playwright paketinin klasörü verilerek çalıştırılabilir. Yerel ekran görüntüleri git dışında bırakılan `test-results` klasöründedir.

## V21 — son kullanıcı ekran referansı

Kullanıcının 21 Ekim 2026 tarihli ekran görseli design/references/game-screen-v21.png konumunda korundu. Bu sürümün görsel kaynağı bu referanstır; önceki mat V18 tercihleri oyun ekranında bu referansla değiştirildi. Sol alttaki marka logosu eklenmedi. Tam üretim istemleri ve son mint eş kart dahil tüm varlık kaynakları public/assets/game-ui/GENERATION-GAME-V21.md dosyasında kayıtlıdır. Oyun içi çizimler kodla yeniden çizilmedi; raster PNG yüzeyler ve mevcut simge atlası kullanılır. CSS yerleşim, erişilebilir tıklama alanları ve etkileşim durumlarını yönetir. Phaser mevcut simge animasyonlarını sürdürür.

## V22 — sade arka plan ve temas gölgeleri

Kullanıcının kalabalık fon ve tahtadan kopuk kart eleştirisi doğrultusunda orta alanı açık, düşük kontrastlı orman üretildi. Ahşap platform arka plandan ayrıldı ve kart yerleşimine bağlandı. Kart tabanındaki dar temas gölgesi ile daha geniş yumuşak gölge ayrıdır. Uzun dik ekranlarda her kart ayrı bir ahşap yüzeye oturur. Tur değişirken yalnız kart/simge katmanları hareket eder, tahta yüzeyler sabit kalır. Tam görsel üretim istemleri public/assets/game-ui/GENERATION-GAME-V22.md içinde kayıtlıdır.

## V23 — ana sayfanın sıcak renkleri

Kullanıcının isteğiyle V22'nin sade kompozisyonu korunurken soğuk mint tonlama ana sayfadaki sıcak sarı-yeşil, bal sarısı ışık ve mavi gökyüzü ailesiyle eşleştirildi. Ana sayfa arka planı yalnız palet referansı olarak kullanıldı; yeni nesne veya detay eklenmedi. Ek doygunluk filtresi kaldırıldı, ana sayfanın sıcak örtüsü oyun fonunda da uygulandı. Tam istem ve varlık yolları public/assets/game-ui/GENERATION-GAME-V23.md içindedir.

## V24 — simge dengesi ve oyuncuya göre tur noktaları

Simgelerin görsel ölçeği .98'den .88'e indirildi; yerleşim alanı 13% üst/5% alt yerine 10% üst/8% alt boşluk kullanılarak yukarı alındı. Etkileşim alanları aynı kaldı. Tur başlığı tablanın üst sekmesine, nokta sırası alt gövdesine ayrı merkezler üzerinden yerleşir. Yeşil mevcut HD PNG noktası rakibi, aynı rasterın mor tonlaması ilk oyuncuyu gösterir. Tur geçmişi en yüksek skordan türetilmez; her turun kazananı kendi sırası içinde saklanır. 10 toplam turun ardından puan karşılaştırılır; 90 saniyelik üst süre sınırı korunur. Aynı anda iki simgenin büyüme/dönme/yükselme hareketi ölçülü biçimde güçlendirildi; yeni görsel varlık üretilmedi ve arka plan paleti değiştirilmedi.

V25'te alt tur göstergesinin optik dikey hizası düzeltildi: başlık üst krem sekmenin görünen merkezine, nokta sırası alt krem gövdenin merkezine taşındı. Sadece iki yerleşim oranı değişti; raster çerçeve, tur akışı ve oyuncu renkleri korundu. 1130×621, 390×844, 1920×1080 ve 844×390 görünümlerinde 3× çözünürlüklü yakın planlar kontrol edildi. Görseller test-results/progress-centered-v25-*.png dosyalarında.

## V26 — referans karakterler ve sonuç paneli

Sonuç ekranı kullanıcının son panel örneğine göre yapraklı, altın kenarlı krem PNG çerçeveyle kuruldu. Üstte kazananın kanatları yukarıda pozu, altında başlık, açıklama, avatarlarla gerçek maç skoru, süre/eşleşme ve iki kompakt görsel düğme bulunur. Ana ekrana dönüşte ev simgesi kullanılır. Kırmızı karakterde yuvarlak gözlük/siyah gaga/beyaz yaka/Sigma, yeşilde kâşif şapkası/siyah gaga/fular/yelek korunur. Dört poz aynı kimlikleri oyun üst barında ve sonuçlarda paylaşır. Yeşil kimlik yerel ikinci oyuncuya da atanır. İlk oyuncu renkleri kırmızı kimliğe uyumlandı. Önceki ürün akışı kararına göre iki gündelik mod genel liderlik puanı üretmez; sonuç kaydı yazısı kaldırılmış, liderlik penceresi gelecekteki rekabetçi modu açıklayacak şekilde düzenlenmiştir. Yeni sayfa veya backend eklenmedi. Eski kayıtlar silinmedi. Yedi dosya, kaynakları ve tam istemler public/assets/game-ui/GENERATION-GAME-V26.md içindedir.

## V28 — bütünleşik sonuç kompozisyonu

V27 yerleşimindeki dağınık oranlar, ağır iç çerçeve ve esneyen buton yazıları düzeltildi. Panel ve boş yeşil buton yeniden üretildi; başlık, açıklama, skor, istatistik ve aksiyonlar normal akışta yerleşir. Papağan gövdesi opak panelin arkasında kalır; iki oyuncu eşit yuvarlak portrelerle gösterilir. Mobilde portre/isim/puan sırası iki tarafta aynıdır. Ana ekrana dönüş hafif ev simgeli bir bağlantıdır. Ana sayfa ormanı kullanılır. Varlık yolları ve istemler public/assets/game-ui/GENERATION-GAME-V28.md dosyasındadır.

## V27 — ayrı oyuncu kimliği ve ferah sonuç ölçeği

Son kullanıcı geri bildirimine göre insan oyuncu kırmızı gözlüklü karakter yerine özgün lavanta/mor, krem yüzlü/göğüslü ve aksesuarı olmayan bir papağandır. Aynı malzeme ve aydınlatma korunur; normal ve iki kanadı yukarıdaki sevinç pozu üretildi. Kofen'in yeşil kâşif görselleri korunur. Sonuç ekranı ana sayfanın ormanını kullanır; oyun fonu değişmez. Önceki sabit 500 px panel kaldırıldı. Panel, kahraman, tipografi, yeni ince skor çerçevesi, istatistikler ve aksiyonlar bir bütün olarak ekran yüksekliğine ve genişliğine göre ölçeklenir. Masaüstünde köşe başlığı artık sonuç kompozisyonunu aşağı sıkıştırmaz. Büyük ekranlarda boyut ve okunurluk testle korunur; önizlemeler gerçek ekran genişliğinde, kırpmasız alınır. Kaynaklar ve istemler public/assets/game-ui/GENERATION-GAME-V27.md içinde kayıtlıdır.
