import * as THREE from "three";
import { Component } from "openbim-components";

export class CesiumCamera extends Component<THREE.Camera> {
    enabled = true;
    
    private _camera = new THREE.PerspectiveCamera();

    get() {
        return this._camera
    }
}