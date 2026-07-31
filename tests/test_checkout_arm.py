"""
ARM checkout data-layer probe tests (Plan 02-01).

Prerequisites:
  - ARM demo backend running: make up (or equivalent)
  - Next.js dev server running: npm run dev (port 3000)
  - A valid distributorProductId from the demo tenant

Run:
  python3 tests/test_checkout_arm.py

Note: the test requires NEXT_PUBLIC_TENANT_ID and a live demo distrib product id.
Set DEMO_PRODUCT_ID env var to override the default placeholder.
"""

import json
import os
import sys
import uuid

import requests

BASE = os.environ.get("STOREFRONT_BASE", "http://localhost:3000")
TENANT = os.environ.get("NEXT_PUBLIC_TENANT_ID", "tenant_snailmarket")
DEMO_PRODUCT_ID = os.environ.get("DEMO_PRODUCT_ID", "")
# Keep in sync with TERMS_VERSION in src/lib/auth.ts — the BFF registerSchema
# requires a non-empty value and records it as proof of what was shown.
TERMS_VERSION = "2026-06-30"

session = requests.Session()
session.headers.update({"X-Tenant-ID": TENANT})

PASS = 0
FAIL = 0


def check(name: str, ok: bool, detail: str = "") -> None:
    global PASS, FAIL
    if ok:
        print(f"  PASS  {name}")
        PASS += 1
    else:
        print(f"  FAIL  {name}" + (f": {detail}" if detail else ""))
        FAIL += 1


# ── 1. validateCart ────────────────────────────────────────────────────────────
def test_validate_cart() -> None:
    print("\n[1] POST /api/storefront/cart/validate")
    if not DEMO_PRODUCT_ID:
        print("  SKIP  no DEMO_PRODUCT_ID set — cannot validate cart items")
        return
    body = {"items": [{"distributorProductId": DEMO_PRODUCT_ID, "quantity": 1}]}
    r = session.post(f"{BASE}/api/storefront/cart/validate", json=body)
    check("status 200", r.status_code == 200, str(r.status_code))
    if r.ok:
        d = r.json()
        check("has data.items", isinstance(d.get("data", {}).get("items"), list))
        check("has data.subtotal", "subtotal" in d.get("data", {}))
        check("has data.allValid", "allValid" in d.get("data", {}))


# ── 2. validatePromo ──────────────────────────────────────────────────────────
def test_validate_promo() -> None:
    print("\n[2] POST /api/storefront/promo/validate")
    body = {"code": "TEST", "subtotal": 100}
    r = session.post(f"{BASE}/api/storefront/promo/validate", json=body)
    # ARM returns 200 for invalid codes (valid:false), not 4xx
    check("status 2xx", r.status_code < 300, str(r.status_code))
    if r.ok:
        d = r.json()
        data = d.get("data", {})
        # ARM returns discriminated union on `status` ('applied'|'invalid'|'expired'|...)
        check("has data.status field", "status" in data)


# ── 3. fetchShippingRates ─────────────────────────────────────────────────────
def test_shipping_rates() -> None:
    print("\n[3] GET /api/storefront/shipping/rates")
    items_param = json.dumps([{"distributorProductId": DEMO_PRODUCT_ID or "demo", "quantity": 1}])
    params = {
        "country": "TR",
        "postalCode": "34000",
        "items": items_param,
        "currency": "USD",
    }
    r = session.get(f"{BASE}/api/storefront/shipping/rates", params=params)
    check("status 200", r.status_code == 200, str(r.status_code))
    if r.ok:
        d = r.json()
        check("has fedex_configured", "fedex_configured" in d)
        check("has rates array", isinstance(d.get("rates"), list))


# ── 4. createOrder (guest, auto-registered account — FBG-476/FBG-477) ─────────
def test_create_order() -> None:
    """A brand-new guest: unique email AND unique phone.

    Any phone that already exists in the storefront is the checkout identity in
    ARM and yields `linked`, so the `created` branch is only observable with a
    genuinely new pair.
    """
    print("\n[4] POST /api/storefront/orders")
    if not DEMO_PRODUCT_ID:
        print("  SKIP  no DEMO_PRODUCT_ID set — cannot create order without valid items")
        return None
    tag = uuid.uuid4().hex[:10]
    email = f"guest.{tag}@example.com"
    body = {
        "customer": {
            "name": "Test User",
            "phone": f"+9053{tag[:8]}",
            "email": email,
        },
        "shipping": {
            "city": "Istanbul",
            "zip": "34000",
            "country": "TR",
            "street": "Istiklal Cad",
            "building": "1",
        },
        "items": [{"distributorProductId": DEMO_PRODUCT_ID, "quantity": 1}],
        # ARM addresses the "set your password" email with this raw tag.
        "locale": "tr",
    }
    r = session.post(f"{BASE}/api/storefront/orders", json=body)
    check("status 201 or 200", r.status_code in (200, 201), str(r.status_code))
    if not r.ok:
        return None
    data = r.json().get("data", {})
    check("has data.id", "id" in data)
    check("has data.number", "number" in data)
    check("has data.total", "total" in data)
    check("has data.currency", "currency" in data)

    account = data.get("account")
    if account is None:
        # Configuration, not a defect: `account` is returned only by storefronts
        # with arm_storefronts.auto_register_guests on.
        print("  SKIP  no data.account — auto_register_guests is off for this storefront")
    else:
        check(
            "new guest → account.status == 'created'",
            account.get("status") == "created",
            str(account),
        )
        check("account.welcome_email_sent is a bool", isinstance(account.get("welcome_email_sent"), bool))
    return data.get("id")


# ── 5. guest order stays readable/payable by UUID (FBG-480) ───────────────────
def test_guest_order_access(order_id: str | None = None) -> None:
    """No Authorization header at all — the guest's own browser after checkout.

    ARM links every order to a customer row, so before FBG-480 both calls below
    answered 404 and the buyer could never reach payment or confirmation.
    """
    print("\n[5] guest access to the fresh order (no Authorization)")
    if not order_id:
        print("  SKIP  no order_id — skipping guest access test")
        return

    r = session.get(f"{BASE}/api/storefront/orders/{order_id}")
    check("GET /orders/:id is not 404 for the guest owner", r.status_code != 404, str(r.status_code))
    check("GET /orders/:id status 200", r.status_code == 200, str(r.status_code))

    body = {
        "orderId": order_id,
        "successUrl": f"{BASE}/checkout/success?order={order_id}",
        "cancelUrl": f"{BASE}/checkout",
    }
    r = session.post(f"{BASE}/api/storefront/payment/create-session", json=body)
    check("create-session is not 404 for the guest owner", r.status_code != 404, str(r.status_code))
    check("create-session status 200", r.status_code == 200, str(r.status_code))
    if r.ok:
        data = r.json().get("data", {})
        # `{"type":"manual"}` is a success too (offline provider, FBG-478): the
        # order is placed and waits for an operator, so there is no session.
        check(
            "manual payload or an online session",
            data.get("type") == "manual"
            or bool(data.get("clientSecret") or data.get("redirectUrl")),
            str(data),
        )


# ── 6. repeat checkout with the same email → linked, not created ──────────────
def test_repeat_guest_links() -> None:
    print("\n[6] POST /api/storefront/orders — same email, new phone")
    if not DEMO_PRODUCT_ID:
        print("  SKIP  no DEMO_PRODUCT_ID set")
        return
    tag = uuid.uuid4().hex[:10]
    email = f"guest.{tag}@example.com"
    shipping = {
        "city": "Istanbul",
        "zip": "34000",
        "country": "TR",
        "street": "Istiklal Cad",
        "building": "1",
    }
    items = [{"distributorProductId": DEMO_PRODUCT_ID, "quantity": 1}]

    first = session.post(
        f"{BASE}/api/storefront/orders",
        json={
            "customer": {"name": "Test User", "phone": f"+9053{tag[:8]}", "email": email},
            "shipping": shipping,
            "items": items,
            "locale": "tr",
        },
    )
    # A failed request is a FAILURE; only a missing `account` is configuration.
    check("first order accepted", first.ok, f"{first.status_code} {first.text[:200]}")
    if not first.ok:
        return
    if first.json().get("data", {}).get("account") is None:
        print("  SKIP  auto_register_guests is off for this storefront")
        return

    second = session.post(
        f"{BASE}/api/storefront/orders",
        json={
            "customer": {
                "name": "Test User",
                "phone": f"+9054{uuid.uuid4().hex[:8]}",
                "email": email,
            },
            "shipping": shipping,
            "items": items,
            "locale": "tr",
        },
    )
    check("status 201 or 200", second.status_code in (200, 201), str(second.status_code))
    if second.ok:
        account = second.json().get("data", {}).get("account", {})
        check(
            "known email → account.status == 'linked'",
            account.get("status") == "linked",
            str(account),
        )


# ── 7. guest checkout on a REGISTERED phone → linked + owner-only payment ─────
def test_registered_phone_match() -> None:
    """The one guest flow that is NOT payable without signing in.

    ARM treats the phone as the checkout identity: a guest typing a registered
    customer's number gets `account.status='linked'` and the order is attached to
    that account. `orderRequiresOwnerJwt` then closes both GET /orders/:id and
    create-session to everyone but the owner, so the storefront must stop
    retrying and send the buyer to sign in (checkout.errors.ownerSignInRequired).
    """
    print("\n[7] guest checkout on a registered phone")
    if not DEMO_PRODUCT_ID:
        print("  SKIP  no DEMO_PRODUCT_ID set")
        return
    tag = uuid.uuid4().hex[:10]
    email = f"member.{tag}@example.com"
    phone = f"+9055{tag[:8]}"
    password = f"Pw!{tag}"

    # Mirrors what the storefront sends (src/lib/auth.ts): `terms_version` is a
    # required field of the BFF registerSchema, not an optional extra.
    reg = session.post(
        f"{BASE}/api/storefront/auth/register",
        json={
            "name": "Member User",
            "email": email,
            "phone": phone,
            "password": password,
            "terms_accepted": True,
            "terms_version": TERMS_VERSION,
        },
    )
    # A 4xx here means the request itself is wrong — that must fail the run, not
    # skip it, or this whole ownership scenario silently stops being tested.
    check("registration accepted", reg.ok, f"{reg.status_code} {reg.text[:200]}")
    if not reg.ok:
        return

    order = session.post(
        f"{BASE}/api/storefront/orders",
        json={
            # Guest checkout (no Authorization) reusing the registered phone.
            "customer": {"name": "Member User", "phone": phone, "email": email},
            "shipping": {
                "city": "Istanbul",
                "zip": "34000",
                "country": "TR",
                "street": "Istiklal Cad",
                "building": "1",
            },
            "items": [{"distributorProductId": DEMO_PRODUCT_ID, "quantity": 1}],
            "locale": "tr",
        },
    )
    check("status 201 or 200", order.status_code in (200, 201), str(order.status_code))
    if not order.ok:
        return
    data = order.json().get("data", {})
    order_id = data.get("id")
    account = data.get("account")
    if account is None:
        print("  SKIP  auto_register_guests is off for this storefront")
    else:
        check(
            "registered phone → account.status == 'linked'",
            account.get("status") == "linked",
            str(account),
        )

    body = {
        "orderId": order_id,
        "successUrl": f"{BASE}/tr/checkout/success?order={order_id}",
        "cancelUrl": f"{BASE}/tr/checkout",
    }
    anon = session.post(f"{BASE}/api/storefront/payment/create-session", json=body)
    check(
        "without the owner JWT create-session is refused (404)",
        anon.status_code == 404,
        str(anon.status_code),
    )

    # BFF loginSchema takes `login` (email OR phone), not `email`.
    login = session.post(
        f"{BASE}/api/storefront/auth/login", json={"login": email, "password": password}
    )
    check("login accepted", login.ok, f"{login.status_code} {login.text[:200]}")
    if not login.ok:
        return
    token = login.json().get("token")
    owned = session.post(
        f"{BASE}/api/storefront/payment/create-session",
        json=body,
        headers={"Authorization": f"Bearer {token}"},
    )
    check(
        "with the owner JWT the SAME order becomes payable",
        owned.status_code == 200,
        str(owned.status_code),
    )


if __name__ == "__main__":
    print(f"Storefront base: {BASE}")
    print(f"Tenant: {TENANT}")
    print(f"Demo product: {DEMO_PRODUCT_ID or '(not set)'}")

    test_validate_cart()
    test_validate_promo()
    test_shipping_rates()
    order_id = test_create_order()
    test_guest_order_access(order_id)
    test_repeat_guest_links()
    test_registered_phone_match()

    print(f"\n{'='*50}")
    print(f"Results: {PASS} passed, {FAIL} failed")
    sys.exit(1 if FAIL else 0)
