var firebaseRootRef = new Firebase('https://ffmachine.firebaseIO.com/');
var wiringListRef = firebaseRootRef.child('wirings');

function loadWires(name){
  wiringListRef.child(name).on('value', function(snapshot) {
    var str = snapshot.val();
    var array = str.replace(/(\n|\\n)$/, '').split(/\n|\\n/);
    for(var i=0;i<array.length;i++) array[i]=array[i].split(' ');
    for(var i=0;i<array.length;i++) parseInts(array[i]);
    wires = array;
    redraw();
  });
}

function saveWires(name, str){
  wiringListRef.child(name).set(str);
}
