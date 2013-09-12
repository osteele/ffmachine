FirebaseRootRef = new Firebase 'https://ffmachine.firebaseIO.com/'

CurrentMachine = null
CurrentMachineRef = null
CurrentUser = null
StoredMachineChangedHooks = []
MachineListRef = FirebaseRootRef.child 'machines'

do ->
  reloadAppSeed = null
  FirebaseRootRef.child('version').on 'value', (snapshot) ->
    key = snapshot.val()
    location.reload() if reloadAppSeed and key and reloadAppSeed != key
    reloadAppSeed = key

app = angular.module 'FFMachine', ['firebase']

app.controller 'MachineSimulatorCtrl', ($scope, $location, $window, angularFire, angularFireAuth) ->
  $scope.mode = 'edit'

  $scope.$safeApply or= (fn) ->
    phase = @$root.$$phase
    if phase == '$apply' or phase == '$digest'
      @$eval fn
    else
      @$apply fn

  #
  # Login
  #

  angularFireAuth.initialize FirebaseRootRef, scope: $scope, name: 'user'

  $scope.login = (provider) ->
    angularFireAuth.login provider, rememberMe: true

  $scope.logout = ->
    angularFireAuth.logout()

  $scope.$watch 'user', ->
    removeCurrentViewer()
    CurrentUser = $scope.user
    addCurrentViewer()


  #
  # Simulation
  #

  simulator = new SimulatorThread

  $scope.runSimulation = ->
    simulator.start()
    $scope.mode = 'simulate'
    $scope.simulationRunning = simulator.running

  $scope.stopSimulation = ->
    simulator.stop()
    $scope.simulationRunning = simulator.running

  $scope.stepSimulation = ->
    simulator.step()
    $scope.mode = 'simulate'
    $scope.simulationRunning = simulator.running

  $scope.$watch 'mode', ->
    $scope.stopSimulation() unless $scope.mode == 'simulate'


  #
  # Wire List
  #

  $scope.setHighlightWire = (wire) ->
    Dispatcher.highlightWire wire

  $scope.unsetHighlightWire = (wire) ->
    Dispatcher.unhighlightWire wire

  Dispatcher.on 'highlightWire.controller', (wire) ->
    $scope.$safeApply ->
      $scope.highlightWire = wire

  Dispatcher.on 'unhighlightWire.controller', (wire) ->
    $scope.$safeApply ->
      $scope.highlightWire = null


  #
  # Graphs
  #

  $scope.graphedTerminals = []

  $scope.closeHistoryGraph = (terminal) ->
    $scope.graphedTerminals = (t for t in $scope.graphedTerminals when t != terminal)

  $scope.$watch 'graphedTerminals', ->
    updateHistoryGraphs()

  window.graphTerminal = (terminal) ->
    return if terminal in $scope.graphedTerminals
    $scope.$apply ->
      $scope.graphedTerminals.push terminal

  #
  # Machine Storage
  #

  $scope.$watch 'user + machine', ->
    $scope.editable = CurrentMachine and CurrentMachine?.access?[CurrentUser.id] == 'write'
    $scope.mode = 'view' if $scope.mode == 'edit' and not $scope.editable
    $scope.mode = 'edit' if $scope.mode == 'view' and $scope.editable

  StoredMachineChangedHooks.push (storedMachine) ->
    $scope.$apply ->
      $scope.machine = storedMachine

  window.machineConfigurationChanged = (configuration) ->
    saveMachine configuration
    $scope.$apply ->
      $scope.wires = configuration.wires

  machineName = $location.search().name
  $window.location.href = '.' unless machineName
  initializeMachineView()
  loadMachine machineName


app.filter 'floatValue', ->
  (value) ->
    value = fromWeak(value)
    return unless typeof value == 'number'
    "#{value}<b>V</b>"

app.filter 'terminalVoltageMiniHistory', ->
  (terminal) ->
    value = fromWeak(terminal.value)
    prev = terminal.history?[terminal.history?.length - 2]?.value
    prev = fromWeak(prev) if prev
    return unless typeof(value) == 'number' or typeof(prev) == 'number'
    str = "#{value}<b>V</b>"
    str = "<del>#{prev}<b>V</b></del> &rarr; <ins>#{str}</ins>" if typeof prev == 'number' and prev != value
    return str

class SimulatorThread
  constructor: ->
    @simulationThread = null

  start: ->
    @simulationThread or= window.setInterval (-> stepSimulator()), 1000 / 10
    @running = true

  stop: ->
    window.clearInterval @simulationThread if @simulationThread
    @simulationThread = null
    @running = false

  step: ->
    @stop()
    stepSimulator()


#
# Tracking Active Viewers
#

addCurrentViewer = ->
  user = CurrentUser
  return unless CurrentMachineRef and CurrentUser
  onlineRef = CurrentMachineRef.child('connected').child(user.id)
  onlineRef.onDisconnect().remove()
  onlineRef.set user.email

removeCurrentViewer = ->
  return unless CurrentMachineRef and CurrentUser
  onlineRef = CurrentMachineRef.child('connected').child(CurrentUser.id)
  onlineRef.remove()


#
# Storage and Serialization
#

loadMachine = (machineName) ->
  CurrentMachineRef = MachineListRef.child(machineName)
  CurrentMachineRef.on 'value', (snapshot) ->
    CurrentMachine = snapshot.val()
    throw Error("No machine named #{machineName}") unless CurrentMachine
    configuration = unserializeConfiguration(snapshot.val().wiring)
    setTimeout (-> hook(CurrentMachine)), 10 for hook in StoredMachineChangedHooks
    @updateMachineConfiguration configuration
    addCurrentViewer()

saveMachine = (configuration) ->
  user = CurrentUser
  previous_wiring = CurrentMachine.wiring
  wiring = serializeMachineConfiguration(configuration)
  return if previous_wiring == wiring
  if CurrentMachine.protected
    console.error "#{CurrentMachine.name} is read-only"
    return
  unless user
    console.error "Not signed in"
    return
  modified_at = Firebase.ServerValue.TIMESTAMP
  CurrentMachineRef.child('wiring').set wiring
  CurrentMachineRef.child('modified_at').set modified_at
  CurrentMachineRef.child('history').push {user: user?.email, wiring, previous_wiring, modified_at}

serializeMachineConfiguration = (configuration) ->
  serializeWire = (wire) ->
    return wire.terminals.map((terminal) -> terminal.identifier).join(' ')
  return configuration.wires.map(serializeWire).join("\n")

unserializeConfiguration = (configurationString) ->
  unserializeWire = (wireString) ->
    return createWire(wireString.split(' ').map(getTerminalByIdentifier)...)
  wireStrings = configurationString.replace(/\\n/g, "\n").split(/\n/)
  wireStrings.pop() if wireStrings[wireStrings.length - 1] == ''
  return {wires: wireStrings.map(unserializeWire)}
