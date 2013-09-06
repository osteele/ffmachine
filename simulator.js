(function() {
  var ComponentStepFunctions, boolToVolt, comp, edgeDetector, runComponent, updateModule, updateModules, updateWires, voltToBool;

  this.Simulator = {
    step: function(modules, wires) {
      var outputWireValues;
      outputWireValues = {};
      updateModules(modules, wires, outputWireValues);
      return updateWires(wires, outputWireValues);
    }
  };

  updateModules = function(modules, wires, outputWireValues) {
    var module, _i, _len, _results;
    _results = [];
    for (_i = 0, _len = modules.length; _i < _len; _i++) {
      module = modules[_i];
      _results.push(updateModule(module, wires, outputWireValues));
    }
    return _results;
  };

  updateWires = function(wires, outputWireValues) {
    var wire, _i, _len, _results;
    _results = [];
    for (_i = 0, _len = wires.length; _i < _len; _i++) {
      wire = wires[_i];
      wire.trace || (wire.trace = []);
      wire.trace.push(wire.value);
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
    component.state || (component.state = {});
    pinWires = {};
    pinValues = {};
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
      var in0, in1, p;
      in0 = _arg['0in'], in1 = _arg['1in'], p = _arg.p;
      this.pulse || (this.pulse = edgeDetector(p));
      if (this.pulse(p)) {
        this.in0 = in0;
        this.in1 = in1;
      }
      return {
        '0': this.in0,
        '1': this.in1
      };
    },
    pa: function(_arg) {
      var v;
      v = _arg['in'];
      return {
        '+': v,
        '-': comp(v)
      };
    },
    gate: function(_arg) {
      var b, e;
      e = _arg.e, b = _arg.b;
      this.pulse || (this.pulse = edgeDetector(b));
      if (this.pulse(b)) {
        this.v = b;
      }
      return {
        c: this.v
      };
    },
    ground: function(values) {
      return {
        gnd: 0
      };
    }
  };

}).call(this);
