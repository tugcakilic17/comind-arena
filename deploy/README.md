# CoMind Arena — sunucuya teslim

Bu paket arayüzü, Node.js backend'ini ve PostgreSQL migration dosyalarını içerir. GitHub Pages tek başına Google girişini ve arkadaş maçlarını çalıştırmaz. Kalıcı PostgreSQL, bir HTTPS alan adı ve sürekli çalışan Node.js 22.12+ servisi gerekir. Docker kullanımı isteğe bağlıdır.

## Paylaşılacak dosyalar

Geliştirme bilgisayarında `npm run release` çalıştırın. Arena ana alan adında açılacaksa `npm run release -- --base=/` kullanın. Varsayılan `/comind-arena/` yoludur. Oluşan **release/comind-arena-... klasörünün tamamını** sunucu sorumlusuna gönderin; yalnızca `dist/` yetmez. Bu klasörde yalnızca çalışma dosyaları, bağımlılık kilidi ve kurulum örnekleri bulunur. Backend'in kullandığı üç ortak `src/` modülü de gereklidir.

`.env`, `.local/`, geliştirme veritabanı, `node_modules/`, testler ve tasarım kaynakları pakete dahil edilmez. Gerçek Google gizli anahtarı ve veritabanı bağlantısı sunucunun gizli ortam değişkenlerine ayrı girilir. `VITE_` önekiyle gizli bilgi tanımlamayın.

## Sunucuda doğrudan Node.js

1. Paket kökünde `.env.example` dosyasını `.env` olarak kopyalayın. APP_URL, KESIF_URL, DATABASE_URL ve Google istemci bilgilerini doldurun. `APP_URL` yolu DEPLOYMENT.txt içindeki derleme yoluyla aynı olmalıdır. Keşif aynı alan adında ayrı bir yol kullanır. Arena tek başına da yayınlanabilir; Keşif arayüzü bu pakete dahil değildir.
2. `npm ci --omit=dev` çalıştırın.
3. Yeni PostgreSQL veritabanına, şema oluşturma yetkisi olan bağlantıyla **bir kez** `npm run db:migrate` uygulayın. Güncellemelerde yeni migration'lar için aynı komutu çalıştırın; mevcut migration'lar tekrar çalıştırılabilir. Ardından runtime için yalnızca gerekli şema kullanım/tablo okuma-yazma yetkileri olan uygulama bağlantısını kullanın. `AUTO_MIGRATE=false` kalsın.
4. `npm start` komutunu sunucunun servis yöneticisiyle sürekli çalıştırın; çalışma dizini paket kökü olsun. Nginx/Caddy HTTPS üzerinden **hem oyun yolunu hem `/api/` yolunu**, yolları değiştirmeden `127.0.0.1:3001` adresine yönlendirsin; Host başlığını korusun. TRUST_PROXY yalnızca gerçek proxy IP/CIDR adreslerini içersin. Başka servis arayüzü sunacaksa `SERVE_STATIC=false` yapılabilir.
5. Google Cloud OAuth web istemcisinde `https://ALAN-ADI/api/auth/google/callback` dönüş adresini ve gerekiyorsa `https://ALAN-ADI` JavaScript kaynağını tanımlayın. Google uygulaması test modundaysa yalnızca test kullanıcıları girebilir; herkese açılmadan önce consent screen yayın durumu/izin verilen alan adları tamamlanmalıdır.

Backend 3001 ve PostgreSQL portu dış internete açılmaz. Kullanıcı yalnızca HTTPS siteye erişir. Yalnız Arena yayınlanıyorsa `/kesif-dunyasi/` arayüzünün bulunmaması Arena'yı engellemez. İki oyun birlikte yayınlanacaksa Keşif'in üretim çıktısını ayrıca yükleyin ve `KESIF_DIST=/sunucudaki/kesif/dist` tanımlayın; onun derleme yolu KESIF_URL ile aynı olsun.

## Docker ve otomatik HTTPS seçeneği

Sunucuda Docker Compose, dışarıdan erişilebilir kalıcı PostgreSQL ve bu sunucuya yönlenmiş alan adı gerekir. `.env` içindeki DATABASE_URL'de `localhost` kullanmayın: container içinde kendi container'ını ifade eder. Gerçek veritabanı servis adresini kullanın. Yeni veritabanını internete açmak yerine sunucunun özel ağı/DB sağlayıcısı üzerinden bağlayın.

Paket kökünde:

```sh
docker compose --env-file .env -f deploy/compose.yaml build
# Bu migration komutunda şema oluşturma yetkili DATABASE_URL kullanın.
docker compose --env-file .env -f deploy/compose.yaml run --rm app npm run db:migrate
docker compose --env-file .env -f deploy/compose.yaml up -d
```

Caddy 80/443 üzerinden sertifikayı yönetir; yalnız bu iki port dışarı açılır. Uygulama ve sertifikalar restart sonrası korunur; PostgreSQL'in veri kalıcılığı ve yedeği DB sağlayıcısında yönetilir. Keşif eklenecekse kendi çıktısı ayrıca container'a salt okunur volume olarak bağlanmalıdır; varsayılan Compose yalnız Arena'yı taşır.

## Kontrol, yedekleme ve güncelleme

- `/api/health`: süreç çalışıyor. `/api/ready`: PostgreSQL sorgusu da başarılı; bağlantı yoksa 503 döner. İzleme için ready kullanılır.
- Canlı HTTPS adresinde Google giriş/çıkış, sayfa yenilemede oturum, iki ayrı hesapla arkadaş daveti/maç ve maç sonu puanı kontrol edin. Bunlar gerçek alan adı/Google yapılandırması gelmeden canlıda doğrulanamaz.
- PostgreSQL için otomatik günlük yedek ve geri yükleme denemesi sağlayıcı tarafından ayarlanmalı. Mevcut yerel kullanıcı/puanlar taşınacaksa PostgreSQL `pg_dump` / `pg_restore` ile ayrıca aktarılır; `.local/postgres` klasörü doğrudan kopyalanmaz. Boş üretim veritabanı yerel kullanıcıları otomatik içermez.
- Güncellemeden önce DB yedeği alın, yeni paketi hazırlayın, migration'ı çalıştırın, servisi yeniden başlatın. Geri dönüş için önceki yayın paketini saklayın; veritabanı değişiklikleri için ayrıca geri yükleme planı gerekir.

Kaynaklar: [Fastify proxy yapılandırması](https://fastify.dev/docs/latest/Reference/Server/#trustproxy), [Caddy reverse_proxy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy), [Google OAuth web server](https://developers.google.com/identity/protocols/oauth2/web-server).
