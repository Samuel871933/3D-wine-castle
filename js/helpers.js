// Géométries utilitaires : UV en mètres, toits, végétal taillé, pose des pièces
import * as THREE from 'three';
import { M } from './materials.js';
const { Mesh, Group } = THREE;

export function uvScale(g, su, sv = su) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv); return g; }
export function boxG(w, h, d, T = 2.4) { // UV en mètres / T : les pierres gardent la même taille sur tous les volumes
  const g = new THREE.BoxGeometry(w, h, d), dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]], uv = g.attributes.uv;
  for (let i = 0; i < 24; i++) { const [a, b] = dims[i >> 2]; uv.setXY(i, uv.getX(i) * a / T, uv.getY(i) * b / T); }
  return g;
}
export function hipRoof(w, d, h, T = 1.8) { // croupe ; w == d donne un pavillon pyramidal ; rangs de couverture parallèles à l'égout
  const r = Math.max(0, w - d) / 2, x = w / 2, z = d / 2;
  const A = [-x, 0, z], B = [x, 0, z], C = [x, 0, -z], D = [-x, 0, -z], R1 = [-r, h, 0], R2 = [r, h, 0];
  const sf = Math.hypot(h, z), ss = Math.hypot(h, x - r), pos = [], uv = [];
  const fb = v => [v[0] / T, v[1] / h * sf / T], sd = v => [v[2] / T, v[1] / h * ss / T];
  const tri = (a, b, c, f) => { for (const v of [a, b, c]) { pos.push(...v); uv.push(...f(v)); } };
  tri(A, B, R2, fb); tri(A, R2, R1, fb); tri(C, D, R1, fb); tri(C, R1, R2, fb); tri(B, C, R2, sd); tri(D, A, R1, sd);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}
export function bushy(g, hx, hy, hz, amp = .07, T = 1.1) { // végétal taillé : arêtes adoucies, surface bosselée, UV en mètres
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i));
    uv.setXY(i, (ax > ay ? z : x) / T, (ay > .7 ? z : y) / T);
    const X = x / hx, Y = y / hy, Z = z / hz, qx = X ** 4, qy = Y ** 4, qz = Z ** 4, d = Math.hypot(X, Y, Z) || 1, r = .3 * Math.min(hx, hy, hz);
    // déformation fonction de la position seule : les sommets dupliqués aux coutures bougent ensemble
    const b = amp * (Math.sin(x * 5.1 + y * 2.3) * Math.sin(z * 4.7 - y * 3.9) + .5 * Math.sin((x - z) * 11 + y * 9));
    p.setXYZ(i, x + (b / d - r * Math.max(qy, qz)) * X, y + (b / d - r * Math.max(qx, qz)) * Y, z + (b / d - r * Math.max(qx, qy)) * Z);
  }
  g.computeVertexNormals();
  return g;
}
export function add(parent, g, m, x = 0, y = 0, z = 0, shadow = true) {
  const o = new Mesh(g, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = shadow; parent.add(o); return o;
}
export const archShape = (w, spring) => { // porte cintrée : rectangle + demi-cercle
  const s = new THREE.Shape(), r = w / 2;
  s.moveTo(-r, 0); s.lineTo(r, 0); s.lineTo(r, spring); s.absarc(0, spring, r, 0, Math.PI, false); s.lineTo(-r, 0);
  return s;
};
export function addWindow(parent, x, y, z, ry = 0, w = 1.2, h = 2.3, lit = Math.random() < .3) {
  const g = new Group(); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g);
  // fenêtre = plans dessinés : pas de petites pièces 3D qui scintillent à l'écran
  add(g, new THREE.PlaneGeometry(w, h), lit ? M.glassLit : M.glass, 0, 0, .03, false);
  for (const s of [-1, 1]) add(g, new THREE.PlaneGeometry(w / 2, h), M.shutter, s * (w * .75 + .08), 0, .03, false);
}
