#!/usr/bin/env python3
"""Fetch every Turkish neighbourhood (mahalle) with its postal code from PTT.

Source: the public PTT postal code lookup (https://www.ptt.gov.tr/posta-kodu),
the same JSON endpoint its page calls: POST /api/posta-kodu with
action=iller / ilceler / postakodu. One request per district returns every
street of the district; only mahalle -> postal codes is kept.

The endpoint answers only Turkish IPs (403 elsewhere) and its certificate chain
is incomplete, so run it on a TR host and without certificate verification:

    ssh SRVACTR01 'python3 - --out ~/ptt-neighbourhoods.json' < scripts/fetch-ptt-neighbourhoods.py

Output (raw, feeds scripts/build-tr-neighbourhoods.mjs):
    {"fetched": "<ISO date>", "provinces": [{"code": 41, "name": "KOCAELİ",
      "districts": [{"code": 1338, "name": "GEBZE",
        "neighbourhoods": {"MUALLİMKÖY MAH.": ["41400"], ...}}]}]}

Requests are sequential with a pause (~1 000 districts, about half an hour).
"""
import argparse, datetime, json, os, ssl, sys, time, urllib.request

URL = "https://www.ptt.gov.tr/api/posta-kodu"
HEADERS = {
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/128.0 Safari/537.36",
    "Referer": "https://www.ptt.gov.tr/posta-kodu",
    "Origin": "https://www.ptt.gov.tr",
}
CTX = ssl._create_unverified_context()


def call(payload, retries=4):
    body = json.dumps(payload).encode()
    for attempt in range(retries):
        try:
            req = urllib.request.Request(URL, data=body, headers=HEADERS, method="POST")
            with urllib.request.urlopen(req, timeout=90, context=CTX) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception as e:  # network, 5xx, truncated JSON
            if attempt == retries - 1:
                raise
            wait = 5 * (attempt + 1)
            print(f"  retry {payload} in {wait}s: {e}", file=sys.stderr)
            time.sleep(wait)


def options(rows):
    # the lookup lists start with a "Seçiniz" placeholder (kod -1)
    return [r for r in rows if int(r["kod"]) > 0]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--pause", type=float, default=0.7)
    args = ap.parse_args()
    out = os.path.expanduser(args.out)

    provinces = []
    for il in options(call({"action": "iller"})):
        districts = []
        for ilce in options(call({"action": "ilceler", "il_kodu": str(il["kod"])})):
            time.sleep(args.pause)
            rows = call({"action": "postakodu", "il_kodu": str(il["kod"]), "ilce_kodu": str(ilce["kod"])})
            hoods = {}
            for r in rows:
                name, pk = (r.get("mahalleAdi") or "").strip(), (r.get("posta_Kodu") or "").strip()
                if name:
                    hoods.setdefault(name, set()).add(pk)
            districts.append({"code": ilce["kod"], "name": ilce["ad"],
                              "neighbourhoods": {k: sorted(v) for k, v in sorted(hoods.items())}})
        provinces.append({"code": il["kod"], "name": il["ad"], "districts": districts})
        print(f"{il['ad']}: {len(districts)} districts, "
              f"{sum(len(d['neighbourhoods']) for d in districts)} neighbourhoods", file=sys.stderr)

    with open(out, "w", encoding="utf-8") as f:
        json.dump({"fetched": datetime.date.today().isoformat(), "provinces": provinces}, f, ensure_ascii=False)
    print(f"-> {out}", file=sys.stderr)


if __name__ == "__main__":
    main()
