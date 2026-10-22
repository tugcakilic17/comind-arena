# Ortak panelde mola

Eski, oyun alanını kaplayan pause-overlay kaldırıldı. Mola artık giriş ve geri dönüş pencereleriyle aynı native dialog sistemini, krem panel PNG'sini, zarfsız papağanı, şeftali HTML/SVG butonunu ve açılış/kapanış animasyonlarını paylaşır. Yeni görsel dosyası üretilmedi veya eklenmedi.

Mola açmak süreyi, bilgisayarın hamlesini, kart girişini ve Phaser animasyonunu durdurur. Devam düğmesi, X, Escape ve dışarı tıklama yumuşak kapanış tamamlanınca oyunu sürdürür. Kapanırken süre ilerlemez. Oyun durumu ile pencere açma işi ayrıldı; bir onay penceresi için oyunu durdurmak ikinci bir mola penceresi açmaz. Yeniden başlarken saat referansı yenilenir.

`tests/pause-check.mjs` altı ekran boyutunu, giriş kilidini, süreyi, tüm devam yollarını ve normal animasyonlu kapanışı doğrular. Geri dönüş ve giriş pencereleri için mevcut kontroller de çalıştırıldı.
