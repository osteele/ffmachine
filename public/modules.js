/////////////////////////
//
// Defs
//
/////////////////////////

var modules = [
  ['clk1', 'ff', 'ff', 'ff', 'ff', 'ff', 'ff', 'ff', 'clk2'],
  ['ff', 'ff', 'ff', 'ff', 'ff', 'dg', 'ff', 'ff', 'ff'],
  ['ff', 'ff', 'ff', 'ff', 'ff', 'pa', 'ff', 'ff', 'ff'],
  ['ff', 'ff', 'ff', 'ff', 'ff', 'ff', 'ff', 'ff', 'ff']
]

var holedefs = {
ff: [[100, 166, 'p'],
  [66, 190, '0'], [134, 190, '1'],
  [66, 252, '0in'], [134, 252, '1in'],
  [100, 266, 'comp'],
  [66, 290, 'e0'],[66, 336, 'c0'], [40, 314, 'b0'],
  [134, 290, 'e1'], [134, 336, 'c1'], [160, 314, 'b1'],
  [66, 372, 'gnd1'], [100, 372, 'gnd2'], [134, 372, 'gnd3']],
clk1: [[160, 98, '-'], [160, 144, '+'], [160, 190, 'gnd']],
clk2: [[160, 98, '-'], [160, 144, '+'], [160, 190, 'gnd']],
pa: [[160, 90, '-0'], [160, 136, '+0'], [66, 113, 'in0'], [160, 167, 'gnd0'],
  [160, 240, '-1'], [160, 286, '+1'], [66, 263, 'in1'], [160, 317, 'gnd1'],
  [66, 143, 'c0'], [66, 189, 'e0'], [40, 167, 'b0'],
  [66, 293, 'c1'], [66, 339, 'e1'], [40, 317, 'b1'],
  [40, 360, 'gnd2']]

};


/////////////////////////
//
// Holes
//
/////////////////////////

function xyToPinout(x, y){
  var mx=Math.floor(x/200), my=Math.floor(y/500);
  if((mx<0)||(my<0)||(mx>9)||(my>4)) return undefined;
  var ix=x%200, iy=y%500;
  var type = modules[my][mx];
  var hole = findHole(holedefs[type],ix,iy);
  if (!hole) return undefined;
  return ['a','b','c','d'][my]+'_'+mx+'_'+hole[2];
}

function pinoutToXy(p){
  var r = p.split('_');
  var mx = r[1];
  var my = {a:0,b:1,c:2,d:3}[r[0]];
  var type = modules[my][mx];
  var holepos = holePos(holedefs[type], r[2]);
  return [mx*200+holepos[0], my*500+holepos[1]];
}

function findHole(holes, x, y){
  for(var i=0;i<holes.length;i++){
    if(dist(holes[i], [x,y])<12) return holes[i];
  }
  return undefined;
}

function holePos(holes, pin){
  for(var i in holes){if(holes[i][2]==pin) return holes[i];}
}
