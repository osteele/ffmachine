(function() {
  var ComponentEquations, HistoryLength, RestrictModules, Trace, TraceComponents, Weak, boolToVolt, collectBusses, computeTerminalValues, getConnectedWires, isWeak, runComponent, runModules, updateModuleOutputs, updateTerminalValues, updateWireValues, voltToBool, weak,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  HistoryLength = 400;

  RestrictModules = 0;

  Trace = 0;

  TraceComponents = 0;

  this.SimulatorClass = (function() {
    function SimulatorClass(configuration) {
      this.configuration = configuration;
      this.timestamp = 0;
    }

    SimulatorClass.prototype.step = function() {
      var moduleInputs, moduleOutputs, modules, terminals, wires, _ref;
      _ref = this.configuration, modules = _ref.modules, terminals = _ref.terminals, wires = _ref.wires;
      moduleInputs = computeTerminalValues(terminals, wires);
      moduleOutputs = {};
      runModules(modules, moduleInputs, moduleOutputs);
      updateTerminalValues(terminals, moduleOutputs, this.timestamp);
      updateWireValues(wires, moduleOutputs, this.timestamp);
      return this.timestamp += 1;
    };

    return SimulatorClass;

  })();

  runModules = function(modules, moduleInputs, moduleOutputs) {
    var m, module, _i, _len, _results;
    if (RestrictModules.length) {
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
      _results.push(updateModuleOutputs(module, moduleInputs, moduleOutputs));
    }
    return _results;
  };

  collectBusses = function(wires) {
    var bus, busses, bussesByTerminal, terminal, wire, wireSets, __, _i, _j, _len, _len1, _ref;
    bussesByTerminal = {};
    for (_i = 0, _len = wires.length; _i < _len; _i++) {
      wire = wires[_i];
      busses = _.compact((function() {
        var _j, _len1, _ref, _results;
        _ref = wire.terminals;
        _results = [];
        for (_j = 0, _len1 = _ref.length; _j < _len1; _j++) {
          terminal = _ref[_j];
          _results.push(bussesByTerminal[terminal.globalTerminalName]);
        }
        return _results;
      })());
      bus = (function() {
        var _ref;
        switch (busses.length) {
          case 0:
            return [wire];
          default:
            return (_ref = [wire]).concat.apply(_ref, busses);
        }
      })();
      _ref = wire.terminals;
      for (_j = 0, _len1 = _ref.length; _j < _len1; _j++) {
        terminal = _ref[_j];
        bussesByTerminal[terminal.globalTerminalName] = bus;
      }
    }
    wireSets = [];
    for (__ in bussesByTerminal) {
      bus = bussesByTerminal[__];
      if (__indexOf.call(wireSets, bus) < 0) {
        wireSets.push(bus);
      }
    }
    return (function() {
      var _k, _len2, _results;
      _results = [];
      for (_k = 0, _len2 = wireSets.length; _k < _len2; _k++) {
        wires = wireSets[_k];
        _results.push({
          wires: wires,
          terminals: _.chain(wires).pluck('terminals').flatten().uniq().value()
        });
      }
      return _results;
    })();
  };

  updateTerminalValues = function(terminals, moduleOutputs, timestamp) {
    var terminal, trace, value, _i, _len, _results;
    _results = [];
    for (_i = 0, _len = terminals.length; _i < _len; _i++) {
      terminal = terminals[_i];
      if (terminal.globalTerminalName in moduleOutputs) {
        terminal.value = value = moduleOutputs[terminal.globalTerminalName];
        trace = terminal.trace || (terminal.trace = []);
        trace.push({
          timestamp: timestamp,
          value: value
        });
        if (trace.length > HistoryLength) {
          trace.splice(0, trace.length - HistoryLength);
        }
        if (Trace) {
          _results.push(console.info("" + terminal.globalTerminalName + " <- " + value));
        } else {
          _results.push(void 0);
        }
      } else {
        _results.push(void 0);
      }
    }
    return _results;
  };

  updateWireValues = function(wires, moduleOutputs, timestamp) {
    var propogatedOutputs, propogatedTerminals, strongValues, terminal, terminals, value, values, wire, _i, _j, _k, _len, _len1, _len2, _ref, _ref1;
    propogatedTerminals = [];
    propogatedOutputs = {};
    _ref = collectBusses(wires);
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      _ref1 = _ref[_i], wires = _ref1.wires, terminals = _ref1.terminals;
      if (!terminals.some(function(terminal) {
        return terminal.globalTerminalName in moduleOutputs;
      })) {
        continue;
      }
      values = (function() {
        var _j, _len1, _results;
        _results = [];
        for (_j = 0, _len1 = terminals.length; _j < _len1; _j++) {
          terminal = terminals[_j];
          _results.push(terminal.value);
        }
        return _results;
      })();
      values = (function() {
        var _j, _len1, _results;
        _results = [];
        for (_j = 0, _len1 = terminals.length; _j < _len1; _j++) {
          terminal = terminals[_j];
          _results.push(moduleOutputs[terminal.globalTerminalName]);
        }
        return _results;
      })();
      values = (function() {
        var _j, _len1, _results;
        _results = [];
        for (_j = 0, _len1 = values.length; _j < _len1; _j++) {
          value = values[_j];
          if (value !== void 0) {
            _results.push(value);
          }
        }
        return _results;
      })();
      if (values.length === 0) {
        values = [void 0];
      }
      strongValues = (function() {
        var _j, _len1, _results;
        _results = [];
        for (_j = 0, _len1 = values.length; _j < _len1; _j++) {
          value = values[_j];
          if (!isWeak(value)) {
            _results.push(value);
          }
        }
        return _results;
      })();
      if (strongValues.length) {
        values = strongValues;
      }
      value = fromWeak(values[0]);
      if (Trace) {
        console.info("" + (_.pluck(wires, 'name').join(',')) + " <- " + value);
      }
      for (_j = 0, _len1 = wires.length; _j < _len1; _j++) {
        wire = wires[_j];
        wire.value = value;
      }
      for (_k = 0, _len2 = terminals.length; _k < _len2; _k++) {
        terminal = terminals[_k];
        if (!(terminal.globalTerminalName in moduleOutputs || __indexOf.call(propogatedTerminals, terminal) >= 0)) {
          propogatedTerminals.push(terminal);
          propogatedOutputs[terminal.globalTerminalName] = value;
        }
      }
    }
    return updateTerminalValues(propogatedTerminals, propogatedOutputs, timestamp);
  };

  updateModuleOutputs = function(module, moduleInputs, moduleOutputs) {
    var component, _i, _len, _ref, _results;
    _ref = module.components;
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      component = _ref[_i];
      _results.push(runComponent(component, moduleInputs, moduleOutputs));
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
        if (__indexOf.call(wire.terminals, terminal) >= 0) {
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

  runComponent = function(component, moduleInputs, moduleOutputs) {
    var circuitType, componentInputs, componentOutputs, componentTerminalName, globalTerminalName, t, targetName, terminals, trace, value, voltage, _i, _j, _len, _len1, _ref, _ref1, _ref2;
    trace = TraceComponents === 1 || TraceComponents === true || (_ref = component.type, __indexOf.call(TraceComponents, _ref) >= 0);
    circuitType = component.type, terminals = component.terminals;
    component.state || (component.state = {
      falling: function(n) {
        var s;
        s = this.prev;
        this.prev = n;
        return n < s;
      }
    });
    componentInputs = {};
    for (_i = 0, _len = terminals.length; _i < _len; _i++) {
      _ref1 = terminals[_i], componentTerminalName = _ref1.componentTerminalName, globalTerminalName = _ref1.globalTerminalName;
      targetName = componentTerminalName.replace(/^(\d+)(.+)/, '$2$1');
      voltage = moduleInputs[globalTerminalName];
      componentInputs[targetName] = voltage;
      componentInputs[targetName + '_v'] = voltToBool(voltage);
    }
    if (ComponentEquations[circuitType] == null) {
      console.error("No component step function for " + circuitType);
    }
    componentOutputs = ComponentEquations[circuitType].call(component.state, componentInputs);
    for (_j = 0, _len1 = terminals.length; _j < _len1; _j++) {
      _ref2 = terminals[_j], componentTerminalName = _ref2.componentTerminalName, globalTerminalName = _ref2.globalTerminalName;
      if (!(componentTerminalName in componentOutputs)) {
        continue;
      }
      value = componentOutputs[componentTerminalName];
      if (value === true || value === false) {
        value = boolToVolt(value);
      }
      moduleOutputs[globalTerminalName] = value;
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
      })(), componentInputs, componentOutputs);
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

  this.fromWeak = function(value) {
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
