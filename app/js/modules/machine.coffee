filename = null
readonly = null
sync = null
wirebuffer = ctx = null
ffholes = null
wires = []
moved = startpin = knoboffset = null
knobs = [
  [100, 252, 288, '#f0f0f0']
  [100, 382, 0, '#f0f0f0']
  [1700, 252, 292, '#202020']
  [1700, 382, 0, '#202020']
]


setup = () ->
  urlvars = getUrlVars()
  filename = urlvars['name']
  readonly = urlvars['readonly']
  sync = urlvars['sync']
  wirebuffer = document.getElementById('wirebuffer')
  wirebuffer.width = 1800
  wirebuffer.height = 2000
  ctx = wirebuffer.getContext('2d')
  ctx.lineCap = 'round'
  wirebuffer.onmousedown = (e) -> mouseDown(e)
  window.onmouseup = (e) -> mouseUp(e)
  window.onkeypress = (e) -> handleKey(e)
  loadWires filename if filename
  redraw()

#
# User Interface
#

mouseDown = (e) ->
  e.preventDefault()
  moved = false
  startx = -1
  starty = -1
  x = localx(e.clientX)
  y = localy(e.clientY)
  startpin = xyToPinout(x,y)
  if startpin
    window.onmousemove = (e) -> mouseMove(e)
  else
    wn = bufferPixel(x,y)
    pickUpWire(wn, x, y) if wn != 0

pickUpWire = (wn, x, y) ->
  w = wires[wn - 1]
  wires.splice(wn - 1,1)
  d1 = dist([x,y], pinoutToXy(w[0]))
  d2 = dist([x,y], pinoutToXy(w[1]))
  startpin = (if d1 > d2 then w[0] else w[1])
  redraw()
  submit filename if sync and not readonly
  drawLine pinoutToXy(startpin), [x, y], 0
  window.onmousemove = (e) -> mouseMove(e)

mouseMove = (e) ->
  moved = true
  redraw()
  submit filename if sync and not readonly
  drawLine pinoutToXy(startpin), [localx(e.clientX), localy(e.clientY)], 0

dragKnob = (e) ->
  knob = knobs[starty]
  a = knobAngle(knob, localx(e.clientX), localy(e.clientY))
  if !moved
    moved = true
    knoboffset = mod360(knob[2]-a)
  knob[2] = mod360(a+knoboffset)
  redraw()
  submit filename if sync and not readonly

mouseUp = (e) ->
  window.onmousemove = undefined
  # if(!moved){mouseClicked(e); return;}
  moved = false
  x = localx(e.clientX)
  y = localy(e.clientY)
  endpin = xyToPinout(x,y)
  if endpin and endpin != startpin
    wires.push [startpin, endpin]
  startpin = undefined
  redraw()
  submit filename if sync and not readonly

releaseKnob = ->
  knob = knobs[starty]
  if starty == 0
    knob[2] = findNearest(knob[2], [-72, -36, 0, 36, 72])
  if starty == 2
    knob[2] = findNearest(knob[2], [-68, -23, 22, 67])
  redraw()
  submit filename if sync and not readonly

mouseClicked = (e) ->

handleKey = (e) ->
  c = e.charCode
  c = String.fromCharCode(c)
  console.log(c)


#
# Drawing
#

redraw = ->
  ctx.clearRect 0, 0, 1800, 2000
  # drawKnobs()
  drawWireBetweenPins wire[0], wire[1], i + 1 for wire, i in wires

drawWireBetweenPins = (p1, p2, n) ->
  drawLine pinoutToXy(p1), pinoutToXy(p2), n

drawLine = (p1, p2, n) ->
  [x1, y1] = p1
  [x2, y2] = p2
  ctx.lineWidth =  12
  ctx.strokeStyle = cmerge('#808080', n)
  curveLine x1, y1, x2, y2
  ctx.lineWidth =  8
  ctx.strokeStyle = cmerge(pickColor(x1, y1, x2, y2), n)
  curveLine x1, y1, x2, y2

curveLine = (x1, y1, x2, y2) ->
  mx = x1 + (x2 - x1) / 2
  my = y1 + (y2 - y1) / 2
  dx = (x2 - x1) / 5
  dy = 0
  dx += 10 * (if dx < 0 then -1 else 1)
  [dx, dy] = [0, 10] if y1 == y2
  ctx.beginPath()
  ctx.moveTo x1, y1
  ctx.quadraticCurveTo x1 + dx, y1 + dy, mx, my
  ctx.moveTo x2, y2
  ctx.quadraticCurveTo x2 - dx, y2 - dy, mx, my
  ctx.moveTo x1, y1
  ctx.stroke()

drawKnobs = ->
  drawKnob k[0], k[1], k[2], k[3] for k in knobs

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
  diff = 1000000
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

bufferPixel = (x, y) ->
  [r, g, b, a] = ctx.getImageData(x, y, 2, 2).data
  return 0 unless a == 255
  return ((r & 15) << 8) + ((g & 15) << 4) + (b & 15)

dist = (a, b) ->
  dx = b[0] - a[0]
  dy = b[1] - a[1]
  Math.sqrt(dx * dx + dy * dy)

cos = (n) -> Math.cos(n * Math.PI / 180)
sin = (n) -> Math.sin(n * Math.PI / 180)
arctan2 = (x, y) -> Math.atan2(x, y) * 180 / Math.PI
hexd = (n) -> '0123456789abcdef'[n]

localx = (gx) -> (gx - wirebuffer.getBoundingClientRect().left) * 1800 / 900
localy = (gy) -> (gy - wirebuffer.getBoundingClientRect().top) * 2000 / 1000
