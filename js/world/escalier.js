// Escalier hélicoïdal (photo de la descente) : marches de pierre éclairées par-dessous, garde-corps plein de chêne à main courante lumineuse,
// puits lambrissé, et au centre une grappe de grains dorés (des luminaires qui évoquent les raisins botrytisés)
import * as THREE from 'three';
import { M, std, drawn, canvasTex } from '../materials.js';
import { add, boxG } from '../helpers.js';
import { CX, ZS, RS, CY, RH, ST, stairY } from '../layout.js';
const { Vector3: V3 } = THREE;

export function buildStairs(scene) {
  const r = (ST.rIn + ST.rOut) / 2, dth = ST.span / ST.n, W = ST.rOut - ST.rIn;
  const glowM = M.glow;
  const stepG = boxG(.8, .3, W), ledG = boxG(.04, .04, W - .1).translate(-.38, -.17, 0); // local -x : nez de marche, côté descente
  for (let i = 1; i < ST.n; i++) {
    const th = ST.top - i * dth, x = CX + Math.sin(th) * r, y = stairY(th) - .15, z = ZS + Math.cos(th) * r;
    add(scene, stepG, M.ashlar, x, y, z).rotation.y = th;
    add(scene, ledG, glowM, x, y, z, false).rotation.y = th;
  }
  // garde-corps : ruban hélicoïdal plein au bord du vide, main courante laiton soulignée d'un liseré lumineux
  const pos = [], idx = [], K = 200, helix = (rr, dy, n = 80) => Array.from({ length: n + 1 }, (_, k) => { const th = ST.top - ST.span * k / n; return new V3(CX + Math.sin(th) * rr, stairY(th) + dy, ZS + Math.cos(th) * rr); });
  for (let k = 0; k <= K; k++) {
    const th = ST.top - ST.span * k / K, x = CX + Math.sin(th) * (ST.rIn - .03), z = ZS + Math.cos(th) * (ST.rIn - .03), y = stairY(th);
    pos.push(x, y - .35, z, x, y + .95, z);
    if (k) idx.push(2 * k - 2, 2 * k - 1, 2 * k, 2 * k - 1, 2 * k + 1, 2 * k);
  }
  const rail = new THREE.BufferGeometry(); rail.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); rail.setIndex(idx); rail.computeVertexNormals();
  add(scene, rail, std('#b98a5a', { side: THREE.DoubleSide }), 0, 0, 0, false); // matériau à part : sans UV, il ne peut pas être fusionné avec les lames
  add(scene, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(helix(ST.rIn - .03, 1)), 240, .06, 8), M.brass, 0, 0, 0, false);
  add(scene, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(helix(ST.rIn + .03, .92)), 240, .025, 5), glowM, 0, 0, 0, false);
  add(scene, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(helix(ST.rOut - .04, .9)), 240, .03, 5), glowM, 0, 0, 0, false); // main courante murale
  // puits lambrissé de chêne : bas percé vers le chai (côté -z) sur la hauteur des portes, haut plein jusqu'au plancher de la salle
  const gap = .7, OH = 4.3, panel = canvasTex(32, 64, (g, w, h) => { g.lineWidth = 3; g.beginPath(); g.moveTo(2, 0); g.lineTo(2, h); g.stroke(); });
  panel.wrapS = panel.wrapT = THREE.RepeatWrapping; panel.repeat.set(2 * Math.PI * RS / .3, 1);
  const wall = drawn('#a8733f', panel, { side: THREE.DoubleSide });
  add(scene, new THREE.CylinderGeometry(RS, RS, OH, 64, 1, true, Math.PI + gap, Math.PI * 2 - 2 * gap), wall, CX, CY + OH / 2, ZS, false);
  add(scene, new THREE.CylinderGeometry(RS, RS, -CY - OH + .08, 64, 1, true), wall, CX, (CY + OH + .08) / 2, ZS, false);
  add(scene, new THREE.CircleGeometry(RS, 48).rotateX(-Math.PI / 2), M.concrete, CX, CY + .08, ZS, false);
  // la grappe : grains dorés lumineux en cône renversé, pendue au plafond de la salle dans le vide central
  const grain = std('#8a5a20', { emissive: '#ffb860', emissiveIntensity: .9 }), grainG = new THREE.SphereGeometry(1, 16, 12);
  for (let i = 0; i < 40; i++) {
    const t = i / 40, a = i * 2.4, rr = (1 - t) ** .8 * .6 * Math.sqrt((i * 7 % 10 + 1) / 10);
    add(scene, grainG, grain, CX + Math.sin(a) * rr, 2.4 - t * 3.6, ZS + Math.cos(a) * rr, false).scale.setScalar(.09 + .05 * ((i * 13) % 5) / 4);
  }
  add(scene, new THREE.CylinderGeometry(.012, .012, RH - 2.4), M.iron, CX, (RH + 2.4) / 2, ZS, false);
}
