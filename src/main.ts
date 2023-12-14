const win = window as any;
win.CESIUM_BASE_URL = "/public/Cesium";

import { Cartesian3, Ion, Terrain, Viewer, createOsmBuildingsAsync, Math as CesiumMath } from "cesium";

Ion.defaultAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI3OTdmMWFlYi1lNjY2LTQzMTctYWIyNC1lNmYwZDc1ZjhkYzAiLCJpZCI6MTg0NTQwLCJpYXQiOjE3MDI1ODYzOTV9.vYeiNJ8X5BTa4C1c0bGagP0Hx3O0v0YVUSRdz1RUC2E";

const viewer = new Viewer("cesiumContainer", {
  terrain: Terrain.fromWorldTerrain(),
  //useDefaultRenderLoop: false,
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