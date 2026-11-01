// Relief : terrasse plate autour du château, puis coteau de vignes vers +z ; chemin de graves jusqu'à la porte
import * as THREE from 'three';
import { M } from '../materials.js';
import { add } from '../helpers.js';
import { H, P1D, CX, ZS, RS } from '../layout.js';
const { Color, MathUtils: MU } = THREE;

export function buildTerrain(scene) {
  const g = new THREE.PlaneGeometry(1600, 1600, 260, 260).rotateX(-Math.PI / 2);
  const p = g.attributes.position, col = [], soil = new Color('#b39a74'), lawn = new Color('#8fa45a'), c = new Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    p.setY(i, H(x, z));
    c.copy(soil).lerp(lawn, 1 - MU.smoothstep(z, 23, 28));
    col.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  add(scene, g, M.ground, 0, 0, 0, false).receiveShadow = true;
  M.ground.onBeforeCompile = sh => { // trou dans le terrain au droit du puits de l'escalier
    sh.vertexShader = 'varying vec2 vW;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vW = (modelMatrix * vec4(transformed, 1.)).xz;');
    sh.fragmentShader = 'varying vec2 vW;\n' + sh.fragmentShader.replace('void main() {', `void main() {\n  if (distance(vW, vec2(${CX.toFixed(2)}, ${ZS.toFixed(2)})) < ${RS.toFixed(2)}) discard;`);
  };
  // chemin de graves, du bas du coteau jusqu'à la porte
  const path = new THREE.PlaneGeometry(3.6, 316, 2, 316).rotateX(-Math.PI / 2).translate(-21, 0, 1.2 + P1D + 158);
  const pp = path.attributes.position;
  for (let i = 0; i < pp.count; i++) pp.setY(i, H(pp.getX(i), pp.getZ(i)) + 0.05);
  path.computeVertexNormals();
  add(scene, path, M.gravel, 0, 0, 0, false).receiveShadow = true;
}
