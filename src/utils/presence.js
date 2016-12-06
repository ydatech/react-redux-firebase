const presencePath = 'presence'
const sessionPath = 'sessions'

export const setupPresence = (firebase, uid) => {
  const amOnline = firebase.database().ref('.info/connected')
  const onlineRef = firebase.database().ref(presencePath).child(uid)
  const sessionsRef = firebase.database().ref(sessionPath)
  return amOnline.on('value', snapShot => {
    if (!snapShot.val()) return

    // Push session to sessions list
    const session = sessionsRef.push({
      began: firebase.ServerValue.TIMESTAMP,
      user: uid
    })
    session.setPriority(uid)
    const endedRef = session.child('ended')

    // Set ended time of session on disconnect
    endedRef.onDisconnect().set(firebase.ServerValue.TIMESTAMP)
    onlineRef.set(true)
    onlineRef.onDisconnect().remove() // remove from presence list

    // Remove user from presense list and set ended time of session on unAuth
    firebase.database().onAuth(authData => {
      if (!authData) {
        endedRef.set(firebase.ServerValue.TIMESTAMP)
        onlineRef.remove()
      }
    })
  })
}
