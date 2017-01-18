'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _dropRight2 = require('lodash/dropRight');

var _dropRight3 = _interopRequireDefault(_dropRight2);

var _immutable = require('immutable');

var _constants = require('./constants');

var _helpers = require('./helpers');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var SET = _constants.actionTypes.SET,
    SET_PROFILE = _constants.actionTypes.SET_PROFILE,
    LOGIN = _constants.actionTypes.LOGIN,
    LOGOUT = _constants.actionTypes.LOGOUT,
    LOGIN_ERROR = _constants.actionTypes.LOGIN_ERROR,
    NO_VALUE = _constants.actionTypes.NO_VALUE,
    AUTHENTICATION_INIT_STARTED = _constants.actionTypes.AUTHENTICATION_INIT_STARTED,
    AUTHENTICATION_INIT_FINISHED = _constants.actionTypes.AUTHENTICATION_INIT_FINISHED,
    UNAUTHORIZED_ERROR = _constants.actionTypes.UNAUTHORIZED_ERROR;


var emptyState = {
  auth: undefined,
  authError: undefined,
  profile: undefined,
  isInitializing: undefined,
  data: {}
};

var initialState = (0, _immutable.fromJS)(emptyState);

var pathToArr = function pathToArr(path) {
  return path.split(/\//).filter(function (p) {
    return !!p;
  });
};

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

exports.default = function () {
  var state = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : initialState;
  var action = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var path = action.path;

  var pathArr = void 0;
  var retVal = void 0;
  console.log('state before:', (0, _helpers.toJS)(state)); // eslint-disable-line no-console
  console.log('action before:', action); // eslint-disable-line no-console

  switch (action.type) {

    case SET:
      var data = action.data;

      pathArr = pathToArr(path);
      console.debug('set called:', { action: action, state: (0, _helpers.toJS)(state) }); // eslint-disable-line no-console
      // Handle invalid keyPath error caused by deep setting to a null value
      if (data !== undefined && state.getIn(['data'].concat(_toConsumableArray(pathArr))) === null) {
        console.debug('value is null', { action: action, state: (0, _helpers.toJS)(state) }); // eslint-disable-line no-console
        console.debug('removing', { path: ['data'].concat(_toConsumableArray(pathArr)) }); // eslint-disable-line no-console
        retVal = state.deleteIn(['data'].concat(_toConsumableArray(pathArr)));
      } else if (state.getIn((0, _dropRight3.default)(['data'].concat(_toConsumableArray(pathArr)))) === null) {
        retVal = state.deleteIn((0, _dropRight3.default)(['data'].concat(_toConsumableArray(pathArr))));
      } else {
        console.log('value is not null', { action: action, state: (0, _helpers.toJS)(state) }); // eslint-disable-line no-console
        retVal = state; // start with state
      }
      console.debug('after removal of null', { action: action, state: (0, _helpers.toJS)(state) }); // eslint-disable-line no-console
      try {
        if (data !== undefined) {
          console.debug('data !== undefined is true');
          console.debug('[data, ...pathArr]', ['data'].concat(_toConsumableArray(pathArr)));
          console.debug('fromJS(data)', (0, _immutable.fromJS)(data));
          retVal = retVal.setIn(['data'].concat(_toConsumableArray(pathArr)), (0, _immutable.fromJS)(data));
        } else {
          console.debug('data !== undefined is false');
          console.debug('[data, ...pathArr]', ['data'].concat(_toConsumableArray(pathArr)));
          retVal = retVal.deleteIn(['data'].concat(_toConsumableArray(pathArr)));
        }
      } catch (err) {
        console.error('Error setting:', err.toString()); // eslint-disable-line no-console
      }

      return retVal;

    case NO_VALUE:
      pathArr = pathToArr(path);
      try {
        retVal = state.setIn(['data'].concat(_toConsumableArray(pathArr)), (0, _immutable.fromJS)({}));
      } catch (err) {
        console.error('Error setting no value:', err.toString()); // eslint-disable-line no-console
      }
      return retVal;

    case SET_PROFILE:
      var profile = action.profile;

      try {
        retVal = profile !== undefined ? state.setIn(['profile'], (0, _immutable.fromJS)(profile)) : state.deleteIn(['profile']);
      } catch (err) {
        console.error('Error setting profile:', err.toString()); // eslint-disable-line no-console
      }
      return retVal;

    case LOGOUT:
      return (0, _immutable.fromJS)({
        auth: null,
        authError: null,
        profile: null,
        isLoading: false,
        data: {}
      });

    case LOGIN:
      try {
        retVal = state.setIn(['auth'], (0, _immutable.fromJS)(action.auth)).setIn(['authError'], null);
      } catch (err) {
        console.error('Error setting profile:', err.toString()); // eslint-disable-line no-console
      }
      return retVal;

    case LOGIN_ERROR:
      try {
        retVal = state.setIn(['authError'], action.authError).setIn(['auth'], null).setIn(['profile'], null);
      } catch (err) {
        console.error('Error setting profile:', err.toString()); // eslint-disable-line no-console
      }
      return retVal;

    case AUTHENTICATION_INIT_STARTED:
      return initialState.setIn(['isInitializing'], true);
    // return state.setIn(['isInitializing'], true) // throws state.setIn not a function error

    case AUTHENTICATION_INIT_FINISHED:
      return state.setIn(['isInitializing'], false);

    case UNAUTHORIZED_ERROR:
      return state.setIn(['authError'], action.authError);

    default:
      return state;

  }
};

module.exports = exports['default'];