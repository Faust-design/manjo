/* manjo: Vorlagen und Zuordnung von Artikeln zu Stationen. Reine Funktionen, global verfügbar. */
/* Vorlagen: jede Liste startet mit einer Vorlage. Die Stationen einer Liste gehören dann der Liste
   und lassen sich frei umbenennen, ergänzen, löschen und sortieren. */
var TPLS = {
  supermarkt:{
    name:'Supermarkt', desc:'Obst, Milch, Tiefkühl, Getränke und mehr',
    stations:[
      {id:'obst', name:'Obst & Gemüse', ex:'Äpfel, Tomaten, Salat'},
      {id:'brot', name:'Brot & Backwaren', ex:'Brötchen, Brezn, Toast'},
      {id:'fleisch', name:'Fleisch, Fisch & Wurst', ex:'Hack, Schinken, Lachs'},
      {id:'milch', name:'Milch, Käse & Eier', ex:'Milch, Joghurt, Käse, Eier'},
      {id:'nudeln', name:'Nudeln, Reis & Konserven', ex:'Nudeln, Dosen, Öl, Gewürze'},
      {id:'fruehstueck', name:'Frühstück & Kaffee', ex:'Kaffee, Müsli, Aufstrich'},
      {id:'suess', name:'Süßes & Snacks', ex:'Schokolade, Chips, Nüsse'},
      {id:'getraenke', name:'Getränke', ex:'Wasser, Saft, Bier'},
      {id:'tk', name:'Tiefkühl', ex:'Pizza, Pommes, Eis'},
      {id:'haushalt', name:'Haushalt & Drogerie', ex:'Spülmittel, Klopapier, Zahnpasta'},
      {id:'baby', name:'Baby & Kind', ex:'Windeln, Brei, Feuchttücher'},
      {id:'sonst', name:'Sonstiges', ex:'Alles, was nirgends passt'}
    ],
    /* "=" vor einem Wort heißt: nur als ganzes Wort. Sonst reicht ein Treffer im Wort.
       Das längste passende Schlüsselwort gewinnt, so schlägt "Kokosmilch" das einfache "Milch". */
    kw:{
  obst:'obst,gemüse,apfel,birne,banane,orange,zitrone,limette,mandarine,clementine,grapefruit,traube,erdbeere,himbeere,heidelbeere,blaubeere,brombeere,beere,kirsche,pflaume,zwetschge,pfirsich,nektarine,marille,melone,ananas,mango,kiwi,avocado,granatapfel,feige,tomate,paradeiser,gurke,paprika,zucchini,aubergine,karotte,möhre,mohrrübe,karfiol,blumenkohl,brokkoli,kohlrabi,kohl,spinat,salat,rucola,lauch,porree,zwiebel,knoblauch,kartoffel,erdapfel,süßkartoffel,kürbis,pilz,champignon,sellerie,radieschen,rettich,rote bete,fenchel,spargel,bohnen,fisole,erbsen,ingwer,petersilie,schnittlauch,basilikum,koriander,minze,dill,kräuter,rosmarin,thymian,chili,schalotte,mangold,pak choi,chicorée,endivie,radicchio,rosenkohl,wirsing,kren,meerrettich,pastinake,suppengrün,sprossen',
  brot:'brot,brötchen,semmel,weckerl,brezel,breze,brezn,laugen,toast,croissant,kuchen,baguette,ciabatta,gebäck,knäckebrot,fladenbrot,=pita,focaccia,bagel,brioche,zopf,striezel,krapfen,berliner,donut,muffin,torte,teilchen,plunder,kornspitz,tortilla,wraps,=wrap,sandwich',
  fleisch:'fleisch,hähnchen,hühnchen,huhn,hendl,pute,putenbrust,schwein,rinder,=rind,hack,faschiertes,steak,schnitzel,wurst,würstchen,wiener,leberkäs,fleischkäse,schinken,salami,speck,bacon,aufschnitt,lyoner,mortadella,lachs,fisch,forelle,garnelen,shrimps,scampi,kabeljau,seelachs,matjes,gulasch,=braten,kotelett,filet,cevapcici,=ente,=gans,=lamm,=kalb,gyros,döner,rippchen,haxe,tafelspitz,suppenfleisch,knochen,grillgut,spareribs',
  milch:'milch,hafermilch,haferdrink,sojadrink,sojamilch,mandelmilch,mandeldrink,reisdrink,joghurt,jogurt,quark,topfen,sahne,=obers,schlagobers,schmand,creme fraiche,butter,margarine,käse,mozzarella,gouda,emmentaler,parmesan,feta,mascarpone,ricotta,camembert,skyr,kefir,=ei,eier,tofu,halloumi,sauerrahm,kaffeesahne,hummus,tzatziki,pudding',
  nudeln:'nudel,spaghetti,penne,fusilli,tagliatelle,makkaroni,spätzle,gnocchi,tortellini,ravioli,lasagne,reis,basmati,risotto,couscous,bulgur,quinoa,linsen,kichererbsen,kidneybohnen,weiße bohnen,=dose,=dosen,dosenmais,=mais,dosentomaten,tomatenmark,passierte tomaten,passata,gehackte tomaten,stückige tomaten,tomatensauce,sauce,soße,ketchup,senf,mayonnaise,mayo,dressing,essig,apfelessig,balsamico,=öl,olivenöl,sonnenblumenöl,rapsöl,salz,pfeffer,gewürz,paprikapulver,zimt,curry,muskat,oregano,zucker,vanillezucker,puderzucker,mehl,backpulver,hefe,speisestärke,paniermehl,semmelbrösel,suppe,brühe,fond,thunfisch,sardinen,konserve,kokosmilch,pesto,ajvar,oliven,gewürzgurke,essiggurke,sauerkraut,apfelmus,kapern,nussmus,tahini,sojasauce,knödel,kartoffelpüree,puddingpulver,rosinen,kokosraspel,gelatine,tomatensuppe,kartoffelsuppe,gemüsesuppe,chilisauce,hühnersuppe,instant',
  fruehstueck:'kaffee,kaffeebohnen,espresso,kaffeekapsel,nespresso,filterkaffee,kaffeefilter,tee,teebeutel,kräutertee,kamillentee,pfefferminztee,fencheltee,kakao,haferflocken,müsli,cornflakes,cerealien,honig,marmelade,konfitüre,nutella,aufstrich,erdnussbutter,porridge,ahornsirup,granola,frühstück,filtertüten',
  suess:'schokolade,schoko,riegel,keks,butterkeks,gummibärchen,gummibären,fruchtgummi,bonbon,chips,kartoffelchips,tortillachips,tortilla chips,salzstange,nuss,nüsse,mandeln,cashew,pistazien,studentenfutter,popcorn,lakritz,waffel,cracker,knabber,praline,marzipan,haribo,lebkuchen,spekulatius,snack,süßigkeit,kinderschokolade,pringles,oreo',
  getraenke:'wasser,mineralwasser,sprudel,saft,orangensaft,apfelsaft,schorle,cola,=limo,limonade,fanta,sprite,bier,wein,rotwein,weißwein,rosé,=sekt,prosecco,aperol,energy,eistee,tonic,ginger ale,sirup,radler,weizenbier,hefeweizen,pils,schnaps,=gin,whisky,=rum,vodka,likör,getränk,smoothie,=kasten,almdudler,=spezi,kombucha,tafelwasser,soda,=helles',
  tk:'tiefkühl,pizza,pommes,=eis,speiseeis,eiscreme,fischstäbchen,rahmspinat,blattspinat,cremespinat,beerenmix,=tk,backfisch,kroketten,gemüsepfanne,flammkuchen,nuggets,gefroren,schlemmerfilet',
  haushalt:'klopapier,toilettenpapier,küchenrolle,küchenpapier,taschentücher,spülmittel,spülmaschine,tabs,waschmittel,weichspüler,reiniger,putzmittel,müllbeutel,müllsack,müllsäcke,gefrierbeutel,alufolie,backpapier,frischhaltefolie,schwamm,schwämme,spültuch,putztuch,kerze,batterie,glühbirne,leuchtmittel,zahnpasta,zahnbürste,zahnseide,mundspülung,shampoo,duschgel,seife,=deo,deodorant,rasier,wattepad,wattestäbchen,tampon,damenbinde,=binden,slipeinlage,creme,handcreme,sonnencreme,lotion,pflaster,haarspray,haargel,entkalker,=wc,grillkohle,holzkohle,kohle,grillanzünder,streichhölzer,feuerzeug,papier,serviette,teelicht,wasserfilter,frischhaltedose,brotdose,vorratsdose,hygiene,glasreiniger,lappen,=mopp,toilette',
  baby:'windel,feuchttuch,babybrei,babynahrung,folgemilch,milchpulver,baby,babyöl,babycreme,wundcreme,wundschutz,quetschie,schnuller,babytee,kindersnack,kinderzahnpasta,gläschen,=hipp,bebivita,schwimmwindel,kinderpflaster,babyshampoo,beikost'
    }
  },
  baumarkt:{
    name:'Baumarkt', desc:'Holz, Werkzeug, Schrauben, Farben, Garten',
    stations:[
      {id:'holz', name:'Holz & Baustoffe', ex:'Latten, Platten, Gips, Fliesen'},
      {id:'werkzeug', name:'Werkzeug & Maschinen', ex:'Hammer, Bohrer, Säge'},
      {id:'befest', name:'Schrauben & Befestigung', ex:'Schrauben, Dübel, Haken'},
      {id:'farben', name:'Farben & Maler', ex:'Wandfarbe, Pinsel, Kreppband'},
      {id:'elektro', name:'Elektro & Licht', ex:'Kabel, Lampen, Steckdosen'},
      {id:'sanitaer', name:'Sanitär & Heizung', ex:'Rohre, Dichtungen, Silikon'},
      {id:'garten', name:'Garten & Pflanzen', ex:'Erde, Dünger, Gartenschlauch'},
      {id:'sonst', name:'Sonstiges', ex:'Alles, was nirgends passt'}
    ],
    kw:{
  holz:'holz,latte,dachlatte,brett,balken,platte,osb,spanplatte,sperrholz,leim,holzleim,gips,rigips,trockenbau,zement,mörtel,beton,fliese,fliesenkleber,fugenmasse,fuge,dämmung,ziegel,sand,kies,putz,acryl,styropor,mdf,leiste,sockelleiste,laminat,parkett,vinyl,estrich,spachtelmasse',
  werkzeug:'hammer,zange,kneifzange,schraubendreher,schraubenzieher,akkuschrauber,bohrmaschine,bohrer,steinbohrer,holzbohrer,säge,sägeblatt,stichsäge,handsäge,schleifpapier,schleifer,exzenterschleifer,bit,bits,wasserwaage,zollstock,maßband,massband,feile,meißel,schraubzwinge,zwinge,cutter,cuttermesser,werkzeug,leiter,handschuhe,arbeitshandschuhe,schutzbrille,gehörschutz,hobel,stemmeisen,schraubenschlüssel,ratsche,nuss,werkzeugkasten,akku,winkelschleifer,flex,heißklebepistole,kartuschenpistole',
  befest:'schraube,schrauben,dübel,nagel,nägel,winkel,beschlag,haken,bolzen,mutter,muttern,unterlegscheibe,kabelbinder,klammer,tacker,krampen,gewindestange,öse,scharnier,schloss,riegel,griff,gewinde,spax,holzschraube,schlossschraube,rundkopf,klebeband,gewebeband,panzertape,montagekleber,kleber,sekundenkleber,seil,kette,spanngurt',
  farben:'farbe,wandfarbe,dispersion,lack,buntlack,klarlack,lasur,holzlasur,pinsel,farbrolle,=rolle,abdeckfolie,abdeckvlies,malerkrepp,kreppband,abklebeband,spachtel,grundierung,tapete,tapetenkleister,kleister,farbeimer,streichen,tiefengrund,holzschutz,rostschutz,sprühlack,spraydose,abbeizer,farbwanne,teleskopstange,pinselreiniger,verdünnung',
  elektro:'kabel,stecker,steckdose,schalter,lampe,leuchte,glühbirne,led,leuchtmittel,verlängerung,verlängerungskabel,mehrfachsteckdose,steckerleiste,sicherung,lüsterklemme,taschenlampe,zeitschaltuhr,bewegungsmelder,klingel,adapter,batterie,akku,netzteil,lichterkette,kabelkanal,isolierband,spannungsprüfer,fassung,dimmer,rauchmelder,funksteckdose',
  sanitaer:'rohr,rohre,dichtung,hahn,wasserhahn,armatur,siphon,schlauch,duschkopf,duschschlauch,brause,toilettensitz,wc sitz,heizkörper,thermostat,pumpe,fitting,fittings,absperrhahn,teflonband,hanf,silikon,sanitärsilikon,abfluss,rohrreiniger,spülkasten,kupplung,eckventil,heizung,entlüfter,pe rohr,geruchsverschluss,waschbecken,handbrause',
  garten:'erde,blumenerde,pflanzerde,dünger,samen,pflanze,blume,rasen,rasensamen,rasendünger,gießkanne,gartenschlauch,spaten,harke,rechen,gartenschere,rasenmäher,blumentopf,unkraut,unkrautvlies,mulch,rindenmulch,grill,holzkohle,gartenstuhl,gartentisch,sonnenschirm,zaun,pflanzkübel,kübel,hochbeet,kompost,pflanzenschutz,schneckenkorn,saatgut,zwiebeln,setzlinge,laubsack,kehrbesen,besen,schubkarre,regentonne,gartenmöbel,pflaster,pflastersteine,splitt,gartenkralle,heckenschere,motorsense,kettensäge,streusalz,streugut'
    }
  },
  ikea:{
    name:'IKEA', desc:'Marktplatz, Möbellager, Schwedenshop',
    stations:[
      {id:'kueche', name:'Küche & Geschirr', ex:'Teller, Gläser, Töpfe, Besteck'},
      {id:'textil', name:'Textilien & Teppiche', ex:'Kissen, Decken, Vorhänge'},
      {id:'licht', name:'Beleuchtung', ex:'Lampen, Leuchtmittel, Lichterkette'},
      {id:'deko', name:'Deko & Pflanzen', ex:'Rahmen, Kerzen, Vasen'},
      {id:'aufbew', name:'Aufbewahrung & Ordnung', ex:'Boxen, Körbe, Haken'},
      {id:'kinder', name:'Kinder', ex:'Spielzeug, Kinderstuhl'},
      {id:'moebel', name:'Möbel (Selbstbedienung)', ex:'Regal, Schrank, Bett'},
      {id:'schwede', name:'Schwedenshop & Bistro', ex:'Köttbullar, Sauce, Knäckebrot'},
      {id:'sonst', name:'Sonstiges', ex:'Alles, was nirgends passt'}
    ],
    kw:{
  kueche:'teller,tasse,tassen,glas,gläser,besteck,topf,töpfe,pfanne,schüssel,messer,schneidebrett,becher,karaffe,kanne,backform,kochlöffel,küche,geschirr,schale,trinkglas,weinglas,sieb,reibe,schneebesen,pfannenwender,thermoskanne,geschirrtuch,kochtopf,auflaufform,tablett,untersetzer,eiswürfel,flaschenöffner',
  textil:'kissen,decke,bettwäsche,vorhang,vorhänge,gardine,teppich,handtuch,handtücher,kissenbezug,plaid,laken,spannbettlaken,matratzenschoner,bezug,kissenhülle,badematte,duschvorhang,tischdecke,tischläufer,sitzkissen,fell,gardinenstange,rollo,jalousie,tagesdecke,überwurf,daunendecke',
  licht:'lampe,leuchte,led,glühbirne,leuchtmittel,lichterkette,schirm,lampenschirm,stehlampe,tischlampe,deckenlampe,spot,strahler,nachtlicht,lichtschlauch,fassung,pendelleuchte,wandlampe,kabelset',
  deko:'bild,bilder,bilderrahmen,rahmen,kerze,kerzen,vase,spiegel,pflanze,kunstpflanze,übertopf,blumentopf,uhr,wanduhr,poster,deko,windlicht,teelicht,teelichter,figur,schale deko,wandregal deko,fotorahmen,kranz,kerzenhalter,laterne',
  aufbew:'box,boxen,kiste,kisten,korb,körbe,haken,kleiderbügel,bügel,schublade,organizer,aufbewahrung,schuhregal,schuhschrank,wäschekorb,wäschesammler,ordnung,einsatz,trennwand,schubladeneinsatz,garderobenhaken,aufbewahrungsbox,regalboden,vakuumbeutel,körbchen,dose,dosen,behälter,eimer,mülleimer,abfalleimer',
  kinder:'kinder,spielzeug,kuscheltier,kinderstuhl,kindertisch,stofftier,spielküche,bausteine,puzzle,rutsche,kinderbett,wickeltisch,babybett,hochstuhl,kindergeschirr,kuscheldecke,lernturm,zelt',
  moebel:'schrank,kommode,bett,matratze,lattenrost,tisch,schreibtisch,stuhl,sofa,sessel,hocker,garderobe,billy,malm,pax,kallax,hemnes,bank,nachttisch,spiegelschrank,regal,bettgestell,couchtisch,esstisch,bürostuhl,schuhbank,sideboard,tv bank,fernsehbank,beistelltisch,hochbett,schlafsofa,klappstuhl,sitzbank,regaleinsatz,türen,ersatzteil,schiene',
  schwede:'köttbullar,fleischbällchen,preiselbeer,preiselbeeren,marmelade,knäckebrot,zimtschnecke,hotdog,glögg,lachs,gravad,hering,kaviar,sirup,lakritz,haferdrink,kaffee,tee,sauce,soße,schokolade,kekse,tiefkühl,pommes,sahnesauce,pasta,süßigkeiten,limo,saft,pulver'
    }
  },
  drogerie:{
    name:'Drogerie', desc:'Pflege, Zahn, Hygiene, Baby, Reiniger',
    stations:[
      {id:'koerper', name:'Gesicht & Körper', ex:'Creme, Duschgel, Deo'},
      {id:'haare', name:'Haare', ex:'Shampoo, Spülung, Haarspray'},
      {id:'zahn', name:'Zahn & Mund', ex:'Zahnpasta, Zahnbürste, Zahnseide'},
      {id:'hygiene', name:'Hygiene & Gesundheit', ex:'Taschentücher, Pflaster, Vitamine'},
      {id:'baby', name:'Baby & Kind', ex:'Windeln, Feuchttücher, Brei'},
      {id:'haushalt', name:'Haushalt & Reiniger', ex:'Spülmittel, Waschmittel, Müllbeutel'},
      {id:'food', name:'Snacks & Bio', ex:'Müsli, Riegel, Tee'},
      {id:'sonst', name:'Sonstiges', ex:'Alles, was nirgends passt'}
    ],
    kw:{
  koerper:'creme,gesichtscreme,handcreme,bodylotion,lotion,duschgel,seife,=deo,deodorant,sonnencreme,lippenpflege,abschminken,wattepad,wattepads,rasierer,rasierschaum,parfum,make-up,makeup,mascara,nagellack,peeling,gesichtsmaske,körperöl,rasierklingen,tagescreme,nachtcreme,reinigungsgel,reinigungstücher,micellar,lippenstift,nagellackentferner,badezusatz,badeschaum,körperpeeling,fußcreme,pflege',
  haare:'shampoo,spülung,haarkur,haargel,haarspray,haarfarbe,haarbürste,kamm,haargummi,trockenshampoo,haarwachs,haaröl,haarnadeln,haarklammer,schaumfestiger,tönung,coloration,haarmaske',
  zahn:'zahnpasta,zahncreme,zahnbürste,zahnseide,mundspülung,interdental,aufsteckbürste,zahnputz,zungenreiniger,kaugummi,zahnschiene,mundwasser,zahnstocher,elmex,zahnweiß',
  hygiene:'tampon,tampons,binden,=binde,slipeinlage,taschentücher,pflaster,tabletten,vitamin,vitamine,magnesium,ibuprofen,kondom,kondome,wattestäbchen,erkältung,hustensaft,nasenspray,desinfektion,desinfektionsmittel,mundschutz,fieberthermometer,halsschmerz,lutschtabletten,kohletabletten,nahrungsergänzung,vitamin c,zink,aspirin,paracetamol,verband,tape,schmerz,hygiene,toilettenpapier,klopapier',
  baby:'windel,windeln,feuchttuch,feuchttücher,babybrei,schnuller,babyöl,wundcreme,milchpulver,babyshampoo,gläschen,beikost,babynahrung,baby,babycreme,stilleinlagen,still,quetschie,kinderzahnpasta,sauger,fläschchen,babytee',
  haushalt:'spülmittel,waschmittel,weichspüler,reiniger,müllbeutel,küchenrolle,schwamm,alufolie,backpapier,gefrierbeutel,batterie,batterien,glühbirne,kerze,entkalker,tabs,spülmaschinentabs,waschpulver,flüssigwaschmittel,wc reiniger,badreiniger,glasreiniger,putztuch,spültuch,müllsack,frischhaltefolie,duftkerze,raumduft,mottenschutz,fleckentferner,wäscheklammern,schmutzfang,staubsaugerbeutel,schwämme,lappen',
  food:'müsli,riegel,nüsse,tee,schokolade,trockenobst,gummibärchen,haferflocken,kaffee,reiswaffeln,chips,knabber,proteinriegel,studentenfutter,nussmus,datteln,snack,smoothie,haferdrink,sojadrink,bio,honig'
    }
  },
  eigen:{
    name:'Eigene Liste', desc:'Leer starten, Stationen selbst anlegen',
    stations:[{id:'sonst', name:'Sonstiges', ex:'Alles, was nirgends passt'}],
    kw:{}
  }
};
var TPL_ORDER = ['supermarkt','baumarkt','ikea','drogerie','eigen'];

function norm(s){
  return String(s).toLowerCase().replace(/ß/g,'ss').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\s+/g,' ').trim();
}

var KWC = {};
function kwFor(tplId){
  if(KWC[tplId]) return KWC[tplId];
  var out = {}, src = (TPLS[tplId] && TPLS[tplId].kw) || {};
  Object.keys(src).forEach(function(id){
    out[id] = src[id].split(',').map(function(s){return s.trim();}).filter(Boolean).map(function(s){
      return s.charAt(0)==='=' ? {s:norm(s.slice(1)), exact:true} : {s:norm(s), exact:false};
    });
  });
  KWC[tplId] = out;
  return out;
}

function fallbackId(stations){
  for(var i=0;i<stations.length;i++){ if(stations[i].id==='sonst') return 'sonst'; }
  return stations.length ? stations[stations.length-1].id : 'sonst';
}
function inTpl(tplId, sid){
  var st = TPLS[tplId] ? TPLS[tplId].stations : [];
  for(var i=0;i<st.length;i++){ if(st[i].id===sid) return true; }
  return false;
}

/* stations: die Stationen der Liste in ihrer Reihenfolge. Bei gleich langem Treffer gewinnt die frühere Station. */
function classify(name, learned, tplId, stations){
  var n = norm(name);
  var ids = stations.map(function(s){return s.id;});
  if(learned && learned[n] && ids.indexOf(learned[n]) >= 0) return learned[n];
  var tokens = n.split(/[^a-z0-9]+/).filter(Boolean);
  var kw = kwFor(tplId);
  var best = null, bestLen = 0;
  for(var ci=0; ci<stations.length; ci++){
    var st = stations[ci], list = kw[st.id] || [];
    if(!inTpl(tplId, st.id)){
      /* Eigene Stationen: Wörter aus dem Stationsnamen zählen als Schlüsselwörter. */
      list = norm(st.name).split(/[^a-z0-9]+/).filter(function(w){ return w.length >= 4; }).map(function(w){ return {s:w, exact:false}; });
    }
    for(var ki=0; ki<list.length; ki++){
      var k = list[ki];
      var hit = k.exact ? tokens.indexOf(k.s) >= 0 : n.indexOf(k.s) >= 0;
      if(hit && k.s.length > bestLen){ best = st.id; bestLen = k.s.length; }
    }
  }
  return best || fallbackId(stations);
}
