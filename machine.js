(function() {
  var addWire, arctan2, closestEndIndex, cmerge, cos, createLayer, deleteWire, dragKnob, dragWireEnd, drawKnob, drawKnobs, endpointsToColor, endpointsToPath, findNearest, getLayer, hexd, knobAngle, knoboffset, knobs, localEvent, localx, localy, mod360, mouseDownAddWire, pickColor, releaseKnob, sin, svgSelection, updateTraces, updateWires, wireColor, wireEndpoints, wireLength, wirePath, wireView, wires,
    __slice = [].slice;

  knobs = [[100, 252, 288, '#f0f0f0'], [100, 382, 0, '#f0f0f0'], [1700, 252, 292, '#202020'], [1700, 382, 0, '#202020']];

  svgSelection = null;

  wires = [];

  knoboffset = null;

  this.setupCanvas = function() {
    var wirebuffer;
    wirebuffer = document.getElementById('wirebuffer');
    wirebuffer.width = 1800;
    wirebuffer.height = 2000;
    svgSelection = d3.select(wirebuffer);
    createLayer('pin-target-layer', {
      editMode: true
    }).selectAll('.hole').data(holePositions()).enter().append('circle').classed('hole', true).attr('id', function(pos) {
      return pos.name;
    }).attr('cx', function(pos) {
      return pos.x / 2;
    }).attr('cy', function(pos) {
      return pos.y / 2;
    }).attr('r', 3).on('mousedown', mouseDownAddWire).append('title').text(function(pos) {
      return "Drag " + pos.name + " to another pin to create a wire.";
    });
    createLayer('wire-layer');
    createLayer('trace-layer', {
      simulationMode: true
    });
    createLayer('deletion-target-layer', {
      editMode: true
    });
    createLayer('wire-start-target-layer', {
      editMode: true
    });
    createLayer('wire-end-target-layer', {
      editMode: true
    });
    return updateWires();
  };

  createLayer = function(layerName, _arg) {
    var editMode, simulationMode, _ref;
    _ref = _arg != null ? _arg : {}, editMode = _ref.editMode, simulationMode = _ref.simulationMode;
    return svgSelection.append('g').classed(layerName, true).classed('edit-mode-layer', editMode).classed('simulation-mode-layer', simulationMode);
  };

  getLayer = function(layerName) {
    return svgSelection.select('.' + layerName);
  };

  this.setModel = function(wires_) {
    wires = wires_;
    updateWires();
    return document.getElementById('loading').style.display = 'none';
  };

  addWire = function(wire) {
    wires.push(wire);
    updateWires();
    return wires_changed(wires);
  };

  deleteWire = function(wire) {
    var w;
    wires = (function() {
      var _i, _len, _results;
      _results = [];
      for (_i = 0, _len = wires.length; _i < _len; _i++) {
        w = wires[_i];
        if (w !== wire) {
          _results.push(w);
        }
      }
      return _results;
    })();
    updateWires();
    return wires_changed(wires);
  };

  this.stepSimulator = function() {
    this.Simulator.step(this.machineState.modules, wires);
    return updateTraces();
  };

  mouseDownAddWire = function() {
    var lastEndPin, startpin, view;
    startpin = xyToPinout.apply(null, localEvent(d3.event));
    if (!startpin) {
      return;
    }
    lastEndPin = null;
    view = svgSelection.append('path').classed('wire', true).classed('dragging', true).attr('stroke', 'red');
    window.onmousemove = function(e) {
      var endpin, endpoints;
      endpoints = [pinoutToXy(startpin), localEvent(e)];
      endpin = xyToPinout.apply(null, localEvent(e));
      if (endpin === startpin) {
        endpin = null;
      }
      if (lastEndPin !== endpin) {
        lastEndPin = endpin;
        svgSelection.select('.active.end').classed('active', false).classed('end', false);
        if (endpin) {
          d3.select(wirebuffer.getElementById(endpin)).classed('active', true).classed('end', true);
        }
      }
      return view.attr('d', endpointsToPath.apply(null, endpoints)).attr('stroke', endpointsToColor.apply(null, endpoints));
    };
    return window.onmouseup = function(e) {
      var endpin;
      window.onmousemove = null;
      window.onmouseup = null;
      view.remove();
      svgSelection.select('.active').classed('active', false).classed('end', false);
      endpin = xyToPinout.apply(null, localEvent(e));
      if (endpin && endpin !== startpin) {
        return addWire([startpin, endpin]);
      }
    };
  };

  closestEndIndex = function(wire) {
    var d1, d2, p1, p2, x, y, _ref;
    _ref = localEvent(d3.event), x = _ref[0], y = _ref[1];
    p1 = wire[0], p2 = wire[1];
    d1 = dist([x, y], pinoutToXy(p1));
    d2 = dist([x, y], pinoutToXy(p2));
    if (d1 < d2) {
      return 0;
    } else {
      return 1;
    }
  };

  wireView = function(wire) {
    return svgSelection.selectAll('.wire').filter(function(d) {
      return d === wire;
    });
  };

  dragWireEnd = function(wire) {
    var lastEndPin, p1, p2, pinIndex, view;
    view = wireView(wire);
    view.transition().delay(0);
    p1 = wire[0], p2 = wire[1];
    pinIndex = closestEndIndex(wire);
    lastEndPin = null;
    window.onmousemove = function(e) {
      var endPin, endpoints;
      endpoints = [pinoutToXy(p1), pinoutToXy(p2)];
      endpoints[pinIndex] = localEvent(e);
      endPin = xyToPinout.apply(null, localEvent(e));
      if (lastEndPin !== endPin) {
        lastEndPin = endPin;
        svgSelection.select('.active').classed('active', false);
        if (endPin) {
          d3.select(wirebuffer.getElementById(endPin)).classed('active', true);
        }
      }
      view.attr('stroke', 'blue');
      return view.attr('d', endpointsToPath.apply(null, endpoints)).attr('stroke', endpointsToColor.apply(null, endpoints));
    };
    return window.onmouseup = function(e) {
      var endPin;
      view.classed('repinning', false);
      svgSelection.select('.active').classed('active', false);
      window.onmousemove = null;
      window.onmouseup = null;
      endPin = xyToPinout.apply(null, localEvent(e));
      if (endPin && wire[pinIndex] !== endPin) {
        wire[pinIndex] = endPin;
        updateWires();
        return wires_changed(wires);
      } else {
        return updateWires();
      }
    };
  };

  dragKnob = function(e) {
    var a, knob;
    knob = knobs[starty];
    a = knobAngle.apply(null, [knob].concat(__slice.call(localEvent(e))));
    if (!moved) {
      knoboffset = mod360(knob[2] - a);
    }
    knob[2] = mod360(a + knoboffset);
    updateWires();
    return wires_changed(wires);
  };

  releaseKnob = function() {
    var knob;
    knob = knobs[starty];
    if (starty === 0) {
      knob[2] = findNearest(knob[2], [-72, -36, 0, 36, 72]);
    }
    if (starty === 2) {
      knob[2] = findNearest(knob[2], [-68, -23, 22, 67]);
    }
    updateWires();
    return wires_changed(wires);
  };

  updateWires = function() {
    var updateEndPinTargets, wireTargets, wireViews;
    wireViews = getLayer('wire-layer').selectAll('.wire').data(wires);
    wireViews.enter().append('path').classed('wire', true);
    wireViews.exit().remove();
    wireViews.attr('d', wirePath).attr('stroke', wireColor);
    wireTargets = getLayer('deletion-target-layer').selectAll('.wire-mouse-target').data(wires);
    wireTargets.enter().append('path').classed('wire-mouse-target', true).on('mousedown', deleteWire).append('title').text('Click to delete this wire.');
    wireTargets.exit().remove();
    wireTargets.attr('d', wirePath);
    updateEndPinTargets = function(layerName, endIndex) {
      var startPinTargets, w;
      startPinTargets = getLayer(layerName).selectAll('.wire-end-target').data((function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = wires.length; _i < _len; _i++) {
          w = wires[_i];
          if (wireLength(w) > 45) {
            _results.push(w);
          }
        }
        return _results;
      })());
      startPinTargets.enter().append('circle').classed('wire-end-target', true).attr('r', 10).on('mousedown', dragWireEnd).append('title').text('Click to drag the wire end to another pin.');
      startPinTargets.exit().remove();
      return startPinTargets.attr('cx', function(wire) {
        return pinoutToXy(wire[endIndex])[0] / 2;
      }).attr('cy', function(wire) {
        return pinoutToXy(wire[endIndex])[1] / 2;
      });
    };
    updateEndPinTargets('wire-start-target-layer', 0);
    updateEndPinTargets('wire-end-target-layer', 1);
    return updateTraces();
  };

  wireEndpoints = function(_arg) {
    var p1, p2;
    p1 = _arg[0], p2 = _arg[1];
    return [pinoutToXy(p1), pinoutToXy(p2)];
  };

  wireLength = function(wire) {
    return dist.apply(null, wireEndpoints(wire));
  };

  wirePath = function(wire) {
    return endpointsToPath.apply(null, wireEndpoints(wire));
  };

  endpointsToPath = function(_arg, _arg1) {
    var dx, dy, mx, my, x1, x2, y1, y2, _ref;
    x1 = _arg[0], y1 = _arg[1];
    x2 = _arg1[0], y2 = _arg1[1];
    x1 /= 2;
    y1 /= 2;
    x2 /= 2;
    y2 /= 2;
    mx = (x1 + x2) / 2;
    my = (y1 + y2) / 2;
    dx = (x2 - x1) / 5;
    dy = 0;
    dx += 5 * (dx < 0 ? -1 : 1);
    if (Math.abs(y1 - y2) < 10) {
      _ref = [0, 5], dx = _ref[0], dy = _ref[1];
    }
    return ['M', x1, y1, 'Q', x1 + dx, y1 + dy, mx, my, 'T', x2, y2].join(' ');
  };

  wireColor = function(_arg, n) {
    var p1, p2;
    p1 = _arg[0], p2 = _arg[1];
    return endpointsToColor(pinoutToXy(p1), pinoutToXy(p2), n);
  };

  endpointsToColor = function(_arg, _arg1, n) {
    var x1, x2, y1, y2;
    x1 = _arg[0], y1 = _arg[1];
    x2 = _arg1[0], y2 = _arg1[1];
    n || (n = wires.length);
    return cmerge(pickColor(x1, y1, x2, y2), n);
  };

  drawKnobs = function() {
    var k, _i, _len, _results;
    _results = [];
    for (_i = 0, _len = knobs.length; _i < _len; _i++) {
      k = knobs[_i];
      _results.push(drawKnob.apply(null, k));
    }
    return _results;
  };

  drawKnob = function(x, y, a, c) {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(x + 22 * sin(a), y - 22 * cos(a), 4, 0, Math.PI * 2, true);
    ctx.closePath();
    return ctx.fill();
  };

  knobAngle = function(knob, x, y) {
    return arctan2(x - knob[0], knob[1] - y);
  };

  updateTraces = (function() {
    var cyclePinValue, isVoltage, symbols, updateWireEndTraces, values, wireVoltageName;
    symbols = ['negative', 'ground', 'float'];
    values = [-3, 0, void 0];
    wireVoltageName = function(wire) {
      var value;
      value = wire.value;
      if (typeof value !== 'number') {
        value = void 0;
      }
      return symbols[values.indexOf(value)];
    };
    isVoltage = function(symbolicValue) {
      return function(wire) {
        return wireVoltageName(wire) === symbolicValue;
      };
    };
    cyclePinValue = function(wire) {
      wire.value = values[(symbols.indexOf(wireVoltageName(wire)) + 1) % symbols.length];
      return updateTraces();
    };
    updateWireEndTraces = function(className, endIndex) {
      var enter, nodes;
      nodes = getLayer('trace-layer').selectAll('.' + className).data(wires);
      nodes.exit().remove();
      enter = nodes.enter().append('g').classed(className, true).attr('transform', function(wire) {
        var pt;
        pt = pinoutToXy(wire[endIndex]);
        return "translate(" + (pt[0] / 2) + ", " + (pt[1] / 2) + ")";
      });
      enter.append('circle').attr('r', 10).on('click', cyclePinValue);
      return nodes.classed('voltage-negative', isVoltage('negative')).classed('voltage-ground', isVoltage('ground')).classed('voltage-float', isVoltage('float'));
    };
    return function() {
      updateWireEndTraces('start-trace', 0);
      return updateWireEndTraces('end-trace', 1);
    };
  })();

  cmerge = function(c, n) {
    var high, low, mid;
    high = hexd((n >> 8) & 15);
    mid = hexd((n >> 4) & 15);
    low = hexd(n & 15);
    return '#' + c[1] + high + c[3] + mid + c[5] + low;
  };

  pickColor = function(x1, y1, x2, y2) {
    var colors, dx, dy, i, len, _ref;
    dx = x2 - x1;
    dy = y2 - y1;
    len = Math.sqrt(dx * dx + dy * dy);
    i = Math.round(len / 100);
    colors = ['#804010', '#f00000', '#f0a000', '#f0f000', '#00f000', '#0000f0'];
    return (_ref = colors[i]) != null ? _ref : '#d02090';
  };

  findNearest = function(n, ls) {
    var d, diff, l, res, _i, _len;
    diff = Infinity;
    res = null;
    for (_i = 0, _len = ls.length; _i < _len; _i++) {
      l = ls[_i];
      d = Math.abs(n - l);
      if (d > diff) {
        continue;
      }
      diff = d;
      res = l;
    }
    return res;
  };

  mod360 = function(n) {
    n %= 360;
    if (n < 0) {
      n += 360;
    }
    if (n > 180) {
      n -= 360;
    }
    return n;
  };

  this.dist = function(a, b) {
    var dx, dy;
    dx = b[0] - a[0];
    dy = b[1] - a[1];
    return Math.sqrt(dx * dx + dy * dy);
  };

  cos = function(n) {
    return Math.cos(n * Math.PI / 180);
  };

  sin = function(n) {
    return Math.sin(n * Math.PI / 180);
  };

  arctan2 = function(x, y) {
    return Math.atan2(x, y) * 180 / Math.PI;
  };

  hexd = (function(hexdigits) {
    return function(n) {
      return hexdigits[n];
    };
  })('0123456789abcdef');

  localx = function(gx) {
    return (gx - wirebuffer.getBoundingClientRect().left) * 1800 / 900;
  };

  localy = function(gy) {
    return (gy - wirebuffer.getBoundingClientRect().top) * 2000 / 1000;
  };

  localEvent = function(e) {
    return [localx(e.clientX), localy(e.clientY)];
  };

}).call(this);
