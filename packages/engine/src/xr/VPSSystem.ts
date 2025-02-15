import { createActionQueue, removeActionQueue } from '@etherealengine/hyperflux'

import { Engine } from '../ecs/classes/Engine'
import { defineQuery, getComponent, getComponentState, removeQuery } from '../ecs/functions/ComponentFunctions'
import { LocalTransformComponent } from '../transform/components/TransformComponent'
import {
  PersistentAnchorActions,
  PersistentAnchorComponent,
  SCENE_COMPONENT_PERSISTENT_ANCHOR
} from './XRAnchorComponents'

export async function VPSSystem() {
  Engine.instance.sceneComponentRegistry.set(PersistentAnchorComponent.name, SCENE_COMPONENT_PERSISTENT_ANCHOR)
  Engine.instance.sceneLoadingRegistry.set(SCENE_COMPONENT_PERSISTENT_ANCHOR, {
    defaultData: {}
  })

  const vpsAnchorQuery = defineQuery([PersistentAnchorComponent])
  const vpsAnchorFoundQueue = createActionQueue(PersistentAnchorActions.anchorFound.matches)
  const vpsAnchorUpdatedQueue = createActionQueue(PersistentAnchorActions.anchorUpdated.matches)
  const vpsAnchorLostQueue = createActionQueue(PersistentAnchorActions.anchorLost.matches)

  const execute = () => {
    const anchors = vpsAnchorQuery()

    for (const action of vpsAnchorFoundQueue()) {
      for (const entity of anchors) {
        const anchor = getComponentState(entity, PersistentAnchorComponent)
        if (anchor.name.value === action.name) {
          anchor.active.set(true)
          const localTransform = getComponent(entity, LocalTransformComponent)
          localTransform.position.copy(action.position)
          localTransform.rotation.copy(action.rotation)
        }
      }
    }

    for (const action of vpsAnchorUpdatedQueue()) {
      for (const entity of anchors) {
        const anchor = getComponentState(entity, PersistentAnchorComponent)
        if (anchor.name.value === action.name) {
          const localTransform = getComponent(entity, LocalTransformComponent)
          localTransform.position.copy(action.position)
          localTransform.rotation.copy(action.rotation)
        }
      }
    }

    for (const action of vpsAnchorLostQueue()) {
      for (const entity of anchors) {
        const anchor = getComponentState(entity, PersistentAnchorComponent)
        if (anchor.name.value === action.name) anchor.active.set(false)
      }
    }
  }

  const cleanup = async () => {
    Engine.instance.sceneComponentRegistry.delete(PersistentAnchorComponent.name)
    Engine.instance.sceneLoadingRegistry.delete(SCENE_COMPONENT_PERSISTENT_ANCHOR)
    removeActionQueue(vpsAnchorFoundQueue)
    removeActionQueue(vpsAnchorUpdatedQueue)
    removeActionQueue(vpsAnchorLostQueue)
    removeQuery(vpsAnchorQuery)
  }

  return { execute, cleanup, subsystems: [] }
}
