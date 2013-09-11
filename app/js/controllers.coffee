controllers = angular.module 'FFMachine.controllers', []

controllers.controller 'MachineListCtrl', ($scope, $location, angularFire, angularFireAuth) ->
  $scope.layout = 'grid'
  $scope.machines = []

  angularFireAuth.initialize firebaseRootRef, scope: $scope, name: 'user'

  # TODO is there a way to make this a list type?
  angularFire machineListRef, $scope, 'machines', {}

  $scope.$watch ->
    machines = (m for _, m of $scope.machines)
    return unless machines.length
    $scope.message = null
    unless machines.some((m) -> $scope.machine_editable(m))
      $scope.message = "Congratulation! You are signed in. " +
        "You can view other people's machines but not save changes. " +
        "Copy a machine to make your own machine that you can edit."
    unless $scope.user
      $scope.message = "You can view machines but not save changes. " +
        "Sign In to make your own machines. " +
        "The <em>Sign In</em> button will lead you through the steps to create an account."

  $scope.machine_key = (machine) ->
    (k for k, m of $scope.machines when m == machine)[0]

  $scope.duplicate_machine = (machine) ->
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
      auth: access
      access: access
    }
    machineListRef.push copy

  $scope.delete_machine = (machine) ->
    return unless confirm "Are you sure you want to delete the machine named '#{machine.name}'?"
    key = (k for k, m of $scope.machines when m == machine)[0]
    machineListRef.child(key).child('deleted_at').set Firebase.ServerValue.TIMESTAMP

  $scope.rename_machine = (machine) ->
    machine.name = machine.name.replace(/^\s+/, '').replace(/\s+$/, '')

  $scope.machine_editable = (machine) ->
    user = $scope.user
    return false if machine.deleted_at
    return user and machine.auth?[user.id] == 'write'

  $scope.machine_stats = (machine) ->
    "#{(machine.wiring.split(/\s+/).length - 1) / 2} wires"

  $scope.machine_url = (machine) ->
    return "machine.html?name=#{encodeURIComponent($scope.machine_key(machine))}"

  $scope.machine_viewers = (machine) ->
    return [] unless machine.connected
    return (k for k of machine.connected)

  # FIXME gets 'digest already in progress'
  $scope.view_details = (machine) ->
    $location.path '/machines/' + encodeURIComponent($scope.machine_key(machine))

  $scope.login = (provider) ->
    angularFireAuth.login provider, rememberMe: true

  $scope.logout = ->
    angularFireAuth.logout()

controllers.controller 'MachineDetailCtrl', ($scope, $routeParams, angularFire) ->
  $scope.machines = []
  machineListRef.on 'value', (snapshot) ->
    $scope.$apply ->
      $scope.machine = (v for k, v of snapshot.val() when k == $routeParams.machineId)[0]
