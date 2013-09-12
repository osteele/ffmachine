firebaseRootRef = new Firebase 'https://ffmachine.firebaseIO.com/'
machineListRef = firebaseRootRef.child 'machines'

# Server-push reload
do ->
  reloadAppSeed = null
  firebaseRootRef.child('version').on 'value', (snapshot) ->
    key = snapshot.val()
    location.reload() if reloadAppSeed and key and reloadAppSeed != key
    reloadAppSeed = key

dependencies = ['firebase', 'ui']
modules = ['FFMachine.controllers', 'FFMachine.directives', 'FFMachine.filters']
app = angular.module 'FFMachine', modules.concat(dependencies)

app.config ($locationProvider, $routeProvider) ->
  # $locationProvider.html5Mode true
  $routeProvider
    .when('/', controller: 'MachineListCtrl', templateUrl: 'templates/machine-list.html')
    .when('/machines/:machineId', controller: 'MachineDetailCtrl', templateUrl: 'templates/machine-detail.html')
    .otherwise(redirectTo: '/')
