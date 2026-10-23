# Ortak Google hesabı — 22 Ekim 2026

Google Cloud projesi: `kesif-dunyasi` (Kesif Dunyasi). Google Auth uygulama adı: Keşif Dünyası. Web istemcisi: CoMind Arena Web. Firma yöneticisi eklenmedi. Proje Google Auth üzerinde test aşamasındadır; genel yayın için üretim adresleri ve Google'ın o aşamada istediği marka/alan adı bilgileri tamamlanmalıdır.

## Yerel kullanım

`npm install` ardından yalnız Arena için `npm run dev:full`, iki oyun için `npm run dev:all` veya `Baslat.cmd`. Arena **http://localhost:5174/**, Keşif **http://localhost:5173/**. Google istemcisinin kayıtlı dönüş adresi **http://localhost:5174/api/auth/google/callback**. `127.0.0.1` üzerinden başlatılan giriş, çerezlerin aynı adreste kalması için önce localhost'a yönlenir. Ortak hesap ve puan ayrıntıları: [ONLINE-ACCOUNTS.md](ONLINE-ACCOUNTS.md).

`.env` içinde `GOOGLE_CLIENT_ID` ve `GOOGLE_CLIENT_SECRET` bulunur. Bu dosya Git'e eklenmez. `VITE_` öneki kullanılmaz; Google gizli bilgisi tarayıcıya/derlemeye gönderilmez. Google'ın standart OAuth kod akışı, yalnızca `openid email profile` kapsamlarını ister. Gmail, Drive veya diğer Google verilerine erişim istenmez; offline erişim/Google refresh token tutulmaz.

Bilgisayarda çalışan standart PostgreSQL geliştirme sunucusu, npm'deki `embedded-postgres` paketiyle başlatılır. `.local/postgres/` veritabanının gerçek veri dosyalarını, `.local/database.json` yerel bağlantı parolasını tutar. Her ikisi Git dışında kalır. Eski `C:/Program Files/PostgreSQL` kurulumlarına dokunulmaz. Bir `DATABASE_URL` verilirse yerel sunucu açmak yerine o bağlantı kullanılır. Yerel geliştirme yöneticisi üretimde uygulama kullanıcısı olarak kullanılmamalıdır.

## Veri ve oturum

- `accounts.users`: ortak UUID, sabit Google kimliği, e-posta, görünen ad ve giriş tarihleri. Kimlik eşleştirmesi e-postayla yapılmaz.
- `accounts.google_flows`: 10 dakikalık tek kullanımlık OAuth state, PKCE doğrulayıcısı ve nonce. Geçersiz veya başka tarayıcıdan gelen dönüş kabul edilmez.
- `accounts.sessions`: yedi günlük uygulama oturumları. Tarayıcıdaki rastgele oturum belirtecinin yalnızca SHA-256 özeti veritabanına yazılır. Çerez HttpOnly/SameSite=Lax; üretimde ayrıca Secure ve __Host- öneklidir. Çıkış veritabanındaki oturumu da iptal eder.

Backend: `GET /api/auth/google`, `GET /api/auth/google/callback`, `GET /api/auth/me`, `POST /api/auth/logout`. Sonuçların önbelleğe alınması engellenir. Çıkış yalnızca APP_URL ve KESIF_URL için izinli Origin üzerinden kabul edilir. Giriş isteği hız sınırlıdır. Token/Google kodu istek günlüğüne yazılmaz.

Migration: `server/migrations/001-accounts.sql` ve `002-arena.sql`. Backend açılırken işlem ve advisory lock içinde uygulanır. İkinci migration oda, ödül ve hesap ilerlemesi tablolarını kurar.

## Firma sunucusunda yayın

Güncel paketleme ve Docker/HTTPS yönergesi: [deploy/README.md](../deploy/README.md). `npm run release` backend'in kullandığı üç ortak `src/` modülünü de pakete ekler. Üretimde otomatik migration varsayılan olarak kapalıdır; `/api/ready` PostgreSQL bağlantısını doğrular. Üretim statik sunucusu derleme yolunun APP_URL ile eşleşmesini kontrol eder.

1. Node.js 22.12+ ve desteklenen PostgreSQL sürümü sağlanır. Veritabanı dış internete açılmaz. Veritabanı ve uygulama rolleri firma tarafından yönetilir; uygulama rolüne sadece hesap tablolarında gerekli okuma/yazma yetkileri verilir. Üretimde migration yönetici bağlantısıyla `npm run db:migrate` komutuyla uygulanır. Runtime bağlantısında `AUTO_MIGRATE=false` ayarlanır; uygulamanın şema oluşturma yetkisine ihtiyacı kalmaz.
2. `.env` güvenli olarak sunucuda oluşturulur: `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `APP_URL=https://oyunun-adresi/`, `NODE_ENV=production`, `SERVE_STATIC=true`, `HOST=127.0.0.1`, `PORT=3001`. Bağlantı bilgileri ve oturumlar firmaya aittir.
3. Ana alan adına yayın için `npm ci` ve `npm run build -- --base=/` çalıştırılır; `npm start` servise dönüştürülür. Alt yola yayın için derleme `--base=/comind-arena/` ve APP_URL aynı alt yolla ayarlanır. Mevcut varsayılan build GitHub Pages'in `/comind-arena/` yolunu korur.
4. Nginx/Caddy benzeri HTTPS katmanı oyunu ve kökteki `/api/` isteklerini backend'e iletir. Dönüş adresi her durumda `https://alan-adı/api/auth/google/callback` olur. Google Cloud'da bu tam adres web istemcisine eklenir. Gizli bilgi istemci koduna konmaz.
5. Yerel veriler gerekliyse PostgreSQL `pg_dump`/`pg_restore` ile aktarılır. Önce yedek ve geri yükleme denemesi yapılır. Kullanıcı UUID'leri korunur. Oturumlar istenirse taşınmayabilir; kullanıcı tekrar Google ile giriş yapar.
6. Hesap açma, yenileme, çıkış, iki cihaz, hatalı giriş ve kalıcı veriler gerçek yayın adresinde denenir. Düzenli yedekleme/güncelleme firmada bir sorumluya atanır.

GitHub Pages Node.js backend veya PostgreSQL çalıştırmaz. Bu sürümü Pages'e göndermek tek başına gerçek girişi yayına almaz. Yerel Google istemcisi firmanın sunucusunu otomatik sağlamaz. Firmanın sunucu/alan adı erişimi geldiğinde üretim adımı tamamlanır.

## Kontrol

`npm test`: ayrı geçici PostgreSQL üzerinde kayıt, aynı kimlikle tekrar giriş, farklı kimliklerin e-posta üzerinden birleşmemesi, state/nonce/PKCE, bozuk token, iptal, süre aşımı, tekrar kullanılan callback, oturum/çıkış ve güvenli üretim çerezi kontrolleri. Test sağlayıcısı yalnızca test dosyasında enjekte edilir; çalışan API'de sahte giriş yolu yoktur. Gerçek Google hesabı seçme/onay adımı kullanıcı tarafından tamamlanır.

`node tests/account-check.mjs`, `node tests/account-motion-check.mjs`, `node tests/auth-ui-check.mjs` ve `npm run test:responsive`: hesap penceresi, erişilebilirlik, hizmet hatası, oturum görünümü ve ekran uyumu.

22 Ekim 2026 doğrulaması: kullanıcı gerçek Google hesap seçimini tamamladı; PostgreSQL'de bir kullanıcı ve bir aktif oturum doğrulandı. Sayfa yenilenince oturum korundu. 12 otomatik test, hesap penceresi/hareket kontrolleri, oturum arayüzü testi, 312 ekran uyumu kontrolü ve üretim derlemesi geçti. Üretim JavaScript çıktısında Google gizli bilgisi bulunmadığı kontrol edildi. Bu doğrulama yerel ortam içindir; firma sunucusunda dağıtım yapılmadı.
