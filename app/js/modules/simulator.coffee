HistoryLength = 400  # keep this many historical values

# Set these, to trace the simulator in the js console
Trace =
  modules: 0 #['a9']
  components: 0
  voltageAssignments: 0

class @SimulatorClass
  constructor: (@configuration) ->
    @timestamp = 0

  step: ->
    {modules, terminals, wires} = @configuration
    moduleInputs = computeTerminalValues(terminals, wires)
    moduleOutputs = {}
    runModules modules, moduleInputs, moduleOutputs
    terminal.output = terminal.identifier of moduleOutputs for terminal in terminals
    updateTerminalValues terminals, moduleOutputs, @timestamp
    updateWireValues wires, moduleOutputs, @timestamp
    @timestamp += 1
    # console.info getTerminalByIdentifier('a_8_+').output, getTerminalByIdentifier('b_8_b1').output

runModules = (modules, moduleInputs, moduleOutputs) ->
  modules = (m for m in modules when m.name in Trace.modules) if Trace.modules.length
  updateModuleOutputs module, moduleInputs, moduleOutputs for module in modules

collectBusses = (wires) ->
  bussesByTerminal = {}
  for wire in wires
    busses = _.compact(bussesByTerminal[terminal.identifier] for terminal in wire.terminals)
    bus = switch busses.length
      when 0 then [wire]
      else [wire].concat(busses...)
    for w in bus
      bussesByTerminal[terminal.identifier] = bus for terminal in w.terminals

  wireSets = []
  for __, bus of bussesByTerminal
    wireSets.push bus unless bus in wireSets
  # console.info _.pluck(bus, 'name').sort().join(', ') for bus in wireSets when bus.length > 1
  return ({wires, terminals: _.chain(wires).pluck('terminals').flatten().uniq().value()} for wires in wireSets)

updateTerminalValues = (terminals, moduleOutputs, timestamp) ->
  trace = Trace.voltageAssignments
  console.info "Updating terminal values from", moduleOutputs if trace
  for terminal in terminals
    if terminal.identifier of moduleOutputs
      terminal.value = value = moduleOutputs[terminal.identifier]
      trace = terminal.trace or= []
      trace.push {timestamp, value}
      trace.splice(0, trace.length - HistoryLength) if trace.length > HistoryLength
      console.info "#{terminal.identifier} <- #{value}" if trace

updateWireValues = (wires, moduleOutputs, timestamp) ->
  trace = Trace.voltageAssignments
  console.info "Updating wire values from", moduleOutputs if trace
  propogatedTerminals = []
  propogatedOutputs = {}
  for {wires, terminals} in collectBusses(wires)
    # optimization and debuggability: skip unless something changed
    continue unless terminals.some (terminal) -> terminal.identifier of moduleOutputs
    values = (moduleOutputs[terminal.identifier] ? weak(terminal.value) for terminal in terminals)
    # remove floating values
    values = (value for value in values when value != undefined)
    values = [undefined] if values.length == 0
    # remove weak values if this leaves any strong ones
    strongValues = (value for value in values when not isWeak(value))
    values = strongValues if strongValues.length
    value = fromWeak(values[0])
    console.info "#{_.pluck(wires, 'name').join(',')} <- #{value}" if trace
    for wire in wires
      wire.changed = wire.value? and wire.value != value
      wire.value = value
    for terminal in terminals
      unless terminal.identifier of moduleOutputs or terminal in propogatedTerminals
        propogatedTerminals.push terminal
        propogatedOutputs[terminal.identifier] = value
  updateTerminalValues propogatedTerminals, propogatedOutputs, timestamp

updateModuleOutputs = (module, moduleInputs, moduleOutputs) ->
  runComponent component, moduleInputs, moduleOutputs for component in module.components

getConnectedWires = (terminal, wires) ->
  return (wire for wire in wires when terminal in wire.terminals)

computeTerminalValues = (terminals, wires) ->
  values = {}
  for terminal in terminals
    wireValues = (wire.value for wire in getConnectedWires(terminal, wires))
    values[terminal.identifier] = wireValues[0] if wireValues.length
  return values

runComponent = (component, moduleInputs, moduleOutputs) ->
  {type: componentType, terminalIdentifiers} = component
  component.state or= {
    falling: (n) ->
      s = @prev
      @prev = n
      n < s
  }

  trace = Trace.components == 1 or Trace.components == true or component.type in Trace.components
  # console.info "Computing characteristic equation for", component.name if trace

  componentInputs = {}
  loggedInputs = {}
  for {componentTerminalIdentifier, identifier} in terminalIdentifiers
    targetName = componentTerminalIdentifier.replace(/^(\d+)(.+)/, '$2$1')
    voltage = moduleInputs[identifier]
    componentInputs[targetName] = voltage
    componentInputs[targetName + '_v'] = voltToBool(voltage)
    loggedInputs[targetName] = voltage
  console.error "No component step function for #{componentType}" unless ComponentEquations[componentType]?
  componentOutputs = ComponentEquations[componentType].call(component.state, componentInputs)

  for {componentTerminalIdentifier, identifier} in terminalIdentifiers
    continue unless componentTerminalIdentifier of componentOutputs
    value = componentOutputs[componentTerminalIdentifier]
    value = boolToVolt(value) if value == true or value == false
    moduleOutputs[identifier] = value

  if trace
    console.info component.name,
      "\n\tTerminals:", (t.identifier for t in terminalIdentifiers).join(', ')
      "\n\tInputs: ", loggedInputs, "\n\tOutputs:", componentOutputs


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
  return value if value instanceof Weak
  value = boolToVolt(value) if value == true or value == false
  new Weak(value)

@fromWeak = (value) ->
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
