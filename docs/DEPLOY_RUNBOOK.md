# Deploy Runbook — trackingToken засвар + privacy page-г production-д тараах

Энэ нь одоо production (shoptool.mn) дээр гарч буй **`column DeliveryRequest.trackingToken does not exist`** алдааг засах, мөн privacy page-г амьдруулах тодорхой алхмууд.

> shoptool.mn аль хэдийн амьд тул энэ бол **update deploy** (анхны deploy биш). Сервер: Ubuntu EC2, Docker Compose, RDS Postgres.

---

## ⚠️ Эхлэхээс өмнө шийдэх 2 блокер

### Блокер 1 — Код `dev`-д байгаа, deploy `main` татдаг
- Бидний засвар (trackingToken migration `apps/server/src/migrations/1749000000000-add-tracking-token.ts` + privacy page) нь **`dev` branch**-д push хийгдсэн.
- `Makefile:30` болон README §9 нь **`main`** branch татдаг.
- GitHub дээр `main` нь **protected** — шууд push татгалздаг.

**Шийдэл (аль нэгийг сонгох):**
- **A (зөвлөх):** GitHub дээр `dev → main` Pull Request үүсгэж, approve хийж merge. Дараа нь сервер `main` татахад засвар орно.
- **B (хурдан):** Серверийн `Makefile`-ийн `pull` target-ыг `git pull origin dev` болгох, эсвэл серверт `git checkout dev && git pull origin dev` хийгээд deploy. (Deploy branch = ажиллаж буй branch болгоно.)

### Блокер 2 — SSH хандалт
- Deploy нь **AWS сервер дээр** ажиллана. Хэрэгтэй: серверийн **public IP** + `.pem` key (`D:\diy project\files\diy-store-key.pem`).
- Security group §22 нь зөвхөн **тодорхой IP**-ээс SSH зөвшөөрдөг тул одоогийн IP нэмэгдсэн байх ёстой.

```bash
ssh -i "/d/diy project/files/diy-store-key.pem" ubuntu@<EC2_PUBLIC_IP>
```

---

## Deploy алхмууд (сервер дээр)

### 1. Холбогдож кодоо шинэчлэх
```bash
ssh -i "<key>.pem" ubuntu@<EC2_PUBLIC_IP>
cd ~/diy-store

# Блокер 1-ийн сонголтоор:
# A: main merge хийсэн бол —
git pull origin main
# B: dev ашиглах бол —
# git fetch origin && git checkout dev && git reset --hard origin/dev
```

### 2. trackingToken баганыг нэмэх (алдааг засна)
Production DB-д багана дутуу байгааг 3 аргаар засаж болно. **Хамгийн аюулгүй нь raw SQL (C):**

**C — RDS дээр шууд SQL (зөвлөх):**
```bash
# Серверээс RDS руу psql (DB_HOST, DB_USERNAME нь .env.production-д бий)
docker compose -f docker-compose.aws.yml --env-file .env.production exec server \
  node -e "const{DataSource}=require('typeorm');/* эсвэл доорх psql */"
```
Эсвэл RDS-д шууд (psql client):
```sql
ALTER TABLE "delivery_request"
  ADD COLUMN IF NOT EXISTS "trackingToken" character varying NOT NULL DEFAULT '';
```

**B — Migration ажиллуулах** (build хийсний дараа `dist/migrations/*.js` үүснэ):
```bash
docker compose -f docker-compose.aws.yml --env-file .env.production build server
# Vendure migration ажиллуулах (server image дотроос)
docker compose -f docker-compose.aws.yml --env-file .env.production run --rm server \
  npx vendure migrate
```

**A — DB_SYNCHRONIZE түр асаах** (README §7 загвар, ЭРСДЭЛТЭЙ — schema drift үүсгэж болзошгүй, зөвлөхгүй):
```bash
# .env.production: DB_SYNCHRONIZE=true болгоод server restart, дараа нь lock-schema.sh
```

> Зөвлөмж: **C (raw SQL)** хамгийн найдвартай. Дараа нь schema-г `DB_SYNCHRONIZE=false`-д түгжээтэй байлгана (`bash deploy/aws/lock-schema.sh`).

### 3. Бүрэн rebuild + restart (privacy page web-д тарна)
```bash
bash deploy/aws/deploy.sh
# эсвэл зөвхөн web/server:
# docker compose -f docker-compose.aws.yml --env-file .env.production build web-customer server
# docker compose -f docker-compose.aws.yml --env-file .env.production up -d web-customer server
```

### 4. Баталгаажуулах
```bash
docker compose -f docker-compose.aws.yml --env-file .env.production ps
docker compose -f docker-compose.aws.yml --env-file .env.production logs -f server
```
Browser/curl:
- https://shoptool.mn/privacy → privacy page гарч ирэх ёстой
- Нийлүүлэгчийн "Орлого" хуудас → `trackingToken` алдаа **арилсан** байх ёстой
- Захиалга/хүргэлт flow ажиллаж байгааг шалгах

---

## 📱 Store review-гийн нэвтрэлт (OTP асуудал)

Customer/Supplier апп **OTP нэвтрэлттэй** тул store review хийгчид код авч чадахгүй → татгалзах эрсдэлтэй.

**Шийдэл:** `.env.production`-д `OTP_MOCK_MODE` тохиргоо бий (README §4, §8).
- `OTP_MOCK_MODE=true` үед OTP mock хийгддэг (тогтсон/автомат код) — review хийгчид нэвтэрч чадна.
- Гэхдээ public launch-д `OTP_MOCK_MODE=false` байх ёстой (README §8) — жинхэнэ хэрэглэгчид аюулгүй.

**Зөвлөмж:** Mock mode-г бүхэлд нь асаахын оронд, тогтсон **demo бүртгэл** (тодорхой утас/и-мэйл) -д л тогтмол OTP код буцаадаг логик нэмэх нь зөв. Submit-ийн "App Review Information"-д энэ demo бүртгэл + кодыг бичиж өгнө. (Энэ нь нэмэлт код өөрчлөлт — submit-ийн өмнө хийнэ.)

---

## Шалгах checklist (deploy дараа)
- [ ] https://shoptool.mn/privacy амьд
- [ ] Нийлүүлэгч "Орлого"/"Захиалгууд" хуудсанд trackingToken алдаагүй
- [ ] `delivery_request` хүснэгтэд `trackingToken` багана бий (`\d delivery_request`)
- [ ] DB_SYNCHRONIZE=false түгжээтэй (lock-schema.sh)
- [ ] Захиалга үүсгэх → tracking flow ажиллана
```
