import {
  Color,
  CubeTexture,
  DataTexture,
  EquirectangularRefractionMapping,
  Mesh,
  MeshMatcapMaterial,
  MeshStandardMaterial,
  Object3D,
  RGBAFormat,
  Scene,
  sRGBEncoding,
  Texture,
  Vector3
} from 'three'

import { AssetLoader } from '../../../assets/classes/AssetLoader'
import { ComponentDeserializeFunction, ComponentSerializeFunction } from '../../../common/constants/PrefabFunctionType'
import { isClient } from '../../../common/functions/isClient'
import { Engine } from '../../../ecs/classes/Engine'
import { Entity } from '../../../ecs/classes/Entity'
import { getComponent, getOptionalComponent, setComponent } from '../../../ecs/functions/ComponentFunctions'
import { isHeadset } from '../../../xr/XRState'
import { EnvMapBakeComponent } from '../../components/EnvMapBakeComponent'
import { EnvmapComponent } from '../../components/EnvmapComponent'
import { ModelComponent } from '../../components/ModelComponent'
import { EnvMapSourceType, EnvMapTextureType } from '../../constants/EnvMapEnum'
import { getPmremGenerator, loadCubeMapTexture } from '../../constants/Util'
import { EnvMapBakeTypes } from '../../types/EnvMapBakeTypes'
import { addError, removeError } from '../ErrorFunctions'

const tempVector = new Vector3()
const tempColor = new Color()

export const deserializeEnvMap: ComponentDeserializeFunction = (
  entity: Entity,
  data: ReturnType<typeof EnvmapComponent.toJSON>
) => {
  if (!isClient) return
  if (entity === Engine.instance.currentScene.sceneEntity) return
  setComponent(entity, EnvmapComponent, data)
}

export const updateEnvMap = async (entity: Entity) => {
  const component = getComponent(entity, EnvmapComponent)
  const obj3d = getComponent(entity, ModelComponent).scene!
  if (!obj3d) return

  switch (component.type) {
    case EnvMapSourceType.Skybox:
      applyEnvMap(obj3d, Engine.instance.scene.background as Texture | null)
      break

    case EnvMapSourceType.Color:
      const col = component.envMapSourceColor ?? tempColor
      const resolution = 64 // Min value required
      const size = resolution * resolution
      const data = new Uint8Array(4 * size)

      for (let i = 0; i < size; i++) {
        const stride = i * 4
        data[stride] = Math.floor(col.r * 255)
        data[stride + 1] = Math.floor(col.g * 255)
        data[stride + 2] = Math.floor(col.b * 255)
        data[stride + 3] = 255
      }

      const texture = new DataTexture(data, resolution, resolution, RGBAFormat)
      texture.needsUpdate = true
      texture.encoding = sRGBEncoding

      applyEnvMap(obj3d, getPmremGenerator().fromEquirectangular(texture).texture)
      break

    case EnvMapSourceType.Texture:
      switch (component.envMapTextureType) {
        case EnvMapTextureType.Cubemap:
          {
            const texture = (await new Promise((resolve) =>
              loadCubeMapTexture(component.envMapSourceURL, resolve, undefined, (_) =>
                addError(entity, EnvmapComponent, 'MISSING_FILE', 'Skybox texture could not be found!')
              )
            )) as CubeTexture | undefined
            if (texture) {
              const EnvMap = getPmremGenerator().fromCubemap(texture).texture
              EnvMap.encoding = sRGBEncoding
              applyEnvMap(obj3d, EnvMap)
              removeError(entity, EnvmapComponent, 'MISSING_FILE')
            }
          }
          break

        case EnvMapTextureType.Equirectangular:
          {
            const texture = (await AssetLoader.loadAsync(component.envMapSourceURL, {})) as CubeTexture | undefined
            if (texture) {
              const EnvMap = getPmremGenerator().fromEquirectangular(texture).texture
              EnvMap.encoding = sRGBEncoding
              applyEnvMap(obj3d, EnvMap)
              removeError(entity, EnvmapComponent, 'MISSING_FILE')
              texture.dispose()
            } else {
              addError(entity, EnvmapComponent, 'MISSING_FILE', 'Skybox texture could not be found!')
            }
          }
          break
      }
      break

    case EnvMapSourceType.Default:
      const options = getOptionalComponent(entity, EnvMapBakeComponent)
      if (options)
        switch (options.bakeType) {
          case EnvMapBakeTypes.Baked:
            {
            }
            const texture = (await AssetLoader.loadAsync(options.envMapOrigin, {})) as Texture
            texture.mapping = EquirectangularRefractionMapping
            applyEnvMap(obj3d, texture)

            break
          case EnvMapBakeTypes.Realtime:
            // const map = new CubemapCapturer(EngineRenderer.instance.renderer, Engine.scene, options.resolution)
            // const EnvMap = (await map.update(options.bakePosition)).cubeRenderTarget.texture
            // applyEnvMap(obj3d, EnvMap)
            break
        }
      break

    default:
      applyEnvMap(obj3d, null)
      break
  }

  // if (SceneOptions.instance.envMapIntensity !== component.envMapIntensity) {
  obj3d.traverse((obj: Mesh) => {
    if (!obj.material) return

    if (Array.isArray(obj.material)) {
      obj.material.forEach((m: MeshStandardMaterial) => (m.envMapIntensity = component.envMapIntensity))
    } else {
      ;(obj.material as MeshStandardMaterial).envMapIntensity = component.envMapIntensity
    }
  })
  // }
}

export const serializeEnvMap: ComponentSerializeFunction = (entity) => {
  const component = getComponent(entity, EnvmapComponent)
  return {
    type: component.type,
    envMapTextureType: component.envMapTextureType,
    envMapSourceColor: component.envMapSourceColor.getHex(),
    envMapSourceURL: component.envMapSourceURL,
    envMapIntensity: component.envMapIntensity
  }
}

function applyEnvMap(obj3d: Object3D, envmap: Texture | null) {
  if (!obj3d) return

  if (obj3d instanceof Scene) {
    obj3d.environment = envmap
  } else {
    if (isHeadset()) return
    obj3d.traverse((child: Mesh<any, MeshStandardMaterial>) => {
      if (child.material instanceof MeshMatcapMaterial) return
      if (child.material) child.material.envMap = envmap
    })

    if ((obj3d as Mesh<any, MeshStandardMaterial>).material) {
      if ((obj3d as Mesh).material instanceof MeshMatcapMaterial) return
      ;(obj3d as Mesh<any, MeshStandardMaterial>).material.envMap = envmap
    }
  }
}
