import { dropRight } from 'lodash'
import { fromJS } from 'immutable'
import { actionTypes } from './constants'

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
  switch (action.type) {

    case SET:
      const { data } = action
      pathArr = pathToArr(path)

      // Handle invalid keyPath error caused by deep setting to a null value
      if (data !== undefined && state.getIn(['data', ...pathArr]) === null) {
        retVal = state.deleteIn(['data', ...pathArr])
      } else if (state.getIn(dropRight(['data', ...pathArr])) === null) {
        retVal = state.deleteIn(dropRight(['data', ...pathArr]))
      } else {
        retVal = state // start with state
      }

      retVal = (profile !== undefined)
        ? retVal.setIn(['data', ...pathArr], fromJS(data))
        : retVal.deleteIn(['data', ...pathArr])

      return retVal

    case NO_VALUE:
      pathArr = pathToArr(path)
      return state.setIn(['data', ...pathArr], fromJS({}))

    case SET_PROFILE:
      const { profile } = action
      return profile !== undefined
        ? state.setIn(['profile'], fromJS(profile))
        : state.deleteIn(['profile'])

    case LOGOUT:
      return fromJS({
        auth: null,
        authError: null,
        profile: null,
        isLoading: false,
        data: {}
      })

    case LOGIN:
      return state
              .setIn(['auth'], fromJS(action.auth))
              .setIn(['authError'], null)

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
