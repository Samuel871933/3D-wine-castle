// Le château (d'après la photo officielle « terrasse ») : façade sur z = 0, puis le reste du U autour de la cour
import * as THREE from 'three';
import { M } from '../materials.js';
import { add, boxG, hipRoof, uvScale, archShape, addWindow } from '../helpers.js';
import { P1D, CX } from '../layout.js';
const { Group } = THREE;

// porte cintrée à deux vantaux (pivot sur les gonds), s'ouvrant vers -z
function doubleDoor(parent, cx, z, r, spring, mat) {
  const out = [];
  for (const side of [-1, 1]) {
    const s = new THREE.Shape();
    s.moveTo(0, 0); s.lineTo(-side * r, 0); s.lineTo(-side * r, spring + r);
    s.absarc(-side * r, spring, r, Math.PI / 2, side < 0 ? Math.PI : 0, side > 0); s.lineTo(0, 0);
    const pivot = new Group(); pivot.position.set(cx + side * r, 0, z); pivot.userData.dyn = true; parent.add(pivot);
    add(pivot, new THREE.ExtrudeGeometry(s, { depth: .12, bevelEnabled: false }), mat);
    for (let k = 1; k < 4; k++) add(pivot, boxG(.04, spring, .03), M.iron, -side * k * r / 4, spring / 2 + .1, .13, false); // planches
    add(pivot, new THREE.TorusGeometry(.11, .02, 8, 20), M.iron, -side * (r - .2), spring * .52, .15);
    out.push([pivot, side]);
  }
  return out;
}

// renvoie les vantaux de la porte d'entrée : [pivot, côté]
export function buildChateau(scene) {
  const C = new Group(); scene.add(C);
  // corps de logis
  { const g = boxG(26.5, 10, 12); g.setIndex([...g.index.array].filter((_, i) => ![1, 5].includes(i / 6 | 0))); add(C, g, M.stone, 2.75, 5, -6); } // faces ouest et arrière ôtées : la rotonde de la salle d'accueil entre dans ce volume
  add(C, hipRoof(27.4, 12.9, 4.6), M.tile, 2.75, 10, -6);
  for (const x of [-6, 9.5]) add(C, boxG(1, 3.4, 1.8), M.stone, x, 13.4, -7);
  for (const x of [-8, -4.6, -1.2, 6.8, 10.2, 13.6]) { addWindow(C, x, 2.4, .01); addWindow(C, x, 6.8, .01); }
  add(C, boxG(26.6, .35, .3), M.ashlar, 2.75, 4.6, .15); // bandeau d'étage
  // avant-corps central à toit d'ardoise
  add(C, boxG(3.4, 12.6, 1.8), M.stone, 3, 6.3, .3);
  add(C, hipRoof(4.2, 2.8, 3.4), M.slate, 3, 12.6, .3);
  for (const y of [2.4, 6.8, 10.7]) addWindow(C, 3, y, 1.21, 0, 1, y > 10 ? 1.3 : 2.3);
  // pavillons jumeaux : P2 plein, P1 creux (vestibule derrière la porte), avancé de P1D comme sur la photo du parc
  const P1 = new Group(); P1.position.z = P1D; C.add(P1);
  add(C, boxG(7, 13.6, 7), M.stone, -14, 6.8, -3);
  for (const [x, top, g] of [[-21, 13, P1], [-14, 13.6, C]]) {
    add(g, hipRoof(7.8, 7.8, 9.6), M.slate, x, top, -3);
    add(g, boxG(.9, 4.5, .9), M.stone, x + 1.6, top + 3.6, -1.6);
    add(g, new THREE.ConeGeometry(.08, 2.2, 6), M.iron, x, top + 10.6, -3);
  }
  for (const y of [2.4, 6.8]) addWindow(C, -14, y, .51);
  addWindow(C, -14, 10.9, .51, 0, .9, 1.3); addWindow(C, -21, 6.8, .51 + P1D); addWindow(C, -21, 10.6, .51 + P1D, 0, .9, 1.3);
  {
    const s = new THREE.Shape(); s.moveTo(-3.5, 0); s.lineTo(3.5, 0); s.lineTo(3.5, 13); s.lineTo(-3.5, 13); s.lineTo(-3.5, 0);
    s.holes.push(archShape(2.4, 2.6));
    add(P1, uvScale(new THREE.ExtrudeGeometry(s, { depth: .6, bevelEnabled: false }), 1 / 2.4), M.stone, -21, 0, -.1);
    add(P1, boxG(.6, 13, 7), M.stone, -24.2, 6.5, -3); add(P1, boxG(.6, 13, 7), M.stone, -17.8, 6.5, -3);
    add(P1, boxG(6.4, .3, 7), M.stone, -21, 4.4, -3);
    const surround = new THREE.Shape(); surround.moveTo(-1.65, 0); surround.lineTo(1.65, 0); surround.lineTo(1.65, 2.6); surround.absarc(0, 2.6, 1.65, 0, Math.PI, false);
    surround.holes.push(archShape(2.4, 2.6));
    add(P1, uvScale(new THREE.ExtrudeGeometry(surround, { depth: .22, bevelEnabled: false }), 1 / 1.6), M.ashlar, -21, 0, .48);
    add(P1, hipRoof(3.8, 1.9, 1.15), M.slate, -21, 4.55, 1.3); // auvent
  }
  const leaves = doubleDoor(P1, -21, .2, 1.2, 2.6, M.door);
  for (const s of [-1, 1]) add(P1, boxG(.22, .4, .22), M.lantern, -21 + s * 2.1, 3.2, .75, false);
  // aile basse + tour ronde
  add(C, boxG(5.5, 7.6, 10), M.stone, 18.7, 3.8, -5.5);
  add(C, hipRoof(6.3, 10.8, 2.6), M.tile, 18.7, 7.6, -5.5);
  add(C, uvScale(new THREE.CylinderGeometry(4.4, 4.5, 11.5, 48, 1, true), 2 * Math.PI * 4.4 / 2.4, 11.5 / 2.4), M.stone, 24.6, 5.75, -4);
  add(C, uvScale(new THREE.ConeGeometry(4.95, 8.5, 48, 1, true), 2 * Math.PI * 4.95 / 1.8, 9.9 / 1.8), M.tile, 24.6, 15.75, -4);
  add(C, new THREE.ConeGeometry(.08, 2, 6), M.iron, 24.6, 20.8, -4);
  for (const [a, y] of [[-.55, 3], [-.15, 7.4], [.45, 3.2]]) addWindow(C, 24.6 + Math.sin(a) * 4.47, y, -4 + Math.cos(a) * 4.47, a, 1, 2);

  // derrière la cour : corps du fond et deux ailes
  add(C, boxG(44, 9, 8), M.stone, CX, 4.5, -50);
  add(C, hipRoof(44.8, 8.8, 4), M.tile, CX, 9, -50);
  for (let x = -19; x <= 19; x += 3.8) for (const y of [2.4, 6.4]) addWindow(C, CX + x, y, -45.99);
  for (const [x, ry] of [[-47, Math.PI / 2], [5, -Math.PI / 2]]) { // ailes : façades tournées vers la cour
    add(C, boxG(8, 8, 22), M.stone, x, 4, -35);
    add(C, hipRoof(22.8, 8.8, 3.6), M.tile, x, 8, -35).rotation.y = Math.PI / 2;
    for (let z = -27; z >= -43; z -= 3.8) for (const y of [2.4, 6]) addWindow(C, x + Math.sign(ry) * 4.01, y, z, ry);
  }
  return leaves;
}
