firebaseRootRef = new Firebase 'https://ffmachine.firebaseIO.com/'
machineListRef = firebaseRootRef.child 'machines'
machineRef = null
machine = null
reload_key = null
user = null

firebaseRootRef.child('version').on 'value', (snapshot) ->
  key = snapshot.val()
  location.reload() if reload_key and key and reload_key != key
  reload_key = key

auth = new FirebaseSimpleLogin firebaseRootRef, (error, _user) ->
  if error
    console.error error
    return
  user = _user

@loadWires = (name) ->
  machineRef = machineListRef.child(name)
  machineRef.on 'value', (snapshot) ->
    machine = snapshot.val()
    console.error "No machine named #{name}" unless machine
    wiring_string = snapshot.val().wiring.replace(/\\n/g, "\n")
    wire_strings = wiring_string.split(/\n/)
    wire_strings.pop() if wire_strings[wire_strings.length - 1] == ''
    @set_wires wire_strings.map (wire) -> wire.split ' '

    connectionListRef = machineRef.child('connected')
    connectionListRef.off()
    connectionListRef.on 'value', (snapshot) ->
      user_emails = (v for k, v of snapshot?.val() || {})
      user_emails.sort()
      e = document.querySelector('#connected-users ul')
      e.innerHTML = ''
      for email in user_emails
        user_view = document.createElement 'li'
        user_view.appendChild document.createTextNode(email)
        e.appendChild user_view
    if user
      onlineRef = connectionListRef.child(user.id)
      onlineRef.onDisconnect().remove()
      onlineRef.set user.email

@saveWires = (name, wiring) ->
  wiring = wiring.replace /\r\n/g, "\n"
  return if machine.wiring == wiring
  if machine.protected
    console.error "#{machine.name} is read-only"
    return
  unless user
    console.error "Not signed in"
    return
  modified_at = Firebase.ServerValue.TIMESTAMP
  previous_wiring = machine.wiring
  machineRef.child('wiring').set wiring
  machineRef.child('modified_at').set modified_at
  machineRef.child('history').push {user: user?.email, wiring, previous_wiring, modified_at}
