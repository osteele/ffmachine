(function() {
  var ComponentEquations, HistoryLength, RestrictModules, Trace, TraceComponents, Weak, boolToVolt, computeTerminalValues, fromWeak, getConnectedWires, getWireName, isWeak, runComponent, runModules, updateModuleOutputs, updateWireValues, voltToBool, weak,
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

  updateWireValues = function(wires, terminalValues, timestamp) {
    var strongValues, terminal, value, values, wire, _i, _len, _results;
    _results = [];
    for (_i = 0, _len = wires.length; _i < _len; _i++) {
      wire = wires[_i];
      values = (function() {
        var _j, _len1, _results1;
        _results1 = [];
        for (_j = 0, _len1 = wire.length; _j < _len1; _j++) {
          terminal = wire[_j];
          _results1.push(terminalValues[terminal.globalTerminalName]);
        }
        return _results1;
      })();
      if (!values.length) {
        continue;
      }
      strongValues = (function() {
        var _j, _len1, _results1;
        _results1 = [];
        for (_j = 0, _len1 = values.length; _j < _len1; _j++) {
          value = values[_j];
          if (!isWeak(value)) {
            _results1.push(value);
          }
        }
        return _results1;
      })();
      if (strongValues.length) {
        values = strongValues;
      }
      value = fromWeak(values[0]);
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
        _results.push(wire.trace.splice(0, wire.trace.length - HistoryLength));
      } else {
        _results.push(void 0);
      }
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
    var circuitType, componentTerminalName, globalTerminalName, moduleInputs, moduleOutputs, t, targetName, terminals, trace, value, voltage, _i, _j, _len, _len1, _ref, _ref1, _ref2;
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
      targetName = componentTerminalName.replace(/^(\d+)(.+)/, '$2$1');
      voltage = terminalInputs[globalTerminalName];
      moduleInputs[targetName] = voltage;
      moduleInputs[targetName + '_v'] = voltToBool(voltage);
    }
    if (ComponentEquations[circuitType] == null) {
      console.error("No component step function for " + circuitType);
    }
    moduleOutputs = ComponentEquations[circuitType].call(component.state, moduleInputs);
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

  Weak = (function() {
    function Weak(value) {
      this.value = value;
    }

    return Weak;

  })();

  weak = function(value) {
    if (value === true || value === false) {
      value = boolToVolt(value);
    }
    return new Weak(value);
  };

  fromWeak = function(value) {
    if (value instanceof Weak) {
      value = value.value;
    }
    return value;
  };

  isWeak = function(value) {
    return value instanceof Weak;
  };

  ComponentEquations = {
    clamp: function() {
      return {
        cl: weak(true)
      };
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
      var comp_v, edge, in0, in1;
      in0 = _arg.in0, in1 = _arg.in1, comp_v = _arg.comp_v;
      edge = this.falling(comp_v);
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
        '-': !input
      };
    },
    inverter: function(_arg) {
      var b, e;
      e = _arg.e, b = _arg.b;
      return {
        c: b ? e : true
      };
    },
    gate: function(_arg) {
      var any, b0, b1, b2, b3, b4, b5, e;
      e = _arg.e, b0 = _arg.b0, b1 = _arg.b1, b2 = _arg.b2, b3 = _arg.b3, b4 = _arg.b4, b5 = _arg.b5;
      any = [b0, b1, b2, b3, b4, b5].some(function(b) {
        return b;
      });
      return {
        c: any ? e : -3
      };
    },
    ground: function() {
      return {
        gnd: 0
      };
    }
  };

}).call(this);
