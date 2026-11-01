// Salle d'accueil : salon sous la vague de lames et bar à gauche, rotonde d'exposition des bouteilles à droite
// salle large et peu profonde : rectangle de XL à XC2, fermé à droite par un demi-cercle (la rotonde) ; puits de l'escalier au fond, dans l'axe de la porte
import * as THREE from 'three';
import { M, std } from '../materials.js';
import { add, boxG, hipRoof, uvScale } from '../helpers.js';
import { CX, ZS, RS, RZ0, RZ1, XL, XC2, RX, RW, RH, ZC } from '../layout.js';
const { Group, Vector3: V3 } = THREE;

export function buildAccueil(scene) {
  add(scene, new THREE.PlaneGeometry(6.4, 10).rotateX(-Math.PI / 2), M.concrete, CX, .08, -1.5); // sol du vestibule
  // court passage bas entre l'arrière du pavillon (z = -3.5) et la salle
  for (const s of [-1, 1]) add(scene, boxG(.6, 4.6, 3), M.stone, CX + s * 3.2, 2.3, -5);
  add(scene, boxG(7, .3, 3), M.stone, CX, 4.45, -5);
  // enveloppe : murs de pierre, plafond, toit ; plancher de chêne percé du puits
  add(scene, boxG(.6, RH + .8, RZ0 - RZ1), M.stone, XL - .3, (RH + .8) / 2, ZC);
  for (const s of [-1, 1]) {
    const a = CX + s * 3.5, b = RX + s * RW; // mur de façade de part et d'autre du passage
    add(scene, boxG(Math.abs(b - a), RH + .8, .6), M.stone, (a + b) / 2, (RH + .8) / 2, RZ0 - .3);
  }
  // mur du fond (s'arrête à XC2 : rien ne dépasse dans la rotonde), percé derrière l'escalier d'une grande baie vitrée sur la cour (BW × BH)
  const BW = 6.4, BH = 4.4;
  for (const [x0, x1] of [[XL - .6, CX - BW / 2], [CX + BW / 2, XC2]]) add(scene, boxG(x1 - x0, RH + .8, .6), M.stone, (x0 + x1) / 2, (RH + .8) / 2, RZ1 - .3);
  add(scene, boxG(BW, RH + .8 - BH, .6), M.stone, CX, (BH + RH + .8) / 2, RZ1 - .3);
  { // quatre vantaux à petits bois blancs (sans vitrage : le dessin laisse voir la cour)
    const white = std('#f4f0e8'), z = RZ1 - .3;
    for (let k = -2; k <= 2; k++) add(scene, boxG(k % 2 ? .08 : .1, BH, .08), white, CX + k * BW / 4, BH / 2, z, false); // montants
    for (let k = -3; k <= 3; k += 2) add(scene, boxG(.04, BH - .3, .06), white, CX + k * BW / 8, BH / 2, z, false);
    add(scene, boxG(BW, .1, .08), white, CX, BH - .05, z, false); add(scene, boxG(BW, .22, .08), white, CX, .19, z, false);
    for (let y = .95; y < BH - .3; y += .8) add(scene, boxG(BW - .1, .04, .06), white, CX, y, z, false);
    for (const s of [-1, 1]) add(scene, new THREE.TorusGeometry(.05, .012, 6, 12), M.brass, CX + s * .12, 1.15, z + .05, false);
  }
  add(scene, new THREE.PlaneGeometry(RW * 2, RZ0 - RZ1).rotateX(Math.PI / 2), std('#f3eee6', { emissive: '#f6e8d2', emissiveIntensity: .55 }), RX, RH, ZC, false); // plafond blanc éclairé par le liseré des lames
  add(scene, boxG(7, .8, .6), M.stone, CX, RH + .4, RZ0 - .3); // linteau au-dessus du passage
  add(scene, hipRoof(RW * 2 + 2, RZ0 - RZ1 + 2, 3.5), M.slate, RX, RH + .8, ZC);
  const x0 = XL - CX, x1 = XC2 - CX, fl = new THREE.Shape(); fl.moveTo(x0, -RZ0); fl.lineTo(x1, -RZ0); fl.lineTo(x1, .6 - RZ0); fl.absarc(x1, -(RZ0 - .6 + RZ1) / 2, (RZ0 - .6 - RZ1) / 2, -Math.PI / 2, Math.PI / 2, false); fl.lineTo(x0, -RZ1); fl.lineTo(x0, -RZ0);
  const hole = new THREE.Path(); hole.absarc(0, -ZS, RS, 0, Math.PI * 2, true); fl.holes.push(hole);
  add(scene, new THREE.ShapeGeometry(fl, 48).rotateX(-Math.PI / 2), std('#c8a27a'), CX, .08, 0); // la forme est en (x, -z)
  const strip = M.glow; // liseré lumineux doré des lames
  const tube = (pts, r = .05) => add(scene, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 2, r, 5), strip, 0, 0, 0, false);

  // à gauche, le salon : mur de lames verticales qui ondule et se bombe vers la salle en montant (photo du salon)
  const wallD = (y, z) => { const t = (z - RZ1) / (RZ0 - RZ1), w = .55 + .45 * Math.sin(t * Math.PI * 1.3 + .4); return .28 + w * 1.6 * (y / RH) ** 2.4; };
  const top = [], base = [];
  for (let z = RZ1 + .4; z < RZ0 - .4; z += .12) {
    const s = new THREE.Shape(); s.moveTo(0, 0);
    for (let k = 0; k <= 12; k++) s.lineTo(wallD(RH * k / 12, z), RH * k / 12 - (k === 12 ? .02 : 0));
    s.lineTo(0, RH - .02); s.lineTo(0, 0);
    add(scene, new THREE.ExtrudeGeometry(s, { depth: .045, bevelEnabled: false }), M.wood, RX - RW, 0, z, false); // forme en (profondeur, hauteur), extrudée le long du mur
    top.push(new V3(RX - RW + wallD(RH, z) - .06, RH - .07, z)); base.push(new V3(RX - RW + .32, .1, z));
  }
  tube(top); tube(base, .03);
  // deux salons contre le mur de façade, tournés vers le bar : canapé de cuir, deux fauteuils en face, guéridons laiton, tapis clair
  const leather = std('#7a3e2c'), rug = std('#e8e0d0');
  for (const xc of [CX - 8, CX - 15]) {
    add(scene, boxG(5.6, .02, 4.6), rug, xc, .09, RZ0 - 3.9, false);
    const sofa = new Group(); sofa.position.set(xc, 0, RZ0 - .9); sofa.rotation.y = Math.PI / 2; scene.add(sofa); // dossier côté façade
    add(sofa, boxG(.95, .42, 2.6), leather, 0, .29, 0); add(sofa, boxG(.28, .55, 2.6), leather, -.36, .78, 0);
    for (const s of [-1, 1]) add(sofa, boxG(.95, .62, .22), leather, 0, .39, s * 1.35);
    for (const dx of [-1.1, 1.1]) {
      const a = new Group(); a.position.set(xc + dx, 0, RZ0 - 4.2); a.rotation.y = Math.PI / 2; scene.add(a);
      add(a, boxG(.85, .45, .85), leather, 0, .3, 0); add(a, boxG(.22, .5, .85), leather, .32, .78, 0);
      for (const s of [-1, 1]) add(a, boxG(.85, .3, .14), leather, 0, .65, s * .43);
    }
    for (const [dz, r, h] of [[2.35, .42, .5], [3.25, .3, .62]]) { // plateaux laiton sur pied tulipe
      add(scene, new THREE.CylinderGeometry(r, r, .03, 32), M.brass, xc, h, RZ0 - dz); add(scene, new THREE.CylinderGeometry(.04, .16, h - .1, 12), M.brass, xc, h / 2 + .03, RZ0 - dz);
    }
  }
  // au fond du salon, face à l'entrée, le bar d'accueil dans la même écriture : façade de lames, plateau laiton
  add(scene, boxG(4.4, 1.05, .65), std('#5a3a24'), CX - 8, .6, RZ1 + 1);
  add(scene, boxG(4.5, .05, .8), M.brass, CX - 8, 1.15, RZ1 + 1.05);
  for (let x = -10.15; x < -5.85; x += .1) add(scene, boxG(.045, 1.02, .05), M.wood, CX + x, .6, RZ1 + 1.35, false);

  // à droite, la rotonde d'exposition (photos) : demi-cercle de larges lames cintrées sur fond nuit ; dans chaque travée une bouteille,
  // de plus en plus grande, tenue par l'anneau laiton qui suit le mur ; à ses pieds, sa caisse sur un lit de graviers
  const XR = XC2, ZR = (RZ0 - .6 + RZ1) / 2, RC = (RZ0 - .6 - RZ1) / 2, N = 40, end = Math.PI, DX = XC2 + 3; // centre, rayon (mur à mur), arc f ∈ [0, π] avec x = sin f, z = cos f ; DX : présentoir
  const sl = new THREE.Shape();
  sl.moveTo(0, 0); sl.lineTo(0, 2.3); sl.quadraticCurveTo(0, 3.5, -1, 3.95); sl.lineTo(-1.06, 3.86); sl.quadraticCurveTo(-.07, 3.42, -.07, 2.3); sl.lineTo(-.07, 0); sl.lineTo(0, 0);
  const slatG = new THREE.ExtrudeGeometry(sl, { depth: .2, bevelEnabled: false, curveSegments: 10 }).translate(0, 0, -.1).scale(1, 1.2, 1); // lames de 4,7 m, face large vers la salle
  const prof = [[0, 0], [.037, 0], [.037, .2], [.03, .235], [.014, .255], [.013, .31], [0, .31]].map(([r, y]) => new THREE.Vector2(r, y));
  const bottleG = new THREE.LatheGeometry(prof, 16), glass = std('#d9b25c'), glow = []; // bouteille bordelaise, vin d'or
  const labelG = new THREE.CylinderGeometry(.0385, .0385, .08, 16, 1, true).translate(0, .11, 0), label = std('#f4efe2');
  const caseG = boxG(.24, .16, .36, .6), cupG = new THREE.TorusGeometry(.055, .012, 6, 16).rotateX(Math.PI / 2);
  const RING = RC - .08, YR = 1.05, ring = [];
  for (let i = 0; i < N; i++) {
    const f = (i + .5) / N * end, f2 = f + end / N / 2; // lames décalées d'une demi-travée : aucune contre les murs
    add(scene, slatG, M.wood, XR + RC * Math.sin(f), 0, ZR + RC * Math.cos(f), false).rotation.y = Math.atan2(-Math.cos(f), Math.sin(f));
    glow.push(new V3(XR + (RC - 1.05) * Math.sin(f), 4.68, ZR + (RC - 1.05) * Math.cos(f)));
    if (i === N - 1) continue;
    const k = .874 * 2.71 ** ((N - 2 - i) / (N - 2)), // vue de la salle, de gauche (fond, f → π) à droite : 50 cl → 10 L (volume ∝ k³, k = 1 : 75 cl)
       bx = XR + RING * Math.sin(f2), bz = ZR + RING * Math.cos(f2);
    add(scene, bottleG, glass, bx, YR - .03 * k, bz, false).scale.setScalar(k);
    add(scene, labelG, label, bx, YR - .03 * k, bz, false).scale.setScalar(k);
    add(scene, cupG, M.brass, bx, YR, bz, false).scale.setScalar(k);
    const c = add(scene, caseG, M.wood, XR + (RC - .3) * Math.sin(f2), .17, ZR + (RC - .3) * Math.cos(f2), false); c.rotation.y = f2; c.scale.setScalar(.7 + .3 * k);
  }
  for (let j = 0; j <= 96; j++) { const f = end * j / 96; ring.push(new V3(XR + RING * Math.sin(f), YR, ZR + RING * Math.cos(f))); }
  add(scene, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ring), 192, .015, 6), M.brass, 0, 0, 0, false);
  add(scene, new THREE.RingGeometry(RC - .6, RC, 64, 1, -Math.PI / 2, end).rotateX(-Math.PI / 2), std('#8c8a84'), XR, .095, ZR, false); // graviers (angle de l'anneau = f − π/2)
  tube(glow);
  add(scene, new THREE.CircleGeometry(RC + .1, 48, -Math.PI / 2, end).rotateX(Math.PI / 2), std('#f3eee6', { emissive: '#f6e8d2', emissiveIntensity: .7 }), XR, RH, ZR, false); // plafond lumineux de la rotonde
  add(scene, new THREE.CylinderGeometry(RC + .9, RC + .9, .4, 48, 1, false, 0, end), M.stone, XR, RH + 1, ZR); // couverture
  add(scene, uvScale(new THREE.CylinderGeometry(RC + .6, RC + .6, RH + .8, 48, 1, true, 0, end), end * (RC + .6) / 2.4, (RH + .8) / 2.4), M.stone, XR, (RH + .8) / 2, ZR); // mur extérieur
  add(scene, new THREE.CylinderGeometry(RC + .05, RC + .05, RH, 48, 1, true, 0, end), std('#1e2330', { side: THREE.DoubleSide }), XR, RH / 2, ZR, false); // fond nuit
  [[1.4, 16], [1, 12], [.6, 8], [.3, 4]].forEach(([r, n], k) => { // gradins, bouteilles en couronne
    add(scene, new THREE.CylinderGeometry(r, r, .3, 40), M.wood, DX, .23 + k * .3, ZR);
    add(scene, new THREE.TorusGeometry(r, .02, 6, 40).rotateX(Math.PI / 2), M.brass, DX, .38 + k * .3, ZR, false);
    for (let j = 0; j < n; j++) { const a = j / n * Math.PI * 2, x = DX + (r - .15) * Math.sin(a), z = ZR + (r - .15) * Math.cos(a); add(scene, bottleG, glass, x, .38 + k * .3, z, false); add(scene, labelG, label, x, .38 + k * .3, z, false); }
  });
  add(scene, bottleG, glass, DX, 1.28, ZR, false).scale.setScalar(1.6); // l'impériale au sommet
  add(scene, boxG(6.6, .16, 1), M.ashlar, CX, .08, RZ1 - 1.1); // seuil de la baie sur la cour
}
