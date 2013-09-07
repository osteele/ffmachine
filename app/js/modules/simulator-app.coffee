FirebaseRootRef = new Firebase 'https://ffmachine.firebaseIO.com/'

CurrentMachine = null
CurrentMachineRef = null
CurrentUser = null
MachineChangedHooks = []
MachineListRef = FirebaseRootRef.child 'machines'
ReloadAppSeed = null

FirebaseRootRef.child('version').on 'value', (snapshot) ->
  key = snapshot.val()
  location.reload() if ReloadAppSeed and key and ReloadAppSeed != key
  ReloadAppSeed = key

app = angular.module 'FFMachine', ['firebase']

app.controller 'MachineSimulatorCtrl', ($scope, $location, $window, angularFire, angularFireAuth) ->
  $scope.mode = 'edit'
  simulator = new SimulatorThread

  angularFireAuth.initialize FirebaseRootRef, scope: $scope, name: 'user'

  $scope.login = (provider) ->
    angularFireAuth.login provider, rememberMe: true

  $scope.logout = ->
    angularFireAuth.logout()

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

  $scope.$watch 'user', ->
    removeCurrentViewer()
    CurrentUser = $scope.user
    addCurrentViewer()

  $scope.$watch 'user + machine', ->
    $scope.editable = CurrentMachine and CurrentUser and CurrentMachine.creator.id == CurrentUser.id
    $scope.mode = 'view' if $scope.mode == 'edit' and not $scope.editable
    $scope.mode = 'edit' if $scope.mode == 'view' and $scope.editable

  MachineChangedHooks.push (machine) ->
    $scope.$apply ->
      $scope.machine = machine

  name = $location.search().name
  $window.location.href = '.' unless name
  initializeMachineView()
  loadMachine name

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

loadMachine = (name) ->
  CurrentMachineRef = MachineListRef.child(name)
  CurrentMachineRef.on 'value', (snapshot) ->
    CurrentMachine = snapshot.val()
    console.error "No machine named #{name}" unless CurrentMachine
    configuration = unserializeConfiguration(snapshot.val().wiring)
    setTimeout (-> hook(CurrentMachine)), 10 for hook in MachineChangedHooks
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

@machineConfigurationChanged = (configuration) ->
  saveMachine configuration

serializeMachineConfiguration = (configuration) ->
  serializatonWire = (wire) ->
    return wire.terminals.map((terminal) -> terminal.globalTerminalName).join(' ')
  return configuration.wires.map(serializatonWire).join("\n")

unserializeConfiguration = (configurationString) ->
  unserializeWire = (wireString) ->
    return createWire(wireString.split(' ').map(findTerminalByName)...)
  wireNames = configurationString.replace(/\\n/g, "\n").split(/\n/)
  wireNames.pop() if wireNames[wireNames.length - 1] == ''
  return {wires: wireNames.map(unserializeWire)}
