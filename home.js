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
    $scope.machines = [];
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
      now = Firebase.ServerValue.TIMESTAMP;
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
      return "" + ((machine.wiring.split(/\s+/).length - 1) / 2) + " wires";
    };
    $scope.machine_viewers = function(machine) {
      var k, _results;
      if (!machine.connected) {
        return [];
      }
      _results = [];
      for (k in machine.connected) {
        _results.push(k);
      }
      return _results;
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

  module.directive('wiringDiagram', function() {
    return {
      restrict: 'CE',
      replace: true,
      template: '<canvas width="75" height="50"></canvas>',
      transclude: true,
      scope: {
        wires: '@wires'
      },
      link: function(scope, element, attrs) {
        element = element[0];
        return attrs.$observe('wires', function(wires) {
          var color_index, colors, ctx, dx, dy, line, mx, my, round, s0, s1, sqr, sqrt, x0, x1, y0, y1, _i, _len, _ref, _ref1, _ref2, _ref3, _ref4, _ref5;
          wires = (function() {
            var _i, _len, _ref, _results;
            _ref = scope.wires.split(/\n/);
            _results = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              line = _ref[_i];
              if (line.match(/\S/)) {
                _results.push(line.split(/\s+/));
              }
            }
            return _results;
          })();
          ctx = element.getContext('2d');
          ctx.save();
          ctx.scale(element.width / 1800, element.height / 2000);
          (function() {
            var cols, i, j, padding, rh, rows, rw, _i, _ref, _ref1, _results;
            _ref = [5, 9], rows = _ref[0], cols = _ref[1];
            _ref1 = [200, 400], rw = _ref1[0], rh = _ref1[1];
            padding = 10;
            ctx.fillStyle = '#301E17';
            _results = [];
            for (i = _i = 0; 0 <= rows ? _i < rows : _i > rows; i = 0 <= rows ? ++_i : --_i) {
              _results.push((function() {
                var _j, _results1;
                _results1 = [];
                for (j = _j = 0; 0 <= cols ? _j < cols : _j > cols; j = 0 <= cols ? ++_j : --_j) {
                  _results1.push(ctx.fillRect(j * rw + padding, i * rh + padding, rw - 2 * padding, rh - 2 * padding));
                }
                return _results1;
              })());
            }
            return _results;
          })();
          ctx.lineWidth = 60;
          colors = ['#804010', '#f00000', '#f0a000', '#f0f000', '#00f000', '#0000f0'];
          round = Math.round, sqrt = Math.sqrt;
          sqr = function(x) {
            return Math.pow(x, 2);
          };
          for (_i = 0, _len = wires.length; _i < _len; _i++) {
            _ref = wires[_i], s0 = _ref[0], s1 = _ref[1];
            _ref1 = pinoutToXy(s0), x0 = _ref1[0], y0 = _ref1[1];
            _ref2 = pinoutToXy(s1), x1 = _ref2[0], y1 = _ref2[1];
            color_index = round(sqrt(sqr(x1 - x0, 2) + sqr(y1 - y0, 2)) / 100);
            ctx.strokeStyle = (_ref3 = colors[color_index]) != null ? _ref3 : '#d02090';
            mx = x0 + (x1 - x0) / 2;
            my = y0 + (y1 - y0) / 2;
            _ref4 = [(x1 - x0) / 5, 0], dx = _ref4[0], dy = _ref4[1];
            dx += 10 * (dx < 0 ? -1 : 1);
            if (y0 === y1) {
              _ref5 = [0, 10], dx = _ref5[0], dy = _ref5[1];
            }
            ctx.beginPath();
            ctx.moveTo(x0, y0);
            ctx.quadraticCurveTo(x0 + dx, y0 + dy, mx, my);
            ctx.moveTo(x1, y1);
            ctx.quadraticCurveTo(x1 - dx, y1 - dy, mx, my);
            ctx.stroke();
          }
          return ctx.restore();
        });
      }
    };
  });

}).call(this);
