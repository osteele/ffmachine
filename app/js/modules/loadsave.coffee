filename = null
readonly = null
sync = null

@setup = ->
  urlvars = getUrlVars()
  filename = urlvars['name']
  readonly = urlvars['readonly']
  sync = urlvars['sync']
  @setupCanvas()
  loadWires filename if filename

@wires_changed = (wires) ->
  return if readonly
  saveWires name, wiresString(wires)

wiresString = (wires) ->
  (wire.join(' ') for wire in wires).join('\r\n')

getUrlVars = ->
  vars = []
  hash = null
  for q in window.location.search.slice(1).split(/&/)
    [k, v] = q.split('=', 2)
    vars.push k
    vars[k] = decodeURIComponent(v)
  return vars
