filters = angular.module 'FFMachine.filters', []

filters.filter 'encodeURIComponent', ->
  encodeURIComponent

filters.filter 'propertyNot', () ->
  (objects, propertyName) ->
    (object for object in objects when not object[propertyName])

filters.filter 'objectToList', ->
  (object) ->
    (v for k, v of object)
