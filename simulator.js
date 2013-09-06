(function() {
  var ComponentStepFunctions, boolToVolt, comp, edgeDetector, runComponent, updateModule, updateModules, updateWires;

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
    var circuitType, componentPinName, connectedWires, machinePinName, pinValues, pinWires, pins, value, wire, wireCount, _i, _j, _len, _len1, _ref, _ref1, _results;
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
    ComponentStepFunctions[circuitType].call(component.state, pinValues);
    _results = [];
    for (componentPinName in pinWires) {
      connectedWires = pinWires[componentPinName];
      value = pinValues[componentPinName];
      _results.push((function() {
        var _k, _len2, _results1;
        _results1 = [];
        for (_k = 0, _len2 = connectedWires.length; _k < _len2; _k++) {
          wire = connectedWires[_k];
          _results1.push(outputWireValues[wire] = value);
        }
        return _results1;
      })());
    }
    return _results;
  };

  comp = function(value) {
    return -3 - value;
  };

  boolToVolt = function(value) {
    if (value) {
      return -3;
    } else {
      return 0;
    }
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
    clamp: function(values) {},
    clock: function(values) {
      var freq, v;
      this.counter || (this.counter = 0);
      this.counter += 1;
      freq = 2;
      v = boolToVolt(this.counter % freq >= freq / 2);
      values['-'] = comp(v);
      return values['+'] = v;
    },
    pa: function(values) {
      var v;
      v = values['in'];
      values['-'] = comp(v);
      return values['+'] = v;
    },
    gate: function(values) {
      var b, c, e;
      c = values.c, e = values.e, b = values.b;
      this.pulse || (this.pulse = edgeDetector(b));
      if (this.pulse(b)) {
        this.v = b;
      }
      return values.c = this.v;
    },
    ground: function(values) {
      return values.gnd = 0;
    }
  };

}).call(this);
