# Keskin tekrar oynama metni

Kullanıcının açık isteğiyle tekrar oynama düğmesi artık raster fotoğraf kırpması kullanmaz. Düz şeftali yüzey (#fdcf9e), kahverengi Baloo 800 metni ve yuvarlatılmış dolu SVG play simgesi native arayüz olarak çizilir. Düğmenin boyutu, konumu, basılma hareketi ve sonuç geçişi korunur. Play ve ev simgeleri hover sırasında aynı tek seferlik sallanma hareketini kullanır; hareket azaltma tercihinde ikisi de sabittir.

Normal geçiş, yedek geçiş, yeniden oynama ve ana ekran akışları `tests/result-motion-check.mjs` ile; metin/simge sığması ve yüzey rengi dört ekran boyutunda tarayıcıyla doğrulandı.
