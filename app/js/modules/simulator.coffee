@Simulator =
  step: (modules, wires) ->
    outputWireValues = {}
    updateModules modules, wires, outputWireValues
    updateWires wires, outputWireValues

updateModules = (modules, wires, outputWireValues) ->
  updateModule module, wires, outputWireValues for module in modules

updateWires = (wires, outputWireValues) ->
  for wire in wires
    wire.trace or= []
    wire.trace.push wire.value
    wire.value = outputWireValues[wire] if wire of outputWireValues

updateModule = (module, wires) ->
  runComponent component, wires for component in module.components

runComponent = ({type: circuitType, pins}, wires, outputWireValues) ->
  pinWires = {}
  pinValues = {}
  for {componentPinName, machinePinName} in pins
    connectedWires = pinWires[componentPinName] = []
    for wire in wires
      connectedWires.push wire if wire[0] == machinePinName or wire[1] == machinePinName
  wireCount = 0
  for componentPinName, connectedWires in pinWires
    wireCount += connectedWires.length
    pinValues[componentPinName] = connectedWires[0]?.value
  return unless wireCount > 0  # skip circuits with no connected wires, for ease of debugging
  console.error "No component step function for #{circuitType}" unless ComponentStepFunctions[circuitType]?
  ComponentStepFunctions[circuitType].call(runComponent, pinValues)
  for componentPinName, connectedWires in pinWires
    value = pinValues[componentPinName]
    outputWireValues[wire] = value for wire in connectedWires

ComponentStepFunctions =
  clamp: (values) ->

  gate: (values) ->
    {c, e, b} = values
    console.info 'gate', {c, e, b}, values

  ground: (values) ->
    values.gnd = 0
