/* manjo: Rechenteil für das Ziehen der Stationen. */
/* rects: Position (top) und Höhe (h) jeder Zeile beim Start des Ziehens. i: gezogene Zeile. */
function dragTarget(rects, i, dy){
  var r = rects[i], c = r.top + r.h / 2 + dy, j = 0;
  for(var k = 0; k < rects.length; k++){
    if(k !== i && rects[k].top + rects[k].h / 2 < c) j++;
  }
  return j;
}
function dragFinal(rects, i, j){
  var r = rects[i];
  if(j > i) return rects[j].top + rects[j].h - (r.top + r.h);
  if(j < i) return rects[j].top - r.top;
  return 0;
}
function dragShift(rects, i, j, k, gap){
  var h = rects[i].h + gap;
  if(k === i) return 0;
  if(j > i && k > i && k <= j) return -h;
  if(j < i && k >= j && k < i) return h;
  return 0;
}
