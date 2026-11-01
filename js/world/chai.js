// Le chai, enterré sous la salle (d'après une photo de chai) : nef voûtée sur piliers, bas-côtés en arcades, blason au fond
// NW : demi-largeur de nef (axe des piliers), AW : mur extérieur, PH : naissance des arcades, SP : naissance de la voûte
import * as THREE from 'three';
import { M, std, drawn, TX } from '../materials.js';
import { add, boxG, uvScale, archShape } from '../helpers.js';
import { CX, CY, Z1, Z2 } from '../layout.js';
const { Group } = THREE;
const NW = 7, AW = 14, PH = 2.8, SP = 3.6, BAY = 6, LEN = Z1 - Z2, ZM = (Z1 + Z2) / 2, DW = 2.4;

// renvoie les vantaux du chai, et les barriques (affichées seulement quand la caméra est dedans)
export function buildChai(scene) {
  const cave = new Group(); cave.position.y = CY; scene.add(cave);
  let chaiLeaves;
  const plaster = std('#efe9dd', { side: THREE.DoubleSide });
  add(cave, new THREE.PlaneGeometry(AW * 2, LEN).rotateX(-Math.PI / 2), M.concrete, CX, .08, ZM);
  // au pied de l'escalier, la porte du chai (photo) : grand arc de pierre moulurée, deux hauts vantaux de chêne en claustra à losanges, deux lanternes
  const front = new THREE.Shape(); front.moveTo(-DW, 0); front.lineTo(DW, 0); front.lineTo(DW, 5.8); front.lineTo(-DW, 5.8); front.lineTo(-DW, 0);
  front.holes.push(archShape(3.4, 2.6));
  add(cave, uvScale(new THREE.ExtrudeGeometry(front, { depth: .6, bevelEnabled: false }), 1 / 2.4), M.ashlar, CX, 0, Z1 - .3);
  const mould = new THREE.Shape(); mould.moveTo(-2.05, 0); mould.lineTo(2.05, 0); mould.lineTo(2.05, 2.6); mould.absarc(0, 2.6, 2.05, 0, Math.PI, false);
  mould.holes.push(archShape(3.4, 2.6));
  add(cave, uvScale(new THREE.ExtrudeGeometry(mould, { depth: .15, bevelEnabled: false }), 1 / 1.6), M.stone, CX, 0, Z1 + .3);
  { // claustra : un losange par carreau de 42 cm, les vides sont ajourés (alphaTest)
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'); g.strokeStyle = '#fff'; g.lineWidth = 18; g.beginPath(); g.moveTo(0, 0); g.lineTo(128, 128); g.moveTo(128, 0); g.lineTo(0, 128); g.stroke();
    const lat = new THREE.CanvasTexture(c); lat.wrapS = lat.wrapT = THREE.RepeatWrapping; lat.repeat.set(1.7 / .42, 4.3 / .42); lat.anisotropy = 8;
    const latM = std('#b3824e', { map: lat, alphaTest: .5, side: THREE.DoubleSide }), frameM = std('#8a5a32'), panelM = std('#5e3c22'), LW = 1.7, LH = 4.3;
    chaiLeaves = [];
    for (const side of [-1, 1]) {
      const pivot = new Group(); pivot.position.set(CX + side * LW, 0, Z1 - .42); pivot.userData.dyn = true; cave.add(pivot);
      add(pivot, boxG(LW - .1, LH - .1, .05), panelM, -side * LW / 2, LH / 2, 0); // vantail plein ; le claustra est un ornement en relief sur ses deux faces
      for (const z of [-.045, .045]) add(pivot, new THREE.PlaneGeometry(LW, LH).translate(-side * LW / 2, LH / 2, 0), latM, 0, 0, z, false);
      for (const x of [.06, LW - .06]) add(pivot, boxG(.12, LH, .12), frameM, -side * x, LH / 2, 0);
      for (const y of [.07, 2.1, LH - .07]) add(pivot, boxG(LW, .14, .12), frameM, -side * LW / 2, y, 0);
      add(pivot, new THREE.TorusGeometry(.1, .018, 8, 20), M.brass, -side * (LW - .25), 1.2, -.08, false);
      chaiLeaves.push([pivot, side]);
    }
  }
  for (const s of [-1, 1]) add(cave, boxG(.2, .36, .2), M.lantern, CX + s * 2.3, 2.9, Z1 + .5, false);
  for (const s of [-1, 1]) add(cave, boxG(.3, 4.3, .9), M.stone, CX + s * (DW + .15), 2.15, Z1 + .45); // joues entre le puits et le mur
  for (const s of [-1, 1]) {
    // murs en pierre vus du dehors, enduit lisse côté chai
    add(cave, boxG(.6, 5.8, LEN), M.stone, CX + s * (AW + .3), 2.9, ZM);
    add(cave, boxG(AW - DW, 5.8, .6), M.stone, CX + s * (DW + (AW - DW) / 2), 2.9, Z1);
    add(cave, new THREE.PlaneGeometry(LEN, 5.8).rotateY(-s * Math.PI / 2), plaster, CX + s * (AW - .01), 2.9, ZM, false);
    add(cave, new THREE.PlaneGeometry(AW - DW, 5.8), plaster, CX + s * (DW + (AW - DW) / 2), 2.9, Z1 - .31, false);
    add(cave, new THREE.PlaneGeometry(AW - NW, LEN).rotateX(Math.PI / 2), plaster, CX + s * (NW + AW) / 2, 3.7, ZM); // plafond des bas-côtés
  }
  add(cave, boxG(AW * 2, 6.2, .6), plaster, CX, 3.1, Z2 - .3);
  // voûte surbaissée de la nef (corde 2·NW, flèche 2) et arcs doubleaux au droit de chaque paire de piliers
  const rise = 2, R = (NW * NW + rise * rise) / (2 * rise), half = Math.asin(NW / R), yc = SP + rise - R;
  add(cave, new THREE.CylinderGeometry(R, R, LEN, 48, 1, true, -half, 2 * half).rotateX(-Math.PI / 2), plaster, CX, yc, ZM);
  const rib = new THREE.Shape();
  rib.absarc(0, 0, R, Math.PI / 2 - half, Math.PI / 2 + half, false); rib.absarc(0, 0, R - .35, Math.PI / 2 + half, Math.PI / 2 - half, true);
  const ribG = new THREE.ExtrudeGeometry(rib, { depth: .5, bevelEnabled: false, curveSegments: 32 }).translate(0, 0, -.25);
  // arcades longitudinales vers les bas-côtés : écoinçon plein percé d'un arc surbaissé
  const c = (BAY - .7) / 2, ar = .8, R2 = (c * c + ar * ar) / (2 * ar), y2 = ar - R2, a2 = Math.atan2(-y2, c);
  const span = new THREE.Shape(); span.moveTo(c, 0); span.lineTo(c, SP - PH + .1); span.lineTo(-c, SP - PH + .1); span.lineTo(-c, 0);
  span.absarc(0, y2, R2, Math.PI - a2, a2, true);
  const spanG = new THREE.ExtrudeGeometry(span, { depth: .6, bevelEnabled: false, curveSegments: 24 }).translate(0, 0, -.3).rotateY(Math.PI / 2);
  const strip = std('#2a1a0a', { emissive: '#fff0d0', emissiveIntensity: 2.4 }); // réglettes lumineuses
  for (let z = Z1 - 3; z > Z2 + 2; z -= BAY) {
    add(cave, ribG, plaster, CX, yc, z);
    for (const s of [-1, 1]) {
      add(cave, boxG(.7, SP, .7), plaster, CX + s * NW, SP / 2, z);
      add(cave, boxG(.9, .14, .9), plaster, CX + s * NW, PH, z); // imposte
      if (z - BAY > Z2 + 2) {
        add(cave, spanG, plaster, CX + s * NW, PH, z - BAY / 2);
        add(cave, boxG(.12, .1, 1.4), strip, CX + s * (AW - .06), 3.1, z - BAY / 2, false);
      }
    }
  }
  add(cave, new THREE.PlaneGeometry(2.6, 2.6), drawn('#ffffff', TX.blason, { alphaTest: .5, emissive: '#ffffff', emissiveMap: TX.blason, emissiveIntensity: .55 }, true), CX, 3.7, Z2 + .03, false);
  // barriques : blocs dans la nef et les bas-côtés, rangée sous le blason
  const BL = .95, prof = [];
  prof.push(new THREE.Vector2(0, -BL / 2)); // fonds fermés
  for (let i = 0; i <= 8; i++) { const y = -BL / 2 + BL * i / 8, t = 2 * y / BL; prof.push(new THREE.Vector2(.295 + .05 * (1 - t * t), y)); }
  prof.push(new THREE.Vector2(0, BL / 2));
  const bar = [], hd = [], nearPillar = z => Math.abs(((z - (Z1 - 3)) % BAY + BAY) % BAY - BAY / 2) > BAY / 2 - .55;
  // lots de trois : deux couchées au sol, la troisième dans leur creux ; fonds tournés vers l'entrée
  const lot = (x, z) => { for (const [dx, y] of [[-.36, .465], [.36, .465], [0, 1.04]]) { bar.push([x + dx, y, z, Math.PI / 2]); hd.push([x + dx, y, z + BL / 2 + .005, 0]); } };
  for (let z = Z1 - 4; z > Z2 + 3.5; z -= BL + .6) {
    if (nearPillar(z)) continue;
    for (const side of [-1, 1]) for (const x of [2.95, 4.8, 8.65, 10.5, 12.35]) lot(CX + side * x, z); // 2 lots par demi-nef, 3 par bas-côté
  }
  for (let x = -5.4; x < 5.5; x += 1.8) lot(CX + x, Z2 + 1.4); // rangée du fond, sous le blason
  const barrels = new THREE.InstancedMesh(new THREE.LatheGeometry(prof, 18).rotateZ(Math.PI / 2), drawn('#dcc09a', TX.barrel), bar.length);
  const heads = new THREE.InstancedMesh(new THREE.CircleGeometry(.296, 18), drawn('#dcc09a', TX.head, { alphaTest: .5 }), hd.length);
  const o = new THREE.Object3D();
  bar.forEach(([x, y, z, ry], i) => { o.position.set(x, y, z); o.rotation.set(0, ry, 0); o.rotateX(Math.random() * 6); o.updateMatrix(); barrels.setMatrixAt(i, o.matrix); });
  hd.forEach(([x, y, z, ry], i) => { o.position.set(x, y, z); o.rotation.set(0, ry, 0); o.updateMatrix(); heads.setMatrixAt(i, o.matrix); });
  barrels.receiveShadow = heads.receiveShadow = true;
  cave.add(barrels, heads);
  // le terrain ne porte pas d'ombre : sans cet écran invisible sous le sol, le soleil rasant (venu de −x, +z) éclaire le chai enterré
  // et allume un seul côté des barriques. Il déborde vers −x et +z pour arrêter les rayons obliques.
  const blind = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
  add(cave, new THREE.BoxGeometry(AW * 2 + 27, .1, LEN + 18), blind, CX - 13, -CY - .45, ZM + 8);
  return { leaves: chaiLeaves, inside: [barrels, heads] };
}
