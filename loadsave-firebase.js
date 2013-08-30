(function() {
  var firebaseRootRef, getMachineRef, machine, machineListRef, machineRef;

  firebaseRootRef = new Firebase('https://ffmachine.firebaseIO.com/');

  machineListRef = firebaseRootRef.child('machines');

  machineRef = null;

  machine = null;

  getMachineRef = function(name, cb) {
    var key;
    key = name.toLowerCase();
    return machineListRef.startAt(key).endAt(key);
  };

  this.loadWires = function(name) {
    machineRef = machineListRef.child(name);
    return machineRef.on('value', function(snapshot) {
      var wire_strings, wiring_string;
      machine = snapshot.val();
      if (!machine) {
        console.error("No machine named " + name);
      }
      wiring_string = snapshot.val().wiring.replace(/\\n/g, "\n");
      wire_strings = wiring_string.split(/\n/);
      if (wire_strings[wire_strings.length - 1] === '') {
        wire_strings.pop();
      }
      window.wires = wire_strings.map(function(wire) {
        return wire.split(' ');
      });
      return redraw();
    });
  };

  this.saveWires = function(name, wiring) {
    wiring = wiring.replace(/\r\n/g, "\n");
    console.error("" + machine.name + " is read-only");
    if (machine["protected"]) {
      return;
    }
    return machineRef.child('wiring').set(wiring);
  };

}).call(this);
