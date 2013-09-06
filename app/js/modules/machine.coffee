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
  createLayer('pin-target-layer', editMode: true)
  createLayer('wire-start-target-layer', editMode: true)
  createLayer('wire-end-target-layer', editMode: true)

  getLayer('pin-target-layer')
    .selectAll('.hole').data(holePositions())
    .enter().append('circle')
    .classed('hole', true)
    .attr('id', (pos) -> pos.name)
    .attr('cx', (pos) -> pos.x / 2)
    .attr('cy', (pos) -> pos.y / 2)
    .attr('r', 3)
    .on('mousedown', mouseDownAddWire)
    .append('title')
      .text((pos) -> "Drag #{pos.name} to another pin to create a wire.")

  updateWires()

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
  updateWires()
  # prevent clicks until the machine is loaded
  # so we don't overwrite the stored data
  document.getElementById('loading').style.display = 'none'

addWire = (wire) ->
  wires.push wire
  updateWires()
  wires_changed wires

deleteWire = (wire) ->
  wires = (w for w in wires when w != wire)
  updateWires()
  wires_changed wires

@stepSimulator = ->
  @Simulator.step @machineState.modules, wires
  updateTraces()


#
# Dragging
#

mouseDownAddWire = ->
  startpin = xyToPinout(localEvent(d3.event)...)
  return unless startpin

  # d3.select(wirebuffer.getElementById(startpin)).classed 'active', true
  lastEndPin = null

  view = svgSelection
    .append('path')
    .classed('wire', true)
    .classed('dragging', true)
    .attr('stroke', 'red')

  window.onmousemove = (e) ->
    endpoints = [pinoutToXy(startpin), localEvent(e)]
    endpin = xyToPinout(localEvent(e)...)
    endpin = null if endpin == startpin
    unless lastEndPin == endpin
      lastEndPin = endpin
      svgSelection.select('.active.end').classed('active', false).classed('end', false)
      d3.select(wirebuffer.getElementById(endpin)).classed('active', true).classed('end', true) if endpin
    view
      .attr('d', endpointsToPath(endpoints...))
      .attr('stroke', endpointsToColor(endpoints...))

  window.onmouseup = (e) ->
    window.onmousemove = null
    window.onmouseup = null
    view.remove()
    svgSelection.select('.active').classed('active', false).classed('end', false)
    endpin = xyToPinout(localEvent(e)...)
    addWire [startpin, endpin] if endpin and endpin != startpin

closestEndIndex = (wire) ->
  [x, y] = localEvent(d3.event)
  [p1, p2] = wire
  d1 = dist([x,y], pinoutToXy(p1))
  d2 = dist([x,y], pinoutToXy(p2))
  (if d1 < d2 then 0 else 1)

wireView = (wire) ->
  svgSelection.selectAll('.wire').filter((d) -> d == wire)

dragWireEnd = (wire) ->
  view = wireView(wire)
  view.transition().delay(0)
  [p1, p2] = wire
  pinIndex = closestEndIndex(wire)
  lastEndPin = null

  window.onmousemove = (e) ->
    endpoints = [pinoutToXy(p1), pinoutToXy(p2)]
    endpoints[pinIndex] = localEvent(e)
    endPin = xyToPinout(localEvent(e)...)
    unless lastEndPin == endPin
      lastEndPin = endPin
      svgSelection.select('.active').classed('active', false)
      d3.select(wirebuffer.getElementById(endPin)).classed('active', true) if endPin
    view.attr 'stroke', 'blue'
    view
      .attr('d', endpointsToPath(endpoints...))
      .attr('stroke', endpointsToColor(endpoints...))

  window.onmouseup = (e) ->
    view.classed 'repinning', false
    svgSelection.select('.active').classed('active', false)
    window.onmousemove = null
    window.onmouseup = null
    endPin = xyToPinout(localEvent(e)...)
    if endPin and wire[pinIndex] != endPin
      wire[pinIndex] = endPin
      updateWires()
      wires_changed wires
    else
      updateWires()

dragKnob = (e) ->
  knob = knobs[starty]
  a = knobAngle(knob, localEvent(e)...)
  knoboffset = mod360(knob[2] - a) unless moved
  knob[2] = mod360(a + knoboffset)
  updateWires()
  wires_changed wires

releaseKnob = ->
  knob = knobs[starty]
  if starty == 0
    knob[2] = findNearest(knob[2], [-72, -36, 0, 36, 72])
  if starty == 2
    knob[2] = findNearest(knob[2], [-68, -23, 22, 67])
  updateWires()
  wires_changed wires


#
# Drawing
#

updateWires = ->
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
      #   targetView = wireView(wire)
      #   endpoints = wireEndpoints(wire)
      #   endpoints[closestEndIndex(wire)][1] += 10
      #   targetView.transition().delay(0).attr('d', endpointsToPath(endpoints...))
      #   )
      # .on('mouseout', (wire) -> wireView(wire).transition().delay(0).attr('d', wirePath(wire)) )
      .append('title').text('Click to drag the wire end to another pin.')
    startPinTargets.exit().remove()
    startPinTargets
      .attr('cx', (wire) -> pinoutToXy(wire[endIndex])[0] / 2)
      .attr('cy', (wire) -> pinoutToXy(wire[endIndex])[1] / 2)

  updateEndPinTargets 'wire-start-target-layer', 0
  updateEndPinTargets 'wire-end-target-layer', 1

  updateTraces()
  # drawKnobs()

wireEndpoints = ([p1, p2]) ->
  [pinoutToXy(p1), pinoutToXy(p2)]

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
  endpointsToColor(pinoutToXy(p1), pinoutToXy(p2), n)

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
      .on('click', cyclePinValue)
    nodes
      .classed('voltage-negative', isVoltage('negative'))
      .classed('voltage-ground', isVoltage('ground'))
      .classed('voltage-float', isVoltage('float'))
      .attr('transform', (wire) ->
        pt = pinoutToXy(wire[endIndex])
        "translate(#{pt[0] / 2}, #{pt[1] / 2})")

  return ->
    updateWireEndTraces 'start-trace', 0
    updateWireEndTraces 'end-trace', 1


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
