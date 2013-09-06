(function() {
  var ComponentStepFunctions, runComponent, updateModule, updateModules, updateWires;

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
    modules = modules.filter((function(_arg) {
      var name;
      name = _arg.name;
      return name === "a_1";
    }));
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

  runComponent = function(_arg, wires, outputWireValues) {
    var circuitType, componentPinName, connectedWires, machinePinName, pinValues, pinWires, pins, value, wire, wireCount, _i, _j, _len, _len1, _ref, _ref1, _results;
    circuitType = _arg.type, pins = _arg.pins;
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
    if (!(wireCount > 0)) {
      return;
    }
    if (ComponentStepFunctions[circuitType] == null) {
      console.error("No component step function for " + circuitType);
    }
    ComponentStepFunctions[circuitType].call(runComponent, pinValues);
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

  ComponentStepFunctions = {
    clamp: function(values) {},
    gate: function(values) {
      var b, c, e;
      c = values.c, e = values.e, b = values.b;
      console.info('gate', {
        c: c,
        e: e,
        b: b
      }, values);
      if (b && !this.b) {
        this.v = b;
      }
      return values.c = this.v;
    },
    ground: function(values) {
      return values.gnd = 0;
    }
  };

}).call(this);
