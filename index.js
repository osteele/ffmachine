(function() {
  var module;

  module = angular.module('FFMachine', ['firebase']);

  module.controller('machines', function($scope, angularFire) {
    var firebaseRootRef, machineListRef;
    firebaseRootRef = new Firebase('https://ffmachine.firebaseIO.com/');
    machineListRef = firebaseRootRef.child('machines');
    angularFire(machineListRef, $scope, 'machines', {});
    $scope.duplicate_machine = function(machine) {
      var copy, k, m, message_prefix, name;
      message_prefix = "";
      while (true) {
        name = prompt("" + message_prefix + "Name for the copy of machine “" + machine.name + "”:", "Copy of " + machine.name);
        if (!((function() {
          var _ref, _results;
          _ref = $scope.machines;
          _results = [];
          for (k in _ref) {
            m = _ref[k];
            if (m.name === name) {
              _results.push(m);
            }
          }
          return _results;
        })()).length) {
          break;
        }
        message_prefix = "A machine named “" + name + "” already exists. Please choose another name.\n\n";
      }
      copy = {
        name: name,
        wiring: machine.wiring
      };
      return machineListRef.push(copy).setPriority(machine.name);
    };
    return $scope.delete_machine = function(machine) {
      var k, key, m;
      if (!confirm("Are you sure you want to delete the machine named “" + machine.name + "”?")) {
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
  });

}).call(this);
