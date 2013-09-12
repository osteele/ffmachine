controllers = angular.module 'FFMachine.controllers', []

controllers.controller 'MachineListCtrl', ($scope, $location, angularFire, angularFireAuth) ->
  $scope.layout = 'grid'
  $scope.machines = []

  angularFireAuth.initialize firebaseRootRef, scope: $scope, name: 'user'

  # TODO is there a way to make this a list type?
  angularFire machineListRef, $scope, 'machines', {}

  $scope.$watch 'user + machines', ->
    machines = (m for _, m of $scope.machines)
    return unless machines.length
    $scope.message = null
    unless machines.some((m) -> $scope.machineIsEditable(m))
      $scope.message = "Congratulation! You are signed in. " +
        "You can view other people's machines but not save changes. " +
        "Copy a machine to make your own machine that you can edit."
    unless $scope.user
      $scope.message = "You can view machines but not save changes. " +
        "Sign In to make your own machines. " +
        "The <em>Sign In</em> button will lead you through the steps to create an account."

  getMachineKey = (machine) ->
    (k for k, m of $scope.machines when m == machine)[0]

  $scope.machine_key = getMachineKey

  $scope.duplicateMachine = (machine) ->
    user = $scope.user
    unless user
      alert "You must sign in before making a machine."
      return
    message_prefix = ""
    while true
      name = "#{machine.name} copy"
      name_index = 1
      while (m for k, m of $scope.machines when m.name.toLowerCase() == name.toLowerCase() and not m.deleted_at).length
        name_index += 1
        name = "#{machine.name} copy ##{name_index}"
      name = prompt "#{message_prefix}Name for the copy of machine '#{machine.name}':", name
      return unless name
      break
      # break unless (m for k, m of $scope.machines when m.name.toLowerCase() == name.toLowerCase()).length
      # message_prefix = "A machine named '#{name}' already exists. Please choose another name.\n\n"
    now = Firebase.ServerValue.TIMESTAMP
    access = {}
    access[user.id] = 'write'
    copy = {
      name
      wiring: machine.wiring
      creator: {id: user.id, email: user.email}
      created_at: now
      access: access
    }
    machineListRef.push copy

  $scope.deleteMachine = (machine) ->
    return unless confirm "Are you sure you want to delete the machine named '#{machine.name}'?"
    key = (k for k, m of $scope.machines when m == machine)[0]
    machineListRef.child(key).child('deleted_at').set Firebase.ServerValue.TIMESTAMP

  $scope.machineIsEditable = (machine) ->
    user = $scope.user
    return false if machine.deleted_at
    return user and machine.access?[user.id] == 'write'

  $scope.machineStats = (machine) ->
    "#{Math.floor(machine.wiring.split(/\s+/).length / 2)} wires"

  $scope.machineUrl = (machine) ->
    return "machine.html#/machine/#{encodeURIComponent($scope.machine_key(machine))}"

  $scope.machineViewers = (machine) ->
    return [] unless machine.connected
    return (k for k of machine.connected)

  $scope.saveMachineName = (machine, event) ->
    name = angular.element(event.target).val()
    # Setting `machine.name = name` results in 'FIREBASE WARNING: set at /machines failed: permission_denied'
    # machine.name = name
    machineListRef.child($scope.machine_key(machine)).child('name').set name
    $scope.editMachineNameMode = false

  $scope.login = (provider) ->
    angularFireAuth.login provider, rememberMe: true

  $scope.logout = ->
    angularFireAuth.logout()

controllers.controller 'MachineDetailCtrl', ($scope, $routeParams, angularFire) ->
  $scope.machines = []
  machineListRef.on 'value', (snapshot) ->
    $scope.$apply ->
      $scope.machine = (v for k, v of snapshot.val() when k == $routeParams.machineId)[0]
