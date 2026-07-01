# Phase 6: Чистка OMS-специфики + бренд TR - Context

**Gathered:** 2026-07-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Удалить мёртвый RU/OMS-код, унаследованный из `services/storefront` american-creator.ru, и
заменить брендовые артефакты (контакты, соцсети, платёжные иконки) на TR-эквиваленты. Витрина
должна перестать содержать RU-специфичные страницы, промо-механики и редиректы, которых нет в
ARM/TR-модели.

**In scope (CLEAN-01, CLEAN-02):**
- Удаление BOGO-промо, отзывов, CDEK-контента, RU-платёжных иконок, Bitrix/RU-редиректов,
  RU-бизнес-страниц (partners/studios).
- Брендовые свопы: телефон, соцсети, иконки оплаты → TR-заготовки/эквиваленты.

**Out of scope (deferred):**
- Реальные TR-контактные данные (телефон/хендлы) — вписываются перед go-live.
- Наполнение каталога TR-товарами — Phase 7.
- Любые изменения OMS/autoCRM/общего BFF (жёсткая изоляция).
</domain>

<decisions>
## Implementation Decisions

### RU-бизнес-страницы
- **D-01:** Удалить целиком `/partners` и подстраницы (`/partners/bloggers`, `/partners/schools`,
  `/partners/shops`) и `/studios` — это RU-рекрутинг (набор nail-студий/блогеров AC), не нужен в
  TR-модели. Удалить сами роуты (`src/app/[locale]/partners/**`, `src/app/[locale]/studios/`),
  ссылки в `Header.tsx` (`nav.studios`, `nav.partners`) и `Footer.tsx`, соответствующие i18n-ключи
  (`studios.*`, `partners.*`, `nav.studios`, `nav.partners`) в `messages/{en,tr}.json`, и связанные
  редиректы (`/ankety*` → partners/studios) в `next.config.js`.
- **D-02:** `/delivery` — **не удалять, переписать под TR**. Убрать CDEK-специфику (`CDEK_OPTIONS`,
  ключи `delivery.cdek0/1/2*`), переписать содержимое под TR-доставку (перевозчик/условия TR).
  Реальный TR-перевозчик — деплой-трек; страница пока даёт нейтральный TR-текст доставки, не CDEK.
  Ссылка «Delivery & Payment» в футере сохраняется.

### Бренд-контакты (Footer)
- **D-03:** Телефон `+7 995 757-84-67` (`Footer.tsx:163,204`) → **TR-плейсхолдер** (нейтральный
  TR-формат, реальный номер перед go-live).
- **D-04:** Соцсети (`Footer.tsx:8-17` `SOCIALS`): **удалить VK** (`soc-vk.png`) и **Wildberries**
  (`soc-wb.svg`) — чисто RU. Оставить Instagram/WhatsApp как TR-заготовки (WhatsApp `wa.me/…` →
  TR-плейсхолдер-номер; добавить/оставить Instagram). Telegram-RU (`t.me/americancreator_ru`) —
  заменить на TR-заготовку либо убрать (planner: убрать RU-хендл, не оставлять `_ru`).

### Платёжные иконки
- **D-05:** Footer `PAYMENT_ICONS` (`Footer.tsx:19-25`): убрать `yandex_money`, `webmoney`, `qiwi`
  (RU). Показывать **Visa / Mastercard / Troy** (Troy — TR-национальная схема). Текущий рендер —
  спрайт с `bgPos`; для Troy нужен новый ассет/подход (planner решает: отдельные иконки vs новый
  спрайт). Заменить/убрать `paykeeper.png`.
- **D-06:** `payment-systems.png` (RU-композит) на странице `/delivery`
  (`delivery/page.tsx:264`) — заменить на TR-набор (Visa/MC/Troy) или убрать блок изображения.

### Legacy Bitrix/RU-редиректы
- **D-07:** В `next.config.js` `redirects()`: снести RU-специфичные — `categoryMap` (RU-slug →
  storefront-slug), все `.php` (`novinki.php`, `compare.php`, `ankety/*.php`), `/personal*`,
  `/auth*`, `/ankety*`, `/help/delivery`, `/info/faq` и product-slug RU-редиректы. **Оставить**
  только гигиену trailing-slash для действующих TR-роутов (например `/basket/`→`/basket`,
  `/contacts/`→`/contacts`). Проверить, что оставшиеся редиректы указывают на существующие роуты.

### BOGO (без обсуждения — мёртвый OMS-промо)
- **D-08:** Удалить `src/features/promo-bogo/**` (`config.ts`, `PromoPlashka.tsx`, `useAutoPromo.ts`,
  `index.ts`) целиком и все вызовы: `src/app/[locale]/page.tsx`, `catalog/page.tsx`,
  `catalog/[slug]/page.tsx`, `components/ProductCard.tsx`, `lib/arm-adapter.ts`, `lib/api.ts`.
  Удалить i18n-ключи `promo.gift`, `promo.giftAdd`, `promo.bannerAlt` и BOGO-ассеты.

### Отзывы (default — подтвердить research)
- **D-09:** ARM storefront API отзывов не отдаёт (как боевая FBG-витрина). **Дефолт: удалить**
  `src/components/ProductReviews.tsx` (+ `__tests__/ProductReviews.test.tsx`) и все интеграции:
  `components/ProductDetail.tsx`, `lib/api.ts`, `lib/seo.ts` (снять `aggregateRating` из JSON-LD),
  `lib/server-api.ts`, `app/sitemap.ts`, i18n-ключи `product.reviews*`/`product.noReviews`/
  `product.yourRating`/`product.submitReview`/`product.verifiedPurchase` и т.п.
  **Research обязан подтвердить** контракт ARM (нет reviews-поля/эндпоинта) до удаления —
  если ARM внезапно отдаёт отзывы, гейтить компонент на наличие данных вместо удаления.

### Claude's Discretion
- Точный способ рендера Troy-иконки (отдельные `<img>` vs новый спрайт vs inline SVG).
- Как именно нейтрализовать `/delivery` TR-текст (минимальная заглушка vs осмысленный TR-контент)
  — без ссылки на конкретного перевозчика (деплой-трек).
- Формат TR-плейсхолдер-телефона и точный набор оставляемых соцсетей (Instagram обязателен;
  WhatsApp — опционально).
- Порядок атомарных коммитов чистки (planner структурирует).
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope / requirements
- `.planning/ROADMAP.md` §"Phase 6" — цели, Success Criteria (2 критерия).
- `.planning/REQUIREMENTS.md` — `CLEAN-01` (удаление OMS-специфики), `CLEAN-02` (брендовые свопы TR).
- `.planning/PROJECT.md` §"Out of Scope" / §"Constraints" — жёсткая изоляция OMS/autoCRM; TR/TRY/EN+TR.

### ARM contract (для research по отзывам — D-09)
- `../autoCRM/packs/arm/bff/docs/openapi.yaml` — OpenAPI ARM storefront (`/public/arm/storefront/*`);
  подтвердить отсутствие reviews-поля/эндпоинта. (Читать только для верификации контракта; НЕ править.)
- `../autoCRM/docs/modules/arm/ACTR/open-questions.md` — деплой-трек (перевозчик TR, оплата) — для
  контекста по `/delivery` рерайту.

### Prior phase context (совместимость)
- `.planning/phases/04-i18n-en-tr/04-CONTEXT.md` — i18n-архитектура; удаление страниц/отзывов
  требует синхронного удаления ключей в `messages/{en,tr}.json` (EN/TR parity).
- `.planning/phases/05-ui/05-CONTEXT.md` — комплаенс/legal-страницы (`/legal/[slug]`, KDV) —
  НЕ трогать при чистке.

### Related note
- `.planning/STATE.md` §"Pending Todos" — каталог всё ещё показывает ₽ (не Phase 6, но рядом);
  i18n flat-dotted keys + `unflatten()` в `src/i18n/request.ts` (учитывать при удалении ключей).
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets / Removal Targets (concrete paths)
- **BOGO feature:** `src/features/promo-bogo/{config.ts,PromoPlashka.tsx,useAutoPromo.ts,index.ts}`.
  Consumers: `src/app/[locale]/{page.tsx,catalog/page.tsx,catalog/[slug]/page.tsx}`,
  `src/components/ProductCard.tsx`, `src/lib/{arm-adapter.ts,api.ts}`.
- **Reviews:** `src/components/ProductReviews.tsx` (+ `src/components/__tests__/ProductReviews.test.tsx`).
  Consumers: `src/components/ProductDetail.tsx`, `src/lib/{api.ts,seo.ts,server-api.ts}`, `src/app/sitemap.ts`.
  `seo.ts` builds `aggregateRating` in product JSON-LD → must drop when reviews removed.
- **CDEK/delivery:** `src/app/[locale]/delivery/page.tsx` (`CDEK_OPTIONS`, `payment-systems.png` img).
- **Footer brand:** `src/components/Footer.tsx` — `SOCIALS` (L8-17), `PAYMENT_ICONS` (L19-25),
  phone `+7 995 757-84-67` (L163, L204), nav links to `/studios` (L67) & `/partners` (L68).
- **Header nav:** `src/components/Header.tsx` — `/studios` (L60), `/partners` (L61).
- **RU pages:** `src/app/[locale]/partners/{page.tsx,bloggers/page.tsx,schools/page.tsx,shops/page.tsx}`,
  `src/app/[locale]/studios/page.tsx`.
- **Redirects:** `next.config.js` `redirects()` (L11-90+), `categoryMap`, all `.php` / `/ankety` / `/personal` / `/auth`.

### i18n keys to remove (flat dotted, in `messages/{en,tr}.json`, keep EN/TR parity)
- `promo.*` (gift, giftAdd, bannerAlt) — BOGO.
- `product.reviews`, `product.noReviews`, `product.yourRating`, `product.ratingAriaLabel`,
  `product.sharePlaceholder`, `product.submitReview`, `product.submitting`, `product.verifiedPurchase`,
  `product.loginPromptText`, `product.loginLink`, `product.reviewCount`, `product.customer`,
  `product.sendError` — reviews.
- `studios.*`, `partners.*` (incl. `partners.shops.*/bloggers.*/schools.*`), `nav.studios`, `nav.partners`.
- `delivery.cdek0*/cdek1*/cdek2*`, `delivery.cityNote*`, `delivery.freeBanner` — CDEK-specific
  (keep generic `delivery.title/desc/payment*` reworked for TR).
- Check `nav.new` (`/novinki.php` redirect removal) — keep nav item only if `/catalog?sort` still valid.

### Public brand assets (`public/`)
- Remove/replace: `icons/soc-vk.png`, `icons/soc-wb.svg`, `icons/paykeeper.png`,
  `images/delivery/payment-systems.png`, `images/pay-systems.png`.
- Keep/rework: `icons/soc-telegram.png`, `icons/soc-whatsapp.png`, `icons/payment-sprite.svg` /
  `payment.svg` (Troy needs new asset).

### Established Patterns / Constraints
- i18n keys are **flat dotted** and `unflatten()`-ed in `src/i18n/request.ts` (STATE.md GAP-CLOSURE) —
  removing a key = remove the flat entry; verify no page references it (else next-intl throws).
- EN/TR parity is enforced (Phase 4) — every removed key removed in BOTH files.
- `/legal/[slug]` compliance pages (Phase 5) are OUT of scope — do not touch.

### Integration Points
- Removing routes ⇒ remove nav links (Header/Footer) ⇒ remove i18n keys ⇒ remove redirects pointing at them.
- Removing reviews ⇒ update `seo.ts` JSON-LD (drop `aggregateRating`) + `sitemap.ts` + `ProductDetail`.
- Editing `next.config.js` redirects ⇒ re-verify remaining redirects target existing TR routes.
</code_context>

<specifics>
## Specific Ideas

- Все свопы — **TR-плейсхолдеры**, не реальные данные (деплой отложён): телефон в TR-формате,
  соцсети Instagram/WhatsApp как заготовки, платёжки Visa/Mastercard/Troy.
- Цель фазы — «чистый TR-магазин»: после неё в коде не должно остаться VK/WB/CDEK/PayKeeper/BOGO/
  Bitrix-`.php`/RU-slug-редиректов и RU-рекрутинг-страниц.
</specifics>

<deferred>
## Deferred Ideas

- Реальные TR-контакты (телефон, соцсеть-хендлы, адрес) — вписать перед go-live (деплой-трек).
- Реальный TR-перевозчик и тарифы для `/delivery` — деплой-трек (open-questions.md).
- Каталог показывает ₽ вместо ₺ — отдельный баг (STATE.md Pending Todos), не Phase 6.
- Локализация basket/checkout (EN на /tr) — хвост Phase 4, не Phase 6.

</deferred>

---

*Phase: 6-oms-tr*
*Context gathered: 2026-07-01*
