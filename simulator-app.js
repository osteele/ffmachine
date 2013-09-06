(function() {
  var CurrentMachine, CurrentMachineRef, CurrentUser, FirebaseRootRef, MachineChangedHooks, MachineListRef, ReloadAppSeed, addCurrentViewer, app, loadWires, removeCurrentViewer, saveWires, serializeWiring, unserializeWiring;

  FirebaseRootRef = new Firebase('https://ffmachine.firebaseIO.com/');

  CurrentMachine = null;

  CurrentMachineRef = null;

  CurrentUser = null;

  MachineChangedHooks = [];

  MachineListRef = FirebaseRootRef.child('machines');

  ReloadAppSeed = null;

  FirebaseRootRef.child('version').on('value', function(snapshot) {
    var key;
    key = snapshot.val();
    if (ReloadAppSeed && key && ReloadAppSeed !== key) {
      location.reload();
    }
    return ReloadAppSeed = key;
  });

  app = angular.module('FFMachine', ['firebase']);

  app.controller('MachineSimulatorCtrl', function($scope, $location, $window, angularFire, angularFireAuth) {
    var name, simulationThread;
    $scope.mode = 'edit';
    simulationThread = null;
    angularFireAuth.initialize(FirebaseRootRef, {
      scope: $scope,
      name: 'user'
    });
    $scope.login = function(provider) {
      return angularFireAuth.login(provider, {
        rememberMe: true
      });
    };
    $scope.logout = function() {
      return angularFireAuth.logout();
    };
    $scope.runSimulation = function() {
      $scope.mode = 'simulate';
      $scope.simulationRunning = true;
      return simulationThread = window.setInterval((function() {
        return stepSimulator();
      }), 1000 / 10);
    };
    $scope.stopSimulation = function() {
      window.clearInterval(simulationThread);
      $scope.simulationRunning = false;
      return simulationThread = null;
    };
    $scope.stepSimulation = function() {
      $scope.mode = 'simulate';
      $scope.stopSimulation();
      return stepSimulator();
    };
    $scope.$watch('user', function() {
      removeCurrentViewer();
      CurrentUser = $scope.user;
      return addCurrentViewer();
    });
    $scope.$watch('user + machine', function() {
      $scope.editable = CurrentMachine && CurrentUser && CurrentMachine.creator.id === CurrentUser.id;
      if ($scope.mode === 'edit' && !$scope.editable) {
        $scope.mode = 'view';
      }
      if ($scope.mode === 'view' && $scope.editable) {
        return $scope.mode = 'edit';
      }
    });
    MachineChangedHooks.push(function(machine) {
      return $scope.$apply(function() {
        return $scope.machine = machine;
      });
    });
    name = $location.search().name;
    if (!name) {
      $window.location.href = '.';
    }
    setupCanvas();
    return loadWires(name);
  });

  addCurrentViewer = function() {
    var onlineRef, user;
    user = CurrentUser;
    if (!(CurrentMachineRef && CurrentUser)) {
      return;
    }
    onlineRef = CurrentMachineRef.child('connected').child(user.id);
    onlineRef.onDisconnect().remove();
    return onlineRef.set(user.email);
  };

  removeCurrentViewer = function() {
    var onlineRef;
    if (!(CurrentMachineRef && CurrentUser)) {
      return;
    }
    onlineRef = CurrentMachineRef.child('connected').child(CurrentUser.id);
    return onlineRef.remove();
  };

  loadWires = function(name) {
    CurrentMachineRef = MachineListRef.child(name);
    return CurrentMachineRef.on('value', function(snapshot) {
      var hook, wires, _i, _len;
      CurrentMachine = snapshot.val();
      if (!CurrentMachine) {
        console.error("No machine named " + name);
      }
      wires = unserializeWiring(snapshot.val().wiring);
      for (_i = 0, _len = MachineChangedHooks.length; _i < _len; _i++) {
        hook = MachineChangedHooks[_i];
        setTimeout((function() {
          return hook(CurrentMachine);
        }), 10);
      }
      this.setModel(wires);
      return addCurrentViewer();
    });
  };

  saveWires = function(name, wiring) {
    var modified_at, previous_wiring, user;
    user = CurrentUser;
    previous_wiring = CurrentMachine.wiring;
    wiring = serializeWiring(wiring);
    if (previous_wiring === wiring) {
      return;
    }
    if (CurrentMachine["protected"]) {
      console.error("" + CurrentMachine.name + " is read-only");
      return;
    }
    if (!user) {
      console.error("Not signed in");
      return;
    }
    modified_at = Firebase.ServerValue.TIMESTAMP;
    CurrentMachineRef.child('wiring').set(wiring);
    CurrentMachineRef.child('modified_at').set(modified_at);
    return CurrentMachineRef.child('history').push({
      user: user != null ? user.email : void 0,
      wiring: wiring,
      previous_wiring: previous_wiring,
      modified_at: modified_at
    });
  };

  this.wires_changed = function(wires) {
    return saveWires(name, wires);
  };

  serializeWiring = function(wires) {
    var wire;
    return ((function() {
      var _i, _len, _results;
      _results = [];
      for (_i = 0, _len = wires.length; _i < _len; _i++) {
        wire = wires[_i];
        _results.push(wire.join(' '));
      }
      return _results;
    })()).join("\n");
  };

  unserializeWiring = function(str) {
    var wire_strings;
    wire_strings = str.replace(/\\n/g, "\n").split(/\n/);
    if (wire_strings[wire_strings.length - 1] === '') {
      wire_strings.pop();
    }
    return wire_strings.map(function(wire) {
      return wire.split(' ');
    });
  };

}).call(this);
