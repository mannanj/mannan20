import sys, json, base64, urllib.request, urllib.error
from or_ import key, log
model = sys.argv[1]; prompt = sys.argv[2]; out = sys.argv[3]; stream = len(sys.argv)>4
body = {"model":model,"messages":[{"role":"user","content":prompt}],"modalities":["audio","text"]}
if stream: body.update(stream=True, audio={"format":"wav"})
r = urllib.request.Request("https://openrouter.ai/api/v1/chat/completions", data=json.dumps(body).encode(),
    headers={"Authorization":"Bearer "+key(),"Content-Type":"application/json"})
try: resp = urllib.request.urlopen(r, timeout=600)
except urllib.error.HTTPError as e: raise SystemExit("HTTP %s: %s"%(e.code,e.read().decode()[:500]))
raw = resp.read().decode()
if stream:
    data=b""; cost=None; fmt=None
    for line in raw.splitlines():
        if not line.startswith("data:") or "[DONE]" in line: continue
        d=json.loads(line[5:]); cost=(d.get("usage") or {}).get("cost", cost)
        for ch in d.get("choices",[]):
            a=(ch.get("delta") or {}).get("audio") or {}
            if a.get("data"): data+=base64.b64decode(a["data"])
else:
    d=json.loads(raw); m=d["choices"][0]["message"]; cost=d.get("usage",{}).get("cost")
    a=m.get("audio") or {}; print("keys:", list(m.keys()), "audio keys:", list(a.keys()))
    data=base64.b64decode(a["data"]) if a.get("data") else b""
open(out,"wb").write(data); print(out, len(data), "bytes cost", cost, "total", log(model,"music "+out,cost))
