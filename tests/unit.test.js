// Unit-Tests für die reinen Funktionen in lib/. Aufruf: node tests/unit.test.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const load = (files, names) => new Function(files.map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n') + ';return {' + names.join(',') + '}')();

const L = load(['lib/classify.js', 'lib/drag.js', 'lib/receipt.js', 'lib/ledger.js', 'lib/items.js'],
  ['classify', 'TPLS', 'norm', 'dragTarget', 'dragFinal', 'dragShift', 'parseReceipt', 'toCents', 'settleUp', 'catSplit', 'splitQty', 'matchReceipt']);

let fails = 0, count = 0;
const eq = (got, want, msg) => {
  count++;
  if (JSON.stringify(got) !== JSON.stringify(want)) { fails++; console.log('FAIL', msg, '\n  got ', JSON.stringify(got), '\n  want', JSON.stringify(want)); }
};
const ST = t => L.TPLS[t].stations;

// --- Zuordnung zu Stationen ---
const sm = {Hafermilch:'milch',Spülmittel:'haushalt',Bananen:'obst',Spaghetti:'nudeln',Brezn:'brot',Orangensaft:'getraenke',Hackfleisch:'fleisch',Tiefkühlpizza:'tk',Paradeiser:'obst',Windeln:'baby',Zahnpasta:'haushalt',Gouda:'milch',
  '2 Liter Milch':'milch',Kokosmilch:'nudeln',Eier:'milch',Ei:'milch',Kaffeebohnen:'fruehstueck',Currywurst:'fleisch',Kartoffelchips:'suess',Schweinefilet:'fleisch',Weizenmehl:'nudeln',Weintrauben:'obst',Studentenfutter:'suess',Flammkuchen:'tk',Wassermelone:'obst',Mineralwasser:'getraenke',Insektenspray:'sonst',Butter:'milch',Erdnussbutter:'fruehstueck','Grüner Tee':'fruehstueck',Eistee:'getraenke',Klopapier:'haushalt',Brokkoli:'obst','Creme fraiche':'milch',Schokolade:'suess',Feuchttücher:'baby',Äpfel:'obst',Olivenöl:'nudeln',Öl:'nudeln',Rotwein:'getraenke',Dosentomaten:'nudeln',Tomaten:'obst',Müsli:'fruehstueck',Quark:'milch',Schinken:'fleisch',Lauch:'obst',Knoblauch:'obst',Xyz:'sonst'};
for (const [k, v] of Object.entries(sm)) eq(L.classify(k, null, 'supermarkt', ST('supermarkt')), v, 'supermarkt ' + k);
const more = {baumarkt:{Schrauben:'befest',Wandfarbe:'farben',Dübel:'befest',Silikon:'sanitaer',Holzleim:'holz',Akkuschrauber:'werkzeug',Blumenerde:'garten',Steckdose:'elektro',Gartenschlauch:'garten',Pinsel:'farben',Xyz:'sonst'},
  ikea:{Teelichter:'deko',Kissen:'textil',Aufbewahrungsbox:'aufbew',Köttbullar:'schwede','Billy Regal':'moebel',Weingläser:'kueche',Glühbirne:'licht',Bettwäsche:'textil'},
  drogerie:{Shampoo:'haare',Zahnpasta:'zahn',Duschgel:'koerper',Windeln:'baby',Spülmittel:'haushalt',Tampons:'hygiene',Taschentücher:'hygiene',Müsliriegel:'food'}};
for (const [t, m] of Object.entries(more)) for (const [k, v] of Object.entries(m)) eq(L.classify(k, null, t, ST(t)), v, t + ' ' + k);
const own = [{id:'s1',name:'Pflanzen'},{id:'sonst',name:'Sonstiges'}];
eq(L.classify('Zimmerpflanzen', null, 'eigen', own), 's1', 'eigene Station');
eq(L.classify('Hammer', null, 'eigen', own), 'sonst', 'eigene Liste Rückfall');
eq(L.classify('Pizza', null, 'supermarkt', ST('supermarkt').filter(s => s.id !== 'tk')), 'sonst', 'gelöschte Station');
eq(L.classify('Pizza', {pizza:'baby'}, 'supermarkt', ST('supermarkt')), 'baby', 'gelernt');
eq(L.classify('Pizza', {pizza:'gone'}, 'supermarkt', ST('supermarkt')), 'tk', 'ungültig Gelerntes ignoriert');

// --- Ziehen ---
const rects = [0,1,2,3,4].map(k => ({top: k * 72, h: 64}));
eq(L.dragTarget(rects, 1, 0), 1, 'drag keine Bewegung');
eq(L.dragTarget(rects, 1, 150), 3, 'drag nach unten');
eq(L.dragTarget(rects, 3, -150), 1, 'drag nach oben');
eq(L.dragTarget(rects, 0, 1000), 4, 'drag ans Ende');
eq(L.dragFinal(rects, 1, 3), 144, 'drag Endlage');
eq(L.dragShift(rects, 1, 3, 2, 8), -72, 'drag Nachbar rutscht');
eq(L.dragShift(rects, 3, 1, 1, 8), 72, 'drag Nachbar rutscht hoch');

// --- Kassenzettel ---
eq(L.toCents('1,29'), 129, 'Cent Komma'); eq(L.toCents('12.50'), 1250, 'Cent Punkt'); eq(L.toCents('1.234,50'), 123450, 'Cent Tausender');
const r1 = L.parseReceipt('REWE\n12.03.2026\nBANANEN\n1,29 A\nHAFERMILCH 1,09 A\nSPÜLMITTEL 1,98\n2 x 0,99 1,98\nSUMME EUR 4,36\nBAR 5,00\nRÜCKGELD 0,64');
eq(r1.date, '2026-03-12', 'Bon Datum'); eq(r1.total, 436, 'Bon Summe');
eq(r1.items.map(i => i.n + ':' + i.c), ['BANANEN:129', 'HAFERMILCH:109', 'SPÜLMITTEL:198'], 'Bon Positionen');
const r2 = L.parseReceipt('Gemüse\nKAROTTEN 2 x 0,79 1,58\nSUMME 1,58 EUR\n03.11.25');
eq([r2.date, r2.total], ['2025-11-03', 158], 'Bon kurzes Jahr');
eq(r2.items.map(i => i.n + ':' + i.c), ['KAROTTEN:158'], 'Bon Menge im Namen');

// --- Mengen ---
eq(L.splitQty('3 Bananen'), {qty:'3', base:'Bananen'}, 'Menge vorn');
eq(L.splitQty('2x Brezn'), {qty:'2×', base:'Brezn'}, 'Menge mal');
eq(L.splitQty('Milch 2 l'), {qty:'2 l', base:'Milch'}, 'Menge hinten mit Einheit');
eq(L.splitQty('500 g Hackfleisch'), {qty:'500 g', base:'Hackfleisch'}, 'Gramm');
eq(L.splitQty('1 Liter Milch'), {qty:'1 l', base:'Milch'}, 'Liter');
eq(L.splitQty('3 Gurken'), {qty:'3', base:'Gurken'}, 'kein Einheiten-Fehlgriff');
eq(L.splitQty('Bananen'), {qty:'', base:'Bananen'}, 'ohne Menge');
eq(L.splitQty('7up'), {qty:'', base:'7up'}, 'Zahl im Wort');
eq(L.splitQty('42'), {qty:'', base:'42'}, 'nur Zahl');

// --- Abgleich Bon mit Liste ---
const items = [{id:'a', name:'Bananen'}, {id:'b', name:'2 Hafermilch'}, {id:'c', name:'Spülmittel'}, {id:'d', name:'Brot'}, {id:'e', name:'Kaffee'}];
eq(L.matchReceipt(['BANANEN', 'HAFERMI. DRINK', 'SPUELMITTEL', 'TOMATEN'], items, L.norm), ['a', 'b', 'c'], 'Bon trifft Liste');
eq(L.matchReceipt([], items, L.norm), [], 'leerer Bon');

// --- Saldo und Ausgleich ---
const me = 'me@x.de', fr = 'frau@x.de';
const ex = [
  {cents: 3000, payer: me, parts: [me], kind: 'expense', spent: '2026-10-01', lines: []},
  {cents: 1000, payer: me, parts: [me, fr], kind: 'expense', spent: '2026-10-02', lines: [{n:'Bananen', c: 400, cat:'obst'}]}
];
let s = L.settleUp(ex, [me, fr]);
eq([s.total, s.count, s.bal[me], s.bal[fr]], [4000, 2, 500, -500], 'Saldo');
eq(s.lines, [{from: fr, to: me, cents: 500}], 'wer schuldet wem');
ex.push({cents: 500, payer: fr, parts: [me], kind: 'settle', spent: '2026-10-03', lines: []});
s = L.settleUp(ex, [me, fr]);
eq([s.total, s.count, s.bal[me], s.bal[fr], s.lines.length], [4000, 2, 0, 0, 0], 'Ausgleich gleicht aus und zählt nicht als Einkauf');
const odd = L.settleUp([{cents: 1001, payer: me, parts: [me, fr, 'c@x.de'], kind: 'expense'}], []);
eq(Object.values(odd.bal).reduce((a, b) => a + b, 0), 0, 'Cent-Rest geht auf');

// --- Kategorien ---
const c = L.catSplit(ex, '2026-10', (e, cat) => ({obst: 'Obst & Gemüse'})[cat] || 'Sonstiges');
eq(c, {map: {'': 3600, 'Obst & Gemüse': 400}, total: 4000}, 'Kategorien ohne Ausgleich');
eq(L.catSplit(ex, '2026-09', () => 'x'), {map: {}, total: 0}, 'anderer Monat');

console.log(fails ? fails + ' von ' + count + ' Prüfungen fehlgeschlagen' : 'Alle ' + count + ' Prüfungen bestanden');
process.exitCode = fails ? 1 : 0;
