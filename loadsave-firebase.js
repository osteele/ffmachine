(function() {
  var firebaseRootRef, getMachineRef, machineListRef;

  firebaseRootRef = new Firebase('https://ffmachine.firebaseIO.com/');

  machineListRef = firebaseRootRef.child('machines');

  getMachineRef = function(name, cb) {
    return machineListRef.startAt(name).endAt(name);
  };

  this.loadWires = function(name) {
    return getMachineRef(name).on('value', function(snapshot) {
      return snapshot.forEach(function(child) {
        var wire_strings, wiring_string;
        wiring_string = child.val().wiring.replace(/\\n/g, "\n");
        wire_strings = wiring_string.split(/\n/);
        if (wire_strings[wire_strings.length - 1] === '') {
          wire_strings.pop();
        }
        window.wires = wire_strings.map(function(wire) {
          return wire.split(' ');
        });
        return redraw();
      });
    });
  };

  this.saveWires = function(name, wiring) {
    var machineRef;
    machineRef = getMachineRef(name);
    wiring = wiring.replace(/\r\n/g, "\n");
    machineRef.on('child_added', function(snapshot) {
      return snapshot.ref().child('wiring').set(wiring);
    });
    return machineRef.on('value', function(snapshot) {
      if (snapshot.val()) {
        return;
      }
      machineRef = machineListRef.push({
        name: name,
        wiring: wiring
      });
      return machineRef.setPriority(name);
    });
  };

}).call(this);
