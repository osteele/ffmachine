#
# Constants
#

knobs = [
  [100, 252, 288, '#f0f0f0']
  [100, 382, 0, '#f0f0f0']
  [1700, 252, 292, '#202020']
  [1700, 382, 0, '#202020']
]

#
# Globals
#

svgSelection = null
wires = []
knoboffset = null

@setupCanvas = () ->
  wirebuffer = document.getElementById('wirebuffer')
  wirebuffer.width = 1800
  wirebuffer.height = 2000

  svgSelection = d3.select(wirebuffer)
  createLayer('wire-layer')
  createLayer('trace-layer', simulationMode: true)
  createLayer('deletion-target-layer', editMode: true)
  createLayer('terminal-target-layer', editMode: true)
  createLayer('wire-start-target-layer', editMode: true)
  createLayer('wire-end-target-layer', editMode: true)

  getLayer('terminal-target-layer')
    .selectAll('.terminal-position').data(TerminalPositions)
    .enter().append('circle')
    .classed('terminal-position', true)
    .attr('id', (pos) -> pos.machineTerminalName)
    .attr('cx', (pos) -> pos.x / 2)
    .attr('cy', (pos) -> pos.y / 2)
    .attr('r', 3)
    .on('mousedown', mouseDownAddWire)
    .append('title')
      .text((pos) -> "Drag #{pos.name} to another terminal to create a wire.")

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
@setModel = (wires_) ->
  wires = wires_
  updateCircuitView()
  # prevent clicks until the machine is loaded
  # so we don't overwrite the stored data
  document.getElementById('loading').style.display = 'none'

addWire = ([t1, t2]) ->
  wire = [t1.machineTerminalName,t2.machineTerminalName]
  wires.push wire
  updateCircuitView()
  wires_changed wires

deleteWire = (wire) ->
  wires = (w for w in wires when w != wire)
  updateCircuitView()
  wires_changed wires

@stepSimulator = ->
  @Simulator.step @machineState.modules, wires
  updateTraces()


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
      d3.select(wirebuffer.getElementById(endTerminal.machineTerminalName))
        .classed('active', true).classed('end', true) if endTerminal

  window.onmouseup = (e) ->
    window.onmousemove = null
    window.onmouseup = null
    wireView.remove()
    svgSelection.select('.active').classed('active', false).classed('end', false)
    addWire [startTerminal, endTerminal] if endTerminal

closestEndIndex = (wire) ->
  [x, y] = localEvent(d3.event)
  [p1, p2] = wire
  d1 = dist([x,y], getTerminalCoordinates(p1))
  d2 = dist([x,y], getTerminalCoordinates(p2))
  (if d1 < d2 then 0 else 1)

dragWireEnd = (wire) ->
  wireView = getWireView(wire)
  wireView.transition().delay(0)
  [p1, p2] = wire
  wireTerminalIndex = closestEndIndex(wire)
  endTerminal = null

  window.onmousemove = (e) ->
    mouseCoordinates = localEvent(e)
    endpoints = [getTerminalCoordinates(p1), getTerminalCoordinates(p2)]
    endpoints[wireTerminalIndex] = mouseCoordinates
    wireView
      .attr('d', endpointsToPath(endpoints...))
      .attr('stroke', endpointsToColor(endpoints...))
    newEndTerminal = findNearbyTerminal(mouseCoordinates...)
    unless endTerminal == newEndTerminal
      endTerminal = newEndTerminal
      svgSelection.select('.active').classed('active', false)
      d3.select(wirebuffer.getElementById(endTerminal.machineTerminalName))
        .classed('active', true) if endTerminal

  window.onmouseup = (e) ->
    window.onmousemove = null
    window.onmouseup = null
    svgSelection.select('.active').classed('active', false)
    if endTerminal and wire[wireTerminalIndex] != endTerminal.machineTerminalName
      wire[wireTerminalIndex] = endTerminal.machineTerminalName
      updateCircuitView()
      wires_changed wires

dragKnob = (e) ->
  knob = knobs[starty]
  a = knobAngle(knob, localEvent(e)...)
  knoboffset = mod360(knob[2] - a) unless moved
  knob[2] = mod360(a + knoboffset)
  updateCircuitView()
  wires_changed wires

releaseKnob = ->
  knob = knobs[starty]
  if starty == 0
    knob[2] = findNearest(knob[2], [-72, -36, 0, 36, 72])
  if starty == 2
    knob[2] = findNearest(knob[2], [-68, -23, 22, 67])
  updateCircuitView()
  wires_changed wires


#
# Drawing
#

updateCircuitView = ->
  wireViews = getLayer('wire-layer').selectAll('.wire').data(wires)
  wireViews.enter().append('path').classed('wire', true)
  wireViews.exit().remove()
  wireViews
    .attr('d', wirePath)
    .attr('stroke', wireColor)

  wireTargets = getLayer('deletion-target-layer').selectAll('.wire-mouse-target').data(wires)
  wireTargets.enter()
    .append('path')
    .classed('wire-mouse-target', true)
    .on('mousedown', deleteWire)
    .append('title').text('Click to delete this wire.')
  wireTargets.exit().remove()
  wireTargets
    .attr('d', wirePath)

  updateEndPinTargets = (layerName, endIndex) ->
    startPinTargets = getLayer(layerName)
      .selectAll('.wire-end-target')
      .data(w for w in wires when wireLength(w) > 45)
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
      .append('title').text('Click to drag the wire end to another terminal.')
    startPinTargets.exit().remove()
    startPinTargets
      .attr('cx', (wire) -> getTerminalCoordinates(wire[endIndex])[0] / 2)
      .attr('cy', (wire) -> getTerminalCoordinates(wire[endIndex])[1] / 2)

  updateEndPinTargets 'wire-start-target-layer', 0
  updateEndPinTargets 'wire-end-target-layer', 1

  updateTraces()
  # drawKnobs()

wireEndpoints = ([p1, p2]) ->
  [getTerminalCoordinates(p1), getTerminalCoordinates(p2)]

wireLength = (wire) ->
  dist(wireEndpoints(wire)...)

wirePath = (wire) ->
  endpointsToPath(wireEndpoints(wire)...)

endpointsToPath = ([x1, y1], [x2, y2]) ->
  x1 /= 2
  y1 /= 2
  x2 /= 2
  y2 /= 2
  mx = (x1 + x2) / 2
  my = (y1 + y2) / 2
  dx = (x2 - x1) / 5
  dy = 0
  dx += 5 * (if dx < 0 then -1 else 1)
  [dx, dy] = [0, 5] if Math.abs(y1 - y2) < 10
  ['M', x1, y1, 'Q', x1 + dx, y1 + dy, mx, my, 'T', x2, y2].join(' ')

wireColor = ([p1, p2], n) ->
  endpointsToColor(getTerminalCoordinates(p1), getTerminalCoordinates(p2), n)

endpointsToColor = ([x1, y1], [x2, y2], n) ->
  n or= wires.length
  cmerge(pickColor(x1, y1, x2, y2), n)


#
# Knobs (unused)
#

drawKnobs = ->
  drawKnob k... for k in knobs

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

  wireVoltageName = (wire) ->
    value = wire.value
    value = undefined unless typeof value == 'number'
    return symbols[values.indexOf(value)]

  isVoltage = (symbolicValue) ->
    (wire) ->
      wireVoltageName(wire) == symbolicValue

  cyclePinValue = (wire) ->
    wire.value = values[(symbols.indexOf(wireVoltageName(wire)) + 1) % symbols.length]
    updateTraces()

  updateWireEndTraces = (className, endIndex) ->
    nodes = getLayer('trace-layer').selectAll('.' + className).data(wires)
    nodes.exit().remove()
    enter = nodes.enter().append('g').classed(className, true)
    enter.append('circle')
      .attr('r', 10)
      .on('click', showWireTrace)
    nodes
      .classed('voltage-negative', isVoltage('negative'))
      .classed('voltage-ground', isVoltage('ground'))
      .classed('voltage-float', isVoltage('float'))
      .attr('transform', (wire) ->
        pt = getTerminalCoordinates(wire[endIndex])
        "translate(#{pt[0] / 2}, #{pt[1] / 2})")

  return ->
    updateWireEndTraces 'start-trace', 0
    updateWireEndTraces 'end-trace', 1
    showWireTrace()

showWireTrace = do ->
  traceWire = null
  svg = null
  path = null
  line = null
  historyLength = 200
  return (wire) ->
    traceWire = wire if wire
    return unless traceWire
    values = (traceWire.trace or [])
    unless svg
      svg or= d3.select('#wireTrace')
      x = d3.scale.linear().domain([-historyLength, 0]).range([0, 400])
      y = d3.scale.linear().domain([-3, 0]).range([0, 200])
      line = d3.svg.line()
        .x((d) -> x(d.timestamp - Simulator.currentTime))
        .y((d) -> y(if typeof d.value == 'number' then d.value else -3/2))
      path = svg.append('path').datum(values).attr('class', 'line').attr('d', line)
    svg.selectAll('path').datum(values).attr('d', line)


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
  i = Math.round(len/100)
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

@dist = (a, b) ->
  dx = b[0] - a[0]
  dy = b[1] - a[1]
  Math.sqrt(dx * dx + dy * dy)

cos = (n) -> Math.cos(n * Math.PI / 180)
sin = (n) -> Math.sin(n * Math.PI / 180)
arctan2 = (x, y) -> Math.atan2(x, y) * 180 / Math.PI
hexd = do (hexdigits='0123456789abcdef') ->
  (n) -> hexdigits[n]

localx = (gx) -> (gx - wirebuffer.getBoundingClientRect().left) * 1800 / 900
localy = (gy) -> (gy - wirebuffer.getBoundingClientRect().top) * 2000 / 1000
localEvent = (e) -> [localx(e.clientX), localy(e.clientY)]
