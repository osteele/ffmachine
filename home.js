(function() {
  var MachineDetailCtrl, MachineListCtrl, firebaseRootRef, machineListRef, module, reload_key,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  firebaseRootRef = new Firebase('https://ffmachine.firebaseIO.com/');

  machineListRef = firebaseRootRef.child('machines');

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

  MachineListCtrl = function($scope, $location, angularFire) {
    var auth;
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
      var k;
      if (!machine.connected) {
        return [];
      }
      return (function() {
        var _results;
        _results = [];
        for (k in machine.connected) {
          _results.push(k);
        }
        return _results;
      })();
    };
    $scope.view_details = function(machine) {
      return $location.path('/machines/' + encodeURIComponent($scope.machine_key(machine)));
    };
    $scope.login = function(provider) {
      return auth.login(provider, {
        rememberMe: true
      });
    };
    return $scope.logout = function() {
      return auth.logout();
    };
  };

  MachineDetailCtrl = function($scope, $routeParams, angularFire) {
    $scope.machines = [];
    return machineListRef.on('value', function(snapshot) {
      return $scope.$apply(function() {
        var k, v;
        return $scope.machine = ((function() {
          var _ref, _results;
          _ref = snapshot.val();
          _results = [];
          for (k in _ref) {
            v = _ref[k];
            if (k === $routeParams.machineId) {
              _results.push(v);
            }
          }
          return _results;
        })())[0];
      });
    });
  };

  module.config(function($locationProvider, $routeProvider) {
    return $routeProvider.when('/', {
      templateUrl: 'partials/machine-list.html',
      controller: MachineListCtrl
    }).when('/machines/:machineId', {
      templateUrl: 'partials/machine-detail.html',
      controller: MachineDetailCtrl
    });
  });

  module.filter('encode', function() {
    return encodeURIComponent;
  });

  module.filter('objectToList', function() {
    return function(object) {
      var k, v;
      return (function() {
        var _results;
        _results = [];
        for (k in object) {
          v = object[k];
          _results.push(v);
        }
        return _results;
      })();
    };
  });

  module.directive('wiringDiagram', function() {
    return {
      restrict: 'CE',
      replace: true,
      template: '<canvas width="90" height="100"/>',
      transclude: true,
      scope: {
        wires: '@wires',
        previous_wires: '@previousWires',
        width: '@',
        height: '@'
      },
      link: function(scope, element, attrs) {
        var canvas;
        canvas = element[0];
        return attrs.$observe('wires', function(wires) {
          var added_wires, color_index, colors, cols, ctx, deleted_wires, dx, dy, i, j, k, line, lineWidth, mx, my, padding, previous_wires_string, rh, round, rows, rw, s0, s1, sqr, sqrt, v, viewport_height, viewport_width, wire, wires_string, wiring_diff, x0, x1, y0, y1, _i, _j, _k, _len, _ref, _ref1, _ref2, _ref3, _ref4, _ref5, _ref6, _ref7, _ref8;
          wires_string = wires;
          previous_wires_string = scope.previous_wires;
          previous_wires_string || (previous_wires_string = wires_string);
          wiring_diff = function(w1, w0) {
            var dict, line, w, ws, _i, _len;
            w1 = (function() {
              var _i, _len, _ref, _results;
              _ref = w1.split(/\n/);
              _results = [];
              for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                line = _ref[_i];
                if (line.match(/\S/)) {
                  _results.push(line);
                }
              }
              return _results;
            })();
            w0 = (function() {
              var _i, _len, _ref, _results;
              _ref = w0.split(/\n/);
              _results = [];
              for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                line = _ref[_i];
                if (line.match(/\S/)) {
                  _results.push(line);
                }
              }
              return _results;
            })();
            ws = (function() {
              var _i, _len, _results;
              _results = [];
              for (_i = 0, _len = w1.length; _i < _len; _i++) {
                w = w1[_i];
                if (__indexOf.call(w0, w) < 0) {
                  _results.push(w.split(/\s+/));
                }
              }
              return _results;
            })();
            dict = {};
            for (_i = 0, _len = ws.length; _i < _len; _i++) {
              w = ws[_i];
              dict[w] = w;
            }
            return dict;
          };
          wires = (function() {
            var _i, _len, _ref, _results;
            _ref = wires.split(/\n/);
            _results = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              line = _ref[_i];
              if (line.match(/\S/)) {
                _results.push(line.split(/\s+/));
              }
            }
            return _results;
          })();
          added_wires = wiring_diff(wires_string, previous_wires_string);
          deleted_wires = wiring_diff(previous_wires_string, wires_string);
          ctx = canvas.getContext('2d');
          _ref = [1800, 2000], viewport_width = _ref[0], viewport_height = _ref[1];
          ctx.save();
          ctx.scale(canvas.width / viewport_width, canvas.height / viewport_height);
          ctx.lineCap = 'round';
          if (canvas.width >= 200) {
            canvas.style.background = 'url(ffmachine.png)';
            canvas.style.backgroundSize = 'cover';
            ctx.lineWidth = 8;
          } else {
            canvas.style.background = null;
            ctx.lineWidth = 1.75 * viewport_width / canvas.width;
            _ref1 = [5, 9], rows = _ref1[0], cols = _ref1[1];
            _ref2 = [200, 400], rw = _ref2[0], rh = _ref2[1];
            padding = 10;
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, viewport_width, viewport_height);
            ctx.fillStyle = '#301E17';
            ctx.globalAlpha = 0.9;
            for (i = _i = 0; 0 <= rows ? _i < rows : _i > rows; i = 0 <= rows ? ++_i : --_i) {
              for (j = _j = 0; 0 <= cols ? _j < cols : _j > cols; j = 0 <= cols ? ++_j : --_j) {
                ctx.fillRect(j * rw + padding, i * rh + padding, rw - 2 * padding, rh - 2 * padding);
              }
            }
            ctx.globalAlpha = 1;
          }
          colors = ['#804010', '#f00000', '#f0a000', '#f0f000', '#00f000', '#0000f0'];
          round = Math.round, sqrt = Math.sqrt;
          sqr = function(x) {
            return Math.pow(x, 2);
          };
          lineWidth = ctx.lineWidth;
          _ref3 = wires.concat((function() {
            var _results;
            _results = [];
            for (k in deleted_wires) {
              v = deleted_wires[k];
              _results.push(v);
            }
            return _results;
          })());
          for (_k = 0, _len = _ref3.length; _k < _len; _k++) {
            wire = _ref3[_k];
            s0 = wire[0], s1 = wire[1];
            _ref4 = pinoutToXy(s0), x0 = _ref4[0], y0 = _ref4[1];
            _ref5 = pinoutToXy(s1), x1 = _ref5[0], y1 = _ref5[1];
            color_index = round(sqrt(sqr(x1 - x0, 2) + sqr(y1 - y0, 2)) / 100);
            ctx.strokeStyle = (_ref6 = colors[color_index]) != null ? _ref6 : '#d02090';
            ctx.lineWidth = lineWidth;
            if (wire in added_wires || wire in deleted_wires) {
              ctx.lineWidth *= 5;
            }
            ctx.globalAlpha = 1;
            if (wire in deleted_wires) {
              ctx.globalAlpha = 0.2;
            }
            mx = x0 + (x1 - x0) / 2;
            my = y0 + (y1 - y0) / 2;
            _ref7 = [(x1 - x0) / 5, 0], dx = _ref7[0], dy = _ref7[1];
            dx += 10 * (dx < 0 ? -1 : 1);
            if (y0 === y1) {
              _ref8 = [0, 10], dx = _ref8[0], dy = _ref8[1];
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
