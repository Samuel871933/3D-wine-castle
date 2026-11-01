// Le monde (un seul : extérieur et chai sont contigus), puis fusion des pièces fixes par matériau
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { add } from './helpers.js';
import { buildTerrain } from './world/terrain.js';
import { buildChateau } from './world/chateau.js';
import { buildGardens } from './world/jardins.js';
import { buildAccueil } from './world/accueil.js';
import { buildStairs } from './world/escalier.js';
import { buildChai } from './world/chai.js';
const { Vector3: V3, MathUtils: MU } = THREE;

export function buildWorld() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2('#f4ecdc', 0.0014); // le lointain se dissout dans le papier
  const sunDir = new V3().setFromSphericalCoords(1, MU.degToRad(76), MU.degToRad(-58));
  const sun = new THREE.DirectionalLight('#fff1dc', 3);
  sun.position.copy(sunDir).multiplyScalar(200).add(new V3(-10, 0, -15));
  sun.target.position.set(-10, 0, -15);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -80, right: 80, top: 70, bottom: -70, near: 10, far: 500 });
  sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.05;
  scene.add(sun, sun.target, new THREE.HemisphereLight('#fff4e0', '#6b5a40', 0.9));

  buildTerrain(scene);
  const doors = buildChateau(scene);
  const outside = buildGardens(scene); // vignes / barriques : affichées seulement du côté de la porte où se trouve la caméra
  buildAccueil(scene);
  buildStairs(scene);
  const chai = buildChai(scene);

  // fusion : toutes les pièces fixes d'un même matériau deviennent un seul objet (des centaines d'appels de dessin → ~25)
  scene.updateMatrixWorld(true);
  const groups = new Map(), merged = [];
  scene.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh) return;
    for (let a = o; a; a = a.parent) if (a.userData.dyn) return; // les vantaux restent mobiles
    const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(o.matrixWorld);
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k);
    if (!groups.has(o.material)) groups.set(o.material, []);
    groups.get(o.material).push(g); merged.push(o);
  });
  merged.forEach(o => o.removeFromParent());
  for (const [m, gs] of groups) { add(scene, mergeGeometries(gs), m); gs.forEach(g => g.dispose()); }

  return { scene, sunDir, doors, chaiDoors: chai.leaves, outside, inside: chai.inside };
}
