filters = angular.module 'FFMachine.filters', []

filters.filter 'encode', -> encodeURIComponent

filters.filter 'objectToList', ->
  (object) ->
    return (v for k, v of object)
