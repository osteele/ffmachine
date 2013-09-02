loadWires = (filename) ->
  request = new XMLHttpRequest()
  request.onreadystatechange = -> wiresLoaded request
  request.open 'GET', 'saved/' + filename + '.txt?timestamp=' + new Date().getTime(), true
  request.send null

wiresLoaded = (request) ->
  return unless request.readyState == 4
  return unless request.status == 200
  console.log request.responseText
  array = request.responseText.split('\r\n')
  array.pop()
  array[i] = s.split(' ') for s, i in array
  wires = array
  redraw()

parseInts = (a) ->
  a[i] = parseInt(s) for s, i in a

submit = (name) ->
  saveWires name, wiresString()

saveWires = (name, str) ->
  request = new XMLHttpRequest()
  request.onreadystatechange = -> wiresSaved request
  request.open 'PUT', 'savetext.php?name=' + name, true
  request.setRequestHeader "Content-Type", 'text/plain'
  request.send(str)


wiresSaved = (req, start, len) ->
  return unless req.readyState == 4
  return unless req.status !=200
  alert "saved: " + req.responseText

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
