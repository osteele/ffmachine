HistoryLength = 400  # keep this many historical values

# set these to trace the simulator in the js console
RestrictModules = 0 #['a_0', 'a_1']
Trace = 0
TraceComponents = 0 #['ff']

@Simulator =
  step: (modules, wires) ->
    @currentTime or= 0
    terminals = [].concat((module.terminals for module in modules)...)
    terminalInputs = computeTerminalValues(terminals, wires)
    terminalOutputs = {}
    runModules modules, terminalInputs, terminalOutputs
    updateWireValues wires, terminalOutputs, @currentTime
    @currentTime += 1

runModules = (modules, terminalInputs, terminalOutputs) ->
  modules = (m for m in modules when m.name in RestrictModules) if RestrictModules
  updateModuleOutputs module, terminalInputs, terminalOutputs for module in modules

getWireName = (wire) ->
  (terminal.globalTerminalName for terminal in wire).join('->')

updateWireValues = (wires, terminalOutputs, timestamp) ->
  for globalTerminalName, value of terminalOutputs
    for wire in getConnectedWires(findTerminalByName(globalTerminalName), wires)
      console.info getWireName(wire), '<-', value if Trace
      wire.value = value
      wire.timestamp = timestamp
      wire.trace or= []
      wire.trace.push {timestamp, value: wire.value}
      wire.trace.splice(0, wire.trace.length - HistoryLength) if wire.trace.length > HistoryLength

updateModuleOutputs = (module, terminalInputs, terminalOutputs) ->
  runComponent component, terminalInputs, terminalOutputs for component in module.components

getConnectedWires = (terminal, wires) ->
  return (wire for wire in wires when terminal in wire)

computeTerminalValues = (terminals, wires) ->
  values = {}
  for terminal in terminals
    wireValues = (wire.value for wire in getConnectedWires(terminal, wires))
    values[terminal.globalTerminalName] = wireValues[0] if wireValues.length
  return values

runComponent = (component, terminalInputs, terminalOutputs) ->
  trace = component.type in TraceComponents
  {type: circuitType, terminals} = component
  component.state or= {
    falling: (n) ->
      s = @prev
      @prev = n
      n < s
  }

  moduleInputs = {}
  for {componentTerminalName, globalTerminalName} in terminals
    moduleInputs[componentTerminalName] = terminalInputs[globalTerminalName]
  console.error "No component step function for #{circuitType}" unless ComponentStepFunctions[circuitType]?
  moduleOutputs = ComponentStepFunctions[circuitType].call(component.state, moduleInputs)

  for {componentTerminalName, globalTerminalName} in terminals
    continue unless componentTerminalName of moduleOutputs
    value = moduleOutputs[componentTerminalName]
    value = boolToVolt(value) if value == true or value == false
    terminalOutputs[globalTerminalName] = value

  console.info component.type, (t.globalTerminalName for t in terminals), moduleInputs, moduleOutputs if trace

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
