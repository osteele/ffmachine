firebaseRootRef = new Firebase 'https://ffmachine.firebaseIO.com/'
machineListRef = firebaseRootRef.child 'machines'

getMachineRef = (name, cb) ->
  key = name.toLowerCase()
  machineListRef.startAt(key).endAt(key)

# This replaces the function in loadsave.js
@loadWires = (name) ->
  getMachineRef(name).on 'value', (snapshot) ->
    console.error "No document named #{name}" unless snapshot.val()
    snapshot.forEach (child) ->
      wiring_string = child.val().wiring.replace(/\\n/g, "\n")
      wire_strings = wiring_string.split(/\n/)
      wire_strings.pop() if wire_strings[wire_strings.length - 1] == ''
      window.wires = wire_strings.map (wire) -> wire.split ' '
      redraw()

# This replaces the function in loadsave.js
@saveWires = (name, wiring) ->
  machineRef = getMachineRef(name)
  wiring = wiring.replace(/\r\n/g, "\n")
  machineRef.on 'child_added', (snapshot) ->
    snapshot.ref().child('wiring').set(wiring)
  machineRef.on 'value', (snapshot) ->
    return if snapshot.val()
    machineRef = machineListRef.push {name, wiring}
    machineRef.setPriority name.toLowerCase()
