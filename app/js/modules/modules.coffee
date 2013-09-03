moduleTypes = [
  ['clk1', 'ff', 'ff', 'ff', 'ff', 'ff', 'ff', 'ff', 'clk2'],
  ['ff', 'ff', 'ff', 'ff', 'ff', 'dg', 'ff', 'ff', 'ff'],
  ['ff', 'ff', 'ff', 'ff', 'ff', 'pa', 'ff', 'ff', 'ff'],
  ['ff', 'ff', 'ff', 'ff', 'ff', 'ff', 'ff', 'ff', 'ff']
]

holedefs = {
  ff: [
    [100, 166, 'p'],
    [66, 190, '0'], [134, 190, '1'],
    [66, 252, '0in'], [134, 252, '1in'],
    [100, 266, 'comp'],
    [66, 290, 'c0'],[66, 336, 'e0'], [40, 314, 'b0'],
    [134, 290, 'c1'], [134, 336, 'e1'], [160, 314, 'b1'],
    [66, 372, 'gnd1'], [100, 372, 'gnd2'], [134, 372, 'gnd3']
  ]
  clk1: [[160, 98, '-'], [160, 144, '+'], [160, 190, 'gnd']],
  clk2: [[160, 98, '-'], [160, 144, '+'], [160, 190, 'gnd']],
  pa: [
    [160, 90, '-0'], [160, 136, '+0'], [66, 113, 'in0'], [160, 167, 'gnd0'],
    [160, 240, '-1'], [160, 286, '+1'], [66, 263, 'in1'], [160, 317, 'gnd1'],
    [66, 143, 'c0'], [66, 189, 'e0'], [40, 167, 'b0'],
    [66, 293, 'c1'], [66, 339, 'e1'], [40, 317, 'b1'],
    [40, 360, 'gnd2']
  ]
  dg: [
    [61, 126, 'cl0'],
    [141, 126, 'cl1'],

    [61, 158, 'c0'], [61, 204, 'e0'],
    [141, 158, 'c1'], [141, 204, 'e1'],

    [60, 275, 'b00'],
    [49, 300, 'b01'],
    [60, 325, 'b02'],
    [49, 350, 'b03'],
    [60, 375, 'b04'],
    [49, 400, 'b05'],

    [141, 275, 'b10']
    [152, 300, 'b11']
    [141, 325, 'b12']
    [152, 350, 'b13']
    [141, 375, 'b14']
    [152, 400, 'b15']
  ]
}

moduleWidth = 200
moduleHeight = 500

findHoleTolerance = 12


#
# Holes
#

@xyToPinout = (x, y) ->
  row = Math.floor(y / moduleHeight)
  col = Math.floor(x / moduleWidth)
  return undefined unless 0 <= col < 9 and 0 <= row < 4
  moduleType = moduleTypes[row][col]
  hole = findHole(holedefs[moduleType], x % moduleWidth, y % moduleHeight)
  return undefined unless hole
  return modulePinName(row, col, hole[2])

@pinoutToXy = (p) ->
  [rowName, col, pinName] = p.split('_')
  row = rowName.charCodeAt(0) - 97
  moduleType = moduleTypes[row][col]
  pos = holePos(holedefs[moduleType], pinName)
  console.error "Can't find #{pinName} in module of type #{moduleType}" unless pos
  pos ||= [0, 0]
  [x, y] = pos
  return [col * moduleWidth + x, row * moduleHeight + y]

@holePositions = ->
  pins

moduleName = (row, col) ->
  [String.fromCharCode(97 + row), col].join('_')

modulePinName = (row, col, pinName) ->
  [moduleName(row, col), pinName].join('_')

findHole = (holes, x, y) ->
  for hole in holes
    return hole if dist(hole, [x,y]) < findHoleTolerance
  return undefined

holePos = (holes, pinName) ->
  for hole in holes
    return hole if hole[2] == pinName

modules = do ->
  rows = for moduleRow, row in moduleTypes
    for moduleType, col in moduleRow
      x = col * moduleWidth
      y = row * moduleHeight
      pins =
        for [dx, dy, pinName] in holedefs[moduleType]
          {x: x + dx, y: y + dy, name: modulePinName(row, col, pinName)}
      {
        name: moduleName(row, col)
        type: moduleType
        x
        y
        pins
      }
  [].concat rows...

pins = [].concat (pins for {pins} in modules)...
