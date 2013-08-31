directives = angular.module 'FFMachine.directives', []

directives.directive 'wiringDiagram', ->
  restrict: 'CE'
  replace: true
  template: '<canvas width="90" height="100"/>'
  transclude: true
  scope: {wires: '@wires', previous_wires: '@previousWires', width: '@', height: '@'}
  link: (scope, element, attrs) ->
    canvas = element[0]
    attrs.$observe 'wires', (wires) ->
      draw_wiring_thumbnail canvas, wires, scope.previous_wires

# TODO consolidate with the main drawing code
draw_wiring_thumbnail = (canvas, wires_string, previous_wires_string) ->
  ctx = canvas.getContext('2d')
  [viewport_width, viewport_height] = [1800, 2000]

  previous_wires_string ||= wires_string
  wiring_diff = (w1, w0) ->
    w1 = (line for line in w1.split(/\n/) when line.match(/\S/))
    w0 = (line for line in w0.split(/\n/) when line.match(/\S/))
    ws = (w.split(/\s+/) for w in w1 when w not in w0)
    dict = {}
    dict[w] = w for w in ws
    dict
  wires = (line.split(/\s+/) for line in wires_string.split(/\n/) when line.match(/\S/))
  added_wires = wiring_diff(wires_string, previous_wires_string)
  deleted_wires = wiring_diff(previous_wires_string, wires_string)
  ctx.save()
  ctx.scale canvas.width / viewport_width, canvas.height / viewport_height
  ctx.lineCap = 'round'
  if canvas.width >= 200
    canvas.style.background = 'url(ffmachine.png)'
    canvas.style.backgroundSize = 'cover'
    ctx.lineWidth = 8
  else
    canvas.style.background = null
    ctx.lineWidth = 1.75 * viewport_width / canvas.width
    [rows, cols] = [5, 9]
    [rw, rh] = [200, 400]
    padding = 10
    ctx.fillStyle = 'white'
    ctx.fillRect 0, 0, viewport_width, viewport_height
    ctx.fillStyle = '#301E17'
    ctx.globalAlpha = 0.9
    for i in [0...rows]
      for j in [0...cols]
        ctx.fillRect j * rw + padding, i * rh + padding, rw - 2 * padding, rh - 2 * padding
    ctx.globalAlpha = 1
  colors = ['#804010', '#f00000', '#f0a000', '#f0f000', '#00f000', '#0000f0']
  {round, sqrt} = Math
  sqr = (x) -> Math.pow(x, 2)
  lineWidth = ctx.lineWidth
  for wire in wires.concat(v for k, v of deleted_wires)
    [s0, s1] = wire
    [x0, y0] = pinoutToXy(s0)
    [x1, y1] = pinoutToXy(s1)
    color_index = round(sqrt(sqr(x1 - x0, 2) + sqr(y1 - y0, 2)) / 100)
    ctx.strokeStyle = colors[color_index] ? '#d02090'
    ctx.lineWidth = lineWidth
    ctx.lineWidth *= 5 if wire of added_wires or wire of deleted_wires
    ctx.globalAlpha = 1
    ctx.globalAlpha = 0.2 if wire of deleted_wires
    mx = x0 + (x1 - x0) / 2
    my = y0 + (y1 - y0) / 2
    [dx, dy] = [(x1 - x0) / 5, 0]
    dx += 10 * (if dx < 0 then -1 else 1)
    [dx, dy] = [0, 10] if y0 == y1
    ctx.beginPath()
    ctx.moveTo x0, y0
    ctx.quadraticCurveTo x0 + dx, y0 + dy, mx, my
    ctx.moveTo x1, y1
    ctx.quadraticCurveTo x1 - dx, y1 - dy, mx, my
    ctx.stroke()
  ctx.restore()
