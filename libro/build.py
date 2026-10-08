# Costruisce l'ePub di prova del trattato GinBuilder (capitoli: Le botaniche, La percezione)
import json, math, re, os, html, zipfile, unicodedata, datetime, sys
D = json.load(open(os.path.join(os.path.dirname(__file__), 'dati.json')))
P, ASSI, ORD, MOL, MASTER, DOSE, MAT = D['P'], D['ASSI'], D['ORD'], D['MOL'], D['MASTER'], D['DOSE'], D['MAT']
OUT = sys.argv[1] if len(sys.argv) > 1 else 'GinBuilder-Trattato-prova.epub'
e = lambda t: html.escape(str(t), quote=True)
def slug(t):
    t = unicodedata.normalize('NFKD', t).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9]+', '-', t.lower()).strip('-')
POS = [0]*8
for k, d in enumerate(ORD): POS[d] = k
def pt(i, v, c, R):
    a = -math.pi/2 + POS[i]*2*math.pi/8
    return (c + R*v/5*math.cos(a), c + R*v/5*math.sin(a))
def radar(vals, size=220, extra_id=''):
    c = size/2; R = size/2 - 38
    g = ''.join('<polygon points="%s" fill="none" stroke="#d8d2c6" stroke-width="1"/>' % ' '.join('%.1f,%.1f' % pt(i, l, c, R) for i in ORD) for l in range(1, 6))
    for i, a in enumerate(ASSI):
        x, y = pt(i, 5, c, R); lx, ly = pt(i, 5 + 14/R*5, c, R)
        anc = 'middle' if abs(lx-c) < 6 else ('start' if lx > c else 'end')
        g += '<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="#d8d2c6" stroke-width="1"/>' % (c, c, x, y)
        g += '<text x="%.1f" y="%.1f" text-anchor="%s" font-size="10" font-family="sans-serif" fill="#555555">%s</text>' % (lx, ly + 3.5, anc, e(a))
    pts = ' '.join('%.1f,%.1f' % pt(i, v, c, R) for i, v in enumerate(vals))
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="-34 0 %d %d" class="radar"%s role="img" aria-label="Profilo radar">%s'
            '<polygon points="%s" fill="#2F7259" fill-opacity="0.25" stroke="#2F7259" stroke-width="2"/><polygon points="" class="ro" fill="#C0733A" fill-opacity="0.22" stroke="#C0733A" stroke-width="2" stroke-dasharray="4 3"/></svg>') % (size + 68, size, (' id="%s" data-s="%d"' % (extra_id, size)) if extra_id else '', g, pts)
def cos(a, b):
    d = sum(x*y for x, y in zip(a, b)); n = math.hypot(*a)*math.hypot(*b)
    return d/n if n else 0
def prof(n):
    if n in P: return P[n]
    if n == 'Mirto': return P.get('Mirto foglie')
    return None
CSS = open(os.path.join(os.path.dirname(__file__), 'libro.css')).read()
JS = open(os.path.join(os.path.dirname(__file__), 'libro.js')).read()
def page(title, body, scripted=False):
    return ('<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="it" lang="it">'
            '<head><meta charset="utf-8"/><title>%s</title><link rel="stylesheet" href="libro.css"/>%s</head><body>%s</body></html>') % (
            e(title), '<script src="libro.js" defer="defer"></script>' if scripted else '', body)
files = []   # (id, href, title, xhtml, scripted, toc_level)
# ---- copertina
cover_svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 900" width="600" height="900">
<rect width="600" height="900" fill="#1F4D3D"/><rect x="30" y="30" width="540" height="840" rx="18" fill="none" stroke="#E9D8A6" stroke-width="3"/>
<text x="300" y="190" text-anchor="middle" font-family="Georgia,serif" font-size="30" letter-spacing="8" fill="#E9D8A6">TRATTATO</text>
<text x="300" y="290" text-anchor="middle" font-family="Georgia,serif" font-size="82" font-weight="bold" fill="#FBF8F1">Gin</text>
<text x="300" y="350" text-anchor="middle" font-family="Georgia,serif" font-size="34" font-style="italic" fill="#FBF8F1">compound</text>
%s
<text x="300" y="770" text-anchor="middle" font-family="Georgia,serif" font-size="26" fill="#E9D8A6">Benedetto Sgroi</text>
<text x="300" y="810" text-anchor="middle" font-family="Georgia,serif" font-size="18" fill="#C9D8CF">dalle pagine di GinBuilder · prova</text></svg>'''
cr = radar([1,1,0,0,2,0,2,5], 300)
cr = cr.replace('<svg xmlns="http://www.w3.org/2000/svg" viewBox="-34 0 368 300" class="radar" role="img" aria-label="Profilo radar">', '<g transform="translate(150,400)">').replace('</svg>', '</g>')
cr = re.sub(r'<polygon points="" class="ro"[^>]*/>', '', cr).replace('stroke="#d8d2c6"', 'stroke="#E9D8A6" stroke-opacity="0.5"').replace('fill="#555555"', 'fill="#E9D8A6"').replace('font-size="10"', 'font-size="12"').replace('fill="#2F7259" fill-opacity="0.25" stroke="#2F7259"', 'fill="#E9D8A6" fill-opacity="0.35" stroke="#FBF8F1"')
cover_svg = cover_svg % cr
# ---- introduzione
intro = '''<section epub:type="preface"><h1>Questo libro</h1>
<p>Questo trattato raccoglie in forma di libro ciò che l'app GinBuilder è diventata strada facendo: le botaniche, l'estrazione, la costruzione di un gin, la percezione sensoriale e il servizio.</p>
<p>È una <strong>prova</strong> con due capitoli, <em>Le botaniche</em> e <em>La percezione</em>, per verificare come il lettore rende le pagine vere: radar, confronti, matrice filtrabile e schemi.</p>
<p>Le parti interattive (i pulsanti di confronto sotto i radar, i filtri della matrice) funzionano nei lettori che eseguono JavaScript, come Kotobee Reader. Negli altri lettori il libro resta completo: i radar sono immagini e tutte le schede sono visibili.</p>
<p class="nota">I profili radar e le molecole sono stime orientative da verificare all'assaggio, come nell'app.</p></section>'''
files.append(('intro', 'intro.xhtml', 'Questo libro', page('Questo libro', intro), False, 1))
# ---- capitolo 1
cats = []
seen = set(); per_cat = {}
for m in MASTER:
    if m['botanica'] in seen: continue
    seen.add(m['botanica']); per_cat.setdefault(m['categoria'], []).append(m)
ORDINE_CAT = ['Agrumi','Semi e spezie','Radici e rizomi','Erbe aromatiche','Fiori','Frutti e bacche','Marine e saline','Specialità e gastronomiche']
cat_list = [c for c in ORDINE_CAT if c in per_cat] + [c for c in per_cat if c not in ORDINE_CAT]
nomi_prof = [m['botanica'] for c in cat_list for m in per_cat[c] if prof(m['botanica'])]
def href_bot(n):
    for c in cat_list:
        if any(m['botanica'] == n for m in per_cat[c]): return 'cap1-%s.xhtml#b-%s' % (slug(c), slug(n))
    if n in ('Mirto foglie', 'Mirto bacche'): return href_bot('Mirto')
    return None
c1 = '''<section epub:type="chapter"><h1>Capitolo 1<br/>Le botaniche</h1>
<p>Le %d botaniche della libreria di GinBuilder, divise in %d famiglie. Ogni scheda riporta il nome botanico, la parte usata, il profilo aromatico, il carattere, la potenza, le molecole da estrarre, il periodo di raccolta e le zone italiane, con il suo radar sugli otto assi.</p>
<h2>Come leggere il radar</h2>
<p>Gli otto assi sono gli stessi dell'app: quattro di gusto, sentiti dalla lingua (<strong>dolce, amaro, acido, salino</strong>), e quattro di aroma, sentiti dal naso (<strong>agrumato, floreale, erbaceo, speziato</strong>). Ogni valore va da 0 a 5. Il radar mostra la <em>forma</em> del profilo, cioè quali note prevalgono, non la quantità: una botanica potente e una delicata possono avere la stessa forma.</p>
%s
<p>Sotto ogni radar ci sono le botaniche dal profilo più vicino: toccandone una, il suo profilo si sovrappone in arancio. Tocca di nuovo per toglierlo.</p>
<h2>Le famiglie</h2><ol class="indice">%s</ol></section>''' % (
    len(seen), len(cat_list), radar([1,0.5,1,0,4,2,2,3], 240),
    ''.join('<li><a href="cap1-%s.xhtml">%s</a> <span class="nota">(%d)</span></li>' % (slug(c), e(c), len(per_cat[c])) for c in cat_list))
files.append(('cap1', 'cap1.xhtml', 'Capitolo 1 · Le botaniche', page('Le botaniche', c1), False, 1))
for c in cat_list:
    body = '<section epub:type="chapter"><h1>%s</h1><p class="nota">%d botaniche · <a href="cap1.xhtml">torna al capitolo</a></p>' % (e(c), len(per_cat[c]))
    for m in per_cat[c]:
        n = m['botanica']; v = prof(n)
        sim = []
        if v:
            sim = sorted(((x, cos(v, prof(x))) for x in nomi_prof if x != n), key=lambda t: -t[1])[:4]
        dose = DOSE.get(n) or {}
        campi = [('Nome botanico', '<em>%s</em>' % e(m.get('nome_botanico') or '—')), ('Parte usata', e(m.get('parte') or '—')),
                 ('Profilo aromatico', e(m.get('profilo') or '—')), ('Carattere', e(m.get('carattere') or '—')),
                 ('Funzione', e(m.get('funzione_op') or '—')),
                 ('Potenza', '%s/10 (intensità %s/5, persistenza %s/5)' % (m.get('potenza10', '—'), m.get('intensita', '—'), m.get('persistenza', '—'))),
                 ('Dose di riferimento', ('%s g per 100 ml, tempo %s' % (str(dose.get('test')).replace('.', ','), e(dose.get('tempo') or m.get('tempo') or '—'))) if dose.get('test') else '—'),
                 ('Raccolta', e(m.get('periodo_raccolta') or '—')), ('Zone in Italia', e(m.get('zone_italia') or '—'))]
        mol = MOL.get(n) or (MOL.get('Mirto foglie') if n == 'Mirto' else None)
        body += '<article class="bot" id="b-%s"><h2>%s %s</h2>' % (slug(n), e(m.get('icona') or ''), e(n))
        if v:
            rid = 'r-' + slug(n)
            body += '<div class="bot-radar">' + radar(v, 220, rid)
            if sim:
                body += '<p class="sim" data-r="%s">Profilo vicino: %s</p>' % (rid, ' '.join(
                    '<button type="button" class="chip" data-v="%s" data-n="%s">%s %d%%</button>' % (','.join(str(x) for x in prof(s)), e(s), e(s), round(cc*100)) for s, cc in sim))
            body += '</div>'
        body += '<dl class="campi">' + ''.join('<dt>%s</dt><dd>%s</dd>' % (k, val) for k, val in campi) + '</dl>'
        if mol: body += '<p class="mol"><strong>Molecole da estrarre.</strong> %s</p>' % e(mol)
        if m.get('effetto_sovra'): body += '<p class="nota">Se si esagera: %s.</p>' % e(m['effetto_sovra'])
        body += '</article>'
    body += '</section>'
    files.append(('c1-' + slug(c), 'cap1-%s.xhtml' % slug(c), c, page(c, body, True), True, 2))
# ---- capitolo 2
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
    # applica le regole CSS (.classe, .padre elemento) come attributi di presentazione dentro gli SVG
    def fai(m):
        svg = m.group(0); pila = []
        def tag(mt):
            t = mt.group(0)
            if t.startswith('</'):
                if pila: pila.pop()
                return t
            nome = re.match(r'<([\w:-]+)', t).group(1)
            cls = set((re.search(r'class="([^"]*)"', t) or [None, ''])[1].split())
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
        return re.sub(r'</?[\w:-]+[^>]*>', tag, svg)
    return re.sub(r'<svg[\s\S]*?</svg>', fai, xh)
def pulisci(xh):
    xh = re.sub(r'<button[^>]*howto-chiudi[^>]*>.*?</button>', '', xh, flags=re.S)
    xh = re.sub(r'\s(aria-labelledby)="[^"]*"', '', xh)
    xh = xh.replace(' xmlns="http://www.w3.org/1999/xhtml"', '')
    xh = re.sub(r'<div class="howto-body">', '<div>', xh, count=1)
    xh = re.sub(r'<h4 class="can-tit">', '<h3>', xh).replace('</h4>', '</h3>')
    xh = xh.replace('<svg viewBox', '<svg xmlns="http://www.w3.org/2000/svg" viewBox')
    return svg_attributi(xh)
c2 = '''<section epub:type="chapter"><h1>Capitolo 2<br/>La percezione</h1>
<p>Come un gin arriva al cervello: i quattro sistemi sensoriali, i recettori e i canali che leggono le molecole, e la matrice che collega ogni sentore alle sue molecole e alle botaniche che le portano.</p>
<ol class="indice"><li><a href="cap2-sistemi.xhtml">Quattro sistemi, un solo sapore</a></li><li><a href="cap2-canali.xhtml">I canali e dove si trovano</a></li><li><a href="cap2-matrice.xhtml">La matrice dei sentori</a></li></ol></section>'''
files.append(('cap2', 'cap2.xhtml', 'Capitolo 2 · La percezione', page('La percezione', c2), False, 1))
files.append(('c2-sis', 'cap2-sistemi.xhtml', 'Quattro sistemi, un solo sapore', page('Quattro sistemi', '<section><h1>Quattro sistemi, un solo sapore</h1>%s</section>' % pulisci(D['QUATTRO'])), False, 2))
files.append(('c2-can', 'cap2-canali.xhtml', 'I canali e dove si trovano', page('I canali', '<section><h1>I canali e dove si trovano</h1>%s</section>' % pulisci(D['CANALI'])), False, 2))
SENSI = {'gusto': ('Gusto', 'lingua'), 'olfatto': ('Olfatto', 'naso'), 'trigemino': ('Trigemino', 'caldo, freddo, pungente'), 'tatto': ('Tatto', 'meccanico')}
ASSI_M = ASSI + ['Struttura']
def botlinks(lista):
    out = []
    for b in lista.split(','):
        b = b.strip(); h = href_bot(b)
        out.append('<a href="%s">%s</a>' % (h, e(b)) if h else e(b))
    return ', '.join(out)
grid = '<table class="mgrid"><thead><tr><th></th>%s</tr></thead><tbody>%s</tbody></table>' % (
    ''.join('<th class="s-%s">%s</th>' % (k, v[0]) for k, v in SENSI.items()),
    ''.join('<tr><th>%s</th>%s</tr>' % (a, ''.join(
        ('<td><button type="button" class="cella s-%s" data-a="%s" data-k="%s">%d</button></td>' % (k, a, k, n)) if n else '<td class="vuota">·</td>'
        for k in SENSI for n in [sum(1 for x in MAT if x['a'] == a and x['k'] == k)])) for a in ASSI_M))
cards = ''.join(
    '<article class="sent s-%s" data-a="%s" data-k="%s"><h2>%s</h2><p class="nota">%s · asse del radar: %s</p><table class="mol"><thead><tr><th>Molecole</th><th>Botaniche</th></tr></thead><tbody>%s</tbody></table><p><strong>Recettori.</strong> %s%s</p><p>%s</p></article>' % (
        x['k'], e(x['a']), x['k'], e(x['s']), SENSI[x['k']][0] + ' (' + SENSI[x['k']][1] + ')', e(x['a']),
        ''.join('<tr><td>%s</td><td>%s</td></tr>' % (e(mm[0]), botlinks(mm[1])) for mm in x['m']), e(x['r']),
        (' <a href="cap2-canali.xhtml">Dove si trovano →</a>' if re.search(r'TRP|OTOP1|ENaC|KCNK', x['r']) else ''), e(x['n'])) for x in MAT)
mat = '''<section><h1>La matrice dei sentori</h1>
<p>Per ogni sentore: le molecole responsabili, le botaniche che le portano e i recettori che le leggono. La griglia incrocia gli assi del radar con i quattro sistemi sensoriali: tocca una casella per vedere solo quei sentori, tocca di nuovo per vederli tutti.</p>
%s
<p class="cerca"><label for="mq">Cerca una botanica o una molecola</label><input type="search" id="mq" placeholder="es. ginepro, linalolo"/></p>
<p class="nota" id="mconta">%d sentori</p>
%s
<p class="nota">Per la maggior parte delle molecole d'aroma non esiste un recettore unico: vale il codice combinatorio dei circa 400 recettori olfattivi. Un recettore specifico è indicato solo dove la corrispondenza è accertata.</p></section>''' % (grid, len(MAT), cards)
files.append(('c2-mat', 'cap2-matrice.xhtml', 'La matrice dei sentori', page('La matrice dei sentori', mat, True), True, 2))
# ---- nav
toc = '<ol>'; open_sub = False
for i, (fid, href, title, _, _, lvl) in enumerate(files):
    nxt = files[i+1][5] if i+1 < len(files) else 1
    if lvl == 1:
        toc += '<li><a href="%s">%s</a>' % (href, e(title))
        if nxt == 2: toc += '<ol>'
        else: toc += '</li>'
    else:
        toc += '<li><a href="%s">%s</a></li>' % (href, e(title))
        if nxt == 1: toc += '</ol></li>'
toc += '</ol>'
nav = page('Indice', '<nav epub:type="toc" id="toc"><h1>Indice</h1>%s</nav>' % toc)
# ---- opf
oggi = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
man = ['<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>',
       '<item id="css" href="libro.css" media-type="text/css"/>', '<item id="js" href="libro.js" media-type="application/javascript"/>',
       '<item id="cover" href="copertina.svg" media-type="image/svg+xml" properties="cover-image"/>',
       '<item id="coverp" href="copertina.xhtml" media-type="application/xhtml+xml" properties="svg"/>']
spine = ['<itemref idref="coverp"/>', '<itemref idref="nav"/>']
for fid, href, title, xh, scr, lvl in files:
    props = ' '.join(p for p in (['scripted'] if scr else []) + (['svg'] if '<svg' in xh else []))
    man.append('<item id="%s" href="%s" media-type="application/xhtml+xml"%s/>' % (fid, href, (' properties="%s"' % props) if props else ''))
    spine.append('<itemref idref="%s"/>' % fid)
opf = '''<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid" xml:lang="it">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="uid">urn:uuid:5b7d2c1e-8a4f-4c3b-9e21-6f0a1d3b7c42</dc:identifier>
<dc:title>Trattato del gin compound · prova</dc:title><dc:creator>Benedetto Sgroi</dc:creator><dc:language>it</dc:language>
<meta property="dcterms:modified">%s</meta><meta name="cover" content="cover"/></metadata>
<manifest>%s</manifest><spine>%s</spine></package>''' % (oggi, ''.join(man), ''.join(spine))
coverp = page('Copertina', '<div class="copertina">%s</div>' % cover_svg.replace('width="600" height="900"', ''))
with zipfile.ZipFile(OUT, 'w') as z:
    z.writestr(zipfile.ZipInfo('mimetype'), 'application/epub+zip', compress_type=zipfile.ZIP_STORED)
    def w(name, data): z.writestr(name, data, compress_type=zipfile.ZIP_DEFLATED)
    w('META-INF/container.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>')
    w('OEBPS/content.opf', opf); w('OEBPS/nav.xhtml', nav); w('OEBPS/libro.css', CSS); w('OEBPS/libro.js', JS)
    w('OEBPS/copertina.svg', '<?xml version="1.0" encoding="UTF-8"?>\n' + cover_svg); w('OEBPS/copertina.xhtml', coverp)
    for fid, href, title, xh, scr, lvl in files: w('OEBPS/' + href, xh)
print('ok', OUT, len(files), 'pagine')
