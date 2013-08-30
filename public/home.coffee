firebaseRootRef = new Firebase 'https://ffmachine.firebaseIO.com/'
reload_key = null

firebaseRootRef.child('version').on 'value', (snapshot) ->
  key = snapshot.val()
  location.reload() if reload_key and key and reload_key != key
  reload_key = key

module = angular.module('FFMachine', ['firebase'])

module.controller 'machines', ($scope, angularFire) ->
  machineListRef = firebaseRootRef.child 'machines'

  angularFire machineListRef, $scope, 'machines', {}

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
      name = prompt "#{message_prefix}Name for the copy of machine '#{machine.name}':", "Copy of #{machine.name}"
      break unless (m for k, m of $scope.machines when m.name.toLowerCase() == name.toLowerCase()).length
      message_prefix = "A machine named '#{name}' already exists. Please choose another name.\n\n"
    user_key = {id: user.id, email: user.email}
    machineListRef.push {name, wiring: machine.wiring, creator: user_key, writers: [user_key]}

  $scope.delete_machine = (machine) ->
    return unless confirm "Are you sure you want to delete the machine named '#{machine.name}'?"
    key = (k for k, m of $scope.machines when m == machine)[0]
    machineListRef.child(key).remove()

  $scope.rename_machine = (machine) ->
    machine.name = machine.name.replace(/^\s+/, '').replace(/\s+$/, '')

  $scope.machine_editable = (machine) ->
    user = $scope.user
    user and machine.writers and user.id in machine.writers.map (user) -> user.id

  $scope.machine_stats = (machine) ->
    "#{machine.wiring.split(/\s+/).length - 1} wires"

  $scope.login = (provider) ->
    auth.login provider, rememberMe: true

  $scope.logout = ->
    auth.logout()

module.filter 'encode', -> encodeURIComponent
