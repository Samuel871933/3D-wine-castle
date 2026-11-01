// Musique d'ambiance générée en direct (Web Audio) : nappe lente d'accords et quelques notes de cloche, dans une grande réverbération.
// Rien à télécharger. Les navigateurs n'autorisent le son qu'après un geste de l'utilisateur : on ne démarre que sur demande.
let ctx, master, wet, timer, next = 0, step = 0, on = false, ver = 0;
const DUR = 8; // durée d'un accord, en secondes
const freq = n => 440 * 2 ** ((n - 69) / 12); // note MIDI → Hz
// ré majeur, voix serrées : I – vi – IV – V ; cloches sur la gamme pentatonique au-dessus
const CHORDS = [[50, 57, 62, 66, 69], [47, 54, 59, 62, 66], [43, 50, 55, 59, 62], [45, 52, 57, 61, 64]];
const BELL = [74, 76, 78, 81, 83, 86];

function setup() {
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
  // réverbération : réponse impulsionnelle de bruit qui s'éteint en 4 s (une voûte de chai)
  const verb = ctx.createConvolver(), len = ctx.sampleRate * 4, ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3; }
  verb.buffer = ir; wet = ctx.createGain(); wet.gain.value = .9; wet.connect(verb); verb.connect(master);
  document.addEventListener('visibilitychange', () => on && (document.hidden ? ctx.suspend() : ctx.resume())); // onglet caché : silence
}
function voice(type, f, t, peak, attack, end, detune = 0) {
  const o = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
  o.type = type; o.frequency.value = f; o.detune.value = detune;
  lp.type = 'lowpass'; lp.frequency.value = 1100;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain[type === 'sine' ? 'exponentialRampToValueAtTime' : 'linearRampToValueAtTime'](type === 'sine' ? 1e-4 : 0, t + end);
  o.connect(lp).connect(g); g.connect(master); g.connect(wet);
  o.start(t); o.stop(t + end + .1);
}
function schedule() { // prépare la seconde à venir : les minuteries du navigateur ne sont pas assez précises pour jouer en direct
  while (next < ctx.currentTime + 1) {
    for (const n of CHORDS[step++ % CHORDS.length]) for (const d of [-7, 7]) voice('triangle', freq(n), next, .022, DUR * .45, DUR * 1.2, d); // fondu enchaîné avec l'accord suivant
    for (let k = 0; k < 3; k++) if (Math.random() < .6) voice('sine', freq(BELL[Math.random() * BELL.length | 0]), next + 1 + Math.random() * (DUR - 2), .05, .02, 3.5);
    next += DUR;
  }
}
function fade(to, s) { const t = ctx.currentTime; master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t); master.gain.linearRampToValueAtTime(to, t + s); }

export function setSound(play) {
  if (play === on) return;
  on = play; ver++;
  if (play) {
    if (!ctx) setup();
    ctx.resume();
    next = Math.max(next, ctx.currentTime + .05);
    schedule(); timer = setInterval(schedule, 500);
    fade(.6, 2.5);
  } else if (ctx) {
    clearInterval(timer);
    fade(0, 1);
    const v = ver; setTimeout(() => v === ver && ctx.suspend(), 1200); // coupé : on libère le processeur audio, sauf si on a rallumé entre-temps
  }
}
