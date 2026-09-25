import sys, json, base64, re
from or_ import req, log
STYLE = ("Whimsical hand-made paper collage cut-out, as if cut with scissors from textured watercolor paper and kraft paper, "
 "visible paper fibers and grain, loose pencil and ink linework on top, charming naive picture-book illustration, "
 "warm muted palette (ochre, terracotta, cream, sage green, deep indigo). The element has a thin white paper border around it like a hand-cut sticker. "
 "A single isolated element, centered, filling most of the frame, on a perfectly flat solid pure chroma green (#00FF00) background. No shadow, no text, no scenery.")
name, subject = sys.argv[1], sys.argv[2]
model = sys.argv[3] if len(sys.argv)>3 else "google/gemini-3.1-flash-image"
aspect = sys.argv[4] if len(sys.argv)>4 else "1:1"
body = {"model":model,"modalities":["image","text"],"image_config":{"aspect_ratio":aspect},
        "messages":[{"role":"user","content":f"{STYLE}\n\nThe element: {subject}"}]}
r = req("/chat/completions", body)
msg = r["choices"][0]["message"]; imgs = msg.get("images") or []
if not imgs: raise SystemExit("no image: "+str(msg.get("content"))[:300])
url = imgs[0]["image_url"]["url"]; data = base64.b64decode(url.split(",",1)[1])
ext = "png" if "png" in url[:30] else "jpg"
open(f"assets/raw/{name}.{ext}","wb").write(data)
c = r.get("usage",{}).get("cost")
print(f"{name}.{ext} cost {c} total {log(model, 'img '+name, c)}")
