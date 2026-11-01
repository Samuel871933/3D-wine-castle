// Textures et matériaux partagés par toute la scène
import * as THREE from 'three';

export const std = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, ...extra }); // Lambert : le dessin n'a pas besoin du rendu physique
const TL = new THREE.TextureLoader();
// chargement suivi par THREE.DefaultLoadingManager : main.js redessine à chaque texture arrivée
export const tex = (file, repeat = true) => { const t = TL.load('assets/textures/' + file); if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; };
export const TX = { stone: tex('stone.webp'), slate: tex('slate.webp'), tiles: tex('tiles.webp'), barrel: tex('barrel.webp'), head: tex('barrel-head.webp', false), blason: tex('blason.webp', false), vine: tex('vine.webp') };
TX.blason.colorSpace = THREE.SRGBColorSpace;
export function canvasTex(w, h, draw) { // petit dessin au trait généré à la volée (blanc = papier, noir = trait)
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.strokeStyle = '#000'; g.lineCap = 'round';
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.anisotropy = 8; return t;
}
TX.window = canvasTex(128, 256, (g, w, h) => { // dormant, battants, petits bois
  g.lineWidth = 12; g.strokeRect(6, 6, w - 12, h - 12);
  g.lineWidth = 7; g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h);
  for (let i = 1; i < 4; i++) { g.moveTo(0, h * i / 4); g.lineTo(w, h * i / 4); }
  g.stroke();
});
TX.shutter = canvasTex(64, 256, (g, w, h) => { // volet à planches
  g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8);
  g.lineWidth = 4; g.beginPath(); for (const x of [w / 3, 2 * w / 3]) { g.moveTo(x, 8); g.lineTo(x, h - 8); } g.stroke();
});
TX.foliage = canvasTex(256, 256, (g, w, h) => { // feuillage taillé : petites feuilles en arcs, raccord sans couture
  g.lineWidth = 1.6;
  for (let i = 0; i < 520; i++) {
    const x = Math.random() * w, y = Math.random() * h, r = 4 + Math.random() * 6, a = Math.PI * (.9 + Math.random() * .4);
    for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) { g.beginPath(); g.arc(x + dx, y + dy, r, a, a + 2.4); g.stroke(); }
  }
});
TX.foliage.wrapS = TX.foliage.wrapT = THREE.RepeatWrapping;
// matériau « dessiné » : la texture ne teinte pas l'objet, ses traits partent dans l'alpha du rendu, lu par le shader fusain
export function drawn(color, map, extra = {}, keepColor = false, k = 1) { // k : contraste des traits
  const m = std(color, { map, ...extra });
  m.onBeforeCompile = sh => {
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <map_fragment>', keepColor ? '#include <map_fragment>' : '')
      // alpha ramené à 0..0,5 : le shader y reconnaît une surface dessinée (pas de hachures par-dessus ses traits)
      .replace('#include <opaque_fragment>', '#include <opaque_fragment>\n  gl_FragColor.a = .5 * ' + (keepColor
        ? 'smoothstep(.12, .4, dot(texture2D(map, vMapUv).rgb, vec3(.3333)));' // objet en couleur : seuls ses contours sombres deviennent des traits
        : `(1. - clamp((1. - dot(texture2D(map, vMapUv).rgb, vec3(.3333))) * ${k.toFixed(2)}, 0., 1.));`));
  };
  return m;
}
export const M = {
  stone: drawn('#ead7b0', TX.stone, {}, false, 1.3), ashlar: drawn('#f0ddb8', TX.stone, {}, false, 1.3),
  slate: drawn('#5a5e68', TX.slate, { side: THREE.DoubleSide }, false, 2.4), tile: drawn('#8c5e4a', TX.tiles, { side: THREE.DoubleSide }, false, 2.4), // couvertures : trait renforcé
  door: std('#4a5668'), wood: std('#c79a68', { side: THREE.DoubleSide }), brass: std('#b08850'), // porte en bois peint gris-bleu (photo de la porte)
  gravel: std('#e8dfca'), ground: std('#ffffff', { vertexColors: true }), concrete: std('#ddd5c6'),
  shutter: drawn('#f6f2ea', TX.shutter),
  glass: drawn('#6e6258', TX.window), glassLit: drawn('#3a2614', TX.window, { emissive: '#ffb45c', emissiveIntensity: 1.6 }),
  hedge: drawn('#55733a', TX.foliage, {}, false, .9), leaf: drawn('#4d683c', TX.foliage, {}, false, .9), bark: std('#5c4a38'), iron: std('#3a3430'),
  // lumières : liseré doré (lames, escalier) et lanternes ; partagés pour que la fusion en fasse un seul objet
  glow: std('#2a1a0a', { emissive: '#ffd9a0', emissiveIntensity: 2.4 }), lantern: std('#2a1d10', { emissive: '#ffb35c', emissiveIntensity: 3 }),
};
