(function() {
  var ComponentStepFunctions, HistoryLength, RestrictModules, Trace, TraceComponents, boolToVolt, comp, computeTerminalValues, edgeDetector, getConnectedWires, getWireName, runComponent, runModules, updateModuleOutputs, updateWireValues, voltToBool,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  HistoryLength = 400;

  RestrictModules = 0;

  Trace = 0;

  TraceComponents = 0;

  this.Simulator = {
    step: function(modules, wires) {
      var module, terminalInputs, terminalOutputs, terminals, _ref;
      this.currentTime || (this.currentTime = 0);
      terminals = (_ref = []).concat.apply(_ref, (function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = modules.length; _i < _len; _i++) {
          module = modules[_i];
          _results.push(module.terminals);
        }
        return _results;
      })());
      terminalInputs = computeTerminalValues(terminals, wires);
      terminalOutputs = {};
      runModules(modules, terminalInputs, terminalOutputs);
      updateWireValues(wires, terminalOutputs, this.currentTime);
      return this.currentTime += 1;
    }
  };

  runModules = function(modules, terminalInputs, terminalOutputs) {
    var m, module, _i, _len, _results;
    if (RestrictModules) {
      modules = (function() {
        var _i, _len, _ref, _results;
        _results = [];
        for (_i = 0, _len = modules.length; _i < _len; _i++) {
          m = modules[_i];
          if (_ref = m.name, __indexOf.call(RestrictModules, _ref) >= 0) {
            _results.push(m);
          }
        }
        return _results;
      })();
    }
    _results = [];
    for (_i = 0, _len = modules.length; _i < _len; _i++) {
      module = modules[_i];
      _results.push(updateModuleOutputs(module, terminalInputs, terminalOutputs));
    }
    return _results;
  };

  getWireName = function(wire) {
    var terminal;
    return ((function() {
      var _i, _len, _results;
      _results = [];
      for (_i = 0, _len = wire.length; _i < _len; _i++) {
        terminal = wire[_i];
        _results.push(terminal.globalTerminalName);
      }
      return _results;
    })()).join('->');
  };

  updateWireValues = function(wires, terminalOutputs, timestamp) {
    var globalTerminalName, value, wire, _results;
    _results = [];
    for (globalTerminalName in terminalOutputs) {
      value = terminalOutputs[globalTerminalName];
      _results.push((function() {
        var _i, _len, _ref, _results1;
        _ref = getConnectedWires(findTerminalByName(globalTerminalName), wires);
        _results1 = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          wire = _ref[_i];
          if (Trace) {
            console.info(getWireName(wire), '<-', value);
          }
          wire.value = value;
          wire.timestamp = timestamp;
          wire.trace || (wire.trace = []);
          wire.trace.push({
            timestamp: timestamp,
            value: wire.value
          });
          if (wire.trace.length > HistoryLength) {
            _results1.push(wire.trace.splice(0, wire.trace.length - HistoryLength));
          } else {
            _results1.push(void 0);
          }
        }
        return _results1;
      })());
    }
    return _results;
  };

  updateModuleOutputs = function(module, terminalInputs, terminalOutputs) {
    var component, _i, _len, _ref, _results;
    _ref = module.components;
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      component = _ref[_i];
      _results.push(runComponent(component, terminalInputs, terminalOutputs));
    }
    return _results;
  };

  getConnectedWires = function(terminal, wires) {
    var wire;
    return (function() {
      var _i, _len, _results;
      _results = [];
      for (_i = 0, _len = wires.length; _i < _len; _i++) {
        wire = wires[_i];
        if (__indexOf.call(wire, terminal) >= 0) {
          _results.push(wire);
        }
      }
      return _results;
    })();
  };

  computeTerminalValues = function(terminals, wires) {
    var terminal, values, wire, wireValues, _i, _len;
    values = {};
    for (_i = 0, _len = terminals.length; _i < _len; _i++) {
      terminal = terminals[_i];
      wireValues = (function() {
        var _j, _len1, _ref, _results;
        _ref = getConnectedWires(terminal, wires);
        _results = [];
        for (_j = 0, _len1 = _ref.length; _j < _len1; _j++) {
          wire = _ref[_j];
          _results.push(wire.value);
        }
        return _results;
      })();
      if (wireValues.length) {
        values[terminal.globalTerminalName] = wireValues[0];
      }
    }
    return values;
  };

  runComponent = function(component, terminalInputs, terminalOutputs) {
    var circuitType, componentTerminalName, globalTerminalName, moduleInputs, moduleOutputs, t, terminals, trace, value, _i, _j, _len, _len1, _ref, _ref1, _ref2;
    trace = (_ref = component.type, __indexOf.call(TraceComponents, _ref) >= 0);
    circuitType = component.type, terminals = component.terminals;
    component.state || (component.state = {
      falling: function(n) {
        var s;
        s = this.prev;
        this.prev = n;
        return n < s;
      }
    });
    moduleInputs = {};
    for (_i = 0, _len = terminals.length; _i < _len; _i++) {
      _ref1 = terminals[_i], componentTerminalName = _ref1.componentTerminalName, globalTerminalName = _ref1.globalTerminalName;
      moduleInputs[componentTerminalName] = terminalInputs[globalTerminalName];
    }
    if (ComponentStepFunctions[circuitType] == null) {
      console.error("No component step function for " + circuitType);
    }
    moduleOutputs = ComponentStepFunctions[circuitType].call(component.state, moduleInputs);
    for (_j = 0, _len1 = terminals.length; _j < _len1; _j++) {
      _ref2 = terminals[_j], componentTerminalName = _ref2.componentTerminalName, globalTerminalName = _ref2.globalTerminalName;
      if (!(componentTerminalName in moduleOutputs)) {
        continue;
      }
      value = moduleOutputs[componentTerminalName];
      if (value === true || value === false) {
        value = boolToVolt(value);
      }
      terminalOutputs[globalTerminalName] = value;
    }
    if (trace) {
      return console.info(component.type, (function() {
        var _k, _len2, _results;
        _results = [];
        for (_k = 0, _len2 = terminals.length; _k < _len2; _k++) {
          t = terminals[_k];
          _results.push(t.globalTerminalName);
        }
        return _results;
      })(), moduleInputs, moduleOutputs);
    }
  };

  boolToVolt = function(value) {
    switch (value) {
      case true:
        return -3;
      case false:
        return 0;
      default:
        return void 0;
    }
  };

  voltToBool = function(value) {
    switch (value) {
      case -3:
        return true;
      case 0:
        return false;
      default:
        return void 0;
    }
  };

  comp = function(value) {
    return boolToVolt(!voltToBool(value));
  };

  edgeDetector = function(init) {
    var previous;
    previous = init;
    return function(value) {
      var isEdge;
      isEdge = value && !previous;
      previous = value;
      return isEdge;
    };
  };

  ComponentStepFunctions = {
    clamp: function() {
      return {};
    },
    clock: function() {
      var v;
      this.frequency || (this.frequency = 2);
      this.counter || (this.counter = 0);
      this.counter += 1;
      v = this.counter % this.frequency >= this.frequency / 2;
      return {
        '+': v,
        '-': !v
      };
    },
    ff: function(_arg) {
      var comp, edge, in0, in1;
      in0 = _arg['0in'], in1 = _arg['1in'], comp = _arg.comp;
      edge = this.falling(comp);
      if (edge) {
        this.state = !this.state;
      }
      if (in0 === 0) {
        this.state = false;
      }
      if (in1 === 0) {
        this.state = true;
      }
      return {
        '0': this.state === false,
        '1': this.state === true,
        p: edge
      };
    },
    pa: function(_arg) {
      var input;
      input = _arg['in'];
      return {
        '+': input,
        '-': comp(input)
      };
    },
    inverter: function(_arg) {
      var b, e;
      e = _arg.e, b = _arg.b;
      return {
        c: b < 0 ? e : -3
      };
    },
    gate: function(_arg) {
      var any, b0, b1, b2, b3, b4, b5, e;
      e = _arg.e, b0 = _arg.b0, b1 = _arg.b1, b2 = _arg.b2, b3 = _arg.b3, b4 = _arg.b4, b5 = _arg.b5;
      any = [b0, b1, b2, b3, b4, b5].some(function(b) {
        return b < 0;
      });
      return {
        c: any < 0 ? e : -3
      };
    },
    ground: function() {
      return {
        gnd: 0
      };
    }
  };

}).call(this);
