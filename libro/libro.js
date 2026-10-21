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
  for (var z = 0; z < links.length; z++){
    var lz = links[z];
    if (!gpId(lz.getAttribute('data-d') || '')) continue;
    lz.setAttribute('data-href', lz.getAttribute('href') || ''); lz.removeAttribute('href');
    lz.setAttribute('role', 'button'); lz.setAttribute('tabindex', '0');
    // senza href il lettore non lo colora piu' da collegamento: colore e puntini scritti sulla parola stessa
    lz.setAttribute('style', 'cursor:pointer;color:#B5651D;text-decoration:none;border-bottom:1.5px dotted #B5651D;');
  }
  for (var i = 0; i < links.length; i++) links[i].addEventListener('click', function(ev){
    var def = gpId(this.getAttribute('data-d') || ''); if (!def) return;
    ev.preventDefault();
    if (daLink === this){ chiudi(); return; }
    chiudi();
    var a = this, sigla = a.className.indexOf('sigla') >= 0;
    var box = document.createElement('div');
    box.className = 'def-pop';
    box.setAttribute('style', 'margin:.4em 0 .8em;padding:.6em .8em;border-left:4px solid #2F7259;background:#EEF4EF;border-radius:6px;font-size:.95em;');
    box.innerHTML = def.innerHTML + '<p style="margin:.4em 0 0;text-align:right"><a href="#" class="def-x">Chiudi ✕</a></p>';
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
  if (!t || !(t.to === PAGINA || radiceDi(t.to)) || Date.now() - (t.ts || 0) > 30 * 60 * 1000) return;
  pila.pop(); scrivi(pila);
  // La parola d'arrivo (voce del glossario, sigla, titolo della botanica o della sezione) si accende
  // e diventa il tasto di ritorno, con una piccola freccia ↩: niente pulsanti grandi sopra i titoli.
  function indietro(el){
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
    // Profilo principale acceso o spento: quando le due botaniche quasi coincidono, il tratteggio arancio
    // si confonde con il contorno della principale; spegnendola resta solo la botanica sovrapposta.
    // Si usa l'attributo visibility (non il CSS), perche' alcuni lettori ignorano il CSS sugli SVG.
    var principaleSpenta = false;
    function principale(spenta){
      principaleSpenta = spenta;
      [svg, ss0].forEach(function(s){ if (!s) return; var rp = s.querySelector('.rp'); if (rp) rp.setAttribute('visibility', spenta ? 'hidden' : 'visible'); });
      [svg, ss0].forEach(function(s){ if (!s) return; var el = document.getElementById('n-' + s.id), bt = el ? el.querySelector('.rp-tasto') : null;
        if (bt) bt.textContent = spenta ? 'Mostra il profilo principale' : 'Nascondi il profilo principale'; });
    }
    function mostraNome(nome){
      [[svg, 'n-' + svg.id], [ss0, 'n-' + (ss0 ? ss0.id : '')]].forEach(function(c){
        if (!c[0]) return; var el = etichetta(c[0], c[1]); if (!el) return;
        if (nome){
          el.innerHTML = '<span style="display:inline-block;width:1.1em;height:.8em;border-radius:2px;background:rgba(192,115,58,0.22);border:2px dashed #C0733A;vertical-align:-.1em;margin-right:.4em"></span>In arancio: <strong style="color:#8A4A1E">' + nome + '</strong> ' +
            '<button type="button" class="rp-tasto" style="font:inherit;font-size:.85em;margin-left:.4em;padding:.15em .6em;border:1px solid #999;border-radius:6px;background:#f6f3ec;color:#222;cursor:pointer">' + (principaleSpenta ? 'Mostra il profilo principale' : 'Nascondi il profilo principale') + '</button>';
          el.style.display = '';
          var bt = el.querySelector('.rp-tasto'); if (bt) bt.addEventListener('click', function(){ principale(!principaleSpenta); });
        }
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
      if (on){ poli.setAttribute('points', ''); if (so) so.setAttribute('points', ''); mostraNome(''); principale(false); return; }
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
      else if (so) so.setAttribute('points', '');   // senza sensazioni (es. buccia disidratata stimata): niente profilo vecchio sovrapposto
    });
  })(gruppi[g]);
  // matrice dei sentori: la casella scelta resta evidenziata (stile scritto sul tasto, perche' alcuni lettori
  // ignorano il CSS dei pulsanti) e sotto la griglia compare l'elenco dei sentori di quell'incrocio, con i nomi
  // che portano alla scheda. Prima si vedeva solo cambiare il conteggio, senza capire a che cosa si riferiva.
  var celle = document.querySelectorAll('.cella'), schede = document.querySelectorAll('article.sent');
  if (!schede.length) return;
  var filtro = { a: null, k: null }, q = gpId('mq'), conta = gpId('mconta'), sel = gpId('msel');
  var NS = {gusto:'Gusto', olfatto:'Olfatto', trigemino:'Trigemino', tatto:'Tatto'};
  var SPIEGA = {gusto:'sentite dalla lingua', olfatto:'sentite dal naso, anche da dietro mentre si deglutisce', trigemino:'sentite dai nervi della bocca come caldo, fresco o pizzicore', tatto:'sentite dalla bocca come attrito, secchezza o formicolio'};
  var COL = {gusto:'#C0583E', olfatto:'#4C7BB5', trigemino:'#B8921F', tatto:'#5D6F8C'};
  function vai(id){ var el = gpId(id); if (!el) return; try { el.scrollIntoView({ block: 'start', behavior: 'smooth' }); } catch(e){ try { el.scrollIntoView(); } catch(e2){} } }
  function elenco(visibili, t){
    if (!sel) return;
    var h = '';
    if (filtro.a) h += '<p><strong style="color:' + COL[filtro.k] + '">' + filtro.a + ' \u00d7 ' + NS[filtro.k] + '</strong>: note \u00ab' + filtro.a.toLowerCase() + '\u00bb ' + SPIEGA[filtro.k] + '. ' + (visibili.length === 1 ? 'Una scheda' : visibili.length + ' schede') + ':</p>';
    else if (t) h += '<p><strong>\u00ab' + t + '\u00bb</strong> compare in ' + (visibili.length === 1 ? 'una scheda' : visibili.length + ' schede') + ':</p>';
    else { sel.innerHTML = '<p class="nota">Nessuna casella scelta: sotto ci sono tutte le schede.</p>'; return; }
    h += '<ul class="msel-lista">';
    for (var i = 0; i < visibili.length; i++){
      var s = visibili[i], b = s.getAttribute('data-b') || '';
      h += '<li><button type="button" class="msel-vai" data-id="' + s.id + '" style="font:inherit;background:none;border:0;padding:0;color:#2F7259;text-decoration:underline;cursor:pointer;text-align:left">' + s.getAttribute('data-t') + '</button>' + (b ? ' <span class="nota">(' + b + (b.split(',').length >= 3 ? '\u2026' : '') + ')</span>' : '') + '</li>';
    }
    h += '</ul><p><button type="button" class="msel-tutti" style="font:inherit;font-size:.85em;padding:.3em .8em;border:1px solid #999;border-radius:6px;background:#f6f3ec;cursor:pointer">Mostra di nuovo tutte le schede</button></p>';
    sel.innerHTML = h;
    var bs = sel.querySelectorAll('.msel-vai');
    for (var k = 0; k < bs.length; k++) bs[k].addEventListener('click', function(){ vai(this.getAttribute('data-id')); });
    var tutti = sel.querySelector('.msel-tutti');
    if (tutti) tutti.addEventListener('click', function(){ filtro.a = null; filtro.k = null; if (q) q.value = ''; applica(); });
  }
  function applica(){
    var t = q ? q.value.toLowerCase().replace(/^\s+|\s+$/g, '') : '', vis = [];
    for (var i = 0; i < schede.length; i++){
      var s = schede[i], ok = (!filtro.a || (s.getAttribute('data-a') === filtro.a && s.getAttribute('data-k') === filtro.k)) &&
        (!t || s.textContent.toLowerCase().indexOf(t) >= 0);
      s.className = s.className.replace(' nascosto', '') + (ok ? '' : ' nascosto'); if (ok) vis.push(s);
    }
    for (var c = 0; c < celle.length; c++){
      var on = celle[c].getAttribute('data-a') === filtro.a && celle[c].getAttribute('data-k') === filtro.k, kk = celle[c].getAttribute('data-k');
      celle[c].className = celle[c].className.replace(' on', '') + (on ? ' on' : '');
      celle[c].style.background = on ? COL[kk] : ''; celle[c].style.color = on ? '#fff' : ''; celle[c].style.boxShadow = on ? '0 0 0 3px #222' : '';
    }
    if (conta) conta.textContent = (filtro.a || t) ? 'Schede mostrate qui sotto: ' + vis.length + ' su ' + schede.length : 'Tutte le ' + schede.length + ' schede';
    elenco(vis, t);
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
// Schede delle botaniche: un radar alla volta (gusto e aroma / sensazioni in bocca) e, negli agrumi,
// buccia fresca, disidratata o entrambe sullo stesso radar. Lo stile del tasto acceso e' scritto sul tasto
// e la visibilita' dei poligoni con l'attributo, perche' alcuni lettori ignorano il CSS di pulsanti e SVG.
(function(){
  function accendi(bts, k){
    for (var i = 0; i < bts.length; i++){
      var on = bts[i].getAttribute('data-k') === k;
      bts[i].setAttribute('aria-pressed', on ? 'true' : 'false');
      bts[i].style.background = on ? '#2F7259' : ''; bts[i].style.color = on ? '#ffffff' : ''; bts[i].style.fontWeight = on ? 'bold' : '';
    }
  }
  var art = document.querySelectorAll('article.bot');
  for (var a = 0; a < art.length; a++) (function(ar){
    var vs = ar.querySelector('.vista-sel'), viste = ar.querySelectorAll('.vista');
    if (vs && viste.length > 1){
      vs.className = vs.className.replace(' solo-js', '');
      var tit = ar.querySelectorAll('.vista-tit'); for (var t = 0; t < tit.length; t++) tit[t].style.display = 'none';
      var vb = vs.querySelectorAll('button');
      var mostra = function(k){ accendi(vb, k); for (var v = 0; v < viste.length; v++) viste[v].style.display = viste[v].getAttribute('data-k') === k ? '' : 'none'; };
      for (var j = 0; j < vb.length; j++) vb[j].addEventListener('click', function(){ mostra(this.getAttribute('data-k')); });
      mostra('g');
    }
    var bs = ar.querySelector('.buccia-sel'), rp = ar.querySelector('.bot-radar .rp'), rb = ar.querySelector('.bot-radar .rb'), nota = ar.querySelector('.buccia-nota');
    if (bs && rp && rb){
      bs.className = bs.className.replace(' solo-js', '');
      var proprio = bs.getAttribute('data-p'), bb = bs.querySelectorAll('button');
      var buccia = function(k){
        accendi(bb, k);
        var vedoP = k === 'entrambe' || k === proprio, vedoB = k === 'entrambe' || k !== proprio;
        rp.setAttribute('visibility', vedoP ? 'visible' : 'hidden'); rb.setAttribute('visibility', vedoB ? 'visible' : 'hidden');
        // l'altra buccia ha lo stesso stile tratteggiato anche quando e' sola: la nota la spiega
        if (nota) nota.style.display = vedoB ? '' : 'none';
      };
      for (var q = 0; q < bb.length; q++) bb[q].addEventListener('click', function(){ buccia(this.getAttribute('data-k')); });
      buccia(proprio);
    }
  })(art[a]);
})();
// ---------- Prova le proporzioni: cursori, striscia, radar unico ----------
// Alcuni lettori eseguono lo script prima che la pagina sia completa: si parte quando il documento e' pronto.
(function avvio(){
  if (document.readyState === 'loading'){ document.addEventListener('DOMContentLoaded', avvio); return; }
  var box = document.getElementById('ppl'); if (!box) return;
  var D; try { D = JSON.parse(box.getAttribute('data-v')); } catch(e){ return; }
  var NS = 'http://www.w3.org/2000/svg';
  var GR = [
    { t:'Sapori', c:'#C0583E', a:[[0,'Dolce'],[2,'Acido'],[3,'Salino'],[1,'Amaro']] },
    { t:'Sentori', c:'#4C7BB5', a:[[4,'Agrumato'],[5,'Floreale'],[9,'Fruttato'],[6,'Erbaceo'],[8,'Resinoso'],[7,'Speziato']] },
    { t:'Sensazioni', c:'#B8921F', a:[[0,'Pungente'],[1,'Rinfrescante'],[2,'Astringente'],[3,'Corpo'],[4,'Persistenza']] }
  ];
  var ASSI = []; GR.forEach(function(g, gi){ g.a.forEach(function(x){ ASSI.push({ g: gi, i: x[0], nm: x[1] }); }); });
  var stili = Object.keys(D.stili); if (!stili.length) return;
  var st = { nome: stili[0], righe: [], rif: [], q: [], fermo: {}, vista: 'gusto' };
  function f1(x){ return (x >= 10 ? Math.round(x) : Math.round(x * 10) / 10).toString().replace('.', ','); }
  function aPos(q){ return Math.round(Math.sqrt(Math.max(0, q) / 100) * 1000); }
  function daPos(p){ return Math.pow(p / 1000, 2) * 100; }
  function profilo(q){
    var v = [], tot = 0, k, i; for (i = 0; i < 10; i++) v.push(0);
    for (k = 0; k < st.righe.length; k++){ var p = D.P[st.righe[k].n]; if (!p) continue; tot += q[k]; for (i = 0; i < 10; i++) v[i] += (p[i] || 0) * q[k]; }
    return v.map(function(x){ return tot ? x / tot : 0; });
  }
  function sens(q){ // media quadratica pesata, come nell'app
    var v = [0,0,0,0,0], tot = 0, k, i;
    for (k = 0; k < st.righe.length; k++){ var s = D.S[st.righe[k].n]; if (!s) continue; tot += q[k]; for (i = 0; i < 5; i++) v[i] += (s[i] || 0) * (s[i] || 0) * q[k]; }
    return v.map(function(x){ return tot ? Math.round(Math.sqrt(x / tot) * 10) / 10 : 0; });
  }
  function unici(pr, se, mx){ return ASSI.map(function(x){ return x.g < 2 ? (mx ? pr[x.i] / mx * 5 : 0) : se[x.i]; }); }
  function el(tag, at){ var e = document.createElementNS(NS, tag); for (var k in at) e.setAttribute(k, at[k]); return e; }
  function radar(prima, ora, gruppi){
    var AA = ASSI.filter(function(x){ return gruppi.indexOf(x.g) >= 0; }), GG = gruppi.map(function(i){ return GR[i]; });
    var n = AA.length, W = 360, H = 330, cx = W / 2, cy = H / 2 + 6, R = 112, svg = el('svg', { viewBox: '-30 -8 ' + (W + 60) + ' ' + (H + 16), 'class': 'pp-radar', role: 'img' });
    function ang(k){ return -Math.PI / 2 + k * 2 * Math.PI / n; }
    function pt(k, v){ return [cx + R * v / 5 * Math.cos(ang(k)), cy + R * v / 5 * Math.sin(ang(k))]; }
    var k0 = 0;
    if (GG.length > 1) GG.forEach(function(gr){
      var k1 = k0 + gr.a.length, a0 = ang(k0 - 0.5), a1 = ang(k1 - 0.5), big = (a1 - a0) > Math.PI ? 1 : 0;
      svg.appendChild(el('path', { d: 'M ' + cx + ' ' + cy + ' L ' + (cx + R * Math.cos(a0)) + ' ' + (cy + R * Math.sin(a0)) + ' A ' + R + ' ' + R + ' 0 ' + big + ' 1 ' + (cx + R * Math.cos(a1)) + ' ' + (cy + R * Math.sin(a1)) + ' Z', fill: gr.c, 'fill-opacity': '0.10' }));
      k0 = k1;
    });
    for (var l = 1; l <= 5; l++) svg.appendChild(el('polygon', { points: AA.map(function(_, k){ return pt(k, l).join(','); }).join(' '), fill: 'none', stroke: '#d8d2c6', 'stroke-width': '1' }));
    AA.forEach(function(x, k){
      var e5 = pt(k, 5), lb = pt(k, 5.55), anc = Math.abs(lb[0] - cx) < 8 ? 'middle' : (lb[0] > cx ? 'start' : 'end');
      svg.appendChild(el('line', { x1: cx, y1: cy, x2: e5[0], y2: e5[1], stroke: '#d8d2c6', 'stroke-width': '1' }));
      var t = el('text', { x: lb[0].toFixed(1), y: (lb[1] + 4).toFixed(1), 'text-anchor': anc, 'font-size': '11', 'font-weight': 'bold', 'font-family': 'sans-serif', fill: GR[x.g].c }); t.textContent = x.nm; svg.appendChild(t);
    });
    function poly(v){ return v.map(function(y, k){ return pt(k, y).map(function(z){ return z.toFixed(1); }).join(','); }).join(' '); }
    svg.appendChild(el('polygon', { points: poly(prima), fill: 'none', stroke: '#777777', 'stroke-width': '1.5', 'stroke-dasharray': '4 3' }));
    svg.appendChild(el('polygon', { points: poly(ora), fill: '#2F7259', 'fill-opacity': '0.28', stroke: '#2F7259', 'stroke-width': '2', 'stroke-linejoin': 'round' }));
    ora.forEach(function(y, k){ if (y > 0){ var c = pt(k, y); svg.appendChild(el('circle', { cx: c[0].toFixed(1), cy: c[1].toFixed(1), r: '2.6', fill: GR[AA[k].g].c })); } });
    return svg;
  }
  var testa, striscia, rbox, cambia, ginepro, cursori, leg, vb;
  function costruisci(){
    box.innerHTML = '';
    var sc = document.createElement('div'); sc.className = 'pp-stili';
    stili.forEach(function(nm){ var b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (nm === st.nome ? ' on' : ''); b.textContent = nm;
      b.addEventListener('click', function(){ carica(nm); }); sc.appendChild(b); });
    box.appendChild(sc);
    testa = document.createElement('div'); testa.className = 'pp-testa';
    striscia = document.createElement('div'); striscia.className = 'pp-striscia';
    rbox = document.createElement('div'); rbox.className = 'pp-rbox';
    vb = document.createElement('div'); vb.className = 'pp-vista';
    [['gusto','Sapori e sentori'],['sens','Sensazioni in bocca']].forEach(function(v){
      var b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.setAttribute('data-v', v[0]); b.textContent = v[1];
      b.addEventListener('click', function(){ st.vista = v[0]; aggiorna(); }); vb.appendChild(b); });
    leg = document.createElement('div'); leg.className = 'pp-leg';
    cambia = document.createElement('div'); cambia.className = 'pp-cambia';
    ginepro = document.createElement('div'); ginepro.className = 'pp-ginepro';
    testa.appendChild(striscia); testa.appendChild(vb); testa.appendChild(rbox); testa.appendChild(leg); testa.appendChild(cambia); testa.appendChild(ginepro);
    box.appendChild(testa);
    var az = document.createElement('p'); az.className = 'pp-az';
    var rs = document.createElement('button'); rs.type = 'button'; rs.className = 'chip'; rs.textContent = '↺ Quote di partenza';
    rs.addEventListener('click', function(){ st.q = st.rif.slice(); st.fermo = {}; disegnaCursori(); aggiorna(); });
    az.appendChild(rs); box.appendChild(az);
    cursori = document.createElement('div'); box.appendChild(cursori);
  }
  function carica(nm){
    st.nome = nm; st.righe = D.stili[nm].map(function(r, k){ return { n: r[0], tr: r[2], col: r[0] === 'Bacche di ginepro' ? '#2F7259' : D.col[(k + 1) % D.col.length] }; });
    st.rif = D.stili[nm].map(function(r){ return r[1]; }); st.q = st.rif.slice(); st.fermo = {};
    var bb = box.querySelectorAll('.pp-stili .chip'); for (var i = 0; i < bb.length; i++) bb[i].className = 'chip' + (bb[i].textContent === nm ? ' on' : '');
    disegnaCursori(); aggiorna();
  }
  function imposta(i, q){
    var k, sommaF = 0, liberi = [], sommaL = 0;
    for (k = 0; k < st.q.length; k++){ if (k === i) continue; if (st.fermo[k]) sommaF += st.q[k]; else { liberi.push(k); sommaL += st.q[k]; } }
    q = Math.max(0, Math.min(q, 100 - sommaF));
    if (!liberi.length) q = 100 - sommaF;
    var resto = 100 - sommaF - q;
    liberi.forEach(function(k){ st.q[k] = sommaL > 0 ? st.q[k] * resto / sommaL : resto / liberi.length; });
    st.q[i] = q;
  }
  function disegnaCursori(){
    cursori.innerHTML = '';
    st.righe.forEach(function(r, k){
      var row = document.createElement('div'); row.className = 'pp-riga'; row.setAttribute('data-k', k);
      row.innerHTML = '<span class="pp-dot" style="background:' + r.col + '"></span><span class="pp-nome">' + r.n + (r.tr ? ' <em>(tracce)</em>' : '') +
        '<small>partenza ' + f1(st.rif[k]) + '%</small></span><span class="pp-val"></span>';
      var lk = document.createElement('button'); lk.type = 'button'; lk.className = 'pp-lock'; lk.textContent = st.fermo[k] ? '🔒' : '🔓';
      lk.addEventListener('click', function(){ if (st.fermo[k]) delete st.fermo[k]; else st.fermo[k] = 1; disegnaCursori(); aggiorna(); });
      row.appendChild(lk);
      var rg = document.createElement('input'); rg.type = 'range'; rg.min = '0'; rg.max = '1000'; rg.step = '1'; rg.value = aPos(st.q[k]);
      rg.className = 'pp-range'; rg.setAttribute('style', 'accent-color:' + r.col);
      if (st.fermo[k]) rg.disabled = true;
      rg.addEventListener('input', function(){ imposta(k, daPos(+this.value)); aggiorna(this); });
      row.appendChild(rg); cursori.appendChild(row);
    });
  }
  function aggiorna(attivo){
    var righe = cursori.querySelectorAll('.pp-riga');
    for (var k = 0; k < righe.length; k++){
      righe[k].querySelector('.pp-val').textContent = f1(st.q[k]) + '%';
      var rg = righe[k].querySelector('input'); if (rg !== attivo) rg.value = aPos(st.q[k]);
    }
    striscia.innerHTML = st.righe.map(function(r, k){ return st.q[k] > 0.05 ? '<span style="width:' + st.q[k] + '%;background:' + r.col + '"></span>' : ''; }).join('');
    var p0 = profilo(st.rif), p1 = profilo(st.q), mx = Math.max.apply(null, p0.concat(p1)) || 1;
    var u0 = unici(p0, sens(st.rif), mx), u1 = unici(p1, sens(st.q), mx);
    var gr = st.vista === 'sens' ? [2] : [0, 1];
    function sel(a){ return a.filter(function(_, k){ return gr.indexOf(ASSI[k].g) >= 0; }); }
    var vv = vb.querySelectorAll('.chip'); for (var z = 0; z < vv.length; z++) vv[z].className = 'chip' + (vv[z].getAttribute('data-v') === st.vista ? ' on' : '');
    rbox.innerHTML = ''; rbox.appendChild(radar(sel(u0), sel(u1), gr));
    leg.innerHTML = gr.map(function(i){ var g = GR[i]; return '<span><span class="pp-q" style="background:' + g.c + '"></span>' + g.t + '</span>'; }).join('') + '<span><span class="pp-q pp-tr"></span>partenza</span>';
    var d = ASSI.map(function(x, k){ return { g: x.g, nm: x.nm.toLowerCase(), d: u1[k] - u0[k] }; }).filter(function(x){ return gr.indexOf(x.g) >= 0 && Math.abs(x.d) >= 0.25; });
    var su = d.filter(function(x){ return x.d > 0; }).sort(function(a, b){ return b.d - a.d; }).slice(0, 4);
    var giu = d.filter(function(x){ return x.d < 0; }).sort(function(a, b){ return a.d - b.d; }).slice(0, 4);
    function f(x){ return x.nm + ' ' + (x.d > 0 ? '+' : '−') + f1(Math.abs(x.d)); }
    cambia.innerHTML = !d.length ? 'Profilo come la ricetta di partenza.' :
      (su.length ? '<span style="color:#2e7d32;font-weight:bold">▲ ' + su.map(f).join(', ') + '</span>' : '') + (su.length && giu.length ? ' · ' : '') +
      (giu.length ? '<span style="color:#c62828;font-weight:bold">▼ ' + giu.map(f).join(', ') + '</span>' : '');
    var gi = -1; st.righe.forEach(function(r, k){ if (r.n === 'Bacche di ginepro') gi = k; });
    var pg = gi >= 0 ? st.q[gi] : 0, col = pg >= 45 ? '#2e7d32' : (pg >= 30 ? '#b26a00' : '#c62828');
    ginepro.innerHTML = '<span style="color:' + col + ';font-weight:bold">Ginepro ' + f1(pg) + '%</span>' + (pg < 30 ? ' · troppo poco: il ginepro deve restare la nota prevalente' : (pg < 45 ? ' · al limite' : ''));
  }
  costruisci(); carica(st.nome);
})();
// ---------- Alcolometria con la temperatura (formula internazionale OIML R22) ----------
// Densita' di alcol e acqua in funzione della frazione in peso p (0-1) e della temperatura t (°C).
// Il grado alcolico (% vol) e' sempre riferito a 20 °C; l'alcolometro di vetro, usato a un'altra temperatura,
// segna un grado apparente che si converte con le stesse densita' (dilatazione del vetro 25e-6 per °C).
var OIML_C = [
  [1.285617841998974e3,-3.903285426e4],
  [7.442971530188783,-7.420201433430137e3,2.234460334e5],
  [-5.411227621436812e-1,-4.414153236817392e1,1.852373922069467e4,-5.478461354e5],
  [2.458043105903461,1.080435942856230e2,-2.605562982188164e4,7.470172998e5],
  [-4.672147440794683,-1.422753946421155e2,2.248646550400788e4,-6.138381234e5],
  [4.810060584300675,1.096355666577570e2,-1.210164659068747e4,3.062874042e5],
  [-2.895696483903638,-5.029988758547014e1,3.924090430035045e3,-8.829278388e4],
  [-1.515784836987210e-6,1.022992966719220,1.353034988843029e1,-7.047478054272792e2,1.352215441e4],
  [6.515031360099368e-6,-2.002561813734156e-1,-2.170575700536993,7.196353469546523e1,-1.668103923e3],
  [1.345612883493354e-8,-8.763058573471110e-6,1.876837790289664e-2,2.517399633803461e-1,-1.046914743455169e1,3.891238958e2],
  [-2.788074354782409e-8,4.075376675622027e-6,-6.802995733503803e-4,-1.193013005057010e-2,1.693433461530087e-1,-1.929769495e2],
  [-9.9739231e-11,7.1693540e-9,-3.8957702e-7,3.6130013e-5,-5.2682542e-3,-2.0618513e-1,9.982012300e2]
];
function oimlPoli(c, v){ var a = 0; for (var i = 0; i < c.length; i++) a = a * v + c[i]; return a; }
function oimlRho(p, t){ var r = []; for (var i = 0; i < OIML_C.length; i++) r.push(oimlPoli(OIML_C[i], t - 20)); return oimlPoli(r, p) / 1000; } // g/ml
function oimlCerca(f, y, sale){ var lo = 0, hi = 1; for (var k = 0; k < 60; k++){ var m = (lo + hi) / 2; if ((f(m) < y) === sale) lo = m; else hi = m; } return (lo + hi) / 2; }
function oimlAbv(p){ return 100 * p * oimlRho(p, 20) / oimlRho(1, 20); }                 // % vol a 20 °C
function oimlP(abv){ return oimlCerca(oimlAbv, abv, true); }                             // frazione in peso
var OIML_VETRO = 25e-6;
// grado che segna l'alcolometro alla temperatura t per un liquido che a 20 °C ha il grado abv20
function oimlLettura(abv20, t){
  var ra = oimlRho(oimlP(abv20), t) * (1 + OIML_VETRO * (t - 20));
  return oimlAbv(oimlCerca(function(p){ return oimlRho(p, 20); }, ra, false));
}
// grado reale a 20 °C a partire da quanto segna l'alcolometro alla temperatura t
function oimlReale(lettura, t){
  var ra = oimlRho(oimlP(lettura), 20);
  return oimlAbv(oimlCerca(function(p){ return oimlRho(p, t) * (1 + OIML_VETRO * (t - 20)); }, ra, false));
}
// Diluizione alla temperatura della soluzione. o = { da, a, t, vol, q, unita ('g'|'ml'), letto }
// da/a: gradi alcolici (a e' il grado reale voluto, a 20 °C); letto = il grado di partenza e' una lettura dell'alcolometro a t.
function diluizioneT(o){
  var t = o.t, x = o.letto ? oimlReale(o.da, t) : o.da, px = oimlP(x), py = oimlP(o.a);
  var Ms, M;
  if (o.q > 0){ Ms = o.unita === 'ml' ? o.q * oimlRho(px, t) : o.q; M = Ms * px / py; }
  else { M = o.vol * oimlRho(py, t); Ms = M * py / px; }
  var Mw = Math.max(0, M - Ms);
  return { reale: x, alcG: Ms, alcMl: Ms / oimlRho(px, t), acquaG: Mw, acquaMl: Mw / oimlRho(0, t), massaG: M,
           volMl: M / oimlRho(py, t), letturaFin: oimlLettura(o.a, t), letturaIni: oimlLettura(x, t) };
}
// ---------- Calcolatore della diluizione, con la temperatura della soluzione ----------
(function avvioDil(){
  if (document.readyState === 'loading'){ document.addEventListener('DOMContentLoaded', avvioDil); return; }
  var box = gpId('dil'); if (!box) return;
  function nf(x){ return (Math.round(x * 10) / 10).toLocaleString('it-IT'); }
  box.innerHTML = '<div class="dil-campi">' +
    '<label>Grado di partenza (°)<input type="number" id="dil-da" value="96" step="0.1"/></label>' +
    '<label>Grado desiderato (°)<input type="number" id="dil-a" value="40" step="0.1"/></label>' +
    '<label id="dil-vol-l">Volume finale (ml)<input type="number" id="dil-vol" value="100" step="1"/></label>' +
    '<label>Temperatura della soluzione (°C)<input type="number" id="dil-t" value="20" step="0.5"/></label></div>' +
    '<p class="dil-chk"><input type="checkbox" id="dil-letto"/> Il grado di partenza l\'ho letto con l\'alcolometro a questa temperatura (non è quello dell\'etichetta)</p>' +
    '<div class="dil-campi"><label>Oppure: alcol che ho già, a grado di partenza<span class="dil-q"><input type="number" id="dil-disp" placeholder="quantità" step="0.1" min="0"/>' +
    '<select id="dil-u"><option value="g">gr</option><option value="ml">ml</option></select></span></label></div>' +
    '<p class="nota">Se scrivi la quantità di alcol che possiedi, il volume finale non conta: il calcolatore dice quanta acqua aggiungere e il volume massimo che ottieni.</p>' +
    '<div class="dil-ris" id="dil-ris"></div>';
  var da = gpId('dil-da'), a = gpId('dil-a'), vol = gpId('dil-vol'), te = gpId('dil-t'), le = gpId('dil-letto'), disp = gpId('dil-disp'), u = gpId('dil-u'), ris = gpId('dil-ris'), volL = gpId('dil-vol-l');
  function calcola(){
    var x = parseFloat(da.value), y = parseFloat(a.value), v = parseFloat(vol.value), q = parseFloat(disp.value), haQ = q > 0, t = parseFloat(te.value);
    if (isNaN(t)) t = 20;
    volL.className = haQ ? 'dil-off' : '';
    if (!x || !y || (!v && !haQ)){ ris.innerHTML = '<p>Inserisci valori validi.</p>'; return; }
    if (x > 100){ ris.innerHTML = '<p>Il grado di partenza non può superare 100°.</p>'; return; }
    if (t < 0 || t > 40){ ris.innerHTML = '<p>La temperatura deve stare fra 0 e 40 °C.</p>'; return; }
    var d = diluizioneT({ da: x, a: y, t: t, vol: v, q: haQ ? q : 0, unita: u.value, letto: le.checked });
    var a20 = Math.abs(t - 20) < 0.05, X = nf(d.reale);
    if (y > d.reale + 1e-9){ ris.innerHTML = '<p>Il grado desiderato non può superare quello di partenza' + (le.checked && !a20 ? ' (reale a 20 °C: ' + X + '°)' : '') + '.</p>'; return; }
    var h = '';
    if (le.checked && !a20) h += '<p><strong>Grado reale dell\'alcol di partenza:</strong> l\'alcolometro segna ' + x + '° a ' + nf(t) + ' °C, cioè ' + X + '° a 20 °C</p>';
    if (haQ){
      h += '<p><strong>Alcol a ' + X + '° che hai:</strong> ' + nf(d.alcG) + ' gr · ' + nf(d.alcMl) + ' ml</p>' +
        '<p><strong>Acqua demineralizzata da aggiungere:</strong> ' + nf(d.acquaG) + ' gr · ' + nf(d.acquaMl) + ' ml</p>' +
        '<p>→ <strong>volume massimo ottenibile: ' + nf(d.volMl) + ' ml a ' + y + '°</strong> · peso totale ' + nf(d.massaG) + ' gr</p>';
    } else {
      h += '<p><strong>Alcol a ' + X + '°:</strong> ' + nf(d.alcMl) + ' ml · ' + nf(d.alcG) + ' gr</p>' +
        '<p><strong>Acqua demineralizzata:</strong> ' + nf(d.acquaMl) + ' ml · ' + nf(d.acquaG) + ' gr</p>' +
        '<p>→ ' + nf(v) + ' ml a ' + y + '° · peso totale ' + nf(d.massaG) + ' gr</p>';
    }
    if (!a20) h += '<p><strong>Controllo con l\'alcolometro a ' + nf(t) + ' °C:</strong> a fine diluizione deve segnare circa <strong>' + nf(d.letturaFin) + '°</strong>, cioè ' + y + '° reali a 20 °C</p>';
    ris.innerHTML = h;
  }
  [da, a, vol, te, le, disp, u].forEach(function(el){ el.addEventListener('input', calcola); el.addEventListener('change', calcola); });
  calcola();
})();

// Foto della pianta nelle schede botaniche: chiesta a Wikipedia (prima in italiano, poi in inglese)
// con il nome scientifico ripulito. Serve la connessione; senza, resta solo il collegamento alle immagini.
// Un tocco sulla foto la ingrandisce (versione piu' grande), un altro tocco la riporta piccola.
(function(){
  function pulisci(n){
    n = String(n || '').replace(/^\s+|\s+$/g, '');
    n = n.split(/\s*[(,]/)[0].split(/\s*\/\s*/)[0];
    return n.replace(/\s+(var\.|cv\.|subsp\.|f\.)\s.*$/, '').replace(/\s+spp?\.?$/, '').replace(/^\s+|\s+$/g, '');
  }
  function chiedi(url, ok, ko){
    try {
      var x = new XMLHttpRequest(); x.open('GET', url, true); x.timeout = 8000;
      x.onload = function(){ if (x.status === 200){ try { ok(JSON.parse(x.responseText)); return; } catch(e){} } ko(); };
      x.onerror = ko; x.ontimeout = ko; x.send();
    } catch(e){ ko(); }
  }
  function mostra(box, j, titolo){
    var src = (j.thumbnail && j.thumbnail.source) || '';
    if (!src) return false;
    var grande = src.replace(/\/(\d+)px-/, '/1024px-').replace(/([?&]width=)\d+/, '$11280');
    var img = document.createElement('img');
    img.setAttribute('alt', box.getAttribute('data-nome') || titolo);
    img.setAttribute('src', src);
    img.onerror = function(){ if (img.getAttribute('src') !== src){ img.setAttribute('src', src); } else if (img.parentNode) img.parentNode.removeChild(img); };
    img.addEventListener('click', function(ev){
      ev.preventDefault();
      if (/(^|\s)grande(\s|$)/.test(img.className)){ img.className = ''; img.setAttribute('src', src); }
      else { img.className = 'grande'; img.setAttribute('src', grande); }
    });
    var did = document.createElement('p'); did.className = 'foto-did';
    did.appendChild(document.createTextNode((j.title || titolo) + (j.fonte === 'foto scelta' ? ' · immagine ricostruita al computer, non una fotografia' : ' · foto da ' + (j.fonte || 'Wikipedia') + ' (la pianta, non sempre la parte usata)') + ' · tocca per ingrandire'));
    box.insertBefore(did, box.firstChild);
    box.insertBefore(img, box.firstChild);
    return true;
  }
  function carica(box){
    var sci = pulisci(box.getAttribute('data-sci')), nome = box.getAttribute('data-nome') || '';
    var file = box.getAttribute('data-file');
    if (file && /^foto\//.test(file)){ mostra(box, {thumbnail: {source: file}, title: sci || nome, fonte: 'foto scelta'}, nome); return; }
    if (file && file.indexOf('|') > 0){
      var nomi = file.split('|'), k = 0;
      var prova = function(){ if (k >= nomi.length) return; var u = 'https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(nomi[k].replace(/ /g, '_')) + '?width=320'; k++;
        var t = new Image(); t.onload = function(){ mostra(box, {thumbnail: {source: u}, title: sci || nome, fonte: 'Wikimedia Commons'}, nome); }; t.onerror = prova; t.src = u; };
      prova(); return;
    }
    if (file){ mostra(box, {thumbnail: {source: 'https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(file.replace(/ /g, '_')) + '?width=320'}, title: sci || nome, fonte: 'Wikimedia Commons'}, nome); return; }
    var prove = [];
    if (sci){ prove.push(['it', sci]); prove.push(['en', sci]); }
    if (nome) prove.push(['it', nome]);
    (function avanti(i){
      if (i >= prove.length) return;
      var t = prove[i];
      chiedi('https://' + t[0] + '.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(t[1].replace(/ /g, '_')),
        function(j){ if (j.type === 'disambiguation' || !mostra(box, j, t[1])) avanti(i + 1); },
        function(){ avanti(i + 1); });
    })(0);
  }
  function avvioFoto(){ var b = document.querySelectorAll('.bot-foto[data-sci]'); for (var i = 0; i < b.length; i++) carica(b[i]); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvioFoto); else avvioFoto();
})();
