import sys, json, base64, urllib.request, urllib.error, wave
from or_ import key, log
i, text = sys.argv[1], sys.argv[2]
voice = sys.argv[3] if len(sys.argv)>3 else "sage"
direction = sys.argv[4] if len(sys.argv)>4 else "warm, calm, intimate documentary narrator; unhurried, a sense of wonder, gentle smile; natural pauses at punctuation"
body = {"model":"openai/gpt-audio","modalities":["text","audio"],
 "audio":{"voice":voice,"format":"pcm16"},"stream":True,"usage":{"include":True},
 "messages":[{"role":"system","content":"You are a professional voice actor. Speak the user's line exactly verbatim - no additions, no preamble. Delivery: "+direction+"."},
             {"role":"user","content":text}]}
r = urllib.request.Request("https://openrouter.ai/api/v1/chat/completions", data=json.dumps(body).encode(),
    headers={"Authorization":"Bearer "+key(),"Content-Type":"application/json"})
try: resp = urllib.request.urlopen(r, timeout=300)
except urllib.error.HTTPError as e: raise SystemExit("HTTP %s: %s"%(e.code,e.read().decode()[:500]))
pcm=b""; tr=""; cost=None
for raw in resp:
    line=raw.decode().strip()
    if not line.startswith("data:") or line.endswith("[DONE]"): continue
    d=json.loads(line[5:])
    if d.get("usage"): cost=d["usage"].get("cost")
    for ch in d.get("choices",[]):
        a=ch.get("delta",{}).get("audio") or {}
        if a.get("data"): pcm+=base64.b64decode(a["data"])
        if a.get("transcript"): tr+=a["transcript"]
out=f"audio/line{i}_{voice}.wav"
w=wave.open(out,"wb"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000); w.writeframes(pcm); w.close()
print(f"{out} {len(pcm)/48000:.2f}s | {tr!r} | cost {cost} total {log('openai/gpt-audio', f'tts {i} {voice}', cost)}")
