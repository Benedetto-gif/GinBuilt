// trova per id anche quando il lettore aggiunge un prefisso agli id
function gpId(id){ if (!id) return null; var el = null; try { el = document.getElementById(id); } catch(e){} if (!el) try { el = document.querySelector('[id$="' + id + '"]'); } catch(e){} return el; }
// Parole del glossario e sigle: la voce si apre sulla pagina stessa, sotto il paragrafo,
// cosi' non si perde il punto di lettura. «Apri nel glossario» porta alla voce completa.
// Ritorno: ogni collegamento verso un'altra pagina del libro ricorda da dove si e' partiti
// (una pila, per piu' salti di fila); la pagina d'arrivo mostra «↩ Torna a …» in cima e accanto al punto raggiunto.
(function(){
  // Kotobee e altri lettori: la pagina puo' essere caricata dentro un contenitore, la memoria del browser
  // puo' essere bloccata e i clic sui collegamenti intercettati. Per questo: nome della pagina scritto nel testo
  // (contenitore .gp-pagina), memoria tentata in piu' posti, clic ascoltati in fase di cattura e su ogni collegamento.
  var CH = 'gp-pila';
  var mk = document.querySelectorAll('[data-p]');
  function radiceDi(nome){ for (var r = mk.length - 1; r >= 0; r--) if (mk[r].getAttribute('data-p') === nome) return mk[r]; return null; }
  // trova un elemento del libro anche se il lettore ha cambiato gli id (prefissi), e in ultimo per testo
  function trova(id, testo, dove){
    var el = null; dove = dove || document;
    if (id){
      try { el = document.getElementById(id); } catch(e){}
      if (!el) try { el = dove.querySelector('[id$="' + id + '"]'); } catch(e){}
    }
    if (!el && testo){
      var w = String(testo).replace(/^\s+|\s+$/g, '').toLowerCase(), c = dove.querySelectorAll('dt, li > strong, h1, h2, h3, h4');
      for (var k = 0; k < c.length && !el; k++) if (c[k].textContent.replace(/^\s+/, '').toLowerCase().indexOf(w) === 0) el = c[k];
    }
    return el;
  }
  var PAGINA = mk.length ? mk[mk.length - 1].getAttribute('data-p') : ((location.pathname || '').split('/').pop() || '').split('?')[0];
  function cont(){ var w = [window]; try { if (window.parent && window.parent !== window) w.push(window.parent); } catch(e){} try { if (window.top && w.indexOf(window.top) < 0) w.push(window.top); } catch(e){} return w; }
  function leggi(K){
    K = K || CH; var best = null;
    function prova(txt){ try { var v = JSON.parse(txt || 'null'); if (v && v.p instanceof Array && (!best || v.ts > best.ts)) best = v; } catch(e){} }
    try { prova(localStorage.getItem(K)); } catch(e){}
    try { prova(sessionStorage.getItem(K)); } catch(e){}
    var ws = cont();
    for (var i = 0; i < ws.length; i++){ try { if (ws[i]['__' + K]) prova(ws[i]['__' + K]); } catch(e){} try { var n = ws[i].name || ''; if (n.indexOf('gp:') === 0) prova(JSON.parse(n.slice(3))[K]); } catch(e){} }
    return best ? best.p : [];
  }
  function scrivi(v, K){
    K = K || CH; var txt = JSON.stringify({ ts: Date.now() + Math.random(), p: v.slice(-20) });
    try { localStorage.setItem(K, txt); } catch(e){}
    try { sessionStorage.setItem(K, txt); } catch(e){}
    var ws = cont();
    for (var i = 0; i < ws.length; i++){ try { ws[i]['__' + K] = txt; } catch(e){} }
    try { var n = window.name || '', m = {}; if (n.indexOf('gp:') === 0) m = JSON.parse(n.slice(3)); if (!n || n.indexOf('gp:') === 0){ m[K] = txt; window.name = 'gp:' + JSON.stringify(m); } } catch(e){}
  }
  function fileDi(href){ return (href || '').split('#')[0].split('?')[0].split('/').pop(); }
  var ultimo = null;
  function spingi(a){
    if (ultimo === a) return; ultimo = a; setTimeout(function(){ ultimo = null; }, 800);
    var anc = a, da = null; while (anc && anc.getAttribute){ if (anc.getAttribute('data-p')){ da = anc.getAttribute('data-p'); break; } anc = anc.parentNode; }
    var pagina = da || PAGINA;
    var href = a.getAttribute('href') || '', f = fileDi(href);
    if (!f || f === pagina || /^[a-z]+:/i.test(href)) return;
    var pila = leggi();
    var rq = radiceDi(pagina), tt = rq && rq.querySelector('h1, h2'); tt = tt ? tt.textContent.replace(/\s+/g, ' ').replace(/^\s|\s$/g, '') : '';
    pila.push({ h: pagina + (a.id ? '#' + a.id : ''), w: a.textContent, t: tt || document.title, to: f, dest: href.split('#')[1] || '', ts: Date.now() });
    scrivi(pila);
  }
  function suClic(ev){
    var a = ev.target; while (a && a.nodeName && a.nodeName.toUpperCase() !== 'A') a = a.parentNode;
    if (!a || !a.getAttribute || !a.getAttribute('href')) return;
    if (a.getAttribute('data-d') && gpId(a.getAttribute('data-d'))) return;   // parola con finestrella
    if (/def-x|def-apri/.test(String(a.className || ''))) return;
    if (String(a.className || '').indexOf('torna-link') >= 0) return;
    spingi(a);
  }
  // in cattura, prima che il lettore intercetti il clic; anche il tocco, per i lettori che non generano il clic
  try { window.addEventListener('click', suClic, true); } catch(e){}
  var mosso = false;
  try {
    document.addEventListener('touchstart', function(){ mosso = false; }, true);
    document.addEventListener('touchmove', function(){ mosso = true; }, true);
    document.addEventListener('touchend', function(ev){ if (!mosso) suClic(ev); }, true);
  } catch(e){}
  var tutti = document.querySelectorAll('a[href]');
  for (var q = 0; q < tutti.length; q++) tutti[q].addEventListener('click', suClic, false);
  var aperta = null, daLink = null;
  function chiudi(){ if (aperta && aperta.parentNode) aperta.parentNode.removeChild(aperta); aperta = null; daLink = null; }
  function blocco(el){
    while (el && el.parentNode && !/^(P|LI|DD|TD|TH|BLOCKQUOTE|DIV|SECTION|ARTICLE|FIGCAPTION)$/.test(el.nodeName.toUpperCase())) el = el.parentNode;
    return el;
  }
  var links = document.querySelectorAll('a.termine, a.sigla');
  for (var i = 0; i < links.length; i++) links[i].addEventListener('click', function(ev){
    var def = gpId(this.getAttribute('data-d') || ''); if (!def) return;
    ev.preventDefault();
    if (daLink === this){ chiudi(); return; }
    chiudi();
    var a = this, sigla = a.className.indexOf('sigla') >= 0;
    var box = document.createElement('div');
    box.className = 'def-pop';
    box.setAttribute('style', 'margin:.4em 0 .8em;padding:.6em .8em;border-left:4px solid #2F7259;background:#EEF4EF;border-radius:6px;font-size:.95em;');
    box.innerHTML = def.innerHTML + '<p style="margin:.4em 0 0;text-align:right"><a href="' + a.getAttribute('href') + '" class="def-apri" style="margin-right:1em">' +
      (sigla ? 'Leggi tutto sulle sigle' : 'Apri nel glossario') + ' →</a><a href="#" class="def-x">Chiudi ✕</a></p>';
    // il ritorno deve puntare alla parola, non al riquadro
    box.querySelector('.def-apri').addEventListener('click', function(){ spingi(a); });
    box.querySelector('.def-apri').addEventListener('touchend', function(){ if (!mosso) spingi(a); });
    box.querySelector('.def-x').addEventListener('click', function(e){ e.preventDefault(); chiudi(); });
    var b = blocco(a);
    if (b && /^(TD|TH|LI|DD)$/.test(b.nodeName.toUpperCase())) b.appendChild(box);
    else if (b && b.parentNode) b.parentNode.insertBefore(box, b.nextSibling);
    else return;
    aperta = box; daLink = a;
  });
  // ritorno appena fatto: si scorre fino alla parola da cui si era partiti
  var rit = leggi('gp-rit');
  if (rit.length && (rit[0].p === PAGINA || radiceDi(rit[0].p)) && Date.now() - rit[0].ts < 120000){
    scrivi([], 'gp-rit');
    var el = trova(rit[0].id, null, radiceDi(rit[0].p) || document);
    if (el){
      el.style.backgroundColor = '#FFF1B8'; setTimeout(function(){ el.style.backgroundColor = ''; }, 4000);
      [350, 900, 1800].forEach(function(ms){ setTimeout(function(){ try { el.scrollIntoView({ block: 'center' }); } catch(e){ try { el.scrollIntoView(); } catch(e2){} } }, ms); });
    }
  }
  // pagina d'arrivo: se l'ultimo salto portava qui, compare «↩ Torna a …»
  var pila = leggi(), t = pila.length ? pila[pila.length - 1] : null;
  try {
    var dg = document.createElement('p'); dg.className = 'gp-diagnosi';
    dg.setAttribute('style', 'font:11px/1.3 monospace;color:#999;margin:2em 0 .5em;word-break:break-all;');
    dg.textContent = 'prova ritorno · pagina: ' + PAGINA + ' · contenitori: ' + mk.length + ' · salti: ' + pila.length + (t ? ' · ultimo: ' + t.h + ' → ' + t.to + '#' + t.dest + ' «' + (t.w || '') + '»' : '') + ' · indirizzo: ' + location.href.slice(0, 80) + ' · id prova: ' + (gpId(t && t.dest) ? 'trovato' : 'no');
    (radiceDi(PAGINA) || document.body).appendChild(dg);
  } catch(e){}
  if (!t || !(t.to === PAGINA || radiceDi(t.to)) || Date.now() - (t.ts || 0) > 12 * 3600 * 1000) return;
  // La parola d'arrivo (voce del glossario, sigla, titolo della botanica o della sezione) si accende
  // e diventa il tasto di ritorno, con una piccola freccia ↩: niente pulsanti grandi sopra i titoli.
  function indietro(el){
    var pila = leggi(); pila.pop(); scrivi(pila);
    var hh = (t.h || '').split('#');
    scrivi([{ p: hh[0], id: hh[1] || '', ts: Date.now() }], 'gp-rit');
    var partito = false;
    try { window.addEventListener('pagehide', function(){ partito = true; }); window.addEventListener('hashchange', function(){ partito = true; }); } catch(e){}
    try { history.back(); } catch(e){}
    setTimeout(function(){
      if (partito || !document.body.contains(el)) return;
      var n = document.createElement('span');
      n.setAttribute('style', 'font-size:.7em;font-weight:normal;color:#8A4A1E;margin-left:.3em;');
      n.textContent = 'usa «indietro» del telefono'; if (el.parentNode) el.parentNode.insertBefore(n, el.nextSibling);
    }, 1200);
  }
  // Solo dentro la pagina del libro: Kotobee mette la pagina dentro la sua schermata, che ha titoli e menu suoi.
  var radice = radiceDi(t.to) || (mk.length ? mk[mk.length - 1] : document.body);
  var id = (location.hash || '').replace(/^#/, '') || t.dest;
  var voce = trova(id, t.w, radice), bersaglio = null;
  if (voce && radice.contains && !radice.contains(voce)) voce = null;
  if (voce){
    var nn = voce.nodeName.toUpperCase();
    if (/^(DT|H1|H2|H3|H4)$/.test(nn)) bersaglio = voce;
    else if (nn === 'LI') bersaglio = voce.querySelector('strong') || voce;
    else if (/^(SECTION|ARTICLE|DIV)$/.test(nn)) bersaglio = voce.querySelector('h1,h2,h3,h4');
    else bersaglio = voce;
  }
  if (!bersaglio && radice.querySelector) bersaglio = radice.querySelector('h1, h2');
  // piccolo tasto rotondo con la sola freccia di ritorno
  var b = document.createElement('a');
  b.href = '#'; b.className = 'torna-freccia'; b.textContent = '↩';
  b.setAttribute('title', 'Torna a «' + (t.t || 'pagina precedente') + '»');
  b.setAttribute('aria-label', 'Torna a «' + (t.t || 'pagina precedente') + '»');
  b.setAttribute('style', 'display:inline-block;width:1.6em;height:1.6em;line-height:1.6em;text-align:center;margin-left:.35em;font-size:.85em;font-weight:bold;font-family:sans-serif;border:1.5px solid #2F7259;border-radius:50%;color:#2F7259;background:#fff;text-decoration:none;vertical-align:.15em;');
  b.addEventListener('click', function(ev){ ev.preventDefault(); if (ev.stopPropagation) ev.stopPropagation(); indietro(b); }, false);
  if (bersaglio){
    bersaglio.appendChild(b);
    var bg = bersaglio.style.backgroundColor;
    bersaglio.style.backgroundColor = '#FFF1B8';
    setTimeout(function(){ bersaglio.style.backgroundColor = bg; }, 4000);
    // il lettore a volte riporta la pagina in cima dopo averla aperta: si mira piu' volte
    [300, 900, 1800].forEach(function(ms){ setTimeout(function(){ try { bersaglio.scrollIntoView({ block: 'center' }); } catch(e){ try { bersaglio.scrollIntoView(); } catch(e2){} } }, ms); });
  } else {
    var riga = document.createElement('p'); riga.setAttribute('style', 'margin:.2em 0;');
    b.style.marginLeft = '0'; riga.appendChild(b);
    radice.insertBefore(riga, radice.firstChild);
  }
})();
(function(){
  var ORD = [0, 9, 5, 4, 2, 1, 8, 6, 7, 3], POS = [];
  for (var k = 0; k < ORD.length; k++) POS[ORD[k]] = k;
  function punti(vals, size){
    var c = size / 2, R = size / 2 - 38, out = [];
    for (var o = 0; o < ORD.length; o++){
      var i = ORD[o], a = -Math.PI / 2 + POS[i] * 2 * Math.PI / ORD.length;
      out.push((c + R * vals[i] / 5 * Math.cos(a)).toFixed(1) + ',' + (c + R * vals[i] / 5 * Math.sin(a)).toFixed(1));
    }
    return out.join(' ');
  }
  // confronto sotto i radar delle botaniche
  var gruppi = document.querySelectorAll('.sim');
  for (var g = 0; g < gruppi.length; g++) (function(p){
    var svg = gpId(p.getAttribute('data-r')); if (!svg) return;
    var poli = svg.querySelector('.ro'), size = parseFloat(svg.getAttribute('data-s')) || 220;
    var chips = p.querySelectorAll('.chip');
    // Il tasto acceso resta evidenziato (stile scritto sul tasto, perche' alcuni lettori ignorano il CSS dei pulsanti)
    // e sotto i radar compare il nome della botanica sovrapposta, cosi' si ritrova anche dopo una distrazione.
    var testi = [];
    for (var j0 = 0; j0 < chips.length; j0++) testi.push(chips[j0].textContent);
    var ss0 = gpId(p.getAttribute('data-r').replace(/^r-/, 's-'));
    function etichetta(dopo, id){
      var el = document.getElementById(id);
      if (!el && dopo){ el = document.createElement('p'); el.id = id; el.className = 'sovr-nome'; dopo.parentNode.insertBefore(el, dopo.nextSibling); }
      return el;
    }
    function mostraNome(nome){
      [[svg, 'n-' + svg.id], [ss0, 'n-' + (ss0 ? ss0.id : '')]].forEach(function(c){
        if (!c[0]) return; var el = etichetta(c[0], c[1]); if (!el) return;
        if (nome){ el.innerHTML = '<span style="display:inline-block;width:1.1em;height:.8em;border-radius:2px;background:rgba(192,115,58,0.22);border:2px dashed #C0733A;vertical-align:-.1em;margin-right:.4em"></span>In arancio: <strong style="color:#8A4A1E">' + nome + '</strong>'; el.style.display = ''; }
        else { el.innerHTML = ''; el.style.display = 'none'; }
      });
    }
    function stile(b, acceso){
      b.className = acceso ? 'chip on' : 'chip'; b.setAttribute('aria-pressed', acceso ? 'true' : 'false');
      // stesso colore e stesso tratteggio dell'area sovrapposta sul radar
      b.style.background = acceso ? 'rgba(192,115,58,0.22)' : ''; b.style.border = acceso ? '2px dashed #C0733A' : ''; b.style.color = acceso ? '#8A4A1E' : ''; b.style.fontWeight = acceso ? 'bold' : '';
    }
    for (var j = 0; j < chips.length; j++) chips[j].addEventListener('click', function(){
      var on = this.className.indexOf(' on') >= 0;
      for (var x = 0; x < chips.length; x++){ stile(chips[x], false); chips[x].textContent = testi[x]; }
      var ss = ss0, so = ss ? ss.querySelector('.ro') : null;
      if (on){ poli.setAttribute('points', ''); if (so) so.setAttribute('points', ''); mostraNome(''); return; }
      var k = Array.prototype.indexOf.call(chips, this);
      stile(this, true); this.textContent = '\u2713 ' + testi[k];
      mostraNome(testi[k].replace(/\s+\d+%$/, ''));
      poli.setAttribute('points', punti(this.getAttribute('data-v').split(',').map(parseFloat), size));
      var dv = this.getAttribute('data-s');
      if (so && dv){
        var sv = dv.split(',').map(parseFloat), n = sv.length, sz = parseFloat(ss.getAttribute('data-s')) || 220, c = sz / 2, R = sz / 2 - 38, out = [];
        for (var i = 0; i < n; i++){ var a = -Math.PI / 2 + i * 2 * Math.PI / n; out.push((c + R * sv[i] / 5 * Math.cos(a)).toFixed(1) + ',' + (c + R * sv[i] / 5 * Math.sin(a)).toFixed(1)); }
        so.setAttribute('points', out.join(' '));
      }
    });
  })(gruppi[g]);
  // matrice dei sentori
  var celle = document.querySelectorAll('.cella'), schede = document.querySelectorAll('article.sent');
  if (!schede.length) return;
  var filtro = { a: null, k: null }, q = gpId('mq'), conta = gpId('mconta');
  function applica(){
    var t = q ? q.value.toLowerCase().replace(/^\s+|\s+$/g, '') : '', n = 0;
    for (var i = 0; i < schede.length; i++){
      var s = schede[i], ok = (!filtro.a || (s.getAttribute('data-a') === filtro.a && s.getAttribute('data-k') === filtro.k)) &&
        (!t || s.textContent.toLowerCase().indexOf(t) >= 0);
      s.className = s.className.replace(' nascosto', '') + (ok ? '' : ' nascosto'); if (ok) n++;
    }
    for (var c = 0; c < celle.length; c++){
      var on = celle[c].getAttribute('data-a') === filtro.a && celle[c].getAttribute('data-k') === filtro.k;
      celle[c].className = celle[c].className.replace(' on', '') + (on ? ' on' : '');
    }
    var NS = {gusto:'Gusto', olfatto:'Olfatto', trigemino:'Trigemino', tatto:'Tatto'};
    if (conta) conta.textContent = n + (n === 1 ? ' sentore' : ' sentori') + ' su ' + schede.length + (filtro.a ? ' · ' + filtro.a + ' × ' + NS[filtro.k] : '');
  }
  for (var c = 0; c < celle.length; c++) celle[c].addEventListener('click', function(){
    var a = this.getAttribute('data-a'), k = this.getAttribute('data-k');
    if (filtro.a === a && filtro.k === k){ filtro.a = null; filtro.k = null; } else { filtro.a = a; filtro.k = k; }
    applica();
  });
  if (q) q.addEventListener('input', applica);
})();
(function(){
  // gioco: riconosci il gin
  var q = document.querySelectorAll('.quiz');
  for (var i = 0; i < q.length; i++) (function(art){
    var bs = art.querySelectorAll('.q-o'), es = art.querySelector('.esito'), fatto = false;
    for (var j = 0; j < bs.length; j++) bs[j].addEventListener('click', function(){
      if (fatto) return; fatto = true;
      for (var k = 0; k < bs.length; k++) if (bs[k].getAttribute('data-ok') === '1') bs[k].className += ' giusta';
      if (this.getAttribute('data-ok') !== '1'){ this.className += ' sbagliata'; es.textContent = 'No: la risposta giusta è in verde.'; }
      else es.textContent = 'Esatto!';
    });
  })(q[i]);
  if (q.length){ var s = document.querySelector('.soluzioni'); if (s){ s.className += ' nascosto'; var h = s.previousElementSibling; if (h) h.className += ' nascosto'; } }
  // calendario: un mese alla volta
  var mb = document.querySelectorAll('.cal-b'), ms = document.querySelectorAll('.cal-mese');
  if (mb.length){
    var mostra = function(m){
      for (var a = 0; a < ms.length; a++) ms[a].className = 'cal-mese' + (ms[a].getAttribute('data-m') === String(m) ? '' : ' nascosto');
      for (var b = 0; b < mb.length; b++) mb[b].className = 'chip cal-b' + (mb[b].getAttribute('data-m') === String(m) ? ' on' : '');
    };
    // I tasti sono link alla sezione del mese: funzionano anche senza JavaScript.
    // Con JavaScript, in piu', resta visibile solo il mese scelto e la pagina ci arriva.
    for (var c = 0; c < mb.length; c++) mb[c].addEventListener('click', function(ev){
      mostra(this.getAttribute('data-m'));
      var t = gpId('mese-' + this.getAttribute('data-m'));
      if (t && t.scrollIntoView){ if (ev && ev.preventDefault) ev.preventDefault(); try { t.scrollIntoView(true); } catch(e){ location.hash = 'mese-' + this.getAttribute('data-m'); } }
    });
    mostra(new Date().getMonth());
  }
})();

(function(){
  // potenza personale per botanica, ricordata dal lettore
  var SC = ['#3B4CC0','#3E7FD9','#3FB0D6','#4CC79A','#8CD15A','#D9D93E','#F5B83A','#F28A2E','#E0492B','#A3195B'];
  function col(p){
    p = Math.max(1, Math.min(10, p)); var i = Math.floor(p) - 1, f = p - Math.floor(p);
    if (i >= 9 || f < 0.01) return SC[Math.min(9, Math.round(p) - 1)];
    var h = function(x){ return [parseInt(x.substr(1,2),16), parseInt(x.substr(3,2),16), parseInt(x.substr(5,2),16)]; }, a = h(SC[i]), b = h(SC[i+1]), o = '#';
    for (var k = 0; k < 3; k++){ var v = Math.round(a[k] + (b[k] - a[k]) * f).toString(16); o += v.length < 2 ? '0' + v : v; }
    return o;
  }
  var KEY = 'gb-libro-potenza', mem = {};
  try { mem = JSON.parse(localStorage.getItem(KEY)) || {}; } catch(e){ mem = {}; }
  function salva(){ try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch(e){} }
  var fmt = function(p){ return String(p).replace('.', ','); };
  var box = document.querySelectorAll('.bot-radar[data-p]');
  for (var b = 0; b < box.length; b++) (function(bx){
    var lib = parseFloat(bx.getAttribute('data-p')); if (!lib) return;
    var n = bx.getAttribute('data-n'), ctl = bx.querySelector('.pot-tua'); if (!ctl) return;
    ctl.className = ctl.className.replace(' solo-js', '');
    var inp = ctl.querySelector('input'), pv = ctl.querySelector('.pv'), pst = ctl.querySelector('.pst');
    var pol = bx.querySelector('.rp'), mk = bx.querySelector('.pmk'), tx = bx.querySelector('.ptx');
    function mostra(p, pers){
      var c = col(p); if (pol){ pol.setAttribute('fill', c); pol.setAttribute('stroke', c); }
      try { inp.style.setProperty('--pc', c); inp.style.accentColor = c; } catch(e){}
      if (mk) mk.setAttribute('x', (20 + (p - 1) / 9 * 239 - 1.5).toFixed(1));
      if (tx) tx.textContent = 'Potenza ' + fmt(p) + '/10' + (pers ? ' (tua)' : '');
      pv.textContent = fmt(p); pst.textContent = pers ? 'personalizzata · libreria ' + fmt(lib) : 'valore di libreria';
    }
    var p0 = mem[n] ? mem[n] : lib; inp.value = p0; mostra(p0, !!mem[n]);
    inp.addEventListener('input', function(){ mostra(parseFloat(inp.value), !!mem[n]); });
    ctl.querySelector('.pfix').addEventListener('click', function(){
      var p = parseFloat(inp.value); if (p === lib) delete mem[n]; else mem[n] = p; salva(); mostra(p, !!mem[n]);
    });
    ctl.querySelector('.prip').addEventListener('click', function(){ delete mem[n]; salva(); inp.value = lib; mostra(lib, false); });
  })(box[b]);
})();
