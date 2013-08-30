(function() {
  var firebaseRootRef, module, reload_key,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  firebaseRootRef = new Firebase('https://ffmachine.firebaseIO.com/');

  reload_key = null;

  firebaseRootRef.child('version').on('value', function(snapshot) {
    var key;
    key = snapshot.val();
    if (reload_key && key && reload_key !== key) {
      location.reload();
    }
    return reload_key = key;
  });

  module = angular.module('FFMachine', ['firebase']);

  module.controller('machines', function($scope, angularFire) {
    var auth, machineListRef;
    machineListRef = firebaseRootRef.child('machines');
    angularFire(machineListRef, $scope, 'machines', {});
    auth = new FirebaseSimpleLogin(firebaseRootRef, function(error, user) {
      if (error) {
        console.error(error);
        return;
      }
      return setTimeout((function() {
        return $scope.$apply(function() {
          return $scope.user = user;
        });
      }), 10);
    });
    $scope.machine_key = function(machine) {
      var k, m;
      return ((function() {
        var _ref, _results;
        _ref = $scope.machines;
        _results = [];
        for (k in _ref) {
          m = _ref[k];
          if (m === machine) {
            _results.push(k);
          }
        }
        return _results;
      })())[0];
    };
    $scope.duplicate_machine = function(machine) {
      var k, m, message_prefix, name, name_index, now, user, user_key;
      user = $scope.user;
      if (!user) {
        alert("You must sign in before making a machine.");
        return;
      }
      message_prefix = "";
      while (true) {
        name = "" + machine.name + " copy";
        name_index = 1;
        while (((function() {
            var _ref, _results;
            _ref = $scope.machines;
            _results = [];
            for (k in _ref) {
              m = _ref[k];
              if (m.name.toLowerCase() === name.toLowerCase()) {
                _results.push(m);
              }
            }
            return _results;
          })()).length) {
          name_index += 1;
          name = "" + machine.name + " copy #" + name_index;
        }
        name = prompt("" + message_prefix + "Name for the copy of machine '" + machine.name + "':", name);
        if (!name) {
          return;
        }
        if (!((function() {
          var _ref, _results;
          _ref = $scope.machines;
          _results = [];
          for (k in _ref) {
            m = _ref[k];
            if (m.name.toLowerCase() === name.toLowerCase()) {
              _results.push(m);
            }
          }
          return _results;
        })()).length) {
          break;
        }
        message_prefix = "A machine named '" + name + "' already exists. Please choose another name.\n\n";
      }
      user_key = {
        id: user.id,
        email: user.email
      };
      now = new Date;
      return machineListRef.push({
        name: name,
        wiring: machine.wiring,
        creator: user_key,
        writers: [user_key],
        created_at: now
      });
    };
    $scope.delete_machine = function(machine) {
      var k, key, m;
      if (!confirm("Are you sure you want to delete the machine named '" + machine.name + "'?")) {
        return;
      }
      key = ((function() {
        var _ref, _results;
        _ref = $scope.machines;
        _results = [];
        for (k in _ref) {
          m = _ref[k];
          if (m === machine) {
            _results.push(k);
          }
        }
        return _results;
      })())[0];
      return machineListRef.child(key).remove();
    };
    $scope.rename_machine = function(machine) {
      return machine.name = machine.name.replace(/^\s+/, '').replace(/\s+$/, '');
    };
    $scope.machine_editable = function(machine) {
      var user, _ref;
      user = $scope.user;
      return user && machine.writers && (_ref = user.id, __indexOf.call(machine.writers.map(function(user) {
        return user.id;
      }), _ref) >= 0);
    };
    $scope.machine_stats = function(machine) {
      return "" + (machine.wiring.split(/\s+/).length - 1) + " wires";
    };
    $scope.login = function(provider) {
      return auth.login(provider, {
        rememberMe: true
      });
    };
    return $scope.logout = function() {
      return auth.logout();
    };
  });

  module.filter('encode', function() {
    return encodeURIComponent;
  });

}).call(this);
