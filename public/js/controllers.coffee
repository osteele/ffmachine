controllers = angular.module 'FFMachine.controllers', []

controllers.controller 'MachineListCtrl', ($scope, $location, angularFire) ->
  $scope.machines = []
  # TODO is there a way to make this a list type?
  angularFire machineListRef, $scope, 'machines', {}

  # TODO replace by angularfire 0.3.x auth
  auth = new FirebaseSimpleLogin firebaseRootRef, (error, user) ->
    if error
      console.error error
      return
    setTimeout (-> $scope.$apply -> $scope.user = user), 10

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
    user_key = {id: user.id, email: user.email}
    now = Firebase.ServerValue.TIMESTAMP
    machineListRef.push {name, wiring: machine.wiring, creator: user_key, writers: [user_key], created_at: now}

  $scope.delete_machine = (machine) ->
    return unless confirm "Are you sure you want to delete the machine named '#{machine.name}'?"
    key = (k for k, m of $scope.machines when m == machine)[0]
    machineListRef.child(key).child('deleted_at').set Firebase.ServerValue.TIMESTAMP

  $scope.rename_machine = (machine) ->
    machine.name = machine.name.replace(/^\s+/, '').replace(/\s+$/, '')

  $scope.machine_editable = (machine) ->
    user = $scope.user
    return user and machine.writers and user.id in machine.writers.map (user) -> user.id

  $scope.machine_stats = (machine) ->
    "#{(machine.wiring.split(/\s+/).length - 1) / 2} wires"

  $scope.machine_viewers = (machine) ->
    return [] unless machine.connected
    return (k for k of machine.connected)

  # FIXME gets 'digest already in progress'
  $scope.view_details = (machine) ->
    $location.path '/machines/' + encodeURIComponent($scope.machine_key(machine))

  $scope.login = (provider) ->
    auth.login provider, rememberMe: true

  $scope.logout = ->
    auth.logout()

controllers.controller 'MachineDetailCtrl', ($scope, $routeParams, angularFire) ->
  $scope.machines = []
  machineListRef.on 'value', (snapshot) ->
    $scope.$apply ->
      $scope.machine = (v for k, v of snapshot.val() when k == $routeParams.machineId)[0]
