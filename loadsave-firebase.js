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
        var line, wiring;
        wiring = child.val().wiring.replace(/\\n/g, "\n").replace(/\s+$/, '');
        window.wires = (function() {
          var _i, _len, _ref, _results;
          _ref = wiring.split(/\n/);
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            line = _ref[_i];
            _results.push(line.split(' '));
          }
          return _results;
        })();
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
