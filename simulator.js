(function() {
  var ComponentStepFunctions, HistoryLength, boolToVolt, comp, edgeDetector, runComponent, updateModule, updateModules, updateWires, voltToBool;

  this.Simulator = {
    step: function(modules, wires) {
      var outputWireValues;
      this.currentTime || (this.currentTime = 0);
      outputWireValues = {};
      updateModules(modules, wires, outputWireValues);
      updateWires(wires, outputWireValues, this.currentTime);
      return this.currentTime += 1;
    }
  };

  HistoryLength = 400;

  updateModules = function(modules, wires, outputWireValues) {
    var module, _i, _len, _results;
    _results = [];
    for (_i = 0, _len = modules.length; _i < _len; _i++) {
      module = modules[_i];
      _results.push(updateModule(module, wires, outputWireValues));
    }
    return _results;
  };

  updateWires = function(wires, outputWireValues, timestamp) {
    var wire, _i, _len, _results;
    _results = [];
    for (_i = 0, _len = wires.length; _i < _len; _i++) {
      wire = wires[_i];
      wire.trace || (wire.trace = []);
      wire.trace.push({
        timestamp: timestamp,
        value: wire.value
      });
      if (wire.trace.length > HistoryLength) {
        wire.trace = wire.trace.slice(wire.trace.length - HistoryLength);
      }
      if (wire in outputWireValues) {
        _results.push(wire.value = outputWireValues[wire]);
      } else {
        _results.push(void 0);
      }
    }
    return _results;
  };

  updateModule = function(module, wires, outputWireValues) {
    var component, _i, _len, _ref, _results;
    _ref = module.components;
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      component = _ref[_i];
      _results.push(runComponent(component, wires, outputWireValues));
    }
    return _results;
  };

  runComponent = function(component, wires, outputWireValues) {
    var circuitType, componentPinName, connectedWires, machinePinName, outputs, pinValues, pinWires, pins, value, wire, wireCount, _i, _j, _len, _len1, _ref, _ref1, _results;
    circuitType = component.type, pins = component.pins;
    component.state || (component.state = {
      falling: function(n) {
        var s;
        s = this.prev;
        this.prev = n;
        return n < s;
      }
    });
    pinWires = {};
    for (_i = 0, _len = pins.length; _i < _len; _i++) {
      _ref = pins[_i], componentPinName = _ref.componentPinName, machinePinName = _ref.machinePinName;
      connectedWires = pinWires[componentPinName] = [];
      for (_j = 0, _len1 = wires.length; _j < _len1; _j++) {
        wire = wires[_j];
        if (wire[0] === machinePinName || wire[1] === machinePinName) {
          connectedWires.push(wire);
        }
      }
    }
    wireCount = 0;
    for (componentPinName in pinWires) {
      connectedWires = pinWires[componentPinName];
      wireCount += connectedWires.length;
    }
    pinValues = {};
    for (componentPinName in pinWires) {
      connectedWires = pinWires[componentPinName];
      pinValues[componentPinName] = (_ref1 = connectedWires[0]) != null ? _ref1.value : void 0;
    }
    if (ComponentStepFunctions[circuitType] == null) {
      console.error("No component step function for " + circuitType);
    }
    outputs = ComponentStepFunctions[circuitType].call(component.state, pinValues);
    _results = [];
    for (componentPinName in outputs) {
      value = outputs[componentPinName];
      if (value === true || value === false) {
        value = boolToVolt(value);
      }
      _results.push((function() {
        var _k, _len2, _ref2, _results1;
        _ref2 = pinWires[componentPinName];
        _results1 = [];
        for (_k = 0, _len2 = _ref2.length; _k < _len2; _k++) {
          wire = _ref2[_k];
          _results1.push(outputWireValues[wire] = value);
        }
        return _results1;
      })());
    }
    return _results;
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
      this.freq = 2;
      this.counter || (this.counter = 0);
      this.counter += 1;
      v = this.counter % this.freq >= this.freq / 2;
      return {
        '+': v,
        '-': !v
      };
    },
    ff: function(_arg) {
      var comp, in0, in1, pulsed;
      in0 = _arg['0in'], in1 = _arg['1in'], comp = _arg.comp;
      pulsed = this.falling(comp);
      if (pulsed) {
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
        p: pulsed
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
    ground: function(values) {
      return {
        gnd: 0
      };
    }
  };

}).call(this);
