const O='#4a2e1a', S='#F2B279', D='#c98f5c';
function hand(closed){
  const ia = closed?0:-27, ta = closed?0:25;
  const finger=(x1,y1,x2,y2,w,c)=>`<line x1='${x1}' y1='${y1}' x2='${x2}' y2='${y2}' stroke='${c}' stroke-width='${w}' stroke-linecap='round'/>`;
  const idx=(w,c)=>`<g transform='rotate(${ia} 22 16)'>${finger(22,16,12.5,16.6,w,c)}${finger(12.5,16.6,8.4,18.6,w*0.9,c)}</g>`;
  const th=(w,c)=>`<g transform='rotate(${ta} 23 24.5)'>${finger(23,24.5,14,23.4,w,c)}${finger(14,23.4,8.8,21.6,w*0.92,c)}</g>`;
  const body=(pad,c)=>`<path d='M20 15 Q23 9.5 31 10.5 L40 12 L40 28 L31 29.5 Q22 29 20 25 Q18.5 20 20 15 Z' fill='${c}' stroke='${c}' stroke-width='${pad}' stroke-linejoin='round'/>`;
  const curled=(w,c)=>closed?finger(21.5,20.6,18.2,21.4,w,c):'';
  const outline = idx(6.4,O)+th(7,O)+curled(5.6,O)+body(3.2,O);
  const fill = idx(4.2,S)+th(4.8,S)+curled(3.4,S)+body(0.01,S);
  const detail = `<path d='M24 14.5 Q26 12.5 28 14 M25 25.5 Q27.5 27 30 25.8' fill='none' stroke='${D}' stroke-width='1.1' stroke-linecap='round'/>`
   + `<rect x='34' y='10.4' width='7' height='19.2' rx='1.5' fill='#5b8fd6' stroke='${O}' stroke-width='1.4'/>`;
  const crease = closed?`<path d='M19 20.4 Q14 20.6 10 20.2' fill='none' stroke='${D}' stroke-width='1.1' stroke-linecap='round'/>`:'';
  const pinch = closed?`<g stroke='${O}' stroke-width='1.1' stroke-linecap='round'><line x1='6.2' y1='16.4' x2='4.4' y2='15'/><line x1='5.6' y1='20.4' x2='3.4' y2='20.6'/><line x1='6.6' y1='24' x2='5' y2='25.6'/></g>`:'';
  const inner = `<g transform='translate(-1.5 11) rotate(-40 8.6 20)'>${outline}${fill}${detail}${crease}</g>`;
  return `<svg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 40 40'>${inner}${pinch?`<g transform='translate(-1.5 11) rotate(-40 8.6 20)'>${pinch}</g>`:''}</svg>`;
}
const fs=await import('fs');
fs.writeFileSync('open.svg',hand(false));fs.writeFileSync('closed.svg',hand(true));
const enc=s=>s.replace(/</g,'%3C').replace(/>/g,'%3E').replace(/#/g,'%23').replace(/"/g,"'");
fs.writeFileSync('css.txt',`OPEN url("data:image/svg+xml;charset=utf-8,${enc(hand(false))}") 10 46\nCLOSED url("data:image/svg+xml;charset=utf-8,${enc(hand(true))}") 10 46\n`);
fs.writeFileSync('view.html',`<body style="margin:0;background:#9cc27a;display:flex;gap:30px;padding:20px">${['open','closed'].map(n=>`<div style="position:relative;width:240px;height:240px;background:#e9e2c8"><img src="${n}.svg" style="width:240px;height:240px"><div style="position:absolute;left:${10/60*240-4}px;top:${46/60*240-4}px;width:8px;height:8px;border-radius:50%;background:red"></div></div>`).join('')}</body>`);
