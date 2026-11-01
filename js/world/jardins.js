// Jardins, arbres, vignes, et la cour derrière la salle d'accueil
import * as THREE from 'three';
import { M, drawn, std, TX } from '../materials.js';
import { add, boxG, bushy } from '../helpers.js';
import { H, P1D, CX } from '../layout.js';
const { Group, Color, MathUtils: MU } = THREE;

const topi = bushy(new THREE.ConeGeometry(.75, 2.4, 32, 10), .75, 1.2, .75, .05), ball = bushy(new THREE.SphereGeometry(.8, 32, 22), .8, .8, .8, .05);
const hedgeG = (w, h, d) => bushy(new THREE.BoxGeometry(w, h, d, Math.round(w * 6), 6, 8), w / 2, h / 2, d / 2, .05);
const blobG = bushy(new THREE.SphereGeometry(1, 28, 18), 1, 1, 1, .09, .45); // houppier (mis à l'échelle ×3 environ) : plus bosselé que les buis taillés

// renvoie les vignes : affichées seulement quand la caméra est dehors
export function buildGardens(scene) {
  // buis taillés de la terrasse
  for (let x = -46; x < 58; x += 7.5) if (Math.abs(x + 21) > 4) { add(scene, hedgeG(6, .9, 1.1), M.hedge, x + 3.75, .45, 21); add(scene, topi, M.hedge, x, 1.2, 21.2); }
  for (const x of [-27, -15.5, -9, -2, 8, 14]) add(scene, ball, M.hedge, x, .6, 2.2);
  add(scene, topi, M.hedge, -25.5, 1.2, 2.6 + P1D); add(scene, topi, M.hedge, -16.5, 1.2, 2.6);
  add(scene, hedgeG(16, .8, 1), M.hedge, 5, .4, 4.5);

  // cour derrière la salle d'accueil : pelouse, allée de graves bordée de buis
  add(scene, new THREE.PlaneGeometry(44, 23).rotateX(-Math.PI / 2), std('#8fa45a'), CX, .05, -34.5, false).receiveShadow = true;
  add(scene, new THREE.PlaneGeometry(3, 23).rotateX(-Math.PI / 2), M.gravel, CX, .07, -34.5, false).receiveShadow = true;
  for (const s of [-1, 1]) add(scene, hedgeG(.7, .6, 18), M.hedge, CX + s * 2, .3, -35.5);
  for (const [x, z] of [[-8, -28], [8, -28], [-8, -40], [8, -40], [-15, -34], [15, -34]]) add(scene, topi, M.hedge, CX + x, 1.2, z);
  for (const x of [-5, 5]) add(scene, ball, M.hedge, CX + x, .6, -34.5);

  buildTrees(scene);
  return buildVines(scene);
}

function buildTrees(scene) {
  function pine(x, z, s = 1, lean = 0) {
    const g = new Group(); g.position.set(x, H(x, z), z); g.rotation.z = lean; scene.add(g);
    add(g, new THREE.CylinderGeometry(.22 * s, .45 * s, 13 * s, 8), M.bark, 0, 6.5 * s, 0);
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * Math.PI * 2, r = i ? 3.4 * s : 0;
      add(g, blobG, M.leaf, Math.cos(a) * r, 13 * s + Math.random() * 1.2 * s, Math.sin(a) * r).scale.set(3.4 * s, 1.3 * s, 3.4 * s);
    }
  }
  function tree(x, z, s = 1) {
    const g = new Group(); g.position.set(x, H(x, z), z); scene.add(g);
    add(g, new THREE.CylinderGeometry(.25 * s, .4 * s, 6 * s, 7), M.bark, 0, 3 * s, 0);
    for (let i = 0; i < 4; i++) add(g, blobG, M.leaf, (Math.random() - .5) * 4 * s, 7 * s + Math.random() * 2 * s, (Math.random() - .5) * 4 * s).scale.setScalar(3 * s);
  }
  pine(34, 4, 1.15, -.08); pine(42, -6, 1.05, .05); pine(30, -16, 1); pine(-42, -2, .95, .06); pine(50, 10, .9);
  for (const [x, z, s] of [[-60, -40, 1.2], [-21, -64, 1.4], [14, -30, 1.3], [22, -26, 1.1], [-52, 8, 1], [60, -20, 1.2]]) tree(x, z, s);
}

function buildVines(scene) {
  const pal = ['#d9b54a', '#c99c3a', '#e2c264', '#a8ac4a', '#8e9a42', '#bf8440'].map(c => new Color(c));
  const spots = [];
  for (let x = -90; x <= 80; x += 2) {
    if (Math.abs(x + 21) < 3) continue; // z < 185 : la caméra ne recule jamais au-delà de z = 165, les rangs plus bas ne sont jamais vus
    for (let z = 30; z < 185; z += 1.6) spots.push([x + (Math.random() - .5) * .1, z + (Math.random() - .5) * .3]);
  }
  // tronçon de haie palissée (un par cep, 1,9 m pour chevaucher les voisins à 1,6 m) : rang continu, sommet ébouriffé, flancs bombés
  const leafG = new THREE.BoxGeometry(.46, .62, 1.9, 2, 3, 8), lp = leafG.attributes.position, ln = leafG.attributes.normal, luv = leafG.attributes.uv;
  for (let i = 0; i < lp.count; i++) {
    const x = lp.getX(i), y = lp.getY(i), z = lp.getZ(i), u = y / .31; // u : -1 en bas, 1 en haut
    luv.setXY(i, Math.abs(ln.getX(i)) > .5 ? z : x, Math.abs(ln.getY(i)) > .5 ? z : y); // UV en mètres, avant déformation
    // déformation fonction de la position seule : les sommets dupliqués aux arêtes bougent ensemble, pas de fissure
    lp.setXYZ(i, x * (1 - .3 * u * u + .25 * Math.sin(z * 9 + y * 5)), y + (u > 0 ? .06 * Math.sin(z * 7.3) + .04 * Math.sin(z * 17 + x * 20) : 0), z);
  }
  leafG.computeVertexNormals();
  const vines = new THREE.InstancedMesh(leafG, drawn('#ffffff', TX.vine, {}, false, 1.2), spots.length); // feuillage dessiné, teinte d'automne par cep
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(.035, .06, .5, 5).translate(0, .25, 0), M.bark, spots.length); // ceps tors sous le feuillage
  const posts = new THREE.InstancedMesh(boxG(.07, 1.35, .07), std('#6b5d4c'), Math.ceil(spots.length / 6));
  const o = new THREE.Object3D(), c = new Color();
  let np = 0;
  spots.forEach(([x, z], i) => {
    const s = .95 + Math.random() * .1;
    o.position.set(x, H(x, z) + .78, z); o.rotation.set(0, (Math.random() - .5) * .04, 0); o.scale.set(s, s, 1); o.updateMatrix();
    vines.setMatrixAt(i, o.matrix);
    // teinte qui varie par parcelle, pas par cep : sinon chaque tronçon se découpe en patchwork
    const f = MU.clamp((Math.sin(x * .07) + Math.sin(z * .05 + x * .03) + 2) / 4 + (Math.random() - .5) * .08, 0, .999) * (pal.length - 1);
    vines.setColorAt(i, c.copy(pal[f | 0]).lerp(pal[(f | 0) + 1], f % 1));
    o.position.y = H(x, z); o.rotation.set((Math.random() - .5) * .3, 0, (Math.random() - .5) * .3); o.scale.setScalar(1); o.updateMatrix(); trunks.setMatrixAt(i, o.matrix);
    o.rotation.set(0, 0, 0);
    if (i % 6 === 0) { o.position.y = H(x, z) + .65; o.updateMatrix(); posts.setMatrixAt(np++, o.matrix); }
  });
  posts.count = np;
  vines.receiveShadow = true;
  scene.add(vines, trunks, posts);
  return [vines, trunks, posts];
}
