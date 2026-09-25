import urllib.error, json, os, sys, time, urllib.request, base64
ENV = os.environ.get("COLLAGE_ENV_FILE", os.path.join(os.path.dirname(__file__), ".env"))
def key():
    k = os.environ.get("OPENROUTER_API_KEY_PROD")
    if k:
        return k
    for line in open(ENV):
        if line.startswith("OPENROUTER_API_KEY_PROD="):
            return line.split("=",1)[1].strip().strip('"').strip("'")
    raise SystemExit("set OPENROUTER_API_KEY_PROD in the environment or in " + ENV)
def req(path, body=None, timeout=300):
    r = urllib.request.Request("https://openrouter.ai/api/v1"+path,
        data=json.dumps(body).encode() if body else None,
        headers={"Authorization":"Bearer "+key(),"Content-Type":"application/json"})
    try:
        return json.load(urllib.request.urlopen(r, timeout=timeout))
    except urllib.error.HTTPError as e:
        raise SystemExit("HTTP %s: %s" % (e.code, e.read().decode()[:600]))
def log(model, purpose, cost):
    p="budget.json"; d=json.load(open(p)) if os.path.exists(p) else {"calls":[]}
    d["calls"].append({"model":model,"purpose":purpose,"cost":cost,"t":time.time()})
    d["total"]=round(sum(c["cost"] or 0 for c in d["calls"]),4); json.dump(d,open(p,"w"),indent=1)
    return d["total"]
def status():
    d=req("/key")["data"]; return {k:d.get(k) for k in ["usage","limit","limit_remaining"]}
if __name__=="__main__": print(status())
