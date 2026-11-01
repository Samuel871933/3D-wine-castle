// Rendu fusain : passe 1 couleur + profondeur dans rt, passe 2 dessin plein écran (post-shader.js)
import * as THREE from 'three';
import { tex } from './materials.js';
import fragmentShader from './post-shader.js';

export function createPost(renderer, camera, sunDir) {
  // les lumières dépassent 1 (le shader y lit l'or des lanternes) : demi-flottant si le GPU sait y rendre, sinon 8 bits
  const ext = renderer.extensions, hdr = ext.has('EXT_color_buffer_half_float') || ext.has('EXT_color_buffer_float');
  const rt = new THREE.WebGLRenderTarget(1, 1, { type: hdr ? THREE.HalfFloatType : THREE.UnsignedByteType });
  rt.depthTexture = new THREE.DepthTexture(1, 1);
  const U = {
    tColor: { value: rt.texture }, tDepth: { value: rt.depthTexture },
    uRes: { value: new THREE.Vector2() }, uLogo: { value: new THREE.Vector2() }, uPR: { value: 1 }, uNear: { value: camera.near }, uFar: { value: camera.far },
    uExp: { value: 1 }, uDraw: { value: 1 }, uStyle: { value: 0 }, uInvProj: { value: camera.projectionMatrixInverse }, uCamWorld: { value: camera.matrixWorld },
    uSkyU0: { value: .42 - Math.atan2(sunDir.x, -sunDir.z) / (2 * Math.PI) }, // lueur du panorama (u ≈ 0,42) alignée sur le soleil
    tPaper: { value: tex('paper.webp') }, tSky: { value: tex('sky.webp') },
    tH1: { value: tex('hatch-1.webp') }, tH2: { value: tex('hatch-2.webp') }, tH3: { value: tex('hatch-3.webp') },
  };
  U.tSky.value.generateMipmaps = false; U.tSky.value.minFilter = THREE.LinearFilter; // pas de couture à la jonction du panorama
  const scene = new THREE.Scene();
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: U, fragmentShader, depthTest: false, depthWrite: false,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`,
  })));
  return { rt, scene, camera: new THREE.Camera(), U };
}
