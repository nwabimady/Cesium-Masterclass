const win = window as any;
win.CESIUM_BASE_URL = "/public/Cesium";

import { Cartesian3, Ion, Terrain, Viewer, createOsmBuildingsAsync, Math as CesiumMath, Color } from "cesium";
import *as OBC from "openbim-components"
import { CesiumCamera } from "./cesium-camera";
import * as THREE from "three";

Ion.defaultAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI3OTdmMWFlYi1lNjY2LTQzMTctYWIyNC1lNmYwZDc1ZjhkYzAiLCJpZCI6MTg0NTQwLCJpYXQiOjE3MDI1ODYzOTV9.vYeiNJ8X5BTa4C1c0bGagP0Hx3O0v0YVUSRdz1RUC2E";

const viewer = new Viewer("cesiumContainer", {
  terrain: Terrain.fromWorldTerrain(),
  useDefaultRenderLoop: false,
})

const buildingTileset = await createOsmBuildingsAsync();
viewer.scene.primitives.add(buildingTileset);

const minWGS84 = [ -4.4939814368228514, 54.165382211988955];
const maxWGS84 = [ -4.469680337004611, 54.16049659076441];

const offset = 0.002;
const center = Cartesian3.fromDegrees(
  (minWGS84[0] + maxWGS84[0]) / 2,
  (minWGS84[1] + maxWGS84[1]) / 2 - offset,
  500
  );

  viewer.camera.flyTo({
    destination:center,
    orientation: {
      heading: CesiumMath.toRadians(0),
      pitch: CesiumMath.toRadians(-60),
      roll: CesiumMath.toRadians(0),
    }
  })

  const ThreeContainer = document.getElementById("ThreeContainer") as HTMLElement;
  const components = new OBC.Components();
  components.scene = new OBC.SimpleScene(components);
  components.renderer = new OBC.SimpleRenderer(components, ThreeContainer, {alpha: true});
  components.camera = new CesiumCamera(components);
  components.raycaster = new OBC.SimpleRaycaster(components);
  components.init();
  
  const sceneComp = components.scene as OBC.SimpleScene;
  sceneComp.setup();
  const scene = sceneComp.get();
  scene.background = null;
  
  const camera = components.camera.get() as THREE.PerspectiveCamera;
  camera.fov = 45;
  const width = window.innerWidth;
  const height =  window.innerHeight;
  camera.aspect = width / height;
  camera.near = 1;
  camera.far = 10 * 1000 * 10000 ;
  
  const renderer = components.renderer as OBC.SimpleRenderer;

  const entity =  {
    name: "Polygon",
    polygon : { 
      hierarchy : Cartesian3.fromDegreesArray([
        minWGS84[0], minWGS84[1],
        maxWGS84[0], minWGS84[1],
        maxWGS84[0], maxWGS84[1],
        minWGS84[0], maxWGS84[1],
      ]),
      material : Color.RED.withAlpha(0.2)
    }
  };

  const polygon = viewer.entities.add(entity);

  type Object3D = {
    threeMesh: THREE.Object3D,
    minWGS84: number[],
    maxWGS84: number[],
  }
  const _3Dobjects: Object3D[] = [];

  const ifcLoader = new OBC.FragmentIfcLoader(components);
  const file = await fetch("asd.ifc");
  const data = await file.arrayBuffer();
  const buffer = new Uint8Array(data);
  const model = await ifcLoader.load(buffer, "asd");
  
  for(const child of model.children) {
    child.rotation.x = Math.PI / 2;
    child.position.z += 65;
  }

  scene.add(model);
  const ifcObject: Object3D = {
    threeMesh: model,
    minWGS84: minWGS84,
    maxWGS84: maxWGS84,
  }
_3Dobjects.push(ifcObject)

renderer.onBeforeUpdate.add(() => {
  viewer.render();

  const width = window.innerWidth;
  const height =  window.innerHeight;
  camera.aspect = width / height;

//@ts-ignore
  const perspectiveFrustum = viewer.camera.frustum as THREE.PerspectiveFrustum;
  if(perspectiveFrustum.fovy === undefined) return;

  camera.fov = CesiumMath.toDegrees(perspectiveFrustum.fovy);
  camera.updateProjectionMatrix();

  const cartToVec = function(cart: any) {
    return new THREE.Vector3(cart.x, cart.y, cart.z);
  }
  // Configure Three.js meshes to stand against globe center position up direction
  for( const id in _3Dobjects){
    const minWGS84 = _3Dobjects[id].minWGS84;
    const maxWGS84 = _3Dobjects[id].maxWGS84;

  // convert lat/long center position to Cartesian3
  const center = Cartesian3.fromDegrees(
    (minWGS84[0] + maxWGS84[0]) / 2, 
    (minWGS84[1] + maxWGS84[1]) / 2
    );

  // get forward direction for orienting model
  const centerHigh = Cartesian3.fromDegrees(
    (minWGS84[0] + maxWGS84[0]) / 2, 
    (minWGS84[1] + maxWGS84[1]) / 2,
    1
    );
    const centerHighVec = new THREE.Vector3(
      centerHigh.x,
      centerHigh.y,
      centerHigh.z
    );
  // use direction from bottom left to top left as up-vector
  const bottomLeft  = cartToVec(
    Cartesian3.fromDegrees(minWGS84[0], minWGS84[1])
    );
  const topLeft = cartToVec(Cartesian3.fromDegrees(minWGS84[0], maxWGS84[1]));
  const latDir  = new THREE.Vector3()
    .subVectors(bottomLeft,topLeft )
    .normalize();

  // configure entity position and orientation
  _3Dobjects[id].threeMesh.position.set(center.x, center.y, center.z);
  _3Dobjects[id].threeMesh.lookAt(centerHighVec);
  _3Dobjects[id].threeMesh.up.copy(latDir);
}
  
// Clone Cesium Camera projection position so the
  // Three.js Object will appear to be at the same place as above the Cesium Globe
  camera.matrixAutoUpdate = false;
   const cvm = viewer.camera.viewMatrix;
   const civm = viewer.camera.inverseViewMatrix;
  camera.matrixWorld.set(
      civm[0], civm[4], civm[8 ], civm[12],
      civm[1], civm[5], civm[9 ], civm[13],
      civm[2], civm[6], civm[10], civm[14],
      civm[3], civm[7], civm[11], civm[15]
  );
  camera.matrixWorldInverse.set(
      cvm[0], cvm[4], cvm[8 ], cvm[12],
      cvm[1], cvm[5], cvm[9 ], cvm[13],
      cvm[2], cvm[6], cvm[10], cvm[14],
      cvm[3], cvm[7], cvm[11], cvm[15]
  );
  camera.updateProjectionMatrix();


})