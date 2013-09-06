ModuleLocationMap = [
  ['clk1', 'ff', 'ff', 'ff', 'ff', 'ff', 'ff', 'ff', 'clk2'],
  ['ff', 'ff', 'ff', 'ff', 'ff', 'dg', 'ff', 'ff', 'ff'],
  ['ff', 'ff', 'ff', 'ff', 'ff', 'pa', 'ff', 'ff', 'ff'],
  ['ff', 'ff', 'ff', 'ff', 'ff', 'ff', 'ff', 'ff', 'ff']
]

ModulePinLocations = {
  # 201 flip-flop
  ff: [
    [100, 166, 'p'],

    # flip-flop
    [66, 190, '0'], [134, 190, '1'],
    [66, 252, '0in'], [134, 252, '1in'],
    [100, 266, 'comp'],

    # gate
    [66, 290, 'c0'],[66, 336, 'e0'], [40, 314, 'b0'],
    [134, 290, 'c1'], [134, 336, 'e1'], [160, 314, 'b1'],

    # ground
    [66, 372, 'gnd1'], [100, 372, 'gnd2'], [134, 372, 'gnd3']
  ]

  # 5401, 402 clocks
  clk1: [[160, 98, '-'], [160, 144, '+'], [160, 190, 'gnd']],
  clk2: [[160, 98, '-'], [160, 144, '+'], [160, 190, 'gnd']],

  # 602 pulse amplifier
  pa: [
    [160, 90, '-0'], [160, 136, '+0'], [66, 113, 'in0'], [160, 167, 'gnd0'],
    [160, 240, '-1'], [160, 286, '+1'], [66, 263, 'in1'], [160, 317, 'gnd1'],
    [66, 143, 'c0'], [66, 189, 'e0'], [40, 167, 'b0'],
    [66, 293, 'c1'], [66, 339, 'e1'], [40, 317, 'b1'],
    [40, 360, 'gnd2']
  ]

  # 110 diode
  dg: [
    # clamp load
    [61, 126, 'cl0'],
    [141, 126, 'cl1'],

    # gates
    [61, 158, 'c0'], [61, 204, 'e0'],
    [60, 275, 'b00'],
    [49, 300, 'b01'],
    [60, 325, 'b02'],
    [49, 350, 'b03'],
    [60, 375, 'b04'],
    [49, 400, 'b05'],

    [141, 158, 'c1'], [141, 204, 'e1'],
    [141, 275, 'b10']
    [152, 300, 'b11']
    [141, 325, 'b12']
    [152, 350, 'b13']
    [141, 375, 'b14']
    [152, 400, 'b15']
  ]
}

ModuleWidth = 200
ModuleHeight = 500


#
# Constructors
#

getModuleName = (row, col) ->
  [String.fromCharCode(97 + row), col].join('_')

modulePinNameToMachinePinName = (row, col, pinName) ->
  [getModuleName(row, col), pinName].join('_')

moduleComponents = ({type: moduleType, name: moduleName}) ->
  component = (type, componentPinNames, componentIndex) ->
    pins = for componentPinName in componentPinNames
      machinePinName = [moduleName, componentPinName.replace(/(\w+)/, "$1#{componentIndex}")].join('_')
      {componentPinName, machinePinName}
    return {type, pins}

  clock = ->
    component('clock', ['-', '+', 'gnd'])
  gate = (componentIndex, baseCount=1) ->
    bases = ['b']
    bases = ("b#{n}" for n in [0..baseCount]) if baseCount > 1
    component('gate', ['c', 'e'].concat(bases), componentIndex)
  ground = (componentIndex) ->
    component('ground', ['gnd'], componentIndex)
  pa = (componentIndex) ->
    component('pa', ['-', '+', 'in', 'gnd'])

  switch moduleType
    when 'ff' then [
      component('ff', ['p', '0', '1', '0in', '1in', 'comp'])
      gate(0)
      gate(1)
      ground(1)
      ground(2)
      ground(3)
    ]
    when 'clk1' then [clock()]
    when 'clk2' then [clock()]
    when 'dg' then [
      component('clamp', ['cl0', 'cl1'])
      gate(0, 5)
      gate(1, 5)
    ]
    when 'pa' then [
      pa(0)
      pa(1)
      gate(0)
      gate(1)
      ground(2)
    ]
    else console.error 'unknown module type', moduleType

createModules = ->
  rows = for moduleRow, row in ModuleLocationMap
    for moduleType, col in moduleRow
      moduleName = getModuleName(row, col)
      x = col * ModuleWidth
      y = row * ModuleHeight
      modulePinNames = ModulePinLocations[moduleType]
      pins =
        for [dx, dy, modulePinName] in ModulePinLocations[moduleType]
          {x: x + dx, y: y + dy, name: modulePinNameToMachinePinName(row, col, modulePinName)}
      {
        name: moduleName
        type: moduleType
        pins
        components: moduleComponents(type: moduleType, name: moduleName)
        x
        y
      }
  [].concat rows...



#
# Holes
#

@xyToPinout = (x, y, tolerance=12) ->
  for {x: px, y: py, name} in @machineState.pins
    return name if dist([px, py], [x, y]) < tolerance
  return null

@pinoutToXy = (machinePinName) ->
  for {x, y, name} in @machineState.pins
    return [x,y] if name == machinePinName
  console.error "Can't find #{pinName} in module of type #{moduleType}" unless pos

@holePositions = ->
  @machineState.pins

@machineState = do ->
  modules = createModules()
  {modules, pins: [].concat (pins for {pins} in modules)...}
