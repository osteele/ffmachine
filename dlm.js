var filename;
var readonly;
var sync;
var wirebuffer, ctx;
var ffholes;
var wires = [];
var moved, startpin, knoboffset;
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
	startpin = xyToPinout(x,y);
	if(startpin) {window.onmousemove = function(e){mouseMove(e)}; return;}
	var wn = bufferPixel(x,y);
	if (wn!=0) {pickUpWire(wn, x, y); return;};
}

function pickUpWire(wn, x, y){
	var w = wires[wn-1];
	wires.splice(wn-1,1);
	var d1 = dist([x,y], pinoutToXy(w[0]));
	var d2 = dist([x,y], pinoutToXy(w[1]));
	startpin = (d1>d2) ? w[0] : w[1];
	redraw();
	if(sync&&!readonly) submit(filename);
	drawLine(pinoutToXy(startpin), [x, y], 0);
	window.onmousemove = function(e){mouseMove(e)};
}

function mouseMove(e){
	moved = true;
	redraw();
	if(sync&&!readonly) submit(filename);
	drawLine(pinoutToXy(startpin), [localx(e.clientX), localy(e.clientY)], 0);
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
//	if(!moved){mouseClicked(e); return;}
	moved = false;
	var x=localx(e.clientX), y=localy(e.clientY);
	endpin = xyToPinout(x,y);
	if(endpin&&(endpin!=startpin)) wires.push([startpin, endpin]);
	startpin = undefined;
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
}

/////////////////////////
//
// Drawing
//
/////////////////////////


function redraw(){
	ctx.clearRect(0,0,1800, 2000);
//	drawKnobs();
	for(var i=0;i<wires.length;i++) drawWireBetweenPins(wires[i][0], wires[i][1], i+1);
}

function drawWireBetweenPins(p1, p2, n){
	drawLine(pinoutToXy(p1), pinoutToXy(p2), n);
}


function drawLine(p1, p2, n){
	var x1=p1[0], y1=p1[1], x2=p2[0], y2=p2[1];
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

function bufferPixel(x, y){
	var pixels = ctx.getImageData(x, y, 2, 2).data;
	if(pixels[3]!=255) return 0;
	return ((pixels[0]&15)<<8)+((pixels[1]&15)<<4)+(pixels[2]&15);
}

function dist(a,b){return Math.sqrt((b[0]-a[0])*(b[0]-a[0])+(b[1]-a[1])*(b[1]-a[1]));}
function cos(n){return Math.cos(n*Math.PI/180);}
function sin(n){return Math.sin(n*Math.PI/180);}
function arctan2(x,y){return Math.atan2(x,y)*180/Math.PI;}
function hexd(n){return '0123456789abcdef'[n];}

function localx(gx){return (gx-wirebuffer.getBoundingClientRect().left)*1800/900;}
function localy(gy){return (gy-wirebuffer.getBoundingClientRect().top)*2000/1000;}
