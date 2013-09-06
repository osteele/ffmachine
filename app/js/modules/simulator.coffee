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
  component.state or= {falling: edgeDetector}
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
  outputs = ComponentStepFunctions[circuitType].call(component.state, pinValues)
  for componentPinName, value of outputs
    value = boolToVolt(value) if value == true or value == false
    outputWireValues[wire] = value for wire in pinWires[componentPinName]

boolToVolt = (value) ->
  switch value
    when true then -3
    when false then 0
    else undefined

voltToBool = (value) ->
  switch value
    when -3 then true
    when 0 then false
    else undefined

# logical complement, at the voltage level
comp = (value) ->
  boolToVolt(!voltToBool(value))

edgeDetector = (init) ->
  previous = init
  return (value) ->
    isEdge = value and not previous
    previous = value
    return isEdge

# inputs are voltages, outputs can be either voltages or booleans
ComponentStepFunctions =
  clamp: ->
    # TODO what does this do?
    {}

  clock: ->
    # TODO make it possible to set the frequency
    @freq = 2
    @counter or= 0
    @counter += 1
    v = @counter % @freq >= @freq / 2
    {'+': v, '-': not v}

  ff: ({'0in': in0, '1in': in1, p}) ->
    # TODO is this right? what does comp do?
    [@s0, @s1] = [in0, in1] if @falling(p)
    {'0': @s0, '1': @s1}

  pa: ({'in': v}) ->
    {'+': v, '-': comp(v)}

  gate: ({e, b}) ->
    @state = e if @falling(b)
    # TODO reset the internal state if yanked
    {c: @state}

  ground: (values) ->
    {gnd: 0}
