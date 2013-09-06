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

  angularFireAuth.initialize FirebaseRootRef, scope: $scope, name: 'user'

  $scope.login = (provider) ->
    angularFireAuth.login provider, rememberMe: true

  $scope.logout = ->
    angularFireAuth.logout()

  $scope.$watch 'user', ->
    removeCurrentViewer()
    CurrentUser = $scope.user
    addCurrentViewer()

  $scope.$watch 'user + machine', ->
    wasEditable = $scope.editable
    $scope.editable = CurrentMachine and CurrentUser and CurrentMachine.creator.id == CurrentUser.id
    $scope.mode = 'view' if $scope.mode == 'edit' and not $scope.editable
    $scope.mode = 'edit' if $scope.editable and not wasEditable

  MachineChangedHooks.push (machine) ->
    $scope.$apply ->
      $scope.machine = machine

  name = $location.search().name
  $window.location.href = '.' unless name
  setupCanvas()
  loadWires name

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

loadWires = (name) ->
  CurrentMachineRef = MachineListRef.child(name)
  CurrentMachineRef.on 'value', (snapshot) ->
    CurrentMachine = snapshot.val()
    console.error "No machine named #{name}" unless CurrentMachine
    wires = unserializeWiring(snapshot.val().wiring)
    setTimeout (-> hook(CurrentMachine)), 10 for hook in MachineChangedHooks
    @setModel wires
    addCurrentViewer()

saveWires = (name, wiring) ->
  user = CurrentUser
  previous_wiring = CurrentMachine.wiring
  wiring = serializeWiring(wiring)
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

@wires_changed = (wires) ->
  saveWires name, wires

serializeWiring = (wires) ->
  return (wire.join(' ') for wire in wires).join("\n")

unserializeWiring = (str) ->
  wire_strings = str.replace(/\\n/g, "\n").split(/\n/)
  wire_strings.pop() if wire_strings[wire_strings.length - 1] == ''
  return wire_strings.map((wire) -> wire.split ' ')