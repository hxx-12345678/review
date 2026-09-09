import json, sys, urllib.request

BASE = "http://localhost:4000/api"
EMAIL = "cptjacksprw@gmail.com"
PASSWORD = "Player@123"
results = []

def call(method, path, body=None, token=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method,
        headers={"Content-Type": "application/json", **({"Authorization": f"Bearer {token}"} if token else {})})
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            return r.status, json.loads(r.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode() or "{}")
        except Exception:
            return e.code, {}
    except Exception as e:
        return -1, {"error": str(e)}

def check(name, cond, detail=""):
    results.append((name, bool(cond), detail))
    print(f"[{'PASS' if cond else 'FAIL'}] {name} {detail}")

import urllib.error

# 1. login
s, b = call("POST", "/auth/login", {"email": EMAIL, "password": PASSWORD})
tok = b.get("token")
check("login cptjacksprw@gmail.com", s == 200 and tok, f"status={s}")
if not tok:
    print("ABORT: login failed", b); sys.exit(1)

# 2. businesses
s, b = call("GET", "/businesses", token=tok)
biz = (b.get("businesses") or [])
check("list businesses", s == 200 and len(biz) > 0, f"status={s} count={len(biz)}")
bid = biz[0]["id"] if biz else None
slug = biz[0].get("slug") if biz else None
print("   business:", biz[0].get("name"), bid, slug)

# 3. feedback submit (Hinglish code-mixed)
s, b = call("POST", "/feedback/submit", {"businessSlug": slug, "rating": 4, "liked": "Service mast tha, staff friendly tha", "improvement": "but thoda wait karna pada"}, token=tok)
fid = (b.get("feedback") or {}).get("id")
check("feedback submit hinglish", s in (200, 201) and fid, f"status={s} id={fid}")

# 4. talking-points english
s, b = call("POST", "/ai/talking-points", {"highlights": "Food was tasty and staff friendly, but waiting time was long", "businessName": "Test", "rating": 4, "language": "english"})
check("talking-points english", s == 200 and isinstance(b.get("talkingPoints"), list), f"status={s} n={len(b.get('talkingPoints', []))}")

# 5. talking-points hinglish
s, b = call("POST", "/ai/talking-points", {"highlights": "Service mast tha but thoda wait karna pada", "businessName": "Test", "rating": 4, "language": "hinglish"})
tp = b.get("talkingPoints", [])
check("talking-points hinglish", s == 200 and isinstance(tp, list), f"status={s} pts={tp[:2]}")

# 6. talking-points hindi + tamil (new languages)
for lang, txt in [("hindi", "सेवा बहुत अच्छी थी"), ("tamil", "சேவை மிகவும் நன்றாக இருந்தது")]:
    s, b = call("POST", "/ai/talking-points", {"highlights": txt, "businessName": "Test", "rating": 5, "language": lang})
    check(f"talking-points {lang}", s == 200 and isinstance(b.get("talkingPoints"), list), f"status={s}")

# 7. generate-review hinglish
s, b = call("POST", "/ai/generate-review", {"highlights": "Service mast tha but thoda wait karna pada", "businessName": "Test Biz", "rating": 4, "language": "hinglish"})
rev = b.get("review", "")
check("generate-review hinglish", s == 200 and len(rev) > 10, f"status={s} len={len(rev)} draft={rev[:80]}")

# 8. whatsapp-report status (auth)
s, b = call("GET", f"/communications/whatsapp-report/{bid}", token=tok)
check("whatsapp-report status", s == 200 and "whatsappConfigured" in b, f"status={s} configured={b.get('whatsappConfigured')} pref={b.get('preference')}")

# 9. whatsapp-report preview (honest: preview, not whatsapp)
s, b = call("POST", "/communications/whatsapp-report", {"businessId": bid, "frequency": "weekly", "test": True, "ownerPhone": "9820012345"}, token=tok)
check("whatsapp-report preview honest", s == 200 and b.get("deliveredVia") == "preview" and "Velocity" in (b.get("report") or ""), f"status={s} via={b.get('deliveredVia')} configured={b.get('whatsappConfigured')}")

# 10. whatsapp flows send (expect honest 502 not configured)
s, b = call("POST", "/v2/whatsapp-flows/send-flow", {"businessId": bid, "phoneNumber": "9820012345", "customerName": "Test"}, token=tok)
check("whatsapp-flows honest 502", s == 502 and "not configured" in (b.get("error") or "").lower(), f"status={s} err={b.get('error')}")

# 11. review stats
s, b = call("GET", f"/reviews/stats/{bid}", token=tok)
check("reviews stats", s == 200 and "stats" in b, f"status={s}")

# 12. qr list
s, b = call("GET", f"/qr/{bid}", token=tok)
check("qr list", s == 200, f"status={s}")

# 13. ai insights (credits may block -> record honestly)
s, b = call("GET", f"/ai/insights/{bid}?period=week", token=tok)
ok = s == 200 or (s == 403 and b.get("code") == "INSUFFICIENT_CREDITS")
check("ai insights (or honest 403)", ok, f"status={s}")

fails = [n for n, ok, _ in results if not ok]
print(f"\n{len(results)-len(fails)}/{len(results)} passed")
sys.exit(1 if fails else 0)
