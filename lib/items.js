/* manjo: Mengen in Artikelnamen und Abgleich von Kassenzetteln mit der Liste. Reine Funktionen. */

var QTY_UNIT = '(x|×|stk\\.?|stück|kg|g|l|ml|liter|pck\\.?|packung(?:en)?|dosen?|flaschen?|bund|becher|gläser|glas)';
var QTY_LEAD = new RegExp('^(\\d+(?:[.,]\\d+)?)\\s*' + QTY_UNIT + '?\\s+(.+)$', 'i');
var QTY_TAIL = new RegExp('^(.+?)\\s+(\\d+(?:[.,]\\d+)?)\\s*' + QTY_UNIT + '?$', 'i');
var HAS_LETTER = /[A-Za-zÄÖÜäöüß]/;

function fmtQty(n, u){
  if(!u) return n;
  var x = u.toLowerCase();
  if(x === 'x' || x === '×') return n + '×';
  if(x === 'liter') return n + ' l';
  if(x === 'stück' || x.indexOf('stk') === 0) return n + ' Stk.';
  return n + ' ' + x;
}

/* "3 Bananen" -> {qty:'3', base:'Bananen'}, "Milch 2 l" -> {qty:'2 l', base:'Milch'}, "2x Brezn" -> {qty:'2×', base:'Brezn'} */
function splitQty(name){
  var s = String(name || '').trim().replace(/\s+/g, ' ');
  var m = s.match(QTY_LEAD);
  if(m && HAS_LETTER.test(m[3])) return {qty: fmtQty(m[1], m[2]), base: m[3].trim()};
  m = s.match(QTY_TAIL);
  if(m && HAS_LETTER.test(m[1])) return {qty: fmtQty(m[2], m[3]), base: m[1].trim()};
  return {qty: '', base: s};
}

/* Welche offenen Artikel tauchen auf dem Kassenzettel auf? names: erkannte Positionsnamen, items: [{id, name}].
   normFn ist norm() aus classify.js. Abkürzungen wie "HAFERMI. DRINK" treffen über den Wortanfang. */
function matchReceipt(names, items, normFn){
  var k = function(s){ return normFn(s).replace(/ae/g, 'a').replace(/oe/g, 'o').replace(/ue/g, 'u').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(); };
  var lines = names.map(k).filter(Boolean);
  var out = [];
  items.forEach(function(it){
    var b = k(splitQty(it.name).base);
    if(b.length < 3) return;
    var first = b.split(' ')[0];
    var hit = lines.some(function(l){
      if(l.indexOf(b) >= 0) return true;
      if(l.length >= 4 && b.indexOf(l) >= 0) return true;
      var lf = l.split(' ')[0];
      return first.length >= 4 && lf.length >= 4 && (lf.indexOf(first) === 0 || first.indexOf(lf) === 0);
    });
    if(hit) out.push(it.id);
  });
  return out;
}

/* Wörter für den Vergleich: klein, ohne Umlaute und Satzzeichen */
function wordsOf(s, normFn){
  return normFn(s).replace(/ae/g, 'a').replace(/oe/g, 'o').replace(/ue/g, 'u').replace(/[^a-z0-9 ]+/g, ' ').split(' ').filter(Boolean);
}
/* Passt eine Kassenzeile zu einem Begriff? Jedes Wort des Begriffs (ab 3 Zeichen) muss ein Wort der Zeile
   anfangen oder von ihm angefangen werden. "Milch" passt zu "MILCH 3,5%", aber nicht zu "HAFERMILCH";
   "Hafermilch" passt zu "HAFERMI. DRINK". */
function nameMatches(line, term, normFn){
  var lt = wordsOf(line, normFn), tt = wordsOf(term, normFn).filter(function(w){ return w.length >= 3; });
  if(!tt.length || !lt.length) return false;
  return tt.every(function(w){
    return lt.some(function(t){ return t.indexOf(w) === 0 || (t.length >= 4 && w.indexOf(t) === 0); });
  });
}
/* Letzter Preis je Markt aus den Kassenzetteln, günstigster zuerst.
   terms: Begriffe für den Artikel (Name, Schreibweisen vom Bon), expenses: Ausgaben mit lines. */
function pricesFor(terms, expenses, normFn){
  var best = {};
  terms = (terms || []).filter(Boolean);
  expenses.forEach(function(e){
    if(e.kind === 'settle') return;
    (e.lines || []).forEach(function(x){
      if(!(x.c > 0) || !terms.some(function(t){ return nameMatches(x.n, t, normFn); })) return;
      var cur = best[e.list], d = String(e.spent || '');
      if(!cur || d > cur.date) best[e.list] = {list: e.list, c: x.c, date: d, n: x.n};
    });
  });
  return Object.keys(best).map(function(k){ return best[k]; }).sort(function(a, b){ return a.c - b.c || (a.date < b.date ? 1 : -1); });
}
