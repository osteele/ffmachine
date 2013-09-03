(function() {
  var findHole, holePos, holedefs, modules;

  modules = [['clk1', 'ff', 'ff', 'ff', 'ff', 'ff', 'ff', 'ff', 'clk2'], ['ff', 'ff', 'ff', 'ff', 'ff', 'dg', 'ff', 'ff', 'ff'], ['ff', 'ff', 'ff', 'ff', 'ff', 'pa', 'ff', 'ff', 'ff'], ['ff', 'ff', 'ff', 'ff', 'ff', 'ff', 'ff', 'ff', 'ff']];

  holedefs = {
    ff: [[100, 166, 'p'], [66, 190, '0'], [134, 190, '1'], [66, 252, '0in'], [134, 252, '1in'], [100, 266, 'comp'], [66, 290, 'e0'], [66, 336, 'c0'], [40, 314, 'b0'], [134, 290, 'e1'], [134, 336, 'c1'], [160, 314, 'b1'], [66, 372, 'gnd1'], [100, 372, 'gnd2'], [134, 372, 'gnd3']],
    clk1: [[160, 98, '-'], [160, 144, '+'], [160, 190, 'gnd']],
    clk2: [[160, 98, '-'], [160, 144, '+'], [160, 190, 'gnd']],
    pa: [[160, 90, '-0'], [160, 136, '+0'], [66, 113, 'in0'], [160, 167, 'gnd0'], [160, 240, '-1'], [160, 286, '+1'], [66, 263, 'in1'], [160, 317, 'gnd1'], [66, 143, 'c0'], [66, 189, 'e0'], [40, 167, 'b0'], [66, 293, 'c1'], [66, 339, 'e1'], [40, 317, 'b1'], [40, 360, 'gnd2']]
  };

  this.xyToPinout = function(x, y) {
    var hole, ix, iy, mx, my, type;
    mx = Math.floor(x / 200);
    my = Math.floor(y / 500);
    if (mx < 0 || my < 0 || mx > 9 || my > 4) {
      return void 0;
    }
    ix = x % 200;
    iy = y % 500;
    type = modules[my][mx];
    hole = findHole(holedefs[type], ix, iy);
    if (!hole) {
      return void 0;
    }
    return ['a', 'b', 'c', 'd'][my] + '_' + mx + '_' + hole[2];
  };

  this.pinoutToXy = function(p) {
    var holepos, mx, my, r, type;
    r = p.split('_');
    mx = r[1];
    my = {
      a: 0,
      b: 1,
      c: 2,
      d: 3
    }[r[0]];
    type = modules[my][mx];
    holepos = holePos(holedefs[type], r[2]);
    return [mx * 200 + holepos[0], my * 500 + holepos[1]];
  };

  this.holePositions = function() {
    var holes, i, j, moduleName, moduleType, pinName, rows, x, y, _i, _j, _k, _len, _len1, _len2, _ref, _ref1;
    holes = [];
    for (i = _i = 0, _len = modules.length; _i < _len; i = ++_i) {
      rows = modules[i];
      for (j = _j = 0, _len1 = rows.length; _j < _len1; j = ++_j) {
        moduleType = rows[j];
        moduleName = 'abcd'.charAt(i) + '_' + j;
        _ref = holedefs[moduleType] || [];
        for (_k = 0, _len2 = _ref.length; _k < _len2; _k++) {
          _ref1 = _ref[_k], x = _ref1[0], y = _ref1[1], pinName = _ref1[2];
          holes.push({
            x: j * 200 + x,
            y: i * 500 + y,
            name: moduleName + '_' + pinName
          });
        }
      }
    }
    return holes;
  };

  findHole = function(holes, x, y) {
    var hole, _i, _len;
    for (_i = 0, _len = holes.length; _i < _len; _i++) {
      hole = holes[_i];
      if (dist(hole, [x, y]) < 12) {
        return hole;
      }
    }
    return void 0;
  };

  holePos = function(holes, pin) {
    var hole, _i, _len;
    for (_i = 0, _len = holes.length; _i < _len; _i++) {
      hole = holes[_i];
      if (hole[2] === pin) {
        return hole;
      }
    }
  };

}).call(this);
