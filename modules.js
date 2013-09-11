(function() {
  var ModuleDimensions, ModuleLocationMap, TerminalLocations, createModules, moduleComponents;

  ModuleLocationMap = [['clk1', 'ff', 'ff', 'ff', 'ff', 'ff', 'ff', 'ff', 'clk2'], ['ff', 'ff', 'ff', 'ff', 'ff', 'dg', 'ff', 'ff', 'ff'], ['ff', 'ff', 'ff', 'ff', 'ff', 'pa', 'ff', 'ff', 'ff'], ['ff', 'ff', 'ff', 'ff', 'ff', 'ff', 'ff', 'ff', 'ff']];

  TerminalLocations = {
    ff: [[100.5, 166, 'p'], [66.5, 190.5, '0'], [134.5, 190.5, '1'], [66, 252, '0in'], [134, 252, '1in'], [100, 266, 'comp'], [66, 290, 'c0'], [66, 336, 'e0'], [40, 314, 'b0'], [134, 290, 'c1'], [134, 336, 'e1'], [160, 314, 'b1'], [66.5, 372.5, 'gnd1'], [100.5, 372.5, 'gnd2'], [134.5, 372.5, 'gnd3']],
    clk1: [[160, 98, '-'], [160, 144, '+'], [160, 190, 'gnd']],
    clk2: [[160, 98, '-'], [160, 144, '+'], [160, 190, 'gnd']],
    pa: [[160, 90, '-0'], [160, 136, '+0'], [66, 113, 'in0'], [160, 167, 'gnd0'], [160, 240, '-1'], [160, 286, '+1'], [66, 263, 'in1'], [160, 317, 'gnd1'], [66, 143, 'c0'], [66, 189, 'e0'], [40, 167, 'b0'], [66, 293, 'c1'], [66, 339, 'e1'], [40, 317, 'b1'], [40, 360, 'gnd2']],
    dg: [[61, 126, 'cl0'], [141, 126, 'cl1'], [61, 158, 'c0'], [61, 204, 'e0'], [60, 275, 'b00'], [49, 300, 'b01'], [60, 325, 'b02'], [49, 350, 'b03'], [60, 375, 'b04'], [49, 400, 'b05'], [141, 158, 'c1'], [141, 204, 'e1'], [141, 275, 'b10'], [152, 300, 'b11'], [141, 325, 'b12'], [152, 350, 'b13'], [141, 375, 'b14'], [152, 400, 'b15']]
  };

  ModuleDimensions = {
    width: 100,
    height: 250
  };

  moduleComponents = function(_arg) {
    var clock, component, gate, ground, inverter, moduleIdentifier, moduleName, moduleType, pa;
    moduleType = _arg.type, moduleName = _arg.name, moduleIdentifier = _arg.identifier;
    component = function(type, componentTerminalIdentifiers, componentIndex) {
      var componentTerminalIdentifier, identifier, name, terminalIdentifiers, typeName;
      if (componentIndex == null) {
        componentIndex = '';
      }
      terminalIdentifiers = (function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = componentTerminalIdentifiers.length; _i < _len; _i++) {
          componentTerminalIdentifier = componentTerminalIdentifiers[_i];
          identifier = [moduleIdentifier, componentTerminalIdentifier.replace(/(\D+)/, "$1" + componentIndex)].join('_');
          _results.push({
            componentTerminalIdentifier: componentTerminalIdentifier,
            identifier: identifier
          });
        }
        return _results;
      })();
      typeName = type;
      if (type === 'ff') {
        typeName = 'flip-flip';
      }
      if (type === 'pa') {
        typeName = 'pulse-amplifier';
      }
      name = "" + moduleName + ":" + typeName;
      if (typeof componentIndex === 'number') {
        name += "(" + componentIndex + ")";
      }
      return {
        name: name,
        type: type,
        terminalIdentifiers: terminalIdentifiers
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
        return [component('clamp', ['cl'], 0), component('clamp', ['cl'], 1), gate(0), gate(1)];
      case 'pa':
        return [pa(0), pa(1), inverter(0), inverter(1), ground(2)];
      default:
        throw Error("unknown module type " + moduleType);
    }
  };

  createModules = function() {
    var colIndex, dx, dy, moduleIdentifier, moduleName, moduleRow, moduleTerminalName, moduleTerminalNames, moduleType, rowIndex, rows, terminals, x, y, _ref;
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
            moduleName = [String.fromCharCode(97 + rowIndex), colIndex + 1].join('');
            moduleIdentifier = [String.fromCharCode(97 + rowIndex), colIndex].join('_');
            x = colIndex * ModuleDimensions.width;
            y = rowIndex * ModuleDimensions.height;
            moduleTerminalNames = TerminalLocations[moduleType];
            terminals = (function() {
              var _k, _len2, _ref, _ref1, _results2;
              _ref = TerminalLocations[moduleType];
              _results2 = [];
              for (_k = 0, _len2 = _ref.length; _k < _len2; _k++) {
                _ref1 = _ref[_k], dx = _ref1[0], dy = _ref1[1], moduleTerminalName = _ref1[2];
                _results2.push({
                  name: [moduleName, moduleTerminalName].join(':'),
                  identifier: [moduleIdentifier, moduleTerminalName].join('_'),
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
              identifier: moduleIdentifier,
              type: moduleType,
              terminals: terminals,
              components: moduleComponents({
                type: moduleType,
                name: moduleName,
                identifier: moduleIdentifier
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
    _ref = MachineHardware.terminals;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      terminal = _ref[_i];
      if (lineLength(terminal.coordinates, [x, y]) < tolerance) {
        return terminal;
      }
    }
    return null;
  };

  this.getTerminalByIdentifier = function(identifier) {
    var _ref;
    return (function() {
      if ((_ref = MachineHardware.terminals[identifier]) != null) {
        return _ref;
      } else {
        throw Exception("Can't find terminal named " + identifier);
      }
    })();
  };

  this.xyToTerminalName = function(x, y, tolerance) {
    var identifier, px, py, _i, _len, _ref, _ref1;
    if (tolerance == null) {
      tolerance = 12;
    }
    _ref = MachineHardware.terminals;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      _ref1 = _ref[_i], px = _ref1.x, py = _ref1.y, identifier = _ref1.identifier;
      if (lineLength([px, py], [x, y]) < tolerance) {
        return identifier;
      }
    }
    return null;
  };

  this.getTerminalCoordinates = function(identifier) {
    return getTerminalByIdentifier(identifier).coordinates;
  };

  this.MachineHardware = (function() {
    var modules, terminal, terminals, _i, _len, _ref;
    modules = createModules();
    terminals = (_ref = []).concat.apply(_ref, (function() {
      var _i, _len, _results;
      _results = [];
      for (_i = 0, _len = modules.length; _i < _len; _i++) {
        terminals = modules[_i].terminals;
        _results.push(terminals);
      }
      return _results;
    })());
    for (_i = 0, _len = terminals.length; _i < _len; _i++) {
      terminal = terminals[_i];
      terminals[terminal.identifier] = terminal;
    }
    return {
      modules: modules,
      terminals: terminals
    };
  })();

}).call(this);
