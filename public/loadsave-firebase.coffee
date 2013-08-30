firebaseRootRef = new Firebase 'https://ffmachine.firebaseIO.com/'
machineListRef = firebaseRootRef.child 'machines'

getMachineRef = (name, cb) ->
  machineListRef.startAt(name).endAt(name)

@loadWires = (name) ->
  getMachineRef(name).on 'value', (snapshot) ->
    snapshot.forEach (child) ->
      str = child.val().wiring
      array = str.replace(/(\n|\\n)$/, '').split(/\n|\\n/)
      array[i] = line.split(' ') for line, i in array
      parseInts(line) for line in array
      window.wires = array
      redraw()

@saveWires = (name, wiring) ->
  machineRef = getMachineRef(name)
  machineRef.on 'child_added', (snapshot) ->
    snapshot.ref().child('wiring').set(wiring)
  machineRef.on 'value', (snapshot) ->
    return if snapshot.val()
    console.info 'insert'
    machineRef = machineListRef.push {name, wiring}
    machineRef.setPriority name
