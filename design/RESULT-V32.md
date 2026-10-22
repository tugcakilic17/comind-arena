# Sonuç yerleşimi ve hareketler

- Panel ekran yüksekliğine göre 10–22 piksel yukarı taşındı.
- Tekrar oynama düğmesi yaklaşık %8; ana ekrana dönüş metni ve simgesi yaklaşık %7 küçültüldü. Dokunma hedefi en az 44 piksel kaldı.
- Hover: küçük yükselme ve yaylanma; ev simgesi tek sefer hafifçe sallanır.
- Tıklama: 190 ms basılma ve geri yaylanma, ardından işlem. Bu sırada tekrar tıklama engellenir.
- Maç sonunda View Transitions ile 440 ms solma ve hafif yükselme uygulanır. Desteklenmeyen tarayıcıda Web Animations ile çıkış/giriş solmaları vardır. Yeni ekran görüntüleri decode edilmeden geçiş tamamlanmaz.
- Hareket azaltma tercihinde bu animasyonlar atlanır. Sonuç başlığı geçişten sonra klavye odağı alır.
- Yeni görsel üretilmedi; kullanıcının V31 referansından gelen düğme korunur.

Doğrulama: `tests/result-motion-check.mjs` yerel geçişi, yedek yolu, hareket azaltmayı, basma sırasında giriş kilidini ve iki düğmenin işlevlerini kontrol eder. `tests/result-check.mjs` sekiz ekran boyutu ile tüm kazanan durumlarını doğrular.
