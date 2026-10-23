/* manjo: Kassenzettel lesen. */
function toCents(s){
  var v = String(s);
  if(v.indexOf(',') >= 0) v = v.replace(/\./g, '').replace(',', '.');
  return Math.round(parseFloat(v) * 100);
}
function parseReceipt(text){
  var rows = String(text || '').split(/\n/).map(function(s){ return s.replace(/\s+/g, ' ').trim(); }).filter(Boolean);
  var out = {date: null, total: null, items: []}, pending = '';
  var PRICE = /(-?\d{1,4}[.,]\d{2})\s*(?:€|EUR|[A-Za-z*]{1,2})?\s*$/i;
  var SKIP = /(\bbar\b|gegeben|rück|rueck|zurück|\bec\b|karte|visa|master|mwst|\bust\b|netto|brutto|steuer|%|kassen|beleg|datum|\buhr\b|filiale|\btel\b)/i;
  rows.forEach(function(r){
    var dm = r.match(/(\d{2})\.(\d{2})\.(\d{4}|\d{2})/);
    if(dm){
      if(!out.date) out.date = (dm[3].length === 2 ? '20' + dm[3] : dm[3]) + '-' + dm[2] + '-' + dm[1];
      if(!/[A-Za-z]/.test(r)) return;
    }
    var pm = r.match(PRICE);
    if(!pm){
      if(/[A-Za-zÄÖÜäöüß]{3,}/.test(r) && !SKIP.test(r)) pending = r;
      return;
    }
    var cents = toCents(pm[1]);
    if(!cents) return;
    if(/(summe|gesamt|total|zu zahlen|betrag)/i.test(r)){ out.total = Math.abs(cents); pending = ''; return; }
    var name = r.slice(0, r.length - pm[0].length).replace(/\s+/g, ' ').trim()
      .replace(/^\d+\s*[xX×]\s*\d+[.,]\d{2}\s*/, '')
      .replace(/^\d+\s*[xX×]\s*/, '')
      .replace(/\s+\d+\s*[xX×]\s*\d+[.,]\d{2}\s*$/, '')
      .replace(/\d+[.,]\d{2}\s*$/, '')
      .replace(/[\s.:*-]+$/, '').trim();
    if(!name && pending) name = pending;
    pending = '';
    if(!name || SKIP.test(name)) return;
    out.items.push({n: name, c: cents});
  });
  return out;
}
