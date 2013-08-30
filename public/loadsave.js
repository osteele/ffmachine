/////////////////////////
//
// Load and Save
//
/////////////////////////

function loadWires(filename){
  var request=new XMLHttpRequest()
  request.onreadystatechange=function(){wiresLoaded(request);}
  request.open('GET','saved/'+filename+'.txt?timestamp=' + new Date().getTime(),true)
  request.send(null);
}

function wiresLoaded(request){
  if (request.readyState!=4) return;
  if (request.status!=200) return;
  console.log(request.responseText);
  var array = request.responseText.split('\r\n');
  array.pop();
  for(var i=0;i<array.length;i++) array[i]=array[i].split(' ');
  wires = array;
  redraw();
}

function parseInts(a){
  for(var i=0;i<a.length;i++) a[i]=parseInt(a[i]);
}

function submit(name){
  saveWires(name, wiresString());
}

function saveWires(name, str){
  var request = new XMLHttpRequest();
  request.onreadystatechange=function(){wiresSaved(request);};
  request.open('PUT', 'savetext.php?name='+name, true);
  request.setRequestHeader("Content-Type", 'text/plain');
  request.send(str);
}


function wiresSaved(req, start, len){
  if (req.readyState!=4) return;
  if (req.status!=200) return;
  alert("saved: "+req.responseText);
}

function wiresString(){
  var res = '';
  for(var i in wires) res=res+wires[i].join(' ')+'\r\n';
  return res;
}

function getUrlVars()
{
  var args = window.location.href.slice(window.location.href.indexOf('?') + 1);
  var vars = [], hash;
  var hashes = args.split('&');
  for(var i = 0; i < hashes.length; i++){
    hash = hashes[i].split('=');
    vars.push(hash[0]);
    vars[hash[0]] = hash[1];
  }
  return vars;
}
