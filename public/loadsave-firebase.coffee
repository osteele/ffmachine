firebaseRootRef = new Firebase 'https://ffmachine.firebaseIO.com/'
machineListRef = firebaseRootRef.child 'machines'
machineRef = null
machine = null

getMachineRef = (name, cb) ->
  key = name.toLowerCase()
  machineListRef.startAt(key).endAt(key)

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
  console.error "#{machine.name} is read-only"
  return if machine.protected
  machineRef.child('wiring').set wiring
