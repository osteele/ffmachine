#
# Constants
#

Knobs = [
  [100, 252, 288, '#f0f0f0']
  [100, 382, 0, '#f0f0f0']
  [1700, 252, 292, '#202020']
  [1700, 382, 0, '#202020']
]

#
# Globals
#

@Dispatcher = d3.dispatch 'highlightWire', 'unhighlightWire'

MachineConfiguration =
  modules: []
  terminals: []
  wires: []

Simulator = null

machineViewElement = null
svgSelection = null
knoboffset = null
animateWires = true

@initializeMachineView = () ->
  machineViewElement = document.getElementById('machineView')

  svgSelection = d3.select(machineViewElement)
  createLayer('module-background-layer')
  createLayer('wire-layer')
  createLayer('probe-layer', simulationMode: true)
  createLayer('deletion-target-layer', editMode: true)
  createLayer('terminal-target-layer', editMode: true)
  createLayer('wire-start-target-layer', editMode: true)
  createLayer('wire-end-target-layer', editMode: true)

  updateCircuitView()

createLayer = (layerName, {editMode, simulationMode}={}) ->
  return svgSelection.append('g')
    .classed(layerName, true)
    .classed('edit-mode-layer', editMode)
    .classed('simulation-mode-layer', simulationMode)

getLayer = (layerName) ->
  return svgSelection.select('.' + layerName)


#
# Model
#

# The storage interface calls this
@updateMachineConfiguration = (configuration) ->
  MachineConfiguration.wires = configuration.wires
  MachineConfiguration.modules = configuration.modules ? MachineHardware.modules
  MachineConfiguration.terminals = configuration.terminals ? MachineHardware.terminals

  {wires, modules, terminals} = MachineConfiguration
  terminal.wires = [] for terminal in terminals
  for wire in wires
    terminal.wires.push wire for terminal in wire.terminals

  notifyMachineConfigurationSubscribers()

  imageMargin = 10
  modules = getLayer('module-background-layer').selectAll('.module-background')
    .data(modules, getIdentifier)
  modules.exit().remove()
  moduleGroups = modules.enter()
    .append('g')
    .classed('module-background', true)
    .attr('transform', (m) ->
      {x, y} = m.coordinates
      "translate(#{x}, #{y})")
  moduleGroups.append('rect')
    .attr('width', (m) -> m.dimensions.width)
    .attr('height', (m) -> m.dimensions.height)
  moduleGroups
    .append('image')
    .attr('xlink:href', (m) -> "img/modules/#{m.typeNumber}.png")
    .attr('width', (m) -> m.dimensions.width - 2 * imageMargin)
    .attr('height', (m) -> m.dimensions.height - 2 * imageMargin)
    .attr('transform', "translate(#{imageMargin}, #{imageMargin})")

  getLayer('module-background-layer').selectAll('.module-background')
    .classed('wired', (m) -> m.terminals.some((t) -> t.wires.length > 0))

# This calls the storage interface
notifyMachineConfigurationSubscribers = ->
  machineConfigurationChanged MachineConfiguration
  updateCircuitView()

@createWire = (t1, t2) ->
  terminals = [t1, t2].sort((t1, t2) -> t1.identifier > t2.identifier)
  wire = {
    name: (t.name for t in terminals).join(' ↔ ')
    identifier: (t.identifier for t in terminals).join('-')
    terminals
  }

addWire = (wire) ->
  MachineConfiguration.wires.push wire
  notifyMachineConfigurationSubscribers()

deleteWire = (wire) ->
  MachineConfiguration.wires = (w for w in MachineConfiguration.wires when w != wire)
  notifyMachineConfigurationSubscribers()

@stepSimulator = do ->
  AnimationLength = 6
  animationCounter = 0
  return ->
    Simulator or= new SimulatorClass(MachineConfiguration)
    Simulator.step()
    if animateWires
      animationCounter = (animationCounter + 1) % AnimationLength
      svgSelection.classed("animation-phase-#{i}", animationCounter == i) for i in [0...AnimationLength]
    updateVoltageStates()
    updateHistoryGraphs()


#
# Dragging
#

getWireView = (wire) ->
  svgSelection.selectAll('.wire').filter((d) -> d == wire)

mouseDownAddWire = ->
  startTerminal = findNearbyTerminal(localEvent(d3.event)...)
  endTerminal = null
  return unless startTerminal

  wireView = svgSelection
    .append('path')
    .classed('wire', true)
    .classed('dragging', true)

  window.onmousemove = (e) ->
    mouseCoordinates = localEvent(e)
    wireEndCoordinates = [startTerminal.coordinates, mouseCoordinates]
    wireView
      .attr('d', endpointsToPath(wireEndCoordinates...))
      .attr('stroke', endpointsToColor(wireEndCoordinates...))

    newEndTerminal = findNearbyTerminal(mouseCoordinates...)
    newEndTerminal = null if newEndTerminal == startTerminal
    unless endTerminal == newEndTerminal
      endTerminal = newEndTerminal
      svgSelection.select('.active.end').classed('active', false).classed('end', false)
      d3.select(machineViewElement.getElementById(endTerminal.identifier))
        .classed('active', true).classed('end', true) if endTerminal

  window.onmouseup = (e) ->
    window.onmousemove = null
    window.onmouseup = null
    wireView.remove()
    svgSelection.select('.active').classed('active', false).classed('end', false)
    addWire(createWire(startTerminal, endTerminal)) if endTerminal

closestEndIndex = (wire) ->
  [x, y] = localEvent(d3.event)
  [t1, t2] = wire.terminals
  d1 = lineLength([x,y], t1.coordinates)
  d2 = lineLength([x,y], t2.coordinates)
  (if d1 < d2 then 0 else 1)

dragWireEnd = (wire) ->
  wireView = getWireView(wire)
  wireView.transition().delay(0)
  [t1, t2] = wire.terminals
  wireTerminalIndex = closestEndIndex(wire)
  endTerminal = null

  window.onmousemove = (e) ->
    mouseCoordinates = localEvent(e)
    endpoints = [t1.coordinates, t2.coordinates]
    endpoints[wireTerminalIndex] = mouseCoordinates
    wireView
      .attr('d', endpointsToPath(endpoints...))
      .attr('stroke', endpointsToColor(endpoints...))

    newEndTerminal = findNearbyTerminal(mouseCoordinates...)
    unless endTerminal == newEndTerminal
      endTerminal = newEndTerminal
      svgSelection.select('.active').classed('active', false)
      d3.select(machineViewElement.getElementById(endTerminal.identifier))
        .classed('active', true) if endTerminal

  window.onmouseup = (e) ->
    window.onmousemove = null
    window.onmouseup = null
    svgSelection.select('.active').classed('active', false)
    if endTerminal and wire.terminals[wireTerminalIndex] != endTerminal
      wire.terminals[wireTerminalIndex] = endTerminal
      notifyMachineConfigurationSubscribers()
    else
      # restore the wire position and color
      updateCircuitView()

dragKnob = (e) ->
  knob = Knobs[starty]
  a = knobAngle(knob, localEvent(e)...)
  knoboffset = mod360(knob[2] - a) unless moved
  knob[2] = mod360(a + knoboffset)
  notifyMachineConfigurationSubscribers()

releaseKnob = ->
  knob = Knobs[starty]
  if starty == 0
    knob[2] = findNearest(knob[2], [-72, -36, 0, 36, 72])
  if starty == 2
    knob[2] = findNearest(knob[2], [-68, -23, 22, 67])
  notifyMachineConfigurationSubscribers()


#
# Drawing
#

getIdentifier = (d) ->
  d.identifier

Dispatcher.on 'highlightWire.svg', (wire) ->
  getWireView(wire).classed('highlight', true)

Dispatcher.on 'unhighlightWire.svg', (wire) ->
  getWireView(wire).classed('highlight', false)

updateCircuitView = ->
  terminalTargets = getLayer('terminal-target-layer')
    .selectAll('.terminal-position')
    .data(MachineConfiguration.terminals, getIdentifier)
  terminalTargets.enter().append('circle').classed('terminal-position', true)
    .attr('id', (pos) -> pos.identifier)
    .attr('cx', (pos) -> pos.x)
    .attr('cy', (pos) -> pos.y)
    .attr('r', 3)
    .on('mousedown', mouseDownAddWire)
    .append('title')
      .text((pos) -> "Drag #{pos.name} to another terminal to create a wire.")
  terminalTargets.exit().remove()

  wireViews = getLayer('wire-layer')
    .selectAll('.wire')
    .data(MachineConfiguration.wires, getIdentifier)
  wireViews.enter().append('path').classed('wire', true)
  wireViews.exit().remove()
  wireViews
    .attr('d', wirePath)
    .attr('stroke', wireColor)

  wireTitle = (w) -> "Wire #{w.name}\nClick to delete this wire."
  wireTargets = getLayer('deletion-target-layer').selectAll('.wire-mouse-target')
    .data(MachineConfiguration.wires, getIdentifier)
  wireTargets.enter()
    .append('path')
    .classed('wire-mouse-target', true)
    .on('mouseover', Dispatcher.highlightWire)
    .on('mouseout', Dispatcher.unhighlightWire)
    .on('mousedown', deleteWire)
    .append('title').text(wireTitle)
  wireTargets.exit().remove()
  wireTargets.attr('d', wirePath)

  updateWireEndTargets = (layerName, endIndex) ->
    wireEndTitleText = (w) ->
      "Terminal #{w.terminals[endIndex].name}. " +
      "Drag this end of the wire to move it to another terminal."

    wireEndTargets = getLayer(layerName)
      .selectAll('.wire-end-target')
      .data(w for w in MachineConfiguration.wires when wireLength(w) > 45)
    wireEndTargets.enter()
      .append('circle')
      .classed('wire-end-target', true)
      .attr('r', 10)
      .on('mouseover', Dispatcher.highlightWire)
      .on('mouseout', Dispatcher.unhighlightWire)
      .on('mousedown', dragWireEnd)
      # Uncomment below for cheesy hover animation of wire end
      # .on('mouseover', (wire) ->
      #   targetView = getWireView(wire)
      #   endpoints = wireEndpoints(wire)
      #   endpoints[closestEndIndex(wire)][1] += 10
      #   targetView.transition().delay(0).attr('d', endpointsToPath(endpoints...))
      #   )
      # .on('mouseout', (wire) -> getWireView(wire).transition().delay(0).attr('d', wirePath(wire)) )
      .append('title').text(wireEndTitleText)
    wireEndTargets.exit().remove()
    wireEndTargets
      .attr('cx', (wire) -> wire.terminals[endIndex].coordinates[0])
      .attr('cy', (wire) -> wire.terminals[endIndex].coordinates[1])

  updateWireEndTargets 'wire-start-target-layer', 0
  updateWireEndTargets 'wire-end-target-layer', 1

  updateVoltageStates wiresMaybeMoved: true
  # drawKnobs()

wireEndpoints = (wire) ->
  (terminal.coordinates for terminal in wire.terminals)

wireLength = (wire) ->
  lineLength(wireEndpoints(wire)...)

wirePath = (wire) ->
  endpointsToPath(wireEndpoints(wire)...)

endpointsToPath = ([x1, y1], [x2, y2]) ->
  mx = (x1 + x2) / 2
  my = (y1 + y2) / 2
  dx = (x2 - x1) / 5
  dy = 0
  dx += 5 * (if dx < 0 then -1 else 1)
  [dx, dy] = [0, 5] if Math.abs(y1 - y2) < 10
  ['M', x1, y1, 'Q', x1 + dx, y1 + dy, mx, my, 'T', x2, y2].join(' ')

wireColor = (wire, n) ->
  [t1, t2] = wire.terminals
  endpointsToColor(t1.coordinates, t2.coordinates, n)

endpointsToColor = ([x1, y1], [x2, y2], n) ->
  n or= MachineConfiguration.wires.length
  cmerge(pickColor(x1, y1, x2, y2), n)


#
# Knobs (unused)
#

drawKnobs = ->
  drawKnob k... for k in Knobs

drawKnob = (x, y, a, c) ->
  ctx.fillStyle = c
  ctx.beginPath()
  ctx.arc x + 22 * sin(a), y - 22 * cos(a), 4, 0, Math.PI * 2, true
  ctx.closePath()
  ctx.fill()

knobAngle = (knob, x, y) ->
  arctan2(x - knob[0], knob[1] - y)


#
# Probes
#

wireIsReversed = (w) ->
  [t1, t2] = w.terminals
  t1.output and not t2.output

updateVoltageStates = do ->
  symbols = ['negative', 'ground', 'float']
  values = [-3, 0, undefined]

  terminalVoltageName = (terminal) ->
    value = fromWeak(terminal.value)
    value = undefined unless typeof value == 'number'
    return symbols[values.indexOf(value)]

  isVoltage = (symbolicValue) ->
    (terminal) ->
      terminalVoltageName(terminal) == symbolicValue

  voltageParenthetical = (wireOrTerminal) ->
    value = fromWeak(wireOrTerminal.value)
    return '' if value == undefined
    return "(#{value}V)" unless value == undefined

  updateTerminalVoltages = ->
    nodes = getLayer('probe-layer').selectAll('.terminal-probe')
      .data(MachineConfiguration.terminals, getIdentifier)
    nodes.exit().remove()
    enter = nodes.enter().append('g').classed('terminal-probe', true)
    enter.append('circle')
      .attr('r', 3)
      .attr('transform', (terminal) ->
        pt = terminal.coordinates
        "translate(#{pt[0]}, #{pt[1]})")
      .on('click', graphTerminal)
      .append('title').text((d) -> "Terminal #{d.name}\nClick to trace")
    nodes
      .classed('voltage-negative', isVoltage('negative'))
      .classed('voltage-ground', isVoltage('ground'))
      .classed('voltage-float', isVoltage('float'))
      .select('title').text((t) ->
        "Terminal #{t.name} #{voltageParenthetical(t)}\nClick to trace this terminal.")

  updateWireVoltages = (wiresMaybeMoved) ->
    wires = getLayer('probe-layer').selectAll('.wire').data(MachineConfiguration.wires, getIdentifier)
      .classed('wire', true)
    wires.enter().append('path').classed('wire', true)
      .append('title').text((w) -> "Wire #{w.name}#{voltageParenthetical(w)}")
    wires.exit().remove()
    if wiresMaybeMoved
      wires
        .attr('d', wirePath)
        .attr('stroke', wireColor)
    wires
      .classed('voltage-negative', isVoltage('negative'))
      .classed('voltage-ground', isVoltage('ground'))
      .classed('voltage-float', isVoltage('float'))
      .classed('reversed', wireIsReversed)

  return ({wiresMaybeMoved}={}) ->
    updateWireVoltages(wiresMaybeMoved)
    updateTerminalVoltages()
    updateHistoryGraphs()

VoltageHistoryLength = 200

@updateHistoryGraphs = ->
  for element in document.querySelectorAll('.terminal-history-graph')
    scope = angular.element(element).scope()
    terminal = scope.terminal
    scope.path or= d3.select(element).append('path')
    scope.line or= do ->
      x = d3.scale.linear().domain([-VoltageHistoryLength, 0]).range([0, Number(element.width.baseVal.value)])
      y = d3.scale.linear().domain([-3, 0]).range([0, Number(element.height.baseVal.value)])
      d3.svg.line()
        .x((d) -> x(d.timestamp - Simulator.timestamp))
        .y((d) -> y(if typeof fromWeak(d.value) == 'number' then fromWeak(d.value) else -3/2))
    scope.path.datum(terminal.history or []).attr('d', scope.line)


#
# Utilities
#

cmerge = (c, n) ->
  high = hexd((n >> 8) & 15)
  mid = hexd((n >> 4) & 15)
  low = hexd(n & 15)
  return '#'+ c[1] + high + c[3] + mid + c[5] + low

pickColor = (x1, y1, x2, y2) ->
  dx = x2 - x1
  dy = y2 - y1
  len = Math.sqrt(dx * dx + dy * dy)
  i = Math.round(len/50)
  colors = ['#804010', '#f00000', '#f0a000', '#f0f000', '#00f000', '#0000f0']
  colors[i] ? '#d02090'

findNearest = (n, ls) ->
  diff = Infinity
  res = null
  for l in ls
    d = Math.abs(n - l)
    continue if d > diff
    diff = d
    res = l
  return res

mod360 = (n) ->
  n %= 360
  n += 360 if n < 0
  n -= 360 if n > 180
  return n

@lineLength = (a, b) ->
  dx = b[0] - a[0]
  dy = b[1] - a[1]
  Math.sqrt(dx * dx + dy * dy)

cos = (n) -> Math.cos(n * Math.PI / 180)
sin = (n) -> Math.sin(n * Math.PI / 180)
arctan2 = (x, y) -> Math.atan2(x, y) * 180 / Math.PI
hexd = do (hexdigits='0123456789abcdef') ->
  (n) -> hexdigits[n]

localEvent = (e) ->
  [x, y] = [e.clientX, e.clientY]
  bounds = machineViewElement.getBoundingClientRect()
  x -= bounds.left
  y -= bounds.top
  x /= bounds.width / 900
  y /= bounds.height / 1000
  [x, y]
