(function() {
  var CurrentMachine, CurrentMachineRef, CurrentUser, FirebaseRootRef, MachineListRef, SimulatorThread, StoredMachineChangedHooks, addCurrentViewer, app, loadMachine, removeCurrentViewer, saveMachine, serializeMachineConfiguration, unserializeConfiguration,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  FirebaseRootRef = new Firebase('https://ffmachine.firebaseIO.com/');

  CurrentMachine = null;

  CurrentMachineRef = null;

  CurrentUser = null;

  StoredMachineChangedHooks = [];

  MachineListRef = FirebaseRootRef.child('machines');

  (function() {
    var reloadAppSeed;
    reloadAppSeed = null;
    return FirebaseRootRef.child('version').on('value', function(snapshot) {
      var key;
      key = snapshot.val();
      if (reloadAppSeed && key && reloadAppSeed !== key) {
        location.reload();
      }
      return reloadAppSeed = key;
    });
  })();

  app = angular.module('FFMachine', ['firebase']);

  app.controller('MachineSimulatorCtrl', function($scope, $location, $window, angularFire, angularFireAuth) {
    var machineName, simulator;
    $scope.mode = 'edit';
    $scope.$safeApply || ($scope.$safeApply = function(fn) {
      var phase;
      phase = this.$root.$$phase;
      if (phase === '$apply' || phase === '$digest') {
        return this.$eval(fn);
      } else {
        return this.$apply(fn);
      }
    });
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
    $scope.$watch('user', function() {
      removeCurrentViewer();
      CurrentUser = $scope.user;
      return addCurrentViewer();
    });
    simulator = new SimulatorThread;
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
    $scope.$watch('mode', function() {
      if ($scope.mode !== 'simulate') {
        return $scope.stopSimulation();
      }
    });
    $scope.setHighlightWire = function(wire) {
      return Dispatcher.highlightWire(wire);
    };
    $scope.unsetHighlightWire = function(wire) {
      return Dispatcher.unhighlightWire(wire);
    };
    Dispatcher.on('highlightWire.controller', function(wire) {
      return $scope.$safeApply(function() {
        return $scope.highlightWire = wire;
      });
    });
    Dispatcher.on('unhighlightWire.controller', function(wire) {
      return $scope.$safeApply(function() {
        return $scope.highlightWire = null;
      });
    });
    $scope.graphedTerminals = [];
    $scope.closeHistoryGraph = function(terminal) {
      var t;
      return $scope.graphedTerminals = (function() {
        var _i, _len, _ref, _results;
        _ref = $scope.graphedTerminals;
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
    $scope.$watch('graphedTerminals', function() {
      return updateHistoryGraphs();
    });
    window.graphTerminal = function(terminal) {
      if (__indexOf.call($scope.graphedTerminals, terminal) >= 0) {
        return;
      }
      return $scope.$apply(function() {
        return $scope.graphedTerminals.push(terminal);
      });
    };
    $scope.$watch('user + machine', function() {
      var _ref;
      $scope.editable = CurrentMachine && (CurrentMachine != null ? (_ref = CurrentMachine.access) != null ? _ref[CurrentUser.id] : void 0 : void 0) === 'write';
      if ($scope.mode === 'edit' && !$scope.editable) {
        $scope.mode = 'view';
      }
      if ($scope.mode === 'view' && $scope.editable) {
        return $scope.mode = 'edit';
      }
    });
    StoredMachineChangedHooks.push(function(storedMachine) {
      return $scope.$apply(function() {
        return $scope.machine = storedMachine;
      });
    });
    window.machineConfigurationChanged = function(configuration) {
      saveMachine(configuration);
      return $scope.$apply(function() {
        return $scope.wires = configuration.wires;
      });
    };
    machineName = $location.search().name;
    if (!machineName) {
      $window.location.href = '.';
    }
    initializeMachineView();
    return loadMachine(machineName);
  });

  app.filter('floatValue', function() {
    return function(value) {
      value = fromWeak(value);
      if (typeof value !== 'number') {
        return;
      }
      return "" + value + "<b>V</b>";
    };
  });

  app.filter('terminalVoltageMiniHistory', function() {
    return function(terminal) {
      var prev, str, value, _ref, _ref1, _ref2;
      value = fromWeak(terminal.value);
      prev = (_ref = terminal.history) != null ? (_ref1 = _ref[((_ref2 = terminal.history) != null ? _ref2.length : void 0) - 2]) != null ? _ref1.value : void 0 : void 0;
      if (prev) {
        prev = fromWeak(prev);
      }
      if (!(typeof value === 'number' || typeof prev === 'number')) {
        return;
      }
      str = "" + value + "<b>V</b>";
      if (typeof prev === 'number' && prev !== value) {
        str = "<del>" + prev + "<b>V</b></del> &rarr; <ins>" + str + "</ins>";
      }
      return str;
    };
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
      for (_i = 0, _len = StoredMachineChangedHooks.length; _i < _len; _i++) {
        hook = StoredMachineChangedHooks[_i];
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
