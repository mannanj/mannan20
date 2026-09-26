import numpy as np, cv2, glob, os
for p in sorted(glob.glob("assets/raw/*.png")):
    n=os.path.basename(p)[:-4]
    if n=="app_clock": continue
    im=cv2.imread(p).astype(np.float32); b,g,r=im[...,0],im[...,1],im[...,2]
    gr=g-np.maximum(r,b)
    a=np.clip(1-(gr-25)/45,0,1)
    # only background connected to the border counts: fill from edges
    bgm=(gr>40).astype(np.uint8); cnt,lab=cv2.connectedComponents(bgm)
    edge=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
    border=np.isin(lab,list(edge))
    a=np.where(border|(gr>70),0,a); a=np.where((~border)&(gr>40)&(gr<=70),1,a)
    a=cv2.GaussianBlur(cv2.erode(a,np.ones((2,2))),(3,3),0)
    m=np.maximum(r,b); g2=np.where(a<0.999,np.minimum(g,m+5),g)
    out=np.dstack([b,g2,r,a*255]).clip(0,255).astype(np.uint8)
    ys,xs=np.where(a>0.05); out=out[ys.min():ys.max()+1, xs.min():xs.max()+1]
    s=min(1,1100/max(out.shape[:2])); out=cv2.resize(out,None,fx=s,fy=s,interpolation=cv2.INTER_AREA) if s<1 else out
    cv2.imwrite(f"assets/cut/{n}.png",out); print(n,out.shape[1],out.shape[0])
