# Costruisce l'ePub completo di «Gin in provetta» (quaderno di laboratorio sul gin compound) dai dati esportati da GinBuilder (dati.json)
import json, math, re, os, html, zipfile, unicodedata, datetime, sys, random
QUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, QUI)
from testi import INTRO, USO, FONTI, RIDONDANZE
D = json.load(open(os.path.join(QUI, 'dati.json')))
P, ASSI, ORD, MOL, MASTER, DOSE, MAT, PAN = D['P'], D['ASSI'], D['ORD'], D['MOL'], D['MASTER'], D['DOSE'], D['MAT'], D['PAN']
SENS, UMAMI, ASSI_SENS = D.get('SENS', {}), D.get('UMAMI', {}), D.get('ASSI_SENS', [])
OUT = sys.argv[1] if len(sys.argv) > 1 else 'Gin-in-provetta.epub'
CSS = open(os.path.join(QUI, 'libro.css')).read()
JS = open(os.path.join(QUI, 'libro.js')).read()
e = lambda t: html.escape(str(t), quote=True)
def slug(t):
    t = unicodedata.normalize('NFKD', t).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9]+', '-', t.lower()).strip('-')
POS = [0]*len(ASSI)
for k, d in enumerate(ORD): POS[d] = k
def pt(i, v, c, R):
    a = -math.pi/2 + POS[i]*2*math.pi/len(ASSI)
    return (c + R*v/5*math.cos(a), c + R*v/5*math.sin(a))
def radar(vals, size=220, rid='', colore='#2F7259'):
    c = size/2; R = size/2 - 38
    g = ''.join('<polygon points="%s" fill="none" stroke="#d8d2c6" stroke-width="1"/>' % ' '.join('%.1f,%.1f' % pt(i, l, c, R) for i in ORD) for l in range(1, 6))
    for i, a in enumerate(ASSI):
        x, y = pt(i, 5, c, R); lx, ly = pt(i, 5 + 14/R*5, c, R)
        anc = 'middle' if abs(lx-c) < 6 else ('start' if lx > c else 'end')
        g += '<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="#d8d2c6" stroke-width="1"/>' % (c, c, x, y)
        g += '<text x="%.1f" y="%.1f" text-anchor="%s" font-size="10" font-family="sans-serif" fill="#555555">%s</text>' % (lx, ly + 3.5, anc, e(a))
    pts = ' '.join('%.1f,%.1f' % pt(i, vals[i], c, R) for i in ORD)
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="-48 0 %d %d" class="radar"%s role="img" aria-label="Profilo radar">%s'
            '<polygon points="%s" class="rp" fill="%s" fill-opacity="0.5" stroke="%s" stroke-width="2"/>'
            '<polygon points="" class="ro" fill="#C0733A" fill-opacity="0.22" stroke="#C0733A" stroke-width="2" stroke-dasharray="4 3"/></svg>') % (
            size + 96, size, (' id="%s" data-s="%d"' % (rid, size)) if rid else '', g, pts, colore, colore)
SENS_COL = '#B8921F'
def radar_sens(vals, size=220, rid=''):
    n = len(ASSI_SENS); c = size/2; R = size/2 - 38
    def q(i, v):
        a = -math.pi/2 + i*2*math.pi/n
        return (c + R*v/5*math.cos(a), c + R*v/5*math.sin(a))
    g = ''.join('<polygon points="%s" fill="none" stroke="#d8d2c6" stroke-width="1"/>' % ' '.join('%.1f,%.1f' % q(i, l) for i in range(n)) for l in range(1, 6))
    for i, a in enumerate(ASSI_SENS):
        x, y = q(i, 5); lx, ly = q(i, 5 + 14/R*5)
        anc = 'middle' if abs(lx-c) < 6 else ('start' if lx > c else 'end')
        g += '<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="#d8d2c6" stroke-width="1"/>' % (c, c, x, y)
        g += '<text x="%.1f" y="%.1f" text-anchor="%s" font-size="10" font-family="sans-serif" fill="#555555">%s</text>' % (lx, ly + 3.5, anc, e(a))
    pts = ' '.join('%.1f,%.1f' % q(i, vals[i]) for i in range(n))
    g += '<polygon points="%s" fill="%s" fill-opacity="0.25" stroke="%s" stroke-width="2"/>' % (pts, SENS_COL, SENS_COL)
    g += '<polygon points="" class="ro" fill="#C0733A" fill-opacity="0.22" stroke="#C0733A" stroke-width="2" stroke-dasharray="4 3"/>'
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-48 0 %d %d" class="radar"%s role="img" aria-label="Sensazioni in bocca: %s">%s</svg>' % (
        size + 96, size, (' id="%s" data-s="%d"' % (rid, size)) if rid else '', e(', '.join('%s %s' % (a, v) for a, v in zip(ASSI_SENS, vals))), g)
UMAMI_NOTA = 'È un gusto, non una sensazione, e resta fuori dal radar: in un gin per macerazione passa poco, perché glutammato e nucleotidi non sono volatili e si sciolgono male nell\'alcol forte.'
def sens_blocco(n):
    v = SENS.get(n) or [0]*len(ASSI_SENS)
    forti = sorted([(a, x) for a, x in zip(ASSI_SENS, v) if x >= 3], key=lambda t: -t[1])
    h = radar_sens(v, 220, 's-' + slug(n))
    h += '<p class="nota">%s</p>' % (('Marcate: ' + ', '.join('%s %d/5' % (a.lower(), x) for a, x in forti) + '.') if forti else 'Nessuna sensazione marcata: lavora soprattutto su gusto e aroma.')
    u = UMAMI.get(n, 0)
    h += '<p class="nota"><strong>Umami:</strong> %s</p>' % (('%d/5. ' % u + UMAMI_NOTA) if u else 'assente.')
    return h
POT_SCALA = ['#3B4CC0','#3E7FD9','#3FB0D6','#4CC79A','#8CD15A','#D9D93E','#F5B83A','#F28A2E','#E0492B','#A3195B']
def pot_colore(p):
    p = max(1, min(10, p or 1)); i = int(p) - 1; f = p - int(p)
    if i >= 9 or f < .01: return POT_SCALA[min(9, round(p) - 1)]
    a = [int(POT_SCALA[i][k:k+2], 16) for k in (1, 3, 5)]; b = [int(POT_SCALA[i+1][k:k+2], 16) for k in (1, 3, 5)]
    return '#' + ''.join('%02x' % round(x + (y - x) * f) for x, y in zip(a, b))
POT = {}
def potenza(n):
    n = 'Mirto' if n in ('Mirto foglie', 'Mirto bacche') else n
    return POT.get(n)
def pot_media(el):
    el = [(potenza(n), w) for n, w in el if potenza(n)]
    t = sum(w for _, w in el)
    return sum(p * w for p, w in el) / t if t else None
def fmt1(p):
    p = round(p, 1)
    return str(int(p)) if p == int(p) else str(p).replace('.', ',')
def pot_legenda(p):
    if not p: return ''
    w = 24; bar = ''.join('<rect x="%d" y="6" width="%d" height="10" fill="%s"/>' % (20 + k*w, w, c) for k, c in enumerate(POT_SCALA))
    x = 20 + (p - 1) / 9 * (w * 10 - 1)
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 34" class="potleg" role="img" aria-label="Potenza %s su 10">%s'
            '<rect x="%.1f" y="1" width="3" height="20" rx="1" class="pmk" fill="#222222" stroke="#ffffff" stroke-width="1"/>'
            '<text x="20" y="31" font-size="10" font-family="sans-serif" fill="#555555">delicata</text>'
            '<text x="140" y="31" text-anchor="middle" font-size="10.5" font-weight="bold" font-family="sans-serif" fill="#222222" class="ptx">Potenza %s/10</text>'
            '<text x="260" y="31" text-anchor="end" font-size="10" font-family="sans-serif" fill="#555555">potente</text></svg>') % (
            fmt1(p), bar, x - 1.5, fmt1(p))
def cos(a, b):
    d = sum(x*y for x, y in zip(a, b)); n = math.hypot(*a)*math.hypot(*b)
    return d/n if n else 0
def prof(n):
    if n in P: return P[n]
    if n == 'Mirto': return P.get('Mirto foglie')
    return None
def media(el):
    el = [(n, w) for n, w in el if prof(n) and w > 0]
    if not el: return None
    t = sum(w for _, w in el)
    return [round(sum(prof(n)[i]*w for n, w in el)/t, 2) for i in range(len(ASSI))]
def chips(rid, vicini):
    return '<p class="sim" data-r="%s">Profilo vicino: %s</p>' % (rid, ' '.join(
        '<button type="button" class="chip" data-v="%s" data-s="%s">%s %d%%</button>' % (','.join(str(x) for x in v), ','.join(str(x) for x in (SENS.get(n) or [])), e(n), round(c*100)) for n, v, c in vicini))
def page(title, body, scripted=False):
    return ('<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="it" lang="it">'
            '<head><meta charset="utf-8"/><title>%s</title><link rel="stylesheet" href="libro.css"/>%s</head><body>%s</body></html>') % (
            e(title), '<script src="libro.js" defer="defer"></script>' if scripted else '', body)

# ---------- sigle cliccabili: ogni sigla rimanda alla sua voce in "Che cosa vogliono dire le sigle" ----------
SIGLE_ID = {'TRP': 'trp', 'TRPV1': 'trpv1', 'TRPV3': 'trpv3', 'TRPA1': 'trpa1', 'TRPM8': 'trpm8', 'TRPM5': 'trpm5',
            'T1R e TAS1R': 't1r', 'TAS2R': 'tas2r', 'OR': 'or', 'GPCR': 'gpcr', 'OTOP1': 'otop1', 'ENaC': 'enac', 'KCNK': 'kcnk',
            'Trigemino': 'trigemino', 'Chemestesi': 'chemestesi', 'Ortonasale e retronasale': 'ortonasale'}
# parola nel testo -> voce, dai dati dell'app (SIGLE_FORME e GLOSS_FORME); le piu' lunghe prima.
# Le sigle rimandano a "Che cosa vogliono dire le sigle", le parole difficili al Glossario (appendice A).
VOCI_T = [(f, 'cap5-sigle.xhtml#sig-' + k, True) for k, fs in D['SIGLE_FORME'].items() for f in fs] + \
         [(f, 'app-glossario.xhtml#g-' + k, f == 'pH') for k, fs in D['GLOSS_FORME'].items() for f in fs]
VOCI_T.sort(key=lambda v: -len(v[0]))
_MAP_S = {f: h for f, h, cs in VOCI_T if cs}
_MAP_G = {}
for f, h, cs in VOCI_T:
    if not cs: _MAP_G.setdefault(f.lower(), h)
_B = r'(?<![\wÀ-ÿ-])(%s)(?![\wÀ-ÿ-])'
_RE_S = re.compile(_B % '|'.join(re.escape(f) for f, h, cs in VOCI_T if cs))
_RE_G = re.compile(_B % '|'.join(re.escape(f) for f, h, cs in VOCI_T if not cs), re.I)
def collega_sigle(body, href):
    if href in ('cap5-sigle.xhtml', 'app-fonti.xhtml', 'app-glossario.xhtml'): return body
    out, fatte, salta = [], set(), 0
    # si lavora solo sul testo fuori dai tag; si salta dentro <a>, <svg>, titoli, <script>, <style>, <dt>
    for pezzo in re.split(r'(<[^>]+>)', body):
        if pezzo.startswith('<'):
            m = re.match(r'<(/?)(a|svg|h1|h2|h3|h4|script|style|title|button|summary|dt)\b', pezzo)
            if m and not pezzo.endswith('/>'): salta += -1 if m.group(1) else 1
            out.append(pezzo); continue
        if salta > 0 or not pezzo.strip(): out.append(pezzo); continue
        res, pos = [], 0
        while True:
            m1, m2 = _RE_S.search(pezzo, pos), _RE_G.search(pezzo, pos)
            m = min([x for x in (m1, m2) if x], key=lambda x: x.start(), default=None)
            if not m: break
            w = m.group(1); dest = _MAP_S.get(w) if m is m1 else _MAP_G.get(w.lower())
            res.append(pezzo[pos:m.start()])
            if dest and dest not in fatte:
                fatte.add(dest); cl = 'sigla' if dest.startswith('cap5-sigle') else 'termine'
                ida = dest.split('#')[1]
                res.append('<a class="%s" id="rt-%s" href="%s" data-d="d-%s">%s</a>' % (cl, ida, dest, ida, w))
            else: res.append(w)
            pos = m.end()
        res.append(pezzo[pos:]); out.append(''.join(res))
    return ''.join(out)
def ancore_glossario(h):
    return re.sub(r'<dt>(.*?)</dt>', lambda m: '<dt id="g-%s">%s</dt>' % (slug(html.unescape(re.sub('<[^>]+>', '', m.group(1)))), m.group(1)), h)
def ancore_sigle(h):
    for nome, ida in SIGLE_ID.items():
        h = h.replace('<li><strong>%s</strong>' % nome, '<li id="sig-%s"><strong>%s</strong>' % (ida, nome), 1)
    return h
# Definizioni a comparsa: toccando una parola sottolineata la sua voce compare sulla pagina stessa
# (finestrella con «Apri nel glossario»), cosi' non si perde il punto in cui si stava leggendo.
_DEFS = {}
def definizioni():
    if not _DEFS:
        for m in re.finditer(r'<dt id="(g-[^"]+)">(.*?)</dt>\s*<dd>(.*?)</dd>', ancore_glossario(sez('nozioni', 'Glossario A–Z')), re.S):
            _DEFS[m.group(1)] = '<p><strong>%s</strong>: %s</p>' % (m.group(2), m.group(3))
        for m in re.finditer(r'<li id="(sig-[^"]+)">(.*?)</li>', ancore_sigle(pulisci(D['SIGLE'])), re.S):
            _DEFS[m.group(1)] = '<p>%s</p>' % m.group(2)
    return _DEFS
def aggiungi_definizioni(body):
    usati = re.findall(r'data-d="d-([^"]+)"', body)
    if not usati: return body
    D_ = definizioni()
    return body + '<div class="defs" hidden="hidden">%s</div>' % ''.join(
        '<div class="def" id="d-%s">%s</div>' % (k, D_[k]) for k in dict.fromkeys(usati) if k in D_)
files = []
def add(href, title, body, lvl, scripted=False):
    if '@@TAB@@' in body: body = body.replace('@@TAB@@', TAB_ES).replace('@@IMP@@', IMP_ES)
    body = collega_sigle(body, href)
    if 'data-d="d-' in body: body = aggiungi_definizioni(body)
    # ogni collegamento verso un'altra pagina ha un id, cosi' «↩ Torna» riporta esattamente li'
    n = [0]
    def _id(m):
        tag = m.group(0)
        if ' id="' in tag or re.search(r'href="(#|[a-z]+:)', tag): return tag
        n[0] += 1; return tag[:-1] + ' id="ln-%d">' % n[0]
    body = re.sub(r'<a\b[^>]*\bhref="[^"]*"[^>]*>', _id, body)
    scripted = True   # libro.js su tutte le pagine: serve al ritorno
    body = '<div class="gp-pagina" data-p="%s">%s</div>' % (href, body)   # nome e confini della pagina, per il ritorno
    files.append((slug(href.replace('.xhtml', '')), href, title, page(title, body, scripted), scripted, lvl))

# ---------- botaniche: indice e collegamenti ----------
seen = set(); per_cat = {}
for m in MASTER:
    if m.get('potenza10'): POT.setdefault(m['botanica'], float(m['potenza10']))
for m in MASTER:
    if m['botanica'] in seen: continue
    seen.add(m['botanica']); per_cat.setdefault(m['categoria'], []).append(m)
ORDINE_CAT = ['Agrumi','Semi e spezie','Radici e rizomi','Erbe aromatiche','Fiori','Frutti e bacche','Marine e saline','Specialità e gastronomiche']
cat_list = [c for c in ORDINE_CAT if c in per_cat] + [c for c in per_cat if c not in ORDINE_CAT]
CAT_DI = {m['botanica']: c for c in cat_list for m in per_cat[c]}
def href_bot(n):
    n = re.sub(r'^\W+\s*', '', n.strip())
    if n in ('Mirto foglie', 'Mirto bacche'): n = 'Mirto'
    c = CAT_DI.get(n)
    return 'b-%s.xhtml' % slug(n) if c else None
def link_bot(n):
    h = href_bot(n)
    return '<a href="%s">%s</a>' % (h, e(n.strip())) if h else e(n.strip())
nomi_prof = [m['botanica'] for c in cat_list for m in per_cat[c] if prof(m['botanica'])]

# ---------- pulizia dei frammenti esportati ----------
SVG_ATTR = ('fill','stroke','stroke-width','stroke-dasharray','stroke-linecap','stroke-linejoin','opacity','font-size','font-weight','font-family','fill-opacity','stroke-opacity')
def regole_css(css):
    out = []
    for sel, body in re.findall(r'([^{}]+)\{([^}]*)\}', re.sub(r'/\*.*?\*/', '', css, flags=re.S)):
        props = {}
        for d in body.split(';'):
            if ':' in d:
                k, v = d.split(':', 1); k = k.strip(); v = v.strip()
                if k in SVG_ATTR: props[k] = v.replace('px', '') if k in ('font-size', 'stroke-width') else v
        if props:
            for one in sel.split(','): out.append((one.strip().split(), props))
    return out
REGOLE = regole_css(CSS)
def svg_attributi(xh):
    def fai(m):
        pila = []
        def tag(mt):
            t = mt.group(0)
            if t.startswith('</'):
                if pila: pila.pop()
                return t
            nome = re.match(r'<([\w:-]+)', t).group(1)
            cm = re.search(r'class="([^"]*)"', t); cls = set(cm.group(1).split()) if cm else set()
            anc = set().union(*pila) if pila else set()
            props = {}
            for parti, pr in REGOLE:
                last = parti[-1]
                ok = all(c in cls for c in last[1:].split('.')) if last.startswith('.') else (nome == last)
                if ok and len(parti) > 1: ok = parti[0].lstrip('.') in anc
                if ok: props.update(pr)
            agg = ''.join(' %s="%s"' % (k, v) for k, v in props.items() if (' %s=' % k) not in t)
            if agg: t = re.sub(r'(/?>)$', agg + r'\1', t)
            if not t.endswith('/>'): pila.append(cls)
            return t
        return re.sub(r'</?[\w:-]+[^>]*>', tag, m.group(0))
    return re.sub(r'<svg[\s\S]*?</svg>', fai, xh)
def pulisci(xh):
    xh = re.sub(r'<label[^>]*>[\s\S]*?</label>', '', xh)
    xh = re.sub(r'<div class="(tar-vol|ruota-info|ruota-wrap|soglia-slot)"[^>]*>[\s\S]*?</div>', '', xh)
    xh = xh.replace(' xmlns="http://www.w3.org/1999/xhtml"', '')
    xh = re.sub(r'\s(aria-labelledby|role)="[^"]*"', '', xh)
    xh = re.sub(r'<h4([^>]*)>', r'<h3\1>', xh).replace('</h4>', '</h3>')
    xh = xh.replace('<svg viewBox', '<svg xmlns="http://www.w3.org/2000/svg" viewBox')
    xh = re.sub(r'<span class="bot-nome">([^<]*)</span>', lambda m: link_bot(html.unescape(m.group(1))), xh)
    return svg_attributi(xh)
def sez(pan, titolo):
    for t, h in PAN[pan]:
        if t == titolo: return pulisci(h)
    raise KeyError(titolo)

# ---------- copertina, introduzione ----------
cr = radar(P['Bacche di ginepro'], 300)
cr = re.sub(r'<svg[^>]*>', '<g transform="translate(150,400)">', cr, count=1).replace('</svg>', '</g>')
cr = re.sub(r'<polygon points="" class="ro"[^>]*/>', '', cr).replace('stroke="#d8d2c6"', 'stroke="#E9D8A6" stroke-opacity="0.5"').replace('fill="#555555"', 'fill="#E9D8A6"').replace('font-size="10"', 'font-size="12"').replace('fill="#2F7259" fill-opacity="0.25" stroke="#2F7259"', 'fill="#E9D8A6" fill-opacity="0.35" stroke="#FBF8F1"')
cover_svg = open(os.path.join(QUI, 'copertina.svg')).read()
add('intro.xhtml', 'Introduzione', INTRO, 1)
add('uso.xhtml', 'Come usare questo libro', USO, 1)

# ---------- 1. Storia ----------
stor = [t for t, _ in PAN['storia'] if t]
add('cap1.xhtml', 'Capitolo 1 · Storia del gin', '<section epub:type="chapter"><h1>Capitolo 1<br/>Storia del gin</h1><ol class="indice">' +
    ''.join('<li><a href="#st-%s">%s</a></li>' % (slug(t), e(t)) for t in stor) + '</ol>' +
    ''.join('<section id="st-%s"><h2>%s</h2>%s</section>' % (slug(t), e(t), sez('storia', t)) for t in stor) + '</section>', 1)

# ---------- 2. Le botaniche ----------
add('cap2.xhtml', 'Capitolo 2 · Le botaniche', '''<section epub:type="chapter"><h1>Capitolo 2<br/>Le botaniche</h1>
<p>Le %d botaniche della libreria di GinBuilder, divise in %d famiglie. Ogni scheda riporta il nome botanico, la parte usata, il profilo aromatico, il carattere, la potenza, la dose di riferimento, le molecole da estrarre, il periodo di raccolta e le zone italiane, con i suoi due radar: il profilo sensoriale e le sensazioni in bocca.</p>
<ol class="indice"><li><a href="cap2-radar.xhtml">Come leggere il radar</a></li><li><a href="cap2-famiglie.xhtml">Le famiglie delle botaniche</a></li></ol></section>''' % (len(seen), len(cat_list)), 1)
ES_BOT = ['Limone', 'Bacche di ginepro', 'Rosa', 'Bergamotto', 'Lentisco']
TAB_ES = ('<table class="matrice-es"><thead><tr><th></th>' + ''.join('<th title="%s">%s</th>' % (e(a), e(a[:3])) for a in ASSI) + '</tr></thead><tbody>' +
          ''.join('<tr><th>%s</th>%s</tr>' % (e(n.replace('Bacche di ginepro', 'Ginepro')), ''.join('<td>%d</td>' % x for x in P[n])) for n in ES_BOT) + '</tbody></table>' +
          '<p class="nota" style="text-align:center">' + ' · '.join('%s = %s' % (e(a[:3]), e(a.lower())) for a in ASSI) + '</p>')
IMP_ES = ''.join('<div class="impronta">%s<p>%s</p></div>' % (radar(P[n], 200, '', pot_colore(potenza(n)) if potenza(n) else '#2F7259'), e(n.replace('Bacche di ginepro', 'Ginepro'))) for n in ES_BOT)
add('cap2-radar.xhtml', 'Come leggere il radar', '''<section><h1>Come leggere il radar</h1>
<p>I dieci assi sono quattro di gusto, sentiti dalla lingua (<strong>dolce, amaro, acido, salino</strong>), e sei di aroma, sentiti dal naso (<strong>agrumato, floreale, erbaceo, speziato, resinoso, fruttato</strong>). Ogni valore va da 0 a 5. Sul disegno ogni nota sta di fronte a una nota di carattere opposto: dolce e amaro, fruttato e resinoso, floreale ed erbaceo, agrumato e speziato, acido e salino. È una disposizione scelta per comodità di lettura, non una misura. Il <strong>resinoso</strong> raccoglie le note di conifera e di balsamo (pino, ginepro, lentisco), il <strong>fruttato</strong> la frutta che non è agrume (bacche, frutta matura, frutta tropicale). Il radar mostra la <em>forma</em> del profilo, cioè quali note prevalgono, non la quantità: una botanica potente e una delicata possono avere la stessa forma.</p>
<p><strong>Si leggono i raggi, non l'area.</strong> Gli unici dati del radar sono i valori sui dieci raggi. La forma e l'area dipendono dall'ordine in cui gli assi sono disposti: due note forti vicine fanno una vela larga, le stesse due note messe una di fronte all'altra fanno una linea sottile, ma la botanica è la stessa. Per questo l'area va presa come un'<em>impronta</em>, fatta per riconoscere e non per misurare, e ogni confronto si fa nota per nota. Così sono calcolate la somiglianza fra due profili (la parte che hanno in comune, nota per nota) e il <em>carattere</em> (quanto il profilo si concentra su poche note: equilibrato, sfumato, marcato, netto).</p>
<p><strong>La firma e il gin nel bicchiere.</strong> Il radar di una botanica, e quello della <em>firma</em> di un gin, mostrano il profilo <em>senza</em> ginepro, coriandolo e angelica: servono a vedere che cosa la botanica aggiunge e a confrontarla con le altre. Non dicono però quali note prevalgono nel gin finito. Una fragola da sola è tutta fruttato e dolce; nel bicchiere c'è sempre il ginepro, e il gin con la fragola resta un gin, con un accento fruttato. Per questo, nell'app, le note che prevalgono nel bicchiere si giudicano sempre con le base dentro.</p>
<h2>Perché un radar e non una tabella</h2>
<p>Gli stessi numeri si potrebbero scrivere in una tabella: le botaniche sulle righe, i dieci sentori sulle colonne, un valore da 0 a 5 in ogni casella. I dati sarebbero identici e la tabella darebbe gli stessi risultati in ogni calcolo. Ecco cinque botaniche così:</p>
@@TAB@@
<p>Cinquanta numeri. Per dire quale botanica somiglia a quale bisogna confrontarli riga per riga, tenendone a mente parecchi insieme. La memoria di lavoro però ne regge circa quattro alla volta: dopo pochi confronti si torna indietro a rileggere.</p>
<p>Ecco gli stessi cinquanta numeri come impronte:</p>
<div class="impronte">@@IMP@@</div>
<p>Qui il confronto è immediato: il ginepro e il lentisco hanno impronte vicine, e così il limone e il bergamotto; la rosa non somiglia a nessuna delle altre. Nella tabella la stessa cosa c'era, ma andava cercata. Non è un abbellimento: è il modo in cui funziona la vista.</p>
<ul>
<li><strong>Le forme si leggono in parallelo.</strong> La corteccia visiva riconosce una figura tutta insieme, in una frazione di secondo, mentre i numeri si leggono uno alla volta.</li>
<li><strong>L'occhio chiude i contorni.</strong> Uniti da una linea e colorati, dieci punti diventano un'unica figura (la «chiusura» della psicologia della Gestalt). Dieci segmenti sparsi restano dieci cose da guardare.</li>
<li><strong>Le immagini si ricordano meglio delle parole e dei numeri.</strong> Negli esperimenti di riconoscimento le persone riconoscono migliaia di immagini viste una volta sola. Dopo qualche settimana di uso, l'impronta del ginepro si riconosce come un volto.</li>
<li><strong>L'idea non è nuova.</strong> Nel 1973 lo statistico Herman Chernoff propose di tradurre dati a molte dimensioni in disegni di volti, proprio perché l'occhio coglie a colpo d'occhio differenze che in una tabella sfuggono.</li>
</ul>
<p>Per funzionare, l'impronta ha una condizione: gli assi devono stare sempre nello stesso ordine. Un volto si riconosce perché occhi, naso e bocca stanno sempre al loro posto. Per questo in tutto il libro, e nell'app, la disposizione non cambia mai.</p>
<p class="nota">La tabella resta lo strumento per i calcoli, l'impronta per l'occhio e la memoria. Le fonti sono nell'appendice C, sotto «Percezione visiva e memoria delle immagini».</p>

<p>Per questo il <strong>colore dell'area</strong> indica la <strong>potenza</strong>, da 1 a 10, con una scala come quella delle previsioni del tempo: blu per le botaniche delicate, verde e giallo per quelle medie, arancio, rosso e porpora per le più potenti. Due radar con la stessa forma e colori diversi raccontano due botaniche che vanno dosate in modo molto diverso. Nelle ricette e nei gin il colore è la potenza media, pesata sulle dosi.</p>
%s
<p>La potenza è anche soggettiva: se una tua botanica rende più o meno del previsto, sotto il suo radar puoi spostare il cursore e fissare la tua potenza. Il lettore la ricorda; il valore di libreria si ripristina con un tocco.</p>
<p>Sotto ogni radar ci sono le botaniche dal profilo più vicino, con la somiglianza in percentuale: toccandone una, il suo profilo si sovrappone in arancio, sia sul profilo sensoriale sia sul radar delle sensazioni in bocca.</p>
<h2>Il secondo radar: sensazioni in bocca</h2>
<p>Sotto il profilo, ogni scheda ha un secondo radar, giallo ocra. Il primo dice <em>che sapore ha</em> una botanica; il secondo dice <em>che effetto fa in bocca</em>. Sono due cose di natura diversa: i gusti passano dalle papille, gli aromi dal naso, le sensazioni dal nervo trigemino e dal tatto. Metterle sullo stesso disegno porterebbe a confronti senza senso, per questo stanno su due radar separati.</p>
<p>I cinque assi, da 0 a 5:</p>
<ul><li><strong>Pungente</strong>: calore e pizzicore, da piperina, gingeroli, isotiocianati, eugenolo (recettori TRPV1 e TRPA1). Pepe, zenzero, grani del paradiso.</li>
<li><strong>Rinfrescante</strong>: freddo e balsamico, da mentolo, cineolo, canfora (recettore TRPM8). Menta, cardamomo, rosmarino, aghi di pino.</li>
<li><strong>Astringente</strong>: secchezza e ruvidità, da tannini e polifenoli che legano le proteine della saliva. Prugnolo, tè, melograno, rabarbaro.</li>
<li><strong>Corpo</strong>: pienezza e rotondità, da zuccheri, glicirrizina, mucillagini, oli densi. Liquirizia, vaniglia, fico, iris.</li>
<li><strong>Persistenza</strong>: durata del finale, da fissativi, resine, sesquiterpeni, amaricanti. Angelica, iris, genziana, china.</li></ul>
<p>%s</p>
<p><strong>L'umami.</strong> È il quinto gusto, dato da glutammato e nucleotidi (inosinato, guanilato). Non ha un opposto: i gusti non sono coppie di contrari, ognuno ha i suoi recettori (per l'umami T1R1 + T1R3). Le botaniche che ne portano sono poche: alghe (nori, kombu), funghi secchi, pomodoro secco, tè verde (gyokuro), in misura minore oliva, asparago, salicornia. Nelle schede compare come riga a parte. %s Conta di più negli amari e nel vermouth, macerati a gradazione più bassa e su base di vino.</p>
<p class="nota">Anche questi valori sono stime, ricavate dalle molecole presenti: vanno tarati all'assaggio.</p>
<p class="naviga"><a href="cap2.xhtml">Capitolo 2</a> · <a href="cap2-famiglie.xhtml">Le famiglie delle botaniche →</a></p></section>''' % (
    radar([1,0.5,1,0,4,2,2,3,2,1], 240, '', pot_colore(3)) + '<p class="nota" style="text-align:center">Potenza 3: una botanica delicata.</p>' +
    radar([1,0.5,1,0,4,2,2,3,2,1], 240, '', pot_colore(9)) + '<p class="nota" style="text-align:center">Stessa forma, potenza 9: una botanica potente.</p>' +
    pot_legenda(5.5).replace('Potenza 5,5/10', 'Scala della potenza'),
    radar_sens(SENS['Cardamomo verde'], 220) + '<p class="nota" style="text-align:center">Cardamomo verde: quasi neutro sul gusto, in bocca spicca per la freschezza.</p>', UMAMI_NOTA), 2)
add('cap2-famiglie.xhtml', 'Le famiglie delle botaniche', '''<section><h1>Le famiglie delle botaniche</h1>
<p class="nota">Tocca una famiglia: si apre la sua pagina con tutte le botaniche da scegliere.</p><ol class="indice">%s</ol>
<p class="naviga"><a href="cap2.xhtml">Capitolo 2</a> · <a href="cap2-radar.xhtml">Come leggere il radar</a></p></section>''' % ''.join(
    '<li><a href="cap2-%s.xhtml">%s <span class="nota">(%d)</span></a></li>' % (slug(c), e(c), len(per_cat[c])) for c in cat_list), 2)
for c in cat_list:
    fam = per_cat[c]
    add('cap2-%s.xhtml' % slug(c), c, '<section epub:type="chapter"><h1>%s</h1><p class="nota">%d botaniche · <a href="cap2-famiglie.xhtml">tutte le famiglie</a></p><p class="nota">Tocca una botanica per aprirne la scheda. Il pallino colorato è la potenza.</p><ul class="fam-lista">%s</ul></section>' % (
        e(c), len(fam), ''.join('<li><a href="b-%s.xhtml"><span class="pall" style="background:%s"></span>%s %s</a></li>' % (
            slug(m['botanica']), pot_colore(potenza(m['botanica'])) if potenza(m['botanica']) else '#cccccc', e(m.get('icona') or ''), e(m['botanica'])) for m in fam)), 2)
    for k, m in enumerate(fam):
        body = ''
        n = m['botanica']; v = prof(n)
        dose = DOSE.get(n) or {}
        campi = [('Nome botanico', '<em>%s</em>' % e(m.get('nome_botanico') or '—')), ('Parte usata', e(m.get('parte') or '—')),
                 ('Profilo aromatico', e(m.get('profilo') or '—')), ('Carattere', e(m.get('carattere') or '—')),
                 ('Funzione', e(m.get('funzione_op') or '—')),
                 ('Potenza', '%s/10 (intensità %s/5, persistenza %s/5)' % (m.get('potenza10', '—'), m.get('intensita', '—'), m.get('persistenza', '—'))),
                 ('Dose di riferimento', ('%s g per 100 ml a 43%%, tempo %s' % (str(dose.get('test')).replace('.', ','), e(dose.get('tempo') or m.get('tempo') or '—'))) if dose.get('test') else '—'),
                 ('Raccolta', e(m.get('periodo_raccolta') or '—')), ('Zone in Italia', e(m.get('zone_italia') or '—'))]
        mol = MOL.get(n) or (MOL.get('Mirto foglie') if n == 'Mirto' else None)
        prev = fam[k-1]['botanica'] if k > 0 else None; nxt = fam[k+1]['botanica'] if k + 1 < len(fam) else None
        naviga = '<p class="naviga">%s<a href="cap2-%s.xhtml">%s</a>%s</p>' % (
            ('<a href="b-%s.xhtml">← %s</a> · ' % (slug(prev), e(prev))) if prev else '<span class="nav-vuoto">inizio famiglia</span> · ', slug(c), e(c),
            (' · <a href="b-%s.xhtml">%s →</a>' % (slug(nxt), e(nxt))) if nxt else ' · <span class="nav-vuoto">fine famiglia</span>')
        # Struttura fissa, uguale per ogni botanica: intestazione, due radar, scheda, molecole, eccessi, profili vicini.
        sic = m.get('sicurezza') or ''
        campi.append(('Sicurezza', e(sic) if sic and 'verificare' not in sic.lower() else 'nessuna avvertenza particolare'))
        rid = 'r-' + slug(n); pz = potenza(n) or 5
        vic = sorted(((x, prof(x), cos(v, prof(x))) for x in nomi_prof if x != n), key=lambda t: -t[2])[:4] if v else []
        ctrl = ('<p class="pot-tua solo-js"><span>La tua potenza: <strong class="pv">%s</strong>/10 <span class="nota pst"></span></span><br/>'
                '<input type="range" class="pot-range" min="1" max="10" step="0.5" value="%s" aria-label="Potenza"/><br/>'
                '<button type="button" class="chip pfix">📌 Fissa</button> <button type="button" class="chip prip">↺ Valore di libreria</button></p>') % (fmt1(pz), pz)
        vicini_html = ('<div class="vicini"><p class="vic-tit">Sovrapponi un profilo vicino (anche alle sensazioni):</p>' + chips(rid, vic).replace('Profilo vicino: ', '') + '</div>') if vic else ''
        bsez = lambda t, h, cl='': '<section class="bsez%s"><h3>%s</h3>%s</section>' % (cl, t, h)
        body = '<article class="bot" id="b-%s">' % slug(n)
        body += naviga
        body += '<h2>%s %s</h2><p class="bsub"><em>%s</em> · %s · %s</p>' % (e(m.get('icona') or '🌿'), e(n), e(m.get('nome_botanico') or '—'), e(c), e(m.get('parte') or '—'))
        body += bsez('1 · Profilo sensoriale', '<div class="bot-radar" data-n="%s" data-p="%s">' % (e(n), pz) + radar(v or [0]*len(ASSI), 220, rid, pot_colore(pz)) + vicini_html + pot_legenda(pz) + ctrl + '</div>')
        body += bsez('2 · Sensazioni in bocca', '<div class="bot-sens">' + sens_blocco(n) + '</div>')
        body += bsez('3 · Scheda', '<dl class="campi">' + ''.join('<dt>%s</dt><dd>%s</dd>' % (kk, val) for kk, val in campi if kk not in ('Nome botanico', 'Parte usata')) + '</dl>')
        body += bsez('4 · Molecole da estrarre', '<p class="mol">%s</p>' % (e(mol) if mol else '—'))
        body += bsez('5 · Se si esagera', '<p>%s.</p>' % e((m.get('effetto_sovra') or '—').rstrip('.')))
        body += '</article>' + naviga
        add('b-%s.xhtml' % slug(n), n, '<section>' + body + '</section>', 3, True)

# ---------- 3. L'estrazione ----------
ESTR = ["Gradazione e solubilità dell'alcol", 'Le molecole estratte e cosa rovina il gusto', 'Dopo la diluizione: torbidità, corpo e colore', 'Filtrazione e apparecchiature']
add('cap3.xhtml', "Capitolo 3 · L'estrazione", '''<section epub:type="chapter"><h1>Capitolo 3<br/>L'estrazione</h1>
<p>Nel gin compound tutto passa per l'infusione: l'alcol e l'acqua scelgono quali molecole portare fuori dalla botanica e quali lasciare dentro. Questo capitolo spiega come la gradazione decide la solubilità, quali sostanze si vogliono estrarre e quali rovinano il gusto, che cosa succede quando si diluisce e come si chiarifica e si filtra.</p>
<ol class="indice">%s</ol></section>''' % ''.join('<li><a href="cap3-%d.xhtml">%s</a></li>' % (i+1, e(t)) for i, t in enumerate(ESTR)), 1)
for i, t in enumerate(ESTR):
    add('cap3-%d.xhtml' % (i+1), t, '<section><h1>%s</h1>%s</section>' % (e(t), sez('nozioni', t)), 2)

# ---------- 4. Costruire un gin ----------
add('cap4.xhtml', 'Capitolo 4 · Costruire un gin', '''<section epub:type="chapter"><h1>Capitolo 4<br/>Costruire un gin</h1>
<p>Una ricetta non è un elenco di botaniche: ogni botanica ha un compito. Il capitolo presenta i sei ruoli, gli stili di partenza dell'app con il loro profilo, e il criterio con cui due botaniche si sommano (ridondanza) o si completano.</p>
<ol class="indice"><li><a href="cap4-ruoli.xhtml">I ruoli delle botaniche</a></li><li><a href="cap4-stili.xhtml">Gli stili</a></li><li><a href="cap4-ridondanze.xhtml">Ridondanze e complementari</a></li></ol></section>''', 1)
add('cap4-ruoli.xhtml', 'I ruoli delle botaniche', '<section><h1>I ruoli delle botaniche nella ricetta</h1>%s</section>' % sez('nozioni', 'I ruoli delle botaniche nella ricetta'), 2)
FRAZ = {'Base': 1, 'Freschezza': 1, 'Identità': .8, 'Cuore': .7, 'Botanica firma': .3, 'Firma': .3, 'Rifinitura': .15}
BASE = set(D['GIN_BASE'])
def parse_ruolo(testo):
    out = []
    for parte in re.split(r',\s*', testo):
        tracce = 'tracce' in parte
        nome = re.sub(r'\s*\(.*?\)', '', parte).strip()
        nome = re.split(r'\s+o\s+', nome)[0].strip()
        if prof(nome): out.append((nome, tracce))
    return out
GARN = D.get('GARN') or {}
stili = '<section><h1>Gli stili</h1><p>Gli stili di partenza del Gin Builder. Per ogni stile: l\'intensità, i ruoli con le botaniche proposte e il radar della firma, cioè del profilo senza ginepro, coriandolo e angelica, pesato sulle dosi di riferimento e sulla quota di ogni ruolo.</p>'
for nome, inten, maxb, ruoli in D['STYLES']:
    if not ruoli: continue
    el = []
    for r, t in ruoli:
        fr = next((v for k, v in FRAZ.items() if r.startswith(k)), .5)
        for n, tr in parse_ruolo(t):
            if n not in BASE: el.append((n, (DOSE.get(n, {}).get('test') or 1) * fr * (0.3 if tr else 1)))
    v = media(el)
    stili += '<article class="bot" id="s-%s"><h2>%s</h2><p class="nota">Intensità %s su 5 · fino a %s botaniche</p>' % (slug(nome), e(nome), inten, maxb)
    pz = pot_media(el)
    if v: stili += '<div class="bot-radar">' + radar(v, 220, '', pot_colore(pz) if pz else '#2F7259') + pot_legenda(pz) + '</div>'
    stili += '<table class="ruoli"><tbody>' + ''.join('<tr><th>%s</th><td>%s</td></tr>' % (e(r), e(t)) for r, t in ruoli) + '</tbody></table>'
    g = GARN.get(nome)
    if g: stili += '<p class="nota">Garnish: %s (%s). <a href="cap7-garnish.xhtml">Il servizio →</a></p>' % (e(g['g'].lower()), e(g['tipo']))
    stili += '</article>'
add('cap4-stili.xhtml', 'Gli stili', stili + '</section>', 2)
add('cap4-ridondanze.xhtml', 'Ridondanze e complementari', RIDONDANZE, 2)

# ---------- 5. La percezione ----------
SENSI = {'gusto': ('Gusto', 'lingua'), 'olfatto': ('Olfatto', 'naso'), 'trigemino': ('Trigemino', 'caldo, freddo, pungente'), 'tatto': ('Tatto', 'meccanico')}
add('cap5.xhtml', 'Capitolo 5 · La percezione', '''<section epub:type="chapter"><h1>Capitolo 5<br/>La percezione</h1>
<p>Come un gin arriva al cervello: i quattro sistemi sensoriali, i recettori e i canali che leggono le molecole, la matrice che collega ogni sentore alle sue molecole e botaniche, la ruota degli aromi per descrivere ciò che si sente, e il metodo per assaggiare.</p>
<ol class="indice"><li><a href="cap5-sistemi.xhtml">Quattro sistemi, un solo sapore</a></li><li><a href="cap5-canali.xhtml">I canali e dove si trovano</a></li><li><a href="cap5-sigle.xhtml">Che cosa vogliono dire le sigle</a></li><li><a href="cap5-curioso.xhtml">Le domande del curioso</a></li><li><a href="cap5-matrice.xhtml">La matrice dei sentori</a></li><li><a href="cap5-ruota.xhtml">La ruota degli aromi</a></li><li><a href="cap5-assaggio.xhtml">L'analisi sensoriale</a></li><li><a href="cap5-taratura.xhtml">La taratura del palato</a></li><li><a href="cap5-schede.xhtml">Le schede di assaggio</a></li></ol></section>''', 1)
add('cap5-sistemi.xhtml', 'Quattro sistemi, un solo sapore', '<section><h1>Quattro sistemi, un solo sapore</h1>%s</section>' % pulisci(D['QUATTRO']), 2)
add('cap5-canali.xhtml', 'I canali e dove si trovano', '<section><h1>I canali e dove si trovano</h1>%s<p class="nota">Le fonti di questa pagina sono in <a href="app-fonti.xhtml">Fonti e bibliografia</a>.</p></section>' % pulisci(D['CANALI']), 2)
add('cap5-sigle.xhtml', 'Che cosa vogliono dire le sigle', '<section><h1>Che cosa vogliono dire le sigle</h1>%s</section>' % ancore_sigle(pulisci(D['SIGLE'])), 2)
add('cap5-curioso.xhtml', 'Le domande del curioso', '<section><h1>Le domande del curioso</h1>%s<p class="nota">Le fonti di questa pagina sono in <a href="app-fonti.xhtml">Fonti e bibliografia</a>.</p></section>' % pulisci(D['CURIOSO']), 2)
ASSI_M = ASSI + ['Struttura']
grid = '<table class="mgrid"><thead><tr><th></th>%s</tr></thead><tbody>%s</tbody></table>' % (
    ''.join('<th class="s-%s">%s</th>' % (k, v[0]) for k, v in SENSI.items()),
    ''.join('<tr><th>%s</th>%s</tr>' % (a, ''.join(
        ('<td><button type="button" class="cella s-%s" data-a="%s" data-k="%s">%d</button></td>' % (k, a, k, n)) if n else '<td class="vuota">·</td>'
        for k in SENSI for n in [sum(1 for x in MAT if x['a'] == a and x['k'] == k)])) for a in ASSI_M))
cards = ''.join(
    '<article class="sent s-%s" data-a="%s" data-k="%s"><h2>%s</h2><p class="nota">%s (%s) · asse del radar: %s</p><table class="mol"><thead><tr><th>Molecole</th><th>Botaniche</th></tr></thead><tbody>%s</tbody></table><p><strong>Recettori.</strong> %s%s</p><p>%s</p></article>' % (
        x['k'], e(x['a']), x['k'], e(x['s']), SENSI[x['k']][0], SENSI[x['k']][1], e(x['a']),
        ''.join('<tr><td>%s</td><td>%s</td></tr>' % (e(mm[0]), ', '.join(link_bot(b) for b in mm[1].split(','))) for mm in x['m']), e(x['r']),
        (' <a href="cap5-canali.xhtml">Dove si trovano →</a>' if re.search(r'TRP|OTOP1|ENaC|KCNK', x['r']) else ''), e(x['n'])) for x in MAT)
add('cap5-matrice.xhtml', 'La matrice dei sentori', '''<section><h1>La matrice dei sentori</h1>
<p>Per ogni sentore: le molecole responsabili, le botaniche che le portano e i recettori che le leggono. La griglia incrocia gli assi del radar con i quattro sistemi sensoriali: tocca una casella per vedere solo quei sentori, tocca di nuovo per vederli tutti.</p>
%s<p class="cerca"><label for="mq">Cerca una botanica o una molecola</label><input type="search" id="mq" placeholder="es. ginepro, linalolo"/></p>
<p class="nota" id="mconta">%d sentori</p>%s
<p class="nota">Per la maggior parte delle molecole d'aroma non esiste un recettore unico: vale il codice combinatorio dei circa 400 recettori olfattivi. Un recettore specifico è indicato solo dove la corrispondenza è accertata. Fonti in <a href="app-fonti.xhtml">Fonti e bibliografia</a>.</p></section>''' % (grid, len(MAT), cards), 2, True)
add('cap5-ruota.xhtml', 'La ruota degli aromi', '<section><h1>La ruota degli aromi</h1><p>Le famiglie aromatiche del gin e i loro descrittori, con le botaniche dell\'app che portano ciascuna nota. Si parte dalla famiglia e si scende al descrittore preciso.</p>%s<h2>Tutte le famiglie</h2>%s</section>' % (
    sez('ruota', ''), sez('ruota', 'Tutte le famiglie')), 2)
add('cap5-assaggio.xhtml', "L'analisi sensoriale", '<section><h1>L\'analisi sensoriale</h1>%s</section>' % sez('analisi', ''), 2)
add('cap5-taratura.xhtml', 'La taratura del palato', '<section><h1>La taratura del palato</h1><p>Per dare voti confrontabili sui dieci assi conviene tarare il palato con soluzioni di riferimento, come fanno i panel di assaggio professionali.</p>%s</section>' % pulisci(D['TARATURA']).replace("Il voto dell'app è", 'Il voto è'), 2)
add('cap5-schede.xhtml', 'Le schede di assaggio', '<section><h1>Le schede di assaggio</h1>%s</section>' % sez('analisi', 'Schede di assaggio da stampare'), 2)

# ---------- 6. I gin del mondo ----------
GIN = D['GIN']
def prof_gin(n, base=False):
    el = [(b, DOSE.get(b, {}).get('test') or 1) for b in GIN[n]['b'] if prof(b) and (base or b not in BASE)]
    return media(el), el
PG = {n: prof_gin(n)[0] for n in GIN}
PG = {n: v for n, v in PG.items() if v}
def breve(n):
    return n if n.startswith('Gin ') else re.sub(r' (London Dry|Japanese Craft|Japanese|Premium|Islay Dry|Extra Dry|Dry)? ?Gin$', '', n)
def con_radar(frag):
    def fai(m):
        tit = html.unescape(m.group(1)); n = next((x for x in PG if tit.startswith(x)), None)
        if not n: return m.group(0)
        v = PG[n]; rid = 'g-' + slug(n)
        vic = sorted(((breve(x), PG[x], cos(v, PG[x])) for x in PG if x != n), key=lambda t: -t[2])[:3]
        firma = ', '.join(sorted({b for b, _ in prof_gin(n)[1]}))
        pz = pot_media(prof_gin(n)[1])
        extra = '<div class="bot-radar">' + radar(v, 220, rid, pot_colore(pz) if pz else '#2F7259') + pot_legenda(pz) + chips(rid, vic) + '</div><p class="nota">Firma (senza ginepro, coriandolo e angelica): %s.%s</p>' % (
            e(firma), (' Lista incompleta: ' + e(GIN[n]['parziale'])) if GIN[n].get('parziale') else '')
        return m.group(0)[:-len('</section>')] + extra + '</section>'
    return re.sub(r'<section class="box"><h3>(.*?)</h3>[\s\S]*?</section>', fai, frag)
gruppi = [t for t, _ in PAN['altrigin'] if t and t != 'Mescola due gin']
add('cap6.xhtml', 'Capitolo 6 · I gin del mondo', '''<section epub:type="chapter"><h1>Capitolo 6<br/>I gin del mondo</h1>%s
<p>Ogni gin ha il radar della sua <em>firma</em>, stimato dalle sole botaniche dichiarate (senza le tre base comuni a quasi tutti), e sotto i tre gin di profilo più vicino da sovrapporre. Le proporzioni vere non sono dichiarate: è un ritratto orientativo, non una ricostruzione.</p>
<ol class="indice">%s<li><a href="cap6-gioco.xhtml">Gioco: riconosci il gin dal radar</a></li></ol></section>''' % (
    sez('altrigin', ''), ''.join('<li><a href="cap6-%d.xhtml">%s</a></li>' % (i+1, e(t)) for i, t in enumerate(gruppi))), 1)
for i, t in enumerate(gruppi):
    add('cap6-%d.xhtml' % (i+1), t, '<section><h1>%s</h1>%s</section>' % (e(t), con_radar(sez('altrigin', t))), 2, True)
rnd = random.Random(7); nomi_q = [n for n in PG if len(prof_gin(n)[1]) >= 2 and not GIN[n].get('parziale')]
rnd.shuffle(nomi_q)
quiz = '<section><h1>Gioco: riconosci il gin dal radar</h1><p>Per ogni radar scegli il gin giusto fra quattro. Con JavaScript la risposta si colora subito; senza, le soluzioni sono in fondo alla pagina.</p>'
sol = []
for k, n in enumerate(nomi_q[:8]):
    opz = rnd.sample([x for x in nomi_q if x != n], 3) + [n]; rnd.shuffle(opz)
    quiz += '<article class="quiz" id="q%d"><h2>Domanda %d</h2>%s<p class="opz">%s</p><p class="esito"></p></article>' % (
        k+1, k+1, radar(PG[n], 220), ' '.join('<button type="button" class="chip q-o" data-ok="%d">%s</button>' % (1 if x == n else 0, e(breve(x))) for x in opz))
    sol.append('<li>Domanda %d: %s</li>' % (k+1, e(breve(n))))
quiz += '<h2>Soluzioni</h2><ol class="soluzioni">%s</ol></section>' % ''.join(sol)
add('cap6-gioco.xhtml', 'Gioco: riconosci il gin', quiz, 2, True)

# ---------- 7. Il servizio ----------
add('cap7.xhtml', 'Capitolo 7 · Il servizio', '''<section epub:type="chapter"><h1>Capitolo 7<br/>Il servizio</h1>
<p>Il gin si giudica anche nel bicchiere: la guarnizione che lo accompagna, l'acqua tonica che lo allunga, i cocktail che lo mettono alla prova.</p>
<ol class="indice"><li><a href="cap7-garnish.xhtml">Le garnish</a></li><li><a href="cap7-toniche.xhtml">Le acque toniche</a></li><li><a href="cap7-cocktail.xhtml">I cocktail classici</a></li><li><a href="cap7-laboratorio.xhtml">Il laboratorio: cocktail sperimentali</a></li></ol></section>''', 1)
add('cap7-garnish.xhtml', 'Le garnish', '<section><h1>Le garnish</h1>%s</section>' % sez('garnish', ''), 2)
add('cap7-toniche.xhtml', 'Le acque toniche', '<section><h1>Le acque toniche</h1>%s</section>' % sez('toniche', ''), 2)
add('cap7-cocktail.xhtml', 'I cocktail classici', '<section><h1>I cocktail classici</h1><p>Venti classici in cui il gin è protagonista, con le dosi standard per un drink.</p>%s</section>' % sez('cocktail', ''), 2)
add('cap7-laboratorio.xhtml', 'Il laboratorio', '<section><h1>Il laboratorio: cocktail sperimentali</h1>%s</section>' % sez('laboratorio', ''), 2)

# ---------- Appendici ----------
add('app-glossario.xhtml', 'Appendice A · Glossario', '<section epub:type="glossary"><h1>Appendice A<br/>Glossario A–Z</h1><p class="nota">Le parole color ambra sottolineate a puntini nel libro aprono la loro definizione in un riquadro sulla pagina stessa, senza lasciare il punto di lettura; qui le trovi tutte in ordine alfabetico. Per le sigle la voce completa è in «Che cosa vogliono dire le sigle», nel capitolo 5.</p>%s</section>' % ancore_glossario(sez('nozioni', 'Glossario A–Z')), 1)
MESI = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']
CALm = {}
for n, ms in D['CAL']:
    if ms and n not in CALm: CALm[n] = set(ms)
cal = '<section><h1>Appendice B<br/>Calendario delle raccolte</h1><p>Le botaniche che si raccolgono in Italia mese per mese, dal periodo di raccolta della libreria; le botaniche solo importate sono escluse. Tocca un mese per andare alla sua lista.</p><p class="mesi" id="cal-top">%s</p>' % ' '.join(
    '<a class="chip cal-b" href="#mese-%d" data-m="%d">%s %d</a>' % (k, k, MESI[k][:3], sum(1 for s in CALm.values() if k in s)) for k in range(12))
for k in range(12):
    qui = [m for c in cat_list for m in per_cat[c] if k in CALm.get(m['botanica'], ())]
    cal += '<section class="cal-mese" id="mese-%d" data-m="%d"><h2>%s</h2><ul>%s</ul><p class="nota"><a href="#cal-top">↑ Torna ai mesi</a></p></section>' % (k, k, MESI[k], ''.join(
        '<li>%s · <span class="nota">%s (%s)</span></li>' % (link_bot(m['botanica']), e(m.get('parte') or ''), e(m.get('periodo_raccolta') or '')) for m in qui))
cal += '<p class="nota">Periodi indicativi: altitudine e annata li spostano anche di settimane. Raccogli solo dove è consentito e lontano da strade e coltivi trattati.</p></section>'
add('app-calendario.xhtml', 'Appendice B · Calendario delle raccolte', cal, 1, True)
add('app-fonti.xhtml', 'Appendice C · Fonti e bibliografia', FONTI, 1)

# ---------- indice, opf, zip ----------
# indice del lettore: solo capitoli e sezioni (le botaniche sono nell'indice a tendina del libro)
voci = [x for x in files if x[5] <= 2]
toc = '<ol>'; liv = 1
for i, (fid, href, title, _, _, lvl) in enumerate(voci):
    while liv > lvl: toc += '</li></ol>'; liv -= 1
    if i and lvl == liv: toc += '</li>'
    while liv < lvl: toc += '<ol>'; liv += 1
    toc += '<li><a href="%s">%s</a>' % (href, e(title))
toc += '</li>' + '</ol></li>' * (liv - 1) + '</ol>'
nav = page('Indice', '<nav epub:type="toc" id="toc"><h1>Indice</h1>%s</nav>' % toc)
# indice del libro con le tendine: capitoli > sezioni > (famiglie) > botaniche, tutto chiuso finché non si tocca
def tendine():
    # indice omogeneo: solo i capitoli, tutti uguali; ogni capitolo apre la sua prima pagina con il menu delle scelte già aperto
    righe = ''.join('<li><a href="%s">%s</a></li>' % (href, e(title)) for fid, href, title, _, _, lvl in files if lvl == 1)
    return '<section><h1>Indice</h1><ul class="fam-lista indice-cap">%s</ul></section>' % righe
oggi = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
man = ['<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>',
       '<item id="css" href="libro.css" media-type="text/css"/>', '<item id="js" href="libro.js" media-type="application/javascript"/>',
       '<item id="cover" href="copertina.png" media-type="image/png" properties="cover-image"/>',
       '<item id="coverp" href="copertina.xhtml" media-type="application/xhtml+xml"/>']
spine = ['<itemref idref="coverp"/>', '<itemref idref="indice"/>']
man.append('<item id="indice" href="indice.xhtml" media-type="application/xhtml+xml" properties="scripted"/>')
ids = set()
for fid, href, title, xh, scr, lvl in files:
    assert fid not in ids, fid; ids.add(fid)
    props = ' '.join((['scripted'] if scr else []) + (['svg'] if '<svg' in xh else []))
    man.append('<item id="p-%s" href="%s" media-type="application/xhtml+xml"%s/>' % (fid, href, (' properties="%s"' % props) if props else ''))
    spine.append('<itemref idref="p-%s"/>' % fid)
opf = '''<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid" xml:lang="it">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="uid">urn:uuid:3e8b6f0a-2c4d-4f71-9a5e-0b7c1d2e3f40</dc:identifier>
<dc:title>Gin in provetta</dc:title><dc:description>Quaderno di laboratorio: appunti sul gin compound, dalle pagine di GinBuilder.</dc:description><dc:creator>Benedetto Sgroi</dc:creator><dc:language>it</dc:language>
<meta property="dcterms:modified">%s</meta><meta name="cover" content="cover"/></metadata>
<manifest>%s</manifest><spine>%s</spine></package>''' % (oggi, ''.join(man), ''.join(spine))
with zipfile.ZipFile(OUT, 'w') as z:
    z.writestr(zipfile.ZipInfo('mimetype'), 'application/epub+zip', compress_type=zipfile.ZIP_STORED)
    def w(name, data): z.writestr(name, data, compress_type=zipfile.ZIP_DEFLATED)
    w('META-INF/container.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>')
    w('OEBPS/content.opf', opf); w('OEBPS/nav.xhtml', nav); w('OEBPS/indice.xhtml', page('Indice', '<div class="gp-pagina" data-p="indice.xhtml">' + tendine() + '</div>', True)); w('OEBPS/libro.css', CSS); w('OEBPS/libro.js', JS)
    import cairosvg
    z.writestr('OEBPS/copertina.png', cairosvg.svg2png(bytestring=cover_svg.encode(), output_width=1200), compress_type=zipfile.ZIP_STORED)
    w('OEBPS/copertina.xhtml', '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="it" lang="it">'
      '<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, height=device-height"/><title>Copertina</title>'
      '<style>html,body{margin:0;padding:0;height:100%;background:#FDFDF8;} .cop{height:100vh;width:100%;display:flex;align-items:center;justify-content:center;overflow:hidden;} .cop img{max-width:100%;max-height:100vh;width:auto;height:auto;object-fit:contain;display:block;}</style></head>'
      '<body style="margin:0;padding:0;"><section epub:type="cover" class="cop" style="height:100vh;display:flex;align-items:center;justify-content:center;overflow:hidden;">'
      '<img src="copertina.png" alt="Gin in provetta. Appunti sul gin compound. Benedetto Sgroi" style="max-width:100%;max-height:100vh;width:auto;height:auto;object-fit:contain;display:block;"/></section></body></html>')
    for fid, href, title, xh, scr, lvl in files: w('OEBPS/' + href, xh)
print('ok', OUT, len(files), 'pagine')
