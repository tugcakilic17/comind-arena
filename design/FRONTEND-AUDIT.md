# Backend öncesi frontend kontrolü — 21 Ekim 2026

22 Ekim güncellemesi: hesap, çevrim içi arkadaş maçı, gerçek liderlik ve Keşif Dünyası ortak hesap bağlantısı yerelde tamamlandı. Bu belgenin aşağısı önceki frontend denetiminin tarihsel kaydıdır. Güncel kurallar ve doğrulama: [ONLINE-ACCOUNTS.md](ONLINE-ACCOUNTS.md); Google kurulumu: [AUTH-SETUP.md](AUTH-SETUP.md).

23 Ekim temizlik notu: Aktif olmayan görseller ve PNG kopyaları kaldırıldı; aktif WebP dosyaları korunuyor. Eski `optimize-assets.mjs` kaldırıldı. Üretim kayıtları `design/generation/`, güncel simge kaynakları `design/symbols-v2/` altındadır.

## Düzeltilenler

- **Soğuk oyun açılışı:** Önceden kart görselleri henüz yüklenmeden sayaç başlıyordu. 2,2 saniye geciktirilmiş kart isteğinde eksik kartla süre 89'a düşüyordu. Artık `assets.js` gerekli görselleri (CSS fonu ve simge atlası dahil) yükleyip decode eder. Ekran ve animasyon katmanı hazır olmadan sayaç/giriş açılmaz.
- **Bekleme, hata, iptal:** Kullanıcı tercihiyle oyun hazırlanırken yükleme penceresi/yazısı gösterilmez. Önceki ekran görünür kalır; yeni oyun bağlı DOM'da ilk çizimini tamamlayana kadar aynı görünüm korunur. Görseller ve animasyon katmanı hazır olduğunda doğrudan oyuna geçilir ve sayaç başlar. Escape bekleyen geçişi iptal eder. Başarısız veya 15 saniye içinde tamamlanmayan kritik görsel, tekrar deneme ve ana ekrana dönüş sunar. İptal edilmiş yükleme sonradan oyunu açamaz. Animasyon motoru en fazla 4 saniye beklenir; yüklenmezse DOM simgeleriyle oynanır.
- **Ön hazırlık:** Ana sayfanın yüklenmesinden sonra boş zamanda oyun görselleri hazırlanır. Veri tasarrufu etkinse bu otomatik hazırlık yapılmaz. Fare/klavye ile oyun moduna yönelmek de hazırlığı başlatır. Font ve ana sayfa fonu HTML'den öncelikli istenir.
- **Görsel boyutu:** Aktif referansları bulunan 46 görsel için aynı boyutta, kayıpsız WebP teslim kopyası üretildi: 61,8 MB → 35,9 MB (%42 azalma). PNG kaynakları ve üretim kayıtları korunur; arayüz WebP kullanır. `scripts/optimize-assets.mjs` yeniden üretir; `COMIND_SHARP_DIR`, kurulu `sharp` paketine işaret edebilir.
- **Liderlik:** Kullanıcının sonraki isteğiyle büyük krem panel, yardım/ayarlarla ortak papağan ve 30 örnek oyunculu tasarım önizlemesi hazırlandı. Açılışta 15. sıradaki “Sen” dört üst/dört alt oyuncuyla birlikte dokuz satırın ortasındadır. En üste, bir sıra yukarı, bir sıra aşağı, en alta ve kendi sırana dönüş çalışır. Veriler `leaderboard-ui.js` içindeki açıkça etiketlenmiş örneklerdir; gerçek maç puanlarını değiştirmez. Kofen ve yan yana maçları genel sıralama puanı kazandırmaz.
- **Davet:** Aynı panel dili ve çalışan yan yana oyuna geçiş var. Davet penceresinin kapanışı bitmeden yeni ekran oluşturulmaz.
- **Ayarlar/erişim:** Ses ve zorluk tarayıcıda saklanır, hatalı/engelli storage oyunu bozmaz. Ana ekrana dönüşte klavye odağı oynanan moda döner. Pencerelerin görselleri parça parça gösterilmez; kapatma düğmesi yükleme sırasında da kullanılabilir. Üyelik penceresi Google girişinin henüz hazır olmadığını baştan açıklar.

## Doğrulama

Oyun hazır olduğunda önceki ekran 420 ms'de yumuşakça kaybolur; oyun 480 ms'de hafif yükselerek belirir. Sayaç ve giriş bu geçiş tamamlanınca açılır. Hareket azaltma tercihinde bu hareket atlanır. Escape geçiş animasyonlarını ve bekleyen oyunu da temizler. `entry-check.mjs`, tarayıcıda gerçek ara opaklığı, geçiş sırasında korunan 90 saniyeyi, hazır görselleri, iptali ve hareket azaltma tercihini doğrular.

`npm test`, `npm run build` ve mevcut Playwright kontrolleri. `frontend-flow-check.mjs`, yavaş istek, kritik varlık hatası/tekrar deneme, iptal, yenilemede ayar saklama, erişilemeyen storage, altı liderlik/davet yerleşimi ve davetten yerel oyuna geçişi kapsar. `layout-check.mjs`, iki modda toplam 22 boyutta kart/platform/etiket/etkileşim yerleşimini kontrol eder. Testlerde asenkron oyun hazırlığının tamamlanması beklenir.

`leaderboard.test.js` dokuzlu pencereyi, merkezdeki oyuncuyu ve sınırları doğrular. `leaderboard-check.mjs` 30 oyuncunun tamamına ulaşmayı, bütün gezinme düğmelerini, yedi ekran boyutunu, tekrar açılınca kendi sırana dönmeyi ve klavye odağını kontrol eder.

## Backend ile tamamlanacaklar

1. Ortak kimlik, Google oturumu, çıkış, profil ve gerçek hesap hata/bekleme akışları.
2. Sunucu otoriteli çevrim içi maç/oda, eşleştirme, bağlantı kopması ve tekrar bağlanma.
3. Rekabet puanı kuralı, eşit puan sırası ve varsa sezon/dönem kararı. Ardından sunucu doğrulamalı liderlik verisi, kullanıcının kendi sırası, sayfalama ve veri yükleme/hata durumları. Şimdiki boş durum bunları taklit etmez.
4. Hesap/veri akışları kesinleşince ilgili bilgilendirme ve onay ekranları.

Mevcut tek sayfalı uygulamada oyun/mola/sonuç uygulama içi durumdur; URL tabanlı oda veya oyun rotası yoktur. Gerçek oda bağlantıları, tarayıcı geçmişi ve yenilemede odaya dönüş, çevrim içi backend ile birlikte tasarlanmalıdır.
