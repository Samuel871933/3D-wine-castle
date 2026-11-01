// Plan du domaine : cotes partagées par le château, la salle d'accueil, l'escalier, le chai et le parcours caméra
import { MathUtils as MU } from 'three';

export const P1D = 3; // avancée du pavillon de la porte (P1) devant son jumeau
// axe de la porte ; puits de l'escalier (centre ZS, rayon RS) qui descend de la salle d'accueil au chai enterré (sol à CY)
export const CX = -21, ZS = -16.8, RS = 4.2, CY = -6.5;

// salle d'accueil : façade RZ0, fond RZ1, de XL à XC2 (début de la rotonde), hauteur RH
export const RZ0 = -6.5, RZ1 = -22.5, XL = -41.4, XC2 = -15, RX = (XL + XC2) / 2, RW = (XC2 - XL) / 2, RH = 5.2, ZC = (RZ0 + RZ1) / 2;

// escalier hélicoïdal : part de l'avant du puits (côté salle), finit près de l'ouverture du chai
export const ST = { n: 36, rIn: 2, rOut: 4.1, top: Math.PI * 4, span: 8.53 };
export const stairY = th => .08 + CY * (ST.top - th) / ST.span; // niveau de marche à l'angle th

// chai : son entrée (Z1) est au fond du puits de l'escalier
export const Z1 = ZS - RS, Z2 = Z1 - 27.5;

// relief : terrasse plate autour du château, puis coteau de vignes vers +z
const sp = (s, k = 5) => k * Math.log1p(Math.exp(s / k));
export function H(x, z) {
  const s = z - 24, slope = MU.clamp(s / 50, 0, 1);
  return -0.15 * (sp(s) - sp(-24)) - 0.06 * (sp(Math.abs(x) - 75) - sp(-75))
    + (Math.sin(x * 0.021) * 1.6 + Math.sin(z * 0.017 + x * 0.006) * 1.2) * slope;
}
