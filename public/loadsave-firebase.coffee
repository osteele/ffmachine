firebaseRootRef = new Firebase 'https://ffmachine.firebaseIO.com/'
machineListRef = firebaseRootRef.child 'machines'
machineRef = null
machine = null
reload_key = null

firebaseRootRef.child('version').on 'value', (snapshot) ->
  key = snapshot.val()
  location.reload() if reload_key and key and reload_key != key
  reload_key = key

# This replaces the function in loadsave.js
@loadWires = (name) ->
  machineRef = machineListRef.child(name)
  machineRef.on 'value', (snapshot) ->
    machine = snapshot.val()
    console.error "No machine named #{name}" unless machine
    wiring_string = snapshot.val().wiring.replace(/\\n/g, "\n")
    wire_strings = wiring_string.split(/\n/)
    wire_strings.pop() if wire_strings[wire_strings.length - 1] == ''
    window.wires = wire_strings.map (wire) -> wire.split ' '
    redraw()

# This replaces the function in loadsave.js
@saveWires = (name, wiring) ->
  wiring = wiring.replace /\r\n/g, "\n"
  return if machine.wiring == wiring
  console.error "#{machine.name} is read-only" if machine.protected
  return if machine.protected
  machineRef.child('wiring').set wiring
