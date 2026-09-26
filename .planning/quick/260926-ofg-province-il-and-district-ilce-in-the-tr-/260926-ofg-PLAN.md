---
phase: quick-260926-ofg
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/tr-provinces.ts
  - src/lib/tr-provinces.test.ts
  - src/lib/api.ts
  - src/lib/api-order-headers.test.ts
  - src/app/[locale]/checkout/page.tsx
  - src/app/[locale]/checkout/checkout-guest-account.test.tsx
  - src/app/[locale]/account/addresses/page.tsx
  - src/app/[locale]/account/addresses/addresses-page.test.tsx
autonomous: true
requirements: [QUICK-260926-ofg]

estimate:
  tokens: 90000
  raw_tokens: 90000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "On the TR checkout (step 1) the buyer picks one of Turkey's 81 provinces from a required «Province (İl)» select rendered directly ABOVE the district field; the free-text field that used to be «City» is labelled «District (İlçe)» and still writes form.city."
    - "With country TR, the step-1 Continue button stays disabled until a canonical province is chosen."
    - "The POST /orders body built by createOrder carries shipping.state = the chosen canonical province and shipping.city = the district (ARM stores it as shipping_state and in arm_customer_addresses.state; FulfillmentTR maps it to province)."
    - "The Ön Bilgilendirme Formu and Mesafeli Satış markdown sent in payload.legal render the buyer address with «<district> / <province>»."
    - "A logged-in buyer's default / picked saved address fills the province (case- and Turkish-letter-insensitive match to the canonical name); a non-canonical stored value leaves the province empty for a fresh pick; «+ New address» and deleting the selected card clear it."
    - "An old checkout draft in sessionStorage without a province (or with a tampered non-canonical one) loads without error and leaves the province empty."
    - "In the account address book the add dialog requires a province (select of the 81), saves it as state, and every address card shows «district / province»."
    - "No Cyrillic in any line added by this task, and the next build client bundle has no Cyrillic outside the pre-existing polyfills chunk."
  artifacts:
    - path: src/lib/tr-provinces.ts
      provides: "TR_PROVINCES (81 names, Turkish-collated, readonly), TrProvince type, normalizeProvince, isTrProvince, formatDistrictProvince"
    - path: src/lib/tr-provinces.test.ts
      provides: "unit tests for the list and the three helpers"
    - path: src/app/[locale]/account/addresses/addresses-page.test.tsx
      provides: "render tests for the address book province select, save payload and list line"
  key_links:
    - from: "src/app/[locale]/checkout/page.tsx (form.province)"
      to: "src/lib/api.ts createOrder → body.shipping.state → ARM POST /orders"
      via: "createOrder({ shipping: { state } }) — CreateOrderPayload.shipping.state"
    - from: "src/app/[locale]/checkout/page.tsx formatObfAddress"
      to: "buildLegalDocInput().address → payload.legal.documents[].markdown"
      via: "formatDistrictProvince(f.city, f.province)"
    - from: "src/lib/auth.ts CustomerAddress.state"
      to: "checkout autofill / saved-card pick → form.province"
      via: "normalizeProvince + isTrProvince gate"
    - from: "src/app/[locale]/account/addresses/page.tsx form.state"
      to: "addMyAddress → ARM POST /me/addresses (body.state, accepted by storefront-auth.ts)"
      via: "payload state: form.state || null"
---

<!-- planner-discipline-allow: [\x{0400}-\x{04FF}] -->
<!-- The allowed literal is the grep character-class of the Cyrillic gate itself (it matches Cyrillic characters, not its own text), so quoting the gate command in <action> cannot self-invalidate it. -->

<objective>
Collect the Turkish province (il) and district (ilçe) in the TR storefront shipping address and send
the province to ARM as `shipping.state`, in the checkout and in the account address book.

Purpose: orders of this store now go to the Turkish 3PL FulfillmentTR, whose order API needs
`province` = il (one of the 81) and `city` = ilçe. The ARM BFF (autoCRM repo — DO NOT TOUCH IT)
already accepts `shipping.state` on POST /orders (writes `shipping_state` and the customer's address
book `state`) and `state` on POST /me/addresses, and its FulfillmentTR provider maps
shippingState → province, shippingCity → city. Verified live at planning time in
`~/work/autoCRM/packs/arm/bff/routes/storefront-api.ts` (shipping_state / address `state` writes)
and `storefront-auth.ts` (POST /me/addresses `state: body.state || null`). So this is a
storefront-only change.

Output: new `src/lib/tr-provinces.ts` (+ tests), checkout province select wired into validation,
payload, saved-address autofill, legal documents and summary, account address book province select
(+ tests). Three commits on `main` in the ACTR repo. No push, no deploy (shop is closed behind
PRELAUNCH; ships with the launch deploy).

**Scope observed at planning time (authoritative — do not widen):**
- The account address book has an ADD dialog only (no edit/update function exists in
  `src/lib/auth.ts` — only getMyAddresses / addMyAddress / deleteMyAddress). Add the province to the
  add dialog; do NOT invent an edit flow.
- The account add dialog has no country field; do not add one.
- `CustomerAddress.state: string | null` already exists in `src/lib/auth.ts` — no type change there.
- The checkout country select stays as is (list from ARM `GET /countries`, TR-only in practice).
</objective>

<execution_context>
@~/.claude/gsd-core/workflows/execute-plan.md
@~/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@/home/lexun/work/puz/ACTR/.planning/STATE.md
@/home/lexun/work/puz/ACTR/CLAUDE.md

Project root: /home/lexun/work/puz/ACTR (standalone Next.js 15.5 + React 19 + MUI 5.16 repo). The
shell may start in /home/lexun/work/autoCRM — ALWAYS use absolute paths under
/home/lexun/work/puz/ACTR or `cd /home/lexun/work/puz/ACTR && …` in every command.

Hard rules for the executor:
- Code, comments and UI strings in this repo: English (Turkish letters in data/labels are fine).
  NO Cyrillic in anything you add — this is the Turkish storefront. Existing files
  (checkout/page.tsx, api.ts) already carry some Russian comments: leave them, but add none.
- Labels in the checkout are plain English strings passed to the local `field(label, name, required,
  errorText)` / `optField` helpers — keep that style; do not introduce next-intl keys for them.
- Commits: conventional commits, stage ONLY the files you changed (`git add <paths>`; never
  `git add -A` — there is an unrelated untracked `.gsd/` dir). NEVER add `Co-Authored-By`, any
  trailer, or any mention of Claude / AI / Anthropic in commit messages. Do not push. Do not deploy.
- ESLint is not a gate (FBG-231). Gates: `npx tsc --noEmit`, `npx vitest run`, `npm run build`.
- Next.js page files must not export extra named symbols — keep `formatObfAddress` private in
  page.tsx and put every testable pure helper in `src/lib/tr-provinces.ts`.

Interfaces the executor needs (extracted at planning time):

src/lib/auth.ts:
  CustomerAddress { id; label; country; state: string | null; city; address; street; building;
  block; apartment; postal_code; contact_name; contact_phone; is_default: boolean }
  getMyAddresses(): Promise<{ data: CustomerAddress[] }>
  addMyAddress(addr: Partial<CustomerAddress>): Promise<{ data: CustomerAddress }>
  deleteMyAddress(id: string): Promise<void>

src/lib/api.ts (~line 266):
  CreateOrderPayload.shipping = { address?, street?, building?, block?, apartment?, city?, zip?,
  country: string, cost?, method? }  — createOrder forwards `shipping: payload.shipping` verbatim
  into the POST body (~line 316).

src/app/[locale]/checkout/page.tsx (line numbers approximate):
  ~142 inputSx, ~153 selectSx; ~173 interface FormData + INITIAL_FORM; ~209 formatObfAddress;
  ~255 CheckoutPage, countries effect sets country (single-country list → 'TR');
  ~365 hydrate effect: loadFromSession<Partial<FormData>>(CHECKOUT_FORM_KEY, {}) merged over prev;
  ~377 autofill effect from default saved address (def.* → city/street/building/block/apartment/zip);
  ~487 handleField, ~491 handleCountry(e: SelectChangeEvent);
  ~527 inputsLocked; ~549 isStep1Valid useMemo; ~597 buildLegalDocInput (address: formatObfAddress);
  ~697 createOrder({ shipping: { address, city, zip, country, street, building, block, apartment,
  cost, method } });
  ~917 field / optField helpers; ~990 step>1 summary list [{label:'Name'},{label:'Email'},
  {label:'City', value: form.city},{label:'Phone'}];
  ~1118 step1Content: Email, Full Name, Phone, Country block (Typography label + red asterisk,
  FormControl fullWidth > Select value displayEmpty renderValue placeholder 'Select country'
  sx=selectSx > MenuItem per country) — the pattern to mirror for the province select;
  ~1160 saved address cards (onClick fills fields; delete «×» resets fields when the selected card is
  deleted; card title shows addr.city + addr.address; «+ New address» resets fields);
  ~1282 field('City', 'city') … field('Postal Code', 'zip').

src/app/[locale]/checkout/checkout-guest-account.test.tsx: mocks next-intl, @/lib/auth
  (getMyAddresses → {data: []}, deleteMyAddress), @/lib/api (apiMock incl. createOrder,
  fetchCountries → [{code:'TR', name:'Turkey'}]), PRELAUNCH false; `DRAFT` step-1 form (~line 92)
  and `seedStep2(form)` writing sessionStorage `checkout_form` + `checkout_step`='2'; the test
  «places the order once a guest gave an email and both extra consents» (~line 280) reads
  `apiMock.createOrder.mock.calls[0][0]`.

src/lib/api-order-headers.test.ts: axios mocked (`mockPost`), `orderPayload` (~line 39), reads the
  POST body via `mockPost.mock.calls[0]`.

src/app/[locale]/account/addresses/page.tsx: `emptyForm` (~line 41), `handleFormChange(field)`,
  `handleAdd` (~line 104: validation «Please enter at least a city or address.», payload
  `city: form.city || null` …), card lines (~line 272: `[addr.city, addr.postal_code]` joined by
  space), add dialog TextFields (`label="City *"`, size small, disabled={saving}).
  Test mock pattern to copy: src/app/[locale]/account/preferences/preferences-page.test.tsx
  (next-intl, @/i18n/navigation Link + useRouter, @/lib/auth-context useAuth, @/lib/auth).
</context>

<tasks>

<task type="tracer" tdd="true">
  <name>Task 1 (tracer): tr-provinces module + checkout province select → validation → shipping.state in the order body</name>
  <files>src/lib/tr-provinces.ts, src/lib/tr-provinces.test.ts, src/lib/api.ts, src/app/[locale]/checkout/page.tsx, src/app/[locale]/checkout/checkout-guest-account.test.tsx</files>
  <read_first>
    - /home/lexun/work/puz/ACTR/src/app/[locale]/checkout/page.tsx lines 160-230, 355-375, 485-495, 545-562, 690-715, 1118-1160, 1280-1300
    - /home/lexun/work/puz/ACTR/src/lib/api.ts lines 264-325
    - /home/lexun/work/puz/ACTR/src/app/[locale]/checkout/checkout-guest-account.test.tsx lines 1-180 and 275-295
  </read_first>
  <behavior>
    tr-provinces.test.ts:
    - TR_PROVINCES has exactly 81 entries, 81 unique, and equals a copy of itself sorted with `(a, b) => a.localeCompare(b, 'tr')`; first 'Adana', last 'Zonguldak'; contains 'İstanbul', 'Ankara', 'İzmir', 'Afyonkarahisar', 'Şanlıurfa', 'Iğdır', 'Düzce'.
    - Every canonical name round-trips: normalizeProvince(p.toLocaleUpperCase('tr')) === p and normalizeProvince(p.toLocaleLowerCase('tr')) === p.
    - normalizeProvince: 'istanbul' → 'İstanbul'; '  ISTANBUL  ' → 'İstanbul'; 'Istanbul' → 'İstanbul'; 'sanliurfa' → 'Şanlıurfa'; 'Anadolu  Yakası' (unknown) → 'Anadolu Yakası' (raw kept, trimmed, inner whitespace collapsed); '' / '   ' / null / undefined → ''.
    - isTrProvince: 'İstanbul' true; 'istanbul' false (exact canonical only); '' false; null false; undefined false.
    - formatDistrictProvince: ('Kadıköy', 'İstanbul') → 'Kadıköy / İstanbul'; ('Kadıköy', 'istanbul') → 'Kadıköy / İstanbul'; ('Kadıköy', null) → 'Kadıköy'; ('', 'İzmir') → 'İzmir'; (null, undefined) → ''.
    checkout-guest-account.test.tsx (extend, do not rewrite):
    - DRAFT gains `province: 'İstanbul'` and `city: 'Kadıköy'`; the existing «places the order once a guest gave an email…» test additionally asserts payload.shipping.state === 'İstanbul' and payload.shipping.city === 'Kadıköy'.
    - New describe «province (il)»: with sessionStorage checkout_step '1' and a DRAFT whose email is 'ada@example.com' and province '' — after the draft is hydrated (wait until an input shows display value 'Kadıköy') the button named 'Continue' has `.disabled === true`; with province 'İstanbul' it becomes enabled (waitFor `.disabled === false`).
    - A step-2 draft with a tampered province ('Narnia') places an order whose payload.shipping.state is undefined (hydrate drops non-canonical values).
  </behavior>
  <action>
    1. Create src/lib/tr-provinces.ts (English JSDoc explaining: FulfillmentTR order API wants province = il and city = ilçe; ARM maps shipping.state → province). Export:
       - TR_PROVINCES: a readonly tuple (as const) of the 81 official province names in Turkish alphabetical order, exactly this sequence (verified at planning time with localeCompare 'tr' on Node 24 / ICU 78): Adana, Adıyaman, Afyonkarahisar, Ağrı, Aksaray, Amasya, Ankara, Antalya, Ardahan, Artvin, Aydın, Balıkesir, Bartın, Batman, Bayburt, Bilecik, Bingöl, Bitlis, Bolu, Burdur, Bursa, Çanakkale, Çankırı, Çorum, Denizli, Diyarbakır, Düzce, Edirne, Elazığ, Erzincan, Erzurum, Eskişehir, Gaziantep, Giresun, Gümüşhane, Hakkari, Hatay, Iğdır, Isparta, İstanbul, İzmir, Kahramanmaraş, Karabük, Karaman, Kars, Kastamonu, Kayseri, Kırıkkale, Kırklareli, Kırşehir, Kilis, Kocaeli, Konya, Kütahya, Malatya, Manisa, Mardin, Mersin, Muğla, Muş, Nevşehir, Niğde, Ordu, Osmaniye, Rize, Sakarya, Samsun, Siirt, Sinop, Sivas, Şanlıurfa, Şırnak, Tekirdağ, Tokat, Trabzon, Tunceli, Uşak, Van, Yalova, Yozgat, Zonguldak. Store it as a literal (no runtime sort) so server and client render identically.
       - type TrProvince = element type of TR_PROVINCES.
       - A private key function: trim, collapse inner whitespace to one space, toLocaleLowerCase('tr'), NFD-normalize, strip combining marks U+0300–U+036F, then map dotless ı to i. (Folded keys of the 81 names were verified unique at planning time.) Build a module-level Map key → canonical name once.
       - normalizeProvince(value: string | null | undefined): string — '' for null/undefined/blank; the canonical name when the folded key matches; otherwise the trimmed, whitespace-collapsed raw value (so an old free-text state is not lost).
       - isTrProvince(value: unknown): value is TrProvince — exact membership in TR_PROVINCES (no folding).
       - formatDistrictProvince(district: string | null | undefined, province: string | null | undefined): string — trimmed district and normalizeProvince(province), empties dropped, joined with ' / '.
       Write src/lib/tr-provinces.test.ts first per <behavior> (RED), then implement (GREEN).
    2. src/lib/api.ts: add optional `state?: string` to CreateOrderPayload.shipping with an English doc comment (province / il; ARM writes shipping_state and the address book state; FulfillmentTR maps it to province). createOrder already forwards shipping verbatim — no other change.
    3. src/app/[locale]/checkout/page.tsx (tracer path only; the address-book, legal-document and summary touches are Task 2):
       - FormData gets `province: string` (doc comment: canonical il from TR_PROVINCES, sent as shipping.state; `city` holds the district / ilçe); INITIAL_FORM gets `province: ''`.
       - Hydrate effect: after merging the stored draft, force `province` to the stored value only when isTrProvince(saved.province), else '' — this makes old drafts without the key and tampered values safe.
       - handleCountry: when the new country is not 'TR', also clear province.
       - Add `handleProvince(e: SelectChangeEvent)` setting form.province.
       - Derive `const trAddress = !form.country || form.country === 'TR'` near isStep1Valid.
       - isStep1Valid: additionally require `form.country !== 'TR' || isTrProvince(form.province)`.
       - Step-1 render: directly before the district field, when trAddress, render a province block mirroring the Country block — Typography label 'Province (İl)' with the red asterisk span, FormControl fullWidth, MUI Select with value form.province, onChange handleProvince, displayEmpty, renderValue showing the name in c.main or the placeholder 'Select province' in c['20'], sx selectSx, disabled={inputsLocked}, MenuProps with PaperProps sx maxHeight 360 so the 81 items scroll, one MenuItem per TR_PROVINCES entry. Use TextField-free Select (same pattern as Country) — no Autocomplete (not used anywhere in the repo).
       - Change the district field label to `trAddress ? 'District (İlçe)' : 'City'` (form key stays 'city').
       - Order payload: add `state: form.province || undefined` inside shipping, next to city.
    4. Extend checkout-guest-account.test.tsx per <behavior>. Keep the existing tests passing unchanged in intent.
    5. Commit (only these 5 files): `feat(checkout): province (il) select in the TR address, sent as shipping.state`. No trailers.
  </action>
  <verify>
    <automated>cd /home/lexun/work/puz/ACTR && npx vitest run src/lib/tr-provinces.test.ts src/app/\[locale\]/checkout/checkout-guest-account.test.tsx && npx tsc --noEmit</automated>
  </verify>
  <done>
    tr-provinces tests and the extended checkout tests pass; tsc clean; the order body built by the checkout carries shipping.state = canonical province; Continue is gated on the province for TR; commit created with no Co-Authored-By / AI mention (`git log -1 --format=%B | grep -ciE 'co-authored|claude|anthropic'` prints 0).
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: checkout — saved-address autofill/pick/reset, legal documents and summary carry the province</name>
  <files>src/app/[locale]/checkout/page.tsx, src/app/[locale]/checkout/checkout-guest-account.test.tsx, src/lib/api-order-headers.test.ts</files>
  <read_first>
    - /home/lexun/work/puz/ACTR/src/app/[locale]/checkout/page.tsx lines 205-222, 376-408, 985-1002, 1160-1280 (after Task 1 edits — use grep to re-locate: `grep -n "formatObfAddress\|getMyAddresses()\|label: 'City'\|New address\|deleteMyAddress(addr.id)" 'src/app/[locale]/checkout/page.tsx'`)
    - /home/lexun/work/puz/ACTR/src/lib/api-order-headers.test.ts lines 1-55
    - /home/lexun/work/puz/ACTR/src/lib/legal-snapshot.ts lines 30-56 (payload.legal.documents[].markdown is rendered from the same input whose `address` comes from formatObfAddress)
  </read_first>
  <behavior>
    - api-order-headers.test.ts: createOrder with shipping { country: 'TR', city: 'Kadıköy', state: 'İstanbul' } → the POST body's shipping.state === 'İstanbul' and shipping.city === 'Kadıköy'.
    - checkout-guest-account.test.tsx «places the order…» test: every payload.legal.documents[i].markdown contains 'Kadıköy / İstanbul'.
    - Logged-in autofill: auth.value = customer {id, name, email, phone} + token 't'; getMyAddresses (imported from the mocked '@/lib/auth', override with vi.mocked(...).mockResolvedValueOnce) returns one default address {id 'a1', is_default true, country 'TR', state 'istanbul', city 'Kadıköy', street 'Moda Cad', building '5', postal_code '34710', other fields null}; sessionStorage checkout_step '1', no stored form → the province select shows 'İstanbul' (findByText exact) and Continue becomes enabled.
    - Same with state 'Anadolu Yakası' (non-canonical) → district 'Kadıköy' is filled but Continue stays disabled (province empty, waits for a fresh pick).
  </behavior>
  <action>
    In src/app/[locale]/checkout/page.tsx, import normalizeProvince / isTrProvince / formatDistrictProvince from '@/lib/tr-provinces' (TR_PROVINCES already imported in Task 1) and add a tiny local helper `provinceFromSaved(state)` that returns normalizeProvince(state) when the result passes isTrProvince, else '' — one rule for every saved-address entry point (a free-text legacy value must not reach the select or FulfillmentTR; the buyer re-picks).
    - formatObfAddress: replace the bare district element with formatDistrictProvince(f.city, f.province), so the Ön Bilgilendirme Formu / Mesafeli Satış address reads «…, <district> / <province>, <zip>, <country>».
    - Autofill effect from the default saved address: also set `province: provinceFromSaved(def.state)`. Keep the existing guard and eslint comment.
    - Saved-address card onClick: also set `province: provinceFromSaved(addr.state)`.
    - «+ New address» onClick and the card-delete reset (when the deleted card was selected): also reset `province: ''`.
    - Saved-address card title: show formatDistrictProvince(addr.city, addr.state) where it now shows addr.city (keep the ', ' + addr.address logic keyed on that string).
    - Step>1 summary list: replace the City entry with label 'District / Province' and value formatDistrictProvince(form.city, form.province).
    Extend the tests per <behavior> (checkout-guest-account.test.tsx: new describe «saved address → province»; restore auth.value in beforeEach as today). Add the api-order-headers.test.ts case as a new `it` in a new describe «createOrder — shipping address».
    Commit (only these 3 files): `feat(checkout): province in saved-address autofill, legal documents and summary`. No trailers.
  </action>
  <verify>
    <automated>cd /home/lexun/work/puz/ACTR && npx vitest run src/lib/api-order-headers.test.ts src/app/\[locale\]/checkout && npx tsc --noEmit</automated>
  </verify>
  <done>
    All checkout tests (incl. on-bilgilendirme / mesafeli-satis / consent suites) and api-order-headers pass; tsc clean; legal markdown in the order payload shows «Kadıköy / İstanbul»; saved-address autofill normalises 'istanbul' → 'İstanbul' and leaves non-canonical values empty; commit created without trailers.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: account address book — province select saved as state, list shows «district / province»; full gates</name>
  <files>src/app/[locale]/account/addresses/page.tsx, src/app/[locale]/account/addresses/addresses-page.test.tsx</files>
  <read_first>
    - /home/lexun/work/puz/ACTR/src/app/[locale]/account/addresses/page.tsx (whole file, 467 lines)
    - /home/lexun/work/puz/ACTR/src/app/[locale]/account/preferences/preferences-page.test.tsx lines 1-60 (mock pattern)
  </read_first>
  <behavior>
    New src/app/[locale]/account/addresses/addresses-page.test.tsx (mocks: next-intl namespaced key echo, @/i18n/navigation Link + useRouter, @/lib/auth-context useAuth → {customer:{id:'c1',…}, loading:false}, @/lib/auth → getMyAddresses / addMyAddress / deleteMyAddress vi.fn):
    - List: getMyAddresses resolves [{…, city 'Kadıköy', state 'istanbul', postal_code '34710'}, {…, city 'Konak', state 'Anadolu Yakası', postal_code null}] → text 'Kadıköy / İstanbul 34710' and 'Konak / Anadolu Yakası' are rendered.
    - Add with province: open the dialog (button named 'Add Address' in the empty state, getMyAddresses → []), type 'Konak' into the input labelled 'District (İlçe) *', open the province select (fireEvent.mouseDown on screen.getByRole('combobox', { name: /Province/ })), click getByRole('option', { name: 'İzmir' }), click 'Save Address' → addMyAddress called once with an object containing city 'Konak' and state 'İzmir'.
    - Add without province: district filled, no province → addMyAddress not called and the text 'Please select a province.' appears.
  </behavior>
  <action>
    In src/app/[locale]/account/addresses/page.tsx:
    - Import MenuItem from '@mui/material' and TR_PROVINCES / formatDistrictProvince from '@/lib/tr-provinces'.
    - emptyForm gets `state: ''` (AddressForm derives from it).
    - Dialog: insert, before the district field, a Grid item xs 12 with a TextField select (label 'Province (İl) *', value form.state, onChange handleFormChange('state'), fullWidth, size small, disabled={saving}, SelectProps MenuProps PaperProps sx maxHeight 360) with one MenuItem per TR_PROVINCES entry. Relabel the existing city TextField to 'District (İlçe) *' (value/handler stay `city`).
    - handleAdd: keep the district-or-address check (message becomes 'Please enter at least a district or address.'), then require the province — if form.state is empty show the error snack 'Please select a province.' and return (this storefront ships to Turkey only and FulfillmentTR needs the il). Add `state: form.state || null` to the payload.
    - Card lines: replace the city/postal line with formatDistrictProvince(addr.city, addr.state) followed by postal_code, joined by a space, empties dropped (legacy free-text states are shown as stored via normalizeProvince's raw fallback).
    Write the test file per <behavior> first (RED), then implement (GREEN).
    Then run the full gates from /home/lexun/work/puz/ACTR: `npx tsc --noEmit`, `npx vitest run`, `npm run build` (no dev server was running at planning time; if one is on :3003, the build still writes .next — acceptable, note it in the summary). Then the Cyrillic gates:
    (a) added lines since the pre-task base commit 85fd650 (works whether or not the Task 3 commit exists yet) — `git diff 85fd650 -U0 -- src | grep '^+' | grep -cP '[\x{0400}-\x{04FF}]'` must print 0;
    (b) new files — `grep -cP '[\x{0400}-\x{04FF}]' src/lib/tr-provinces.ts src/lib/tr-provinces.test.ts 'src/app/[locale]/account/addresses/addresses-page.test.tsx' 'src/app/[locale]/account/addresses/page.tsx'` must print 0 for each;
    (c) client bundle — `grep -rlP '[\x{0400}-\x{04FF}]' .next/static | grep -v polyfills` must print nothing (the polyfills chunk already contained Cyrillic before this task).
    Commit (only these 2 files): `feat(account): province (il) in the address book`. No trailers. Do not push, do not deploy.
  </action>
  <verify>
    <automated>cd /home/lexun/work/puz/ACTR && npx vitest run src/app/\[locale\]/account/addresses && npx tsc --noEmit && npx vitest run && npm run build && test "$(grep -rlP '[\x{0400}-\x{04FF}]' .next/static | grep -vc polyfills)" = 0 && test "$(git diff 85fd650 -U0 -- src | grep '^+' | grep -cP '[\x{0400}-\x{04FF}]')" = 0</automated>
  </verify>
  <done>
    Address book tests pass; full vitest suite, tsc and next build are green; no Cyrillic in added lines or in the client bundle outside polyfills; three commits on main (`git log -3 --format=%s`), none carrying Co-Authored-By / Claude / AI mentions; nothing pushed.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser → ARM BFF (POST /orders, POST /me/addresses) | province / district are buyer-controlled input crossing into ARM and on to FulfillmentTR |
| sessionStorage → checkout form | a persisted draft (old schema or hand-edited) is re-read into state and into the legal-document markdown |
| ARM address book → checkout form | stored `state` may be legacy free text |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-ofg-01 | Tampering | checkout hydrate / saved-address autofill (page.tsx) | low | mitigate | form.province only ever holds a value passing isTrProvince (hydrate gate in Task 1, provinceFromSaved in Task 2), so the string reaching shipping.state and the OBF / Mesafeli markdown is one of 81 fixed literals |
| T-ofg-02 | Tampering | ARM POST /orders body (crafted request bypassing the UI) | low | accept | the BFF (other repo, not touched) stores state as untrusted free text; FulfillmentTR rejects an unknown province at submit — no storefront-side control possible |
| T-ofg-03 | Information disclosure / XSS | account address list rendering raw legacy state | low | mitigate | rendered as a React text node via formatDistrictProvince (auto-escaped); no dangerouslySetInnerHTML added |
| T-ofg-04 | Denial of service | stale step-2 draft without province places an order without il | low | accept | shop is closed behind PRELAUNCH so no live drafts exist; BFF accepts a null state; step 1 now gates the province for every new draft |
</threat_model>

<verification>
From /home/lexun/work/puz/ACTR:
- `npx tsc --noEmit` — clean.
- `npx vitest run` — full suite green (new: tr-provinces, addresses-page; extended: checkout-guest-account, api-order-headers).
- `npm run build` — next build succeeds.
- Cyrillic: no Cyrillic in added lines (`git diff 85fd650 -U0 -- src | grep '^+' | grep -cP '[\x{0400}-\x{04FF}]'` = 0) and none in `.next/static` outside the polyfills chunk.
- `git log -3 --format=%B | grep -ciE 'co-authored|claude|anthropic'` = 0; `git status --short` shows no leftover changes to the 8 planned files; nothing pushed.
- Optional human look (end-of-phase, not blocking): `npm run dev` with PRELAUNCH off → /tr/checkout step 1 shows «Province (İl)» above «District (İlçe)», 81 items scroll; /tr/account/addresses add dialog has the same select.
</verification>

<success_criteria>
- Checkout step 1 collects the province (required for TR) above the district; the order body sends shipping.state; legal documents and the step summary show «district / province»; saved addresses fill it (normalised) and New address clears it.
- Account address book saves the province as state and lists «district / province».
- src/lib/tr-provinces.ts is the single source of the 81 names and the normalise / format helpers, fully unit-tested.
- All three gates green, no Cyrillic added, three clean commits on main, no push / deploy.
</success_criteria>

<output>
Create `/home/lexun/work/puz/ACTR/.planning/quick/260926-ofg-province-il-and-district-ilce-in-the-tr-/260926-ofg-SUMMARY.md` when done.
</output>
