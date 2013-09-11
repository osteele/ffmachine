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

MachineConfiguration =
  modules: []
  terminals: []
  wires: []

Simulator = null

machineViewElement = null
svgSelection = null
knoboffset = null

@initializeMachineView = () ->
  machineViewElement = document.getElementById('machineView')

  svgSelection = d3.select(machineViewElement)
  createLayer('wire-layer')
  createLayer('trace-layer', simulationMode: true)
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
  notifyMachineConfigurationSubscribers()

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
    animationCounter = (animationCounter + 1) % AnimationLength
    # svgSelection.classed("animation-phase-#{i}", animationCounter == i) for i in [0...AnimationLength]
    updateTraces()
    updateTerminalTraceViews()


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

getIdentifier = (d) -> d.identifier

updateCircuitView = ->
  # getIdentifier = (d) -> d.identifier
  # getIdentifier = null unless wiringChanged

  terminalTargets = getLayer('terminal-target-layer')
    .selectAll('.terminal-position').data(MachineConfiguration.terminals, getIdentifier)
  terminalTargets.enter().append('circle').classed('terminal-position', true)
  terminalTargets.exit().remove()
  terminalTargets
    .attr('id', (pos) -> pos.identifier)
    .attr('cx', (pos) -> pos.x)
    .attr('cy', (pos) -> pos.y)
    .attr('r', 3)
    .on('mousedown', mouseDownAddWire)
    .append('title')
      .text((pos) -> "Drag #{pos.identifier} to another terminal to create a wire.")

  wireViews = getLayer('wire-layer').selectAll('.wire').data(MachineConfiguration.wires, getIdentifier)
  wireViews.enter().append('path').classed('wire', true)
  wireViews.exit().remove()
  wireViews
    .attr('d', wirePath)
    .attr('stroke', wireColor)

  wireTitle = (w) ->
    "Wire #{w.name}\nClick to delete this wire."
  wireTargets = getLayer('deletion-target-layer').selectAll('.wire-mouse-target')
    .data(MachineConfiguration.wires, getIdentifier)
  wireTargets.enter()
    .append('path')
    .classed('wire-mouse-target', true)
    .on('mousedown', deleteWire)
    .append('title').text(wireTitle)
  wireTargets.exit().remove()
  wireTargets
    .attr('d', wirePath)

  updateEndPinTargets = (layerName, endIndex) ->
    terminalTitleText = (w) ->
      "Terminal #{w.terminals[endIndex].name}. " +
      "Drag this end of the wire to move it to another terminal."

    startPinTargets = getLayer(layerName)
      .selectAll('.wire-end-target')
      .data(w for w in MachineConfiguration.wires when wireLength(w) > 45)
    startPinTargets.enter()
      .append('circle')
      .classed('wire-end-target', true)
      .attr('r', 10)
      .on('mousedown', dragWireEnd)
      # Uncomment below for cheesy hover animation of wire end
      # .on('mouseover', (wire) ->
      #   targetView = getWireView(wire)
      #   endpoints = wireEndpoints(wire)
      #   endpoints[closestEndIndex(wire)][1] += 10
      #   targetView.transition().delay(0).attr('d', endpointsToPath(endpoints...))
      #   )
      # .on('mouseout', (wire) -> getWireView(wire).transition().delay(0).attr('d', wirePath(wire)) )
      .append('title').text(terminalTitleText)
    startPinTargets.exit().remove()
    startPinTargets
      .attr('cx', (wire) -> wire.terminals[endIndex].coordinates[0])
      .attr('cy', (wire) -> wire.terminals[endIndex].coordinates[1])

  updateEndPinTargets 'wire-start-target-layer', 0
  updateEndPinTargets 'wire-end-target-layer', 1

  updateTraces wiresMaybeMoved: true
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
# Traces
#

updateTraces = do ->
  symbols = ['negative', 'ground', 'float']
  values = [-3, 0, undefined]

  terminalVoltageName = (terminal) ->
    value = fromWeak(terminal.value)
    value = undefined unless typeof value == 'number'
    return symbols[values.indexOf(value)]

  isVoltage = (symbolicValue) ->
    (terminal) ->
      terminalVoltageName(terminal) == symbolicValue

  # cyclePinValue = (terminal) ->
  #   terminal.value = values[(symbols.indexOf(terminalVoltageName(terminal)) + 1) % symbols.length]
  #   updateTraces()

  voltageParenthetical = (wireOrTerminal) ->
    value = fromWeak(wireOrTerminal.value)
    return '' if value == undefined
    return "(#{value}V)" unless value == undefined

  updateTerminalTraces = ->
    nodes = getLayer('trace-layer').selectAll('.terminal-trace')
      .data(MachineConfiguration.terminals, getIdentifier)
    nodes.exit().remove()
    enter = nodes.enter().append('g').classed('terminal-trace', true)
    enter.append('circle')
      .attr('r', 3)
      .attr('transform', (terminal) ->
        pt = terminal.coordinates
        "translate(#{pt[0]}, #{pt[1]})")
      .on('click', traceTerminal)
      .append('title').text((d) -> "Terminal #{d.identifier}\nClick to trace")
    nodes
      .classed('voltage-negative', isVoltage('negative'))
      .classed('voltage-ground', isVoltage('ground'))
      .classed('voltage-float', isVoltage('float'))
      .select('title').text((t) ->
        "Terminal #{t.identifier} #{voltageParenthetical(t)}\nClick to trace this terminal.")

  updateWireTraces = (wiresMaybeMoved) ->
    wires = getLayer('trace-layer').selectAll('.wire').data(MachineConfiguration.wires, getIdentifier)
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
      .classed('reversed', (w) -> !w.terminals[0].output)

  return ({wiresMaybeMoved}={}) ->
    updateWireTraces(wiresMaybeMoved)
    updateTerminalTraces()
    updateTerminalTraceViews()

TraceHistoryLength = 200

@updateTerminalTraceViews = ->
  for element in document.querySelectorAll('.terminal-trace-view')
    scope = angular.element(element).scope()
    terminal = scope.terminal
    values = (terminal.trace or [])
    unless scope.path
      x = d3.scale.linear().domain([-TraceHistoryLength, 0]).range([0, Number(element.width.baseVal.value)])
      y = d3.scale.linear().domain([-3, 0]).range([0, Number(element.height.baseVal.value)])
      line = scope.line = d3.svg.line()
        .x((d) -> x(d.timestamp - Simulator.timestamp))
        .y((d) -> y(if typeof fromWeak(d.value) == 'number' then fromWeak(d.value) else -3/2))
      svg = d3.select(element)
      scope.path = svg.append('path')#.attr('d', line)
    scope.path.datum(values).attr('d', scope.line)


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

localx = (gx) -> (gx - machineViewElement.getBoundingClientRect().left)
localy = (gy) -> (gy - machineViewElement.getBoundingClientRect().top)
localEvent = (e) -> [localx(e.clientX), localy(e.clientY)]
