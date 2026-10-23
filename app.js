/* manjo: Oberfläche und Datenabgleich. Braucht lib/classify.js, lib/drag.js, lib/receipt.js, lib/ledger.js, lib/items.js. */
(function(){
'use strict';

var LS_CUR = 'manjo-cur', LS_ORDER = 'manjo-order', LS_HIDDEN = 'manjo-hidden';
var CHECK = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
var GRIP = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="6" r="1.8"/><circle cx="15" cy="6" r="1.8"/><circle cx="9" cy="12" r="1.8"/><circle cx="15" cy="12" r="1.8"/><circle cx="9" cy="18" r="1.8"/><circle cx="15" cy="18" r="1.8"/></svg>';
var TICK = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
var XICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
var PLUS = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
var CAMERA = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>';
var GALLERY = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M21 16l-5-5-9 9"/></svg>';
var UP = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg>';
var DOWN = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
var EYE = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
var EYE_OFF = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18M10.6 5.1A10.7 10.7 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.1M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7c1.6 0 3-.4 4.3-1"/></svg>';
var NAV_INDEX = {list:0, markets:1, bills:2, settings:3, account:4};
var DB_UPDATE_CODES = ['42P01', '42703', 'PGRST204', 'PGRST205'];
var APP_VERSION = '2026-10-23.10';
var GEN = 'allgemein';
var LS_LOG = 'manjo-log';
/* Kleines Protokoll auf dem Gerät: hilft, Fehler zu finden, die man auf dem Handy nicht sieht */
function logEvent(kind, msg){
  try{
    var l = JSON.parse(localStorage.getItem(LS_LOG) || '[]');
    l.push({t: new Date().toISOString().slice(5, 19).replace('T', ' '), k: kind, m: String(msg).slice(0, 300)});
    localStorage.setItem(LS_LOG, JSON.stringify(l.slice(-40)));
  }catch(e){}
}
function errInfo(err){
  if(!err) return 'kein Fehlerobjekt';
  return [err.code, err.message, err.details, err.hint].filter(Boolean).join(' | ') || String(err);
}
window.addEventListener('error', function(e){ logEvent('Skriptfehler', (e.message || '') + ' @' + (e.lineno || '?')); });
window.addEventListener('unhandledrejection', function(e){ logEvent('Fehler', errInfo(e.reason)); });

var $ = function(s){ return document.querySelector(s); };
var main = $('#main'), hint = $('#hint'), input = $('#newItem'), form = $('#addForm'),
    overlay = $('#overlay'), sheetBody = $('#sheetBody'), announceEl = $('#announce'), tabsEl = $('#tabs'), slot = $('#slot'),
    toast = $('#toast'), appEl = $('#app');
var RM = false;
try{ RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){}

var state = {
  lists: [], items: [], expenses: [], profiles: {}, products: [],
  listId: null, view: 'list', sheet: null,
  mode: 'loading', loaded: false, authed: false,
  me: {id: null, email: ''},
  confirmDel: false, confirmExp: null, confirmSettle: null, confirmOut: false, accessExtra: [],
  billTab: 'foto', billMarket: 'all', month: monthKey(), rcp: null, ocrTok: null,
  gone: {}, shop: false, queue: [], dbV6: false
};
var sb = null, chan = null, reloadT = null, signup = false, flushing = false, cacheT = null;
var focusFn = null, openerSel = null, closing = false, pendingRender = false, sheetHtml = '';
var drag = null, seen = null, pendingDone = {}, enterAt = {};
var flashT = null, delT = null, undoT = null, undoIds = null, wakeLock = null, toastT = null, toastFn = null;
var swipe = null, swipeBlock = false, renderL = null;

/* ---------- Helfer ---------- */
function esc(s){ return String(s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function cap(s){ return s.charAt(0).toUpperCase() + s.slice(1); }
function byTs(a,b){ return (a.ts||0) - (b.ts||0) || String(a.id).localeCompare(String(b.id)); }
function sel(id){ return (window.CSS && CSS.escape) ? CSS.escape(id) : String(id).replace(/"/g,'\\"'); }
function announce(msg){ announceEl.textContent = ''; setTimeout(function(){ announceEl.textContent = msg; }, 30); }
function lsGet(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
function lsSet(k, v){ try{ localStorage.setItem(k, v); }catch(e){} }
function lsDel(k){ try{ localStorage.removeItem(k); }catch(e){} }
function lsJSON(k, dflt){ try{ var v = JSON.parse(lsGet(k) || 'null'); return v === null ? dflt : v; }catch(e){ return dflt; } }
function money(c){ var neg = c < 0; c = Math.abs(Math.round(c)); var s = (Math.floor(c/100)) + ',' + ('0' + (c%100)).slice(-2) + ' €'; return (neg ? '−' : '') + s; }
function money2(c){ return (c / 100).toFixed(2).replace('.', ','); }
function parseAmount(v){
  var s = String(v || '').trim().replace(/\s/g, '').replace(/€/g, '');
  if(s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
  var n = parseFloat(s);
  return (isFinite(n) && n > 0) ? Math.round(n * 100) : 0;
}
function pad2(n){ return (n < 10 ? '0' : '') + n; }
function todayISO(){ var d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
function monthKey(){ var d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1); }
function shiftMonth(key, delta){ var p = key.split('-'), d = new Date(+p[0], +p[1] - 1 + delta, 1); return d.getFullYear() + '-' + pad2(d.getMonth() + 1); }
function monthLabel(key){ var p = key.split('-'); return new Date(+p[0], +p[1] - 1, 1).toLocaleDateString('de-DE', {month: 'long', year: 'numeric'}); }
function fmtISO(iso){ var p = String(iso || '').split('-'); return p.length === 3 ? p[2] + '.' + p[1] + '.' : ''; }
function uuid(){
  if(window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c){ var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); });
}
/* Anzeigename einer Person: "Du", sonst der eingetragene Name, sonst die E-Mail-Adresse */
function who(email){
  if(email && email === state.me.email) return 'Du';
  return (email && state.profiles[email]) || email || '–';
}
function whoFull(email){
  var n = state.profiles[email];
  return n ? n + ' (' + email + ')' : email;
}
function isEmail(s){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s); }

/* ---------- Listen und Stationen ---------- */
function listById(id){ for(var i = 0; i < state.lists.length; i++){ if(state.lists[i].id === id) return state.lists[i]; } return null; }
function cur(){ return listById(state.listId); }
function canManage(l){ return !!l && !!state.me.id && l.owner === state.me.id; }
function people(l){
  var a = [];
  if(l.ownerEmail) a.push(l.ownerEmail);
  l.members.forEach(function(m){ if(a.indexOf(m) < 0) a.push(m); });
  return a;
}
function peopleOf(lists){
  var a = [];
  lists.forEach(function(l){ people(l).forEach(function(p){ if(a.indexOf(p) < 0) a.push(p); }); });
  return a;
}
function isGen(l){ return !!l && l.tpl === GEN; }
function sortLists(a, b){ return (isGen(b) - isGen(a)) || (a.ts||0) - (b.ts||0) || String(a.name).localeCompare(String(b.name)); }
function genLists(){ return state.lists.filter(isGen); }
function marketLists(){ return orderedLists().filter(function(l){ return !isGen(l); }); }
function orderedLists(){
  var o = lsJSON(LS_ORDER, []);
  return state.lists.slice().sort(function(a, b){
    var ia = o.indexOf(a.id), ib = o.indexOf(b.id);
    if(ia < 0) ia = 1e6; if(ib < 0) ib = 1e6;
    return (isGen(b) - isGen(a)) || ia - ib || sortLists(a, b);
  });
}
function hiddenIds(){ return lsJSON(LS_HIDDEN, []); }
function visibleLists(){ var h = hiddenIds(); return orderedLists().filter(function(l){ return h.indexOf(l.id) < 0; }); }
function ensureCurrent(){
  if(listById(state.listId)) return;
  var saved = lsGet(LS_CUR), vis = visibleLists();
  var pick = listById(saved) || vis[0] || orderedLists()[0] || null;
  state.listId = pick ? pick.id : null;
}
function switchList(id){
  state.listId = id;
  lsSet(LS_CUR, id);
  main.scrollTop = 0;
}
function stationIds(l){ return l.stations.map(function(s){ return s.id; }); }
function effCat(l, cat){ return stationIds(l).indexOf(cat) >= 0 ? cat : fallbackId(l.stations); }
function stationName(l, id){ var s = l.stations.filter(function(x){ return x.id === id; })[0]; return s ? s.name : 'Sonstiges'; }
function stationNo(l, id){ var i = stationIds(l).indexOf(id); return i < 0 ? l.stations.length : i + 1; }
function findItem(id){ for(var i = 0; i < state.items.length; i++){ if(state.items[i].id === id) return state.items[i]; } return null; }
function listItems(l){ return state.items.filter(function(i){ return i.list === l.id && !state.gone[i.id]; }); }
/* Was in einer Liste zu sehen ist: eigene Artikel, bei Märkten dazu die allgemeinen Artikel
   ohne Zuordnung oder mit Zuordnung zu genau diesem Markt (eigene Artikel gleichen Namens haben Vorrang) */
/* Märkte, denen ein Artikel ausdrücklich zugeordnet ist */
function tgts(i){ return (i.targets || []).filter(function(id){ var x = listById(id); return x && !isGen(x); }); }
function viewItems(l){
  var own = listItems(l);
  if(isGen(l)){
    /* Allgemein zeigt auch, was direkt in einem Markt eingetragen wurde */
    var ks = {};
    own.forEach(function(i){ ks[baseKey(i.name)] = 1; });
    var mids = {};
    marketLists().forEach(function(x){ mids[x.id] = 1; });
    return own.concat(state.items.filter(function(i){ return mids[i.list] && !state.gone[i.id] && !ks[baseKey(i.name)]; }));
  }
  var gens = genLists().map(function(g){ return g.id; });
  var keys = {};
  own.forEach(function(i){ keys[baseKey(i.name)] = 1; });
  var extra = state.items.filter(function(i){
    if(i.list === l.id || state.gone[i.id] || keys[baseKey(i.name)]) return false;
    var t = tgts(i);
    if(t.length) return t.indexOf(l.id) >= 0;
    return gens.indexOf(i.list) >= 0 && fitsMarket(l, i.name);
  });
  return own.concat(extra);
}
/* Kennt ein Markt den Artikel? Ja, wenn seine Vorlage ihn einer echten Station zuordnet oder er dort gelernt wurde */
function knows(l, name){
  if(learnedFor(l)[baseKey(name)]) return true;
  return clsf(l, name) !== fallbackId(l.stations);
}
/* Passt ein nicht zugeordneter allgemeiner Artikel in diesen Markt? Supermärkte nehmen auch Unbekanntes,
   solange kein anderer Markt (Baumarkt, Drogerie ...) den Artikel kennt */
var FOOD = ['obst', 'brot', 'fleisch', 'milch', 'nudeln', 'fruehstueck', 'suess', 'getraenke', 'tk'];
var NON_FOOD_MARKETS = ['baumarkt', 'drogerie', 'ikea'];
/* Lebensmittel nach der Supermarkt-Vorlage, unabhängig davon, wie eure Märkte eingerichtet sind */
function isFood(name){
  var st = TPLS.supermarkt.stations;
  return FOOD.indexOf(classify(splitQty(name).base || name, null, 'supermarkt', st)) >= 0;
}
function fitsMarket(l, name){
  if(isGen(l)) return false;
  if(learnedFor(l)[baseKey(name)]) return true;
  if(NON_FOOD_MARKETS.indexOf(l.tpl) >= 0 && isFood(name)) return false;
  if(knows(l, name)) return true;
  if(l.tpl !== 'supermarkt') return false;
  return !marketLists().some(function(x){ return x.tpl !== 'supermarkt' && knows(x, name); });
}
function fitNames(name){ return marketLists().filter(function(x){ return fitsMarket(x, name); }).map(function(x){ return x.name; }); }
/* Station eines Artikels in einem Markt: eigene Artikel haben ihre Station, allgemeine werden einsortiert */
function catIn(l, i){ return i.list === l.id ? effCat(l, i.cat) : clsf(l, i.name); }
function openCount(l){ return viewItems(l).filter(function(i){ return !i.done; }).length; }
function baseKey(name){ return norm(splitQty(name).base); }
function newListObj(name, tpl){
  if(tpl === GEN) return {name: name, tpl: GEN, stations: [{id: 'sonst', name: 'Sonstiges'}], learned: {}};
  var t = TPLS[tpl] || TPLS.eigen;
  return {name: name, tpl: TPLS[tpl] ? tpl : 'eigen', stations: t.stations.map(function(s){ return {id:s.id, name:s.name}; }), learned: {}};
}
function normItem(id, d){
  if(!d || !d.name) return null;
  return {id: String(id), name: String(d.name), cat: String(d.cat || 'sonst'), done: !!d.done, ts: Date.parse(d.created_at) || Date.now(), list: String(d.list_id || ''),
          targets: Array.isArray(d.targets) ? d.targets.map(String) : (d.target_list ? [String(d.target_list)] : [])};
}
function normExp(d){
  return {id: String(d.id), list: String(d.list_id), cents: +d.amount_cents || 0, desc: String(d.description || ''),
          payer: String(d.payer_email || ''), parts: Array.isArray(d.participants) ? d.participants.slice() : [], ts: Date.parse(d.created_at) || Date.now(),
          spent: String(d.spent_on || d.created_at || todayISO()).slice(0, 10), kind: d.kind === 'settle' ? 'settle' : 'expense',
          lines: Array.isArray(d.lines) ? d.lines.map(function(x){ return {n: String(x.n || ''), c: +x.c || 0, cat: String(x.cat || 'sonst')}; }) : []};
}
function normList(d, members){
  var tpl = TPLS[d.tpl] ? d.tpl : (d.tpl === GEN ? GEN : 'eigen'), stations = [], seenIds = {};
  if(Array.isArray(d.stations)){
    d.stations.forEach(function(s){
      if(s && s.id && s.name && !seenIds[s.id]){ seenIds[s.id] = 1; stations.push({id:String(s.id), name:String(s.name)}); }
    });
  }
  if(!seenIds.sonst) stations.push({id:'sonst', name:'Sonstiges'});
  var learned = {};
  if(d.learned && typeof d.learned === 'object'){
    Object.keys(d.learned).forEach(function(k){ if(typeof d.learned[k] === 'string') learned[k] = d.learned[k]; });
  }
  return {id: String(d.id), name: String(d.name || 'Liste'), tpl: tpl, stations: stations, learned: learned,
          owner: String(d.owner || ''), ownerEmail: String(d.owner_email || ''), members: (members || []).slice(), ts: Date.parse(d.created_at) || 0};
}
/* Gelerntes gilt für alle Märkte mit derselben Vorlage, das eigene hat Vorrang */
function learnedFor(l){
  var m = {};
  if(l.tpl !== 'eigen' && l.tpl !== GEN) state.lists.forEach(function(x){ if(x.id !== l.id && x.tpl === l.tpl) Object.assign(m, x.learned); });
  return Object.assign(m, l.learned);
}
function clsf(l, name){ if(isGen(l)) return 'sonst'; return classify(splitQty(name).base || name, learnedFor(l), l.tpl, l.stations); }

/* ---------- Rechnungen ---------- */
var TESS_LIB = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
var TESS_WORKER = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js';
var TESS_CORE = 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1/';
var TESS_LANG = 'https://cdn.jsdelivr.net/npm/@tesseract.js-data/deu/4.0.0_best_int';
var tessW = null;
function loadScript(src){
  return new Promise(function(res, rej){
    if(window.Tesseract) return res();
    var s = document.createElement('script');
    s.src = src; s.onload = res; s.onerror = function(){ rej(new Error('script')); };
    document.head.appendChild(s);
  });
}
async function ocr(blob, onP){
  await loadScript(TESS_LIB);
  if(!tessW){
    tessW = await window.Tesseract.createWorker('deu', 1, {
      workerPath: TESS_WORKER, corePath: TESS_CORE, langPath: TESS_LANG,
      logger: function(m){ if(m.status === 'recognizing text' && onP) onP(Math.round(m.progress * 100)); }
    });
  }
  var r = await tessW.recognize(blob);
  return r.data.text;
}
function shrink(file){
  return new Promise(function(res, rej){
    var img = new Image(), url = URL.createObjectURL(file);
    img.onload = function(){
      var k = Math.min(1, 2000 / Math.max(img.width, img.height));
      var c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob(function(b){ b ? res(b) : rej(new Error('blob')); }, 'image/jpeg', 0.9);
    };
    img.onerror = function(){ rej(new Error('img')); };
    img.src = url;
  });
}
function billLists(){
  if(state.billMarket !== 'all' && !listById(state.billMarket)) state.billMarket = 'all';
  return state.billMarket === 'all' ? orderedLists() : [listById(state.billMarket)];
}
function billExpenses(){
  var ids = billLists().map(function(l){ return l.id; });
  return state.expenses.filter(function(e){ return ids.indexOf(e.list) >= 0; });
}
function catKey(e, cat){ var l = listById(e.list); return l ? stationName(l, effCat(l, cat)) : 'Sonstiges'; }
/* Markt für neue Ausgaben: der gefilterte Markt, sonst der aktuelle */
function billTarget(){ return state.billMarket !== 'all' ? state.billMarket : state.listId; }

/* ---------- Speicher: Warteschlange für Artikel (offline-fähig) ---------- */
function qKey(){ return 'manjo-queue-' + state.me.id; }
function cKey(){ return 'manjo-cache-' + state.me.id; }
function saveQueue(){ lsSet(qKey(), JSON.stringify(state.queue)); }
function isNetErr(err){
  var m = String((err && (err.message || err.details)) || err || '');
  return (typeof navigator !== 'undefined' && navigator.onLine === false) || /fetch|network|load failed|timed? ?out|abort/i.test(m);
}
function needsDbUpdate(err){ return !!err && DB_UPDATE_CODES.indexOf(err.code) >= 0; }
/* Antwortet die Datenbank nicht, soll nichts endlos hängen */
function withTimeout(p, ms){
  return new Promise(function(res, rej){
    var done = false, tm = setTimeout(function(){ if(!done){ done = true; res({data: null, error: {code: 'TIMEOUT', message: 'Keine Antwort'}}); } }, ms || 15000);
    Promise.resolve(p).then(function(v){ if(!done){ done = true; clearTimeout(tm); res(v); } }, function(e){ if(!done){ done = true; clearTimeout(tm); rej(e); } });
  });
}
function errText(err){
  if(err && err.code === 'TIMEOUT') return 'Die Datenbank hat nicht geantwortet. Prüf die Verbindung und versuch es noch einmal, die Eingaben bleiben stehen.';
  if(err && err.code === '22008') return 'Das Datum ist ungültig. Bitte das Datum korrigieren.';
  if(needsDbUpdate(err)){
    var m = String(err.message || '') + ' ' + String(err.details || '') + ' ' + String(err.hint || '');
    if(/products/.test(m)) return 'Für das Glossar fehlt noch ein Datenbank-Update. Bitte schema_v5.sql in Supabase ausführen.';
    if(/spent_on|lines/.test(m)) return 'Der Datenbank fehlt noch ein Update. Bitte schema_v3.sql und danach schema_v4.sql in Supabase ausführen.';
    return 'Der Datenbank fehlt noch ein Update. Bitte schema_v4.sql in Supabase ausführen.';
  }
  if(isNetErr(err)) return 'Keine Verbindung. Versuch es gleich nochmal, die Eingaben bleiben stehen.';
  return 'Speichern hat nicht geklappt: ' + String((err && (err.message || err.details)) || 'unbekannter Fehler');
}
function onWriteError(err){
  if(needsDbUpdate(err)) flashText('Datenbank-Update fehlt: Bitte schema_v4.sql in Supabase ausführen.');
  else flashText('Nicht gespeichert. Prüft die Verbindung.');
  scheduleReload(0);
}
function enqueue(op){ state.queue.push(op); saveQueue(); renderHeader(); flush(); }
async function flush(){
  if(flushing || !sb || !state.authed || !state.queue.length) return;
  flushing = true;
  try{
    while(state.queue.length){
      var op = state.queue[0], r = null;
      if(op.op === 'ins') r = await sb.from('items').insert(op.row);
      else if(op.op === 'upd') r = await sb.from('items').update(op.patch).eq('id', op.id);
      else if(op.op === 'del') r = await sb.from('items').delete().in('id', op.ids);
      if(r && r.error){
        if(isNetErr(r.error)){ state.mode = 'lost'; break; }
        state.queue.shift(); saveQueue();
        if(r.error.code !== '23505') flashText('Eine Änderung wurde nicht gespeichert.');
        scheduleReload(0);
        continue;
      }
      state.queue.shift(); saveQueue();
      if(state.mode === 'lost') state.mode = 'live';
    }
  }catch(e){ state.mode = 'lost'; }
  flushing = false;
  renderHeader();
}
/* Änderung auf einen Artikel anwenden; list_id heißt lokal list */
function applyPatch(it, patch){
  Object.keys(patch).forEach(function(k){ if(k === 'list_id') it.list = patch[k]; else if(k === 'target_list') it.targets = patch[k] ? [patch[k]] : []; else it[k] = patch[k]; });
}
/* Noch nicht gesendete Änderungen auf frisch geladene Daten anwenden */
function replayQueue(){
  state.queue.forEach(function(op){
    if(op.op === 'ins'){
      if(!findItem(op.row.id)){ var it = normItem(op.row.id, Object.assign({created_at: op.at}, op.row)); if(it) state.items.push(it); }
    } else if(op.op === 'upd'){
      var x = findItem(op.id); if(x) applyPatch(x, op.patch);
    } else if(op.op === 'del'){
      state.items = state.items.filter(function(i){ return op.ids.indexOf(i.id) < 0; });
    }
  });
}
function saveCache(){
  if(!state.authed || !state.loaded) return;
  clearTimeout(cacheT);
  cacheT = setTimeout(function(){
    lsSet(cKey(), JSON.stringify({v: 1, lists: state.lists, items: state.items, expenses: state.expenses, profiles: state.profiles, products: state.products, dbV6: state.dbV6}));
  }, 400);
}
function loadCache(){
  var c = lsJSON(cKey(), null);
  if(!c || c.v !== 1) return;
  state.lists = c.lists || []; state.items = c.items || []; state.expenses = c.expenses || []; state.profiles = c.profiles || {}; state.products = c.products || []; state.dbV6 = !!c.dbV6;
  state.loaded = true;
  replayQueue();
  ensureCurrent();
}
function upsertItem(it){
  if(!it) return;
  var i = state.items.findIndex(function(x){ return x.id === it.id; });
  if(i < 0) state.items.push(it); else state.items[i] = it;
}
/* Abfragen für Zusatzfunktionen dürfen fehlschlagen, ohne das Laden zu stoppen */
function optional(q){ return Promise.resolve(q).then(function(r){ return r || {error: {message: 'leer'}}; }, function(e){ return {error: e}; }); }
async function loadAll(){
  if(!sb || !state.authed) return;
  try{
    var r = await Promise.all([
      sb.from('lists').select('*').order('created_at'),
      sb.from('list_members').select('list_id,email'),
      sb.from('items').select('*').order('created_at').range(0, 4999),
      sb.from('expenses').select('*').order('created_at').range(0, 4999),
      optional(sb.from('profiles').select('email,display_name')),
      optional(sb.from('products').select('*').order('created_at')),
      optional(sb.from('items').select('targets').limit(1))
    ]);
    for(var k = 0; k < 4; k++){ if(r[k].error) throw r[k].error; }
    var mem = {};
    r[1].data.forEach(function(m){ (mem[m.list_id] = mem[m.list_id] || []).push(m.email); });
    state.lists = r[0].data.map(function(d){ return normList(d, mem[d.id]); }).sort(sortLists);
    state.items = r[2].data.map(function(d){ return normItem(d.id, d); }).filter(Boolean);
    state.expenses = r[3].data.map(normExp);
    if(!r[4].error && r[4].data){
      var pf = {};
      r[4].data.forEach(function(p){ if(p.email && p.display_name) pf[String(p.email).toLowerCase()] = String(p.display_name); });
      state.profiles = pf;
    }
    if(!r[5].error && r[5].data) state.products = r[5].data.map(normProduct);
    state.dbV6 = !r[6].error;
    replayQueue();
    state.loaded = true;
    state.mode = 'live';
    ensureCurrent();
    render();
    flush();
  }catch(e){
    state.mode = 'lost';
    render();
  }
}
function scheduleReload(ms){
  clearTimeout(reloadT);
  reloadT = setTimeout(loadAll, ms === undefined ? 250 : ms);
}
function onItemChange(p){
  if(p.eventType === 'DELETE'){
    var id = p.old && p.old.id;
    state.items = state.items.filter(function(i){ return i.id !== id; });
  } else {
    upsertItem(normItem(p.new.id, p.new));
  }
  render();
}
function subscribe(){
  if(!sb) return;
  if(chan){ try{ sb.removeChannel(chan); }catch(e){} chan = null; }
  chan = sb.channel('manjo')
    .on('postgres_changes', {event:'*', schema:'public', table:'items'}, onItemChange)
    .on('postgres_changes', {event:'*', schema:'public', table:'lists'}, function(){ scheduleReload(); })
    .on('postgres_changes', {event:'*', schema:'public', table:'list_members'}, function(){ scheduleReload(); })
    .on('postgres_changes', {event:'*', schema:'public', table:'expenses'}, function(){ scheduleReload(); })
    .on('postgres_changes', {event:'*', schema:'public', table:'profiles'}, function(){ scheduleReload(); })
    .on('postgres_changes', {event:'*', schema:'public', table:'products'}, function(){ scheduleReload(); })
    .subscribe(function(status){
      if(status === 'SUBSCRIBED'){ state.mode = 'live'; renderHeader(); scheduleReload(0); flush(); }
      else if(status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED'){ state.mode = 'lost'; renderHeader(); }
    });
}
var store = {
  addItem: function(item){
    var id = uuid(), at = new Date().toISOString();
    var row = {id: id, list_id: item.list, name: item.name, cat: item.cat, done: false};
    if(item.targets && item.targets.length) row.targets = item.targets;
    upsertItem({id: id, name: item.name, cat: item.cat, done: false, ts: Date.now(), list: item.list, targets: item.targets || []});
    render();
    enqueue({op: 'ins', row: row, at: at});
    return id;
  },
  updateItem: function(id, patch){
    var it = findItem(id);
    if(it) applyPatch(it, patch);
    render();
    enqueue({op: 'upd', id: id, patch: patch});
  },
  removeItems: function(ids){
    if(!ids.length) return;
    state.items = state.items.filter(function(i){ return ids.indexOf(i.id) < 0; });
    render();
    enqueue({op: 'del', ids: ids.slice()});
  },
  patchList: function(id, patch, quiet){
    var l = listById(id);
    if(!l) return;
    var p = JSON.parse(JSON.stringify(patch)), dbp = {};
    Object.assign(l, p);
    ['name', 'stations', 'learned'].forEach(function(k){ if(k in p) dbp[k] = p[k]; });
    if(Object.keys(dbp).length) sb.from('lists').update(dbp).eq('id', id).then(function(r){ if(r.error) onWriteError(r.error); });
    if(quiet) renderHeader(); else render();
  },
  createList: function(name, tpl){
    return sb.from('lists').insert(newListObj(name, tpl)).select().single().then(function(r){
      if(r.error) throw r.error;
      var l = normList(r.data, []);
      state.lists.push(l);
      state.lists.sort(sortLists);
      return l.id;
    });
  },
  deleteList: function(id){
    state.items = state.items.filter(function(i){ return i.list !== id; });
    state.expenses = state.expenses.filter(function(e){ return e.list !== id; });
    state.lists = state.lists.filter(function(l){ return l.id !== id; });
    return sb.from('lists').delete().eq('id', id).then(function(r){ if(r.error) onWriteError(r.error); });
  },
  addMember: function(id, email){
    var l = listById(id);
    if(!l || l.members.indexOf(email) >= 0) return;
    l.members.push(email);
    render();
    return sb.from('list_members').insert({list_id: id, email: email}).then(function(r){ if(r.error) onWriteError(r.error); });
  },
  removeMember: function(id, email){
    var l = listById(id);
    if(!l) return;
    l.members = l.members.filter(function(m){ return m !== email; });
    render();
    return sb.from('list_members').delete().eq('list_id', id).eq('email', email).then(function(r){ if(r.error) onWriteError(r.error); });
  },
  addExpense: function(row){
    logEvent('Speichern', 'Ausgabe ' + row.amount_cents + ' ct, Markt ' + row.list_id + ', geteilt ' + row.participants.length);
    var tmp = normExp(Object.assign({id: 'tmp-' + uuid(), created_at: new Date().toISOString()}, row));
    state.expenses.push(tmp);
    render();
    return withTimeout(sb.from('expenses').insert(row)).then(function(r){
      if(r.error){ logEvent('Abgelehnt', errInfo(r.error)); state.expenses = state.expenses.filter(function(e){ return e !== tmp; }); render(); return {ok: false, error: r.error}; }
      logEvent('Gespeichert', 'Ausgabe ' + row.amount_cents + ' ct');
      scheduleReload(0);
      return {ok: true};
    }, function(err){
      logEvent('Fehler', errInfo(err));
      state.expenses = state.expenses.filter(function(e){ return e !== tmp; }); render();
      return {ok: false, error: err};
    });
  },
  updateExpense: function(id, row){
    var i = state.expenses.findIndex(function(e){ return e.id === id; });
    if(i >= 0) state.expenses[i] = normExp(Object.assign({id: id, created_at: new Date(state.expenses[i].ts).toISOString()}, row));
    render();
    return withTimeout(sb.from('expenses').update(row).eq('id', id)).then(function(r){
      if(r.error) logEvent('Abgelehnt', errInfo(r.error));
      scheduleReload(0);
      return r.error ? {ok: false, error: r.error} : {ok: true};
    }, function(err){ scheduleReload(0); return {ok: false, error: err}; });
  },
  removeExpense: function(id){
    state.expenses = state.expenses.filter(function(e){ return e.id !== id; });
    render();
    return sb.from('expenses').delete().eq('id', id).then(function(r){ if(r.error) onWriteError(r.error); });
  },
  saveName: function(name){
    if(name) state.profiles[state.me.email] = name; else delete state.profiles[state.me.email];
    render();
    return sb.from('profiles').upsert({id: state.me.id, email: state.me.email, display_name: name}).then(function(r){
      if(r.error) onWriteError(r.error); else flashText(name ? 'Gespeichert. Die anderen sehen dich als ' + name + '.' : 'Name entfernt.');
    });
  }
};

/* ---------- Glossar und Preise ---------- */
function normProduct(d){
  return {id: String(d.id), list: String(d.list_id), name: String(d.name || ''), product: String(d.product || ''), terms: String(d.terms || ''), ts: Date.parse(d.created_at) || 0};
}
function listName(id){ var l = listById(id); return l ? l.name : 'Markt'; }
/* Glossar-Eintrag zu einem Artikelnamen (ohne Menge), der neueste gewinnt */
function glossFor(name){
  var key = baseKey(name), hit = null;
  state.products.forEach(function(p){ if(norm(p.name) === key && listById(p.list) && (!hit || p.ts > hit.ts)) hit = p; });
  return hit;
}
function termsFor(name, g){
  var t = [splitQty(name).base];
  if(g === undefined) g = glossFor(name);
  if(g){
    if(g.name) t.push(g.name);
    g.terms.split(',').forEach(function(x){ x = x.trim(); if(x) t.push(x); });
    if(g.product) t.push(g.product);
  }
  return t;
}
function pricesOf(name, g){ return pricesFor(termsFor(name, g), state.expenses, norm); }
function pricesHTML(obs){
  if(!obs.length) return '<p class="tip">Noch kein Preis bekannt. Sobald ihr Kassenzettel fotografiert, merkt sich die App den Preis je Markt.</p>';
  return '<div class="prices">' + obs.map(function(o, i){
    return '<div class="price' + (i === 0 && obs.length > 1 ? ' best' : '') + '"><span class="pm">' + esc(listName(o.list)) + (i === 0 && obs.length > 1 ? ' <em>günstigster</em>' : '') + '</span>' +
      '<span class="pd">' + fmtISO(o.date) + '</span><b>' + money(o.c) + '</b></div>';
  }).join('') + '</div><p class="tip">Letzter Preis je Markt laut euren Kassenzetteln. Packungsgrößen können abweichen.</p>';
}
/* Allgemeine Artikel: Glossar oder klar günstigerer Markt (mind. 10 %, Preise aus mind. zwei Märkten) */
function autoTarget(name){
  if(!state.dbV6) return null;
  var g = glossFor(name), gl = g && listById(g.list);
  if(gl && !isGen(gl)) return {list: gl.id, why: 'laut Glossar'};
  var obs = pricesOf(name, null).filter(function(o){ var x = listById(o.list); return x && !isGen(x); });
  if(obs.length >= 2 && obs[0].c <= obs[1].c * 0.9) return {list: obs[0].list, why: 'dort günstiger'};
  return null;
}
/* Meldung mit einer Aktion (z. B. "Hier lassen" oder "Verschieben") */
function showToast(text, label, fn, ms){
  commitUndo();
  clearTimeout(toastT);
  $('#toastText').textContent = text;
  $('#toastBtn').textContent = label;
  toastFn = fn;
  toast.hidden = false;
  toastT = setTimeout(hideToast, ms || 7000);
}
function hideToast(){ clearTimeout(toastT); toast.hidden = true; toastFn = null; }
function moveItem(id, listId){
  var it = findItem(id), l2 = listById(listId);
  if(!it || !l2 || it.list === listId) return;
  var key = baseKey(it.name);
  if(viewItems(l2).some(function(i){ return i.id !== id && baseKey(i.name) === key; })){ flashText(splitQty(it.name).base + ' steht auf der Liste ' + l2.name + ' schon.'); return; }
  store.updateItem(id, {list_id: listId, cat: clsf(l2, it.name)});
  flashText(splitQty(it.name).base + ' liegt jetzt auf der Liste ' + l2.name + '.');
}
store.saveProduct = function(p){
  var row = {list_id: p.list, name: p.name, product: p.product, terms: p.terms};
  var q = p.id ? sb.from('products').update(row).eq('id', p.id) : sb.from('products').insert(row);
  if(p.id){ var ex = state.products.filter(function(x){ return x.id === p.id; })[0]; if(ex) Object.assign(ex, {list: p.list, name: p.name, product: p.product, terms: p.terms}); }
  else state.products.push({id: 'tmp-' + uuid(), list: p.list, name: p.name, product: p.product, terms: p.terms, ts: Date.now()});
  render();
  return withTimeout(q).then(function(r){
    scheduleReload(0);
    if(r.error){ logEvent('Abgelehnt', errInfo(r.error)); return {ok: false, error: r.error}; }
    return {ok: true};
  }, function(err){ scheduleReload(0); return {ok: false, error: err}; });
};
store.removeProduct = function(id){
  state.products = state.products.filter(function(x){ return x.id !== id; });
  render();
  return sb.from('products').delete().eq('id', id).then(function(r){ if(r.error) onWriteError(r.error); });
};

/* ---------- Aktionen ---------- */
/* „Hafermilch Lidl“, „bei Rewe Brot“: Marktname im Text → direkt in diese Liste, Name wird gestrichen */
function stripMarket(raw){
  var txt = String(raw).trim().replace(/\s+/g, ' ');
  var ms = marketLists().slice().sort(function(a, b){ return String(b.name).length - String(a.name).length; });
  for(var k = 0; k < ms.length; k++){
    var nm = String(ms[k].name).trim();
    if(!nm) continue;
    var re = new RegExp('(^|\\s)(?:(?:bei|von|im|in)\\s+|@)?' + nm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?=\\s|$)', 'i');
    if(!re.test(txt)) continue;
    var rest = txt.replace(re, ' ').replace(/\s+/g, ' ').trim();
    if(rest) return {list: ms[k], name: rest};
  }
  return null;
}
function addItem(l, raw, batch){
  var sm = stripMarket(raw);
  var name = cap((sm ? sm.name : raw).trim().replace(/\s+/g, ' '));
  if(!name) return null;
  var sq = splitQty(name), key = norm(sq.base);
  if(batch){ if(batch[key]) return {status:'dup', name:name}; batch[key] = 1; }
  if(isGen(l) && !sm){
    var dg = listItems(l).find(function(i){ return baseKey(i.name) === key; });
    if(dg){
      var pg = {};
      if(dg.done) pg.done = false;
      if(sq.qty && name !== dg.name) pg.name = name;
      if(Object.keys(pg).length){ store.updateItem(dg.id, pg); return {status: dg.done ? 'back' : 'qty', name: pg.name || dg.name}; }
      return {status: 'dup', name: dg.name};
    }
    var at = autoTarget(name);
    var gid = store.addItem({name: name, cat: 'sonst', list: l.id, targets: at ? [at.list] : []});
    return {status: 'gen', id: gid, name: name, target: at};
  }
  var g = glossFor(name), gt = g && listById(g.list), target = sm ? sm.list : ((gt && !isGen(gt) && g.list !== l.id && gt) || l);
  var dup = viewItems(target).find(function(i){ return baseKey(i.name) === key; });
  if(dup){
    var patch = {};
    if(dup.done) patch.done = false;
    if(sq.qty && name !== dup.name) patch.name = name;
    if(Object.keys(patch).length){
      store.updateItem(dup.id, patch);
      return {status: dup.done ? 'back' : 'qty', name: patch.name || dup.name, list: target.id};
    }
    return {status:'dup', name:dup.name, list: target.id};
  }
  var c = clsf(target, name);
  var id = store.addItem({name: name, cat: c, list: target.id});
  return {status: target === l ? 'added' : (sm ? 'market' : 'routed'), id: id, name: name, cat: c, list: target.id, from: l.id, gloss: g};
}
function addFromText(text){
  var l = cur();
  if(!l) return;
  var parts = text.split(/[,;\n]+/).map(function(s){ return s.trim(); }).filter(Boolean);
  var batch = {};
  var res = parts.map(function(p){ return addItem(l, p, batch); }).filter(Boolean);
  if(!res.length) return;
  var elsewhere = function(r){ return r.list && r.list !== l.id ? ' (Liste ' + listName(r.list) + ')' : ''; };
  if(res.length === 1){
    var r = res[0];
    if(r.status === 'added'){
      flash(esc(r.name) + ' → ' + catHTML(l, r.cat));
      suggestCheaper(r.id, r.name, l);
    } else if(r.status === 'gen'){
      if(r.target){
        flashText(splitQty(r.name).base + ' → nur ' + listName(r.target.list) + ' (' + r.target.why + ')');
        showToast(splitQty(r.name).base + ' erscheint nur bei ' + listName(r.target.list) + ', ' + r.target.why + '.', 'Alle passenden', function(){ store.updateItem(r.id, {targets: []}); flashText(splitQty(r.name).base + ' erscheint in allen passenden Märkten.'); }, 8000);
      } else { var fn2 = fitNames(r.name); flashText(splitQty(r.name).base + (fn2.length ? ' → ' + fn2.join(', ') : ' passt zu keinem Markt. Ordne es im Artikel zu.')); }
    } else if(r.status === 'market'){
      flash(esc(splitQty(r.name).base) + ' → Liste ' + esc(listName(r.list)) + ' · ' + catHTML(listById(r.list), r.cat));
    } else if(r.status === 'routed'){
      var tl = listById(r.list);
      flash(esc(splitQty(r.name).base) + ' → Liste ' + esc(tl.name) + (r.gloss.product ? ' · ' + esc(r.gloss.product) : ''));
      showToast(splitQty(r.name).base + ' liegt laut Glossar auf der Liste ' + tl.name + '.', 'Hier lassen', function(){ moveItem(r.id, r.from); }, 8000);
    }
    else if(r.status === 'back') flashText(r.name + ' ist wieder auf der Liste' + elsewhere(r) + '.');
    else if(r.status === 'qty') flashText('Menge geändert: ' + r.name + elsewhere(r));
    else flashText(r.name + ' steht schon auf der Liste' + elsewhere(r) + '.');
  } else {
    var nAdd = res.filter(function(r){ return r.status !== 'dup'; }).length, nRt = res.filter(function(r){ return r.status === 'routed'; }).length;
    var nAs = res.filter(function(r){ return r.status === 'gen' && r.target; }).length;
    flashText(nAdd + ' Artikel hinzugefügt' + (nRt ? ', ' + nRt + ' davon laut Glossar auf andere Listen.' : nAs ? ', ' + nAs + ' davon einem Markt zugeordnet.' : '.'));
  }
}
/* Ohne Glossar: liegt der letzte bekannte Preis woanders deutlich niedriger, Verschieben anbieten */
function suggestCheaper(id, name, l){
  if(!id) return;
  var obs = pricesOf(name, null), here = obs.filter(function(o){ return o.list === l.id; })[0], best = obs[0];
  if(!here || !best || best.list === l.id || !listById(best.list) || best.c > here.c * 0.97) return;
  showToast('Bei ' + listName(best.list) + ' zuletzt günstiger: ' + money(best.c) + ' statt ' + money(here.c) + '.', 'Verschieben', function(){ moveItem(id, best.list); }, 9000);
}
function moveStation(sid, to){
  var l = cur();
  if(!l) return false;
  var st = l.stations.slice(), from = stationIds(l).indexOf(sid);
  if(from < 0 || to < 0 || to >= st.length || to === from) return false;
  var m = st.splice(from, 1)[0];
  st.splice(to, 0, m);
  store.patchList(l.id, {stations: st});
  return true;
}
function learn(l, name, cat){
  var learned = Object.assign({}, l.learned);
  learned[baseKey(name)] = cat;
  var keys = Object.keys(learned);
  if(keys.length > 300){ keys.slice(0, keys.length - 300).forEach(function(k){ delete learned[k]; }); }
  store.patchList(l.id, {learned: learned}, true);
}
/* Löschen mit Rückgängig: erst ausblenden, nach 5 Sekunden endgültig */
function softDelete(ids, label){
  if(!ids.length) return;
  commitUndo();
  ids.forEach(function(id){ state.gone[id] = 1; });
  undoIds = ids.slice();
  clearTimeout(toastT);
  $('#toastText').textContent = label;
  $('#toastBtn').textContent = 'Rückgängig';
  toastFn = undo;
  toast.hidden = false;
  undoT = setTimeout(commitUndo, 5000);
  render();
}
function commitUndo(){
  if(!undoIds) return;
  clearTimeout(undoT);
  var ids = undoIds;
  undoIds = null;
  hideToast();
  ids.forEach(function(id){ delete state.gone[id]; });
  store.removeItems(ids);
}
function undo(){
  if(!undoIds) return;
  clearTimeout(undoT);
  undoIds.forEach(function(id){ delete state.gone[id]; });
  undoIds = null;
  hideToast();
  announce('Wiederhergestellt.');
  render();
}
function moveList(id, delta){
  var ids = orderedLists().map(function(l){ return l.id; }), i = ids.indexOf(id), j = i + delta;
  if(i < 0 || j < 0 || j >= ids.length) return;
  ids.splice(i, 1); ids.splice(j, 0, id);
  lsSet(LS_ORDER, JSON.stringify(ids));
  focusFn = function(){ return main.querySelector('[data-act="mk-' + (delta < 0 ? 'up' : 'down') + '"][data-id="' + sel(id) + '"]:not(:disabled)') || main.querySelector('[data-act="open-list"][data-id="' + sel(id) + '"]'); };
  render();
}
function toggleHidden(id){
  var h = hiddenIds(), i = h.indexOf(id);
  if(i >= 0) h.splice(i, 1); else h.push(id);
  lsSet(LS_HIDDEN, JSON.stringify(h));
  render();
}
async function setShop(on){
  state.shop = on;
  appEl.classList.toggle('shop', on);
  if(on){
    var ok = false;
    try{
      if(navigator.wakeLock){
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', function(){ wakeLock = null; });
        ok = true;
      }
    }catch(e){}
    flashText(ok ? 'Einkaufsmodus an. Der Bildschirm bleibt an.' : 'Einkaufsmodus an. Dieser Browser kann den Bildschirm nicht wach halten.');
  } else {
    try{ if(wakeLock) wakeLock.release(); }catch(e){}
    wakeLock = null;
    flashText('Einkaufsmodus aus.');
  }
  renderHeader();
}

/* ---------- Anzeige ---------- */
function badgeHTML(n){ return '<span class="badge sm" aria-hidden="true">' + n + '</span>'; }
function catHTML(l, c){
  var n = stationNo(l, c);
  return '<span class="hint-cat">' + badgeHTML(n) + '<span><span class="sr">Station ' + n + ': </span>' + esc(stationName(l, c)) + '</span></span>';
}
function flash(html){
  hint.innerHTML = html;
  hint.hidden = false;
  hint.classList.add('flash');
  clearTimeout(flashT);
  flashT = setTimeout(function(){ flashT = null; hint.classList.remove('flash'); updateHint(); }, 3200);
}
function flashText(msg){ flash(esc(msg)); }
/* Die Hinweiszeile erscheint nur beim Tippen oder für Meldungen */
function updateHint(){
  if(flashT){ hint.hidden = false; return; }
  var l = cur(), v = input.value.trim();
  if(!state.authed || state.view !== 'list' || !l || !v){ hint.hidden = true; hint.textContent = ''; return; }
  hint.hidden = false;
  var first = v.split(/[,;\n]+/)[0].trim();
  var hm0 = stripMarket(first);
  if(hm0){ hint.innerHTML = '→ ' + esc(hm0.list.name) + ' · ' + esc(cap(hm0.name)); return; }
  if(isGen(l)){
    var at = autoTarget(first);
    var fn = fitNames(first);
    hint.innerHTML = at ? '→ nur ' + esc(listName(at.list)) + ' (' + esc(at.why) + ')' : fn.length ? '→ ' + esc(fn.join(', ')) : '→ passt zu keinem Markt, ordne es im Artikel zu';
    return;
  }
  hint.innerHTML = catHTML(l, clsf(l, first));
}
function autosize(){
  input.style.height = 'auto';
  input.style.height = Math.min(input.scrollHeight, 120) + 'px';
}
function chipsHTML(act, items, current){
  return '<div class="fchips" role="group">' + items.map(function(x){
    return '<button class="fchip" data-act="' + act + '" data-id="' + esc(x[0]) + '" aria-pressed="' + (x[0] === current) + '">' + esc(x[1]) + '</button>';
  }).join('') + '</div>';
}

function renderTabs(){
  if(!state.authed || !state.lists.length || ['markets', 'bills', 'account'].indexOf(state.view) >= 0){ tabsEl.innerHTML = ''; tabsEl.hidden = true; return; }
  var tabs = visibleLists(), c = cur();
  if(c && tabs.indexOf(c) < 0) tabs.push(c);
  tabsEl.hidden = false;
  tabsEl.innerHTML = tabs.map(function(l){
    var on = l.id === state.listId, n = openCount(l);
    return '<button class="tab" role="tab" aria-selected="' + on + '" data-act="pick-list" data-id="' + esc(l.id) + '">' +
      '<span class="tn">' + esc(l.name) + '</span><span class="tc" aria-label="' + n + ' offen">' + n + '</span></button>';
  }).join('');
  var a = tabsEl.querySelector('[aria-selected="true"]');
  if(a && a.scrollIntoView) a.scrollIntoView({inline: 'nearest', block: 'nearest'});
}
function renderNav(){
  var idx = NAV_INDEX[state.view] || 0;
  slot.style.transform = 'translateX(' + (idx * 100) + '%)';
  Array.prototype.forEach.call(document.querySelectorAll('#nav .nb'), function(b, i){
    b.setAttribute('aria-current', i === idx ? 'true' : 'false');
  });
}
function renderHeader(){
  var l = cur(), onList = state.view === 'list' && !!l;
  $('#sumRow').hidden = !onList;
  if(onList){
    var its = viewItems(l), open = its.filter(function(i){ return !i.done; }).length, done = its.length - open;
    $('#sumText').textContent = its.length ? (open + ' offen · ' + done + ' im Wagen') : 'Noch keine Artikel';
    $('#barFill').style.transform = 'scaleX(' + (its.length ? done / its.length : 0) + ')';
  }
  var sb2 = $('#shopBtn');
  sb2.setAttribute('aria-pressed', state.shop ? 'true' : 'false');
  var n = state.queue.length, s = $('#sync');
  s.dataset.s = state.mode;
  $('#syncText').textContent = state.mode === 'live' ? (n ? 'Speichert …' : 'Live geteilt') :
    state.mode === 'lost' ? (n ? 'Offline · ' + n + ' offen' : 'Offline') : 'Verbinde';
  form.hidden = !onList;
  $('#composer').classList.toggle('bare', !onList);
  input.disabled = !state.authed || !l;
  form.querySelector('.add').disabled = !state.authed || !l;
  form.querySelector('.ibtn').disabled = !state.authed || !l;
}

function itemHTML(i){
  var isDone = !!i.done || !!pendingDone[i.id];
  var t = enterAt[i.id];
  if(t === undefined && seen && !seen.has(i.id)){ t = enterAt[i.id] = Date.now(); }
  var entering = t !== undefined && Date.now() - t < 240;
  var sq = splitQty(i.name), g = glossFor(i.name), subs = [];
  if(g && g.product) subs.push(g.product);
  if(renderL && !isGen(renderL) && i.list !== renderL.id){ var hl = listById(i.list); subs.push(hl && !isGen(hl) ? 'aus ' + hl.name : 'aus Allgemein'); }
  if(renderL && isGen(renderL)){
    var own = listById(i.list);
    var tg = tgts(i);
    if(own && !isGen(own)) subs.push('nur ' + [own.name].concat(tg.map(listName)).join(', '));
    else if(tg.length) subs.push('nur ' + tg.map(listName).join(', '));
    else { var fl = fitNames(i.name); subs.push(fl.length ? 'bei ' + fl.join(', ') : 'passt zu keinem Markt'); }
  }
  var cls = 'item' + (isDone ? ' done' : '') + (pendingDone[i.id] ? ' checking' : '') + (entering ? ' enter' : '');
  return '<li class="' + cls + '" data-id="' + esc(i.id) + '"' + (entering ? ' data-t="' + t + '"' : '') + '>' +
    '<button class="box-btn" role="checkbox" aria-checked="' + isDone + '" data-act="toggle" data-id="' + esc(i.id) + '" aria-label="' + esc(i.name) + '"><span class="box">' + CHECK + '</span></button>' +
    '<button class="name-btn" data-act="edit" data-id="' + esc(i.id) + '" aria-label="' + esc(i.name) + ' bearbeiten">' +
      (sq.qty ? '<span class="qty">' + esc(sq.qty) + '</span>' : '') + '<span class="nm"><span class="name">' + esc(cap(sq.base)) + '</span>' +
      (subs.length ? '<span class="sub">' + esc(subs.join(' · ')) + '</span>' : '') + '</span></button></li>';
}
function emptyNoList(){
  var waiting = !state.loaded;
  return '<section class="empty"><h2>' + (waiting ? 'Wird geladen …' : 'Noch keine Liste') + '</h2>' +
    (waiting ? '' : '<p>Lege eine Liste für deinen Laden an, zum Beispiel Rewe, Baumarkt oder IKEA.</p>' +
      '<div class="chips"><button class="chip" data-act="new-list-open">Neue Liste</button></div>') + '</section>';
}
function enterDelays(){
  var now = Date.now();
  Array.prototype.forEach.call(main.querySelectorAll('.item[data-t]'), function(el){
    el.style.animationDelay = (-(now - (+el.dataset.t))) + 'ms';
  });
}
function cartHTML(done){
  return '<section class="cart"><div class="cart-h"><h2>Im Wagen</h2><span class="count">' + done.length + '</span>' +
    '<button class="link" data-act="clear-done">Leeren</button></div><ul class="items">' + done.map(function(i){ return itemHTML(i); }).join('') + '</ul></section>';
}
/* Einordnung eines Artikels in der Allgemein-Liste: Station des Marktes, zu dem er gehört oder passt */
function genCat(i){
  var il = listById(i.list), m = null;
  if(il && !isGen(il)) m = il;
  else if(tgts(i)[0]) m = listById(tgts(i)[0]);
  else m = marketLists().filter(function(x){ return fitsMarket(x, i.name); })[0] || null;
  if(!m) return {key: 'sonst', label: 'Sonstiges', ord: 99999};
  var c = catIn(m, i), ml = marketLists(), mi = Math.max(0, ml.indexOf(m));
  var first = ml.filter(function(x){ return x.tpl === 'supermarkt'; })[0];
  if(m.tpl === 'supermarkt') return {key: c, label: stationName(m, c), ord: (first ? 0 : 0) + stationNo(m, c)};
  return {key: m.id + '|' + c, label: m.name + ' · ' + stationName(m, c), ord: 1000 + mi * 100 + stationNo(m, c)};
}
function renderGeneral(l){
  var its = viewItems(l), h = '';
  if(!state.loaded || !its.length){
    h += '<section class="empty"><h2>' + (state.loaded ? 'Allgemeine Liste' : 'Liste wird geladen …') + '</h2>' +
      '<p>Tragt hier alles ein, was ihr braucht. Was ihr direkt in einem Markt eintragt, erscheint hier auch. Jeder Artikel erscheint in den Märkten, die ihn führen: Lebensmittel in Supermärkten, Schrauben im Baumarkt. Ist er einem Markt zugeordnet, erscheint er nur dort. Zuordnen kann die App selbst (Glossar und Kassenzettel), oder du stellst es im Artikel ein.</p>' +
      (state.loaded ? '<div class="chips">' + ['Bananen', 'Hafermilch', 'Spülmittel', 'Brezn'].map(function(x){ return '<button class="chip" data-act="sample" data-text="' + esc(x) + '">' + esc(x) + '</button>'; }).join('') + '</div>' : '') +
      (state.loaded && !state.dbV6 ? '<p class="tip" style="margin-top:10px">Für die Zuordnung zu einzelnen Märkten fehlt noch ein Datenbank-Update (schema_v7.sql).</p>' : '') + '</section>';
    main.innerHTML = h;
    return;
  }
  var open = its.filter(function(i){ return !i.done || pendingDone[i.id]; }).sort(byTs);
  var done = its.filter(function(i){ return i.done && !pendingDone[i.id]; }).sort(byTs);
  var groups = {}, meta = {};
  open.forEach(function(i){ var g = genCat(i); meta[g.key] = g; (groups[g.key] = groups[g.key] || []).push(i); });
  var order = Object.keys(groups).sort(function(a, b){ return meta[a].ord - meta[b].ord; });
  h += order.map(function(k){
    return '<section class="gsec"><div class="stop-h"><h2>' + esc(meta[k].label) + '</h2><span class="count">' + groups[k].length + '</span></div>' +
      '<ul class="items">' + groups[k].map(function(i){ return itemHTML(i); }).join('') + '</ul></section>';
  }).join('');
  if(!order.length) h += '<p class="allset">Alles erledigt.</p>';
  if(done.length) h += cartHTML(done);
  main.innerHTML = h;
  enterDelays();
}
function renderList(){
  var l = cur();
  renderL = l;
  if(!l){ main.innerHTML = emptyNoList(); return; }
  if(isGen(l)){ renderGeneral(l); return; }
  var its = viewItems(l), h = '';
  var waiting = !state.loaded;
  if(waiting || !its.length){
    var samples = ({baumarkt:['Schrauben','Wandfarbe','Dübel','Silikon'], ikea:['Teelichter','Kissen','Box','Köttbullar'], drogerie:['Shampoo','Zahnpasta','Duschgel','Windeln']}[l.tpl]) || ['Bananen','Hafermilch','Spülmittel','Brezn'];
    h += '<section class="empty"><h2>' + (waiting ? 'Liste wird geladen …' : 'Noch nichts auf der Liste') + '</h2>' +
      '<p>' + (l.tpl === 'eigen' ? 'Tippe unten einen Artikel ein. In den Einstellungen legst du eigene Stationen an.' : 'Tippe unten einen Artikel ein, gern mit Menge wie „3 Bananen“. Die App sortiert alles nach eurer Route.') + '</p>';
    if(!waiting && samples.length){
      h += '<div class="chips">' + samples.map(function(t){
        return '<button class="chip" data-act="sample" data-text="' + esc(t) + '">' + esc(t) + '</button>';
      }).join('') + '</div>';
    }
    h += '</section>';
    main.innerHTML = h;
    return;
  }
  var open = its.filter(function(i){ return !i.done || pendingDone[i.id]; }).sort(byTs);
  var done = its.filter(function(i){ return i.done && !pendingDone[i.id]; }).sort(byTs);
  var by = {};
  open.forEach(function(i){ var c = catIn(l, i); (by[c] = by[c] || []).push(i); });
  var stops = stationIds(l).filter(function(id){ return by[id]; });
  if(stops.length){
    h += '<ol class="route">' + stops.map(function(id){
      var no = stationNo(l, id);
      return '<li class="stop"><span class="badge" aria-hidden="true">' + no + '</span>' +
        '<div class="stop-h"><h2><span class="sr">Station ' + no + ': </span>' + esc(stationName(l, id)) + '</h2><span class="count">' + by[id].length + '</span></div>' +
        '<ul class="items">' + by[id].map(function(i){ return itemHTML(i); }).join('') + '</ul></li>';
    }).join('') + '<li class="end"><span>Kasse</span></li></ol>';
  } else {
    h += '<p class="allset">Alles im Wagen. Ab zur Kasse.</p>';
  }
  if(done.length) h += cartHTML(done);
  if(!genLists().length && state.loaded && !lsGet('manjo-gen-tip')){
    h += '<div class="gl-box" style="margin-top:14px"><span><b>Neu:</b> eine allgemeine Liste für alles, was ihr braucht. Jeder Artikel erscheint in den Märkten, die ihn führen.</span>' +
      '<button class="ghost sm" data-act="gen-create">Anlegen</button><button class="link" data-act="gen-tip-off" style="margin-left:0">Nicht jetzt</button></div>';
  }
  if(!state.shop && its.length <= 3 && !lsGet('manjo-tip-swipe')){
    h += '<p class="tip" style="margin-top:12px">Tipp: Wisch einen Artikel nach rechts zum Abhaken, nach links zum Löschen. Ein Tipp auf den Namen öffnet Bearbeiten.</p>';
  }
  main.innerHTML = h;
  var now = Date.now();
  Array.prototype.forEach.call(main.querySelectorAll('.item[data-t]'), function(el){
    el.style.animationDelay = (-(now - (+el.dataset.t))) + 'ms';
  });
}

function renderMarkets(){
  var ol = orderedLists(), hid = hiddenIds(), h = '';
  h += '<div class="bhead"><h2>Märkte</h2><button class="sheet-btn primary" data-act="new-list-open">' + PLUS + ' Neuer Markt</button></div>';
  h += '<p class="tip">Reihenfolge und Sichtbarkeit der Tabs gelten für dieses Gerät. Ausgeblendete Märkte bleiben erhalten.</p>';
  if(!ol.length) h += emptyNoList();
  ol.forEach(function(l, i){
    var off = hid.indexOf(l.id) >= 0, n = openCount(l), ppl = people(l).length;
    var meta = (isGen(l) ? 'Allgemein · ' : '') + n + ' offen · ' + (canManage(l) ? 'von dir' : 'geteilt von ' + who(l.ownerEmail)) + (ppl > 1 ? ' · ' + ppl + ' Personen' : '');
    h += '<div class="mk' + (off ? ' off' : '') + '">' +
      '<button class="mk-main" data-act="open-list" data-id="' + esc(l.id) + '"><b>' + esc(l.name) + '</b><span>' + esc(meta) + (off ? ' · ausgeblendet' : '') + '</span></button>' +
      '<button class="mk-btn" data-act="mk-up" data-id="' + esc(l.id) + '" aria-label="' + esc(l.name) + ' nach oben"' + (i === 0 || isGen(l) || isGen(ol[i - 1]) ? ' disabled' : '') + '>' + UP + '</button>' +
      '<button class="mk-btn" data-act="mk-down" data-id="' + esc(l.id) + '" aria-label="' + esc(l.name) + ' nach unten"' + (i === ol.length - 1 || isGen(l) ? ' disabled' : '') + '>' + DOWN + '</button>' +
      '<button class="mk-btn" data-act="mk-vis" data-id="' + esc(l.id) + '" aria-pressed="' + !off + '" aria-label="' + esc(l.name) + (off ? ' in den Tabs zeigen' : ' in den Tabs ausblenden') + '">' + (off ? EYE_OFF : EYE) + '</button></div>';
  });
  if(ol.length) h += glossaryHTML();
  main.innerHTML = h;
}
function glossaryHTML(){
  var ps = state.products.filter(function(p){ return listById(p.list); }).sort(function(a, b){ return a.name.localeCompare(b.name, 'de'); });
  var h = '<div class="bhead" style="margin-top:22px"><h2>Glossar</h2><button class="sheet-btn" data-act="gloss-new">' + PLUS + ' Eintrag</button></div>';
  h += '<p class="tip">Ein Begriff steht für ein bestimmtes Produkt und einen Markt. Beispiel: Hafermilch ist immer NoMilk Hafer 3,5 % von Lidl. Gilt für alle, die den Markt sehen.</p>';
  if(!ps.length) h += '<p class="tip">Noch keine Einträge. Du kannst auch in einem Artikel auf „Im Glossar festlegen“ tippen.</p>';
  ps.forEach(function(p){
    var obs = pricesOf(p.name, p), last = obs.filter(function(o){ return o.list === p.list; })[0] || obs[0];
    var meta = (p.product ? p.product + ' · ' : '') + listName(p.list) + (last ? ' · zuletzt ' + money(last.c) + (last.list !== p.list ? ' bei ' + listName(last.list) : '') : '');
    h += '<div class="mk"><button class="mk-main" data-act="gloss-open" data-id="' + esc(p.id) + '"><b>' + esc(p.name) + '</b><span>' + esc(meta) + '</span></button></div>';
  });
  return h;
}

function billHead(){
  var tabs = [['foto', 'Fotografieren', 'Foto'], ['saldo', 'Saldo', 'Saldo'], ['kat', 'Kategorien', 'Kategorien']];
  var h = '<div class="bhead"><h2>Rechnungen</h2></div>';
  h += '<div class="tabs" role="tablist" aria-label="Rechnungen">' + tabs.map(function(t){
    return '<button class="tab" role="tab" aria-selected="' + (state.billTab === t[0]) + '" data-act="bill-tab" data-tab="' + t[0] + '" aria-label="' + t[1] + '">' +
      '<span class="tn"><span class="long">' + t[1] + '</span><span class="short" aria-hidden="true">' + t[2] + '</span></span></button>';
  }).join('') + '</div>';
  var ol = orderedLists();
  if(ol.length > 1){
    h += chipsHTML('bill-market', [['all', 'Alle Märkte']].concat(ol.map(function(l){ return [l.id, l.name]; })), state.billMarket);
  } else {
    h += '<div style="height:10px"></div>';
  }
  return h;
}
function balanceHTML(){
  var lists = billLists(), ex = billExpenses(), L = settleUp(ex, peopleOf(lists)), h = '';
  h += '<p class="tip">' + (L.count ? 'Gesamt ' + money(L.total) + ' bei ' + L.count + (L.count === 1 ? ' Einkauf' : ' Einkäufen') + (state.billMarket === 'all' ? ' in allen Märkten.' : '.') : 'Noch keine Rechnung eingetragen.') + '</p>';
  h += '<section class="set"><h3>Wer schuldet wem</h3>';
  if(!L.lines.length){
    var solo = ex.filter(function(e){ return e.kind !== 'settle' && e.parts.every(function(p){ return p === e.payer; }); }).length;
    h += '<p class="tip">Alles ausgeglichen.' + (L.count && solo === L.count ? ' Die bisherigen Einkäufe wurden mit niemandem geteilt, deshalb schuldet keiner etwas. Beim Eintragen legst du unter „Geteilt mit“ fest, wer mitzahlt.' : '') + '</p>';
  }
  L.lines.forEach(function(x){
    var key = x.from + '|' + x.to + '|' + x.cents, conf = state.confirmSettle === key;
    h += '<div class="settle"><span>' + esc(who(x.from)) + '<span class="arr">→</span>' + esc(who(x.to)) + '</span><b>' + money(x.cents) + '</b>' +
      '<button class="ghost sm' + (conf ? ' on' : '') + '" data-act="settle" data-from="' + esc(x.from) + '" data-to="' + esc(x.to) + '" data-cents="' + x.cents + '">' + (conf ? 'Bezahlt?' : 'Ausgleichen') + '</button></div>';
  });
  if(L.lines.length) h += '<p class="tip" style="margin-top:6px">„Ausgleichen“ trägt eine Rückzahlung ein, wenn das Geld überwiesen oder bar gegeben wurde.</p>';
  h += '</section>';
  var involved = {};
  involved[state.me.email] = 1;
  ex.forEach(function(e){ involved[e.payer] = 1; e.parts.forEach(function(p){ involved[p] = 1; }); });
  var ppl = peopleOf(lists).concat(Object.keys(L.bal)).filter(function(p, i, a){ return a.indexOf(p) === i && (involved[p] || L.bal[p]); });
  if(ppl.length){
    h += '<section class="set"><h3>Saldo pro Person</h3>';
    ppl.forEach(function(p){
      var b = L.bal[p] || 0;
      h += '<div class="balrow"><span class="pn">' + esc(who(p)) + '</span><span class="bv ' + (b > 0 ? 'pos' : b < 0 ? 'neg' : '') + '">' + (b > 0 ? '+' : '') + money(b) + '</span></div>';
    });
    h += '</section>';
  }
  return h;
}
function photoHTML(){
  var ex = billExpenses().slice().sort(function(a, b){ return (b.spent > a.spent ? 1 : b.spent < a.spent ? -1 : 0) || (b.ts - a.ts); });
  var many = state.billMarket === 'all' && state.lists.length > 1;
  var h = '<button class="sheet-btn primary photo-big" data-act="photo">' + CAMERA + ' Kassenzettel fotografieren</button>' +
    '<button class="sheet-btn photo-big" data-act="photo-gallery">' + GALLERY + ' Aus Galerie wählen</button>' +
    '<p class="tip">Das Foto bleibt auf deinem Gerät. Du prüfst die erkannten Positionen, bevor etwas gespeichert wird.</p>' +
    '<div class="bhead" style="margin:6px 0 4px"><button class="ghost" data-act="exp-new">Ausgabe ohne Foto</button></div>';
  if(!ex.length) h += '<p class="tip">Noch keine Rechnung eingetragen.</p>';
  ex.forEach(function(e){
    var conf = state.confirmExp === e.id, l = listById(e.list);
    var mk = many && l ? ' · ' + esc(l.name) : '';
    var head, meta;
    if(e.kind === 'settle'){
      head = 'Ausgleich';
      meta = fmtISO(e.spent) + ' · ' + esc(who(e.payer)) + ' an ' + esc(who(e.parts[0] || '')) + mk;
    } else {
      head = esc(e.desc || 'Einkauf');
      meta = fmtISO(e.spent) + ' · ' + esc(who(e.payer)) + ' hat bezahlt' + (e.lines.length ? ' · ' + e.lines.length + ' Positionen' : '') + mk;
    }
    var inner = '<b>' + head + '</b><span>' + meta + '</span>';
    h += '<div class="exrow' + (e.kind === 'settle' ? ' settle-row' : '') + '">' +
      (e.kind === 'settle' || e.id.indexOf('tmp-') === 0 ? '<div class="exm">' + inner + '</div>' : '<button class="exm" data-act="exp-edit" data-id="' + esc(e.id) + '" aria-label="' + head + ' bearbeiten">' + inner + '</button>') +
      '<b class="exa">' + money(e.cents) + '</b>' +
      '<button class="del" data-act="exp-del" data-id="' + esc(e.id) + '" aria-label="Eintrag löschen" style="' + (conf ? 'width:auto;padding:0 6px;color:var(--danger);font-weight:600' : '') + '">' + (conf ? 'Löschen?' : XICON) + '</button></div>';
  });
  return h;
}
function katHTML(){
  var m = state.month, ct = catSplit(billExpenses(), m, catKey), rows = [];
  Object.keys(ct.map).forEach(function(k){ if(ct.map[k]) rows.push({n: k || 'Nicht zugeordnet', c: ct.map[k], none: !k}); });
  rows.sort(function(a, b){ return (a.none - b.none) || (b.c - a.c); });
  var h = '<div class="monthbar"><button class="ibtn" data-act="month" data-d="-1" aria-label="Vormonat">‹</button><h2>' + esc(cap(monthLabel(m))) + '</h2><button class="ibtn" data-act="month" data-d="1" aria-label="Nächster Monat">›</button></div>';
  if(!rows.length) return h + '<p class="tip">Noch keine Ausgaben in diesem Monat. Fotografiere Kassenzettel im Tab Fotografieren.</p>';
  h += '<p class="tip">Gesamt im Monat: <b>' + money(ct.total) + '</b>' + (state.billMarket === 'all' ? ' in allen Märkten' : '') + '. Sortiert nach dem meisten Geld.</p>';
  rows.forEach(function(r){
    var pct = ct.total ? Math.round(r.c / ct.total * 100) : 0;
    h += '<div class="catrow' + (r.none ? ' none' : '') + '"><div class="top"><span>' + esc(r.n) + '</span><b class="catsum">' + money(r.c) + '</b></div>' +
      '<div class="catbar"><i style="width:' + Math.max(0, Math.min(100, pct)) + '%"></i></div><span class="pct">' + pct + ' %</span></div>';
  });
  return h;
}
function renderBills(){
  if(!state.lists.length){ main.innerHTML = emptyNoList(); return; }
  main.innerHTML = billHead() + (state.billTab === 'saldo' ? balanceHTML() : state.billTab === 'kat' ? katHTML() : photoHTML());
}

function peopleHTML(){
  var mine = orderedLists().filter(function(l){ return l.owner === state.me.id; });
  var shared = orderedLists().filter(function(l){ return l.owner !== state.me.id; });
  var h = '<section class="set"><h3>Personen und Freigaben</h3>';
  if(mine.length){
    var emails = state.accessExtra.slice();
    mine.forEach(function(l){ people(l).forEach(function(p){ if(p !== state.me.email && emails.indexOf(p) < 0) emails.push(p); }); });
    h += '<p class="tip">Hake an, welche deiner Märkte eine Person sehen darf. Es geht keine Mail raus: Die Person sieht die Märkte, sobald sie sich mit genau dieser E-Mail-Adresse anmeldet.</p>';
    emails.forEach(function(p){
      h += '<div class="acc-person"><div class="person"><span class="pn">' + esc(whoFull(p)) + '</span></div><div class="acc-lists">' + mine.map(function(l){
        var on = l.members.indexOf(p) >= 0;
        return '<label class="acc-row"><input type="checkbox" data-list="' + esc(l.id) + '" data-email="' + esc(p) + '"' + (on ? ' checked' : '') + '><span>' + esc(l.name) + '</span></label>';
      }).join('') + '</div></div>';
    });
    if(!emails.length) h += '<p class="tip">Noch niemand eingeladen.</p>';
    h += '<form class="inline-form" id="accessForm" autocomplete="off" style="margin-top:8px"><label class="sr" for="accessEmail">E-Mail-Adresse</label>' +
      '<input class="field" id="accessEmail" type="email" inputmode="email" autocapitalize="none" placeholder="E-Mail-Adresse eintragen"><button class="ibtn" type="submit" aria-label="Person hinzufügen">' + PLUS + '</button></form>';
  }
  if(shared.length){
    h += '<h3 style="margin-top:14px">Mit dir geteilt</h3>';
    shared.forEach(function(l){
      h += '<div class="person"><span class="pn">' + esc(l.name) + '</span><span class="tag">von ' + esc(who(l.ownerEmail)) + '</span></div>';
    });
  }
  if(!mine.length && !shared.length) h += '<p class="tip">Lege zuerst einen Markt an.</p>';
  return h + '</section>';
}
function renderAccount(){
  var my = state.profiles[state.me.email] || '', n = state.queue.length;
  main.innerHTML =
    '<section class="set"><h3>Dein Name</h3><p class="tip">So erscheinst du bei den anderen, zum Beispiel im Saldo.</p>' +
    '<form class="inline-form" id="nameForm" autocomplete="off"><label class="sr" for="myName">Dein Name</label>' +
    '<input class="field" id="myName" maxlength="40" value="' + esc(my) + '" placeholder="Vorname"><button class="ibtn" type="submit" aria-label="Name speichern">' + TICK + '</button></form></section>' +
    peopleHTML() +
    '<section class="set"><h3>Konto</h3><div class="acct"><b>' + esc(state.me.email || 'Angemeldet') + '</b><span>Eure Daten liegen in eurem Supabase-Projekt.' + (n ? ' ' + n + ' Änderungen warten auf Verbindung.' : '') + '</span></div>' +
    '<button class="ghost' + (state.confirmOut ? ' warn' : '') + '" data-act="signout">' + (state.confirmOut ? 'Trotzdem abmelden? Ungespeichertes geht verloren' : 'Abmelden') + '</button></section>' +
    logHTML();
}
function logHTML(){
  var l = lsJSON(LS_LOG, []);
  var h = '<section class="set"><h3>Fehlerprotokoll</h3><p class="tip">Version ' + APP_VERSION + '. Wenn etwas nicht klappt, kopiere diesen Text und schick ihn weiter.</p>';
  h += l.length ? '<pre class="log" id="logText">' + esc(l.slice().reverse().map(function(x){ return x.t + '  ' + x.k + ': ' + x.m; }).join('\n')) + '</pre>' : '<p class="tip">Noch keine Einträge.</p>';
  h += '<div class="bhead" style="margin-top:6px"><button class="ghost" data-act="log-copy">Kopieren</button>' + (l.length ? '<button class="ghost" data-act="log-clear">Leeren</button>' : '') + '</div></section>';
  return h;
}
function renderSettings(){
  var l = cur(), h = '';
  if(!l){ main.innerHTML = emptyNoList(); return; }
  var manage = canManage(l);
  if(isGen(l)){
    h += '<section class="set"><h3>Liste</h3><label class="sr" for="listNameInput">Name der Liste</label>' +
      '<input class="field" id="listNameInput" value="' + esc(l.name) + '" maxlength="40" autocomplete="off"' + (manage ? '' : ' disabled') + '>' +
      '<p class="tip" style="margin-top:6px">Allgemeine Liste ohne Route. Ihre Artikel erscheinen in den Marktlisten und werden dort nach der jeweiligen Route einsortiert.</p></section>';
    h += '<section class="set"><h3>Personen</h3><p class="tip">' + people(l).map(function(p){ return esc(who(p)); }).join(', ') + '. Einladen und Freigaben findest du unter Account.</p>' +
      '<button class="ghost" data-act="nav" data-view="account">Zu den Personen</button></section>';
    if(manage) h += '<section class="set"><button class="ghost warn" data-act="del-list">' + (state.confirmDel ? 'Wirklich löschen? Mit allen Artikeln' : 'Liste „' + esc(l.name) + '“ löschen') + '</button></section>';
    main.innerHTML = h;
    return;
  }
  var dis = manage ? '' : ' disabled';
  var counts = {};
  listItems(l).forEach(function(i){ if(!i.done){ var c = effCat(l, i.cat); counts[c] = (counts[c] || 0) + 1; } });
  var n = l.stations.length;
  h += '<section class="set"><h3>Liste</h3>' +
    '<label class="sr" for="listNameInput">Name der Liste</label>' +
    '<input class="field" id="listNameInput" value="' + esc(l.name) + '" maxlength="40" autocomplete="off"' + dis + '>' +
    '<p class="tip" style="margin-top:6px">Vorlage: ' + esc(TPLS[l.tpl].name) + (manage ? '' : ' · nur ' + esc(who(l.ownerEmail)) + ' kann Namen und Route ändern') + '</p></section>';

  h += '<section class="set"><h3>Route durch den Laden</h3>' +
    '<p class="tip">Zieh die Stationen am Griff in die Reihenfolge, in der ihr durch den Laden lauft. Namen kannst du antippen und ändern.</p>' +
    '<ol class="order-list" id="orderList">' + l.stations.map(function(s, idx){
      var ex = inTpl(l.tpl, s.id) ? TPLS[l.tpl].stations.filter(function(x){ return x.id === s.id; })[0].ex : '';
      return '<li class="ord' + (counts[s.id] ? '' : ' empty') + '" data-cat="' + esc(s.id) + '"><span class="badge">' + (idx + 1) + '</span>' +
        '<span class="ord-text"><input class="station-in" data-cat="' + esc(s.id) + '" value="' + esc(s.name) + '" maxlength="40" aria-label="Name der Station ' + (idx + 1) + '" autocomplete="off"' + dis + '>' +
        (ex ? '<span class="ord-ex">' + esc(ex) + '</span>' : '') + '</span>' +
        (counts[s.id] ? '<span class="count">' + counts[s.id] + '</span>' : '') +
        '<button class="grip" data-cat="' + esc(s.id) + '" aria-label="' + esc(s.name) + ', Position ' + (idx + 1) + ' von ' + n + '. Ziehen oder mit den Pfeiltasten verschieben."' + dis + '>' + GRIP + '</button>' +
        '<button class="del" data-act="del-station" data-cat="' + esc(s.id) + '" aria-label="Station ' + esc(s.name) + ' entfernen"' + (manage && s.id !== 'sonst' ? '' : ' disabled') + '>' + XICON + '</button></li>';
    }).join('') + '</ol>' +
    (manage ? '<form class="inline-form" id="stationForm" autocomplete="off"><label class="sr" for="newStation">Neue Station</label>' +
      '<input class="field" id="newStation" maxlength="40" placeholder="Station hinzufügen"><button class="ibtn" type="submit" aria-label="Station hinzufügen">' + PLUS + '</button></form>' : '') +
    '<p class="tip">Wird eine Station gelöscht, landen ihre Artikel unter „Sonstiges“.</p>' +
    (l.tpl !== 'eigen' && manage ? '<button class="ghost" data-act="reset-order">Vorlage wiederherstellen</button>' : '') +
    '</section>';

  h += '<section class="set"><h3>Personen</h3><p class="tip">' + people(l).map(function(p){ return esc(who(p)); }).join(', ') + '. Einladen und Freigaben findest du unter Account.</p>' +
    '<button class="ghost" data-act="nav" data-view="account">Zu den Personen</button></section>';

  if(manage){
    h += '<section class="set"><button class="ghost warn" data-act="del-list">' + (state.confirmDel ? 'Wirklich löschen? Mit allen Artikeln und Rechnungen' : 'Liste „' + esc(l.name) + '“ löschen') + '</button></section>';
  }
  main.innerHTML = h;
}

function render(){
  if(drag){ drag.dirty = true; return; }
  renderTabs(); renderHeader(); renderNav();
  var a = document.activeElement;
  var typing = a && main.contains(a) && (a.tagName === 'TEXTAREA' || (a.tagName === 'INPUT' && a.type !== 'checkbox' && a.type !== 'radio'));
  if(typing){ pendingRender = true; }
  else {
    pendingRender = false;
    if(!state.authed) main.innerHTML = '';
    else if(state.view === 'list') renderList();
    else if(state.view === 'markets') renderMarkets();
    else if(state.view === 'bills') renderBills();
    else if(state.view === 'settings') renderSettings();
    else if(state.view === 'account') renderAccount();
  }
  renderSheet();
  updateHint();
  if(state.loaded){
    if(!seen) seen = new Set();
    state.items.forEach(function(i){ seen.add(i.id); });
  }
  if(focusFn){
    var f = focusFn; focusFn = null;
    var el = f();
    if(el) el.focus({preventScroll: true});
  }
  saveCache();
}
function setView(v){
  state.view = v;
  state.confirmDel = false;
  state.confirmExp = null;
  state.confirmSettle = null;
  state.confirmOut = false;
  main.scrollTop = 0;
  render();
  main.classList.remove('vin');
  if(!RM){ void main.offsetWidth; main.classList.add('vin'); }
}

/* ---------- Blätter ---------- */
function sheetContent(){
  var s = state.sheet, l = cur();
  if(!s) return null;
  if(s.type === 'item'){
    var it = findItem(s.id), il = it && listById(it.list);
    if(!it || !il) return null;
    var ctxL = listById(s.ctx) || il, gen = isGen(il);
    var stL = gen ? (isGen(ctxL) ? null : ctxL) : il;
    var curCat = stL ? catIn(stL, it) : null;
    return {title: 'Artikel bearbeiten', sub: gen ? 'Artikel aus der allgemeinen Liste. Name, Menge und Zuordnung gelten überall.' : 'Name und Menge ändern, zum Beispiel „2 Milch“, oder eine andere Station wählen. Die App merkt sich die Station für diesen Artikel.',
      body: '<form id="itemForm" class="inline-form" autocomplete="off"><label class="sr" for="itemName">Name</label>' +
        '<input class="field" id="itemName" maxlength="120" value="' + esc(it.name) + '"><button class="ibtn" type="submit" aria-label="Name speichern">' + TICK + '</button></form>' +
        assignHTML(it) +
        itemGlossHTML(it) +
        '<h3 class="rc-h">Preise</h3>' + pricesHTML(pricesOf(it.name)) +
        (stL ? '<h3 class="rc-h">Station' + (gen ? ' bei ' + esc(stL.name) : '') + '</h3>' +
        '<ul class="cat-list">' + stL.stations.map(function(st, idx){
          var c = st.id === curCat;
          return '<li><button class="cat-btn" data-act="cat" data-cat="' + esc(st.id) + '"' + (c ? ' aria-current="true"' : '') + '>' +
            '<span class="badge sm" aria-hidden="true">' + (idx + 1) + '</span><span class="t">' + esc(st.name) + '</span>' + (c ? TICK : '') + '</button></li>';
        }).join('') + '</ul>' : '') + '<button class="danger" data-act="delete">Artikel löschen</button>'};
  }
  if(s.type === 'gloss'){
    return {title: s.id ? 'Glossar-Eintrag' : 'Neuer Glossar-Eintrag', sub: 'Lege fest, welches Produkt mit einem Begriff gemeint ist und wo ihr es kauft. Tippt jemand den Begriff in eine Liste, landet er automatisch auf der Liste dieses Markts.',
      body: glossBody(s)};
  }
  if(s.type === 'new'){
    return {title: 'Neue Liste', sub: 'Die Vorlage legt Stationen und Stichwörter an. Alles lässt sich später ändern.',
      body: '<form id="newListForm" autocomplete="off"><div class="tpls">' + TPL_ORDER.map(function(t){
        return '<button type="button" class="tpl-btn" data-act="tpl" data-tpl="' + t + '" aria-pressed="' + (s.tpl === t) + '"><b>' + esc(TPLS[t].name) + '</b><span>' + esc(TPLS[t].desc) + '</span></button>';
      }).join('') + (genLists().length ? '' : '<button type="button" class="tpl-btn" data-act="tpl" data-tpl="' + GEN + '" aria-pressed="' + (s.tpl === GEN) + '"><b>Allgemein</b><span>Eine Liste für alle Märkte, ohne Route</span></button>') + '</div><label class="sr" for="newListName">Name der Liste</label>' +
      '<input class="field" id="newListName" maxlength="40" value="' + esc(s.name) + '" placeholder="Name, z. B. Rewe Spinnerei">' +
      '<button class="sheet-btn primary" type="submit" style="margin-top:8px">Anlegen</button></form>'};
  }
  if(s.type === 'import'){
    return {title: 'Liste einfügen', sub: 'Füge eine ganze Einkaufsliste ein, eine Zeile pro Artikel oder mit Komma getrennt. Die App sortiert sie in die Stationen.',
      body: '<label class="sr" for="impText">Artikel</label><textarea class="imp" id="impText" placeholder="Bananen&#10;2 Hafermilch&#10;Spülmittel">' + esc(s.text || '') + '</textarea>' +
        '<div class="prev" id="impPrev"></div>' +
        '<button class="sheet-btn primary" id="impAdd" data-act="imp-add" disabled>Hinzufügen</button>'};
  }
  if(s.type === 'ocr'){
    return {title: 'Kassenzettel lesen', sub: 'Die Erkennung läuft auf deinem Gerät. Das Foto verlässt es nicht. Beim ersten Mal lädt die App die Erkennung nach.',
      body: '<p class="tip">Erkannt: <b id="ocrP">' + (s.p || 0) + ' %</b></p>'};
  }
  if(s.type === 'rcp' && state.rcp && listById(state.rcp.list)){
    var r = state.rcp;
    var title = r.mode === 'photo' ? 'Kassenzettel prüfen' : r.mode === 'edit' ? 'Ausgabe bearbeiten' : 'Ausgabe eintragen';
    var sub = r.mode === 'photo' ? 'Die App hat diese Positionen erkannt. Korrigiere, was nicht stimmt. Jede Position bekommt eine Station.' :
      'Betrag, wer bezahlt hat und mit wem geteilt wird. Positionen sind freiwillig und fließen in die Kategorien.';
    return {title: title, sub: sub, body: rcpBody(r)};
  }
  return null;
}
function assignHTML(it){
  var il = listById(it.list), gen = isGen(il), ml = marketLists(), t = tgts(it);
  if(!gen && ml.length < 2) return '';
  var chips = (gen ? [['', 'Passende Märkte', !t.length]] : []).concat(ml.map(function(x){
    return [x.id, x.name, gen ? t.indexOf(x.id) >= 0 : (x.id === it.list || t.indexOf(x.id) >= 0), !gen && x.id === it.list];
  }));
  var fl = fitNames(it.name);
  return '<h3 class="rc-h">Erscheint in</h3><div class="fchips" role="group">' + chips.map(function(x){
    return '<button class="fchip" data-act="assign" data-id="' + esc(x[0]) + '" aria-pressed="' + !!x[2] + '"' + (x[3] ? ' disabled' : '') + '>' + esc(x[1]) + '</button>';
  }).join('') + '</div>' +
    (gen && !t.length ? '<p class="tip">Passend sind gerade: ' + (fl.length ? esc(fl.join(', ')) : 'keine. Wähle einen oder mehrere Märkte.') + '</p>' : '<p class="tip">Mehrere Märkte sind möglich.</p>') +
    (state.dbV6 ? '' : '<p class="tip">Für die Zuordnung fehlt noch ein Datenbank-Update (schema_v7.sql).</p>');
}
function itemGlossHTML(it){
  var g = glossFor(it.name);
  if(g) return '<div class="gl-box"><span>Im Glossar: <b>' + esc(g.product || g.name) + '</b>, kaufen bei <b>' + esc(listName(g.list)) + '</b></span>' +
    '<button class="ghost sm" data-act="gloss-item">Ändern</button></div>';
  return '<div class="gl-box"><span>Immer dasselbe Produkt oder derselbe Markt?</span><button class="ghost sm" data-act="gloss-item">Im Glossar festlegen</button></div>';
}
function glossBody(s){
  var ol = marketLists();
  var h = '<form id="glossForm" autocomplete="off">' +
    '<label class="field-l">Begriff auf der Liste<input class="field" id="gName" maxlength="60" value="' + esc(s.name) + '" placeholder="z. B. Hafermilch"></label>' +
    '<label class="field-l" style="margin-top:8px">Genaues Produkt<input class="field" id="gProduct" maxlength="120" value="' + esc(s.product) + '" placeholder="z. B. NoMilk Hafer 3,5 % Fett"></label>' +
    '<label class="field-l" style="margin-top:8px">Kaufen bei<select class="field" id="gList">' + ol.map(function(x){
      return '<option value="' + esc(x.id) + '"' + (x.id === s.list ? ' selected' : '') + '>' + esc(x.name) + '</option>';
    }).join('') + '</select></label>' +
    '<label class="field-l" style="margin-top:8px">So steht es auf dem Kassenzettel (freiwillig)<input class="field" id="gTerms" maxlength="200" value="' + esc(s.terms) + '" placeholder="z. B. NOMILK HAFER, mehrere mit Komma"></label>' +
    '<p class="tip" style="margin-top:6px">Damit findet die App den Preis auch, wenn der Kassenzettel das Produkt anders abkürzt.</p>';
  if(s.name) h += '<h3 class="rc-h">Preise</h3>' + pricesHTML(pricesFor(termsFor(s.name, {name: s.name, product: s.product, terms: s.terms}), state.expenses, norm));
  h += '<p class="rc-err" id="glErr" role="alert" hidden></p>' +
    '<button class="sheet-btn primary" type="submit" style="margin-top:12px">Speichern</button></form>' +
    (s.id ? '<button class="danger" data-act="gloss-del" data-id="' + esc(s.id) + '">Aus dem Glossar löschen</button>' : '');
  return h;
}
function glossDefaultList(it){
  var ml = marketLists();
  if(it){ var il = listById(it.list); if(il && !isGen(il)) return il.id; if(tgts(it)[0]) return tgts(it)[0]; }
  var c = cur();
  return c && !isGen(c) ? c.id : (ml[0] ? ml[0].id : '');
}
function openGloss(entry, from){
  var it = from ? findItem(from) : null;
  var s = entry ? {type: 'gloss', id: entry.id, name: entry.name, product: entry.product, list: entry.list, terms: entry.terms, from: from || null}
                : {type: 'gloss', id: null, name: it ? cap(splitQty(it.name).base) : '', product: '', list: glossDefaultList(it), terms: '', from: from || null};
  openSheet(s, null, entry || it ? '#gProduct' : '#gName');
}
function saveGloss(){
  var s = state.sheet;
  if(!s || s.type !== 'gloss') return;
  var name = cap(($('#gName').value || '').trim().replace(/\s+/g, ' '));
  var product = ($('#gProduct').value || '').trim().replace(/\s+/g, ' ');
  var list = $('#gList').value, terms = ($('#gTerms').value || '').trim();
  var err = $('#glErr');
  var fail = function(msg){ if(err){ err.textContent = msg; err.hidden = false; } else flashText(msg); };
  if(!name){ fail('Bitte einen Begriff eingeben, zum Beispiel Hafermilch.'); return; }
  if(!listById(list)){ fail('Bitte einen Markt wählen.'); return; }
  var key = norm(splitQty(name).base), id = s.id;
  if(!id){ var same = state.products.filter(function(x){ return norm(x.name) === key && x.id.indexOf('tmp-') !== 0; })[0]; if(same) id = same.id; }
  var from = s.from;
  var btn = overlay.querySelector('#glossForm button[type="submit"]');
  if(btn){ btn.disabled = true; btn.textContent = 'Speichert …'; }
  store.saveProduct({id: id, list: list, name: name, product: product, terms: terms}).then(function(res){
    if(!res.ok){ if(btn){ btn.disabled = false; btn.textContent = 'Speichern'; } fail(errText(res.error)); return; }
    var msg = 'Glossar: ' + name + (product ? ' = ' + product : '') + ', kaufen bei ' + listName(list) + '.';
    closeSheet();
    var it = from && findItem(from);
    if(it && isGen(listById(it.list))){ if(state.dbV6 && tgts(it).join() !== list) store.updateItem(it.id, {targets: [list]}); }
    else if(it && it.list !== list){ moveItem(it.id, list); }
    flashText(msg);
  });
}
function rcpBody(r){
  var l = listById(r.list), ppl = people(l);
  var sum = r.lines.reduce(function(a, x){ return a + x.c; }, 0), diff = r.total - sum;
  var stOpts = function(c){ return l.stations.map(function(s){ return '<option value="' + esc(s.id) + '"' + (s.id === c ? ' selected' : '') + '>' + esc(s.name) + '</option>'; }).join(''); };
  var h = '<form id="rcForm" autocomplete="off">' +
    '<label class="field-l">Betrag gesamt<input class="field amount" id="rcTotal" inputmode="decimal" value="' + (r.total ? money2(r.total) : '') + '" placeholder="0,00"></label>' +
    '<label class="field-l" style="margin-top:8px">Laden oder Wofür<input class="field" id="rcDesc" maxlength="120" value="' + esc(r.desc) + '" placeholder="' + (r.mode === 'photo' ? 'Kassenzettel' : 'z. B. Wocheneinkauf') + '"></label>' +
    '<div class="two"><label class="field-l">Datum<input class="field" id="rcDate" type="date" value="' + esc(r.date) + '"></label>' +
    '<label class="field-l">Markt<select class="field" id="rcList">' + orderedLists().filter(function(x){ return !isGen(x) || x.id === r.list; }).map(function(x){
      return '<option value="' + esc(x.id) + '"' + (x.id === r.list ? ' selected' : '') + '>' + esc(x.name) + '</option>';
    }).join('') + '</select></label></div>' +
    '<label class="field-l" style="margin-top:8px">Bezahlt von<select class="field" id="rcPayer">' + ppl.map(function(p){
      return '<option value="' + esc(p) + '"' + (p === r.payer ? ' selected' : '') + '>' + esc(who(p)) + '</option>';
    }).join('') + '</select></label>' +
    '<fieldset style="border:0;padding:0;margin:10px 0 0"><legend class="field-l" style="margin-bottom:4px">Geteilt mit</legend><div class="checks">' + ppl.map(function(p){
      return '<label><input type="checkbox" name="rpart" value="' + esc(p) + '"' + (r.parts.indexOf(p) >= 0 ? ' checked' : '') + '>' + esc(who(p)) + '</label>';
    }).join('') + '</div></fieldset>' +
    (ppl.length < 2 ? '<p class="rc-note">In „' + esc(l.name) + '“ bist nur du eingetragen. Die Ausgabe zählt dann in den Kategorien, im Saldo aber nicht, weil niemand mitzahlt. Gib den Markt unter Account frei, dann kannst du hier mit anderen teilen.</p>' : '');
  if(r.mode === 'photo' && r.match.length){
    h += '<h3 class="rc-h">Auf der Liste abhaken</h3><div class="checks">' + r.match.map(function(id){
      var it = findItem(id);
      return it ? '<label><input type="checkbox" name="rmatch" value="' + esc(id) + '"' + (r.matchOn[id] ? ' checked' : '') + '>' + esc(it.name) + '</label>' : '';
    }).join('') + '</div>';
  }
  h += '<h3 class="rc-h">Positionen</h3>';
  r.lines.forEach(function(x, i){
    h += '<div class="rc-line"><div class="rc-top"><input class="field rc-n" value="' + esc(x.n) + '" maxlength="60" aria-label="Artikel ' + (i + 1) + '">' +
      '<input class="field rc-c" inputmode="decimal" value="' + money2(x.c) + '" aria-label="Betrag ' + (i + 1) + '">' +
      '<button class="del" type="button" data-act="rc-del" data-i="' + i + '" aria-label="Position entfernen">' + XICON + '</button></div>' +
      '<select class="field rc-cat" aria-label="Station ' + (i + 1) + '">' + stOpts(x.cat) + '</select></div>';
  });
  if(r.lines.length){
    h += '<p class="rc-sum' + (diff ? ' warn' : '') + '">Positionen: ' + money(sum) + ' · Gesamt: ' + money(r.total) +
      (diff ? '. Der Rest von ' + money(diff) + ' wird als „Nicht zugeordnet“ gezählt.' : '.') + '</p>';
  }
  h += '<button class="ghost" type="button" data-act="rc-add" style="margin-top:6px">+ Position</button>' +
    '<p class="rc-err" id="rcErr" role="alert" hidden></p>' +
    '<button class="sheet-btn primary" type="submit" style="margin-top:12px">Speichern</button></form>';
  return h;
}
function readRcp(){
  var r = state.rcp;
  if(!r || !document.getElementById('rcForm')) return;
  var g = function(id){ var e = document.getElementById(id); return e ? e.value : null; };
  var tv = g('rcTotal'); if(tv !== null) r.total = parseAmount(tv);
  var dv = g('rcDesc'); if(dv !== null) r.desc = dv;
  var dt = g('rcDate'); if(dt) r.date = dt;
  var py = g('rcPayer'); if(py) r.payer = py;
  r.parts = Array.prototype.map.call(overlay.querySelectorAll('input[name="rpart"]:checked'), function(x){ return x.value; });
  if(r.mode === 'photo'){
    var on = {};
    Array.prototype.forEach.call(overlay.querySelectorAll('input[name="rmatch"]'), function(x){ on[x.value] = x.checked; });
    r.matchOn = on;
  }
  r.lines = Array.prototype.map.call(overlay.querySelectorAll('.rc-line'), function(row){
    var cv = row.querySelector('.rc-c').value.trim(), neg = cv.charAt(0) === '-' || cv.charAt(0) === '−';
    var c = parseAmount(neg ? cv.slice(1) : cv);
    return {n: row.querySelector('.rc-n').value.trim(), c: neg ? -c : c, cat: row.querySelector('.rc-cat').value};
  });
}
function rcpMatch(r){
  var l = listById(r.list);
  var open = l ? viewItems(l).filter(function(i){ return !i.done; }) : [];
  r.match = r.mode === 'photo' ? matchReceipt(r.lines.map(function(x){ return x.n; }), open, norm) : [];
  r.matchOn = {};
  r.match.forEach(function(id){ r.matchOn[id] = true; });
}
function classifyLine(l, n){
  var cat = clsf(l, n);
  if(cat === fallbackId(l.stations)){
    var alt = clsf(l, n.replace(/ae/gi, 'ä').replace(/oe/gi, 'ö').replace(/ue/gi, 'ü'));
    if(alt !== cat) cat = alt;
  }
  return cat;
}
function setRcpList(id){
  var r = state.rcp, l = listById(id);
  if(!r || !l) return;
  r.list = id;
  var ppl = people(l);
  if(ppl.indexOf(r.payer) < 0) r.payer = ppl.indexOf(state.me.email) >= 0 ? state.me.email : ppl[0];
  r.parts = r.parts.filter(function(p){ return ppl.indexOf(p) >= 0; });
  if(!r.parts.length) r.parts = ppl.slice();
  r.lines.forEach(function(x){ if(stationIds(l).indexOf(x.cat) < 0) x.cat = classifyLine(l, x.n); });
  rcpMatch(r);
}
function newRcp(mode, listId){
  var l = listById(listId) || cur() || orderedLists()[0];
  if(l && isGen(l)) l = marketLists()[0] || l;
  if(!l) return null;
  return {mode: mode, id: null, list: l.id, total: 0, desc: '', date: todayISO(), payer: state.me.email, parts: people(l).slice(), lines: [], match: [], matchOn: {}};
}
function openReview(text){
  var r = newRcp('photo', billTarget());
  if(!r) return;
  var l = listById(r.list), p = parseReceipt(text);
  r.lines = p.items.map(function(it){ return {n: cap(it.n.toLowerCase()), c: it.c, cat: classifyLine(l, it.n)}; });
  r.total = p.total || r.lines.reduce(function(a, x){ return a + x.c; }, 0);
  if(p.date) r.date = p.date;
  rcpMatch(r);
  state.rcp = r;
  state.sheet = {type: 'rcp'};
  sheetHtml = '';
  render();
}
function openExpense(id){
  var e = state.expenses.filter(function(x){ return x.id === id; })[0];
  if(!e || e.kind === 'settle' || !listById(e.list)) return;
  state.rcp = {mode: 'edit', id: e.id, list: e.list, total: e.cents, desc: e.desc, date: e.spent, payer: e.payer, parts: e.parts.slice(),
    lines: e.lines.map(function(x){ return {n: x.n, c: x.c, cat: x.cat}; }), match: [], matchOn: {}};
  openSheet({type: 'rcp'}, '[data-act="exp-edit"][data-id="' + sel(id) + '"]', '#rcTotal');
}
async function handleFile(file){
  if(!state.authed || !file || !state.lists.length) return;
  var tok = {};
  state.ocrTok = tok;
  state.sheet = {type: 'ocr', p: 0};
  sheetHtml = '';
  render();
  try{
    var blob = await shrink(file);
    var text = await ocr(blob, function(p){ var el = document.getElementById('ocrP'); if(el) el.textContent = p + ' %'; });
    if(state.ocrTok !== tok || !state.sheet || state.sheet.type !== 'ocr') return;
    openReview(text);
  }catch(e){
    if(state.ocrTok !== tok) return;
    state.sheet = null; overlay.hidden = true; sheetHtml = '';
    render();
    flashText('Das Foto ließ sich nicht lesen. Trage die Ausgabe von Hand ein.');
  }
}
function validDate(s){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(s || ''))) return false;
  var d = new Date(s + 'T12:00:00');
  return !isNaN(d) && d.toISOString().slice(0, 10) === s;
}
function rcpFail(text){
  var btn = overlay.querySelector('#rcForm button[type="submit"]'), e2 = $('#rcErr');
  if(btn){ btn.disabled = false; btn.textContent = 'Speichern'; }
  if(e2){ e2.textContent = text; e2.hidden = false; if(e2.scrollIntoView) e2.scrollIntoView({block: 'nearest'}); }
  else flashText(text);
}
function saveRcp(){
  try{ saveRcpInner(); }
  catch(e){ logEvent('Skriptfehler', 'Speichern: ' + (e && e.message)); rcpFail('Speichern ist abgebrochen: ' + (e && e.message) + '. Bitte schick Julian den Text aus Account → Fehlerprotokoll.'); }
}
function saveRcpInner(){
  var r = state.rcp;
  if(!r){ logEvent('Hinweis', 'Speichern ohne offenes Formular'); return; }
  if(!listById(r.list)){ rcpFail('Der gewählte Markt ist nicht mehr da. Bitte einen anderen Markt wählen.'); return; }
  readRcp();
  if(!validDate(r.date)){ logEvent('Hinweis', 'Ungültiges Datum ' + r.date + ', heute verwendet'); r.date = todayISO(); }
  if(!r.total){ rcpFail('Bitte den Gesamtbetrag eingeben.'); return; }
  if(!r.parts.length){ rcpFail('Mindestens eine Person bei „Geteilt mit“ anhaken.'); return; }
  if(!r.total){ flashText('Bitte den Gesamtbetrag eingeben.'); return; }
  if(!r.parts.length){ flashText('Mindestens eine Person anhaken.'); return; }
  var lines = r.lines.filter(function(x){ return x.n && x.c; }).map(function(x){ return {n: x.n, c: x.c, cat: x.cat}; });
  var row = {list_id: r.list, amount_cents: r.total, description: r.desc.trim() || (r.mode === 'photo' ? 'Kassenzettel' : 'Einkauf'),
             payer_email: r.payer, participants: r.parts.slice(), spent_on: r.date || todayISO(), lines: lines};
  var others = r.parts.filter(function(p){ return p !== r.payer; });
  var msg = money(r.total) + ' gespeichert' + (others.length ? ', geteilt mit ' + others.map(function(p){ return p === state.me.email ? 'dir' : who(p); }).join(', ') + '.' : '. Nicht geteilt, deshalb ändert sich der Saldo nicht.');
  var btn = overlay.querySelector('#rcForm button[type="submit"]'), errEl = $('#rcErr');
  if(btn){ btn.disabled = true; btn.textContent = 'Speichert …'; }
  if(errEl) errEl.hidden = true;
  var job = r.mode === 'edit' ? store.updateExpense(r.id, row) : store.addExpense(row);
  job.then(function(res){
    if(!res || !res.ok){
      if(state.rcp !== r){ flashText(errText(res && res.error)); return; }
      rcpFail(errText(res && res.error));
      return;
    }
    if(state.rcp !== r){ flashText(msg); return; }
    if(r.mode === 'photo'){
      var ids = r.match.filter(function(id){ return r.matchOn[id]; });
      ids.forEach(function(id){ var it = findItem(id); if(it && !it.done) store.updateItem(id, {done: true}); });
      if(ids.length) msg += ' ' + ids.length + ' Artikel abgehakt.';
    }
    flashText(msg);
    closeSheet();
  });
}
function doSettle(from, to, cents){
  var lid = null;
  if(state.billMarket !== 'all') lid = state.billMarket;
  else {
    var both = orderedLists().filter(function(l){ var p = people(l); return p.indexOf(from) >= 0 && p.indexOf(to) >= 0; })[0];
    lid = both ? both.id : state.listId;
  }
  if(!lid) return;
  store.addExpense({list_id: lid, amount_cents: cents, description: 'Ausgleich', payer_email: from, participants: [to], kind: 'settle', spent_on: todayISO(), lines: []})
    .then(function(res){ flashText(res.ok ? 'Ausgleich über ' + money(cents) + ' eingetragen.' : errText(res.error)); });
}
function updateImport(){
  var ta = $('#impText'), box = $('#impPrev'), btn = $('#impAdd'), l = cur();
  if(!ta || !box || !l) return;
  var lines = ta.value.split(/[\n,;]+/).map(function(s){ return s.trim().replace(/\s+/g, ' '); }).filter(Boolean);
  var seenN = {}, groups = {}, dup = 0, n = 0;
  var have = {};
  viewItems(l).forEach(function(i){ have[baseKey(i.name)] = 1; });
  lines.forEach(function(raw){
    var name = cap(raw), key = baseKey(name);
    if(seenN[key] || have[key]){ dup++; return; }
    seenN[key] = 1; n++;
    var c = isGen(l) ? ((autoTarget(name) || {}).list || '') : clsf(l, name);
    (groups[c] = groups[c] || []).push(name);
  });
  var html = '';
  if(isGen(l)){
    [''].concat(marketLists().map(function(x){ return x.id; })).forEach(function(k){
      if(groups[k]) html += '<div class="grp"><div class="grp-h"><b>' + (k ? 'Nur ' + esc(listName(k)) : 'Passende Märkte') + '</b><span>' + groups[k].length + '</span></div><p>' + groups[k].map(esc).join(', ') + '</p></div>';
    });
    groups = {};
  }
  stationIds(l).forEach(function(id){
    if(!groups[id]) return;
    html += '<div class="grp"><div class="grp-h">' + badgeHTML(stationNo(l, id)) + '<b>' + esc(stationName(l, id)) + '</b><span>' + groups[id].length + '</span></div><p>' + groups[id].map(esc).join(', ') + '</p></div>';
  });
  if(!n) html = '<p class="tip">Noch nichts erkannt. Füge oben Artikel ein.</p>';
  if(dup) html += '<p class="tip">' + dup + ' davon stehen schon auf der Liste oder kommen doppelt vor. Die werden übersprungen.</p>';
  box.innerHTML = html;
  if(btn){ btn.disabled = !n || !state.authed; btn.textContent = n ? n + ' Artikel hinzufügen' : 'Hinzufügen'; }
}
function renderSheet(){
  var c = sheetContent();
  if(!c){ state.sheet = null; if(!closing) overlay.hidden = true; return; }
  $('#sheetTitle').textContent = c.title;
  $('#sheetSub').textContent = c.sub;
  $('#sheetSub').hidden = !c.sub;
  if(c.body !== sheetHtml){ sheetBody.innerHTML = c.body; sheetHtml = c.body; }
  overlay.hidden = false;
  if(state.sheet && state.sheet.type === 'import') updateImport();
}
function rebuildSheet(){ sheetHtml = ''; renderSheet(); }
function openSheet(sheet, opener, focusSel){
  state.sheet = sheet;
  openerSel = opener || null;
  sheetHtml = '';
  render();
  var first = (focusSel && overlay.querySelector(focusSel)) || overlay.querySelector('.cat-btn[aria-current="true"]') || overlay.querySelector('.cat-btn, .tpl-btn, textarea, input, select');
  if(first) first.focus({preventScroll: true});
}
function closeSheet(){
  var o = openerSel;
  state.rcp = null;
  state.sheet = null;
  openerSel = null;
  focusFn = function(){ return o ? document.querySelector(o) : null; };
  if(overlay.hidden || RM){ closing = false; overlay.hidden = true; sheetHtml = ''; render(); return; }
  closing = true;
  overlay.classList.add('out');
  setTimeout(function(){
    closing = false;
    overlay.classList.remove('out');
    overlay.hidden = true;
    sheetHtml = '';
    render();
  }, 160);
}
function saveItemName(it){
  var inp = $('#itemName');
  if(!inp || !it) return true;
  var nv = cap(inp.value.trim().replace(/\s+/g, ' '));
  if(!nv || nv === it.name) return true;
  var l = listById(it.list), key = baseKey(nv);
  var other = listItems(l).find(function(i){ return i.id !== it.id && baseKey(i.name) === key; });
  if(other){ flashText(splitQty(nv).base + ' steht schon auf der Liste.'); return false; }
  store.updateItem(it.id, {name: nv});
  return true;
}

/* ---------- Ziehen der Stationen ---------- */
function startDrag(e, grip){
  var row = grip.closest('.ord');
  if(!row) return;
  var list = row.parentNode;
  var rows = Array.prototype.slice.call(list.children);
  var i = rows.indexOf(row);
  var rects = rows.map(function(r){ return {top: r.offsetTop, h: r.offsetHeight}; });
  var gap = rects.length > 1 ? rects[1].top - rects[0].top - rects[0].h : 0;
  drag = {pid: e.pointerId, row: row, rows: rows, rects: rects, gap: gap, i: i, j: i, cat: row.dataset.cat,
          startY: e.clientY, startScroll: main.scrollTop, y: e.clientY, raf: 0, dirty: false, ended: false};
  try{ grip.setPointerCapture(e.pointerId); }catch(err){}
  row.classList.add('lift');
  rows.forEach(function(r, k){ if(k !== i) r.classList.add('shift'); });
  main.classList.add('dragging');
  try{ if(navigator.vibrate) navigator.vibrate(8); }catch(err){}
  window.addEventListener('pointermove', onDragMove);
  window.addEventListener('pointerup', onDragEnd);
  window.addEventListener('pointercancel', onDragEnd);
  tick();
}
function applyDrag(){
  var d = drag;
  if(!d || d.ended) return;
  var rects = d.rects, r = rects[d.i], last = rects[rects.length - 1];
  var dy = (d.y - d.startY) + (main.scrollTop - d.startScroll);
  dy = Math.max(-r.top, Math.min(last.top + last.h - (r.top + r.h), dy));
  d.row.style.transform = 'translateY(' + dy + 'px) scale(1.02)';
  var j = dragTarget(rects, d.i, dy);
  if(j !== d.j){
    d.j = j;
    d.rows.forEach(function(row, k){
      if(k === d.i) return;
      var s = dragShift(rects, d.i, j, k, d.gap);
      row.style.transform = s ? 'translateY(' + s + 'px)' : '';
    });
    var arr = d.rows.slice();
    var moved = arr.splice(d.i, 1)[0];
    arr.splice(j, 0, moved);
    arr.forEach(function(row, idx){ row.querySelector('.badge').textContent = idx + 1; });
  }
}
function tick(){
  var d = drag;
  if(!d || d.ended) return;
  var mr = main.getBoundingClientRect(), edge = 64, v = 0;
  if(d.y < mr.top + edge) v = -Math.ceil((mr.top + edge - d.y) / 6);
  else if(d.y > mr.bottom - edge) v = Math.ceil((d.y - (mr.bottom - edge)) / 6);
  v = Math.max(-14, Math.min(14, v));
  if(v) main.scrollTop += v;
  applyDrag();
  d.raf = requestAnimationFrame(tick);
}
function onDragMove(e){
  if(!drag || e.pointerId !== drag.pid) return;
  drag.y = e.clientY;
  applyDrag();
}
function onDragEnd(e){
  var d = drag;
  if(!d || d.ended || e.pointerId !== d.pid) return;
  d.ended = true;
  cancelAnimationFrame(d.raf);
  window.removeEventListener('pointermove', onDragMove);
  window.removeEventListener('pointerup', onDragEnd);
  window.removeEventListener('pointercancel', onDragEnd);
  var final = dragFinal(d.rects, d.i, d.j);
  d.row.classList.remove('lift');
  d.row.classList.add('drop');
  d.row.style.transform = 'translateY(' + final + 'px)';
  setTimeout(function(){
    var cat = d.cat, j = d.j, l = cur();
    drag = null;
    main.classList.remove('dragging');
    if(moveStation(cat, j) && l) announce(stationName(l, cat) + ', Position ' + (j + 1) + ' von ' + l.stations.length);
    focusFn = function(){ return main.querySelector('.grip[data-cat="' + sel(cat) + '"]'); };
    render();
  }, RM ? 0 : 200);
}

/* ---------- Wischen auf Artikeln ---------- */
var SWIPE_AT = 72;
function onSwipeStart(e){
  var li = e.target.closest && e.target.closest('.item');
  if(!li || drag || e.pointerType === 'mouse' || !li.dataset.id) return;
  swipe = {li: li, id: li.dataset.id, x: e.clientX, y: e.clientY, pid: e.pointerId, dx: 0, on: false};
}
function onSwipeMove(e){
  var s = swipe;
  if(!s || e.pointerId !== s.pid) return;
  var dx = e.clientX - s.x, dy = e.clientY - s.y;
  if(!s.on){
    if(Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.5){ s.on = true; s.li.classList.add('swiping'); }
    else if(Math.abs(dy) > 12){ swipe = null; return; }
    else return;
  }
  s.dx = dx;
  s.li.style.transform = 'translateX(' + dx + 'px)';
  var mode = dx > SWIPE_AT ? 'done' : dx < -SWIPE_AT ? 'del' : '';
  if(mode) s.li.dataset.swipe = mode; else delete s.li.dataset.swipe;
}
function onSwipeEnd(e){
  var s = swipe;
  if(!s || e.pointerId !== s.pid) return;
  swipe = null;
  if(!s.on) return;
  swipeBlock = true;
  setTimeout(function(){ swipeBlock = false; }, 350);
  s.li.classList.remove('swiping');
  s.li.style.transform = '';
  delete s.li.dataset.swipe;
  var it = findItem(s.id);
  if(!it || e.type === 'pointercancel') return;
  lsSet('manjo-tip-swipe', '1');
  if(s.dx > SWIPE_AT) store.updateItem(it.id, {done: !it.done});
  else if(s.dx < -SWIPE_AT) softDelete([it.id], splitQty(it.name).base + ' gelöscht');
}

/* ---------- Ereignisse ---------- */
document.addEventListener('pointerdown', function(e){
  var g = e.target.closest && e.target.closest('.grip');
  if(g){
    if(g.disabled || drag || !state.authed) return;
    if(e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    startDrag(e, g);
    return;
  }
  onSwipeStart(e);
});
document.addEventListener('pointermove', onSwipeMove, {passive: true});
document.addEventListener('pointerup', onSwipeEnd);
document.addEventListener('pointercancel', onSwipeEnd);

document.addEventListener('click', function(e){
  if(swipeBlock){ e.preventDefault(); return; }
  if(e.target === overlay){ closeSheet(); return; }
  var b = e.target.closest('[data-act]');
  if(!b || b.disabled) return;
  var act = b.dataset.act, id = b.dataset.id, l = cur();
  var it = id ? findItem(id) : null;
  if(act === 'nav'){
    if(state.sheet){ state.sheet = null; state.rcp = null; overlay.hidden = true; sheetHtml = ''; }
    setView(b.dataset.view);
  } else if(act === 'pick-list'){
    switchList(id);
    render();
  } else if(act === 'open-list'){
    switchList(id);
    setView('list');
  } else if(act === 'mk-up' || act === 'mk-down'){
    moveList(id, act === 'mk-up' ? -1 : 1);
  } else if(act === 'mk-vis'){
    toggleHidden(id);
    focusFn = function(){ return main.querySelector('[data-act="mk-vis"][data-id="' + sel(id) + '"]'); };
    render();
  } else if(act === 'new-list-open'){
    openSheet({type:'new', tpl:'supermarkt', name:TPLS.supermarkt.name}, null, '#newListName');
  } else if(act === 'tpl'){
    var s = state.sheet;
    if(s && s.type === 'new'){
      s.tpl = b.dataset.tpl;
      s.name = s.tpl === 'eigen' ? 'Neue Liste' : s.tpl === GEN ? 'Allgemein' : TPLS[s.tpl].name;
      rebuildSheet();
    }
  } else if(act === 'import'){
    openSheet({type:'import', text: input.value}, '[data-act="import"]', '#impText');
  } else if(act === 'imp-add' && l){
    var ta = $('#impText');
    if(!ta) return;
    var added = 0, batch = {};
    ta.value.split(/[\n,;]+/).map(function(x){ return x.trim(); }).filter(Boolean).forEach(function(p){
      var r = addItem(l, p, batch);
      if(r && r.status === 'added') added++;
    });
    closeSheet();
    flashText(added + ' Artikel sortiert eingefügt.');
    input.value = ''; autosize();
  } else if(act === 'shop'){
    setShop(!state.shop);
  } else if(act === 'toast'){
    var tf = toastFn;
    if(tf === undo){ undo(); }
    else { hideToast(); if(tf) tf(); }
  } else if(act === 'bill-tab'){
    state.billTab = b.dataset.tab;
    state.confirmSettle = null;
    main.scrollTop = 0;
    render();
  } else if(act === 'bill-market'){
    state.billMarket = id;
    state.confirmSettle = null;
    render();
  } else if(act === 'month'){
    state.month = shiftMonth(state.month, +b.dataset.d);
    render();
  } else if(act === 'photo' || act === 'photo-gallery'){
    var fi = document.getElementById(act === 'photo' ? 'rcFile' : 'rcGallery');
    if(fi) fi.click();
  } else if(act === 'exp-new'){
    var nr = newRcp('new', billTarget());
    if(!nr) return;
    state.rcp = nr;
    openSheet({type: 'rcp'}, '[data-act="exp-new"]', '#rcTotal');
  } else if(act === 'exp-edit'){
    openExpense(id);
  } else if(act === 'exp-del'){
    if(state.confirmExp !== id){
      state.confirmExp = id;
      clearTimeout(delT);
      delT = setTimeout(function(){ state.confirmExp = null; render(); }, 3000);
      render();
    } else {
      clearTimeout(delT);
      state.confirmExp = null;
      store.removeExpense(id);
    }
  } else if(act === 'settle'){
    var key = b.dataset.from + '|' + b.dataset.to + '|' + b.dataset.cents;
    if(state.confirmSettle !== key){
      state.confirmSettle = key;
      clearTimeout(delT);
      delT = setTimeout(function(){ state.confirmSettle = null; render(); }, 4000);
      render();
    } else {
      clearTimeout(delT);
      state.confirmSettle = null;
      doSettle(b.dataset.from, b.dataset.to, +b.dataset.cents);
    }
  } else if(act === 'toggle' && it){
    focusFn = function(){ return main.querySelector('[data-act="toggle"][data-id="' + sel(id) + '"]'); };
    if(pendingDone[id]){
      clearTimeout(pendingDone[id]);
      delete pendingDone[id];
      render();
    } else if(!it.done && !RM){
      pendingDone[id] = setTimeout(function(){
        delete pendingDone[id];
        store.updateItem(id, {done: true});
      }, 320);
      render();
    } else {
      store.updateItem(id, {done: !it.done});
    }
  } else if(act === 'edit' && it){
    openSheet({type:'item', id: id, ctx: state.listId}, '[data-act="edit"][data-id="' + sel(id) + '"]', '#itemName');
  } else if(act === 'assign'){
    var ai = state.sheet && findItem(state.sheet.id);
    if(!ai) return;
    if(!state.dbV6){ flashText('Für die Zuordnung fehlt ein Datenbank-Update: schema_v7.sql in Supabase ausführen.'); return; }
    var aiL = listById(ai.list), aiGen = isGen(aiL), next = tgts(ai).slice();
    if(!id) next = [];
    else if(!aiGen && id === ai.list) return;
    else { var ix = next.indexOf(id); if(ix >= 0) next.splice(ix, 1); else next.push(id); }
    store.updateItem(ai.id, {targets: next});
    flashText(splitQty(ai.name).base + (next.length ? ' erscheint ' + (aiGen ? 'nur ' : 'auch ') + 'bei ' + next.map(listName).join(', ') + '.' : aiGen ? ' erscheint in allen passenden Märkten.' : ' steht nur noch in ' + aiL.name + '.'));
  } else if(act === 'gen-create'){
    lsSet('manjo-gen-tip', '1');
    store.createList('Allgemein', GEN).then(function(nid){
      switchList(nid);
      setView('list');
      flashText('Allgemeine Liste angelegt. Was du hier einträgst, erscheint in den passenden Märkten.');
    }).catch(onWriteError);
  } else if(act === 'gen-tip-off'){
    lsSet('manjo-gen-tip', '1');
    render();
  } else if(act === 'close'){
    closeSheet();
  } else if(act === 'cat'){
    var ci = state.sheet && findItem(state.sheet.id), c = b.dataset.cat;
    if(!ci) return;
    var ownL = listById(ci.list), ctxL3 = listById(state.sheet.ctx);
    var cl = ownL && !isGen(ownL) ? ownL : (ctxL3 && !isGen(ctxL3) ? ctxL3 : null);
    if(!cl) return;
    if(!saveItemName(ci)) return;
    if(c !== catIn(cl, ci)){
      if(ci.list === cl.id) store.updateItem(ci.id, {cat: c});
      learn(cl, ci.name, c);
      flash(esc(splitQty(ci.name).base) + ' → ' + catHTML(cl, c));
    }
    closeSheet();
  } else if(act === 'delete'){
    var di = state.sheet && findItem(state.sheet.id);
    closeSheet();
    if(di) softDelete([di.id], splitQty(di.name).base + ' gelöscht');
  } else if(act === 'reset-order' && l && canManage(l)){
    store.patchList(l.id, {stations: TPLS[l.tpl].stations.map(function(x){ return {id:x.id, name:x.name}; })});
  } else if(act === 'del-station' && l && canManage(l)){
    var sid = b.dataset.cat;
    if(sid === 'sonst') return;
    store.patchList(l.id, {stations: l.stations.filter(function(x){ return x.id !== sid; })});
    announce('Station entfernt.');
  } else if(act === 'del-list' && l && canManage(l)){
    if(!state.confirmDel){
      state.confirmDel = true;
      clearTimeout(delT);
      delT = setTimeout(function(){ state.confirmDel = false; if(state.view === 'settings') render(); }, 3500);
      render();
    } else {
      clearTimeout(delT);
      state.confirmDel = false;
      store.deleteList(l.id);
      state.listId = null;
      ensureCurrent();
      if(state.listId) lsSet(LS_CUR, state.listId);
      state.view = 'list';
      flashText('Liste gelöscht.');
      render();
    }
  } else if(act === 'sample'){
    addFromText(b.dataset.text);
  } else if(act === 'clear-done' && l){
    var doneIds = viewItems(l).filter(function(i){ return i.done; }).map(function(i){ return i.id; });
    softDelete(doneIds, doneIds.length + (doneIds.length === 1 ? ' Artikel' : ' Artikel') + ' aus dem Wagen entfernt');
  } else if(act === 'rc-add'){
    var rl = state.rcp && listById(state.rcp.list);
    if(!rl) return;
    readRcp();
    state.rcp.lines.push({n: '', c: 0, cat: stationIds(rl)[0] || 'sonst'});
    rebuildSheet();
    var ns = overlay.querySelectorAll('.rc-n');
    if(ns.length) ns[ns.length - 1].focus();
  } else if(act === 'rc-del'){
    if(!state.rcp) return;
    readRcp();
    state.rcp.lines.splice(+b.dataset.i, 1);
    rebuildSheet();
  } else if(act === 'gloss-new'){
    openGloss(null, null);
  } else if(act === 'gloss-open'){
    var ge = state.products.filter(function(x){ return x.id === id; })[0];
    if(ge) openGloss(ge, null);
  } else if(act === 'gloss-item'){
    var gi = state.sheet && findItem(state.sheet.id);
    if(gi){ if(!saveItemName(gi)) return; openGloss(glossFor(gi.name), gi.id); }
  } else if(act === 'gloss-del'){
    var gd = state.products.filter(function(x){ return x.id === id; })[0];
    closeSheet();
    if(gd){ store.removeProduct(gd.id); flashText(gd.name + ' aus dem Glossar gelöscht.'); }
  } else if(act === 'log-copy'){
    var txt = 'manjo ' + APP_VERSION + ' · ' + navigator.userAgent + '\n' + lsJSON(LS_LOG, []).map(function(x){ return x.t + '  ' + x.k + ': ' + x.m; }).join('\n');
    var okc = function(){ flashText('Protokoll kopiert.'); }, failc = function(){ flashText('Kopieren ging nicht. Markiere den Text und kopiere ihn von Hand.'); };
    try{ navigator.clipboard.writeText(txt).then(okc, failc); }catch(err){ failc(); }
  } else if(act === 'log-clear'){
    lsDel(LS_LOG);
    render();
  } else if(act === 'signout'){
    if(state.queue.length && !state.confirmOut){ state.confirmOut = true; render(); return; }
    sb.auth.signOut();
  }
});

document.addEventListener('change', function(e){
  var t = e.target, l = cur();
  if(t.id === 'rcFile' || t.id === 'rcGallery'){ var f0 = t.files && t.files[0]; t.value = ''; if(f0){ logEvent('Foto', (t.id === 'rcFile' ? 'Kamera ' : 'Galerie ') + (f0.type || '?') + ' ' + Math.round(f0.size / 1024) + ' KB'); handleFile(f0); } return; }
  if(t.id === 'rcList'){ readRcp(); setRcpList(t.value); rebuildSheet(); return; }
  if(t.dataset && t.dataset.list){
    var ll = listById(t.dataset.list);
    if(!ll || ll.owner !== state.me.id) return;
    if(t.checked) store.addMember(ll.id, t.dataset.email); else store.removeMember(ll.id, t.dataset.email);
    return;
  }
  if(!l || !canManage(l)) return;
  if(t.id === 'listNameInput'){
    var v = t.value.trim().replace(/\s+/g, ' ');
    if(!v){ t.value = l.name; return; }
    if(v !== l.name) store.patchList(l.id, {name: v}, true);
  } else if(t.classList && t.classList.contains('station-in')){
    var sid = t.dataset.cat, nv = t.value.trim().replace(/\s+/g, ' ');
    var old = l.stations.filter(function(s){ return s.id === sid; })[0];
    if(!old) return;
    if(!nv){ t.value = old.name; return; }
    if(nv !== old.name) store.patchList(l.id, {stations: l.stations.map(function(s){ return s.id === sid ? {id: s.id, name: nv} : s; })}, true);
  }
});

input.addEventListener('input', function(){
  if(flashT){ clearTimeout(flashT); flashT = null; hint.classList.remove('flash'); }
  autosize();
  updateHint();
});
input.addEventListener('keydown', function(e){
  if(e.key === 'Enter' && !e.shiftKey && !e.isComposing){ e.preventDefault(); form.requestSubmit(); }
});
document.addEventListener('input', function(e){
  var t = e.target;
  if(t.id === 'newListName' && state.sheet && state.sheet.type === 'new'){ state.sheet.name = t.value; }
  else if(t.id === 'impText' && state.sheet && state.sheet.type === 'import'){ state.sheet.text = t.value; updateImport(); }
});
main.addEventListener('focusout', function(){
  if(!pendingRender) return;
  setTimeout(function(){
    var a = document.activeElement;
    if(pendingRender && !(a && main.contains(a) && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA'))){ pendingRender = false; render(); }
  }, 0);
});

document.addEventListener('keydown', function(e){
  if(!overlay.hidden){
    if(e.key === 'Escape'){ closeSheet(); return; }
    if(e.key === 'Tab'){
      var f = Array.prototype.slice.call(overlay.querySelectorAll('button:not(:disabled), input, textarea, select'));
      if(!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
      else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
    }
    return;
  }
  if(e.key === 'Enter' && e.target.matches && e.target.matches('.station-in, #listNameInput')){ e.preventDefault(); e.target.blur(); return; }
  var g = e.target.closest && e.target.closest('.grip');
  if(g && !g.disabled && !drag && (e.key === 'ArrowUp' || e.key === 'ArrowDown')){
    e.preventDefault();
    var l = cur();
    if(!l) return;
    var cat = g.dataset.cat, from = stationIds(l).indexOf(cat);
    if(moveStation(cat, from + (e.key === 'ArrowUp' ? -1 : 1))){
      var l2 = cur(), to = stationIds(l2).indexOf(cat);
      announce(stationName(l2, cat) + ', Position ' + (to + 1) + ' von ' + l2.stations.length);
      focusFn = function(){ return main.querySelector('.grip[data-cat="' + sel(cat) + '"]'); };
      render();
    }
  }
});

document.addEventListener('submit', function(e){
  var f = e.target;
  if(main.contains(f) && document.activeElement && main.contains(document.activeElement) && document.activeElement.blur){ document.activeElement.blur(); }
  if(f.id === 'addForm'){
    e.preventDefault();
    var v = input.value;
    if(!v.trim() || !state.authed) return;
    input.value = ''; autosize();
    addFromText(v);
    input.focus();
  } else if(f.id === 'newListForm'){
    e.preventDefault();
    var s = state.sheet;
    if(!s || s.type !== 'new' || !state.authed) return;
    var name = (s.name || '').trim().replace(/\s+/g, ' ') || (s.tpl === 'eigen' ? 'Neue Liste' : s.tpl === GEN ? 'Allgemein' : TPLS[s.tpl].name);
    store.createList(name, s.tpl).then(function(id){
      switchList(id);
      state.view = 'list';
      openerSel = null;
      render();
      closeSheet();
      flashText('Liste „' + name + '“ angelegt.');
    }).catch(onWriteError);
  } else if(f.id === 'itemForm'){
    e.preventDefault();
    var ii = state.sheet && findItem(state.sheet.id);
    if(ii && saveItemName(ii)) closeSheet();
  } else if(f.id === 'rcForm'){
    e.preventDefault();
    saveRcp();
  } else if(f.id === 'stationForm'){
    e.preventDefault();
    var lst = cur(), inp = $('#newStation');
    if(!lst || !inp || !canManage(lst)) return;
    var nm = inp.value.trim().replace(/\s+/g, ' ');
    if(!nm) return;
    var st = lst.stations.slice(), at = stationIds(lst).indexOf('sonst');
    var ns = {id: 's' + Date.now().toString(36) + Math.random().toString(36).slice(2,5), name: nm};
    if(at >= 0 && at === st.length - 1) st.splice(at, 0, ns); else st.push(ns);
    focusFn = function(){ return $('#newStation'); };
    store.patchList(lst.id, {stations: st});
  } else if(f.id === 'accessForm'){
    e.preventDefault();
    var ae = $('#accessEmail');
    var aem = ae ? ae.value.trim().toLowerCase() : '';
    if(!isEmail(aem)){ flashText('Das ist keine gültige E-Mail-Adresse.'); return; }
    if(state.accessExtra.indexOf(aem) < 0 && aem !== state.me.email) state.accessExtra.push(aem);
    flashText('Hake jetzt die Märkte an, die ' + aem + ' sehen darf.');
    render();
  } else if(f.id === 'glossForm'){
    e.preventDefault();
    saveGloss();
  } else if(f.id === 'nameForm'){
    e.preventDefault();
    var mn = $('#myName');
    store.saveName(mn ? mn.value.trim().replace(/\s+/g, ' ').slice(0, 40) : '');
  } else if(f.id === 'authForm'){
    e.preventDefault();
    doAuth();
  }
});

/* ---------- Anmeldung und Start ---------- */
var CFG = window.EINKAUF_CONFIG || {};
function showAuth(on){
  $('#auth').hidden = !on;
  appEl.hidden = on;
}
function authMsg(t, err){
  var m = $('#authMsg');
  m.textContent = t || '';
  m.className = 'msg' + (err ? ' err' : '');
}
function setSignup(on){
  signup = on;
  $('#authSubmit').textContent = on ? 'Konto erstellen' : 'Anmelden';
  $('#authToggle').textContent = on ? 'Schon ein Konto? Anmelden' : 'Neu hier? Konto erstellen';
  $('#authPw').autocomplete = on ? 'new-password' : 'current-password';
  authMsg('');
}
/* Adresse der App ohne Anker und Parameter: dorthin führt der Bestätigungslink */
function appUrl(){ return location.origin + location.pathname; }
/* Fehler aus dem Bestätigungslink lesbar machen, z. B. abgelaufener Link */
function readLinkError(){
  var h = new URLSearchParams(String(location.hash || '').replace(/^#/, '') + '&' + String(location.search || '').replace(/^\?/, ''));
  var code = h.get('error_code') || h.get('error');
  if(!code) return '';
  try{ history.replaceState(null, '', appUrl()); }catch(e){}
  if(/expired/i.test(code + ' ' + (h.get('error_description') || ''))) return 'Der Bestätigungslink ist abgelaufen oder wurde schon benutzt. Versuch dich anzumelden. Klappt das nicht, registriere dich noch einmal.';
  return 'Der Bestätigungslink hat nicht funktioniert. Versuch dich anzumelden.';
}
async function doAuth(){
  if(!sb) return;
  var email = $('#authEmail').value.trim().toLowerCase(), pw = $('#authPw').value;
  if(!email || !pw){ authMsg('Bitte E-Mail und Passwort eingeben.', true); return; }
  if(signup && pw.length < 8){ authMsg('Das Passwort braucht mindestens 8 Zeichen.', true); return; }
  authMsg('Einen Moment …');
  $('#authSubmit').disabled = true;
  try{
    if(signup){
      var r = await sb.auth.signUp({email: email, password: pw, options: {emailRedirectTo: appUrl()}});
      if(r.error) authMsg(/registered/i.test(r.error.message) ? 'Zu dieser Adresse gibt es schon ein Konto. Melde dich an.' : 'Das hat nicht geklappt: ' + r.error.message, true);
      else if(!r.data.session) authMsg('Fast fertig: Wir haben dir eine Bestätigungsmail geschickt.');
    } else {
      var r2 = await sb.auth.signInWithPassword({email: email, password: pw});
      if(r2.error) authMsg(/confirm/i.test(r2.error.message) ? 'Bitte zuerst die Adresse per Mail bestätigen.' : 'E-Mail oder Passwort stimmt nicht.', true);
    }
  }catch(e){ authMsg('Keine Verbindung. Versuch es gleich nochmal.', true); }
  $('#authSubmit').disabled = false;
}
function onSignedIn(session){
  if(state.authed) return;
  state.authed = true;
  state.me = {id: session.user.id, email: String(session.user.email || '').toLowerCase()};
  state.mode = 'loading';
  state.queue = lsJSON(qKey(), []);
  loadCache();
  showAuth(false);
  render();
  loadAll();
  subscribe();
}
function onSignedOut(){
  if(state.me.id) lsDel(cKey());
  commitUndo();
  state.authed = false;
  state.me = {id: null, email: ''};
  state.lists = []; state.items = []; state.expenses = []; state.profiles = {}; state.products = []; state.queue = [];
  state.listId = null; state.accessExtra = []; state.gone = {};
  state.loaded = false; state.view = 'list'; state.sheet = null; state.rcp = null; state.mode = 'loading'; state.confirmOut = false;
  if(state.shop) setShop(false);
  if(chan){ try{ sb.removeChannel(chan); }catch(e){} chan = null; }
  $('#authPw').value = '';
  showAuth(true);
  overlay.hidden = true;
}
$('#authToggle').addEventListener('click', function(){ setSignup(!signup); });
document.addEventListener('visibilitychange', function(){
  if(document.visibilityState === 'visible' && state.authed){
    if(state.mode === 'lost') subscribe();
    scheduleReload(0);
    flush();
    if(state.shop && !wakeLock && navigator.wakeLock){
      navigator.wakeLock.request('screen').then(function(w){ wakeLock = w; w.addEventListener('release', function(){ wakeLock = null; }); }).catch(function(){});
    }
  }
});
window.addEventListener('online', function(){ if(state.authed){ subscribe(); scheduleReload(0); flush(); } });
window.addEventListener('offline', function(){ if(state.authed){ state.mode = 'lost'; renderHeader(); } });
setInterval(function(){ if(state.authed && state.queue.length) flush(); }, 20000);

/* Neue Version: der Service Worker übernimmt, dann lädt die App neu, sobald nichts Ungespeichertes offen ist */
var updateReady = false;
function reloadIfIdle(){
  if(!updateReady) return;
  if(!overlay.hidden || input.value.trim() || drag){ return; }
  updateReady = false;
  logEvent('Update', 'neue Version geladen');
  location.reload();
}
function setupUpdates(){
  if(!('serviceWorker' in navigator)) return;
  try{
    var hadCtrl = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', function(){ if(hadCtrl){ updateReady = true; reloadIfIdle(); } });
    navigator.serviceWorker.register('sw.js').then(function(reg){
      document.addEventListener('visibilitychange', function(){ if(document.visibilityState === 'visible'){ try{ reg.update(); }catch(e){} reloadIfIdle(); } });
    }).catch(function(){});
  }catch(e){}
}
(async function boot(){
  setupUpdates();
  if(!CFG.url || !CFG.key || !window.supabase){
    showAuth(true);
    $('#authForm').hidden = true;
    $('#authToggle').hidden = true;
    $('#authLead').textContent = window.supabase ? 'Trage in config.js die URL und den Schlüssel deines Supabase-Projekts ein.' : 'Die Supabase-Bibliothek konnte nicht geladen werden. Prüfe die Internetverbindung.';
    return;
  }
  var linkErr = readLinkError();
  sb = window.supabase.createClient(CFG.url, CFG.key, {auth: {persistSession: true, autoRefreshToken: true, detectSessionInUrl: true}});
  sb.auth.onAuthStateChange(function(ev, session){
    setTimeout(function(){
      if(ev === 'SIGNED_OUT') onSignedOut();
      else if(session && !state.authed) onSignedIn(session);
    }, 0);
  });
  var s = await sb.auth.getSession();
  if(s.data && s.data.session) onSignedIn(s.data.session);
  else {
    showAuth(true);
    if(linkErr) authMsg(linkErr, true);
  }
})();

render();
})();
