// Point d'entrée : rendu, boucle au scroll (redessine seulement quand quelque chose bouge), choix de la technique
import * as THREE from 'three';
import { buildWorld } from './world.js';
import { placeCamera } from './camera-path.js';
import { createPost } from './post.js';
import { setSound } from './ambience.js';
const { MathUtils: MU } = THREE;
const $ = s => document.querySelector(s);
const q = new URLSearchParams(location.search);
const fixedP = q.has('p') ? +q.get('p') : null; // ?p=0.5 fige le parcours (captures)

// ---------- renderer ----------
const renderer = new THREE.WebGLRenderer({ canvas: $('#c'), powerPreference: 'high-performance' }); // portables à deux GPU : la carte dédiée
document.documentElement.classList.add('gl'); // sans WebGL2, la page garde son titre en clair (style.css)
renderer.outputColorSpace = THREE.LinearSRGBColorSpace; // le shader fusain écrit déjà des valeurs d'écran
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false; // scène fixe : l'ombre portée est calculée une seule fois
const camera = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.3, 1500);

const { scene, sunDir, doors, chaiDoors, outside, inside } = buildWorld();
renderer.shadowMap.needsUpdate = true;
const post = createPost(renderer, camera, sunDir), U = post.U;

// ---------- boucle ----------
const chaps = [...document.querySelectorAll('.chap')].map(el => ({ el, a: +el.dataset.a, b: +el.dataset.b, o: -1 })), hint = $('#hint'), barFill = $('#bar b'), invite = $('.invite');
let inviteSound = true; // invitation à activer le son, en début de visite ; jamais si le visiteur l'a déjà coupé une fois
try { inviteSound = !localStorage.getItem('valmoree-sound'); } catch {}
let maxScroll = 0; // mis à jour au redimensionnement : lire scrollHeight à chaque image forcerait un recalcul de mise en page
const scrollP = () => maxScroll > 0 ? scrollY / maxScroll : 0;
let cur = fixedP ?? scrollP(), last = performance.now(), shownP = -1, dirty = true;
THREE.DefaultLoadingManager.onProgress = () => dirty = true; // chaque texture arrivée : on redessine
const skipDraw = fixedP !== null || matchMedia('(prefers-reduced-motion: reduce)').matches; // captures et « moins d'animations » : dessin déjà fini
let drawStart = null, drawnAt = null; // drawnAt : fin du premier dessin, les textes ne viennent qu'après
// qualité adaptative : si le GPU tient moins de ~26 i/s en rendu continu, on calcule moins de pixels (image étirée, trait de même taille).
// Seuil sous 30 i/s : les mobiles en économie d'énergie plafonnent à 30, ce n'est pas de la lenteur. On ne remonte jamais (pas d'oscillation).
let quality = 1, prevDrawn = false, n = 0, sum = 0;
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  cur = fixedP ?? cur + (scrollP() - cur) * Math.min(1, dt * 3.5);
  requestAnimationFrame(frame);
  drawStart ??= now;
  const draw = skipDraw ? 1 : MU.clamp((now - drawStart) / 4000, 0, 1);
  if (draw !== U.uDraw.value) { U.uDraw.value = draw; dirty = true; }
  if (draw === 1) drawnAt ??= now;
  const textIn = drawnAt === null ? 0 : MU.clamp((now - drawnAt) / 1200, 0, 1);
  if (drawnAt === null || now - drawnAt < 1300) dirty = true; // jusqu'à une image après la fin du fondu
  if (Math.abs(cur - shownP) < 1e-5 && !dirty) { prevDrawn = false; return; } // rien n'a bougé : on ne redessine pas
  shownP = cur; dirty = false;
  if (prevDrawn && fixedP === null) { // dt ne mesure le rendu que si l'image précédente a aussi été dessinée
    sum += dt;
    if (++n === 60) { if (sum / n > 1 / 26 && quality > .5) { quality -= .25; resize(); } n = sum = 0; }
  }
  prevDrawn = true;
  const open = MU.smoothstep(cur, .6, .7);
  for (const [pivot, side] of doors) pivot.rotation.y = -side * open * 1.75;
  const openChai = MU.smoothstep(cur, .9, .94);
  for (const [pivot, side] of chaiDoors) pivot.rotation.y = -side * openChai * 1.6;
  placeCamera(camera, cur);
  for (const o of outside) o.visible = camera.position.z > -3;
  for (const o of inside) o.visible = camera.position.z < 8;

  U.uExp.value = MU.lerp(1, 2.6, 1 - MU.smoothstep(camera.position.z, -6, 1)); // l'œil s'habitue à la pénombre du chai

  // huile et aquarelle : le Kuwahara ou le flou du lavis débordent sur le fond aux silhouettes, il doit être couleur ciel
  renderer.setClearColor([0xffffff, 0x5a6e90, 0xffffff, 0xeee4d2][U.uStyle.value]);
  renderer.setRenderTarget(post.rt); renderer.render(scene, camera);
  renderer.setRenderTarget(null); renderer.render(post.scene, post.camera);

  for (const c of chaps) {
    const o = MU.smoothstep(cur, c.a, c.a + .03) * (1 - MU.smoothstep(cur, c.b - .03, c.b)) * MU.smootherstep(textIn, 0, 1);
    if (o === c.o) continue; // la plupart des chapitres sont cachés : pas d'écriture de style inutile
    c.o = o;
    c.el.style.opacity = o; c.el.style.transform = `translateY(${(1 - o) * 14}px)`; c.el.style.visibility = o > 0 ? 'visible' : 'hidden'; // caché : ni peint, ni lu, ni cliquable
  }
  hint.style.opacity = cur < .02 && textIn === 1 ? 1 : 0;
  invite.style.opacity = inviteSound && cur < .05 && textIn === 1 ? 1 : 0;
  barFill.style.height = cur * 100 + '%';
}
function resize() {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  // jamais au-delà d'un pixel de tampon par pixel CSS (le grain du dessin n'a pas besoin du retina : ÷2 à ÷4 de pixels à calculer),
  // et en dessous quand la page est dézoomée (devicePixelRatio < 1) : on calcule les pixels réels de l'écran, pas 4× plus
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1) * quality);
  renderer.setSize(innerWidth, innerHeight);
  const v = renderer.getDrawingBufferSize(new THREE.Vector2());
  post.rt.setSize(v.x, v.y);
  maxScroll = document.documentElement.scrollHeight - innerHeight;
  U.uRes.value.copy(v); U.uPR.value = quality; // le trait garde la même taille en pixels d'écran, quelle que soit la qualité
  const r = $('.logo').getBoundingClientRect(); U.uLogo.value.set(r.right / innerWidth, 1 - r.bottom / innerHeight); // coin bas-droit du logo (y vers le haut)
  dirty = true;
}
addEventListener('resize', resize); resize();
document.fonts?.ready.then(resize); // la police du logo change sa largeur
// mobile : le système reprend parfois le GPU (onglet en arrière-plan) ; three recharge tout, il faut refaire l'ombre et redessiner
renderer.domElement.addEventListener('webglcontextrestored', () => { renderer.shadowMap.needsUpdate = true; dirty = true; });

// ---------- style : fusain / huile / gravure / aquarelle ----------
const styleBtns = [...document.querySelectorAll('.styles button')];
function setStyle(s, animate = true) {
  U.uStyle.value = s; document.documentElement.dataset.style = s; // couleurs du texte accordées à la technique
  for (const b of styleBtns) b.setAttribute('aria-pressed', +b.dataset.style === s);
  if (animate) drawStart = null; // la nouvelle technique se pose par-dessus, comme au chargement
  dirty = true;
  try { localStorage.setItem('valmoree-style', s); } catch {}
}
for (const b of styleBtns) b.onclick = () => +b.dataset.style !== U.uStyle.value && setStyle(+b.dataset.style);
try { const s = +(q.get('s') ?? localStorage.getItem('valmoree-style')); if (s >= 1 && s <= 3) setStyle(s, false); } catch {} // ?s=2 : style imposé (captures)

// ---------- musique d'ambiance ----------
const soundBtn = $('.sound'), soundLbl = $('.sound .lbl'), soundOn = () => soundBtn.getAttribute('aria-pressed') === 'true';
function toggleSound(play) {
  setSound(play); soundBtn.setAttribute('aria-pressed', play); soundLbl.textContent = play ? 'Couper le son' : 'Activer le son';
  inviteSound = false; dirty = true; // l'invitation a fait son office (ou a été refusée) : elle ne revient pas
  try { localStorage.setItem('valmoree-sound', play ? '1' : '0'); } catch {}
}
soundBtn.onclick = () => toggleSound(!soundOn());
// son allumé lors d'une visite précédente : il reprend au premier geste (les navigateurs l'exigent) ; un clic sur le bouton lui-même suit son cours normal
try {
  if (localStorage.getItem('valmoree-sound') === '1') {
    const resume = e => { removeEventListener('pointerdown', resume); removeEventListener('keydown', resume); if (!e.target.closest?.('.sound') && !soundOn()) toggleSound(true); };
    addEventListener('pointerdown', resume); addEventListener('keydown', resume);
  }
} catch {}
requestAnimationFrame(frame);
