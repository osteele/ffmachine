(function() {
  var CurrentMachine, CurrentMachineRef, CurrentUser, FirebaseRootRef, MachineChangedHooks, MachineListRef, ReloadAppSeed, SimulatorThread, addCurrentViewer, app, loadMachine, removeCurrentViewer, saveMachine, serializeMachineConfiguration, unserializeConfiguration,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

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
    var machineName, simulator;
    $scope.mode = 'edit';
    $scope.tracedTerminals = [];
    simulator = new SimulatorThread;
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
      simulator.start();
      $scope.mode = 'simulate';
      return $scope.simulationRunning = simulator.running;
    };
    $scope.stopSimulation = function() {
      simulator.stop();
      return $scope.simulationRunning = simulator.running;
    };
    $scope.stepSimulation = function() {
      simulator.step();
      $scope.mode = 'simulate';
      return $scope.simulationRunning = simulator.running;
    };
    $scope.closeTerminalTrace = function(terminal) {
      var t;
      return $scope.tracedTerminals = (function() {
        var _i, _len, _ref, _results;
        _ref = $scope.tracedTerminals;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          t = _ref[_i];
          if (t !== terminal) {
            _results.push(t);
          }
        }
        return _results;
      })();
    };
    $scope.$watch('mode', function() {
      if ($scope.mode !== 'simulate') {
        return $scope.stopSimulation();
      }
    });
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
    $scope.$watch('tracedTerminals', function() {
      return updateTerminalTraceViews();
    });
    MachineChangedHooks.push(function(machine) {
      return $scope.$apply(function() {
        return $scope.machine = machine;
      });
    });
    window.traceTerminal = function(terminal) {
      if (__indexOf.call($scope.tracedTerminals, terminal) >= 0) {
        return;
      }
      return $scope.$apply(function() {
        return $scope.tracedTerminals.push(terminal);
      });
    };
    machineName = $location.search().name;
    if (!machineName) {
      $window.location.href = '.';
    }
    initializeMachineView();
    return loadMachine(machineName);
  });

  SimulatorThread = (function() {
    function SimulatorThread() {
      this.simulationThread = null;
    }

    SimulatorThread.prototype.start = function() {
      this.simulationThread || (this.simulationThread = window.setInterval((function() {
        return stepSimulator();
      }), 1000 / 10));
      return this.running = true;
    };

    SimulatorThread.prototype.stop = function() {
      if (this.simulationThread) {
        window.clearInterval(this.simulationThread);
      }
      this.simulationThread = null;
      return this.running = false;
    };

    SimulatorThread.prototype.step = function() {
      this.stop();
      return stepSimulator();
    };

    return SimulatorThread;

  })();

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

  loadMachine = function(machineName) {
    CurrentMachineRef = MachineListRef.child(machineName);
    return CurrentMachineRef.on('value', function(snapshot) {
      var configuration, hook, _i, _len;
      CurrentMachine = snapshot.val();
      if (!CurrentMachine) {
        throw Error("No machine named " + machineName);
      }
      configuration = unserializeConfiguration(snapshot.val().wiring);
      for (_i = 0, _len = MachineChangedHooks.length; _i < _len; _i++) {
        hook = MachineChangedHooks[_i];
        setTimeout((function() {
          return hook(CurrentMachine);
        }), 10);
      }
      this.updateMachineConfiguration(configuration);
      return addCurrentViewer();
    });
  };

  saveMachine = function(configuration) {
    var modified_at, previous_wiring, user, wiring;
    user = CurrentUser;
    previous_wiring = CurrentMachine.wiring;
    wiring = serializeMachineConfiguration(configuration);
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

  this.machineConfigurationChanged = function(configuration) {
    return saveMachine(configuration);
  };

  serializeMachineConfiguration = function(configuration) {
    var serializeWire;
    serializeWire = function(wire) {
      return wire.terminals.map(function(terminal) {
        return terminal.identifier;
      }).join(' ');
    };
    return configuration.wires.map(serializeWire).join("\n");
  };

  unserializeConfiguration = function(configurationString) {
    var unserializeWire, wireStrings;
    unserializeWire = function(wireString) {
      return createWire.apply(null, wireString.split(' ').map(getTerminalByIdentifier));
    };
    wireStrings = configurationString.replace(/\\n/g, "\n").split(/\n/);
    if (wireStrings[wireStrings.length - 1] === '') {
      wireStrings.pop();
    }
    return {
      wires: wireStrings.map(unserializeWire)
    };
  };

}).call(this);
