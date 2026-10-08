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
    var svg = document.getElementById(p.getAttribute('data-r')); if (!svg) return;
    var poli = svg.querySelector('.ro'), size = parseFloat(svg.getAttribute('data-s')) || 220;
    var chips = p.querySelectorAll('.chip');
    for (var j = 0; j < chips.length; j++) chips[j].addEventListener('click', function(){
      var on = this.className.indexOf(' on') >= 0;
      for (var x = 0; x < chips.length; x++) chips[x].className = 'chip';
      if (on){ poli.setAttribute('points', ''); return; }
      this.className = 'chip on';
      poli.setAttribute('points', punti(this.getAttribute('data-v').split(',').map(parseFloat), size));
    });
  })(gruppi[g]);
  // matrice dei sentori
  var celle = document.querySelectorAll('.cella'), schede = document.querySelectorAll('article.sent');
  if (!schede.length) return;
  var filtro = { a: null, k: null }, q = document.getElementById('mq'), conta = document.getElementById('mconta');
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
      var t = document.getElementById('mese-' + this.getAttribute('data-m'));
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
