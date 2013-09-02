submit = (name) ->
  saveWires name, wiresString()

wiresString = ->
  (wire.join(' ') for wire in wires).join('\r\n')

getUrlVars = ->
  vars = []
  hash = null
  for q in window.location.search.slice(1).split(/&/)
    [k, v] = q.split('=', 2)
    vars.push k
    vars[k] = decodeURIComponent(v)
  return vars
