(function(){
  function byId(id){return document.getElementById(id);}
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function tierColor(t){var m={0:'#8a93a3',1:'#8a93a3',2:'#ee1c25',3:'#f4b400',4:'#8a4fff',5:'#6231cf',6:'#4b2fa0'};return m[t]||'#3a2580';}
  function parseCsvRows(text){
    var rows=[],row=[],field='',i=0,q=false,ch;
    for(i=0;i<text.length;i++){ch=text[i];
      if(q){ if(ch==='"'){ if(text[i+1]==='"'){field+='"';i++;} else {q=false;} } else {field+=ch;} }
      else { if(ch==='"'){q=true;} else if(ch===','){row.push(field);field='';}
        else if(ch==='\n'||ch==='\r'){ if(ch==='\r'&&text[i+1]==='\n')i++; if(field!==''||row.length){row.push(field);rows.push(row);row=[];field='';} }
        else {field+=ch;} } }
    if(field!==''||row.length){row.push(field);rows.push(row);}
    return rows;
  }
  function mdToHtml(md){
    var lines=String(md||'').split(/\r?\n/),out=[],inList=false;
    function closeList(){ if(inList){out.push('</ul>');inList=false;} }
    for(var i=0;i<lines.length;i++){var ln=lines[i];
      if(/^### /.test(ln)){closeList();out.push('<h3>'+esc(ln.slice(4))+'</h3>');}
      else if(/^## /.test(ln)){closeList();out.push('<h2>'+esc(ln.slice(3))+'</h2>');}
      else if(/^# /.test(ln)){closeList();out.push('<h1>'+esc(ln.slice(2))+'</h1>');}
      else if(/^\s*[-•] /.test(ln)){ if(!inList){out.push('<ul>');inList=true;} out.push('<li>'+esc(ln.replace(/^\s*[-•] /,''))+'</li>');}
      else if(/^\s*>/.test(ln)){closeList();out.push('<blockquote>'+esc(ln.replace(/^\s*>\s?/,''))+'</blockquote>');}
      else if(ln.trim()===''){closeList();}
      else {closeList();out.push('<p>'+esc(ln)+'</p>');} }
    closeList();
    return out.join('\n');
  }
  function renderMap(graph){
    if(!graph||!graph.length) return '<p>No nodes to display.</p>';
    var minX=1e9,minY=1e9,maxX=-1e9,maxY=-1e9,byIdMap={},i;
    for(i=0;i<graph.length;i++){var n=graph[i];byIdMap[n['@id']||n.id]=n;
      minX=Math.min(minX,n.x);minY=Math.min(minY,n.y);maxX=Math.max(maxX,n.x+n.w);maxY=Math.max(maxY,n.y+n.h);}
    var pad=60,vb=(minX-pad)+' '+(minY-pad)+' '+((maxX-minX)+2*pad)+' '+((maxY-minY)+2*pad);
    var edges='',rects='';
    for(i=0;i<graph.length;i++){var p=graph[i],kids=p.children||[];
      for(var j=0;j<kids.length;j++){var c=byIdMap[kids[j]];if(!c)continue;
        edges+='<line x1="'+(p.x+p.w/2)+'" y1="'+(p.y+p.h/2)+'" x2="'+(c.x+c.w/2)+'" y2="'+(c.y+c.h/2)+'" stroke="#b8c0cc" stroke-width="2"/>';}}
    for(i=0;i<graph.length;i++){var nn=graph[i],col=tierColor(nn.tier);
      rects+='<g><rect x="'+nn.x+'" y="'+nn.y+'" width="'+nn.w+'" height="'+nn.h+'" rx="10" fill="#ffffff" stroke="'+col+'" stroke-width="3"/>'
        +'<text x="'+(nn.x+12)+'" y="'+(nn.y+24)+'" font-size="13" font-weight="700" fill="'+col+'">'+esc(nn.type)+'</text>'
        +'<text x="'+(nn.x+12)+'" y="'+(nn.y+46)+'" font-size="14" fill="#101820">'+esc((nn.title||'').slice(0,42))+'</text></g>';}
    return '<svg class="map" viewBox="'+vb+'" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Spatial web map">'+edges+rects+'</svg>';
  }
  function render(data){
    var p=data.project||{},graph=p['@graph']||[],html='';
    html+='<header class="site-head"><h1>'+esc(p.title||'Untitled')+'</h1>';
    if(p.concept)html+='<p class="concept">'+esc(p.concept)+'</p>';
    html+='</header>';
    html+='<section class="map-wrap"><h2>Web map</h2>'+renderMap(graph)+'</section>';
    var content=data.content||{};
    html+='<section class="narrative"><h2>Themes</h2>'+mdToHtml(content.themes)+'</section>';
    html+='<section class="narrative"><h2>Problem situation</h2>'+mdToHtml(content.situation)+'</section>';
    var rows=parseCsvRows(data.extractsCsv||'');
    if(rows.length>1){html+='<section class="extracts"><h2>Source extracts</h2><ul>';
      for(var i=1;i<rows.length;i++){var r=rows[i],t=r[0]||'',s=r[1]||'',u=r[2]||'';
        html+='<li><strong>'+esc(t)+'</strong> — '+esc(s)+(/^https?:\/\//.test(u)?' <a href="'+esc(u)+'" target="_blank" rel="noopener noreferrer">source ↗</a>':'')+'</li>';}
      html+='</ul></section>';}
    byId('report').innerHTML=html;
  }
  function fetchText(url){return fetch(url).then(function(r){if(!r.ok)throw new Error('http '+r.status);return r.text();});}
  function hydrate(){
    return Promise.all([fetchText('./data/project.jsonld'),fetchText('./data/extracts.csv'),
      fetchText('./content/situation.md'),fetchText('./content/themes.md')]).then(function(res){
      return {project:JSON.parse(res[0]),extractsCsv:res[1],content:{situation:res[2],themes:res[3]}};});
  }
  hydrate().then(render).catch(function(){
    if(window.SITE_DATA){render(window.SITE_DATA);}
    else{byId('report').innerHTML='<p>Could not load site data. Serve this folder over HTTP (e.g. python3 -m http.server).</p>';}
  });
})();