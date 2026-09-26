import json, numpy as np
from scipy.signal import butter, sosfilt
from scipy.io import wavfile
SR=48000; DUR=33.5; rs=np.random.default_rng(3)
def bp(x,lo,hi): return sosfilt(butter(2,[lo,hi],'bandpass',fs=SR,output='sos'),x)
def lp(x,f): return sosfilt(butter(2,f,'lowpass',fs=SR,output='sos'),x)
def env(n,a,d): t=np.arange(n)/SR; return np.minimum(1,t/max(a,1e-4))*np.exp(-t/d)
def noise(s): return rs.standard_normal(int(s*SR))
def tone(f,s,d): t=np.arange(int(s*SR))/SR; return np.sin(2*np.pi*f*t)*np.exp(-t/d)
def pop(): x=bp(noise(.09),700,3500)*env(int(.09*SR),.002,.018)*.9; x[:int(.08*SR)]+=tone(110+rs.random()*40,.08,.025)[:int(.08*SR)]*.8; return x*.45
def stamp(): x=bp(noise(.16),300,2500)*env(int(.16*SR),.001,.03); x+=tone(75,.16,.05)*1.2; return x*.6
def pencil(d):
    n=int(d*SR); t=np.arange(n)/SR; m=.55+.45*np.abs(np.sin(2*np.pi*3.3*t+rs.random()))*(.7+.3*rs.random(n))
    x=bp(noise(d),2200,7500)*m*np.minimum(1,np.minimum(t/.05,(d-t)/.08)); return x*.10
def scribble(d):
    n=int(d*SR); t=np.arange(n)/SR; m=.4+.6*np.abs(np.sin(2*np.pi*7.5*t))
    x=bp(noise(d),1800,7000)*m*np.minimum(1,np.minimum(t/.05,(d-t)/.1)); return x*.16
def whoosh():
    d=.5; n=int(d*SR); t=np.arange(n)/SR; x=noise(d); out=np.zeros(n)
    for k,(lo,hi) in enumerate([(200,900),(500,1800),(900,3500),(600,2200)]):
        seg=slice(k*n//4,(k+1)*n//4); out[seg]=bp(x,lo,hi)[seg]
    e=np.sin(np.pi*t/d)**2; return lp(out,5000)*e*.30
def rustle(d):
    n=int(d*SR); t=np.arange(n)/SR; imp=(rs.random(n)<.004)*rs.random(n)*3
    x=bp(noise(d)*.3+imp,900,6000)*np.sin(np.pi*t/d); return x*.25
def tear():
    d=.85; n=int(d*SR); t=np.arange(n)/SR; imp=(rs.random(n)<.02)*(rs.random(n)*2)
    x=bp(noise(d)*.35+imp,800,7000)*np.minimum(1,t/.05)*np.exp(-np.maximum(0,t-.55)/.1); return x*.55
def click():
    x=np.zeros(int(.35*SR)); x[:200]+=bp(noise(200/SR),1500,6000)*1.5; x[2400:2600]+=bp(noise(200/SR),1500,6000)
    x+=tone(1900,.35,.01)*.3
    t=np.arange(len(x))/SR; x+=(np.sign(np.sin(2*np.pi*120*t))*.08+np.sin(2*np.pi*240*t)*.05)*np.exp(-t/.12)
    return x*.55
def buzz(d):
    n=int(d*SR); t=np.arange(n)/SR; g=np.repeat((rs.random(int(d*12)+1)>.22).astype(float),SR//12)[:n]
    x=(np.sin(2*np.pi*120*t)*.5+np.sin(2*np.pi*240*t)*.3+np.sign(np.sin(2*np.pi*120*t))*.08)*lp(g,40)
    return x*np.minimum(1,np.minimum(t/.1,(d-t)/.2))*.07
def chime(fs=(1318.5,1975.5,2637)):
    return sum(tone(f,1.8,.55/(i+1))*(.5/(i+1)) for i,f in enumerate(fs))*.22
def thump(): x=tone(68,.25,.07)*1.1; x[:1500]+=bp(noise(1500/SR),400,2000)*.5; return x*.55
def tick(): return (tone(2100,.08,.012)*.6+bp(noise(.08),2000,6000)*env(int(.08*SR),.001,.008))*.3
FX={'pop':pop,'stamp':stamp,'whoosh':whoosh,'tear':tear,'click':click,'thump':thump,'tick':tick,'chime':chime,
    'chime2':lambda:chime((1046.5,1568,2093))*1.1}
DURFX={'pencil':pencil,'scribble':scribble,'rustle':rustle,'buzz':buzz}
out=np.zeros((int(DUR*SR)+SR,2))
for ev in json.load(open('events.json')):
    t0,kind=ev[0],ev[1]; x=DURFX[kind](ev[2]) if kind in DURFX else FX[kind]()
    pan=rs.uniform(-.35,.35); i=int(t0*SR); j=min(len(out),i+len(x))
    out[i:j,0]+=x[:j-i]*(1-pan); out[i:j,1]+=x[:j-i]*(1+pan)
out=out[:int(DUR*SR)]; out/=max(1,np.abs(out).max()/.9)
wavfile.write('audio/sfx.wav',SR,(out*32767).astype(np.int16)); print('sfx ok', len(json.load(open('events.json'))),'events')
