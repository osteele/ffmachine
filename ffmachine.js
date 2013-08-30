var filename;
var readonly;
var sync;
var wirebuffer, ctx;
var ffholes;
var wires = [];
var moved, startx, starty, knoboffset;
var knobs = [[100, 252, 288, '#f0f0f0'],
						 [100, 382, 0, '#f0f0f0'],
						 [1700, 252, 292, '#202020'],
						 [1700, 382, 0, '#202020']];


function setup(){
	var urlvars = getUrlVars();
	filename = urlvars['name'];
	readonly = urlvars['readonly'];
	sync = urlvars['sync'];
	wirebuffer = document.getElementById('wirebuffer');
	wirebuffer.width = 1800;
	wirebuffer.height =2000;
	ctx = wirebuffer.getContext('2d');
	ctx.lineCap="round";
	wirebuffer.onmousedown = function(e){mouseDown(e);}
	window.onmouseup = function(e){mouseUp(e)};
	window.onkeypress = function(e){handleKey(e);}
	ffholes = holeImage('ffholes');
	clkholes = holeImage('clkholes');
	if(filename) loadWires(filename);
	redraw();
}

/////////////////////////
//
// User Interface
//
/////////////////////////

function mouseDown(e){
	e.preventDefault();
	moved = false; startx=-1, starty=-1;
	var x=localx(e.clientX), y=localy(e.clientY);
	var pos = holeSnap(x ,y);
	var wn = dataPixel(x,y);
	if(pos[1]>-1){
		startx = pos[0];
		starty = pos[1];
		window.onmousemove = function(e){mouseMove(e)};
	} else if (wn!=0) {
		var w = wires[wn-1];
		wires.splice(wn-1,1);
		var d1 = Math.sqrt((w[0]-x)*(w[0]-x)+(w[1]-y)*(w[1]-y));
		var d2 = Math.sqrt((w[2]-x)*(w[2]-x)+(w[3]-y)*(w[3]-y));
		if(d1>d2) {startx = w[0]; starty = w[1];}
		else {startx = w[2]; starty = w[3];}
		wires.push([startx, starty, x, y]);
		moved = true;
		window.onmousemove = function(e){mouseMove(e)};
	}
	redraw();
	if(sync&&!readonly) submit(filename);
}

function mouseMove(e){
	if(starty<0) return;
	if(startx<0){dragKnob(e); return;}
	if(!moved){
		moved = true;
		wires.push([startx, starty, 0, 0]);
	}
	var r = wires[wires.length-1];
	r[2] = localx(e.clientX);
	r[3] = localy(e.clientY);
	redraw();
	if(sync&&!readonly) submit(filename);
}

function dragKnob(e){
	var knob = knobs[starty];
	var a = knobAngle(knob, localx(e.clientX), y=localy(e.clientY));
	if(!moved){
		moved = true;
		knoboffset = mod360(knob[2]-a);
	}
	knob[2] = mod360(a+knoboffset);
	redraw();
	if(sync&&!readonly) submit(filename);
}


function mouseUp(e){
	window.onmousemove = undefined;
	if(!moved){mouseClicked(e); return;}
	moved = false;
	if(starty<0) return;
	if(startx<0){releaseKnob(); return;}
	var pos = holeSnap(localx(e.clientX), localy(e.clientY));
	var r = wires[wires.length-1];
	if(pos[0]!=-1){r[2] = pos[0]; r[3] = pos[1];}
	else wires.pop();
	redraw();
	if(sync&&!readonly) submit(filename);
}

function releaseKnob(){
	var knob = knobs[starty];
	if(starty==0) knob[2]=findNearest(knob[2], [-72, -36, 0, 36, 72]);
	if(starty==2) knob[2]=findNearest(knob[2], [-68, -23, 22, 67]);
	redraw();
	if(sync&&!readonly) submit(filename);
}

function mouseClicked(e){
}

function handleKey(e){
	var c = e.charCode;
	c = String.fromCharCode(c);
	console.log(c);
	if((c=='S')&&filename) {
		if(readonly && !confirm("Opened in readonly mode. Switch to edit mode?")) return;
		readonly = false;
		submit(filename);
	}
}

/////////////////////////
//
// Drawing
//
/////////////////////////


function redraw(){
	ctx.clearRect(0,0,1800, 2000);
	drawKnobs();
	for(var i=0;i<wires.length;i++) drawLine(wires[i], i+1);
}


function drawLine(r, n){
	var x1=r[0], y1=r[1], x2=r[2], y2=r[3];
	ctx.lineWidth =  12;
	ctx.strokeStyle = cmerge('#808080', n);
	curveLine(x1,y1,x2,y2);
	ctx.lineWidth =  8;
	ctx.strokeStyle = cmerge(pickColor(x1, y1, x2, y2), n);
	curveLine(x1,y1,x2,y2);
}

function curveLine(x1, y1, x2, y2){
	var mx = x1+(x2-x1)/2;
	var my = y1+(y2-y1)/2;
	var dx = (x2-x1)/5;
	var dy = 0;
	dx+=(dx<0)?-10:10;
	if(y1==y2){dx=0; dy=10;}
	ctx.beginPath();
	ctx.moveTo(x1, y1);
	ctx.quadraticCurveTo(x1+dx, y1+dy, mx, my);
	ctx.moveTo(x2, y2);
	ctx.quadraticCurveTo(x2-dx, y2-dy, mx, my);
	ctx.moveTo(x1, y1);
	ctx.stroke();
}

function drawKnobs(){
	for(i in knobs){
		var k = knobs[i];
		drawKnob(k[0], k[1], k[2], k[3]);
	}
}

function drawKnob(x, y, a, c){
	ctx.fillStyle=c;
	ctx.beginPath();
	ctx.arc(x+22*sin(a),y-22*cos(a),4,0,Math.PI*2,true);
	ctx.closePath();
	ctx.fill();
}


/////////////////////////
//
// Hole Positions
//
/////////////////////////

function holeSnap(x, y){
	var tx=Math.floor(x/200), ty=Math.floor(y/500);
	if((tx<0)||(ty<0)||(tx>9)||(ty>4)) return undefined;
	var ix=x%200, iy=y%500;
	var pos
	if((tx==0)&&(ty==0)) pos = clkholepos(0,ix,iy);
	else if((tx==8)&&(ty==0)) pos = clkholepos(1,ix,iy);
	else pos = ffholepos(ix,iy);
	if(pos[0]==-1) return pos;
	return [tx*200+pos[0], ty*500+pos[1]];
}

function ffholepos(x, y){
	var holes = [[100, 166], [66, 190], [134, 190], [66, 252], [134, 252], [100, 266],
               [66, 290], [134, 290], [66, 336], [134, 336], [40, 314], [160, 314],
               [66, 372], [100, 372], [134, 372]];
	var n = holePixel(ffholes, x, y)/10;
	if(n>14) return [-1, -1];
	return holes[n];
}

function clkholepos(t, x, y){
	var holes = [[160, 98],[160, 144], [160, 190]];
	var n = holePixel(clkholes, x, y)/10;
	if(n>25) return [-1, -1];
	if(n>9) return[-1, t*2+n-10];
	return holes[n];
}

function holeImage(name){
	var img = document.createElement('img');
	img.src = name+'.png';
	var cnv = document.createElement('canvas');
	cnv.width = 200, cnv.height = 500;
	cnv.style.width = 200, cnv.style.height = 500;
	img.onload = function(){drawHoleImage(img, cnv);}
	return cnv;
}

function drawHoleImage(img, cnv){
	var ctx = cnv.getContext('2d');
	ctx.drawImage(img,0,0);
}

function holePixel(cnv, x, y){
	var ctx =cnv.getContext('2d');
	var pixels = ctx.getImageData(x, y, 2, 2).data;
	return pixels[0];
}

function dataPixel(x, y){
	var pixels = ctx.getImageData(x, y, 2, 2).data;
	if(pixels[3]!=255) return 0;
	return ((pixels[0]&15)<<8)+((pixels[1]&15)<<4)+(pixels[2]&15);
}



/////////////////////////
//
// Etc.
//
/////////////////////////

function knobAngle(knob, x, y){
	return arctan2(x-knob[0], knob[1]-y);
}

function cmerge(c, n){
	var high = hexd((n>>8)&15);
	var mid = hexd((n>>4)&15);
	var low = hexd(n&15);
	return '#'+c[1]+high+c[3]+mid+c[5]+low;
}

function pickColor(x1, y1, x2, y2){
	var len = Math.sqrt((x2-x1)*(x2-x1)+(y2-y1)*(y2-y1));
	var i = Math.round(len/100);
	var colors = ['#804010', '#f00000', '#f0a000', '#f0f000', '#00f000', '#0000f0'];
	if(i>5) return '#d02090';
	return colors[i];
}

function findNearest(n ,l){
	var diff=1000000;
	var res;
	for(i in l){
		if(Math.abs(n-l[i])>diff) continue;
		diff = Math.abs(n-l[i]);
		res = l[i];
	}
	return res;
}

function mod360(n){
	n=(n+3600000)%360;
	if(n>180) n-=360;
	return n;
}

function cos(n){return Math.cos(n*Math.PI/180);}
function sin(n){return Math.sin(n*Math.PI/180);}
function arctan2(x,y){return Math.atan2(x,y)*180/Math.PI;}
function hexd(n){return '0123456789abcdef'[n];}

function localx(gx){return (gx-wirebuffer.getBoundingClientRect().left)*1800/900;}
function localy(gy){return (gy-wirebuffer.getBoundingClientRect().top)*2000/1000;}

