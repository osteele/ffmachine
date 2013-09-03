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

wirebuffer = null
ffholes = null
wires = []
moved = startpin = knoboffset = null

@setupCanvas = () ->
  wirebuffer = document.getElementById('wirebuffer')
  wirebuffer.width = 1800
  wirebuffer.height = 2000
  wirebuffer.onmousedown = mouseDown
  redraw()


#
# Model
#

# The storage interface calls this
@set_wires = (wires_) ->
  wires = wires_
  redraw()

add_wire = (wire) ->
  wires.push wire
  redraw()
  wires_changed wires

delete_wire = (wire) ->
  wires = (w for w in wires when w.join(' ') != wire.join(' '))
  redraw()
  wires_changed wires


#
# Dragging
#

mouseDown = (e) ->
  e.preventDefault()
  startpin = xyToPinout(localEvent(e)...)
  if startpin
    d3.select(wirebuffer)
      .append('path')
      .classed('wire', true)
      .classed('dragging', true)
      .attr('stroke', 'red')
    window.onmousemove = newWireMouseMove
    window.onmouseup = newWireMouseUp

clickWillDelete = (wire) ->
  [x, y] = localEvent(d3.event)
  [p1, p2] = wire
  d1 = dist([x,y], pinoutToXy(p1))
  d2 = dist([x,y], pinoutToXy(p2))
  return Math.min(d1, d2) > 20 or 45 > dist(pinoutToXy(p1), pinoutToXy(p2))

clickWire = (wire) ->
  [x, y] = localEvent(d3.event)
  [p1, p2] = wire
  d1 = dist([x,y], pinoutToXy(p1))
  d2 = dist([x,y], pinoutToXy(p2))
  if clickWillDelete(wire)
    delete_wire wire
    return
  pinIndex = (if d1 < d2 then 0 else 1)
  view = this
  d3.select(view).classed 'repinning', true

  window.onmousemove = (e) ->
    endpoints = [pinoutToXy(p1), pinoutToXy(p2)]
    endpoints[pinIndex] = localEvent(e)
    d3.select(view)
      .attr('d', endpointsToPath(endpoints...))
      .attr('stroke', endpointsToColor(endpoints...))

  window.onmouseup = (e) ->
    d3.select(view).classed 'repinning', false
    window.onmousemove = null
    window.onmouseup = null
    endPin = xyToPinout(localEvent(e)...)
    if endPin and wire[pinIndex] != endPin
      wire[pinIndex] = endPin
      redraw()
      wires_changed wires
    else
      redraw()

newWireMouseMove = (e) ->
  endpoints = [pinoutToXy(startpin), localEvent(e)]
  d3.select(wirebuffer).select('.dragging')
    .attr('d', endpointsToPath(endpoints...))
    .attr('stroke', endpointsToColor(endpoints...))

newWireMouseUp = (e) ->
  window.onmousemove = null
  window.onmouseup = null
  d3.select(wirebuffer).select('.dragging').remove()
  endpin = xyToPinout(localEvent(e)...)
  add_wire [startpin, endpin] if endpin and endpin != startpin

dragKnob = (e) ->
  knob = knobs[starty]
  a = knobAngle(knob, localEvent(e)...)
  knoboffset = mod360(knob[2] - a) unless moved
  knob[2] = mod360(a + knoboffset)
  redraw()
  wires_changed wires

releaseKnob = ->
  knob = knobs[starty]
  if starty == 0
    knob[2] = findNearest(knob[2], [-72, -36, 0, 36, 72])
  if starty == 2
    knob[2] = findNearest(knob[2], [-68, -23, 22, 67])
  redraw()
  wires_changed wires


#
# Drawing
#

redraw = ->
  wire_views = d3.select(wirebuffer)
    .selectAll('.wire')
    .remove()

  wire_views = d3.select(wirebuffer)
    .selectAll('.wire')
    .data(wires)

  setClasses = (w) ->
    d3.select(this).classed 'delete', clickWillDelete(w)

  wire_views.enter().append('path')
      .classed('wire', true)
      .attr('d', wirePath)
      .attr('stroke', wireColor)
      .on('mousedown', clickWire)
      .on('mouseenter', setClasses)
      .on('mousemove', setClasses)
      .on('mouseeexit', -> d3.select(this).classed 'delete', false)

  # wire_views.exit().remove()

  # drawKnobs()

wirePath = ([p1, p2]) ->
  endpointsToPath(pinoutToXy(p1), pinoutToXy(p2))

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
  endpointsToColor(pinoutToXy(p1), pinoutToXy(p2))

endpointsToColor = ([x1, y1], [x2, y2], n) ->
  n or= wires.length
  cmerge(pickColor(x1, y1, x2, y2), n)

drawKnobs = ->
  drawKnob k... for k in knobs

drawKnob = (x, y, a, c) ->
  ctx.fillStyle = c
  ctx.beginPath()
  ctx.arc x + 22 * sin(a), y - 22 * cos(a), 4, 0, Math.PI * 2, true
  ctx.closePath()
  ctx.fill()


#
# Etc.
#

knobAngle = (knob, x, y) ->
  arctan2(x - knob[0], knob[1] - y)

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
