(function() {
  var ModuleDimensions, ModuleLocationMap, TerminalLocations, createModules, moduleComponents;

  ModuleLocationMap = [['clk1', 'ff', 'ff', 'ff', 'ff', 'ff', 'ff', 'ff', 'clk2'], ['ff', 'ff', 'ff', 'ff', 'ff', 'dg', 'ff', 'ff', 'ff'], ['ff', 'ff', 'ff', 'ff', 'ff', 'pa', 'ff', 'ff', 'ff'], ['ff', 'ff', 'ff', 'ff', 'ff', 'ff', 'ff', 'ff', 'ff']];

  TerminalLocations = {
    ff: [[100, 166, 'p'], [66, 190, '0'], [134, 190, '1'], [66, 252, '0in'], [134, 252, '1in'], [100, 266, 'comp'], [66, 290, 'c0'], [66, 336, 'e0'], [40, 314, 'b0'], [134, 290, 'c1'], [134, 336, 'e1'], [160, 314, 'b1'], [66, 372, 'gnd1'], [100, 372, 'gnd2'], [134, 372, 'gnd3']],
    clk1: [[160, 98, '-'], [160, 144, '+'], [160, 190, 'gnd']],
    clk2: [[160, 98, '-'], [160, 144, '+'], [160, 190, 'gnd']],
    pa: [[160, 90, '-0'], [160, 136, '+0'], [66, 113, 'in0'], [160, 167, 'gnd0'], [160, 240, '-1'], [160, 286, '+1'], [66, 263, 'in1'], [160, 317, 'gnd1'], [66, 143, 'c0'], [66, 189, 'e0'], [40, 167, 'b0'], [66, 293, 'c1'], [66, 339, 'e1'], [40, 317, 'b1'], [40, 360, 'gnd2']],
    dg: [[61, 126, 'cl0'], [141, 126, 'cl1'], [61, 158, 'c0'], [61, 204, 'e0'], [60, 275, 'b00'], [49, 300, 'b01'], [60, 325, 'b02'], [49, 350, 'b03'], [60, 375, 'b04'], [49, 400, 'b05'], [141, 158, 'c1'], [141, 204, 'e1'], [141, 275, 'b10'], [152, 300, 'b11'], [141, 325, 'b12'], [152, 350, 'b13'], [141, 375, 'b14'], [152, 400, 'b15']]
  };

  ModuleDimensions = {
    width: 200,
    height: 500
  };

  moduleComponents = function(_arg) {
    var clock, component, gate, ground, inverter, moduleName, moduleType, pa;
    moduleType = _arg.type, moduleName = _arg.name;
    component = function(type, componentTerminalNames, componentIndex) {
      var componentTerminalName, globalTerminalName, terminals;
      if (componentIndex == null) {
        componentIndex = '';
      }
      terminals = (function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = componentTerminalNames.length; _i < _len; _i++) {
          componentTerminalName = componentTerminalNames[_i];
          globalTerminalName = [moduleName, componentTerminalName.replace(/(\D+)/, "$1" + componentIndex)].join('_');
          _results.push({
            componentTerminalName: componentTerminalName,
            globalTerminalName: globalTerminalName
          });
        }
        return _results;
      })();
      return {
        type: type,
        terminals: terminals
      };
    };
    clock = function() {
      return component('clock', ['-', '+', 'gnd']);
    };
    inverter = function(componentIndex) {
      return component('inverter', ['c', 'e', 'b'], componentIndex);
    };
    gate = function(componentIndex) {
      var bases, n;
      bases = (function() {
        var _i, _results;
        _results = [];
        for (n = _i = 0; _i <= 5; n = ++_i) {
          _results.push("b" + n);
        }
        return _results;
      })();
      return component('gate', ['c', 'e'].concat(bases), componentIndex);
    };
    ground = function(componentIndex) {
      return component('ground', ['gnd'], componentIndex);
    };
    pa = function(componentIndex) {
      return component('pa', ['-', '+', 'in', 'gnd'], componentIndex);
    };
    switch (moduleType) {
      case 'ff':
        return [component('ff', ['p', '0', '1', '0in', '1in', 'comp']), inverter(0), inverter(1), ground(1), ground(2), ground(3)];
      case 'clk1':
        return [clock()];
      case 'clk2':
        return [clock()];
      case 'dg':
        return [component('clamp', ['cl0', 'cl1']), gate(0), gate(1)];
      case 'pa':
        return [pa(0), pa(1), inverter(0), inverter(1), ground(2)];
      default:
        return console.error('unknown module type', moduleType);
    }
  };

  createModules = function() {
    var colIndex, dx, dy, moduleName, moduleRow, moduleTerminalName, moduleTerminalNames, moduleType, rowIndex, rows, terminals, x, y, _ref;
    rows = (function() {
      var _i, _len, _results;
      _results = [];
      for (rowIndex = _i = 0, _len = ModuleLocationMap.length; _i < _len; rowIndex = ++_i) {
        moduleRow = ModuleLocationMap[rowIndex];
        _results.push((function() {
          var _j, _len1, _results1;
          _results1 = [];
          for (colIndex = _j = 0, _len1 = moduleRow.length; _j < _len1; colIndex = ++_j) {
            moduleType = moduleRow[colIndex];
            moduleName = [String.fromCharCode(97 + rowIndex), colIndex].join('_');
            x = colIndex * ModuleDimensions.width / 2;
            y = rowIndex * ModuleDimensions.height / 2;
            moduleTerminalNames = TerminalLocations[moduleType];
            terminals = (function() {
              var _k, _len2, _ref, _ref1, _results2;
              _ref = TerminalLocations[moduleType];
              _results2 = [];
              for (_k = 0, _len2 = _ref.length; _k < _len2; _k++) {
                _ref1 = _ref[_k], dx = _ref1[0], dy = _ref1[1], moduleTerminalName = _ref1[2];
                _results2.push({
                  globalTerminalName: [moduleName, moduleTerminalName].join('_'),
                  moduleTerminalName: moduleTerminalName,
                  coordinates: [x + dx / 2, y + dy / 2],
                  x: x + dx / 2,
                  y: y + dy / 2
                });
              }
              return _results2;
            })();
            _results1.push({
              name: moduleName,
              type: moduleType,
              terminals: terminals,
              components: moduleComponents({
                type: moduleType,
                name: moduleName
              })
            });
          }
          return _results1;
        })());
      }
      return _results;
    })();
    return (_ref = []).concat.apply(_ref, rows);
  };

  this.findNearbyTerminal = function(x, y, tolerance) {
    var terminal, _i, _len, _ref;
    if (tolerance == null) {
      tolerance = 12;
    }
    _ref = this.machineState.terminals;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      terminal = _ref[_i];
      if (dist([terminal.x, terminal.y], [x, y]) < tolerance) {
        return terminal;
      }
    }
    return null;
  };

  this.findTerminalByName = function(globalTerminalName) {
    var terminal, _i, _len, _ref;
    _ref = this.machineState.terminals;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      terminal = _ref[_i];
      if (terminal.globalTerminalName === globalTerminalName) {
        return terminal;
      }
    }
    return console.error("Can't find terminal named " + globalTerminalName);
  };

  this.xyToTerminalName = function(x, y, tolerance) {
    var globalTerminalName, px, py, _i, _len, _ref, _ref1;
    if (tolerance == null) {
      tolerance = 12;
    }
    _ref = this.machineState.terminals;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      _ref1 = _ref[_i], px = _ref1.x, py = _ref1.y, globalTerminalName = _ref1.globalTerminalName;
      if (dist([px, py], [x, y]) < tolerance) {
        return globalTerminalName;
      }
    }
    return null;
  };

  this.getTerminalCoordinates = function(globalTerminalName) {
    return findTerminalByName(globalTerminalName).coordinates;
  };

  this.machineState = (function() {
    var modules, terminals, _ref;
    modules = createModules();
    return {
      modules: modules,
      terminals: (_ref = []).concat.apply(_ref, (function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = modules.length; _i < _len; _i++) {
          terminals = modules[_i].terminals;
          _results.push(terminals);
        }
        return _results;
      })())
    };
  })();

  this.TerminalPositions = this.machineState.terminals;

}).call(this);
