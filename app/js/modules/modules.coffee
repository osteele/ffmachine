ModuleLocationMap = [
  ['clk1', 'ff', 'ff', 'ff', 'ff', 'ff', 'ff', 'ff', 'clk2'],
  ['ff', 'ff', 'ff', 'ff', 'ff', 'dg', 'ff', 'ff', 'ff'],
  ['ff', 'ff', 'ff', 'ff', 'ff', 'pa', 'ff', 'ff', 'ff'],
  ['ff', 'ff', 'ff', 'ff', 'ff', 'ff', 'ff', 'ff', 'ff']
]

TerminalLocations = {
  # 201 flip-flop
  ff: [
    [100.5, 166, 'p'],

    # flip-flop
    [66.5, 190.5, '0'], [134.5, 190.5, '1'],
    [66, 252, '0in'], [134, 252, '1in'],
    [100, 266, 'comp'],

    # gate
    [66, 290, 'c0'],[66, 336, 'e0'], [40, 314, 'b0'],
    [134, 290, 'c1'], [134, 336, 'e1'], [160, 314, 'b1'],

    # ground
    [66.5, 372.5, 'gnd1'], [100.5, 372.5, 'gnd2'], [134.5, 372.5, 'gnd3']
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

ModuleDimensions =
  width: 200
  height: 500


#
# Constructors
#

moduleComponents = ({type: moduleType, name: moduleName}) ->
  component = (type, componentTerminalNames, componentIndex='') ->
    terminals = for componentTerminalName in componentTerminalNames
      identifier = [moduleName, componentTerminalName.replace(/(\D+)/, "$1#{componentIndex}")].join('_')
      {componentTerminalName, identifier}
    return {type, terminals}

  clock = ->
    component('clock', ['-', '+', 'gnd'])
  inverter = (componentIndex) ->
    component('inverter', ['c', 'e', 'b'], componentIndex)
  gate = (componentIndex) ->
    bases = ("b#{n}" for n in [0..5])
    component('gate', ['c', 'e'].concat(bases), componentIndex)
  ground = (componentIndex) ->
    component('ground', ['gnd'], componentIndex)
  pa = (componentIndex) ->
    component('pa', ['-', '+', 'in', 'gnd'], componentIndex)

  switch moduleType
    when 'ff' then [
      component('ff', ['p', '0', '1', '0in', '1in', 'comp'])
      inverter(0)
      inverter(1)
      ground(1)
      ground(2)
      ground(3)
    ]
    when 'clk1' then [clock()]
    when 'clk2' then [clock()]
    when 'dg' then [
      component('clamp', ['cl'], 0)
      component('clamp', ['cl'], 1)
      gate(0)
      gate(1)
    ]
    when 'pa' then [
      pa(0)
      pa(1)
      inverter(0)
      inverter(1)
      ground(2)
    ]
    else throw Error("unknown module type #{moduleType}")

createModules = ->
  rows = for moduleRow, rowIndex in ModuleLocationMap
    for moduleType, colIndex in moduleRow
      moduleName = [String.fromCharCode(97 + rowIndex), colIndex].join('_')
      x = colIndex * ModuleDimensions.width / 2
      y = rowIndex * ModuleDimensions.height / 2
      moduleTerminalNames = TerminalLocations[moduleType]
      terminals =
        for [dx, dy, moduleTerminalName] in TerminalLocations[moduleType]
          {
            identifier: [moduleName, moduleTerminalName].join('_')
            moduleTerminalName
            coordinates: [x + dx / 2, y + dy / 2]
            x: x + dx / 2
            y: y + dy / 2
          }
      {
        name: moduleName
        type: moduleType
        terminals
        components: moduleComponents(type: moduleType, name: moduleName)
      }
  [].concat rows...


#
# Terminals
#

@findNearbyTerminal = (x, y, tolerance=12) ->
  for terminal in MachineHardware.terminals
    return terminal if lineLength(terminal.coordinates, [x, y]) < tolerance
  return null

@findTerminalByName = (identifier) ->
  for terminal in MachineHardware.terminals
    return terminal if terminal.identifier == identifier
  throw Exception("Can't find terminal named #{identifier}")

@xyToTerminalName = (x, y, tolerance=12) ->
  for {x: px, y: py, identifier} in MachineHardware.terminals
    return identifier if lineLength([px, py], [x, y]) < tolerance
  return null

@getTerminalCoordinates = (identifier) ->
  findTerminalByName(identifier).coordinates

@MachineHardware = do ->
  modules = createModules()
  {
    modules
    terminals: [].concat (terminals for {terminals} in modules)...
  }
