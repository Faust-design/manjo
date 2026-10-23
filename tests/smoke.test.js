// Ablauftest der ganzen App in jsdom mit einem nachgebauten Supabase. Aufruf: node tests/smoke.test.js
const {JSDOM} = require('jsdom');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

const html = read('index.html').replace(/<script[^>]*src="[^"]*"[^>]*><\/script>/g, '');
const dom = new JSDOM(html, {runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://manjo.test/'});
const w = dom.window, d = w.document;
w.CSS = {escape: s => String(s).replace(/"/g, '\\"')};
w.HTMLElement.prototype.scrollIntoView = function(){};

// ---- nachgebautes Supabase ----
const db = {lists: [], list_members: [], items: [], expenses: [], profiles: []};
const net = {offline: false, failExpense: null};
let n = 0;
const ME = {id: 'u1', email: 'me@x.de'};
function q(table){
  const o = {t: table, op: 'select', f: [], row: null, single: false,
    select(){ return o; }, order(){ return o; }, range(){ return o; },
    insert(r){ o.op = 'insert'; o.row = r; return o; },
    update(r){ o.op = 'update'; o.row = r; return o; },
    upsert(r){ o.op = 'upsert'; o.row = r; return o; },
    delete(){ o.op = 'delete'; return o; },
    eq(k, v){ o.f.push(r => r[k] === v); return o; },
    in(k, v){ o.f.push(r => v.includes(r[k])); return o; },
    single(){ o.single = true; return o; },
    then(res, rej){
      try{
        if(net.offline) return Promise.resolve({data: null, error: {message: 'TypeError: Failed to fetch'}}).then(res, rej);
        if(o.t === 'expenses' && o.op === 'insert' && net.failExpense) return Promise.resolve({data: null, error: net.failExpense}).then(res, rej);
        const T = db[o.t]; let data = null, error = null;
        if(o.op === 'insert'){
          const r = Object.assign({id: 'id' + (++n), created_at: new Date(Date.now() + n).toISOString()}, o.row);
          if(o.t === 'lists'){ r.owner = ME.id; r.owner_email = ME.email; }
          if(o.t === 'items' && T.some(x => x.id === r.id || (x.list_id === r.list_id && x.name.toLowerCase() === r.name.toLowerCase()))) error = {code: '23505', message: 'duplicate key'};
          else { T.push(r); data = o.single ? r : [r]; }
        } else if(o.op === 'upsert'){
          const i = T.findIndex(x => x.id === o.row.id);
          if(i >= 0) Object.assign(T[i], o.row); else T.push(Object.assign({}, o.row));
        } else if(o.op === 'update'){
          T.filter(r => o.f.every(f => f(r))).forEach(r => Object.assign(r, o.row));
        } else if(o.op === 'delete'){
          db[o.t] = T.filter(r => !o.f.every(f => f(r)));
        } else data = T.filter(r => o.f.every(f => f(r))).map(r => Object.assign({}, r));
        return Promise.resolve({data, error}).then(res, rej);
      }catch(e){ return Promise.reject(e).then(res, rej); }
    }};
  return o;
}
let authCb;
w.supabase = {createClient: () => ({
  from: q,
  auth: {
    onAuthStateChange(cb){ authCb = cb; },
    getSession: async () => ({data: {session: null}}),
    signInWithPassword: async () => { authCb('SIGNED_IN', {user: ME}); return {data: {}, error: null}; },
    signUp: async () => ({data: {session: null}, error: null}),
    signOut: async () => { authCb('SIGNED_OUT', null); }
  },
  channel(){ const c = {on(){ return c; }, subscribe(cb){ setTimeout(() => cb('SUBSCRIBED'), 5); return c; }}; return c; },
  removeChannel(){}
})};
w.EINKAUF_CONFIG = {url: 'https://x.supabase.co', key: 'k'};
const errs = [];
w.addEventListener('error', e => errs.push(e.message));
['lib/classify.js', 'lib/drag.js', 'lib/receipt.js', 'lib/ledger.js', 'lib/items.js', 'app.js'].forEach(f => w.eval(read(f)));

// ---- Helfer ----
const sleep = ms => new Promise(r => setTimeout(r, ms));
const Q = s => d.querySelector(s), QA = s => [...d.querySelectorAll(s)];
const click = el => { if(!el) throw new Error('Element fehlt'); el.dispatchEvent(new w.MouseEvent('click', {bubbles: true, cancelable: true})); };
const submit = el => { if(!el) throw new Error('Formular fehlt'); el.dispatchEvent(new w.Event('submit', {bubbles: true, cancelable: true})); };
const type = (el, v) => { if(!el) throw new Error('Feld fehlt'); el.value = v; el.dispatchEvent(new w.Event('input', {bubbles: true})); };
const change = el => el.dispatchEvent(new w.Event('change', {bubbles: true}));
const nav = v => click(Q('[data-act="nav"][data-view="' + v + '"]'));
const mainText = () => Q('#main').textContent.replace(/\s+/g, ' ');
let fails = 0, count = 0;
const ok = (c, m) => { count++; if(!c){ fails++; console.log('FAIL ' + m); } else console.log('ok   ' + m); };

(async () => {
  await sleep(50);
  ok(!Q('#auth').hidden, 'Anmeldung sichtbar');
  type(Q('#authEmail'), ME.email); type(Q('#authPw'), 'secret123'); submit(Q('#authForm'));
  await sleep(80);
  ok(Q('#auth').hidden, 'angemeldet');
  ok(/Noch keine Liste/.test(mainText()), 'leerer Zustand ohne Liste');
  ok(Q('#hint').hidden, 'Hinweiszeile versteckt, solange nicht getippt wird');

  // Märkte anlegen
  click(Q('[data-act="new-list-open"]')); await sleep(20);
  submit(Q('#newListForm')); await sleep(60);
  ok(QA('.tab').length === 1 && /Supermarkt/.test(Q('.tab').textContent), 'erster Markt als Tab');
  nav('markets'); await sleep(20);
  ok(QA('.mk').length === 1, 'Märkte-Ansicht listet Markt');
  click(Q('[data-act="new-list-open"]')); await sleep(20);
  click(Q('[data-act="tpl"][data-tpl="baumarkt"]')); submit(Q('#newListForm')); await sleep(60);
  ok(QA('.tab').length === 2, 'zweiter Markt');

  // Import mit Duplikat
  click(Q('[data-act="import"]')); await sleep(20);
  type(Q('#impText'), 'Schrauben\nWandfarbe, Dübel\nAkkuschrauber\nSchrauben'); await sleep(10);
  ok(/4 Artikel/.test(Q('#impAdd').textContent), 'Import erkennt 4 neue Artikel');
  click(Q('#impAdd')); await sleep(120);
  ok(+QA('.tab .tc')[1].textContent === 4, 'Zähler am Tab = 4');
  ok(db.items.length === 4, 'Artikel in der Datenbank (Warteschlange gesendet)');

  // Mengen
  click(QA('.tab')[0]); await sleep(20);
  type(Q('#newItem'), '3 Bananen');
  ok(!Q('#hint').hidden && /Obst/.test(Q('#hint').textContent), 'Hinweis zeigt Station beim Tippen');
  submit(Q('#addForm')); await sleep(80);
  ok(Q('.qty') && Q('.qty').textContent === '3' && Q('.name').textContent === 'Bananen', 'Menge als Etikett');
  type(Q('#newItem'), 'Bananen 5'); submit(Q('#addForm')); await sleep(80);
  ok(QA('.item').length === 1 && Q('.qty').textContent === '5', 'Menge wird aktualisiert statt doppelt');

  // Artikel bearbeiten per Tipp auf den Namen
  click(Q('.name-btn')); await sleep(20);
  ok(!Q('#overlay').hidden && Q('#itemName').value === 'Bananen 5', 'Tipp auf Namen öffnet Bearbeiten');
  type(Q('#itemName'), '2 Bananen'); submit(Q('#itemForm')); await sleep(80);
  ok(db.items.some(i => i.name === '2 Bananen'), 'Name gespeichert');
  click(Q('.name-btn')); await sleep(20);
  click(Q('[data-act="cat"][data-cat="suess"]')); await sleep(80);
  ok(db.lists[0].learned && db.lists[0].learned.bananen === 'suess', 'Station gelernt (ohne Menge)');
  ok(/Süßes/.test(mainText()), 'Artikel steht unter neuer Station');

  // Abhaken bleibt auf dem Kreis
  click(Q('.box-btn')); await sleep(420);
  ok(db.items.some(i => i.name === '2 Bananen' && i.done), 'Kreis hakt ab');

  // Löschen mit Rückgängig
  click(Q('[data-act="clear-done"]')); await sleep(20);
  ok(!Q('#toast').hidden, 'Rückgängig-Meldung erscheint');
  ok(!QA('.item').length, 'Artikel ausgeblendet');
  click(Q('[data-act="undo"]')); await sleep(20);
  ok(QA('.item').length === 1 && Q('#toast').hidden, 'Rückgängig stellt wieder her');
  click(Q('.name-btn')); await sleep(20);
  click(Q('[data-act="delete"]')); await sleep(5300);
  ok(!db.items.some(i => i.name === '2 Bananen'), 'nach 5 Sekunden endgültig gelöscht');

  // Offline
  net.offline = true;
  type(Q('#newItem'), 'Milch'); submit(Q('#addForm')); await sleep(80);
  ok(QA('.item').some(li => /Milch/.test(li.textContent)), 'offline: Artikel erscheint sofort');
  ok(/Offline/.test(Q('#syncText').textContent), 'offline: Anzeige "Offline · 1 offen"');
  ok(JSON.parse(w.localStorage.getItem('manjo-queue-u1')).length === 1, 'offline: in der Warteschlange gespeichert');
  net.offline = false;
  w.dispatchEvent(new w.Event('online')); await sleep(120);
  ok(db.items.some(i => i.name === 'Milch'), 'online: Warteschlange gesendet');
  ok(JSON.parse(w.localStorage.getItem('manjo-queue-u1')).length === 0, 'online: Warteschlange leer');

  // Doppelter Artikel von einem anderen Gerät
  db.items.push({id: 'other', list_id: db.lists[0].id, name: 'Brot', cat: 'brot', done: false, created_at: new Date().toISOString()});
  type(Q('#newItem'), 'Brot'); submit(Q('#addForm')); await sleep(400);
  ok(db.items.filter(i => i.name === 'Brot').length === 1, 'Datenbank verhindert Dublette');
  ok(QA('.item').filter(li => /Brot/.test(li.textContent)).length === 1, 'nach Abgleich nur ein Brot');

  // Name und Einladung
  nav('account'); await sleep(20);
  type(Q('#myName'), 'Alex'); submit(Q('#nameForm')); await sleep(40);
  ok(db.profiles.some(p => p.display_name === 'Alex' && p.email === ME.email), 'Anzeigename gespeichert');
  type(Q('#accessEmail'), 'frau@x.de'); submit(Q('#accessForm')); await sleep(30);
  const cb = Q('input[data-email="frau@x.de"][data-list="' + db.lists[0].id + '"]');
  ok(!!cb, 'Freigabe-Häkchen je Markt');
  cb.checked = true; change(cb); await sleep(40);
  ok(db.list_members.some(m => m.email === 'frau@x.de'), 'Freigabe gespeichert');
  db.profiles.push({id: 'u2', email: 'frau@x.de', display_name: 'Kim'});

  // Rechnungen
  nav('bills'); await sleep(30);
  ok(/Fotografieren/.test(mainText()) && /Alle Märkte/.test(mainText()), 'Rechnungen mit Tabs und Markt-Filter');
  click(Q('[data-act="exp-new"]')); await sleep(30);
  const mk = Q('#rcList'); mk.value = db.lists[1].id; change(mk); await sleep(20);
  ok(!!Q('.rc-note'), 'Hinweis, wenn im Markt nur eine Person ist');
  type(Q('#rcTotal'), '5');
  net.failExpense = {code: 'PGRST204', message: "Could not find the 'spent_on' column of 'expenses' in the schema cache"};
  submit(Q('#rcForm')); await sleep(80);
  ok(!Q('#overlay').hidden && !Q('#rcErr').hidden && /schema_v3/.test(Q('#rcErr').textContent), 'Speicherfehler bleibt im Fenster sichtbar');
  ok(db.expenses.length === 0 && !/5,00 €/.test(mainText()), 'bei Fehler nichts gespeichert und nichts vorgetäuscht');
  net.failExpense = null;
  click(Q('[data-act="close"]')); await sleep(250);
  click(Q('[data-act="exp-new"]')); await sleep(30);
  ok(/Ausgabe eintragen/.test(Q('#sheetTitle').textContent), 'Ausgabe ohne Foto öffnet Formular');
  type(Q('#rcTotal'), '30,00'); type(Q('#rcDesc'), 'Wocheneinkauf');
  QA('input[name="rpart"]').forEach(x => { x.checked = x.value === ME.email; });
  submit(Q('#rcForm')); await sleep(80);
  ok(db.expenses.length === 1 && db.expenses[0].amount_cents === 3000, 'Ausgabe gespeichert');
  click(Q('[data-act="exp-new"]')); await sleep(30);
  ok(QA('input[name="rpart"]').length === 2, 'zwei Personen zur Auswahl');
  type(Q('#rcTotal'), '10'); type(Q('#rcDesc'), 'Farbe');
  submit(Q('#rcForm')); await sleep(80);
  await sleep(300);
  click(Q('[data-act="bill-tab"][data-tab="saldo"]')); await sleep(30);
  ok(/Kim\s*→\s*Du\s*5,00 €/.test(mainText()), 'Saldo mit Namen: Kim → Du 5,00 €');
  click(Q('[data-act="settle"]')); await sleep(20);
  ok(/Bezahlt\?/.test(mainText()), 'Ausgleichen fragt nach');
  click(Q('[data-act="settle"]')); await sleep(400);
  ok(db.expenses.some(e => e.kind === 'settle' && e.payer_email === 'frau@x.de' && e.amount_cents === 500), 'Ausgleich gespeichert');
  ok(/Alles ausgeglichen/.test(mainText()), 'danach ausgeglichen');
  click(Q('[data-act="bill-tab"][data-tab="kat"]')); await sleep(30);
  ok(/Gesamt im Monat: 40,00 €/.test(mainText()), 'Kategorien ohne Ausgleich: 40,00 €');

  // Ausgabe bearbeiten
  click(Q('[data-act="bill-tab"][data-tab="foto"]')); await sleep(30);
  ok(/Ausgleich/.test(mainText()), 'Ausgleich in der Liste');
  const farbe = QA('[data-act="exp-edit"]').find(b => /Farbe/.test(b.textContent));
  click(farbe); await sleep(30);
  ok(/Ausgabe bearbeiten/.test(Q('#sheetTitle').textContent) && Q('#rcTotal').value === '10,00', 'Tipp auf Ausgabe öffnet Bearbeiten');
  type(Q('#rcTotal'), '12,00'); submit(Q('#rcForm')); await sleep(300);
  ok(db.expenses.some(e => e.description === 'Farbe' && e.amount_cents === 1200), 'Änderung gespeichert');

  // Markt-Filter
  click(QA('[data-act="bill-market"]')[2]); await sleep(30);
  ok(/Noch keine Rechnung/.test(mainText()), 'Filter auf Baumarkt zeigt nur dessen Ausgaben');

  // Märkte verwalten
  nav('markets'); await sleep(20);
  ok(Q('#tabs').hidden, 'Markt-Tabs oben in der Märkte-Ansicht ausgeblendet');
  click(QA('[data-act="mk-vis"]')[1]); await sleep(20);
  nav('list'); await sleep(20);
  ok(QA('.tab').length === 1, 'Markt ausgeblendet');
  nav('markets'); await sleep(20);
  click(QA('[data-act="mk-down"]')[0]); await sleep(20);
  ok(/Baumarkt/.test(Q('.mk-main b').textContent), 'Reihenfolge geändert');
  click(QA('[data-act="mk-vis"]')[0]); await sleep(20);
  nav('list'); await sleep(20);
  ok(QA('.tab').length === 2 && /Baumarkt/.test(Q('.tab').textContent), 'wieder eingeblendet, Tabs in neuer Reihenfolge');

  // Einkaufsmodus
  nav('list'); await sleep(20);
  click(Q('#shopBtn')); await sleep(30);
  ok(Q('#app').classList.contains('shop') && Q('#shopBtn').getAttribute('aria-pressed') === 'true', 'Einkaufsmodus an');
  click(Q('#shopBtn')); await sleep(30);

  // Einstellungen ohne doppelte Personenverwaltung
  nav('settings'); await sleep(20);
  ok(!Q('#memberForm') && /unter Account/.test(mainText()), 'Personen nur noch unter Account');

  ok(errs.length === 0, 'keine Skriptfehler ' + (errs.length ? JSON.stringify(errs) : ''));
  console.log(fails ? fails + ' von ' + count + ' Prüfungen fehlgeschlagen' : 'Alle ' + count + ' Prüfungen bestanden');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log('ABBRUCH', e.stack); process.exit(1); });
