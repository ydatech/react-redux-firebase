import { fromJS } from 'immutable'
import { actionTypes } from './constants'
import { toJS } from './helpers'

const {
  SET,
  SET_PROFILE,
  LOGIN,
  LOGOUT,
  LOGIN_ERROR,
  NO_VALUE,
  AUTHENTICATION_INIT_STARTED,
  AUTHENTICATION_INIT_FINISHED,
  UNAUTHORIZED_ERROR
} = actionTypes

const emptyState = {
  auth: undefined,
  authError: undefined,
  profile: undefined,
  isInitializing: undefined,
  data: {}
}

const initialState = fromJS(emptyState)

const pathToArr = path => path.split(/\//).filter(p => !!p)

/**
 * @name firebaseStateReducer
 * @description Reducer for react redux firebase. This function is called
 * automatically by redux every time an action is fired. Based on which action
 * is called and its payload, the reducer will update redux state with relevant
 * changes.
 * @param {Map} state - Current Redux State
 * @param {Object} action - Action which will modify state
 * @param {String} action.type - Type of Action being called
 * @param {String} action.data - Type of Action which will modify state
 * @return {Map} State
 */
export default (state = initialState, action = {}) => {
  const { path } = action
  let pathArr
  let retVal
  console.log('state before:', toJS(state)) // eslint-disable-line no-console
  console.log('action before:', action) // eslint-disable-line no-console

  switch (action.type) {

    case SET:
      const { data } = action
      pathArr = pathToArr(path)
      try {
        retVal = (data !== undefined)
          ? state.setIn(['data', ...pathArr], fromJS(data))
          : state.deleteIn(['data', ...pathArr])
      } catch (err) {
        console.error('Error setting:', err.toString()) // eslint-disable-line no-console
      }

      return retVal

    case NO_VALUE:
      pathArr = pathToArr(path)
      try {
        retVal = state.setIn(['data', ...pathArr], fromJS({}))
      } catch (err) {
        console.error('Error setting no value:', err.toString()) // eslint-disable-line no-console
      }
      return retVal

    case SET_PROFILE:
      const { profile } = action
      try {
        retVal = (profile !== undefined)
          ? state.setIn(['profile'], fromJS(profile))
          : state.deleteIn(['profile'])
      } catch (err) {
        console.error('Error setting profile:', err.toString()) // eslint-disable-line no-console
      }
      return retVal

    case LOGOUT:
      return fromJS({
        auth: null,
        authError: null,
        profile: null,
        isLoading: false,
        data: {}
      })

    case LOGIN:
      try {
        retVal = state.setIn(['auth'], fromJS(action.auth))
                    .setIn(['authError'], null)
      } catch (err) {
        console.error('Error setting profile:', err.toString()) // eslint-disable-line no-console
      }
      return retVal

    case LOGIN_ERROR:
      return state
              .setIn(['authError'], action.authError)
              .setIn(['auth'], null)
              .setIn(['profile'], null)

    case AUTHENTICATION_INIT_STARTED:
      return initialState.setIn(['isInitializing'], true)
    // return state.setIn(['isInitializing'], true) // throws state.setIn not a function error

    case AUTHENTICATION_INIT_FINISHED:
      return state.setIn(['isInitializing'], false)

    case UNAUTHORIZED_ERROR:
      return state.setIn(['authError'], action.authError)

    default:
      return state

  }
}
