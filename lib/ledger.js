/* manjo: Rechnen für Rechnungen. Reine Funktionen, global verfügbar.
   Eine Ausgabe: {cents, payer, parts: [E-Mails], kind: 'expense' | 'settle', spent: 'JJJJ-MM-TT', lines: [{n, c, cat}]}
   Ein Ausgleich ist eine Ausgabe der Schuldnerin an die Gläubigerin: payer = wer zahlt, parts = [wer das Geld bekommt]. */

function settleUp(expenses, people){
  var paid = {}, owed = {}, total = 0, count = 0;
  expenses.forEach(function(e){
    if(e.kind !== 'settle'){ total += e.cents; count++; }
    paid[e.payer] = (paid[e.payer] || 0) + e.cents;
    var n = e.parts.length;
    if(!n) return;
    var base = Math.floor(e.cents / n), rem = e.cents - base * n;
    e.parts.forEach(function(p, i){ owed[p] = (owed[p] || 0) + base + (i < rem ? 1 : 0); });
  });
  var names = {}, bal = {};
  (people || []).concat(Object.keys(paid), Object.keys(owed)).forEach(function(p){ names[p] = 1; });
  Object.keys(names).forEach(function(p){ bal[p] = (paid[p] || 0) - (owed[p] || 0); });
  var debtors = [], creditors = [];
  Object.keys(bal).forEach(function(p){
    if(bal[p] < 0) debtors.push({p: p, c: -bal[p]});
    else if(bal[p] > 0) creditors.push({p: p, c: bal[p]});
  });
  debtors.sort(function(a, b){ return b.c - a.c || (a.p < b.p ? -1 : 1); });
  creditors.sort(function(a, b){ return b.c - a.c || (a.p < b.p ? -1 : 1); });
  var lines = [], i = 0, j = 0;
  while(i < debtors.length && j < creditors.length){
    var x = Math.min(debtors[i].c, creditors[j].c);
    lines.push({from: debtors[i].p, to: creditors[j].p, cents: x});
    debtors[i].c -= x; creditors[j].c -= x;
    if(debtors[i].c === 0) i++;
    if(creditors[j].c === 0) j++;
  }
  return {total: total, count: count, bal: bal, lines: lines};
}

/* Summen je Kategorie in einem Monat. keyOf(expense, cat) liefert den Anzeigenamen der Kategorie.
   Was keiner Position zugeordnet ist, landet unter dem leeren Schlüssel. Ausgleiche zählen nicht. */
function catSplit(expenses, month, keyOf){
  var map = {}, total = 0;
  expenses.forEach(function(e){
    if(e.kind === 'settle' || String(e.spent || '').slice(0, 7) !== month) return;
    total += e.cents;
    var sumL = 0;
    (e.lines || []).forEach(function(x){ var k = keyOf(e, x.cat); map[k] = (map[k] || 0) + x.c; sumL += x.c; });
    var rest = e.cents - sumL;
    if(rest) map[''] = (map[''] || 0) + rest;
  });
  return {map: map, total: total};
}
