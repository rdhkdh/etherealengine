import { disallow } from 'feathers-hooks-common'
import { SYNC } from 'feathers-sync'

import logRequest from '@etherealengine/server-core/src/hooks/log-request'
import setLoggedInUser from '@etherealengine/server-core/src/hooks/set-loggedin-user-in-body'

import authenticate from '../../hooks/authenticate'

// Don't remove this comment. It's needed to format import lines nicely.

export default {
  before: {
    all: [logRequest()],
    find: [disallow()],
    get: [],
    create: [authenticate(), setLoggedInUser('userId')],
    update: [disallow()],
    patch: [disallow()],
    remove: [disallow()]
  },

  after: {
    all: [],
    find: [],
    get: [],
    create: [
      (context) => {
        context[SYNC] = false
        return context
      }
    ],
    update: [],
    patch: [],
    remove: []
  },

  error: {
    all: [logRequest()],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  }
} as any
