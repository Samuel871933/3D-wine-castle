// Parcours caméra (plan-séquence) : repères clés (p, position, cible, focale) interpolés en Catmull-Rom
import * as THREE from 'three';
import { H, P1D, CX, ZS, CY, XC2, Z1, Z2, ST, stairY } from './layout.js';
const { Vector3: V3, MathUtils: MU } = THREE;

const G = (x, dy, z) => new V3(x, H(x, z) + dy, z);
const KEYS = [ // p, position, cible, focale
  [0.00, G(-34, 9, 165), new V3(0, 7, -4), 20],
  [0.12, G(-27, 5, 130), new V3(-3, 7.5, -4), 24],
  [0.26, G(-21, 3.8, 100), new V3(-6, 8, -4), 32],
  [0.38, G(-21, 4.6, 42), new V3(-6, 7.5, -4), 38],
  [0.50, new V3(-9, 2.2, 21), new V3(-2, 7.5, -4), 46],
  [0.60, new V3(-19.5, 1.8, 9 + P1D), new V3(-21, 2.6, P1D), 44],
  [0.67, new V3(-21, 1.75, 5.2 + P1D), new V3(-21, 2.2, P1D), 46],
  [0.70, new V3(CX, 1.7, -1.5), new V3(CX, 1.3, -12), 56],
  [0.72, new V3(CX + .3, 1.7, -8.5), new V3(CX - 11, 1.2, -14), 44],     // à gauche : le salon sous la vague de lames, le bar au fond
  [0.75, new V3(CX + .5, 1.7, -10.5), new V3(XC2 + 5, 1.3, -15.5), 56],  // à droite : la rotonde des millésimes
  [0.763, new V3(CX + 5, 1.7, -13), new V3(CX - 1, 1.6, -30), 50],          // derrière l'escalier, la porte vitrée sur la cour
  [0.775, new V3(CX - 1.6, 1.7, ZS + 5), new V3(CX, -2, ZS), 60],       // au bord du puits
  ...[0, 1, 2, 3, 4, 5].map(k => { // descente : un repère par quart de tour, sur la ligne de foulée
    const th = ST.top - k * Math.PI / 2, y = stairY(th) + 1.65, t = th - 1;
    return [.80 + k * .024, new V3(CX + Math.sin(th) * 3.05, y, ZS + Math.cos(th) * 3.05), new V3(CX + Math.sin(t) * 1.6, y - 1.4, ZS + Math.cos(t) * 1.6), 62];
  }),
  [0.94, new V3(CX - .4, CY + 1.7, ZS - 3.2), new V3(CX, CY + 1.7, Z1 - 12), 56], // sortie du puits vers le chai
  [0.965, new V3(CX, CY + 1.9, Z1 - 1.5), new V3(CX, CY + 2, Z1 - 18), 50],
  [1.00, new V3(CX, CY + 1.8, Z2 + 16), new V3(CX, CY + 3.2, Z2), 46],
];
const pc = new THREE.CatmullRomCurve3(KEYS.map(k => k[1])), lc = new THREE.CatmullRomCurve3(KEYS.map(k => k[2])), look = new V3();
export function placeCamera(camera, p) {
  let i = 0; while (i < KEYS.length - 2 && p > KEYS[i + 1][0]) i++;
  const t = MU.clamp((p - KEYS[i][0]) / (KEYS[i + 1][0] - KEYS[i][0]), 0, 1), u = (i + t) / (KEYS.length - 1);
  pc.getPoint(u, camera.position); camera.lookAt(lc.getPoint(u, look));
  camera.fov = MU.lerp(KEYS[i][3], KEYS[i + 1][3], t); camera.updateProjectionMatrix();
}
