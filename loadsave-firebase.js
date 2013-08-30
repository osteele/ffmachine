(function() {
  var auth, firebaseRootRef, machine, machineListRef, machineRef, reload_key, user;

  firebaseRootRef = new Firebase('https://ffmachine.firebaseIO.com/');

  machineListRef = firebaseRootRef.child('machines');

  machineRef = null;

  machine = null;

  reload_key = null;

  user = null;

  firebaseRootRef.child('version').on('value', function(snapshot) {
    var key;
    key = snapshot.val();
    if (reload_key && key && reload_key !== key) {
      location.reload();
    }
    return reload_key = key;
  });

  auth = new FirebaseSimpleLogin(firebaseRootRef, function(error, _user) {
    if (error) {
      console.error(error);
      return;
    }
    return user = _user;
  });

  this.loadWires = function(name) {
    machineRef = machineListRef.child(name);
    return machineRef.on('value', function(snapshot) {
      var onlineRef, wire_strings, wiring_string;
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
      redraw();
      if (user) {
        onlineRef = machineRef.child('connected').child(user.id);
        onlineRef.onDisconnect().remove();
        return onlineRef.set(user.email);
      }
    });
  };

  this.saveWires = function(name, wiring) {
    wiring = wiring.replace(/\r\n/g, "\n");
    if (machine.wiring === wiring) {
      return;
    }
    if (machine["protected"]) {
      console.error("" + machine.name + " is read-only");
    }
    if (machine["protected"]) {
      return;
    }
    machineRef.child('wiring').set(wiring);
    return machineRef.child('modified_at').set(Firebase.ServerValue.TIMESTAMP);
  };

}).call(this);
