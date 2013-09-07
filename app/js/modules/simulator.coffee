HistoryLength = 400  # keep this many historical values

# set these to trace the simulator in the js console
RestrictModules = 0 #['a_0', 'a_1']
Trace = 0
TraceComponents = 0 #['ff']

class @SimulatorClass
  constructor: (@configuration) ->
    @currentTime = 0

  step: ->
    {modules, terminals, wires} = @configuration
    terminalInputs = computeTerminalValues(terminals, wires)
    terminalOutputs = {}
    runModules modules, terminalInputs, terminalOutputs
    updateWireValues wires, terminalOutputs, @currentTime
    @currentTime += 1

runModules = (modules, terminalInputs, terminalOutputs) ->
  modules = (m for m in modules when m.name in RestrictModules) if RestrictModules
  updateModuleOutputs module, terminalInputs, terminalOutputs for module in modules

updateWireValues = (wires, terminalValues, timestamp) ->
  for wire in wires
    values = (terminalValues[terminal.globalTerminalName] for terminal in wire.terminals)
    # console.info (terminal.globalTerminalName for terminal in wires) #, values
    continue unless values.length
    strongValues = (value for value in values when not isWeak(value))
    values = strongValues if strongValues.length
    value = fromWeak(values[0])
    console.info wire.name, '<-', value if Trace
    wire.value = value
    wire.timestamp = timestamp
    wire.trace or= []
    wire.trace.push {timestamp, value: wire.value}
    wire.trace.splice(0, wire.trace.length - HistoryLength) if wire.trace.length > HistoryLength

updateModuleOutputs = (module, terminalInputs, terminalOutputs) ->
  runComponent component, terminalInputs, terminalOutputs for component in module.components

getConnectedWires = (terminal, wires) ->
  return (wire for wire in wires when terminal in wire.terminals)

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
    targetName = componentTerminalName.replace(/^(\d+)(.+)/, '$2$1')
    voltage = terminalInputs[globalTerminalName]
    moduleInputs[targetName] = voltage
    moduleInputs[targetName + '_v'] = voltToBool(voltage)
  console.error "No component step function for #{circuitType}" unless ComponentEquations[circuitType]?
  moduleOutputs = ComponentEquations[circuitType].call(component.state, moduleInputs)

  for {componentTerminalName, globalTerminalName} in terminals
    continue unless componentTerminalName of moduleOutputs
    value = moduleOutputs[componentTerminalName]
    value = boolToVolt(value) if value == true or value == false
    terminalOutputs[globalTerminalName] = value

  console.info component.type, (t.globalTerminalName for t in terminals), moduleInputs, moduleOutputs if trace


#
# Logic <-> Voltage
#

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


#
# Weak assertions
#

class Weak
  constructor: (@value) ->

weak = (value) ->
  value = boolToVolt(value) if value == true or value == false
  new Weak(value)

fromWeak = (value) ->
  value = value.value if value instanceof Weak
  return value

isWeak = (value) ->
  value instanceof Weak


#
# Chacteristic equations
#

# These methods implement the characteristic equations for each component type.
# Inputs are booleans decoded as negative logic levels, unless suffixed by _v.
# Outputs can be either voltage levels (numbers); booleans that are then
# translated to negative logic voltage levels; or weak(value) where value is
# one of the above.
ComponentEquations =
  clamp: ->
    {cl: weak(true)}

  clock: ->
    @frequency or= 2
    @counter or= 0
    @counter += 1
    v = @counter % @frequency >= @frequency / 2
    {'+': v, '-': not v}

  ff: ({in0, in1, comp_v}) ->
    edge = @falling(comp_v)
    @state = !@state if edge
    @state = false if in0 == 0
    @state = true if in1 == 0
    {'0': @state == false, '1': @state == true, p: edge}

  pa: ({'in': input}) ->
    {'+': input, '-': !input}

  inverter: ({e, b}) ->
    {c: if b then e else true}

  gate: ({e, b0, b1, b2, b3, b4, b5}) ->
    any = [b0, b1, b2, b3, b4, b5].some (b) -> b
    {c: if any then e else -3}

  ground: ->
    {gnd: 0}
