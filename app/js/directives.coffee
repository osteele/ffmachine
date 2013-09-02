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

  wiring_diff = (w1, w0) ->
    w1 = (line for line in w1.split(/\n/) when line.match(/\S/))
    w0 = (line for line in w0.split(/\n/) when line.match(/\S/))
    ws = (w.split(/\s+/) for w in w1 when w not in w0)
    dict = {}
    dict[w] = w for w in ws
    dict

  previous_wires_string ||= wires_string
  wires = (line.split(/\s+/) for line in wires_string.split(/\n/) when line.match(/\S/))
  added_wires = wiring_diff(wires_string, previous_wires_string)
  deleted_wires = wiring_diff(previous_wires_string, wires_string)

  # constants
  [viewport_width, viewport_height] = [1800, 2000]
  canvas_width_breakpoint = 200
  background_image_url = 'url(img/ffmachine.png)'
  [module_rows, module_cols] = [4, 9]
  [module_width, module_height] = [200, 450]
  module_padding = 10

  {round, sqrt} = Math

  line_length = (dx, dy) -> sqrt(dx * dx + dy * dy)

  line_colors = ['#804010', '#f00000', '#f0a000', '#f0f000', '#00f000', '#0000f0', '#d02090']
  line_color = (x0, y0, x1, y1) ->
    color_index = round(line_length(x1 - x0, y1 - y0) / 100)
    line_colors[color_index] ? line_colors[line_colors.length - 1]

  draw_module_rects = ->
    ctx.fillStyle = 'white'
    ctx.fillRect 0, 0, viewport_width, viewport_height
    ctx.globalAlpha = 0.9
    ctx.fillStyle = '#301E17'
    inner_width = module_width - 2 * module_padding
    inner_height = module_height - 2 * module_padding
    for i in [0...module_rows]
      for j in [0...module_cols]
        [x, y] = [j * module_width, i * module_height]
        ctx.fillRect x + module_padding, y + module_padding, inner_width, inner_height
    ctx.globalAlpha = 1

  ctx.save()
  ctx.scale canvas.width / viewport_width, canvas.height / viewport_height

  if canvas.width >= canvas_width_breakpoint
    canvas.style.background = background_image_url
    canvas.style.backgroundSize = 'cover'
    ctx.fillStyle = 'white'
    ctx.globalAlpha = 0.35
    ctx.fillRect 0, 0, viewport_width, viewport_height
    lineWidth = 12
  else
    canvas.style.background = null
    draw_module_rects()
    lineWidth = 1.75 * viewport_width / canvas.width

  draw_plus = (x, y) ->
    d = 75
    ctx.beginPath()
    ctx.moveTo x - d, y
    ctx.lineTo x + d, y
    ctx.moveTo x, y - d
    ctx.lineTo x, y + d
    ctx.stroke()

  draw_cross = (x, y) ->
    d = 50
    ctx.beginPath()
    ctx.moveTo x - d, y - d
    ctx.lineTo x + d, y + d
    ctx.moveTo x + d, y - d
    ctx.lineTo x - d, y + d
    ctx.stroke()

  draw_with_shadow = (fn) ->
    ctx.save()
    ctx.globalAlpha = 1
    ctx.lineWidth *= 1.5
    ctx.strokeStyle = 'white'
    fn()
    ctx.restore()
    fn()

  for wire in wires.concat(v for k, v of deleted_wires)
    [s0, s1] = wire
    [x0, y0] = pinoutToXy(s0)
    [x1, y1] = pinoutToXy(s1)
    ctx.strokeStyle = line_color(x0, y0, x1, y1)
    ctx.lineCap = 'round'
    ctx.lineWidth = lineWidth
    ctx.lineWidth *= 5 if wire of added_wires or wire of deleted_wires
    ctx.globalAlpha = 1
    ctx.globalAlpha = 0.3 if wire of deleted_wires
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
    if wire of added_wires
      ctx.lineCap = 'square'
      ctx.globalAlpha = 1
      ctx.lineWidth = 2 * lineWidth
      draw_with_shadow -> draw_plus x0, y0
      draw_with_shadow -> draw_plus x1, y1
    if wire of deleted_wires
      ctx.lineCap = 'square'
      ctx.lineWidth = 2 * lineWidth
      draw_with_shadow -> draw_cross x0, y0
      draw_with_shadow -> draw_cross x1, y1

  ctx.restore()
