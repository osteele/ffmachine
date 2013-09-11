firebaseRootRef = new Firebase 'https://ffmachine.firebaseIO.com/'
machineListRef = firebaseRootRef.child 'machines'

# Server-push reload
reload_key = null
firebaseRootRef.child('version').on 'value', (snapshot) ->
  key = snapshot.val()
  location.reload() if reload_key and key and reload_key != key
  reload_key = key

dependencies = ['firebase', 'ui']
modules = ['FFMachine.controllers', 'FFMachine.directives', 'FFMachine.filters']
app = angular.module 'FFMachine', modules.concat(dependencies)

app.config ($locationProvider, $routeProvider) ->
  # $locationProvider.html5Mode true
  $routeProvider
    .when('/', templateUrl: 'templates/machine-list.html', controller: 'MachineListCtrl')
    .when('/machines/:machineId', templateUrl: 'templates/machine-detail.html', controller: 'MachineDetailCtrl')
    .otherwise(redirectTo: '/')
