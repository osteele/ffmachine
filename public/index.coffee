module = angular.module('FFMachine', ['firebase'])

module.controller 'machines', ($scope, angularFire) ->
  url = 'https://ffmachine.firebaseIO.com/machines'
  promise = angularFire(url, $scope, 'machines', {})
