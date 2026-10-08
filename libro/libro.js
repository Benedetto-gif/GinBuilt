(function(){
  var ORD = [0, 5, 4, 2, 1, 6, 7, 3], POS = [];
  for (var k = 0; k < ORD.length; k++) POS[ORD[k]] = k;
  function punti(vals, size){
    var c = size / 2, R = size / 2 - 38, out = [];
    for (var i = 0; i < vals.length; i++){
      var a = -Math.PI / 2 + POS[i] * 2 * Math.PI / 8;
      out.push((c + R * vals[i] / 5 * Math.cos(a)).toFixed(1) + ',' + (c + R * vals[i] / 5 * Math.sin(a)).toFixed(1));
    }
    return out.join(' ');
  }
  // confronto sotto i radar delle botaniche
  var gruppi = document.querySelectorAll('.sim');
  for (var g = 0; g < gruppi.length; g++) (function(p){
    var svg = document.getElementById(p.getAttribute('data-r')); if (!svg) return;
    var poli = svg.querySelector('.ro'), size = parseFloat(svg.getAttribute('viewBox').split(' ')[2]);
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
