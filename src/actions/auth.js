import { omit, isArray, isString, isFunction } from 'lodash'
import jwtDecode from 'jwt-decode'
import { actionTypes, defaultJWTProps } from '../constants'
import { promisesForPopulate } from '../utils/populate'
import { getLoginMethodAndParams } from '../utils/auth'

const {
  SET_PROFILE,
  LOGIN,
  LOGOUT,
  LOGIN_ERROR,
  UNAUTHORIZED_ERROR,
  AUTHENTICATION_INIT_STARTED,
  AUTHENTICATION_INIT_FINISHED
} = actionTypes

/**
 * @description Dispatch login error action
 * @param {Function} dispatch - Action dispatch function
 * @param {Object} authError - Error object
 * @private
 */
export const dispatchLoginError = (dispatch, authError) =>
  dispatch({
    type: LOGIN_ERROR,
    authError
  })

/**
 * @description Dispatch login error action
 * @param {Function} dispatch - Action dispatch function
 * @param {Object} authError - Error object
 * @private
 */
export const dispatchUnauthorizedError = (dispatch, authError) =>
  dispatch({
    type: UNAUTHORIZED_ERROR,
    authError
  })

/**
 * @description Dispatch login action
 * @param {Function} dispatch - Action dispatch function
 * @param {Object} auth - Auth data object
 * @private
 */
export const dispatchLogin = (dispatch, auth) =>
  dispatch({
    type: LOGIN,
    auth,
    authError: null
  })

/**
 * @description Remove listener from user profile
 * @param {Object} firebase - Internal firebase object
 * @private
 */
export const unWatchUserProfile = (firebase) => {
  const authUid = firebase._.authUid
  const userProfile = firebase._.config.userProfile
  if (firebase._.profileWatch) {
    firebase.database()
      .ref()
      .child(`${userProfile}/${authUid}`)
      .off('value', firebase._.profileWatch)
    firebase._.profileWatch = null
  }
}

/**
 * @description Watch user profile
 * @param {Function} dispatch - Action dispatch function
 * @param {Object} firebase - Internal firebase object
 * @private
 */
export const watchUserProfile = (dispatch, firebase) => {
  const authUid = firebase._.authUid
  const userProfile = firebase._.config.userProfile
  unWatchUserProfile(firebase)

  if (firebase._.config.userProfile) {
    firebase._.profileWatch = firebase.database()
      .ref()
      .child(`${userProfile}/${authUid}`)
      .on('value', snap => {
        const { profileParamsToPopulate } = firebase._.config
        if (!profileParamsToPopulate || (!isArray(profileParamsToPopulate) && !isString(profileParamsToPopulate))) {
          dispatch({
            type: SET_PROFILE,
            profile: snap.val()
          })
        } else {
          // Convert each populate string in array into an array of once query promises
          promisesForPopulate(firebase, snap.val(), profileParamsToPopulate)
            .then(data => {
              // Dispatch action with profile combined with populated parameters
              dispatch({
                type: SET_PROFILE,
                profile: Object.assign(
                  snap.val(), // profile
                  data
                )
              })
            })
        }
      })
  }
}

/**
 * @description Create user profile if it does not already exist. `updateProifleOnLogin: false`
 * can be passed to config to dsiable updating. Profile factory is applied if it exists and is a function.
 * @param {Function} dispatch - Action dispatch function
 * @param {Object} firebase - Internal firebase object
 * @param {Object} userData - User data object (response from authenticating)
 * @param {Object} profile - Profile data to place in new profile
 * @return {Promise}
 * @private
 */
export const createUserProfile = (dispatch, firebase, userData, profile) => {
  if (!firebase._.config.userProfile) {
    return Promise.resolve(userData)
  }
  const { database, _: { config } } = firebase
  if (isFunction(config.profileFactory)) {
    profile = config.profileFactory(userData, profile)
  }
  if (isFunction(config.profileDecorator)) {
    if (isFunction(console.warn)) { // eslint-disable-line no-console
      console.warn('profileDecorator is Depreceated and will be removed in future versions. Please use profileFactory.') // eslint-disable-line no-console
    }
    profile = config.profileDecorator(userData, profile)
  }
  // Check for user's profile at userProfile path if provided
  return database()
    .ref()
    .child(`${config.userProfile}/${userData.uid}`)
    .once('value')
    .then(profileSnap =>
      // update profile only if doesn't exist or if set by config
      !config.updateProfileOnLogin && profileSnap.val() !== null
        ? profileSnap.val()
        : profileSnap.ref.update(profile) // Update the profile
            .then(() => profile)
            .catch(err => {
              // Error setting profile
              dispatchUnauthorizedError(dispatch, err)
              return Promise.reject(err)
            })
    )
    .catch(err => {
      // Error reading user profile
      dispatchUnauthorizedError(dispatch, err)
      return Promise.reject(err)
    })
}

/**
 * @description Initialize authentication state change listener that
 * watches user profile and dispatches login action
 * @param {Function} dispatch - Action dispatch function
 * @private
 */
export const init = (dispatch, firebase) => {
  dispatch({ type: AUTHENTICATION_INIT_STARTED })

  firebase.auth().onAuthStateChanged(authData => {
    if (!authData) {
      return dispatch({ type: LOGOUT })
    }

    firebase._.authUid = authData.uid
    watchUserProfile(dispatch, firebase)

    dispatchLogin(dispatch, authData)

    // Run onAuthStateChanged if it exists in config
    if (firebase._.config.onAuthStateChanged) {
      firebase._.config.onAuthStateChanged(authData, firebase)
    }
  })

  if (firebase._.config.enableRedirectHandling) {
    firebase.auth().getRedirectResult()
      .then((authData) => {
        if (!authData || !authData.user) {
          return dispatch({ type: LOGOUT })
        }
        const { user } = authData

        firebase._.authUid = user.uid
        watchUserProfile(dispatch, firebase)

        dispatchLogin(dispatch, user)

        createUserProfile(
          dispatch,
          firebase,
          user,
          {
            email: user.email,
            displayName: user.providerData[0].displayName || user.email,
            avatarUrl: user.providerData[0].photoURL,
            providerData: user.providerData
          }
        )
      }).catch((error) => {
        dispatchLoginError(dispatch, error)
        return Promise.reject(error)
      })
  }

  firebase.auth().currentUser

  dispatch({ type: AUTHENTICATION_INIT_FINISHED })
}

/**
 * @description Login with errors dispatched
 * @param {Function} dispatch - Action dispatch function
 * @param {Object} firebase - Internal firebase object
 * @param {Object} credentials - Login credentials
 * @param {Object} credentials.email - Email to login with (only needed for email login)
 * @param {Object} credentials.password - Password to login with (only needed for email login)
 * @param {Object} credentials.provider - Provider name such as google, twitter (only needed for 3rd party provider login)
 * @param {Object} credentials.type - Popup or redirect (only needed for 3rd party provider login)
 * @param {Object} credentials.token - Custom or provider token
 * @return {Promise}
 * @private
 */
export const login = (dispatch, firebase, credentials) => {
  dispatchLoginError(dispatch, null)
  let { method, params } = getLoginMethodAndParams(firebase, credentials)

  return firebase.auth()[method](...params)
    .then((userData) => {
      // Handle null response from getRedirectResult before redirect has happened
      if (!userData) return Promise.resolve(null)

      // For email auth return uid (createUser is used for creating a profile)
      if (userData.email) return userData.uid

      // For token auth, the user key doesn't exist. Instead, return the JWT.
      if (method === 'signInWithCustomToken') {
        // Extract the extra data in the JWT token for user object
        const { stsTokenManager: { accessToken }, uid } = userData.toJSON()
        const extraJWTData = omit(jwtDecode(accessToken), defaultJWTProps)

        return createUserProfile(
          dispatch,
          firebase,
          { uid },
          { ...extraJWTData, uid }
        )
      }

      // Create profile when logging in with external provider
      const { user } = userData

      return createUserProfile(
        dispatch,
        firebase,
        user,
        {
          email: user.email,
          displayName: user.providerData[0].displayName || user.email,
          avatarUrl: user.providerData[0].photoURL,
          providerData: user.providerData
        }
      )
    })
    .catch(err => {
      dispatchLoginError(dispatch, err)
      return Promise.reject(err)
    })
}

/**
 * @description Logout of firebase and dispatch logout event
 * @param {Function} dispatch - Action dispatch function
 * @param {Object} firebase - Internal firebase object
 * @private
 */
export const logout = (dispatch, firebase) => {
  firebase.auth().signOut()
  dispatch({ type: LOGOUT })
  firebase._.authUid = null
  unWatchUserProfile(firebase)
  return Promise.resolve(firebase)
}

/**
 * @description Create a new user in auth and add an account to userProfile root
 * @param {Function} dispatch - Action dispatch function
 * @param {Object} firebase - Internal firebase object
 * @param {Object} credentials - Login credentials
 * @return {Promise}
 * @private
 */
export const createUser = (dispatch, firebase, { email, password, signIn }, profile) => {
  dispatchLoginError(dispatch, null)

  if (!email || !password) {
    dispatchLoginError(dispatch, new Error('Email and Password are required to create user'))
    return Promise.reject(new Error('Email and Password are Required'))
  }

  return firebase.auth()
    .createUserWithEmailAndPassword(email, password)
    .then((userData) =>
      // Login to newly created account if signIn flag is true
      firebase.auth().currentUser || (!!signIn && signIn === false)
        ? createUserProfile(dispatch, firebase, userData, profile)
        : login(dispatch, firebase, { email, password })
            .then(() => createUserProfile(dispatch, firebase, userData, profile || { email }))
            .catch(err => {
              if (err) {
                switch (err.code) {
                  case 'auth/user-not-found':
                    dispatchLoginError(dispatch, new Error('The specified user account does not exist.'))
                    break
                  default:
                    dispatchLoginError(dispatch, err)
                }
              }
              return Promise.reject(err)
            })
    )
    .catch((err) => {
      dispatchLoginError(dispatch, err)
      return Promise.reject(err)
    })
}

/**
 * @description Send password reset email to provided email
 * @param {Function} dispatch - Action dispatch function
 * @param {Object} firebase - Internal firebase object
 * @param {String} email - Email to send recovery email to
 * @return {Promise}
 * @private
 */
export const resetPassword = (dispatch, firebase, email) => {
  dispatchLoginError(dispatch, null)
  return firebase.auth()
    .sendPasswordResetEmail(email)
    .catch((err) => {
      if (err) {
        switch (err.code) {
          case 'auth/user-not-found':
            dispatchLoginError(dispatch, new Error('The specified user account does not exist.'))
            break
          default:
            dispatchLoginError(dispatch, err)
        }
        return Promise.reject(err)
      }
    })
}

export default {
  dispatchLoginError,
  dispatchUnauthorizedError,
  dispatchLogin,
  unWatchUserProfile,
  watchUserProfile,
  init,
  createUserProfile,
  login,
  logout,
  createUser,
  resetPassword
}
