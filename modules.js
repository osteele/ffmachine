(function() {
  var findHole, findHoleTolerance, holePos, holedefs, moduleHeight, moduleName, modulePinName, moduleTypes, moduleWidth, modules, pins, _ref;

  moduleTypes = [['clk1', 'ff', 'ff', 'ff', 'ff', 'ff', 'ff', 'ff', 'clk2'], ['ff', 'ff', 'ff', 'ff', 'ff', 'dg', 'ff', 'ff', 'ff'], ['ff', 'ff', 'ff', 'ff', 'ff', 'pa', 'ff', 'ff', 'ff'], ['ff', 'ff', 'ff', 'ff', 'ff', 'ff', 'ff', 'ff', 'ff']];

  holedefs = {
    ff: [[100, 166, 'p'], [66, 190, '0'], [134, 190, '1'], [66, 252, '0in'], [134, 252, '1in'], [100, 266, 'comp'], [66, 290, 'c0'], [66, 336, 'e0'], [40, 314, 'b0'], [134, 290, 'c1'], [134, 336, 'e1'], [160, 314, 'b1'], [66, 372, 'gnd1'], [100, 372, 'gnd2'], [134, 372, 'gnd3']],
    clk1: [[160, 98, '-'], [160, 144, '+'], [160, 190, 'gnd']],
    clk2: [[160, 98, '-'], [160, 144, '+'], [160, 190, 'gnd']],
    pa: [[160, 90, '-0'], [160, 136, '+0'], [66, 113, 'in0'], [160, 167, 'gnd0'], [160, 240, '-1'], [160, 286, '+1'], [66, 263, 'in1'], [160, 317, 'gnd1'], [66, 143, 'c0'], [66, 189, 'e0'], [40, 167, 'b0'], [66, 293, 'c1'], [66, 339, 'e1'], [40, 317, 'b1'], [40, 360, 'gnd2']],
    dg: [[61, 126, 'cl0'], [141, 126, 'cl1'], [61, 158, 'c0'], [61, 204, 'e0'], [141, 158, 'c1'], [141, 204, 'e1'], [60, 275, 'b00'], [49, 300, 'b01'], [60, 325, 'b02'], [49, 350, 'b03'], [60, 375, 'b04'], [49, 400, 'b05'], [141, 275, 'b10'], [152, 300, 'b11'], [141, 325, 'b12'], [152, 350, 'b13'], [141, 375, 'b14'], [152, 400, 'b15']]
  };

  moduleWidth = 200;

  moduleHeight = 500;

  findHoleTolerance = 12;

  this.xyToPinout = function(x, y) {
    var col, hole, moduleType, row;
    row = Math.floor(y / moduleHeight);
    col = Math.floor(x / moduleWidth);
    if (!((0 <= col && col < 9) && (0 <= row && row < 4))) {
      return void 0;
    }
    moduleType = moduleTypes[row][col];
    hole = findHole(holedefs[moduleType], x % moduleWidth, y % moduleHeight);
    if (!hole) {
      return void 0;
    }
    return modulePinName(row, col, hole[2]);
  };

  this.pinoutToXy = function(p) {
    var col, moduleType, pinName, pos, row, rowName, x, y, _ref;
    _ref = p.split('_'), rowName = _ref[0], col = _ref[1], pinName = _ref[2];
    row = rowName.charCodeAt(0) - 97;
    moduleType = moduleTypes[row][col];
    pos = holePos(holedefs[moduleType], pinName);
    if (!pos) {
      console.error("Can't find " + pinName + " in module of type " + moduleType);
    }
    pos || (pos = [0, 0]);
    x = pos[0], y = pos[1];
    return [col * moduleWidth + x, row * moduleHeight + y];
  };

  this.holePositions = function() {
    var col, holes, moduleType, pinName, row, rowModuleTypes, x, y, _i, _j, _k, _len, _len1, _len2, _ref, _ref1;
    holes = [];
    for (row = _i = 0, _len = moduleTypes.length; _i < _len; row = ++_i) {
      rowModuleTypes = moduleTypes[row];
      for (col = _j = 0, _len1 = rowModuleTypes.length; _j < _len1; col = ++_j) {
        moduleType = rowModuleTypes[col];
        _ref = holedefs[moduleType];
        for (_k = 0, _len2 = _ref.length; _k < _len2; _k++) {
          _ref1 = _ref[_k], x = _ref1[0], y = _ref1[1], pinName = _ref1[2];
          holes.push({
            x: col * moduleWidth + x,
            y: row * moduleHeight + y,
            name: modulePinName(row, col, pinName)
          });
        }
      }
    }
    return holes;
  };

  moduleName = function(row, col) {
    return [String.fromCharCode(97 + row), col].join('_');
  };

  modulePinName = function(row, col, pinName) {
    return [moduleName(row, col), pinName].join('_');
  };

  findHole = function(holes, x, y) {
    var hole, _i, _len;
    for (_i = 0, _len = holes.length; _i < _len; _i++) {
      hole = holes[_i];
      if (dist(hole, [x, y]) < findHoleTolerance) {
        return hole;
      }
    }
    return void 0;
  };

  holePos = function(holes, pinName) {
    var hole, _i, _len;
    for (_i = 0, _len = holes.length; _i < _len; _i++) {
      hole = holes[_i];
      if (hole[2] === pinName) {
        return hole;
      }
    }
  };

  modules = (function() {
    var col, dx, dy, moduleRow, moduleType, pinName, pins, row, rows, x, y, _ref;
    rows = (function() {
      var _i, _len, _results;
      _results = [];
      for (row = _i = 0, _len = moduleTypes.length; _i < _len; row = ++_i) {
        moduleRow = moduleTypes[row];
        _results.push((function() {
          var _j, _len1, _results1;
          _results1 = [];
          for (col = _j = 0, _len1 = moduleRow.length; _j < _len1; col = ++_j) {
            moduleType = moduleRow[col];
            x = col * moduleWidth;
            y = row * moduleHeight;
            pins = (function() {
              var _k, _len2, _ref, _ref1, _results2;
              _ref = holedefs[moduleType];
              _results2 = [];
              for (_k = 0, _len2 = _ref.length; _k < _len2; _k++) {
                _ref1 = _ref[_k], dx = _ref1[0], dy = _ref1[1], pinName = _ref1[2];
                _results2.push({
                  x: x + dx,
                  y: y + dy,
                  name: modulePinName(row, col, pinName)
                });
              }
              return _results2;
            })();
            _results1.push({
              name: moduleName(row, col),
              type: moduleType,
              x: x,
              y: y,
              pins: pins
            });
          }
          return _results1;
        })());
      }
      return _results;
    })();
    return (_ref = []).concat.apply(_ref, rows);
  })();

  pins = (_ref = []).concat.apply(_ref, (function() {
    var _i, _len, _results;
    _results = [];
    for (_i = 0, _len = modules.length; _i < _len; _i++) {
      pins = modules[_i].pins;
      _results.push(pins);
    }
    return _results;
  })());

}).call(this);
