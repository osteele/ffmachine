(function() {
  var addWire, arctan2, closestEndIndex, cmerge, cos, createLayer, deleteWire, dragKnob, dragWireEnd, drawKnob, drawKnobs, endpointsToColor, endpointsToPath, findNearest, getLayer, getWireView, hexd, knobAngle, knoboffset, knobs, localEvent, localx, localy, mod360, mouseDownAddWire, pickColor, releaseKnob, showWireTrace, sin, svgSelection, updateCircuitView, updateTraces, wireColor, wireEndpoints, wireLength, wirePath, wires,
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
    createLayer('wire-layer');
    createLayer('trace-layer', {
      simulationMode: true
    });
    createLayer('deletion-target-layer', {
      editMode: true
    });
    createLayer('terminal-target-layer', {
      editMode: true
    });
    createLayer('wire-start-target-layer', {
      editMode: true
    });
    createLayer('wire-end-target-layer', {
      editMode: true
    });
    getLayer('terminal-target-layer').selectAll('.terminal-position').data(TerminalPositions).enter().append('circle').classed('terminal-position', true).attr('id', function(pos) {
      return pos.globalTerminalName;
    }).attr('cx', function(pos) {
      return pos.x;
    }).attr('cy', function(pos) {
      return pos.y;
    }).attr('r', 3).on('mousedown', mouseDownAddWire).append('title').text(function(pos) {
      return "Drag " + pos.name + " to another terminal to create a wire.";
    });
    return updateCircuitView();
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
    updateCircuitView();
    return document.getElementById('loading').style.display = 'none';
  };

  addWire = function(wire) {
    wire.name = wire.map(function(t) {
      return t.globalTerminalName;
    }).join(' ');
    wires.push(wire);
    updateCircuitView();
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
    updateCircuitView();
    return wires_changed(wires);
  };

  this.stepSimulator = function() {
    this.Simulator.step(this.machineState.modules, wires);
    return updateTraces();
  };

  getWireView = function(wire) {
    return svgSelection.selectAll('.wire').filter(function(d) {
      return d === wire;
    });
  };

  mouseDownAddWire = function() {
    var endTerminal, startTerminal, wireView;
    startTerminal = findNearbyTerminal.apply(null, localEvent(d3.event));
    endTerminal = null;
    if (!startTerminal) {
      return;
    }
    wireView = svgSelection.append('path').classed('wire', true).classed('dragging', true);
    window.onmousemove = function(e) {
      var mouseCoordinates, newEndTerminal, wireEndCoordinates;
      mouseCoordinates = localEvent(e);
      wireEndCoordinates = [startTerminal.coordinates, mouseCoordinates];
      wireView.attr('d', endpointsToPath.apply(null, wireEndCoordinates)).attr('stroke', endpointsToColor.apply(null, wireEndCoordinates));
      newEndTerminal = findNearbyTerminal.apply(null, mouseCoordinates);
      if (newEndTerminal === startTerminal) {
        newEndTerminal = null;
      }
      if (endTerminal !== newEndTerminal) {
        endTerminal = newEndTerminal;
        svgSelection.select('.active.end').classed('active', false).classed('end', false);
        if (endTerminal) {
          return d3.select(wirebuffer.getElementById(endTerminal.globalTerminalName)).classed('active', true).classed('end', true);
        }
      }
    };
    return window.onmouseup = function(e) {
      window.onmousemove = null;
      window.onmouseup = null;
      wireView.remove();
      svgSelection.select('.active').classed('active', false).classed('end', false);
      if (endTerminal) {
        return addWire([startTerminal, endTerminal]);
      }
    };
  };

  closestEndIndex = function(wire) {
    var d1, d2, t1, t2, x, y, _ref;
    _ref = localEvent(d3.event), x = _ref[0], y = _ref[1];
    t1 = wire[0], t2 = wire[1];
    d1 = dist([x, y], t1.coordinates);
    d2 = dist([x, y], t2.coordinates);
    if (d1 < d2) {
      return 0;
    } else {
      return 1;
    }
  };

  dragWireEnd = function(wire) {
    var endTerminal, t1, t2, wireTerminalIndex, wireView;
    wireView = getWireView(wire);
    wireView.transition().delay(0);
    t1 = wire[0], t2 = wire[1];
    wireTerminalIndex = closestEndIndex(wire);
    endTerminal = null;
    window.onmousemove = function(e) {
      var endpoints, mouseCoordinates, newEndTerminal;
      mouseCoordinates = localEvent(e);
      endpoints = [t1.coordinates, t2.coordinates];
      endpoints[wireTerminalIndex] = mouseCoordinates;
      wireView.attr('d', endpointsToPath.apply(null, endpoints)).attr('stroke', endpointsToColor.apply(null, endpoints));
      newEndTerminal = findNearbyTerminal.apply(null, mouseCoordinates);
      if (endTerminal !== newEndTerminal) {
        endTerminal = newEndTerminal;
        svgSelection.select('.active').classed('active', false);
        if (endTerminal) {
          return d3.select(wirebuffer.getElementById(endTerminal.globalTerminalName)).classed('active', true);
        }
      }
    };
    return window.onmouseup = function(e) {
      window.onmousemove = null;
      window.onmouseup = null;
      svgSelection.select('.active').classed('active', false);
      if (endTerminal && wire[wireTerminalIndex] !== endTerminal) {
        wire[wireTerminalIndex] = endTerminal;
        updateCircuitView();
        return wires_changed(wires);
      } else {
        return updateCircuitView();
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
    updateCircuitView();
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
    updateCircuitView();
    return wires_changed(wires);
  };

  updateCircuitView = function() {
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
      startPinTargets.enter().append('circle').classed('wire-end-target', true).attr('r', 10).on('mousedown', dragWireEnd).append('title').text('Click to drag the wire end to another terminal.');
      startPinTargets.exit().remove();
      return startPinTargets.attr('cx', function(wire) {
        return wire[endIndex].coordinates[0];
      }).attr('cy', function(wire) {
        return wire[endIndex].coordinates[1];
      });
    };
    updateEndPinTargets('wire-start-target-layer', 0);
    updateEndPinTargets('wire-end-target-layer', 1);
    return updateTraces();
  };

  wireEndpoints = function(_arg) {
    var t1, t2;
    t1 = _arg[0], t2 = _arg[1];
    return [t1.coordinates, t2.coordinates];
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
    var t1, t2;
    t1 = _arg[0], t2 = _arg[1];
    return endpointsToColor(t1.coordinates, t2.coordinates, n);
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
      enter = nodes.enter().append('g').classed(className, true);
      enter.append('circle').attr('r', 5).on('click', showWireTrace);
      return nodes.classed('voltage-negative', isVoltage('negative')).classed('voltage-ground', isVoltage('ground')).classed('voltage-float', isVoltage('float')).attr('transform', function(wire) {
        var pt;
        pt = wire[endIndex].coordinates;
        return "translate(" + pt[0] + ", " + pt[1] + ")";
      });
    };
    return function() {
      updateWireEndTraces('start-trace', 0);
      updateWireEndTraces('end-trace', 1);
      return showWireTrace();
    };
  })();

  showWireTrace = (function() {
    var historyLength, line, path, svg, traceWire;
    traceWire = null;
    svg = null;
    path = null;
    line = null;
    historyLength = 200;
    return function(wire) {
      var values, x, y;
      if (wire) {
        traceWire = wire;
      }
      if (!traceWire) {
        return;
      }
      values = traceWire.trace || [];
      if (!svg) {
        svg || (svg = d3.select('#wireTrace'));
        x = d3.scale.linear().domain([-historyLength, 0]).range([0, 400]);
        y = d3.scale.linear().domain([-3, 0]).range([0, 200]);
        line = d3.svg.line().x(function(d) {
          return x(d.timestamp - Simulator.currentTime);
        }).y(function(d) {
          return y(typeof d.value === 'number' ? d.value : -3 / 2);
        });
        path = svg.append('path').datum(values).attr('class', 'line').attr('d', line);
      }
      return svg.selectAll('path').datum(values).attr('d', line);
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
    i = Math.round(len / 50);
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
    return gx - wirebuffer.getBoundingClientRect().left;
  };

  localy = function(gy) {
    return gy - wirebuffer.getBoundingClientRect().top;
  };

  localEvent = function(e) {
    return [localx(e.clientX), localy(e.clientY)];
  };

}).call(this);
