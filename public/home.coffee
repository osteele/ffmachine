firebaseRootRef = new Firebase 'https://ffmachine.firebaseIO.com/'
machineListRef = firebaseRootRef.child 'machines'

# Server-push reload
reload_key = null
firebaseRootRef.child('version').on 'value', (snapshot) ->
  key = snapshot.val()
  location.reload() if reload_key and key and reload_key != key
  reload_key = key

module = angular.module 'FFMachine', ['firebase']

MachineListCtrl = ($scope, $location, angularFire) ->
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
      while (m for k, m of $scope.machines when m.name.toLowerCase() == name.toLowerCase()).length
        name_index += 1
        name = "#{machine.name} copy ##{name_index}"
      name = prompt "#{message_prefix}Name for the copy of machine '#{machine.name}':", name
      return unless name
      break unless (m for k, m of $scope.machines when m.name.toLowerCase() == name.toLowerCase()).length
      message_prefix = "A machine named '#{name}' already exists. Please choose another name.\n\n"
    user_key = {id: user.id, email: user.email}
    now = Firebase.ServerValue.TIMESTAMP
    machineListRef.push {name, wiring: machine.wiring, creator: user_key, writers: [user_key], created_at: now}

  $scope.delete_machine = (machine) ->
    return unless confirm "Are you sure you want to delete the machine named '#{machine.name}'?"
    key = (k for k, m of $scope.machines when m == machine)[0]
    machineListRef.child(key).remove()

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

MachineDetailCtrl = ($scope, $routeParams, angularFire) ->
  $scope.machines = []
  machineListRef.on 'value', (snapshot) ->
    $scope.$apply ->
      $scope.machine = (v for k, v of snapshot.val() when k == $routeParams.machineId)[0]

module.config ($locationProvider, $routeProvider) ->
  # $locationProvider.html5Mode true
  $routeProvider
    .when('/', templateUrl: 'partials/machine-list.html', controller: MachineListCtrl)
    .when('/machines/:machineId', templateUrl: 'partials/machine-detail.html', controller: MachineDetailCtrl)
    # .otherwise(redirectTo: '/')

module.filter 'encode', -> encodeURIComponent

module.directive 'wiringDiagram', ->
  restrict: 'CE'
  replace: true
  template: '<canvas width="75" height="50"></canvas>'
  transclude: true
  scope: {wires: '@wires'}
  link: (scope, element, attrs) ->
    element = element[0]
    attrs.$observe 'wires', (wires) ->
      wires = (line.split(/\s+/) for line in scope.wires.split(/\n/) when line.match(/\S/))
      ctx = element.getContext('2d')
      ctx.save()
      ctx.scale element.width / 1800, element.height / 2000
      do ->
        [rows, cols] = [5, 9]
        [rw, rh] = [200, 400]
        padding = 10
        ctx.fillStyle = '#301E17'
        for i in [0...rows]
          for j in [0...cols]
            ctx.fillRect j * rw + padding, i * rh + padding, rw - 2 * padding, rh - 2 * padding
      ctx.lineWidth = 60
      # TODO consolidate with the main drawing code
      colors = ['#804010', '#f00000', '#f0a000', '#f0f000', '#00f000', '#0000f0']
      {round, sqrt} = Math
      sqr = (x) -> Math.pow(x, 2)
      for [s0, s1] in wires
        [x0, y0] = pinoutToXy(s0)
        [x1, y1] = pinoutToXy(s1)
        color_index = round(sqrt(sqr(x1 - x0, 2) + sqr(y1 - y0, 2)) / 100)
        ctx.strokeStyle = colors[color_index] ? '#d02090'
        mx = x0 + (x1 - x0) / 2
        my = y0 + (y1 - y0) / 2
        [dx, dy] = [(x1 - x0) / 5, 0]
        dx += 10 * (if dx < 0 then -1 else 1)
        [dx, dy] = [0, 10] if y0 == y1
        ctx.beginPath()
        ctx.moveTo x0, y0
        ctx.quadraticCurveTo x0 + dx, y0 + dy, mx, my
        ctx.moveTo x1, y1
        ctx.quadraticCurveTo x1 - dx, y1 - dy, mx, my
        ctx.stroke()
      ctx.restore()
