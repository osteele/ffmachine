FirebaseRootRef = new Firebase 'https://ffmachine.firebaseIO.com/'
MachineListRef = FirebaseRootRef.child 'machines'
CurrentMachineRef = null
CurrentMachine = null
ReloadAppSeed = null
CurrentUser = null
MachineChangedHooks = []

FirebaseRootRef.child('version').on 'value', (snapshot) ->
  key = snapshot.val()
  location.reload() if ReloadAppSeed and key and ReloadAppSeed != key
  ReloadAppSeed = key

app = angular.module 'FFMachine', ['firebase']

app.controller 'MachineSimulatorCtrl', ($scope, angularFire, angularFireAuth) ->
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
    $scope.editable = CurrentMachine and CurrentUser and CurrentMachine.creator.id == CurrentUser.id
    $scope.mode = 'view' if $scope.mode == 'edit' and not $scope.editable

  MachineChangedHooks.push (machine) ->
    $scope.$apply ->
      $scope.machine = machine

  setup()

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

@loadWires = (name) ->
  CurrentMachineRef = MachineListRef.child(name)
  CurrentMachineRef.on 'value', (snapshot) ->
    CurrentMachine = snapshot.val()
    console.error "No machine named #{name}" unless CurrentMachine
    wires = unserializeWiring(snapshot.val().wiring)
    setTimeout (-> hook(CurrentMachine)), 10 for hook in MachineChangedHooks
    @setModel wires
    addCurrentViewer()

@saveWires = (name, wiring) ->
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

serializeWiring = (str) ->
  return str.replace /\r\n/g, "\n"

unserializeWiring = (str) ->
  wire_strings = str.replace(/\\n/g, "\n").split(/\n/)
  wire_strings.pop() if wire_strings[wire_strings.length - 1] == ''
  return wire_strings.map((wire) -> wire.split ' ')
