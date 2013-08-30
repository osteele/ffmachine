firebaseRootRef = new Firebase 'https://ffmachine.firebaseIO.com/'
wiringListRef = firebaseRootRef.child 'wirings'

@loadWires = (name) ->
  wiringListRef.child(name).on 'value', (snapshot) ->
    str = snapshot.val()
    array = str.replace(/(\n|\\n)$/, '').split(/\n|\\n/)
    array[i] = line.split(' ') for line, i in array
    parseInts(line) for line in array
    window.wires = array
    redraw()

@saveWires = (name, str) ->
  wiringListRef.child(name).set(str)
