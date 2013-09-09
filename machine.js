(function() {
  var Knobs, MachineConfiguration, Simulator, TraceHistoryLength, addWire, arctan2, closestEndIndex, cmerge, cos, createLayer, deleteWire, dragKnob, dragWireEnd, drawKnob, drawKnobs, endpointsToColor, endpointsToPath, findNearest, getIdentifier, getLayer, getWireView, hexd, knobAngle, knoboffset, localEvent, localx, localy, machineViewElement, mod360, mouseDownAddWire, notifyMachineConfigurationSubscribers, pickColor, releaseKnob, sin, svgSelection, updateCircuitView, updateTraces, wireColor, wireEndpoints, wireLength, wirePath,
    __slice = [].slice;

  Knobs = [[100, 252, 288, '#f0f0f0'], [100, 382, 0, '#f0f0f0'], [1700, 252, 292, '#202020'], [1700, 382, 0, '#202020']];

  MachineConfiguration = {
    modules: [],
    terminals: [],
    wires: []
  };

  Simulator = null;

  machineViewElement = null;

  svgSelection = null;

  knoboffset = null;

  this.initializeMachineView = function() {
    machineViewElement = document.getElementById('machineView');
    svgSelection = d3.select(machineViewElement);
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

  this.updateMachineConfiguration = function(configuration) {
    var _ref, _ref1;
    MachineConfiguration.wires = configuration.wires;
    MachineConfiguration.modules = (_ref = configuration.modules) != null ? _ref : MachineHardware.modules;
    MachineConfiguration.terminals = (_ref1 = configuration.terminals) != null ? _ref1 : MachineHardware.terminals;
    return updateCircuitView();
  };

  notifyMachineConfigurationSubscribers = function() {
    return machineConfigurationChanged(MachineConfiguration);
  };

  this.createWire = function(t1, t2) {
    var t, terminals, wire;
    terminals = [t1, t2].sort(function(t1, t2) {
      return t1.identifier > t2.identifier;
    });
    return wire = {
      name: ((function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = terminals.length; _i < _len; _i++) {
          t = terminals[_i];
          _results.push(t.identifier);
        }
        return _results;
      })()).join(' ↔ '),
      identifier: ((function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = terminals.length; _i < _len; _i++) {
          t = terminals[_i];
          _results.push(t.identifier);
        }
        return _results;
      })()).join('-'),
      terminals: terminals
    };
  };

  addWire = function(wire) {
    MachineConfiguration.wires.push(wire);
    updateCircuitView();
    return notifyMachineConfigurationSubscribers();
  };

  deleteWire = function(wire) {
    var w;
    MachineConfiguration.wires = (function() {
      var _i, _len, _ref, _results;
      _ref = MachineConfiguration.wires;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        w = _ref[_i];
        if (w !== wire) {
          _results.push(w);
        }
      }
      return _results;
    })();
    updateCircuitView();
    return notifyMachineConfigurationSubscribers();
  };

  this.stepSimulator = (function() {
    var AnimationLength, animationCounter;
    AnimationLength = 6;
    animationCounter = 0;
    return function() {
      Simulator || (Simulator = new SimulatorClass(MachineConfiguration));
      Simulator.step();
      animationCounter = (animationCounter + 1) % AnimationLength;
      updateTraces();
      return updateTerminalTraceViews();
    };
  })();

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
          return d3.select(machineViewElement.getElementById(endTerminal.identifier)).classed('active', true).classed('end', true);
        }
      }
    };
    return window.onmouseup = function(e) {
      window.onmousemove = null;
      window.onmouseup = null;
      wireView.remove();
      svgSelection.select('.active').classed('active', false).classed('end', false);
      if (endTerminal) {
        return addWire(createWire(startTerminal, endTerminal));
      }
    };
  };

  closestEndIndex = function(wire) {
    var d1, d2, t1, t2, x, y, _ref, _ref1;
    _ref = localEvent(d3.event), x = _ref[0], y = _ref[1];
    _ref1 = wire.terminals, t1 = _ref1[0], t2 = _ref1[1];
    d1 = lineLength([x, y], t1.coordinates);
    d2 = lineLength([x, y], t2.coordinates);
    if (d1 < d2) {
      return 0;
    } else {
      return 1;
    }
  };

  dragWireEnd = function(wire) {
    var endTerminal, t1, t2, wireTerminalIndex, wireView, _ref;
    wireView = getWireView(wire);
    wireView.transition().delay(0);
    _ref = wire.terminals, t1 = _ref[0], t2 = _ref[1];
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
          return d3.select(machineViewElement.getElementById(endTerminal.identifier)).classed('active', true);
        }
      }
    };
    return window.onmouseup = function(e) {
      window.onmousemove = null;
      window.onmouseup = null;
      svgSelection.select('.active').classed('active', false);
      if (endTerminal && wire.terminals[wireTerminalIndex] !== endTerminal) {
        wire.terminals[wireTerminalIndex] = endTerminal;
        updateCircuitView();
        return notifyMachineConfigurationSubscribers();
      } else {
        return updateCircuitView();
      }
    };
  };

  dragKnob = function(e) {
    var a, knob;
    knob = Knobs[starty];
    a = knobAngle.apply(null, [knob].concat(__slice.call(localEvent(e))));
    if (!moved) {
      knoboffset = mod360(knob[2] - a);
    }
    knob[2] = mod360(a + knoboffset);
    updateCircuitView();
    return notifyMachineConfigurationSubscribers();
  };

  releaseKnob = function() {
    var knob;
    knob = Knobs[starty];
    if (starty === 0) {
      knob[2] = findNearest(knob[2], [-72, -36, 0, 36, 72]);
    }
    if (starty === 2) {
      knob[2] = findNearest(knob[2], [-68, -23, 22, 67]);
    }
    updateCircuitView();
    return notifyMachineConfigurationSubscribers();
  };

  getIdentifier = function(d) {
    return d.identifier;
  };

  updateCircuitView = function() {
    var terminalTargets, updateEndPinTargets, wireTargets, wireTitle, wireViews;
    terminalTargets = getLayer('terminal-target-layer').selectAll('.terminal-position').data(MachineConfiguration.terminals, getIdentifier);
    terminalTargets.enter().append('circle').classed('terminal-position', true);
    terminalTargets.exit().remove();
    terminalTargets.attr('id', function(pos) {
      return pos.identifier;
    }).attr('cx', function(pos) {
      return pos.x;
    }).attr('cy', function(pos) {
      return pos.y;
    }).attr('r', 3).on('mousedown', mouseDownAddWire).append('title').text(function(pos) {
      return "Drag " + pos.identifier + " to another terminal to create a wire.";
    });
    wireViews = getLayer('wire-layer').selectAll('.wire').data(MachineConfiguration.wires, getIdentifier);
    wireViews.enter().append('path').classed('wire', true);
    wireViews.exit().remove();
    wireViews.attr('d', wirePath).attr('stroke', wireColor);
    wireTitle = function(w) {
      return "Wire " + w.name + "\nClick to delete this wire.";
    };
    wireTargets = getLayer('deletion-target-layer').selectAll('.wire-mouse-target').data(MachineConfiguration.wires, getIdentifier);
    wireTargets.enter().append('path').classed('wire-mouse-target', true).on('mousedown', deleteWire).append('title').text(wireTitle);
    wireTargets.exit().remove();
    wireTargets.attr('d', wirePath);
    updateEndPinTargets = function(layerName, endIndex) {
      var startPinTargets, w;
      startPinTargets = getLayer(layerName).selectAll('.wire-end-target').data((function() {
        var _i, _len, _ref, _results;
        _ref = MachineConfiguration.wires;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          w = _ref[_i];
          if (wireLength(w) > 45) {
            _results.push(w);
          }
        }
        return _results;
      })());
      startPinTargets.enter().append('circle').classed('wire-end-target', true).attr('r', 10).on('mousedown', dragWireEnd).append('title').text(function(w) {
        return "Drag this end of " + w.name + " to move it to terminal.";
      });
      startPinTargets.exit().remove();
      return startPinTargets.attr('cx', function(wire) {
        return wire.terminals[endIndex].coordinates[0];
      }).attr('cy', function(wire) {
        return wire.terminals[endIndex].coordinates[1];
      });
    };
    updateEndPinTargets('wire-start-target-layer', 0);
    updateEndPinTargets('wire-end-target-layer', 1);
    return updateTraces({
      wiresMaybeMoved: true
    });
  };

  wireEndpoints = function(wire) {
    var terminal, _i, _len, _ref, _results;
    _ref = wire.terminals;
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      terminal = _ref[_i];
      _results.push(terminal.coordinates);
    }
    return _results;
  };

  wireLength = function(wire) {
    return lineLength.apply(null, wireEndpoints(wire));
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

  wireColor = function(wire, n) {
    var t1, t2, _ref;
    _ref = wire.terminals, t1 = _ref[0], t2 = _ref[1];
    return endpointsToColor(t1.coordinates, t2.coordinates, n);
  };

  endpointsToColor = function(_arg, _arg1, n) {
    var x1, x2, y1, y2;
    x1 = _arg[0], y1 = _arg[1];
    x2 = _arg1[0], y2 = _arg1[1];
    n || (n = MachineConfiguration.wires.length);
    return cmerge(pickColor(x1, y1, x2, y2), n);
  };

  drawKnobs = function() {
    var k, _i, _len, _results;
    _results = [];
    for (_i = 0, _len = Knobs.length; _i < _len; _i++) {
      k = Knobs[_i];
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
    var isVoltage, symbols, terminalVoltageName, updateTerminalTraces, updateWireTraces, values, voltageParenthetical, wireIsReversed;
    symbols = ['negative', 'ground', 'float'];
    values = [-3, 0, void 0];
    terminalVoltageName = function(terminal) {
      var value;
      value = fromWeak(terminal.value);
      if (typeof value !== 'number') {
        value = void 0;
      }
      return symbols[values.indexOf(value)];
    };
    isVoltage = function(symbolicValue) {
      return function(terminal) {
        return terminalVoltageName(terminal) === symbolicValue;
      };
    };
    voltageParenthetical = function(wireOrTerminal) {
      var value;
      value = fromWeak(wireOrTerminal.value);
      if (value === void 0) {
        return '';
      }
      if (value !== void 0) {
        return "(" + value + "V)";
      }
    };
    updateTerminalTraces = function() {
      var enter, nodes;
      nodes = getLayer('trace-layer').selectAll('.terminal-trace').data(MachineConfiguration.terminals, getIdentifier);
      nodes.exit().remove();
      enter = nodes.enter().append('g').classed('terminal-trace', true);
      enter.append('circle').attr('r', 3).attr('transform', function(terminal) {
        var pt;
        pt = terminal.coordinates;
        return "translate(" + pt[0] + ", " + pt[1] + ")";
      }).on('click', traceTerminal).append('title').text(function(d) {
        return "Terminal " + d.identifier + "\nClick to trace";
      });
      return nodes.classed('voltage-negative', isVoltage('negative')).classed('voltage-ground', isVoltage('ground')).classed('voltage-float', isVoltage('float')).select('title').text(function(t) {
        return "Terminal " + t.identifier + " " + (voltageParenthetical(t)) + "\nClick to trace this terminal.";
      });
    };
    updateWireTraces = function(wiresMaybeMoved) {
      var wires;
      wires = getLayer('trace-layer').selectAll('.wire').data(MachineConfiguration.wires, getIdentifier).classed('wire', true);
      wires.enter().append('path').classed('wire', true).append('title').text(function(w) {
        return "Wire " + w.name + (voltageParenthetical(w));
      });
      wires.exit().remove();
      if (wiresMaybeMoved) {
        wires.attr('d', wirePath).attr('stroke', wireColor);
      }
      return wires.classed('voltage-negative', isVoltage('negative')).classed('voltage-ground', isVoltage('ground')).classed('voltage-float', isVoltage('float')).classed('reversed', wireIsReversed);
    };
    wireIsReversed = function(w) {
      var t1, t2, _ref;
      _ref = w.terminals, t1 = _ref[0], t2 = _ref[1];
      return t2.timestamp < t1.timestamp || t2.phase < t1.phase;
    };
    return function(_arg) {
      var wiresMaybeMoved;
      wiresMaybeMoved = (_arg != null ? _arg : {}).wiresMaybeMoved;
      updateWireTraces(wiresMaybeMoved);
      updateTerminalTraces();
      return updateTerminalTraceViews();
    };
  })();

  TraceHistoryLength = 200;

  this.updateTerminalTraceViews = function() {
    var element, line, scope, svg, terminal, values, x, y, _i, _len, _ref, _results;
    _ref = document.querySelectorAll('.terminal-trace-view');
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      element = _ref[_i];
      scope = angular.element(element).scope();
      terminal = scope.terminal;
      values = terminal.trace || [];
      if (!scope.path) {
        x = d3.scale.linear().domain([-TraceHistoryLength, 0]).range([0, Number(element.width.baseVal.value)]);
        y = d3.scale.linear().domain([-3, 0]).range([0, Number(element.height.baseVal.value)]);
        line = scope.line = d3.svg.line().x(function(d) {
          return x(d.timestamp - Simulator.timestamp);
        }).y(function(d) {
          return y(typeof fromWeak(d.value) === 'number' ? fromWeak(d.value) : -3 / 2);
        });
        svg = d3.select(element);
        scope.path = svg.append('path');
      }
      _results.push(scope.path.datum(values).attr('d', scope.line));
    }
    return _results;
  };

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

  this.lineLength = function(a, b) {
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
    return gx - machineViewElement.getBoundingClientRect().left;
  };

  localy = function(gy) {
    return gy - machineViewElement.getBoundingClientRect().top;
  };

  localEvent = function(e) {
    return [localx(e.clientX), localy(e.clientY)];
  };

}).call(this);
