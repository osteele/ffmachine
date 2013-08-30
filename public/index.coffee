module = angular.module('FFMachine', ['firebase'])

module.controller 'machines', ($scope, angularFire) ->
  firebaseRootRef = new Firebase 'https://ffmachine.firebaseIO.com/'
  machineListRef = firebaseRootRef.child 'machines'

  angularFire machineListRef, $scope, 'machines', {}

  $scope.duplicate_machine = (machine) ->
    message_prefix = ""
    while true
      name = prompt "#{message_prefix}Name for the copy of machine “#{machine.name}”:", "Copy of #{machine.name}"
      break unless (m for k, m of $scope.machines when m.name == name).length
      message_prefix = "A machine named “#{name}” already exists. Please choose another name.\n\n"
    copy = {name, wiring: machine.wiring}
    machineListRef.push(copy).setPriority(machine.name)

  $scope.delete_machine = (machine) ->
    return unless confirm "Are you sure you want to delete the machine named “#{machine.name}”?"
    key = (k for k, m of $scope.machines when m == machine)[0]
    machineListRef.child(key).remove()
