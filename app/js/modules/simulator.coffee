@Simulator =
  step: (modules, wires) ->
    outputWireValues = {}
    updateModules modules, wires, outputWireValues
    updateWires wires, outputWireValues

updateModules = (modules, wires, outputWireValues) ->
  # modules = modules.filter (({name}) -> name == "a_1")
  updateModule module, wires, outputWireValues for module in modules

updateWires = (wires, outputWireValues) ->
  for wire in wires
    wire.trace or= []
    wire.trace.push wire.value
    wire.value = outputWireValues[wire] if wire of outputWireValues

updateModule = (module, wires, outputWireValues) ->
  runComponent component, wires, outputWireValues for component in module.components

runComponent = (component, wires, outputWireValues) ->
  {type: circuitType, pins} = component
  component.state or= {}
  pinWires = {}
  pinValues = {}
  for {componentPinName, machinePinName} in pins
    connectedWires = pinWires[componentPinName] = []
    for wire in wires
      connectedWires.push wire if wire[0] == machinePinName or wire[1] == machinePinName
  wireCount = 0
  for componentPinName, connectedWires of pinWires
    wireCount += connectedWires.length
    pinValues[componentPinName] = connectedWires[0]?.value
  # skip circuits with no connected wires, for ease of debugging:
  # return unless circuitType == 'clock' or wireCount > 0
  console.error "No component step function for #{circuitType}" unless ComponentStepFunctions[circuitType]?
  ComponentStepFunctions[circuitType].call(component.state, pinValues)
  for componentPinName, connectedWires of pinWires
    value = pinValues[componentPinName]
    outputWireValues[wire] = value for wire in connectedWires

# logical complement
comp = (value) ->
  return -3 - value

boolToVolt = (value) ->
  if value then -3 else 0

edgeDetector = (init) ->
  previous = init
  return (value) ->
    isEdge = value and not previous
    previous = value
    return isEdge

# TODO add a layer that defines these in terms of logic values instead of voltages?
ComponentStepFunctions =
  clamp: (values) ->
    # TODO what does this do?

  clock: (values) ->
    @counter or= 0
    @counter += 1
    # TODO make it possible to set the frequency
    freq = 2
    v = boolToVolt(@counter % freq >= freq / 2)
    values['-'] = comp(v)
    values['+'] = v

  ff: (values) ->
    # TODO 'p', '0', '1', '0in', '1in', 'comp'

  pa: (values) ->
    v = values['in']
    values['-'] = comp(v)
    values['+'] = v

  gate: (values) ->
    {c, e, b} = values
    @pulse or= edgeDetector(b)
    @v = b if @pulse(b)
    # TODO reset the internal state if yanked
    values.c = @v

  ground: (values) ->
    values.gnd = 0
