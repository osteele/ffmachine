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
        var array, i, line, str, _i, _j, _len, _len1;
        str = child.val().wiring;
        array = str.replace(/(\n|\\n)$/, '').split(/\n|\\n/);
        for (i = _i = 0, _len = array.length; _i < _len; i = ++_i) {
          line = array[i];
          array[i] = line.split(' ');
        }
        for (_j = 0, _len1 = array.length; _j < _len1; _j++) {
          line = array[_j];
          parseInts(line);
        }
        window.wires = array;
        return redraw();
      });
    });
  };

  this.saveWires = function(name, wiring) {
    var machineRef;
    machineRef = getMachineRef(name);
    machineRef.on('child_added', function(snapshot) {
      return snapshot.ref().child('wiring').set(wiring);
    });
    return machineRef.on('value', function(snapshot) {
      if (snapshot.val()) {
        return;
      }
      console.info('insert');
      machineRef = machineListRef.push({
        name: name,
        wiring: wiring
      });
      return machineRef.setPriority(name);
    });
  };

}).call(this);
