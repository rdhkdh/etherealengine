import { Paginated } from '@feathersjs/feathers'

import { InviteType } from '@etherealengine/common/src/interfaces/InviteType'
import { matches, Validator } from '@etherealengine/engine/src/common/functions/MatchesUtils'
import {
  addActionReceptor,
  defineAction,
  defineState,
  dispatchAction,
  getMutableState,
  useState
} from '@etherealengine/hyperflux'

import { API } from '../../API'
import { NotificationService } from '../../common/services/NotificationService'

//State
const InviteTypeState = defineState({
  name: 'InviteTypeState',
  initial: () => ({
    invitesType: [] as Array<InviteType>,
    skip: 0,
    limit: 5,
    total: 0
  })
})

export const InviteTypeServiceReceptor = (action) => {
  const s = getMutableState(InviteTypeState)
  matches(action).when(InviteTypeAction.retrievedInvitesTypes.matches, (action) => {
    return s.merge({
      invitesType: action.invitesType.data,
      skip: action.skip,
      limit: action.limit,
      total: action.total
    })
  })
}
/**@deprecated use getMutableState directly instead */
export const accessInviteTypeState = () => getMutableState(InviteTypeState)
/**@deprecated use useHookstate(getMutableState(...) directly instead */
export const useInviteTypeState = () => useState(accessInviteTypeState())

//Service
export const InviteTypeService = {
  retrieveInvites: async () => {
    dispatchAction(InviteTypeAction.fetchingInvitesTypes({}))
    try {
      const inviteTypeResult = (await API.instance.client.service('invite-type').find()) as Paginated<InviteType>
      dispatchAction(
        InviteTypeAction.retrievedInvitesTypes({
          invitesType: inviteTypeResult,
          total: inviteTypeResult.total,
          skip: inviteTypeResult.skip,
          limit: inviteTypeResult.limit
        })
      )
    } catch (err) {
      NotificationService.dispatchNotify(err.message, { variant: 'error' })
    }
  }
}

//Action
export class InviteTypeAction {
  static retrievedInvitesTypes = defineAction({
    type: 'xre.client.InviteType.LOAD_INVITE_TYPE' as const,
    total: matches.number,
    limit: matches.number,
    invitesType: matches.any as Validator<unknown, Paginated<InviteType>>,
    skip: matches.number
  })

  static fetchingInvitesTypes = defineAction({
    type: 'xre.client.InviteType.FETCHING_RECEIVED_INVITES_TYPES' as const
  })
}
