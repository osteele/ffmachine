(function() {
  var app, controllers, dependencies, directives, draw_wiring_thumbnail, filters, firebaseRootRef, machineListRef, modules, reload_key,
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

  dependencies = ['firebase', 'ui'];

  modules = ['FFMachine.controllers', 'FFMachine.directives', 'FFMachine.filters'];

  app = angular.module('FFMachine', modules.concat(dependencies));

  app.config(function($locationProvider, $routeProvider) {
    return $routeProvider.when('/', {
      templateUrl: 'partials/machine-list.html',
      controller: 'MachineListCtrl'
    }).when('/machines/:machineId', {
      templateUrl: 'partials/machine-detail.html',
      controller: 'MachineDetailCtrl'
    }).otherwise({
      redirectTo: '/'
    });
  });

  controllers = angular.module('FFMachine.controllers', []);

  controllers.controller('MachineListCtrl', function($scope, $location, angularFire, angularFireAuth) {
    $scope.layout = 'grid';
    $scope.machines = [];
    $scope.message = "Loading...";
    angularFireAuth.initialize(firebaseRootRef, {
      scope: $scope,
      name: "user"
    });
    angularFire(machineListRef, $scope, 'machines', {});
    $scope.$watch(function() {
      var m, machines, _;
      machines = (function() {
        var _ref, _results;
        _ref = $scope.machines;
        _results = [];
        for (_ in _ref) {
          m = _ref[_];
          _results.push(m);
        }
        return _results;
      })();
      if (!machines.length) {
        return;
      }
      $scope.message = null;
      if (!machines.some(function(m) {
        return $scope.machine_editable(m);
      })) {
        $scope.message = "Congratulation! You are signed in. " + "You can view other people's machines but not save changes. " + "Copy a machine to make your own machine that you can edit.";
      }
      if (!$scope.user) {
        return $scope.message = "You can view machines but not save changes. " + "Sign In to make your own machines. " + "The <em>Sign In</em> button will lead you through the steps to create an account.";
      }
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
              if (m.name.toLowerCase() === name.toLowerCase() && !m.deleted_at) {
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
        break;
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
      return machineListRef.child(key).child('deleted_at').set(Firebase.ServerValue.TIMESTAMP);
    };
    $scope.rename_machine = function(machine) {
      return machine.name = machine.name.replace(/^\s+/, '').replace(/\s+$/, '');
    };
    $scope.machine_editable = function(machine) {
      var user, _ref;
      user = $scope.user;
      if (machine.deleted_at) {
        return false;
      }
      return user && machine.writers && (_ref = user.id, __indexOf.call(machine.writers.map(function(user) {
        return user.id;
      }), _ref) >= 0);
    };
    $scope.machine_stats = function(machine) {
      return "" + ((machine.wiring.split(/\s+/).length - 1) / 2) + " wires";
    };
    $scope.machine_url = function(machine) {
      return "machine.html?name=" + (encodeURIComponent($scope.machine_key(machine)));
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
      return angularFireAuth.login(provider, {
        rememberMe: true
      });
    };
    return $scope.logout = function() {
      return angularFireAuth.logout();
    };
  });

  controllers.controller('MachineDetailCtrl', function($scope, $routeParams, angularFire) {
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
  });

  directives = angular.module('FFMachine.directives', []);

  directives.directive('wiringDiagram', function() {
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
          return draw_wiring_thumbnail(canvas, wires, scope.previous_wires);
        });
      }
    };
  });

  draw_wiring_thumbnail = function(canvas, wires_string, previous_wires_string) {
    var added_wires, background_image_url, canvas_width_breakpoint, ctx, deleted_wires, draw_cross, draw_module_rects, draw_plus, draw_with_shadow, dx, dy, k, line, lineWidth, line_color, line_colors, line_length, module_cols, module_height, module_padding, module_rows, module_width, mx, my, round, s0, s1, sqrt, v, viewport_height, viewport_width, wire, wires, wiring_diff, x0, x1, y0, y1, _i, _len, _ref, _ref1, _ref2, _ref3, _ref4, _ref5, _ref6, _ref7;
    ctx = canvas.getContext('2d');
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
    previous_wires_string || (previous_wires_string = wires_string);
    wires = (function() {
      var _i, _len, _ref, _results;
      _ref = wires_string.split(/\n/);
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
    _ref = [1800, 2000], viewport_width = _ref[0], viewport_height = _ref[1];
    canvas_width_breakpoint = 200;
    background_image_url = 'url(img/ffmachine.png)';
    _ref1 = [4, 9], module_rows = _ref1[0], module_cols = _ref1[1];
    _ref2 = [200, 450], module_width = _ref2[0], module_height = _ref2[1];
    module_padding = 10;
    round = Math.round, sqrt = Math.sqrt;
    line_length = function(dx, dy) {
      return sqrt(dx * dx + dy * dy);
    };
    line_colors = ['#804010', '#f00000', '#f0a000', '#f0f000', '#00f000', '#0000f0', '#d02090'];
    line_color = function(x0, y0, x1, y1) {
      var color_index, _ref3;
      color_index = round(line_length(x1 - x0, y1 - y0) / 100);
      return (_ref3 = line_colors[color_index]) != null ? _ref3 : line_colors[line_colors.length - 1];
    };
    draw_module_rects = function() {
      var i, inner_height, inner_width, j, x, y, _i, _j, _ref3;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, viewport_width, viewport_height);
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#301E17';
      inner_width = module_width - 2 * module_padding;
      inner_height = module_height - 2 * module_padding;
      for (i = _i = 0; 0 <= module_rows ? _i < module_rows : _i > module_rows; i = 0 <= module_rows ? ++_i : --_i) {
        for (j = _j = 0; 0 <= module_cols ? _j < module_cols : _j > module_cols; j = 0 <= module_cols ? ++_j : --_j) {
          _ref3 = [j * module_width, i * module_height], x = _ref3[0], y = _ref3[1];
          ctx.fillRect(x + module_padding, y + module_padding, inner_width, inner_height);
        }
      }
      return ctx.globalAlpha = 1;
    };
    ctx.save();
    ctx.scale(canvas.width / viewport_width, canvas.height / viewport_height);
    if (canvas.width >= canvas_width_breakpoint) {
      canvas.style.background = background_image_url;
      canvas.style.backgroundSize = 'cover';
      ctx.fillStyle = 'white';
      ctx.globalAlpha = 0.35;
      ctx.fillRect(0, 0, viewport_width, viewport_height);
      lineWidth = 12;
    } else {
      canvas.style.background = null;
      draw_module_rects();
      lineWidth = 1.75 * viewport_width / canvas.width;
    }
    draw_plus = function(x, y) {
      var d;
      d = 75;
      ctx.beginPath();
      ctx.moveTo(x - d, y);
      ctx.lineTo(x + d, y);
      ctx.moveTo(x, y - d);
      ctx.lineTo(x, y + d);
      return ctx.stroke();
    };
    draw_cross = function(x, y) {
      var d;
      d = 50;
      ctx.beginPath();
      ctx.moveTo(x - d, y - d);
      ctx.lineTo(x + d, y + d);
      ctx.moveTo(x + d, y - d);
      ctx.lineTo(x - d, y + d);
      return ctx.stroke();
    };
    draw_with_shadow = function(fn) {
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.lineWidth *= 1.5;
      ctx.strokeStyle = 'white';
      fn();
      ctx.restore();
      return fn();
    };
    _ref3 = wires.concat((function() {
      var _results;
      _results = [];
      for (k in deleted_wires) {
        v = deleted_wires[k];
        _results.push(v);
      }
      return _results;
    })());
    for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
      wire = _ref3[_i];
      s0 = wire[0], s1 = wire[1];
      _ref4 = pinoutToXy(s0), x0 = _ref4[0], y0 = _ref4[1];
      _ref5 = pinoutToXy(s1), x1 = _ref5[0], y1 = _ref5[1];
      ctx.strokeStyle = line_color(x0, y0, x1, y1);
      ctx.lineCap = 'round';
      ctx.lineWidth = lineWidth;
      if (wire in added_wires || wire in deleted_wires) {
        ctx.lineWidth *= 5;
      }
      ctx.globalAlpha = 1;
      if (wire in deleted_wires) {
        ctx.globalAlpha = 0.3;
      }
      mx = x0 + (x1 - x0) / 2;
      my = y0 + (y1 - y0) / 2;
      _ref6 = [(x1 - x0) / 5, 0], dx = _ref6[0], dy = _ref6[1];
      dx += 10 * (dx < 0 ? -1 : 1);
      if (y0 === y1) {
        _ref7 = [0, 10], dx = _ref7[0], dy = _ref7[1];
      }
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo(x0 + dx, y0 + dy, mx, my);
      ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo(x1 - dx, y1 - dy, mx, my);
      ctx.stroke();
      if (wire in added_wires) {
        ctx.lineCap = 'square';
        ctx.globalAlpha = 1;
        ctx.lineWidth = 2 * lineWidth;
        draw_with_shadow(function() {
          return draw_plus(x0, y0);
        });
        draw_with_shadow(function() {
          return draw_plus(x1, y1);
        });
      }
      if (wire in deleted_wires) {
        ctx.lineCap = 'square';
        ctx.lineWidth = 2 * lineWidth;
        draw_with_shadow(function() {
          return draw_cross(x0, y0);
        });
        draw_with_shadow(function() {
          return draw_cross(x1, y1);
        });
      }
    }
    return ctx.restore();
  };

  filters = angular.module('FFMachine.filters', []);

  filters.filter('encodeURIComponent', function() {
    return encodeURIComponent;
  });

  filters.filter('propertyNot', function() {
    return function(objects, propertyName) {
      var object, _i, _len, _results;
      _results = [];
      for (_i = 0, _len = objects.length; _i < _len; _i++) {
        object = objects[_i];
        if (!object[propertyName]) {
          _results.push(object);
        }
      }
      return _results;
    };
  });

  filters.filter('objectToList', function() {
    return function(object) {
      var k, v, _results;
      _results = [];
      for (k in object) {
        v = object[k];
        _results.push(v);
      }
      return _results;
    };
  });

}).call(this);
