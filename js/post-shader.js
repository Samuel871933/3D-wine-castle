// Passe 2 du rendu : le dessin (contours tirés de la profondeur, hachures, papier, lavis) et les trois autres techniques
export default /* glsl */ `
    uniform sampler2D tColor, tDepth, tPaper, tSky, tH1, tH2, tH3; uniform vec2 uRes, uLogo; uniform float uPR, uNear, uFar, uExp, uSkyU0, uDraw, uStyle;
    uniform mat4 uInvProj, uCamWorld;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
      return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
    float fbm(vec2 p) { float v = 0., a = .5; for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= .5; } return v; }
    float depthAt(vec2 uv) { float z = texture2D(tDepth, uv).x; return uNear * uFar / (uFar - z * (uFar - uNear)); }
    float ink(sampler2D t, vec2 p) { return 1. - texture2D(t, p / 512.).r; } // hachures dessinées, 1 = trait
    float order;                                            // ordre d'apparition du pixel pendant le dessin (0 = tôt)
    float drawn(float a, float b) { float k = clamp((uDraw - a) / (b - a), 0., 1.) * 1.3 - .15; return smoothstep(order, order + .06, k); }
    // huile : touches de pinceau. 4 grilles décalées d'une demi-cellule, fondues en tente (somme des poids = 1) ;
    // dans chaque cellule, des poils parallèles d'angle, de charge et de teinte aléatoires. Renvoie (charge, relief, teinte).
    vec3 brush(vec2 p) {
      const float S = 42.; vec3 r = vec3(0.);
      for (int g = 0; g < 4; g++) {
        vec2 pp = p / S + vec2(float(g / 2), float(g - g / 2 * 2)) * .5, cell = floor(pp), f = pp - cell - .5;
        float h = hash(cell + float(g) * 17.), a = .7 + (h - .5) * 1.6, w = (1. - 2. * abs(f.x)) * (1. - 2. * abs(f.y));
        vec2 q = mat2(cos(a), -sin(a), sin(a), cos(a)) * f * S;
        r += w * vec3(hash(cell + float(g) * 31. + 5.), noise(q * vec2(.8, .06) + h * 50.) - .5, hash(cell + float(g) * 7. + 11.));
      }
      return r;
    }
    // huile : filtre de Kuwahara (4 quadrants, on garde la moyenne du plus homogène) → aplats de touches aux bords nets
    vec3 kuwahara(vec2 uv) {
      // grandes plages de couleur : la forme se devine plus qu'elle ne se lit
      vec2 px = 3.5 * uPR / uRes; vec3 m0 = vec3(0.), m1 = m0, m2 = m0, m3 = m0, s0 = m0, s1 = m0, s2 = m0, s3 = m0, c;
      for (int j = 0; j < 4; j++) for (int i = 0; i < 4; i++) {
        vec2 o = vec2(float(i), float(j)) * px;
        c = texture2D(tColor, uv - o).rgb; m0 += c; s0 += c * c;
        c = texture2D(tColor, uv + vec2(o.x, -o.y)).rgb; m1 += c; s1 += c * c;
        c = texture2D(tColor, uv + vec2(-o.x, o.y)).rgb; m2 += c; s2 += c * c;
        c = texture2D(tColor, uv + o).rgb; m3 += c; s3 += c * c;
      }
      m0 /= 16.; m1 /= 16.; m2 /= 16.; m3 /= 16.;
      vec3 v = vec3(1.); // somme des variances r+g+b de chaque quadrant
      float v0 = dot(s0 / 16. - m0 * m0, v), v1 = dot(s1 / 16. - m1 * m1, v), v2 = dot(s2 / 16. - m2 * m2, v), v3 = dot(s3 / 16. - m3 * m3, v);
      vec3 r = m0; float best = v0;
      if (v1 < best) { r = m1; best = v1; } if (v2 < best) { r = m2; best = v2; } if (v3 < best) r = m3;
      return r;
    }
    // gravure : tailles de largeur w (0..1) le long de la coordonnée g ancrée sur la géométrie. L'écart reste de 5 à 10 px à l'écran
    // quelle que soit la distance : on mélange deux pas consécutifs (s, 2s), un trait sur deux s'efface en douceur quand on s'éloigne
    float hatch(float g, float w, float wob) {
      float fw = length(vec2(dFdx(g), dFdy(g))) + 1e-6, lv = log2(fw * 5.), s = exp2(floor(lv)), r = 0.;
      for (int i = 0; i < 2; i++) {
        float aa = fw / s, h = 1. - smoothstep(w - aa, w + aa, abs(fract(g / s + wob) - .5) * 2.);
        r += (i == 0 ? 1. - fract(lv) : fract(lv)) * h; s *= 2.;
      }
      return r * smoothstep(0., .1, w);
    }
    void main() {
      vec2 p = gl_FragCoord.xy / uPR;                       // pixels CSS : même densité de trait sur tous les écrans
      order = uDraw < 1. ? clamp((fbm(p * .006) - .2) * 1.4, 0., 1.) * .75 + noise(p * .12) * .25 : 0.; // grandes zones + petits tronçons de trait ; dessin fini : inutile de le calculer
      vec2 uv = vUv; // pas d'ondulation en espace écran : les fenêtres et dessous de toits glissaient dessous au défilement
      vec4 src = texture2D(tColor, uv);
      vec3 col = src.rgb * uExp;
      float isDrawn = step(src.a, .75);                      // matériaux dessinés : alpha ≤ 0,5 (materials.js)
      float detail = smoothstep(.12, .55, 1. - src.a * (1. + isDrawn)) * isDrawn; // traits des textures dessinées (pierre, ardoise, fûts…)
      float d = depthAt(uv), sky = step(uFar * .97, d);
      col = pow(clamp(col, 0., 4.), vec3(1. / 2.2));
      float L = dot(min(col, 1.), vec3(.299, .587, .114));

      // contours : laplacien de profondeur relatif (silhouettes et arêtes), trait fin
      vec2 px = 1. * uPR / uRes;
      float dl = depthAt(uv - vec2(px.x, 0.)), dr = depthAt(uv + vec2(px.x, 0.)), du = depthAt(uv + vec2(0., px.y)), dd = depthAt(uv - vec2(0., px.y));
      float de = (abs(dl + dr - 2. * d) + abs(du + dd - 2. * d)) / d;
      float edge = smoothstep(.012, .045, de) * (1. - smoothstep(250., 700., d) * .5);

      // papier
      vec3 paper = texture2D(tPaper, p / 2048.).rgb;
      paper = mix(paper, vec3(dot(paper, vec3(.333))), .35) * 1.04; // papier moins jaune
      float grain = smoothstep(.78, .95, dot(paper, vec3(.333)));
      vec3 inkC = vec3(.16, .13, .11);

      // ciel : panorama au lavis, orienté pour que sa lueur dorée tombe sur le soleil
      vec4 vd = uInvProj * vec4(vUv * 2. - 1., 1., 1.);
      vec3 dir = normalize((uCamWorld * vec4(vd.xyz / vd.w, 0.)).xyz);
      vec3 skyC = texture2D(tSky, vec2(fract(atan(dir.x, -dir.z) / 6.28318 + uSkyU0), clamp(asin(dir.y) / .6 + .02, .002, .998))).rgb;
      // marge de support nu (toutes techniques), de largeur m : bords gauche et droit érodés comme une paroi de grotte (grandes ondulations douces,
      // pas de pics « montagne », puis rugosité de plus en plus fine), haut et bas presque droits ; grands coins arrondis rc qui mangent le dessin
      // jusque sous le logo et les boutons du bandeau, érodés plus fort encore
      vec2 sz = uRes / uPR; float m = clamp(min(sz.x, sz.y) * .04, 14., 44.), rc = min(sz.x, sz.y) * .3;
      vec2 er = vec2(m * .35, 0.);                          // marge droite un peu plus large : à l'œil, elle égale la gauche
      vec2 qd = abs(p - sz * .5 + er * .5) - (sz * .5 - m - er * .5) + rc;
      float bd = length(max(qd, 0.)) + min(max(qd.x, qd.y), 0.) - rc; // distance au bord en px CSS, > 0 dehors
      // le bandeau (logo et menu) passe tout entier sur le papier nu : morsure du haut jusqu'à uLogo (fraction de l'écran, x = 1 : toute la largeur), raccord adouci
      vec2 lo = (p - uLogo * sz) * vec2(1., -1.);            // > 0 : à droite du logo / sous le logo
      float ld = length(max(lo, 0.)) + min(max(lo.x, lo.y), 0.) - 26.; // distance (> 0 dehors) à la zone du logo élargie de 26 px
      float hb = max(40. - abs(bd + ld), 0.) / 40.; bd = max(bd, -ld) + hb * hb * 10.;
      float A = m * mix(.15, .9, smoothstep(-m * .5, m * .5, qd.x - qd.y)); // qd.x > qd.y : plus près d'un bord gauche/droit que du haut/bas
      A = mix(A, rc * .25, smoothstep(0., rc * .5, min(qd.x, qd.y)));         // dans l'arrondi d'un coin
      if (bd > -2. * m) bd += (fbm(p * .9 / m) - .5) * A + (noise(p * .08) - .5) * 3. + (.5 - grain) * 1.5; // loin du bord : inutile de le calculer
      float sheet = 1. - smoothstep(-1., 0., bd);

      if (uStyle > 2.5) { // ---------- aquarelle ----------
        // le lavis ne suit pas le dessin : posé à main levée, il déborde ou s'arrête court de quelques pixels
        vec2 wv = (vec2(fbm(p * .01), fbm(p * .01 + 7.)) - .5) * 16.;
        vec2 uw = vUv + wv * uPR / uRes;
        vec3 a = vec3(0.), b = vec3(0.);
        for (int i = 0; i < 8; i++) { // deux flous en spirale : lavis (3 px) et halo large (11 px) pour l'accumulation de pigment aux bords des objets
          float an = float(i) * 2.39996; vec2 o = vec2(cos(an), sin(an)) * sqrt(float(i) + .5) / 2.83 * uPR / uRes;
          a += texture2D(tColor, uw + o * 2.5).rgb; b += texture2D(tColor, uw + o * 10.).rgb;
        }
        vec3 k = pow(clamp(a / 8. * uExp, 0., 4.), vec3(1. / 2.2)), kb = min(pow(clamp(b / 8. * uExp, 0., 4.), vec3(1. / 2.2)), 1.);
        float glowW = smoothstep(.95, 1.6, max(k.r, max(k.g, k.b)));
        k = min(k, 1.);
        float dw = depthAt(uw), skyW = step(uFar * .97, dw);
        float l = dot(k, vec3(.299, .587, .114));
        k = clamp(mix(vec3(l), k, 1.15), 0., 1.);
        // glacis : les valeurs se posent en trois couches transparentes ; chaque couche a un bord net et irrégulier
        float flow = fbm(p * .004 + 3.);                                          // eau inégale sur la feuille
        float v = (1. - l) * 3.2 + (flow - .5) * .25, lay = floor(v), f = fract(v), fw = fwidth(v) + 1e-4;
        float dq = (lay + .5 + (f - .5) * .8 + .2 * smoothstep(1. - fw, 1., f)) / 3.2; // valeur en paliers (en moyenne la vraie valeur), légèrement dégradée dans chaque couche
        float rim = exp(-f / (fw * 2.5)) * step(.5, lay);                         // en séchant, le pigment se dépose au bord de chaque couche
        vec3 conc = (1. - k) * dq / max(1. - l, .03);                            // concentration en pigment (0 = papier nu)
        float pool = clamp(length(k - kb), 0., .4);                               // et au bord des objets
        float gran = (.5 - grain) * .6 + (noise(p * .7) - .5) * .25;              // granulation : le pigment se loge dans le creux du grain
        conc *= .78 * (.8 + .4 * flow) * (1. + gran * (.25 + .5 * dq)) * (1. + rim * .45 + pool * .6);
        conc = clamp(conc, 0., .82);                                             // pas de noir en aquarelle
        conc *= 1. - smoothstep(.9, .98, l) * .9;                                // réserves : les blancs restent papier
        vec3 c = paper * (1. - conc);
        c = mix(c, skyC * vec3(.97, 1., 1.06), skyW);                           // le ciel est déjà un lavis
        c = mix(c, paper * vec3(1., .8, .45), glowW * (1. - skyW) * .55);
        // feuille non finie : la peinture s'arrête en bord irrégulier, le papier reste nu vers les marges
        c = mix(paper, c * (1. - .1 * smoothstep(-10., 0., bd)), sheet);        // le lavis fonce un peu là où il s'arrête
        c = mix(paper, c, drawn(0., 1.));
        gl_FragColor = vec4(c, 1.);
        return;
      }

      if (uStyle > 1.5) { // ---------- gravure à l'eau-forte ----------
        vec3 inkE = vec3(.42, .36, .26); // encre gris-brun tirant sur l'or (pas de noir) : taille-douce imprimée en bistre
        float glowE = smoothstep(.95, 1.6, max(col.r, max(col.g, col.b))) * (1. - sky);
        float el = clamp(dir.y / .5, 0., 1.), cloud = 1. - smoothstep(.06, .2, skyC.r - skyC.b);
        float t = mix(clamp((1. - L) * 1.1 - .18, 0., 1.) * (1. - glowE), (.12 + .3 * el) * (1. - cloud * .9), sky); // ciel : plus chargé en haut, nuages en réserve
        // tailles gravées sur la géométrie elle-même (et non sur l'écran, où les murs glisseraient sous des traits immobiles) :
        // murs : horizontales, toits : dans la pente, sols : parallèles à x ; ciel : parallèles à l'horizon
        vec4 vr = uInvProj * vec4(vUv * 2. - 1., 1., 1.); vec3 vp = vr.xyz / vr.w; vp *= depthAt(vUv) / -vp.z;
        vec3 wp = (uCamWorld * vec4(vp, 1.)).xyz, n = normalize(cross(dFdx(wp), dFdy(wp))), hz = normalize(cross(vec3(0., 1., 0.), n) + 1e-5);
        float wall = step(abs(n.y), .35), ground = step(.9, abs(n.y)), far = 1. - smoothstep(60., 250., d);
        float g1 = mix(mix(mix(dot(wp, hz), wp.y, wall), wp.z, ground), dir.y * 60., sky), g2 = mix(mix(wp.y, dot(wp, hz), wall), wp.x, ground);
        float wob = (noise(wp.xz * 1.3 + wp.y * .7) - .5) * .3 * far * (1. - sky);             // burin tenu à la main : le trait ondule…
        float w1 = t * (1. + .3 * (noise(vec2(g2, g1) * 2.) - .5) * far);                     // …enfle et s'amincit
        float h1 = hatch(g1, w1, wob), h2 = hatch(g2, clamp((t - .55) * 1.6, 0., 1.), wob) * (1. - sky); // contre-tailles dans les ombres
        float inkA = max(max(h1, h2), max(edge, detail * .7 * (1. - smoothstep(90., 420., d)) * (1. - sky)));
        vec3 c = mix(paper, inkE, inkA * (.85 + .15 * grain) * drawn(0., .8));
        c = mix(c, vec3(.95, .75, .35), glowE * .45 * drawn(.5, 1.));        // seules les lumières sont rehaussées d'or, à la main
        c = mix(paper, c, sheet);
        gl_FragColor = vec4(c, 1.);
        return;
      }

      if (uStyle > .5) { // ---------- peinture à l'huile ----------
        vec3 k = pow(clamp(kuwahara(uv) * uExp, 0., 4.), vec3(1. / 2.2));
        float glowO = smoothstep(.95, 1.6, max(k.r, max(k.g, k.b))) * (1. - sky);
        k = min(k, 1.);
        float l = dot(k, vec3(.299, .587, .114));
        k = clamp(mix(vec3(l), k, 1.3), 0., 1.);                // pigments plus saturés que le lavis
        k = pow(k, vec3(.85));                                   // toile lumineuse : on relève les tons moyens
        k = mix(k, k * k * (3. - 2. * k), .3);                   // contraste
        k = mix(k, k * vec3(.92, .82, .7), (1. - l) * .3);       // ombres chaudes, terre de Sienne
        float lk = dot(k, vec3(.299, .587, .114));
        k = mix(k, k * (floor(lk * 5. + .5) / 5. + .1) / (lk + .1), .45); // valeurs resserrées (pas les canaux : la teinte ne vire pas) : aplats abstraits
        k = mix(k, vec3(1., .8, .45), glowO * .55);
        // ciel : dégradé azur → or, les nuages du lavis repris en touches crème
        float el = clamp(dir.y / .5, 0., 1.);
        vec3 skyO = mix(vec3(1., .82, .56), vec3(.36, .53, .76), sqrt(el));
        float cloud = 1. - smoothstep(.06, .2, skyC.r - skyC.b); // nuages du lavis : là où le papier crème vire au gris-bleu
        skyO = mix(skyO, mix(vec3(.92, .84, .7), vec3(.5, .53, .62), smoothstep(.4, .9, cloud)), cloud * .85);
        k = mix(k, skyO, sky);
        vec3 b = brush(p);
        float weave = sin(p.x * 1.9) * sin(p.y * 1.9);            // grain de la toile
        vec3 c = k * (1. + (b.x - .5) * .22 + b.y * .3 + weave * .03);
        c += (b.z - .5) * vec3(.07, .02, -.07) * (.4 + l);       // couleur cassée : chaque touche vire un peu au chaud ou au froid
        c *= 1. - detail * .06 * (1. - sky);                     // le dessin des pierres et ardoises s'efface presque
        c = mix(c, c * .6, edge * .12);                          // contours à peine marqués
        c = mix(paper * vec3(1.02, .95, .84), c, drawn(0., 1.) * sheet); // la toile apprêtée se couvre par plaques, ses marges restent nues
        c *= 1. - .12 * smoothstep(-14., 0., bd) * sheet;          // empâtement plus chargé au bord de la touche
        gl_FragColor = vec4(c, 1.);
        return;
      }

      // lavis : la teinte de l'objet, très diluée ; or des lumières
      vec3 hue = col / max(max(col.r, max(col.g, col.b)), .001);
      vec3 c = mix(paper * mix(vec3(1.), hue, .42), skyC * (.9 + .1 * grain), sky);
      float glow = smoothstep(.95, 1.6, max(col.r, max(col.g, col.b))) * (1. - sky);
      c = mix(c, vec3(.98, .78, .42), glow * .6);
      c = mix(paper, c, drawn(.55, 1.));                    // le lavis vient en dernier

      // ombres : estompe + trois couches de hachures (dessin au chargement : contours, détails, hachures, lavis)
      float t = (1. - L) * (1. - sky) * (1. - glow);
      c = mix(c, inkC, smoothstep(.3, 1., t) * .3 * (.5 + .5 * grain) * drawn(.45, .9));
      // hachures accrochées aux surfaces (posées sur l'écran, elles restaient immobiles pendant que toits et murs glissaient dessous) :
      // coordonnées en mètres sur le plan dominant de la surface, ramenées à la taille de trait voulue à l'écran ; deux échelles voisines
      // fondues pour que le trait garde la même densité quand on avance (un sur deux s'efface en douceur, comme en gravure)
      vec4 vr = uInvProj * vec4(vUv * 2. - 1., 1., 1.); vec3 vp = vr.xyz / vr.w; vp *= depthAt(vUv) / -vp.z;
      vec3 wp = (uCamWorld * vec4(vp, 1.)).xyz, an = abs(normalize(cross(dFdx(wp), dFdy(wp))));
      vec2 sc = an.x > max(an.y, an.z) ? wp.zy : an.y > an.z ? wp.xz : wp.xy;
      // échelle : moyenne géométrique des deux directions (sur un mur vu en biais, la plus écrasée seule donnait des traits rares et flous) ;
      // fondu resserré : une seule trame domine presque toujours, deux trames superposées brouillaient le dessin
      float lv = log2(sqrt(length(dFdx(sc)) * length(dFdy(sc))) + 1e-6), fl = smoothstep(.35, .65, fract(lv));
      vec2 h0 = sc / exp2(floor(lv)), h1 = h0 * .5;                       // h0 : 1 à 2 unités par pixel, comme p
      float h = max(smoothstep(.36, .48, t) * mix(ink(tH1, h0), ink(tH1, h1), fl),
                max(smoothstep(.55, .67, t) * mix(ink(tH2, h0), ink(tH2, h1), fl), smoothstep(.74, .88, t) * mix(ink(tH3, h0), ink(tH3, h1), fl) * .8));
      c = mix(c, inkC, h * .5 * (.55 + .45 * grain) * (1. - isDrawn) * drawn(.3, .8)); // pierre, ardoise… ont déjà leurs traits
      c = mix(c, inkC * 1.3, detail * .55 * (1. - smoothstep(90., 420., d) * .7) * (1. - sky) * drawn(.15, .6));
      c = mix(c, inkC * .8, edge * .85 * (.75 + .25 * grain) * drawn(0., .45));

      c = mix(paper, c, sheet);
      gl_FragColor = vec4(c, 1.);
    }`;
