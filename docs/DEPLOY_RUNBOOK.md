# Deploy Runbook — DIY Store production (shoptool.mn)

## Бодит архитектур (ЧУХАЛ)

Production нь **EC2 + SSH + docker-compose БИШ**. `Makefile` болон `deploy/aws/README.md` нь хуучин/өөр хувилбарыг тайлбарладаг — бодит production дараах байдалтай:

- **AWS ECS Fargate** дээр контейнер ажиллана (server + web tasks)
- Урд талд нь **ALB** (Application Load Balancer) — `shoptool.mn`-ийн 3 IP нь ALB-ийнх
- **RDS Postgres** өгөгдөл хадгална
- Security groups: `diy-store-alb`, `diy-store-ecs-tasks`, `diy-store-web-tasks`
- **SSH хийх сервер байхгүй** (Fargate-д SSH байхгүй)

## Deploy яаж явдаг вэ — БҮРЭН АВТОМАТ

`.github/workflows/deploy-prod.yml` нь deploy-г бүрэн автоматжуулсан:

- **`dev` эсвэл `main`-д push хийхэд** ажиллана (GitHub Actions)
- **`dev`-д push** → server + web хоёуланг production ECS-д deploy хийдэг (AWS validation)
- `main`-д push → өөрчлөгдсөн хэсгийг (server/web) илрүүлж deploy
- `docs/**`, `**/*.md`, `progress.md` өөрчлөлт → deploy **триггерлэхгүй** (paths-ignore)
- Урсгал: код build → Docker image → ECR push → ECS task definition шинэчлэх → `--force-new-deployment` → smoke test (`/health`, `/shop-api`, `/`, `/admin`, `/driver`, `/supplier`)

**Гар аргаар deploy хийх шаардлагагүй.** Зүгээр л `dev`-д push хийнэ → Actions автоматаар production-д тарина.

GitHub Actions явцыг харах: https://github.com/Biller0122/diy-store/actions

---

## Schema өөрчлөлт яаж хийдэг вэ (ЧУХАЛ — migration ажиллахгүй!)

`apps/server/src/index.ts`-ийн bootstrap нь **`runMigrations()`-г дууддаггүй**. Тиймээс `apps/server/src/migrations/*.ts` файлууд **production-д ажиллахгүй**.

Оронд нь boot бүрд **`ensureRuntimeSchema()`** (`apps/server/src/runtime-schema.ts`) ажиллаж, `RUNTIME_COLUMNS` жагсаалт дахь багануудыг `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`-ээр нэмдэг.

**Шинэ багана нэмэх зөв арга:**
1. Entity-д `@Column` нэмэх (жишээ `delivery-request.entity.ts`)
2. **Мөн** `runtime-schema.ts`-ийн `RUNTIME_COLUMNS`-д тухайн баганыг нэмэх (table нэр snake_case, ж: `DeliveryRequest` → `delivery_request`)
3. `dev`-д push → auto-deploy → boot дээр багана автоматаар үүснэ

> ⚠️ Зөвхөн entity-д нэмээд runtime-schema-д нэмэхгүй бол `DB_SYNCHRONIZE=false` (production) тул багана үүсэхгүй → "column does not exist" алдаа гарна. Яг ийм шалтгаанаар `trackingToken` алдаа гарсан (2026-06-13 зассан).

---

## Жишээ: trackingToken алдааг зассан нь (2026-06-13)

Алдаа: `column DeliveryRequest.trackingToken does not exist` (нийлүүлэгчийн Орлого/Захиалга хуудас).

Засвар: `runtime-schema.ts`-ийн `RUNTIME_COLUMNS`-д нэмсэн:
```ts
{ table: 'delivery_request', name: 'trackingToken', definition: "character varying NOT NULL DEFAULT ''" }
```
→ `dev`-д push → Actions auto-deploy → server boot → багана үүснэ → алдаа арилна.

---

## Deploy дараах баталгаажуулалт
- [ ] GitHub Actions ногоон (амжилттай дууссан): https://github.com/Biller0122/diy-store/actions
- [ ] https://shoptool.mn/privacy → privacy page амьд
- [ ] Нийлүүлэгч "Орлого"/"Захиалгууд" → trackingToken алдаагүй
- [ ] Захиалга/tracking flow ажиллана

---

## Анхаарах (related risk)
- `apps/server/src/migrations/1780488000000-add-embedding.ts` migration бас **ажиллахгүй** (runMigrations дуудагдахгүй). Search/embedding-ийн `embedding` багана хэрэв production-д дутуу бол ижил аргаар (runtime-schema эсвэл өөр механизм) шийдэх шаардлагатай байж магадгүй. Search feature ашиглах үед шалгах.
- GitHub Actions ажиллахын тулд `AWS_DEPLOY_ROLE_ARN` secret + ECS/ECR нөөц тохирсон байх ёстой.
