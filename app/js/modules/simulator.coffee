@Simulator =
  step: (modules, wires) ->
    @currentTime or= 0
    outputWireValues = {}
    updateModules modules, wires, outputWireValues
    updateWires wires, outputWireValues, @currentTime
    @currentTime += 1

HistoryLength = 400

updateModules = (modules, wires, outputWireValues) ->
  # modules = modules.filter (({name}) -> name == "a_1" or name == "a_0") # or name == "a_2")
  updateModule module, wires, outputWireValues for module in modules

updateWires = (wires, outputWireValues, timestamp) ->
  for wire in wires
    wire.trace or= []
    wire.trace.push {timestamp, value: wire.value}
    wire.trace = wire.trace.slice(wire.trace.length - HistoryLength) if wire.trace.length > HistoryLength
    wire.value = outputWireValues[wire] if wire of outputWireValues

updateModule = (module, wires, outputWireValues) ->
  runComponent component, wires, outputWireValues for component in module.components

runComponent = (component, wires, outputWireValues) ->
  {type: circuitType, terminals} = component
  component.state or= {
    falling: (n) ->
      s = @prev
      @prev = n
      n < s
  }

  terminalWires = {}
  for {componentTerminalName, machineTerminalName} in terminals
    connectedWires = terminalWires[componentTerminalName] = []
    for wire in wires
      connectedWires.push wire if wire[0] == machineTerminalName or wire[1] == machineTerminalName

  wireCount = 0
  for componentTerminalName, connectedWires of terminalWires
    wireCount += connectedWires.length

  terminalValues = {}
  for componentTerminalName, connectedWires of terminalWires
    terminalValues[componentTerminalName] = connectedWires[0]?.value

  # skip circuits with no connected wires, for ease of debugging:
  # return unless circuitType == 'clock' or wireCount > 0
  console.error "No component step function for #{circuitType}" unless ComponentStepFunctions[circuitType]?
  outputs = ComponentStepFunctions[circuitType].call(component.state, terminalValues)

  for componentTerminalName, value of outputs
    value = boolToVolt(value) if value == true or value == false
    outputWireValues[wire] = value for wire in terminalWires[componentTerminalName]

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
    {}

  clock: ->
    @frequency or= 2
    @counter or= 0
    @counter += 1
    v = @counter % @frequency >= @frequency / 2
    {'+': v, '-': not v}

  ff: ({'0in': in0, '1in': in1, comp}) ->
    edge = @falling(comp)
    @state = !@state if edge
    @state = false if in0 == 0
    @state = true if in1 == 0
    {'0': @state == false, '1': @state == true, p: edge}

  pa: ({'in': input}) ->
    {'+': input, '-': comp(input)}

  inverter: ({e, b}) ->
    {c: if b < 0 then e else -3}

  gate: ({e, b0, b1, b2, b3, b4, b5}) ->
    any = [b0, b1, b2, b3, b4, b5].some (b) -> b < 0
    {c: if any < 0 then e else -3}

  ground: ->
    {gnd: 0}
