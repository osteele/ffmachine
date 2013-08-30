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
      var connectionListRef, onlineRef, wire_strings, wiring_string;
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
      connectionListRef = machineRef.child('connected');
      connectionListRef.on('value', function(snapshot) {
        var e, email, k, user_emails, user_view, v, _i, _len, _results;
        user_emails = (function() {
          var _ref, _results;
          _ref = (snapshot != null ? snapshot.val() : void 0) || {};
          _results = [];
          for (k in _ref) {
            v = _ref[k];
            _results.push(v);
          }
          return _results;
        })();
        user_emails.sort();
        e = document.querySelector('#connected-users ul');
        e.innerHTML = '';
        _results = [];
        for (_i = 0, _len = user_emails.length; _i < _len; _i++) {
          email = user_emails[_i];
          console.info(email);
          user_view = document.createElement('li');
          user_view.appendChild(document.createTextNode(email));
          _results.push(e.appendChild(user_view));
        }
        return _results;
      });
      if (user) {
        onlineRef = connectionListRef.child(user.id);
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
