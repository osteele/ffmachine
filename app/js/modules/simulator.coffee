HistoryLength = 400  # keep this many historical values

# set these to trace the simulator in the js console
RestrictModules = 0 # ['a_8']
Trace = 0
TraceComponents = 0 # []

class @SimulatorClass
  constructor: (@configuration) ->
    @currentTime = 0

  step: ->
    {modules, terminals, wires} = @configuration
    moduleInputs = computeTerminalValues(terminals, wires)
    moduleOutputs = {}
    runModules modules, moduleInputs, moduleOutputs
    updateTerminalValues terminals, moduleOutputs
    updateWireValues wires, moduleOutputs, @currentTime
    @currentTime += 1

runModules = (modules, moduleInputs, moduleOutputs) ->
  modules = (m for m in modules when m.name in RestrictModules) if RestrictModules.length
  updateModuleOutputs module, moduleInputs, moduleOutputs for module in modules

collectBusses = (wires) ->
  bussesByTerminal = {}
  for wire in wires
    busses = _.compact(bussesByTerminal[terminal.globalTerminalName] for terminal in wire.terminals)
    bus = switch busses.length
      when 0 then [wire]
      else [wire].concat(busses...)
    bussesByTerminal[terminal.globalTerminalName] = bus for terminal in wire.terminals

  wireSets = []
  for __, bus of bussesByTerminal
    wireSets.push bus unless bus in wireSets
  return ({wires, terminals: _.chain(wires).pluck('terminals').flatten().uniq().value()} for wires in wireSets)

updateTerminalValues = (terminals, moduleOutputs) ->
  for terminal in terminals
    if terminal.globalTerminalName of moduleOutputs
      terminal.value = moduleOutputs[terminal.globalTerminalName]

updateWireValues = (wires, moduleOutputs, timestamp) ->
  for {wires, terminals} in collectBusses(wires)
    # optimization and debuggability: skip unless something changed
    continue unless terminals.some (terminal) -> terminal.globalTerminalName of moduleOutputs
    values = (terminal.value for terminal in terminals)
    # remove floating values
    values = (value for value in values when value != undefined)
    values = [undefined] if values.length == 0
    # remove weak values if this leaves any strong ones
    strongValues = (value for value in values when not isWeak(value))
    values = strongValues if strongValues.length
    value = fromWeak(values[0])
    console.info "#{_.pluck(wires, 'name').join(',')} <- #{value}" if Trace and value != undefined
    for wire in wires
      wire.value = value
      wire.timestamp = timestamp
      wire.trace or= []
      wire.trace.push {timestamp, value: wire.value}
      wire.trace.splice(0, wire.trace.length - HistoryLength) if wire.trace.length > HistoryLength

updateModuleOutputs = (module, moduleInputs, moduleOutputs) ->
  runComponent component, moduleInputs, moduleOutputs for component in module.components

getConnectedWires = (terminal, wires) ->
  return (wire for wire in wires when terminal in wire.terminals)

computeTerminalValues = (terminals, wires) ->
  values = {}
  for terminal in terminals
    wireValues = (wire.value for wire in getConnectedWires(terminal, wires))
    values[terminal.globalTerminalName] = wireValues[0] if wireValues.length
  return values

runComponent = (component, moduleInputs, moduleOutputs) ->
  trace = TraceComponents == 1 or TraceComponents == true or component.type in TraceComponents
  {type: circuitType, terminals} = component
  component.state or= {
    falling: (n) ->
      s = @prev
      @prev = n
      n < s
  }

  componentInputs = {}
  for {componentTerminalName, globalTerminalName} in terminals
    targetName = componentTerminalName.replace(/^(\d+)(.+)/, '$2$1')
    voltage = moduleInputs[globalTerminalName]
    componentInputs[targetName] = voltage
    componentInputs[targetName + '_v'] = voltToBool(voltage)
  console.error "No component step function for #{circuitType}" unless ComponentEquations[circuitType]?
  componentOutputs = ComponentEquations[circuitType].call(component.state, componentInputs)

  for {componentTerminalName, globalTerminalName} in terminals
    continue unless componentTerminalName of componentOutputs
    value = componentOutputs[componentTerminalName]
    value = boolToVolt(value) if value == true or value == false
    moduleOutputs[globalTerminalName] = value

  console.info component.type, (t.globalTerminalName for t in terminals), componentInputs, componentOutputs if trace


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
