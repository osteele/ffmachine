(function() {
  var ModuleHeight, ModuleLocationMap, ModulePinLocations, ModuleWidth, createModules, getModuleName, moduleComponents, modulePinNameToMachinePinName;

  ModuleLocationMap = [['clk1', 'ff', 'ff', 'ff', 'ff', 'ff', 'ff', 'ff', 'clk2'], ['ff', 'ff', 'ff', 'ff', 'ff', 'dg', 'ff', 'ff', 'ff'], ['ff', 'ff', 'ff', 'ff', 'ff', 'pa', 'ff', 'ff', 'ff'], ['ff', 'ff', 'ff', 'ff', 'ff', 'ff', 'ff', 'ff', 'ff']];

  ModulePinLocations = {
    ff: [[100, 166, 'p'], [66, 190, '0'], [134, 190, '1'], [66, 252, '0in'], [134, 252, '1in'], [100, 266, 'comp'], [66, 290, 'c0'], [66, 336, 'e0'], [40, 314, 'b0'], [134, 290, 'c1'], [134, 336, 'e1'], [160, 314, 'b1'], [66, 372, 'gnd1'], [100, 372, 'gnd2'], [134, 372, 'gnd3']],
    clk1: [[160, 98, '-'], [160, 144, '+'], [160, 190, 'gnd']],
    clk2: [[160, 98, '-'], [160, 144, '+'], [160, 190, 'gnd']],
    pa: [[160, 90, '-0'], [160, 136, '+0'], [66, 113, 'in0'], [160, 167, 'gnd0'], [160, 240, '-1'], [160, 286, '+1'], [66, 263, 'in1'], [160, 317, 'gnd1'], [66, 143, 'c0'], [66, 189, 'e0'], [40, 167, 'b0'], [66, 293, 'c1'], [66, 339, 'e1'], [40, 317, 'b1'], [40, 360, 'gnd2']],
    dg: [[61, 126, 'cl0'], [141, 126, 'cl1'], [61, 158, 'c0'], [61, 204, 'e0'], [60, 275, 'b00'], [49, 300, 'b01'], [60, 325, 'b02'], [49, 350, 'b03'], [60, 375, 'b04'], [49, 400, 'b05'], [141, 158, 'c1'], [141, 204, 'e1'], [141, 275, 'b10'], [152, 300, 'b11'], [141, 325, 'b12'], [152, 350, 'b13'], [141, 375, 'b14'], [152, 400, 'b15']]
  };

  ModuleWidth = 200;

  ModuleHeight = 500;

  getModuleName = function(row, col) {
    return [String.fromCharCode(97 + row), col].join('_');
  };

  modulePinNameToMachinePinName = function(row, col, pinName) {
    return [getModuleName(row, col), pinName].join('_');
  };

  moduleComponents = function(_arg) {
    var component, gate, ground, moduleName, moduleType;
    moduleType = _arg.type, moduleName = _arg.name;
    component = function(type, componentPinNames, componentIndex) {
      var componentPinName, machinePinName, pins;
      pins = (function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = componentPinNames.length; _i < _len; _i++) {
          componentPinName = componentPinNames[_i];
          machinePinName = [moduleName, componentPinName.replace(/(\w+)/, '$1' + componentIndex)].join('_');
          _results.push({
            componentPinName: componentPinName,
            machinePinName: machinePinName
          });
        }
        return _results;
      })();
      return {
        type: type,
        pins: pins
      };
    };
    gate = function(componentIndex) {
      return component('gate', ['c', 'e', 'b'], componentIndex);
    };
    ground = function(componentIndex) {
      return component('ground', ['gnd'], componentIndex);
    };
    switch (moduleType) {
      case 'ff':
        return [gate(0), gate(1), ground(1), ground(2), ground(3)];
      case 'clk1':
        return [];
      case 'clk2':
        return [];
      case 'dg':
        return [];
      case 'pa':
        return [];
      default:
        return console.error('unknown module type', moduleType);
    }
  };

  createModules = function() {
    var col, dx, dy, moduleName, modulePinName, modulePinNames, moduleRow, moduleType, pins, row, rows, x, y, _ref;
    rows = (function() {
      var _i, _len, _results;
      _results = [];
      for (row = _i = 0, _len = ModuleLocationMap.length; _i < _len; row = ++_i) {
        moduleRow = ModuleLocationMap[row];
        _results.push((function() {
          var _j, _len1, _results1;
          _results1 = [];
          for (col = _j = 0, _len1 = moduleRow.length; _j < _len1; col = ++_j) {
            moduleType = moduleRow[col];
            moduleName = getModuleName(row, col);
            x = col * ModuleWidth;
            y = row * ModuleHeight;
            modulePinNames = ModulePinLocations[moduleType];
            pins = (function() {
              var _k, _len2, _ref, _ref1, _results2;
              _ref = ModulePinLocations[moduleType];
              _results2 = [];
              for (_k = 0, _len2 = _ref.length; _k < _len2; _k++) {
                _ref1 = _ref[_k], dx = _ref1[0], dy = _ref1[1], modulePinName = _ref1[2];
                _results2.push({
                  x: x + dx,
                  y: y + dy,
                  name: modulePinNameToMachinePinName(row, col, modulePinName)
                });
              }
              return _results2;
            })();
            _results1.push({
              name: moduleName,
              type: moduleType,
              pins: pins,
              components: moduleComponents({
                type: moduleType,
                name: moduleName
              }),
              x: x,
              y: y
            });
          }
          return _results1;
        })());
      }
      return _results;
    })();
    return (_ref = []).concat.apply(_ref, rows);
  };

  this.xyToPinout = function(x, y, tolerance) {
    var name, px, py, _i, _len, _ref, _ref1;
    if (tolerance == null) {
      tolerance = 12;
    }
    _ref = this.machineState.pins;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      _ref1 = _ref[_i], px = _ref1.x, py = _ref1.y, name = _ref1.name;
      if (dist([px, py], [x, y]) < tolerance) {
        return name;
      }
    }
    return null;
  };

  this.pinoutToXy = function(machinePinName) {
    var name, x, y, _i, _len, _ref, _ref1;
    _ref = this.machineState.pins;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      _ref1 = _ref[_i], x = _ref1.x, y = _ref1.y, name = _ref1.name;
      if (name === machinePinName) {
        return [x, y];
      }
    }
    if (!pos) {
      return console.error("Can't find " + pinName + " in module of type " + moduleType);
    }
  };

  this.holePositions = function() {
    return this.machineState.pins;
  };

  this.machineState = (function() {
    var modules, pins, _ref;
    modules = createModules();
    return {
      modules: modules,
      pins: (_ref = []).concat.apply(_ref, (function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = modules.length; _i < _len; _i++) {
          pins = modules[_i].pins;
          _results.push(pins);
        }
        return _results;
      })())
    };
  })();

}).call(this);
