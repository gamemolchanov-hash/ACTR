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
    if not first.ok or first.json().get("data", {}).get("account") is None:
        print("  SKIP  auto_register_guests is off (or first order failed)")
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

    print(f"\n{'='*50}")
    print(f"Results: {PASS} passed, {FAIL} failed")
    sys.exit(1 if FAIL else 0)
