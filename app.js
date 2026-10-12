/* ============================================================
   Tiny WebGL2 engine: math, geometry builders, shadow-mapped renderer
   ============================================================ */
"use strict";
const V = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: a => Math.hypot(a[0], a[1], a[2]),
  norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
};
const M4 = {
  ident() { const o = new Float32Array(16); o[0] = o[5] = o[10] = o[15] = 1; return o; },
  mul(a, b, o) {
    o = o || new Float32Array(16);
    const r = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let rr = 0; rr < 4; rr++) {
      r[c * 4 + rr] = a[rr] * b[c * 4] + a[4 + rr] * b[c * 4 + 1] + a[8 + rr] * b[c * 4 + 2] + a[12 + rr] * b[c * 4 + 3];
    }
    o.set(r); return o;
  },
  persp(fov, asp, n, f) { const t = 1 / Math.tan(fov / 2), o = new Float32Array(16); o[0] = t / asp; o[5] = t; o[10] = (f + n) / (n - f); o[11] = -1; o[14] = 2 * f * n / (n - f); return o; },
  ortho(l, r, b, t, n, f) { const o = new Float32Array(16); o[0] = 2 / (r - l); o[5] = 2 / (t - b); o[10] = -2 / (f - n); o[12] = -(r + l) / (r - l); o[13] = -(t + b) / (t - b); o[14] = -(f + n) / (f - n); o[15] = 1; return o; },
  lookAt(e, c, u) {
    const z = V.norm(V.sub(e, c)), x = V.norm(V.cross(u, z)), y = V.cross(z, x), o = new Float32Array(16);
    o[0] = x[0]; o[1] = y[0]; o[2] = z[0]; o[4] = x[1]; o[5] = y[1]; o[6] = z[1]; o[8] = x[2]; o[9] = y[2]; o[10] = z[2];
    o[12] = -V.dot(x, e); o[13] = -V.dot(y, e); o[14] = -V.dot(z, e); o[15] = 1; return o;
  },
  trs(out, p, r, s) {
    const ca = Math.cos(r[0]), sa = Math.sin(r[0]), cb = Math.cos(r[1]), sb = Math.sin(r[1]), cc = Math.cos(r[2]), sc = Math.sin(r[2]);
    const sx = s[0], sy = s[1], sz = s[2];
    out[0] = (cb * cc + sb * sa * sc) * sx; out[1] = ca * sc * sx; out[2] = (-sb * cc + cb * sa * sc) * sx; out[3] = 0;
    out[4] = (-cb * sc + sb * sa * cc) * sy; out[5] = ca * cc * sy; out[6] = (sb * sc + cb * sa * cc) * sy; out[7] = 0;
    out[8] = sb * ca * sz; out[9] = -sa * sz; out[10] = cb * ca * sz; out[11] = 0;
    out[12] = p[0]; out[13] = p[1]; out[14] = p[2]; out[15] = 1; return out;
  },
  invert(m) {
    const o = new Float32Array(16), a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3], a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7], a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11], a30 = m[12], a31 = m[13], a32 = m[14], a33 = m[15];
    const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11, b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12,
      b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30, b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
    let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06; if (!det) return M4.ident(); det = 1 / det;
    o[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det; o[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det; o[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det; o[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    o[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det; o[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det; o[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det; o[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    o[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det; o[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det; o[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det; o[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    o[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det; o[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det; o[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det; o[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
    return o;
  },
  pt(m, p) { return [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]]; }
};
const TAU = Math.PI * 2;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const hex = h => { h = h.replace("#", ""); if (h.length === 3) h = h.split("").map(c => c + c).join(""); return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255]; };
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* ---------- geometry ---------- */
class Geo {
  constructor() { this.p = []; this.n = []; this.uv = []; this.c = []; this.i = []; }
  vc() { return this.p.length / 3; }
  v(x, y, z, nx, ny, nz, u, v, col) { this.p.push(x, y, z); this.n.push(nx, ny, nz); this.uv.push(u, v); this.c.push(col ? col[0] : 1, col ? col[1] : 1, col ? col[2] : 1); return this.vc() - 1; }
  tri(a, b, c) { this.i.push(a, b, c); }
  /* append another geo, transformed by matrix m and tinted by color */
  add(g, m, col) {
    m = m || M4.ident(); const base = this.vc();
    const c0 = [m[0], m[1], m[2]], c1 = [m[4], m[5], m[6]], c2 = [m[8], m[9], m[10]];
    const x0 = V.cross(c1, c2), x1 = V.cross(c2, c0), x2 = V.cross(c0, c1);
    const det = V.dot(c0, x0) < 0 ? -1 : 1;
    for (let k = 0; k < g.p.length; k += 3) {
      const p = M4.pt(m, [g.p[k], g.p[k + 1], g.p[k + 2]]);
      const nx = g.n[k], ny = g.n[k + 1], nz = g.n[k + 2];
      const n = V.norm([det * (nx * x0[0] + ny * x1[0] + nz * x2[0]), det * (nx * x0[1] + ny * x1[1] + nz * x2[1]), det * (nx * x0[2] + ny * x1[2] + nz * x2[2])]);
      this.p.push(p[0], p[1], p[2]); this.n.push(n[0], n[1], n[2]);
      const j = k / 3 * 2; this.uv.push(g.uv[j], g.uv[j + 1]);
      this.c.push(g.c[k] * (col ? col[0] : 1), g.c[k + 1] * (col ? col[1] : 1), g.c[k + 2] * (col ? col[2] : 1));
    }
    const flip = V.dot(c0, x0) < 0;
    for (let k = 0; k < g.i.length; k += 3) { if (flip) this.i.push(base + g.i[k], base + g.i[k + 2], base + g.i[k + 1]); else this.i.push(base + g.i[k], base + g.i[k + 1], base + g.i[k + 2]); }
    return this;
  }
  /* make triangle winding agree with vertex normals */
  fix() {
    const P = this.p, N = this.n, I = this.i;
    for (let k = 0; k < I.length; k += 3) {
      const a = I[k] * 3, b = I[k + 1] * 3, c = I[k + 2] * 3;
      const e1 = [P[b] - P[a], P[b + 1] - P[a + 1], P[b + 2] - P[a + 2]], e2 = [P[c] - P[a], P[c + 1] - P[a + 1], P[c + 2] - P[a + 2]];
      const f = V.cross(e1, e2);
      const nn = [N[a] + N[b] + N[c], N[a + 1] + N[b + 1] + N[c + 1], N[a + 2] + N[b + 2] + N[c + 2]];
      if (V.dot(f, nn) < 0) { const t = I[k + 1]; I[k + 1] = I[k + 2]; I[k + 2] = t; }
    }
    return this;
  }
  color(col) { for (let k = 0; k < this.c.length; k += 3) { this.c[k] *= col[0]; this.c[k + 1] *= col[1]; this.c[k + 2] *= col[2]; } return this; }
  bounds() {
    const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
    for (let k = 0; k < this.p.length; k += 3) for (let a = 0; a < 3; a++) { mn[a] = Math.min(mn[a], this.p[k + a]); mx[a] = Math.max(mx[a], this.p[k + a]); }
    return {min: mn, max: mx};
  }
}
const G = {};
G.merge = (parts) => { const g = new Geo(); parts.forEach(([pg, m, col]) => g.add(pg, m, col)); return g; };
function axisCoords(hh, r, n) {
  if (r <= 1e-6) return [-hh, hh];
  const a = []; for (let k = 0; k <= n; k++) { const th = Math.PI / 4 * (1 - k / n); a.push(-hh + r - r * Math.tan(th)); }
  return [...a, ...a.map(v => -v).reverse()];
}
/* rounded box centred at origin; uvMode "world" (metres) or "norm" (0..1 per face) */
G.rbox = (w, h, d, r = 0, o = {}) => {
  const g = new Geo(), H = [w / 2, h / 2, d / 2]; r = Math.min(r, H[0] - 1e-4, H[1] - 1e-4, H[2] - 1e-4); const n = o.segs || 3;
  const faces = [[0, 1, 2], [1, 2, 0], [2, 0, 1]];
  for (const [na, ua, va] of faces) for (const s of [1, -1]) {
    const cu = axisCoords(H[ua], r, n), cv = axisCoords(H[va], r, n), base = g.vc();
    for (let j = 0; j < cv.length; j++) for (let i = 0; i < cu.length; i++) {
      const p = [0, 0, 0]; p[na] = s * H[na]; p[ua] = cu[i]; p[va] = cv[j];
      let pos = p, nr = [0, 0, 0]; nr[na] = s;
      if (r > 0) {
        const inner = [clamp(p[0], -(H[0] - r), H[0] - r), clamp(p[1], -(H[1] - r), H[1] - r), clamp(p[2], -(H[2] - r), H[2] - r)];
        const dv = V.sub(p, inner), l = V.len(dv); if (l > 1e-8) { nr = V.mul(dv, 1 / l); pos = V.add(inner, V.mul(nr, r)); }
      }
      const uu = o.uvMode === "norm" ? (p[ua] / H[ua] + 1) / 2 : p[ua], vv = o.uvMode === "norm" ? (p[va] / H[va] + 1) / 2 : p[va];
      g.v(pos[0], pos[1], pos[2], nr[0], nr[1], nr[2], uu, vv);
    }
    const W = cu.length;
    for (let j = 0; j < cv.length - 1; j++) for (let i = 0; i < W - 1; i++) {
      const a = base + j * W + i, b = a + 1, c = b + W, dd = a + W;
      if (s > 0) { g.tri(a, b, c); g.tri(a, c, dd); } else { g.tri(a, c, b); g.tri(a, dd, c); }
    }
  }
  return g.fix();
};
G.box = (w, h, d, o) => G.rbox(w, h, d, 0, o);
G.quad = (w, h, flipV) => { const g = new Geo(); g.v(-w / 2, -h / 2, 0, 0, 0, 1, 0, 1); g.v(w / 2, -h / 2, 0, 0, 0, 1, 1, 1); g.v(w / 2, h / 2, 0, 0, 0, 1, 1, 0); g.v(-w / 2, h / 2, 0, 0, 0, 1, 0, 0); g.tri(0, 1, 2); g.tri(0, 2, 3); return g; };
G.plane = (w, d, rep) => { const g = new Geo(), u = rep ? rep[0] : w, v = rep ? rep[1] : d; g.v(-w / 2, 0, -d / 2, 0, 1, 0, 0, 0); g.v(w / 2, 0, -d / 2, 0, 1, 0, u, 0); g.v(w / 2, 0, d / 2, 0, 1, 0, u, v); g.v(-w / 2, 0, d / 2, 0, 1, 0, 0, v); g.tri(0, 2, 1); g.tri(0, 3, 2); return g; };
G.sphere = (rx, ry, rz, ws = 24, hs = 16) => {
  ry = ry === undefined ? rx : ry; rz = rz === undefined ? rx : rz; const g = new Geo();
  for (let j = 0; j <= hs; j++) { const v = j / hs, th = v * Math.PI; for (let i = 0; i <= ws; i++) { const u = i / ws, ph = u * TAU; const x = Math.sin(th) * Math.cos(ph), y = Math.cos(th), z = Math.sin(th) * Math.sin(ph); const n = V.norm([x / rx, y / ry, z / rz]); g.v(x * rx, y * ry, z * rz, n[0], n[1], n[2], u, 1 - v); } }
  for (let j = 0; j < hs; j++) for (let i = 0; i < ws; i++) { const a = j * (ws + 1) + i, b = a + 1, c = a + ws + 1, d = c + 1; g.tri(a, c, b); g.tri(b, c, d); }
  return g.fix();
};
/* revolve a profile [[r,y,hard?],...] around Y */
G.lathe = (prof, seg = 32, o = {}) => {
  const g = new Geo(), n = prof.length, segN = [];
  for (let i = 0; i < n - 1; i++) { const dx = prof[i + 1][0] - prof[i][0], dy = prof[i + 1][1] - prof[i][1], l = Math.hypot(dx, dy) || 1; segN.push([dy / l, -dx / l]); }
  const rows = [];
  for (let i = 0; i < n; i++) {
    const hard = prof[i][2] && i > 0 && i < n - 1;
    if (hard) { rows.push([prof[i], segN[i - 1], i]); rows.push([prof[i], segN[i], i]); }
    else { const a = segN[Math.max(0, i - 1)], b = segN[Math.min(n - 2, i)], m = V.norm([a[0] + b[0], a[1] + b[1], 0]); rows.push([prof[i], [m[0], m[1]], i]); }
  }
  let total = 0, acc = [0]; for (let i = 1; i < n; i++) { total += Math.hypot(prof[i][0] - prof[i - 1][0], prof[i][1] - prof[i - 1][1]); acc.push(total); }
  for (const [pt, nn, idx] of rows) for (let k = 0; k <= seg; k++) {
    const a = k / seg * TAU * (o.arc || 1), c = Math.cos(a), s = Math.sin(a);
    g.v(pt[0] * c, pt[1], pt[0] * s, nn[0] * c, nn[1], nn[0] * s, k / seg, (o.vWorld ? acc[idx] : acc[idx] / (total || 1)));
  }
  for (let r = 0; r < rows.length - 1; r++) for (let k = 0; k < seg; k++) { const a = r * (seg + 1) + k, b = a + 1, c = a + seg + 1, d = c + 1; g.tri(a, c, b); g.tri(b, c, d); }
  return g.fix();
};
/* catmull-rom through points */
function spline(pts, n = 8) {
  const out = []; const P = [pts[0], ...pts, pts[pts.length - 1]];
  for (let i = 1; i < P.length - 2; i++) for (let k = 0; k < n; k++) {
    const t = k / n, t2 = t * t, t3 = t2 * t, p0 = P[i - 1], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2];
    out.push([0, 1, 2].map(a => .5 * ((2 * p1[a]) + (-p0[a] + p2[a]) * t + (2 * p0[a] - 5 * p1[a] + 4 * p2[a] - p3[a]) * t2 + (-p0[a] + 3 * p1[a] - 3 * p2[a] + p3[a]) * t3)));
  }
  out.push(pts[pts.length - 1]); return out;
}
/* tube along a path, radius number or f(t) */
G.tube = (path, rad, seg = 8, o = {}) => {
  const g = new Geo(), n = path.length, R = typeof rad === "function" ? rad : () => rad;
  let T0 = V.norm(V.sub(path[1], path[0])); let N = Math.abs(T0[1]) < .9 ? V.norm(V.cross(T0, [0, 1, 0])) : V.norm(V.cross(T0, [1, 0, 0]));
  const frames = [];
  for (let i = 0; i < n; i++) {
    const T = V.norm(V.sub(path[Math.min(n - 1, i + 1)], path[Math.max(0, i - 1)]));
    N = V.norm(V.sub(N, V.mul(T, V.dot(N, T)))); const B = V.cross(T, N); frames.push([T, N, B]);
  }
  for (let i = 0; i < n; i++) {
    const [T, N1, B] = frames[i], r = R(i / (n - 1)), sx = o.flat || 1;
    for (let k = 0; k <= seg; k++) {
      const a = k / seg * TAU, ca = Math.cos(a), sa = Math.sin(a);
      const dir = [N1[0] * ca + B[0] * sa * sx, N1[1] * ca + B[1] * sa * sx, N1[2] * ca + B[2] * sa * sx], nd = V.norm(dir);
      g.v(path[i][0] + dir[0] * r, path[i][1] + dir[1] * r, path[i][2] + dir[2] * r, nd[0], nd[1], nd[2], k / seg, i / (n - 1));
    }
  }
  for (let i = 0; i < n - 1; i++) for (let k = 0; k < seg; k++) { const a = i * (seg + 1) + k, b = a + 1, c = a + seg + 1, d = c + 1; g.tri(a, b, c); g.tri(b, d, c); }
  if (o.caps !== false) for (const end of [0, n - 1]) {
    const [T] = frames[end], c0 = g.v(path[end][0], path[end][1], path[end][2], T[0] * (end ? 1 : -1), T[1] * (end ? 1 : -1), T[2] * (end ? 1 : -1), .5, end ? 1 : 0);
    const ring = end * (seg + 1);
    for (let k = 0; k < seg; k++) { if (end) g.tri(c0, ring + k, ring + k + 1); else g.tri(c0, ring + k + 1, ring + k); }
  }
  return g.fix();
};
/* bent leaf blade: along +Y, width along X, bends toward +Z. uv.y 0 base .. 1 tip */
G.leaf = (len, wid, bend = .6, o = {}) => {
  const g = new Geo(), sl = o.segL || 8, sw = o.segW || 2, fold = o.fold === undefined ? .1 : o.fold, curl = o.curl || 0, twist = o.twist || 0;
  const pts = []; let y = 0, z = 0;
  for (let i = 0; i <= sl; i++) { const t = i / sl; pts.push([y, z]); const a = bend * Math.pow(t, o.pow || 1.3); y += Math.cos(a) * len / sl; z += Math.sin(a) * len / sl; }
  for (let i = 0; i <= sl; i++) {
    const t = i / sl, [py, pz] = pts[i], tw = twist * t;
    for (let j = 0; j <= sw; j++) {
      const s = j / sw * 2 - 1, wx = s * wid / 2;
      const zo = Math.abs(s) * wid * fold + s * s * curl * wid * t;
      const x = wx * Math.cos(tw), zz = pz + zo + wx * Math.sin(tw) * .5;
      g.v(x, py, zz, 0, 0, 1, (s + 1) / 2, t);
    }
  }
  const W = sw + 1;
  for (let i = 0; i < sl; i++) for (let j = 0; j < sw; j++) { const a = i * W + j, b = a + 1, c = a + W, d = c + 1; g.tri(a, b, c); g.tri(b, d, c); }
  /* recompute normals */
  const nrm = new Array(g.p.length).fill(0);
  for (let k = 0; k < g.i.length; k += 3) {
    const a = g.i[k] * 3, b = g.i[k + 1] * 3, c = g.i[k + 2] * 3;
    const e1 = [g.p[b] - g.p[a], g.p[b + 1] - g.p[a + 1], g.p[b + 2] - g.p[a + 2]], e2 = [g.p[c] - g.p[a], g.p[c + 1] - g.p[a + 1], g.p[c + 2] - g.p[a + 2]], f = V.cross(e1, e2);
    for (const q of [a, b, c]) { nrm[q] += f[0]; nrm[q + 1] += f[1]; nrm[q + 2] += f[2]; }
  }
  for (let k = 0; k < nrm.length; k += 3) { const n = V.norm([nrm[k], nrm[k + 1], nrm[k + 2]]); g.n[k] = n[0]; g.n[k + 1] = n[1]; g.n[k + 2] = n[2]; if (n[2] < 0) { g.n[k] *= -1; g.n[k + 1] *= -1; g.n[k + 2] *= -1; } }
  return g;
};
/* rounded-rect outline helper */
function rrOutline(w, h, R, n) {
  const pts = [], cs = [[w / 2 - R, h / 2 - R, 0], [-w / 2 + R, h / 2 - R, Math.PI / 2], [-w / 2 + R, -h / 2 + R, Math.PI], [w / 2 - R, -h / 2 + R, Math.PI * 1.5]];
  for (const [cx, cy, a0] of cs) for (let k = 0; k <= n; k++) { const a = a0 + k / n * Math.PI / 2; pts.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R, Math.cos(a), Math.sin(a)]); }
  return pts;
}
/* rounded slab (app tile): returns {cap (front face, uv 0..1), body (everything else)} */
G.slab = (w, h, d, R, bev = .004, n = 6) => {
  const cap = new Geo(), body = new Geo(), inset = rrOutline(w - 2 * bev, h - 2 * bev, Math.max(.001, R - bev), n), outer = rrOutline(w, h, R, n);
  const zf = d / 2, zb = -d / 2, m = inset.length;
  const c0 = cap.v(0, 0, zf, 0, 0, 1, .5, .5);
  inset.forEach(p => cap.v(p[0], p[1], zf, 0, 0, 1, p[0] / (w - 2 * bev) + .5, .5 - p[1] / (h - 2 * bev)));
  for (let i = 0; i < m; i++) cap.tri(c0, 1 + i, 1 + (i + 1) % m);
  const ring = (pts, z, nz, k) => pts.map(p => body.v(p[0], p[1], z, p[2] * k, p[3] * k, nz, 0, 0));
  const f0 = ring(inset, zf, .7, .7), f1 = ring(outer, zf - bev, 0, 1), b1 = ring(outer, zb + bev, 0, 1), b0 = ring(inset, zb, -.7, .7);
  const strip = (A, B) => { for (let i = 0; i < m; i++) { const j = (i + 1) % m; body.tri(A[i], B[i], A[j]); body.tri(A[j], B[i], B[j]); } };
  strip(f0, f1); strip(f1, b1); strip(b1, b0);
  const bc = body.v(0, 0, zb, 0, 0, -1, 0, 0); for (let i = 0; i < m; i++) body.tri(bc, b0[(i + 1) % m], b0[i]);
  return {cap: cap.fix(), body: body.fix()};
};

/* ---------- scene graph ---------- */
class Node {
  constructor(geo, mat) { this.geo = geo || null; this.mat = mat || null; this.p = [0, 0, 0]; this.r = [0, 0, 0]; this.s = [1, 1, 1]; this.kids = []; this.parent = null; this.world = M4.ident(); this.visible = true; this.mesh = null; this.custom = null; this.cast = true; this.name = ""; }
  add(c) { c.parent = this; this.kids.push(c); return c; }
  pos(x, y, z) { this.p = [x, y, z]; return this; }
  rot(x, y, z) { this.r = [x, y, z]; return this; }
  scl(x, y, z) { this.s = y === undefined ? [x, x, x] : [x, y, z]; return this; }
  update(pw) {
    if (this.custom) this.custom(this.world); else M4.trs(this.world, this.p, this.r, this.s);
    if (pw) M4.mul(pw, this.world, this.world);
    for (const k of this.kids) k.update(this.world);
  }
}

/* ---------- renderer ---------- */
const VS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNrm; layout(location=2) in vec2 aUV; layout(location=3) in vec3 aCol;
uniform mat4 uModel, uVP, uLightVP; uniform float uTime, uSway;
out vec3 vWorld; out vec3 vNrm; out vec2 vUV; out vec3 vCol; out vec4 vShadow;
void main(){
  vec4 w = uModel*vec4(aPos,1.0);
  vec3 n = normalize(mat3(uModel)*aNrm);
  if(uSway>0.0){ float k=aUV.y*aUV.y*uSway; w.x += sin(uTime*1.25 + w.y*2.1 + w.z*3.0)*k; w.z += cos(uTime*1.05 + w.x*2.3)*k*0.7; w.y -= abs(sin(uTime*1.25 + w.z*3.0))*k*0.15; }
  vWorld=w.xyz; vNrm=n; vUV=aUV; vCol=aCol;
  vShadow = uLightVP*vec4(w.xyz + n*0.014, 1.0);
  gl_Position = uVP*w;
}`;
const FS = `#version 300 es
precision highp float; precision highp sampler2DShadow;
in vec3 vWorld; in vec3 vNrm; in vec2 vUV; in vec3 vCol; in vec4 vShadow;
out vec4 outC;
uniform vec3 uColor; uniform sampler2D uTex; uniform float uHasTex; uniform vec2 uUVS;
uniform float uRough, uSpec, uMetal, uEnv, uCut, uAlpha, uTwo, uUnlit, uShadowOn;
uniform vec3 uEmi, uCam, uSunDir, uSunCol, uSky, uGround;
uniform vec3 uPLPos[3], uPLCol[3]; uniform float uPLRad[3];
uniform sampler2DShadow uShadow; uniform float uShadowSize;
uniform vec3 uRackMin, uRackMax; uniform float uExposure, uFog; uniform vec3 uFogCol;
float shadowAt(vec4 sc){
  vec3 p = sc.xyz/sc.w*0.5+0.5;
  if(p.z>=1.0||p.x<0.||p.x>1.||p.y<0.||p.y>1.) return 1.0;
  float s=0.0, t=1.0/uShadowSize;
  for(int x=-1;x<=1;x++) for(int y=-1;y<=1;y++) s += texture(uShadow, vec3(p.xy+vec2(float(x),float(y))*t*1.35, p.z-0.0006));
  return s/9.0;
}
vec3 envCol(vec3 r){
  float h = smoothstep(-0.3,0.7,r.y);
  vec3 c = mix(uGround*1.15, uSky*1.7, h);
  float g = pow(max(dot(r,uSunDir),0.0), 40.0);
  return c + uSunCol*g*1.4;
}
void main(){
  vec4 tx = uHasTex>0.5 ? texture(uTex, vUV*uUVS) : vec4(1.0);
  if(uCut>0.0 && tx.a<uCut) discard;
  vec3 N = normalize(vNrm);
  if(uTwo>0.5 && !gl_FrontFacing) N=-N;
  vec3 alb = pow(tx.rgb*uColor*vCol, vec3(2.2));
  if(uUnlit>0.5){ vec3 c0 = alb + uEmi; c0 = pow(c0*uExposure, vec3(1.0/2.2)); outC = vec4(c0, uAlpha*tx.a); return; }
  vec3 V = normalize(uCam - vWorld);
  vec3 L = uSunDir;
  float sh = uShadowOn>0.5 ? shadowAt(vShadow) : 1.0;
  float ndl = max(dot(N,L),0.0);
  vec3 sun = uSunCol*ndl*sh;
  if(uTwo>0.5) sun += uSunCol*max(dot(-N,L),0.0)*sh*0.35;
  float ao = 1.0;
  float inR = step(uRackMin.x,vWorld.x)*step(vWorld.x,uRackMax.x)*step(uRackMin.y,vWorld.y)*step(vWorld.y,uRackMax.y);
  float dz = clamp((uRackMax.z-vWorld.z)/(uRackMax.z-uRackMin.z),0.0,1.0);
  ao -= inR*0.5*smoothstep(0.05,0.95,dz);
  float wall = clamp((vWorld.z+1.0)/1.0, 0.0, 1.0); // darker near the back wall corner at floor
  ao *= mix(0.78,1.0, smoothstep(0.0,0.35,vWorld.y + (1.0-wall)*0.4));
  vec3 amb = mix(uGround,uSky,N.y*0.5+0.5)*ao;
  vec3 pl = vec3(0.0); vec3 plSpec = vec3(0.0);
  for(int i=0;i<3;i++){
    vec3 d = uPLPos[i]-vWorld; float dist=length(d); vec3 ld=d/max(dist,0.001);
    float att = clamp(1.0-(dist*dist)/(uPLRad[i]*uPLRad[i]),0.0,1.0); att*=att;
    float dd = uTwo>0.5 ? abs(dot(N,ld))*0.8 : max(dot(N,ld),0.0);
    pl += uPLCol[i]*dd*att;
    vec3 Hh = normalize(ld+V);
    plSpec += uPLCol[i]*att*pow(max(dot(N,Hh),0.0), mix(8.0,160.0,1.0-uRough))*max(dot(N,ld),0.0);
  }
  vec3 H = normalize(L+V);
  float shin = mix(6.0,220.0,pow(1.0-uRough,1.5));
  float ndh = max(dot(N,H),0.0);
  vec3 spec = uSunCol*sh*ndl*pow(ndh,shin)*uSpec*(shin+8.0)/25.0*0.4;
  spec += plSpec*uSpec*0.5;
  float fres = 0.04 + 0.96*pow(1.0-max(dot(N,V),0.0),5.0);
  vec3 R = reflect(-V,N);
  vec3 env = envCol(R);
  vec3 tint = mix(vec3(1.0), alb*1.6, uMetal);
  vec3 col = alb*(amb+sun+pl)*(1.0-uMetal*0.85) + spec*tint + env*tint*(fres*uEnv + uMetal*0.7*(1.0-uRough*0.6)) + uEmi;
  col *= uExposure;
  col = (col*(2.51*col+0.03))/(col*(2.43*col+0.59)+0.14);
  col = pow(clamp(col,0.0,1.0), vec3(1.0/2.2));
  float fg = uFog>0.0 ? clamp(length(uCam-vWorld)*uFog,0.0,0.6) : 0.0;
  col = mix(col, uFogCol, fg);
  outC = vec4(col, uAlpha*(uHasTex>0.5?tx.a:1.0));
}`;
const SVS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos; layout(location=2) in vec2 aUV;
uniform mat4 uModel, uLightVP; uniform float uTime, uSway; out vec2 vUV;
void main(){ vec4 w=uModel*vec4(aPos,1.0); if(uSway>0.0){ float k=aUV.y*aUV.y*uSway; w.x += sin(uTime*1.25 + w.y*2.1 + w.z*3.0)*k; w.z += cos(uTime*1.05 + w.x*2.3)*k*0.7; w.y -= abs(sin(uTime*1.25 + w.z*3.0))*k*0.15; } vUV=aUV; gl_Position=uLightVP*w; }`;
const SFS = `#version 300 es
precision highp float; in vec2 vUV; uniform sampler2D uTex; uniform float uHasTex, uCut, uUVSx, uUVSy; out vec4 o;
void main(){ if(uCut>0.0 && uHasTex>0.5){ if(texture(uTex,vUV*vec2(uUVSx,uUVSy)).a<uCut) discard; } o=vec4(1.0); }`;
const SPVS = `#version 300 es
precision highp float;
uniform mat4 uVP; uniform vec3 uC, uR, uU; uniform vec2 uSize; out vec2 vUV;
void main(){ vec2 q = vec2(float(gl_VertexID&1), float((gl_VertexID>>1)&1)); vUV=q; vec2 o=(q-0.5)*uSize; vec3 w=uC+uR*o.x+uU*o.y; gl_Position=uVP*vec4(w,1.0); }`;
const SPFS = `#version 300 es
precision highp float; in vec2 vUV; uniform sampler2D uTex; uniform vec4 uCol; out vec4 o;
void main(){ vec4 t=texture(uTex,vUV); o=vec4(uCol.rgb*t.rgb, uCol.a*t.a); }`;

class Renderer {
  constructor(canvas, opts = {}) {
    const gl = this.gl = canvas.getContext("webgl2", {antialias: true, alpha: false, powerPreference: "high-performance"});
    if (!gl) throw new Error("WebGL2 not available");
    this.canvas = canvas; this.shadowSize = opts.shadowSize || 2048;
    this.prog = this.link(VS, FS); this.sprog = this.link(SVS, SFS); this.spr = this.link(SPVS, SPFS);
    this.uc = new Map();
    this.aniso = gl.getExtension("EXT_texture_anisotropic") || gl.getExtension("EXT_texture_filter_anisotropic");
    this.maxAniso = this.aniso ? gl.getParameter(this.aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT) : 1;
    /* shadow map */
    const st = this.shadowTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, st);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, this.shadowSize, this.shadowSize, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
    this.fbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, st, 0); gl.drawBuffers([gl.NONE]); gl.readBuffer(gl.NONE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.white = this.makeTex({canvas: (() => { const c = document.createElement("canvas"); c.width = c.height = 2; return c; })(), opts: {}});
    this.spriteVAO = gl.createVertexArray();
    this.texCache = new Map();
  }
  link(vs, fs) {
    const gl = this.gl, mk = (t, s) => { const sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh); if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh)); return sh; };
    const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); p.u = {}; return p;
  }
  U(p, n) { if (!(n in p.u)) p.u[n] = this.gl.getUniformLocation(p, n); return p.u[n]; }
  mesh(g) {
    const gl = this.gl, vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const buf = (arr, loc, size) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arr), gl.STATIC_DRAW); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0); };
    buf(g.p, 0, 3); buf(g.n, 1, 3); buf(g.uv, 2, 2); buf(g.c, 3, 3);
    const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(g.i), gl.STATIC_DRAW);
    gl.bindVertexArray(null); return {vao, count: g.i.length};
  }
  makeTex(src) {
    const gl = this.gl, t = gl.createTexture(), c = src.canvas, o = src.opts || {};
    gl.bindTexture(gl.TEXTURE_2D, t);
    if (o.bleed) {
      const ctx = c.getContext("2d"), id = ctx.getImageData(0, 0, c.width, c.height), d = id.data; let r = 0, g = 0, b = 0, n = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
      if (n) { r /= n; g /= n; b /= n; for (let i = 0; i < d.length; i += 4) if (d[i + 3] < 250) { const a = d[i + 3] / 255; d[i] = d[i] * a + r * (1 - a); d[i + 1] = d[i + 1] * a + g * (1 - a); d[i + 2] = d[i + 2] * a + b * (1 - a); } }
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, c.width, c.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, d);
    } else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    const wrap = o.clamp ? gl.CLAMP_TO_EDGE : gl.REPEAT; gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
    if (this.aniso) gl.texParameterf(gl.TEXTURE_2D, this.aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, this.maxAniso));
    return t;
  }
  tex(src) { if (!src) return null; if (!src.gl) src.gl = this.makeTex(src); return src.gl; }
  setMat(p, m, shadowPass) {
    const gl = this.gl, T = m.tex ? this.tex(m.tex) : null;
    if (shadowPass) {
      gl.uniform1f(this.U(p, "uCut"), m.cutoff || 0); gl.uniform1f(this.U(p, "uHasTex"), T ? 1 : 0); gl.uniform1f(this.U(p, "uSway"), m.sway || 0);
      gl.uniform1f(this.U(p, "uUVSx"), m.uv ? m.uv[0] : 1); gl.uniform1f(this.U(p, "uUVSy"), m.uv ? m.uv[1] : 1);
      if (T) { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, T); gl.uniform1i(this.U(p, "uTex"), 0); } return;
    }
    const c = m.color || [1, 1, 1]; gl.uniform3f(this.U(p, "uColor"), c[0], c[1], c[2]);
    gl.uniform1f(this.U(p, "uHasTex"), T ? 1 : 0); gl.uniform2f(this.U(p, "uUVS"), m.uv ? m.uv[0] : 1, m.uv ? m.uv[1] : 1);
    gl.uniform1f(this.U(p, "uRough"), m.rough === undefined ? .6 : m.rough); gl.uniform1f(this.U(p, "uSpec"), m.spec === undefined ? .25 : m.spec);
    gl.uniform1f(this.U(p, "uMetal"), m.metal || 0); gl.uniform1f(this.U(p, "uEnv"), m.env === undefined ? .25 : m.env);
    gl.uniform1f(this.U(p, "uCut"), m.cutoff || 0); gl.uniform1f(this.U(p, "uAlpha"), m.alpha === undefined ? 1 : m.alpha);
    gl.uniform1f(this.U(p, "uTwo"), m.two ? 1 : 0); gl.uniform1f(this.U(p, "uUnlit"), m.unlit ? 1 : 0);
    gl.uniform1f(this.U(p, "uShadowOn"), m.noRecv ? 0 : 1); gl.uniform1f(this.U(p, "uSway"), m.sway || 0);
    const e = m.emi || [0, 0, 0]; gl.uniform3f(this.U(p, "uEmi"), e[0], e[1], e[2]);
    if (T) { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, T); gl.uniform1i(this.U(p, "uTex"), 0); }
    gl.depthMask(m.alpha !== undefined && m.alpha < 1 && !m.depthWrite ? false : true);
    if (m.side === "back") { gl.enable(gl.CULL_FACE); gl.cullFace(gl.FRONT); } else if (m.two || m.noCull) gl.disable(gl.CULL_FACE); else { gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK); }
  }
  collect(node, out) {
    if (!node.visible) return;
    if (node.geo && node.mat) { if (!node.mesh) node.mesh = this.mesh(node.geo); out.push(node); }
    for (const k of node.kids) this.collect(k, out);
  }
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, this.maxDpr || 2), w = Math.max(2, Math.floor(this.canvas.clientWidth * dpr)), h = Math.max(2, Math.floor(this.canvas.clientHeight * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
  }
  render(S, cam, time) {
    const gl = this.gl; this.resize();
    S.root.update(null);
    const list = []; this.collect(S.root, list);
    const L = S.light;
    /* shadow matrices */
    const Ld = V.norm(L.sunDir), C = S.shadowCenter || [0, 1, 0], lp = V.add(C, V.mul(Ld, 14));
    const lv = M4.lookAt(lp, C, Math.abs(Ld[1]) > .98 ? [1, 0, 0] : [0, 1, 0]), lproj = M4.ortho(-6.5, 6.5, -6.5, 6.5, 1, 30), lvp = M4.mul(lproj, lv);
    /* pass 1: shadow */
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo); gl.viewport(0, 0, this.shadowSize, this.shadowSize);
    gl.clear(gl.DEPTH_BUFFER_BIT); gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.disable(gl.BLEND);
    gl.useProgram(this.sprog); gl.uniformMatrix4fv(this.U(this.sprog, "uLightVP"), false, lvp); gl.uniform1f(this.U(this.sprog, "uTime"), time);
    gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(1.5, 3); gl.disable(gl.CULL_FACE);
    for (const n of list) { if (!n.cast || n.mat.noShadow || (n.mat.alpha !== undefined && n.mat.alpha < .9) || n.mat.unlit) continue; this.setMat(this.sprog, n.mat, true); gl.uniformMatrix4fv(this.U(this.sprog, "uModel"), false, n.world); gl.bindVertexArray(n.mesh.vao); gl.drawElements(gl.TRIANGLES, n.mesh.count, gl.UNSIGNED_INT, 0); }
    gl.disable(gl.POLYGON_OFFSET_FILL);
    /* pass 2: main */
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    const bg = L.bg; gl.clearColor(bg[0], bg[1], bg[2], 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const p = this.prog; gl.useProgram(p);
    const aspect = this.canvas.width / this.canvas.height;
    const proj = M4.persp(cam.fov, aspect, .1, 60), view = M4.lookAt(cam.eye, cam.target, [0, 1, 0]), vp = M4.mul(proj, view);
    this.vp = vp; this.view = view; this.proj = proj;
    gl.uniformMatrix4fv(this.U(p, "uVP"), false, vp); gl.uniformMatrix4fv(this.U(p, "uLightVP"), false, lvp);
    gl.uniform1f(this.U(p, "uTime"), time); gl.uniform3fv(this.U(p, "uCam"), cam.eye);
    gl.uniform3fv(this.U(p, "uSunDir"), Ld); gl.uniform3fv(this.U(p, "uSunCol"), L.sunCol); gl.uniform3fv(this.U(p, "uSky"), L.sky); gl.uniform3fv(this.U(p, "uGround"), L.ground);
    gl.uniform1f(this.U(p, "uExposure"), L.exposure); gl.uniform1f(this.U(p, "uShadowSize"), this.shadowSize);
    gl.uniform3fv(this.U(p, "uRackMin"), S.rackMin); gl.uniform3fv(this.U(p, "uRackMax"), S.rackMax);
    gl.uniform1f(this.U(p, "uFog"), L.fog || 0); gl.uniform3fv(this.U(p, "uFogCol"), L.fogCol || bg);
    const pp = [], pc = [], pr = [];
    for (let i = 0; i < 3; i++) { const l = L.pl[i] || {pos: [0, -50, 0], col: [0, 0, 0], rad: 1}; pp.push(...l.pos); pc.push(...l.col); pr.push(l.rad); }
    gl.uniform3fv(this.U(p, "uPLPos"), pp); gl.uniform3fv(this.U(p, "uPLCol"), pc); gl.uniform1fv(this.U(p, "uPLRad"), pr);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.shadowTex); gl.uniform1i(this.U(p, "uShadow"), 1);
    const opaque = [], blend = [];
    for (const n of list) { if (n.mat.shadowOnly) continue; (n.mat.alpha !== undefined && n.mat.alpha < 1 ? blend : opaque).push(n); }
    const draw = n => { this.setMat(p, n.mat, false); gl.uniformMatrix4fv(this.U(p, "uModel"), false, n.world); gl.bindVertexArray(n.mesh.vao); gl.drawElements(gl.TRIANGLES, n.mesh.count, gl.UNSIGNED_INT, 0); };
    gl.disable(gl.BLEND); for (const n of opaque) draw(n);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    const camD = n => { const w = n.world; const dx = w[12] - cam.eye[0], dy = w[13] - cam.eye[1], dz = w[14] - cam.eye[2]; return dx * dx + dy * dy + dz * dz; };
    blend.sort((a, b) => camD(b) - camD(a)); for (const n of blend) draw(n);
    gl.depthMask(true); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
    /* sprites */
    const sp = this.spr; gl.useProgram(sp); gl.bindVertexArray(this.spriteVAO);
    const right = [view[0], view[4], view[8]], up = [view[1], view[5], view[9]];
    gl.uniformMatrix4fv(this.U(sp, "uVP"), false, vp); gl.uniform3fv(this.U(sp, "uR"), right); gl.uniform3fv(this.U(sp, "uU"), up); gl.uniform1i(this.U(sp, "uTex"), 0);
    gl.depthMask(false); gl.activeTexture(gl.TEXTURE0);
    const sps = S.sprites.slice().sort((a, b) => ((b.pos[0] - cam.eye[0]) ** 2 + (b.pos[1] - cam.eye[1]) ** 2 + (b.pos[2] - cam.eye[2]) ** 2) - ((a.pos[0] - cam.eye[0]) ** 2 + (a.pos[1] - cam.eye[1]) ** 2 + (a.pos[2] - cam.eye[2]) ** 2));
    for (const s of sps) {
      if (s.alpha <= .003) continue;
      gl.blendFunc(gl.SRC_ALPHA, s.add ? gl.ONE : gl.ONE_MINUS_SRC_ALPHA);
      gl.bindTexture(gl.TEXTURE_2D, this.tex(s.tex)); gl.uniform3fv(this.U(sp, "uC"), s.pos); gl.uniform2f(this.U(sp, "uSize"), s.w, s.h);
      gl.uniform4f(this.U(sp, "uCol"), s.col[0], s.col[1], s.col[2], s.alpha); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    gl.depthMask(true); gl.disable(gl.BLEND); gl.bindVertexArray(null);
  }
}

/* ============================================================
   Procedural textures (canvas): wood, floor, plaster, rug, leaves, fruit, marble, globe ...
   ============================================================ */
"use strict";
const TX = {};
function mkCanvas(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
function hash2(ix, iy, seed) { let h = (ix * 374761393 + iy * 668265263 + seed * 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967295; }
function vnoise(x, y, seed, px, py) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const h = (a, b) => hash2(px ? ((a % px) + px) % px : a, py ? ((b % py) + py) % py : b, seed);
  const a = h(ix, iy), b = h(ix + 1, iy), c = h(ix, iy + 1), d = h(ix + 1, iy + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
function fbm(x, y, seed, oct, px, py) { let s = 0, a = .5, f = 1, n = 0; for (let i = 0; i < oct; i++) { s += a * vnoise(x * f, y * f, seed + i * 17, px ? px * f : 0, py ? py * f : 0); n += a; a *= .5; f *= 2; } return s / n; }
const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const rgb255 = c => [c[0] * 255, c[1] * 255, c[2] * 255];
function perPixel(w, h, fn, opts) {
  const c = mkCanvas(w, h), ctx = c.getContext("2d"), id = ctx.createImageData(w, h), d = id.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const col = fn(x, y, w, h), i = (y * w + x) * 4; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = col[3] === undefined ? 255 : col[3]; }
  ctx.putImageData(id, 0, 0); return {canvas: c, opts: opts || {}};
}
function draw(w, h, fn, opts) { const c = mkCanvas(w, h), ctx = c.getContext("2d"); fn(ctx, w, h); return {canvas: c, opts: opts || {}}; }

TX.wood = (base, dark, seed, w = 512, h = 512) => {
  const B = rgb255(hex(base)), D = rgb255(hex(dark));
  return perPixel(w, h, (x, y) => {
    const u = x / w, v = y / h * 7;
    const warp = fbm(u * 2, v * .6, seed, 3, 2, 0) * 1.7;
    const r = Math.pow(Math.abs(Math.sin((v + warp) * Math.PI)), 1.6);
    const fib = vnoise(u * 80, v * 2.5, seed + 9, 80, 0), fib2 = vnoise(u * 20, v * 14, seed + 5, 20, 0);
    const f = clamp(.1 + .5 * r + .28 * fib + .12 * fib2, 0, 1), c = mixc(B, D, f);
    const pore = vnoise(u * 160, v * 40, seed + 3, 160, 0) > .78 ? .88 : 1;
    return [c[0] * pore, c[1] * pore, c[2] * pore];
  });
};
TX.floor = (seed = 3, w = 512, h = 512) => {
  const planks = 6, cols = [["#b98a55", "#8d6232"], ["#c39560", "#946a38"], ["#ad7b47", "#7f5528"], ["#bf8f5a", "#8b5f30"]];
  return perPixel(w, h, (x, y) => {
    const pr = Math.floor(y / h * planks), py = (y / h * planks) % 1, off = hash2(pr, 1, seed) * 3;
    const pc = cols[Math.floor(hash2(pr, 7, seed) * cols.length)], B = rgb255(hex(pc[0])), D = rgb255(hex(pc[1]));
    const u = x / w, v = py * 4 + hash2(pr, 9, seed) * 9;
    const warp = fbm(u * 2 + off, v * .5, seed + pr, 3, 2, 0) * 1.6;
    const r = Math.pow(Math.abs(Math.sin((v + warp) * Math.PI)), 1.6), fib = vnoise(u * 60, v * 2.5, seed + 9, 60, 0);
    let f = clamp(.1 + .5 * r + .3 * fib, 0, 1), c = mixc(B, D, f);
    const seam = py < .018 ? .45 : py > .985 ? .7 : 1;
    const butt = ((x / w * 2 + hash2(pr, 4, seed) * 3) % 1) < .006 ? .55 : 1;
    return [c[0] * seam * butt, c[1] * seam * butt, c[2] * seam * butt];
  });
};
TX.plaster = (base, seed = 1) => { const B = rgb255(hex(base)); return perPixel(256, 256, (x, y) => { const n = fbm(x / 256 * 6, y / 256 * 6, seed, 4, 6, 6), m = vnoise(x / 2, y / 2, seed + 4, 128, 128); const f = .94 + n * .08 + (m - .5) * .025; return [B[0] * f, B[1] * f, B[2] * f]; }); };
TX.marble = (seed = 5) => perPixel(256, 256, (x, y) => {
  const u = x / 256, v = y / 256, n = fbm(u * 3, v * 3, seed, 5, 3, 3), vein = Math.abs(Math.sin((u * 2.4 + v * 1.6 + n * 3.2) * Math.PI)), t = Math.pow(1 - vein, 6);
  const base = [240, 238, 233], g = [150, 150, 158]; const c = mixc(base, g, clamp(t * .7 + (n - .5) * .12, 0, 1)); return c;
}, {});
TX.rug = (c1, c2, c3) => draw(512, 512, (g, w, h) => {
  g.fillStyle = c1; g.fillRect(0, 0, w, h);
  g.strokeStyle = c2; g.lineWidth = 14; g.strokeRect(20, 20, w - 40, h - 40);
  g.lineWidth = 3; g.strokeStyle = c3; g.strokeRect(44, 44, w - 88, h - 88); g.strokeRect(54, 54, w - 108, h - 108);
  g.fillStyle = c2; for (let i = 0; i < 24; i++) { const t = i / 24; for (const [x, y] of [[70 + t * (w - 140), 32], [70 + t * (w - 140), h - 32], [32, 70 + t * (h - 140)], [w - 32, 70 + t * (h - 140)]]) { g.save(); g.translate(x, y); g.rotate(Math.PI / 4); g.fillRect(-5, -5, 10, 10); g.restore(); } }
  g.translate(w / 2, h / 2);
  for (let k = 5; k >= 1; k--) { g.save(); g.rotate(Math.PI / 4); g.fillStyle = k % 2 ? c2 : c3; const s = k * 38; g.fillRect(-s, -s, s * 2, s * 2); g.restore(); }
  g.fillStyle = c1; g.beginPath(); g.arc(0, 0, 26, 0, TAU); g.fill(); g.fillStyle = c3; g.beginPath(); g.arc(0, 0, 14, 0, TAU); g.fill();
  g.setTransform(1, 0, 0, 1, 0, 0);
  const id = g.getImageData(0, 0, w, h), d = id.data; for (let i = 0; i < d.length; i += 4) { const n = (hash2(i / 4 % w, Math.floor(i / 4 / w), 3) - .5) * 26; d[i] += n; d[i + 1] += n; d[i + 2] += n; } g.putImageData(id, 0, 0);
});
TX.fabric = (base, seed = 1) => { const B = rgb255(hex(base)); return perPixel(128, 128, (x, y) => { const a = (Math.sin(x * 1.57) * .5 + .5) * .06 + (Math.sin(y * 1.57) * .5 + .5) * .06, n = hash2(x, y, seed) * .06; const f = .88 + a + n; return [B[0] * f, B[1] * f, B[2] * f]; }); };
TX.terracotta = () => perPixel(128, 128, (x, y) => { const n = fbm(x / 128 * 6, y / 128 * 6, 8, 4, 6, 6), f = .85 + n * .3 + (hash2(x, y, 2) - .5) * .06; return [200 * f, 108 * f, 70 * f]; });
TX.basket = () => draw(256, 256, (g, w, h) => {
  g.fillStyle = "#b98a52"; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 16) for (let x = 0; x < w; x += 32) { const o = (y / 16) % 2 ? 16 : 0; const gr = g.createLinearGradient(0, y, 0, y + 16); gr.addColorStop(0, "#d7a868"); gr.addColorStop(.5, "#c0925a"); gr.addColorStop(1, "#8f6636"); g.fillStyle = gr; g.beginPath(); g.roundRect ? g.roundRect(x + o + 1, y + 1, 30, 14, 5) : g.rect(x + o + 1, y + 1, 30, 14); g.fill(); }
});
TX.grain = (hexc, a) => draw(64, 64, (g, w, h) => { g.fillStyle = hexc; g.fillRect(0, 0, w, h); const id = g.getImageData(0, 0, w, h), d = id.data; for (let i = 0; i < d.length; i += 4) { const n = (hash2(i / 4 % w, Math.floor(i / 4 / w), 4) - .5) * a; d[i] += n; d[i + 1] += n; d[i + 2] += n; } g.putImageData(id, 0, 0); });
/* ----- leaves (alpha) ----- */
function leafBase(w, h, fn) { return draw(w, h, fn, {bleed: true}); }
TX.leafLance = (c1 = "#2f7d3a", c2 = "#5fb35a", stripes = false) => leafBase(128, 256, (g, w, h) => {
  const path = () => { g.beginPath(); g.moveTo(w / 2, h - 2); for (let i = 0; i <= 40; i++) { const t = i / 40, y = h - 2 - t * (h - 6), x = w / 2 + Math.sin(Math.PI * Math.pow(t, .75)) * w * .47; g.lineTo(x, y); } for (let i = 40; i >= 0; i--) { const t = i / 40, y = h - 2 - t * (h - 6), x = w / 2 - Math.sin(Math.PI * Math.pow(t, .75)) * w * .47; g.lineTo(x, y); } g.closePath(); };
  path(); const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, c1); gr.addColorStop(.5, c2); gr.addColorStop(1, c1); g.fillStyle = gr; g.fill();
  g.save(); path(); g.clip();
  if (stripes) { g.strokeStyle = "rgba(10,50,20,.28)"; g.lineWidth = 5; for (let y = 8; y < h; y += 15) { g.beginPath(); g.moveTo(0, y + 8); for (let x = 0; x <= w; x += 8) g.lineTo(x, y + Math.sin(x * .25 + y) * 5); g.stroke(); } g.strokeStyle = "rgba(230,220,90,.55)"; g.lineWidth = 3; g.beginPath(); g.moveTo(3, 0); g.lineTo(3, h); g.moveTo(w - 3, 0); g.lineTo(w - 3, h); g.stroke(); }
  g.strokeStyle = "rgba(255,255,255,.28)"; g.lineWidth = 2; g.beginPath(); g.moveTo(w / 2, h); g.lineTo(w / 2, 0); g.stroke();
  g.strokeStyle = "rgba(0,40,10,.12)"; g.lineWidth = 1; for (let y = 6; y < h; y += 7) { g.beginPath(); g.moveTo(w / 2, y); g.lineTo(w * .1, y - 14); g.moveTo(w / 2, y); g.lineTo(w * .9, y - 14); g.stroke(); }
  g.restore();
});
TX.leafHeart = (c1 = "#2e7d38", c2 = "#59b25a", slits = false) => leafBase(256, 256, (g, w, h) => {
  g.beginPath(); g.moveTo(w / 2, h - 4);
  g.bezierCurveTo(w * .02, h * .78, -w * .02, h * .25, w / 2, h * .04); g.bezierCurveTo(w * 1.02, h * .25, w * .98, h * .78, w / 2, h - 4); g.closePath();
  const gr = g.createRadialGradient(w / 2, h * .62, 10, w / 2, h * .55, w * .6); gr.addColorStop(0, c2); gr.addColorStop(1, c1); g.fillStyle = gr; g.fill();
  g.save(); g.clip(); g.strokeStyle = "rgba(255,255,255,.32)"; g.lineWidth = 3; g.beginPath(); g.moveTo(w / 2, h); g.lineTo(w / 2, h * .08); g.stroke();
  g.lineWidth = 1.6; g.strokeStyle = "rgba(255,255,255,.2)"; for (let i = 0; i < 7; i++) { const y = h * (.88 - i * .1); for (const s of [-1, 1]) { g.beginPath(); g.moveTo(w / 2, y); g.quadraticCurveTo(w / 2 + s * w * .22, y - h * .06, w / 2 + s * w * .44, y - h * .16 + i * 6); g.stroke(); } }
  if (slits) { g.globalCompositeOperation = "destination-out"; g.fillStyle = "#000"; for (let i = 0; i < 4; i++) for (const s of [-1, 1]) { const y = h * (.8 - i * .17); g.beginPath(); g.moveTo(w / 2 + s * w * .06, y); g.lineTo(w / 2 + s * w * .6, y - h * .09); g.lineTo(w / 2 + s * w * .6, y - h * .03); g.closePath(); g.fill(); } }
  g.restore();
});
TX.leafFrond = (c1 = "#2c7a34", c2 = "#68b856", dense = 22) => leafBase(256, 256, (g, w, h) => {
  g.lineCap = "round"; g.strokeStyle = "#4b7d2a"; g.lineWidth = 4; g.beginPath(); g.moveTo(w / 2, h); g.lineTo(w / 2, 2); g.stroke();
  for (let i = 0; i < dense; i++) {
    const t = i / dense, y = h - 8 - t * (h - 14), len = w * .5 * Math.sin(Math.PI * Math.min(1, t * 1.02 + .08)) * .98 + 4;
    for (const s of [-1, 1]) { const ex = w / 2 + s * len, ey = y - len * .55; const gr = g.createLinearGradient(w / 2, y, ex, ey); gr.addColorStop(0, c1); gr.addColorStop(1, c2); g.strokeStyle = gr; g.lineWidth = 3.6 - t * 1.6; g.beginPath(); g.moveTo(w / 2, y); g.quadraticCurveTo(w / 2 + s * len * .6, y - len * .45, ex, ey); g.stroke(); }
  }
});
TX.leafRound = (c1 = "#2a7a3c", c2 = "#6cc070") => leafBase(128, 128, (g, w, h) => {
  g.beginPath(); g.ellipse(w / 2, h / 2, w * .44, h * .47, 0, 0, TAU); const gr = g.createRadialGradient(w * .4, h * .35, 4, w / 2, h / 2, w * .55); gr.addColorStop(0, c2); gr.addColorStop(1, c1); g.fillStyle = gr; g.fill();
  g.save(); g.clip(); g.strokeStyle = "rgba(255,255,255,.3)"; g.lineWidth = 2; g.beginPath(); g.moveTo(w / 2, h); g.lineTo(w / 2, 4); g.stroke(); g.restore();
});
TX.leafSucc = (c1 = "#79a97a", c2 = "#bcd8a8", tip = "#c8738a") => leafBase(128, 128, (g, w, h) => {
  g.beginPath(); g.moveTo(w / 2, h - 2); g.bezierCurveTo(-4, h * .65, w * .12, h * .15, w / 2, 4); g.bezierCurveTo(w * .88, h * .15, w + 4, h * .65, w / 2, h - 2); const gr = g.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, c2); gr.addColorStop(.7, c1); gr.addColorStop(1, tip); g.fillStyle = gr; g.fill();
});
TX.petals = (c1, c2, center, n = 8, round = true) => leafBase(128, 128, (g, w, h) => {
  g.translate(w / 2, h / 2);
  for (let r = 0; r < 2; r++) for (let i = 0; i < n; i++) { g.save(); g.rotate(i / n * TAU + r * Math.PI / n); const gr = g.createLinearGradient(0, 0, 0, -h * .46); gr.addColorStop(0, c2); gr.addColorStop(1, c1); g.fillStyle = gr; g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(w * .15, -h * .1, w * .13, -h * .42, 0, -h * (round ? .46 : .5)); g.bezierCurveTo(-w * .13, -h * .42, -w * .15, -h * .1, 0, 0); g.fill(); g.restore(); }
  g.fillStyle = center; g.beginPath(); g.arc(0, 0, w * .09, 0, TAU); g.fill(); g.fillStyle = "rgba(0,0,0,.18)"; for (let i = 0; i < 12; i++) { g.beginPath(); g.arc(Math.cos(i * 2.4) * w * .05, Math.sin(i * 2.4) * w * .05, 1.4, 0, TAU); g.fill(); }
});
/* ----- fruit ----- */
TX.apple = (a, b) => { const A = rgb255(hex(a)), B = rgb255(hex(b)); return perPixel(256, 128, (x, y) => { const u = x / 256, v = y / 128, st = fbm(u * 24, v * 2.2, 2, 3, 24, 0), t = clamp((st - .38) * 2.4 + (Math.abs(v - .5) * .6), 0, 1); let c = mixc(A, B, clamp(t * .8 + (v < .12 || v > .9 ? .35 : 0), 0, 1)); const dot = hash2(Math.floor(x / 3), Math.floor(y / 3), 3) > .96 ? 1.25 : 1; return [clamp(c[0] * dot, 0, 255), clamp(c[1] * dot, 0, 255), clamp(c[2] * dot, 0, 255)]; }, {}); };
TX.citrus = (base, seed) => { const B = rgb255(hex(base)); return perPixel(128, 64, (x, y) => { const n = vnoise(x / 2.5, y / 2.5, seed, 52, 0), m = fbm(x / 128 * 6, y / 64 * 4, seed + 3, 3, 6, 0); const f = .86 + n * .2 + m * .12; return [B[0] * f, B[1] * f, B[2] * f]; }); };
TX.melon = () => perPixel(256, 128, (x, y) => { const u = x / 256, v = y / 128, w = fbm(u * 8, v * 3, 4, 3, 8, 0), s = Math.sin((u * 14 + (w - .5) * 2.2) * Math.PI); const t = clamp((s + .1) * 2.4, 0, 1); const c = mixc([24, 94, 38], [118, 190, 92], t * .8 + fbm(u * 30, v * 20, 5, 2, 30, 0) * .2); return c; });
TX.melonFlesh = () => draw(256, 256, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 6, w / 2, h / 2, w / 2); gr.addColorStop(0, "#ff6f7d"); gr.addColorStop(.7, "#f0364f"); gr.addColorStop(.86, "#f7f2d2"); gr.addColorStop(.9, "#4fa04a"); gr.addColorStop(1, "#1f6a30"); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = "#1c1212"; for (let i = 0; i < 26; i++) { const a = hash2(i, 3, 1) * TAU, r = 20 + hash2(i, 5, 1) * 74; g.save(); g.translate(w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r); g.rotate(a); g.beginPath(); g.ellipse(0, 0, 3, 7, 0, 0, TAU); g.fill(); g.restore(); } });
TX.coconut = () => perPixel(128, 128, (x, y) => { const n = vnoise(x / 1.4, y / 9, 3, 90, 0), m = fbm(x / 128 * 5, y / 128 * 5, 6, 3, 5, 5); const f = .55 + n * .5 + m * .3; return [112 * f, 78 * f, 46 * f]; });
TX.mango = () => perPixel(256, 128, (x, y) => { const u = x / 256, v = y / 128, n = fbm(u * 6, v * 4, 9, 3, 6, 0); const t = clamp(.3 + n * .9 + (Math.sin(u * TAU) * .5 + .5) * .45, 0, 1); const c = mixc([86, 150, 48], [240, 168, 40], t); const r = clamp((Math.sin(u * TAU + 1) * .5 + .5) * 1.3 - .45, 0, 1) * .75 * (v > .3 ? 1 : .4); return mixc(c, [214, 70, 40], r); });
TX.pineapple = () => draw(256, 256, (g, w, h) => { g.fillStyle = "#e0a02a"; g.fillRect(0, 0, w, h); const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "rgba(120,160,40,.4)"); gr.addColorStop(.3, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(120,60,10,.35)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); for (let y = -16; y < h + 16; y += 28) for (let x = -16; x < w + 16; x += 32) { const o = ((y / 28) | 0) % 2 ? 16 : 0; g.save(); g.translate(x + o, y); g.fillStyle = "#c98617"; g.beginPath(); g.moveTo(0, -14); g.lineTo(16, 0); g.lineTo(0, 14); g.lineTo(-16, 0); g.closePath(); g.fill(); g.strokeStyle = "rgba(100,50,0,.7)"; g.lineWidth = 2; g.stroke(); g.fillStyle = "#6a3a0a"; g.beginPath(); g.arc(0, 0, 2.2, 0, TAU); g.fill(); g.fillStyle = "rgba(255,230,140,.35)"; g.beginPath(); g.ellipse(-3, -4, 6, 3, -.5, 0, TAU); g.fill(); g.restore(); } });
TX.globe = () => perPixel(512, 256, (x, y) => {
  const u = x / 512, v = y / 256, lat = Math.abs(v - .5) * 2;
  const n = fbm(u * 5, v * 3, 12, 5, 5, 0) + fbm(u * 14, v * 8, 4, 2, 14, 0) * .12, land = n > .53 && lat < .86;
  let c = land ? mixc([112, 160, 90], [196, 170, 110], clamp((n - .53) * 6 + lat * .5, 0, 1)) : mixc([28, 74, 140], [52, 120, 190], clamp(n * 1.4, 0, 1));
  if (lat > .9) c = mixc(c, [244, 246, 250], clamp((lat - .9) * 14, 0, 1)); if (lat % .1 < .006 || (u * 24) % 1 < .01) c = mixc(c, [255, 255, 255], .12); return c; });
TX.clock = () => draw(256, 256, (g, w, h) => { const gr = g.createRadialGradient(w * .4, h * .35, 10, w / 2, h / 2, w * .55); gr.addColorStop(0, "#fffdf3"); gr.addColorStop(1, "#e6dcc0"); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.translate(w / 2, h / 2); g.fillStyle = "#2a2118"; g.strokeStyle = "#2a2118"; for (let i = 0; i < 60; i++) { g.save(); g.rotate(i / 60 * TAU); if (i % 5 === 0) { g.lineWidth = 6; g.beginPath(); g.moveTo(0, -w * .43); g.lineTo(0, -w * .35); g.stroke(); } else { g.lineWidth = 2; g.beginPath(); g.moveTo(0, -w * .43); g.lineTo(0, -w * .4); g.stroke(); } g.restore(); } g.font = "600 28px 'DM Sans',Georgia,serif"; g.textAlign = "center"; g.textBaseline = "middle"; for (const [n, i] of [["12", 0], ["3", 3], ["6", 6], ["9", 9]]) g.fillText(n, Math.sin(i / 12 * TAU) * w * .28, -Math.cos(i / 12 * TAU) * w * .28); });
TX.latte = () => draw(128, 128, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2); gr.addColorStop(0, "#9a6a40"); gr.addColorStop(1, "#5b3820"); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = "#f2e2c6"; g.save(); g.translate(w / 2, h / 2 + 4); g.beginPath(); g.moveTo(0, 30); g.bezierCurveTo(-46, -4, -26, -40, 0, -14); g.bezierCurveTo(26, -40, 46, -4, 0, 30); g.fill(); g.restore(); });
TX.cookie = () => perPixel(128, 128, (x, y) => { const n = fbm(x / 128 * 6, y / 128 * 6, 3, 3, 6, 6), chip = hash2(Math.floor(x / 11), Math.floor(y / 11), 8) > .72 && vnoise(x / 3, y / 3, 2, 43, 43) > .45; const c = mixc([196, 140, 78], [160, 104, 52], n); return chip ? [58, 34, 22] : c; });
TX.paint = (kind) => draw(256, 320, (g, w, h) => {
  if (kind === 0) { const sk = g.createLinearGradient(0, 0, 0, h); sk.addColorStop(0, "#f6c58b"); sk.addColorStop(.55, "#f2927a"); sk.addColorStop(1, "#6a4a7a"); g.fillStyle = sk; g.fillRect(0, 0, w, h); g.fillStyle = "#fff1c9"; g.beginPath(); g.arc(w * .5, h * .5, 46, 0, TAU); g.fill(); [["#5d4a7c", .62], ["#4a3a6a", .72], ["#2f2a4f", .84]].forEach(([c, y]) => { g.fillStyle = c; g.beginPath(); g.moveTo(0, h); g.lineTo(0, h * y); for (let x = 0; x <= w; x += 8) g.lineTo(x, h * y - Math.sin(x * .03 + y * 9) * 18); g.lineTo(w, h); g.fill(); }); }
  else if (kind === 1) { g.fillStyle = "#f3ead6"; g.fillRect(0, 0, w, h); ["#d98c6b", "#e8b86a", "#7ea08a", "#3f5f62"].forEach((c, i) => { g.fillStyle = c; const r = 100 - i * 22; g.beginPath(); g.arc(w / 2, h * .66, r, Math.PI, 0); g.lineTo(w / 2 + r, h * .88); g.lineTo(w / 2 - r, h * .88); g.fill(); }); }
  else { g.fillStyle = "#eef0e2"; g.fillRect(0, 0, w, h); g.strokeStyle = "#2e5d45"; g.lineWidth = 3; g.beginPath(); g.moveTo(w / 2, h * .95); g.quadraticCurveTo(w * .4, h * .5, w / 2, h * .1); g.stroke(); for (let i = 0; i < 8; i++) { const y = h * (.85 - i * .09), s = i % 2 ? 1 : -1; g.fillStyle = i % 3 ? "#4f8a62" : "#2e5d45"; g.beginPath(); g.ellipse(w / 2 + s * 30, y - 12, 34, 13, s * -.6, 0, TAU); g.fill(); } g.fillStyle = "#d9826b"; g.beginPath(); g.arc(w / 2, h * .1, 12, 0, TAU); g.fill(); }
});
TX.glow = (soft = 2) => draw(128, 128, (g, w, h) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(.25, "rgba(255,255,255," + (.55) + ")"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, {clamp: true});
TX.puff = () => perPixel(128, 128, (x, y) => { const dx = (x - 64) / 64, dy = (y - 64) / 64, d = Math.hypot(dx, dy), n = fbm(x / 128 * 4, y / 128 * 4, 11, 4, 0, 0); const a = clamp(1 - d, 0, 1) * clamp(n * 1.8, 0, 1); return [255, 255, 255, a * a * 255 * 1.4]; }, {clamp: true});
TX.flame = () => draw(64, 128, (g, w, h) => { const gr = g.createRadialGradient(32, 84, 2, 32, 76, 40); gr.addColorStop(0, "rgba(255,250,210,1)"); gr.addColorStop(.35, "rgba(255,200,90,.95)"); gr.addColorStop(.7, "rgba(255,120,30,.4)"); gr.addColorStop(1, "rgba(255,80,10,0)"); g.fillStyle = gr; g.beginPath(); g.moveTo(32, 4); g.bezierCurveTo(58, 54, 56, 100, 32, 108); g.bezierCurveTo(8, 100, 6, 54, 32, 4); g.fill(); }, {clamp: true});
TX.woodSign = (text, sub) => draw(1024, 256, (g, w, h) => {
  const wt = TX.wood("#7a4b27", "#4b2a12", 21, 512, 128); g.drawImage(wt.canvas, 0, 0, w, h);
  g.fillStyle = "rgba(0,0,0,.12)"; g.fillRect(0, 0, w, 10); g.fillRect(0, h - 10, w, 10);
  g.textAlign = "center"; g.textBaseline = "middle"; let fs = 128; g.font = `${fs}px "Archivo Black","Arial Black",Impact,sans-serif`; while (g.measureText(text).width > w - 120 && fs > 40) { fs -= 6; g.font = `${fs}px "Archivo Black","Arial Black",Impact,sans-serif`; }
  g.fillStyle = "rgba(0,0,0,.55)"; g.fillText(text, w / 2 + 3, h * .46 + 4); g.fillStyle = "#f6e7c4"; g.fillText(text, w / 2, h * .46);
  if (sub) { g.font = '600 30px "DM Sans",Arial,sans-serif'; g.fillStyle = "rgba(246,231,196,.85)"; g.fillText(sub.toUpperCase().split("").join(" "), w / 2, h * .82); }
});
TX.label = (text, dark) => draw(256, 64, (g, w, h) => {
  const r = 14; g.fillStyle = dark ? "#1d1b16" : "#fbf6e6"; g.beginPath(); g.roundRect ? g.roundRect(2, 2, w - 4, h - 4, r) : g.rect(2, 2, w - 4, h - 4); g.fill();
  g.strokeStyle = dark ? "#c9a24a" : "#b08a3a"; g.lineWidth = 3; g.stroke(); g.fillStyle = dark ? "#f6e7c4" : "#2a2118"; g.textAlign = "center"; g.textBaseline = "middle";
  let fs = 30; g.font = `700 ${fs}px "DM Sans","Noto Sans Bengali",Arial,sans-serif`; while (g.measureText(text).width > w - 26 && fs > 14) { fs -= 2; g.font = `700 ${fs}px "DM Sans","Noto Sans Bengali",Arial,sans-serif`; } g.fillText(text, w / 2, h / 2 + 1);
}, {clamp: true});
/* app icon -> square texture (image already loaded) */
TX.icon = (img, color) => { const t = draw(256, 256, (g, w, h) => { g.fillStyle = color || "#888"; g.fillRect(0, 0, w, h); try { g.drawImage(img, 0, 0, w, h); } catch (e) {} }, {clamp: true}); return t; };

/* ============================================================
   Props: books, fruit, plants, tea set, lamps, clock, globe, frames ...
   Every builder returns a Node whose origin sits on the surface (y = 0).
   ============================================================ */
"use strict";
const _t = new Float32Array(16);
const MT = (x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0, s = 1) => M4.trs(new Float32Array(16), [x, y, z], [rx, ry, rz], Array.isArray(s) ? s : [s, s, s]);
const C = h => hex(h);
const MAT = {};
const _rng = (s) => mulberry(s * 7919 + 13);
function initMaterials() {
  const m = MAT;
  m.oak = {tex: TX.wood("#9a6638", "#5a3319", 11), uv: [.9, .9], rough: .5, spec: .35, env: .1};
  m.oakDark = {tex: TX.wood("#b98650", "#6d4220", 31), uv: [.9, .9], rough: .5, spec: .35, env: .1};
  m.walnut = {tex: TX.wood("#7b4c2a", "#40220f", 4), uv: [.9, .9], rough: .42, spec: .45, env: .14};
  m.floor = {tex: TX.floor(), uv: [.6, .6], rough: .38, spec: .45, env: .22};
  m.marble = {tex: TX.marble(), uv: [1.6, 1.6], rough: .12, spec: .9, env: .35};
  m.vc = {color: [1, 1, 1], rough: .6, spec: .2, env: .1};
  m.vcGloss = {color: [1, 1, 1], rough: .2, spec: .8, env: .4};
  m.paper = {color: C("#f1e9d6"), rough: .8, spec: .05, env: .03};
  m.glass = {color: [.9, 1, .96], alpha: .3, rough: .04, spec: 1.6, env: 1, noShadow: true, noCull: true};
  m.brass = {color: C("#d6a94f"), metal: 1, rough: .28, spec: 1, env: .9};
  m.steel = {color: C("#b9bcc4"), metal: 1, rough: .3, spec: 1, env: .9};
  m.black = {color: C("#201f1e"), rough: .5, spec: .3, env: .15};
  m.soil = {color: C("#3a2a1e"), rough: 1, spec: 0, env: 0};
  m.terra = {tex: TX.terracotta(), uv: [1.6, 1.6], rough: .85, spec: .08, env: .04};
  m.basket = {tex: TX.basket(), uv: [3, 3], rough: .9, spec: .05, env: .03};
  m.fabric = c => ({tex: TX.fabric(c), uv: [4, 4], rough: .95, spec: 0, env: 0});
  m.apple = {tex: TX.apple("#c5202b", "#e9b23a"), rough: .22, spec: .9, env: .45};
  m.apple2 = {tex: TX.apple("#5aa83a", "#d8e06a"), rough: .24, spec: .9, env: .45};
  m.orange = {tex: TX.citrus("#f08a1c", 3), rough: .4, spec: .5, env: .25};
  m.lemon = {tex: TX.citrus("#f4d62b", 7), rough: .4, spec: .5, env: .25};
  m.melon = {tex: TX.melon(), rough: .3, spec: .7, env: .35};
  m.melonFlesh = {tex: TX.melonFlesh(), rough: .3, spec: .6, env: .3};
  m.coconut = {tex: TX.coconut(), rough: .9, spec: .05, env: .04};
  m.mango = {tex: TX.mango(), rough: .35, spec: .6, env: .3};
  m.pine = {tex: TX.pineapple(), rough: .7, spec: .15, env: .1};
  m.grape = {color: C("#4b2a68"), rough: .2, spec: 1, env: .6};
  m.cookie = {tex: TX.cookie(), uv: [1, 1], rough: .9, spec: .02, env: 0};
  m.globe = {tex: TX.globe(), rough: .3, spec: .6, env: .3};
  m.clockFace = {tex: TX.clock(), rough: .3, spec: .5, env: .2};
  m.latte = {tex: TX.latte(), rough: .25, spec: .7, env: .3};
  m.tea = {color: C("#b4601c"), rough: .1, spec: 1, env: .5};
  m.leaf = (tex, sway = .035, tint) => ({tex, color: tint || [1, 1, 1], two: true, cutoff: .5, rough: .5, spec: .22, env: .1, sway});
  m.ceramic = (c, o = {}) => Object.assign({color: C(c), rough: .14, spec: 1, env: .55}, o);
  m.matte = (c, o = {}) => Object.assign({color: C(c), rough: .85, spec: .05, env: .04}, o);
  m.lampShade = {tex: TX.fabric("#f3e3bd"), uv: [3, 3], color: [1, 1, 1], two: true, rough: .9, spec: 0, env: 0, emi: [0, 0, 0]};
  m.leafs = {
    snake: TX.leafLance("#26663a", "#4d9a4d", true), lance: TX.leafLance("#2f7d3a", "#6cb85c"), heart: TX.leafHeart("#2b7a3a", "#5bb45e"), monstera: TX.leafHeart("#256f36", "#4fa857", true),
    frond: TX.leafFrond("#2c7a34", "#68b856", 24), fern: TX.leafFrond("#3b8a3a", "#8ad06a", 30), round: TX.leafRound(), succ: TX.leafSucc(), jade: TX.leafRound("#2f7f46", "#7ccb86"),
    euc: TX.leafRound("#7fa88a", "#c6dcc8")
  };
  m.petal = (a, b, c, n, round) => ({tex: TX.petals(a, b, c, n, round), two: true, cutoff: .45, rough: .6, spec: .1, env: .05, sway: .01});
}

/* ---------- helpers ---------- */
function nodeOf(geo, mat, p, r, s) { const n = new Node(geo, mat); if (p) n.p = p; if (r) n.r = r; if (s) n.s = Array.isArray(s) ? s : [s, s, s]; return n; }
function grp(p, r) { const n = new Node(); if (p) n.p = p; if (r) n.r = r; return n; }
function colorByV(g, fn) { for (let i = 0; i < g.vc(); i++) { const c = fn(g.uv[i * 2 + 1], g.uv[i * 2]); g.c[i * 3] = c[0]; g.c[i * 3 + 1] = c[1]; g.c[i * 3 + 2] = c[2]; } return g; }
function arcPath(r, a0, a1, n, plane = "xy") { const out = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; out.push(plane === "xy" ? [Math.cos(a) * r, Math.sin(a) * r, 0] : [Math.cos(a) * r, 0, Math.sin(a) * r]); } return out; }
const BOOK_COLS = ["#8c2f2f", "#27476b", "#2f5d46", "#c79a3b", "#6a2b3d", "#2c6a73", "#e4d8bf", "#34343a", "#b4552f", "#4a3a6e", "#7a8f4a", "#a63c4a"];

/* ---------- books ---------- */
function bookGeo(t, h, d, col, o = {}) {
  const g = new Geo(), cov = .0035, page = [.95, .92, .82], gold = C("#d9b25a");
  const cc = Array.isArray(col) ? col : C(col);
  g.add(G.rbox(cov * 1.6, h, d, .0012, {segs: 1}), MT(-t / 2 + cov * .8, h / 2, 0), cc);
  g.add(G.rbox(cov * 1.6, h, d, .0012, {segs: 1}), MT(t / 2 - cov * .8, h / 2, 0), cc);
  g.add(G.rbox(t, h, cov * 2.2, Math.min(t / 2.4, .006), {segs: 3}), MT(0, h / 2, d / 2 - cov * 1.1), cc);
  g.add(G.box(t - cov * 3, h - .007, d - .008, {segs: 1}), MT(0, h / 2, -.004), page);
  /* spine decoration */
  const zs = d / 2 + .0004;
  if (!o.plain) {
    g.add(G.box(t * .94, .0035, .002, {segs: 1}), MT(0, h * .86, zs), gold); g.add(G.box(t * .94, .0035, .002, {segs: 1}), MT(0, h * .1, zs), gold);
    if (h > .2) g.add(G.box(t * .94, .002, .002, {segs: 1}), MT(0, h * .8, zs), gold);
    const lab = [.96, .92, .82]; g.add(G.box(t * .62, h * .2, .002, {segs: 1}), MT(0, h * .56, zs), lab);
    g.add(G.box(t * .46, .003, .0025, {segs: 1}), MT(0, h * .59, zs + .0004), [.25, .2, .16]); g.add(G.box(t * .34, .0025, .0025, {segs: 1}), MT(0, h * .53, zs + .0004), [.3, .24, .18]);
  }
  return g;
}
function bookRow(n, seed, o = {}) {
  const R = _rng(seed), g = new Geo(); let x = 0; const lean = o.lean;
  for (let i = 0; i < n; i++) {
    const t = .022 + R() * .03, h = (o.h || .26) * (.78 + R() * .26), d = (o.d || .2) * (.85 + R() * .15);
    const col = BOOK_COLS[Math.floor(R() * BOOK_COLS.length)];
    const last = lean && i === n - 1;
    if (last) { const a = .22; g.add(bookGeo(t, h, d, col), MT(x + h * Math.sin(a) / 2 + t / 2, 0, 0, 0, 0, -a)); x += h * Math.sin(a) + t + .01; }
    else { g.add(bookGeo(t, h, d, col), MT(x + t / 2, 0, 0)); x += t + .0015; }
  }
  return {geo: g, width: x};
}
function bookStack(n, seed, o = {}) {
  const R = _rng(seed), g = new Geo(); let y = 0, maxw = 0;
  for (let i = 0; i < n; i++) {
    const w = (o.w || .24) * (.82 + R() * .22), th = .03 + R() * .03, d = w * .72, col = BOOK_COLS[Math.floor(R() * BOOK_COLS.length)];
    g.add(bookGeo(th, w, d, col), MT((R() - .5) * .02 + w / 2 * .0, y + th / 2, (R() - .5) * .012, (R() - .5) * .3, 0, Math.PI / 2));
    y += th + .001; maxw = Math.max(maxw, w);
  }
  return {geo: g, height: y, width: maxw};
}

/* ---------- pots & soil ---------- */
function potGeo(r, h, style = "round") {
  let prof;
  if (style === "round") prof = [[0, 0], [r * .62, 0], [r * .7, .004, 1], [r * .78, h * .3], [r * .92, h * .78], [r * 1.0, h * .96, 1], [r * 1.04, h], [r * .96, h, 1], [r * .9, h * .96], [r * .88, h * .82], [0, h * .82]];
  else if (style === "tall") prof = [[0, 0], [r * .7, 0], [r * .78, .004, 1], [r * .95, h * .5], [r * 1.0, h * .98, 1], [r * 1.02, h], [r * .9, h, 1], [r * .88, h * .92], [0, h * .92]];
  else prof = [[0, 0], [r * .5, 0], [r * .55, .004, 1], [r * 1.1, h * .5], [r * 1.0, h * .98], [r * .9, h * .98], [r * .88, h * .9], [0, h * .9]];
  return G.lathe(prof, 28);
}
function discGeo(r, seg = 24, radialUV = false) { const d = new Geo(); d.v(0, 0, 0, 0, 1, 0, .5, .5); for (let i = 0; i <= seg; i++) { const a = i / seg * TAU; d.v(Math.cos(a) * r, 0, Math.sin(a) * r, 0, 1, 0, radialUV ? .5 + Math.cos(a) * .5 : .5, radialUV ? .5 + Math.sin(a) * .5 : .5); } for (let i = 0; i < seg; i++) d.tri(0, i + 2, i + 1); return d.fix(); }
function makePot(r, h, matKey, style, soilFrac = .9) {
  const n = grp(); const mat = typeof matKey === "string" ? MAT[matKey] : matKey;
  n.add(nodeOf(potGeo(r, h, style), mat));
  n.add(nodeOf(discGeo(r * .86, 24), MAT.soil, [0, h * soilFrac, 0]));
  return n;
}
/* ---------- foliage builders ---------- */
function foliage(tex, g, tint, sway) { return nodeOf(g, MAT.leaf(tex, sway === undefined ? .04 : sway, tint)); }
function plantSnake(R, n = 9, scale = 1) {
  const g = new Geo();
  for (let i = 0; i < n; i++) { const a = R() * TAU, len = (.22 + R() * .26) * scale, tilt = .05 + R() * .28; g.add(G.leaf(len, .075 * scale, .25 + R() * .3, {segL: 6, segW: 2, fold: .12, pow: 1.5}), M4.mul(MT(0, 0, 0, a), MT(0, 0, .02, 0, -tilt)), [.85 + R() * .2, .9 + R() * .15, .85 + R() * .1]); }
  return foliage(MAT.leafs.snake, g, null, .018);
}
function plantMonstera(R, n = 7, scale = 1) {
  const g = new Geo(), st = new Geo();
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU + R(), out = .06 + R() * .1 * scale, up = (.18 + R() * .2) * scale, sz = (.16 + R() * .1) * scale;
    const pts = spline([[0, 0, 0], [Math.cos(a) * out * .4, up * .6, Math.sin(a) * out * .4], [Math.cos(a) * out, up, Math.sin(a) * out]], 6);
    st.add(G.tube(pts, .004, 5), null, [.3, .5, .25]);
    const top = pts[pts.length - 1], face = a + Math.PI / 2;
    g.add(G.leaf(sz, sz * .95, .25, {segL: 3, segW: 4, fold: .08, curl: .1}), M4.mul(MT(top[0], top[1], top[2], -a + Math.PI / 2 + Math.PI), MT(0, 0, 0, 0, -.5 - R() * .5)));
  }
  const n0 = grp(); n0.add(nodeOf(st, MAT.vc)); n0.add(foliage(MAT.leafs.monstera, g, null, .03)); return n0;
}
function plantPalm(R, fronds = 9, len = .7, upBias = .25) {
  const g = new Geo();
  for (let i = 0; i < fronds; i++) { const a = i / fronds * TAU + R() * .4, tilt = upBias + R() * .5, l = len * (.8 + R() * .3); g.add(G.leaf(l, l * .85, .9 + R() * .5, {segL: 10, segW: 2, fold: .05, pow: 1.1}), M4.mul(MT(0, 0, 0, a), MT(0, 0, 0, 0, -tilt)), [.9 + R() * .15, .95 + R() * .1, .9]); }
  return foliage(MAT.leafs.frond, g, null, .05);
}
function plantFern(R, n = 12, len = .28) {
  const g = new Geo();
  for (let i = 0; i < n; i++) { const a = i / n * TAU + R(), tilt = .75 + R() * .7; g.add(G.leaf(len * (.8 + R() * .4), len * .55, 1.0 + R() * .6, {segL: 8, segW: 2, fold: .05}), M4.mul(MT(0, 0, 0, a), MT(0, 0, 0, 0, -tilt)), [.9, 1, .9]); }
  return foliage(MAT.leafs.fern, g, null, .03);
}
function succulent(R, n = 16, size = .04) {
  const g = new Geo();
  for (let i = 0; i < n; i++) { const ring = Math.floor(i / 6), a = i * 2.4 + R() * .3, tilt = .35 + ring * .35, s = size * (1 - ring * .22); g.add(G.leaf(s, s * .62, .45, {segL: 3, segW: 2, fold: .22, pow: 1}), M4.mul(MT(0, ring * .006, 0, a), MT(0, 0, 0, 0, -tilt)), [1, 1, 1]); }
  return foliage(MAT.leafs.succ, g, null, 0);
}
function cactusGeo(h, r) {
  const prof = []; for (let i = 0; i <= 14; i++) { const t = i / 14; prof.push([r * (t < .06 ? t / .06 : t > .88 ? Math.sqrt(Math.max(0, 1 - (t - .88) / .12)) : 1) * 1.0, h * t]); }
  const g = G.lathe(prof, 40);
  for (let i = 0; i < g.p.length; i += 3) { const x = g.p[i], z = g.p[i + 2], rr = Math.hypot(x, z); if (rr > 1e-5) { const a = Math.atan2(z, x), f = 1 + .08 * Math.cos(a * 7); g.p[i] = x * f; g.p[i + 2] = z * f; } }
  return g;
}
function cactus(R, h = .22) {
  const n = grp(); const g = new Geo(); g.add(cactusGeo(h, .035), null, [.35, .62, .38]);
  g.add(cactusGeo(h * .45, .022), M4.mul(MT(.05, h * .32, 0, 0, 0, -1.2), MT(0, 0, 0)), [.38, .66, .4]);
  g.add(cactusGeo(h * .3, .02), M4.mul(MT(-.045, h * .42, 0, 0, 0, 1.2), MT(0, 0, 0)), [.36, .64, .38]);
  n.add(nodeOf(g.fix(), {color: [1, 1, 1], rough: .7, spec: .1, env: .05}));
  const bl = new Geo(); for (let i = 0; i < 10; i++) bl.add(G.sphere(.0025), MT((R() - .5) * .06, h * (.2 + R() * .7), .034 * (R() > .5 ? 1 : -1)), [1, .95, .8]); n.add(nodeOf(bl, MAT.paper));
  return n;
}
function pothos(R, len = .6) {
  const n = grp(), st = new Geo(), lf = new Geo();
  for (let k = 0; k < 6; k++) {
    const a = k / 6 * TAU, L = len * (.5 + R() * .7), pts = [[0, 0, 0]]; let x = Math.cos(a) * .05, z = Math.sin(a) * .05, y = .03;
    for (let i = 1; i <= 10; i++) { const t = i / 10; pts.push([x + Math.cos(a) * t * .16 + (R() - .5) * .01, y - t * t * L + t * .06, z + Math.sin(a) * t * .16]); }
    const sp = spline(pts, 3); st.add(G.tube(sp, .0035, 4), null, [.28, .5, .24]);
    for (let i = 3; i < sp.length; i += 2) { const p = sp[i], s = .05 + R() * .03; lf.add(G.leaf(s, s * .95, .5, {segL: 3, segW: 3, fold: .1}), M4.mul(MT(p[0], p[1], p[2], R() * TAU), MT(0, 0, 0, 0, Math.PI + R() * .6)), [.85 + R() * .2, 1, .85]); }
  }
  n.add(nodeOf(st, MAT.vc)); n.add(foliage(MAT.leafs.heart, lf, null, .015)); return n;
}
function coconutPalm(R, h = .85) {
  const n = grp(); const trunkPts = spline([[0, 0, 0], [.03, h * .35, .01], [.07, h * .7, 0], [.06, h, .02]], 8);
  const tr = G.tube(trunkPts, t => .04 - t * .018, 10);
  const bark = {tex: draw(64, 256, (g, w, hh) => { g.fillStyle = "#8a6a46"; g.fillRect(0, 0, w, hh); for (let y = 0; y < hh; y += 12) { const gr = g.createLinearGradient(0, y, 0, y + 12); gr.addColorStop(0, "rgba(50,30,10,.7)"); gr.addColorStop(.25, "rgba(50,30,10,0)"); gr.addColorStop(1, "rgba(255,230,180,.15)"); g.fillStyle = gr; g.fillRect(0, y, w, 12); } }), uv: [1, 10], rough: .9, spec: .05, env: .03};
  n.add(nodeOf(tr, bark));
  const top = trunkPts[trunkPts.length - 1], crown = grp([top[0], top[1], top[2]]);
  const pm = plantPalm(R, 14, .85, 1.0); crown.add(pm); const nuts = new Geo(); for (let i = 0; i < 4; i++) nuts.add(G.sphere(.022, .026, .022, 10, 8), MT(Math.cos(i * 1.6) * .03, -.02 - R() * .02, Math.sin(i * 1.6) * .03));
  crown.add(nodeOf(nuts, MAT.coconut)); n.add(crown); return n;
}

/* ---------- fruit ---------- */
function profGeo(prof, seg = 20) { return G.lathe(prof, seg); }
const APPLE_P = [[0, -.86], [.35, -.84], [.7, -.62], [.93, -.2], [1, .18], [.9, .56], [.6, .8], [.26, .8], [.1, .66], [0, .6]];
function apple(R, mat, r = .042) { const n = grp(); const g = profGeo(APPLE_P.map(p => [p[0] * r, p[1] * r + r * .86]), 22); n.add(nodeOf(g, mat)); const st = G.tube([[0, r * 1.44, 0], [.002, r * 1.62, 0], [.006, r * 1.82, .001]], .0022, 5); n.add(nodeOf(st, {color: C("#5a3b22"), rough: .7, spec: .1})); if (R() > .4) n.add(foliage(MAT.leafs.round, G.leaf(.03, .02, .5, {segL: 3, segW: 2}), [1, 1, 1], 0).pos(.008, r * 1.7, 0).rot(.4, R() * 3, 0)); n.r = [0, R() * TAU, 0]; return n; }
function orange(R, r = .04) { const n = grp(); n.add(nodeOf(G.sphere(r, r * .94, r, 22, 16), MAT.orange, [0, r * .94, 0])); n.add(nodeOf(G.sphere(.005, .003, .005, 6, 4), {color: C("#3f5a22")}, [0, r * 1.86, 0])); n.r = [0, R() * TAU, 0]; return n; }
function lemon(R, r = .034) { const n = grp([0, r, 0], [0, R() * TAU, 0]); const prof = [[0, -1.28], [.18, -1.18], [.62, -.82], [.95, -.2], [1, .1], [.9, .55], [.55, .95], [.2, 1.2], [0, 1.28]].map(p => [p[0] * r, p[1] * r]); n.add(nodeOf(profGeo(prof, 20), MAT.lemon, [0, 0, 0], [0, 0, Math.PI / 2])); return n; }
function pear(R, r = .035) { const n = grp(); const prof = [[0, 0], [.7, .05], [1, .35], [.95, .75], [.7, 1.2], [.52, 1.6], [.4, 2.0], [.3, 2.3], [.12, 2.42], [0, 2.4]].map(p => [p[0] * r, p[1] * r]); n.add(nodeOf(profGeo(prof, 20), MAT.apple2)); n.add(nodeOf(G.tube([[0, r * 2.3, 0], [.004, r * 2.7, 0]], .002, 4), {color: C("#4d3320")})); n.r = [0, R() * TAU, 0]; return n; }
function mango(R, r = .05) { const n = grp(); const g = G.sphere(r * 1.05, r * 1.3, r * .8, 22, 16); n.add(nodeOf(g, MAT.mango, [0, r * 1.3 * .8, 0], [0, 0, 0])); n.r = [0, R() * TAU, .2]; return n; }
function banana(R, bunch = 4) {
  const n = grp(), g = new Geo(), st = new Geo();
  for (let k = 0; k < bunch; k++) {
    const sp = (k - (bunch - 1) / 2) * .22, pts = spline([[0, 0, 0], [.04, .035, sp * .02], [.1, .06, sp * .07], [.17, .055, sp * .12], [.21, .03, sp * .16]], 6);
    const bg = G.tube(pts, t => (t < .06 ? .004 : t > .93 ? .004 : .0125 - Math.abs(t - .5) * .008), 5, {flat: .9});
    colorByV(bg, t => t > .94 ? [.22, .15, .08] : t < .08 ? [.55, .62, .22] : [1, .86 - Math.abs(t - .5) * .12, .14]);
    g.add(bg, MT(0, 0, 0, 0, 0, 0));
  }
  st.add(G.tube([[-.004, .0, -.02], [-.012, -.012, 0], [-.012, -.01, .02]], .007, 6), null, [.45, .38, .15]);
  n.add(nodeOf(g, MAT.vcGloss)); n.add(nodeOf(st, MAT.vc)); return n;
}
function grapes(R) { const g = new Geo(); for (let i = 0; i < 34; i++) { const t = i / 34, y = -t * .07, rad = (1 - t) * .028 + .004, a = i * 2.4; g.add(G.sphere(.0105, .0105, .0105, 8, 6), MT(Math.cos(a) * rad, y, Math.sin(a) * rad), [.8 + R() * .3, .8 + R() * .3, .9]); } g.add(G.tube([[0, .002, 0], [.004, .02, 0]], .0022, 4), null, [.3, .5, .2]); const n = grp(); n.add(nodeOf(g, MAT.grape)); return n; }
function watermelon(R, r = .1) { const n = grp(); n.add(nodeOf(G.sphere(r * 1.25, r, r, 28, 18), MAT.melon, [0, r, 0])); return n; }
function melonHalf(r = .1) {
  const n = grp(), shell = G.lathe(Array.from({length: 13}, (_, i) => { const a = i / 12 * Math.PI / 2; return [Math.sin(a) * r, r - Math.cos(a) * r]; }), 28);
  n.add(nodeOf(shell, MAT.melon, [0, 0, 0], null, [1.25, 1, 1]));
  const fl = discGeo(r, 32, true); n.add(nodeOf(fl, MAT.melonFlesh, [0, r - .001, 0], null, [1.25, 1, 1])); return n;
}
function pineapple(R, h = .22) {
  const n = grp(), r = h * .22, prof = [[0, 0], [.55, .02], [.92, .2], [1, .5], [.95, .8], [.7, .97], [.3, 1], [0, 1]].map(p => [p[0] * r, p[1] * h * .75]);
  n.add(nodeOf(G.lathe(prof, 24), MAT.pine));
  const g = new Geo(); for (let i = 0; i < 16; i++) { const a = i / 16 * TAU, ring = i % 2; g.add(G.leaf(.13 - ring * .03, .03, .5 + ring * .3, {segL: 5, segW: 2, fold: .15}), M4.mul(MT(0, h * .74, 0, a), MT(0, 0, 0, 0, -.12 - ring * .35)), [.9, 1, .75]); }
  n.add(foliage(MAT.leafs.lance, g, [1, .95, .6], 0)); return n;
}
function coconutWhole(R, r = .065) { const n = grp(); n.add(nodeOf(G.sphere(r, r * .95, r, 20, 14), MAT.coconut, [0, r * .95, 0])); const e = new Geo(); for (const a of [0, 2.1, 4.2]) e.add(G.sphere(.007, .004, .007, 6, 4), MT(Math.cos(a) * r * .28, r * 1.88, Math.sin(a) * r * .28)); n.add(nodeOf(e, MAT.black)); n.r = [0, R() * TAU, 0]; return n; }
function youngCoconut(R) {
  const n = grp(), r = .06, prof = [[0, 0], [.5, .02], [.9, .2], [1, .55], [.85, .95], [.5, 1.25], [.3, 1.35], [0, 1.37]].map(p => [p[0] * r, p[1] * r * 1.35]);
  n.add(nodeOf(G.lathe(prof, 24), {color: C("#a9c46a"), rough: .5, spec: .3, env: .15}));
  const cut = G.lathe([[0, 1.37 * r * 1.35], [.3 * r, 1.36 * r * 1.35]], 20); n.add(nodeOf(G.lathe([[0, r * 1.78], [r * .32, r * 1.78]], 20), MAT.paper, [0, 0, 0]));
  const sp = G.tube([[0, r * 1.5, 0], [.012, r * 2.4, .004], [.03, r * 3.2, .01]], .0035, 5); n.add(nodeOf(sp, MAT.ceramic("#e8505b"))); return n;
}

/* ---------- vessels ---------- */
function bowl(r, h, matKey, inner) {
  const n = grp(), prof = [[0, 0], [r * .45, 0], [r * .5, .003, 1], [r * .8, h * .4], [r * 1.0, h * .95], [r * 1.02, h, 1], [r * .96, h, 1], [r * .78, h * .5], [r * .45, h * .12], [0, h * .1]];
  n.add(nodeOf(G.lathe(prof, 36), MAT[matKey] || matKey)); return n;
}
function basketN(r, h) {
  const n = grp(); n.add(nodeOf(G.lathe([[0, 0], [r * .8, 0], [r * 1.0, h], [r * .92, h, 1], [r * .72, h * .1], [0, h * .08]], 30), MAT.basket));
  n.add(nodeOf(G.tube(arcPath(r * .98, 0, Math.PI, 14), .006, 6).fix(), MAT.basket, [0, h, 0], [0, 0, 0]));
  n.kids[n.kids.length - 1].p = [0, h, 0]; return n;
}
function tray(w, d, matKey = "walnut") {
  const n = grp(); n.add(nodeOf(G.rbox(w, .012, d, .004), MAT[matKey], [0, .006, 0]));
  for (const [x, z, ww, dd] of [[0, d / 2 - .006, w, .012], [0, -d / 2 + .006, w, .012], [w / 2 - .006, 0, .012, d], [-w / 2 + .006, 0, .012, d]]) n.add(nodeOf(G.rbox(ww, .02, dd, .003), MAT[matKey], [x, .016, z])); return n;
}
function vase(h, r, matKey) {
  const n = grp(), prof = [[0, 0], [r * .55, 0], [r * .62, .004, 1], [r * 1.0, h * .3], [r * .95, h * .55], [r * .52, h * .82], [r * .42, h * .93], [r * .5, h], [r * .42, h, 1], [r * .36, h * .94], [r * .4, h * .8], [0, h * .5]];
  n.add(nodeOf(G.lathe(prof, 32), typeof matKey === "string" ? MAT[matKey] : matKey)); return n;
}
function flowers(R, count, spread, tall, palette, mixGreen = true) {
  const n = grp(), st = new Geo(), pet = [];
  for (let i = 0; i < count; i++) {
    const a = R() * TAU, out = R() * spread, h = tall * (.7 + R() * .5), tip = [Math.cos(a) * out, h, Math.sin(a) * out];
    const pts = spline([[0, 0, 0], [tip[0] * .3, h * .5, tip[2] * .3], tip], 5); st.add(G.tube(pts, .0032, 4), null, [.32, .52, .28]);
    const [c1, c2, ct] = palette[i % palette.length]; const fg = new Geo();
    const s = .05 + R() * .03; fg.add(G.quad(s * 2, s * 2), MT(0, 0, 0)); const f = nodeOf(fg, MAT.petal(c1, c2, ct, 7 + (i % 3), true), tip.slice()); f.r = [-.9 - R() * .5, a + Math.PI / 2, 0]; f.s = [1, 1, 1]; pet.push(f);
  }
  n.add(nodeOf(st, MAT.vc)); pet.forEach(p => n.add(p));
  if (mixGreen) { const lf = new Geo(); for (let i = 0; i < 7; i++) { const a = R() * TAU, len = tall * (.55 + R() * .4), s = .035; const pts = spline([[0, 0, 0], [Math.cos(a) * spread * .6, len * .5, Math.sin(a) * spread * .6], [Math.cos(a) * spread * 1.3, len * .85, Math.sin(a) * spread * 1.3]], 5); const sg = new Geo(); sg.add(G.tube(pts, .0026, 4), null, [.4, .56, .4]); lf.add(sg); for (let k = 2; k < pts.length; k += 1) { const p = pts[k]; lf.add(G.leaf(s, s * .7, .3, {segL: 2, segW: 2}), M4.mul(MT(p[0], p[1], p[2], a + k), MT(0, 0, 0, 0, -.8)), [1, 1, 1]); } }
    const stems2 = new Geo(); n.add(foliage(MAT.leafs.euc, lf, [1, 1, 1], .015)); }
  return n;
}

/* ---------- tea & coffee ---------- */
function teapot(colorHex = "#2f6f73", scale = 1) {
  const n = grp(), s = scale; const mat = MAT.ceramic(colorHex, {rough: .12});
  const body = G.lathe([[0, 0], [.055, 0], [.06, .004, 1], [.085, .03], [.1, .075], [.09, .12], [.065, .15], [.05, .16], [.045, .165, 1], [.04, .16], [.04, .155]].map(p => [p[0] * s, p[1] * s, p[2]]), 36);
  n.add(nodeOf(body, mat));
  const lid = G.lathe([[0, .17], [.035, .168], [.048, .162], [.05, .158, 1]].map(p => [p[0] * s, p[1] * s, p[2]]), 28); n.add(nodeOf(lid, mat));
  n.add(nodeOf(G.sphere(.011 * s, .011 * s, .011 * s, 12, 8), MAT.brass, [0, .182 * s, 0]));
  n.add(nodeOf(G.lathe([[.034 * s, .1655 * s], [.05 * s, .1655 * s]], 24), MAT.brass));
  const sp = spline([[.085, .05, 0], [.125, .08, 0], [.15, .125, 0], [.17, .15, 0]].map(p => p.map(v => v * s)), 6); n.add(nodeOf(G.tube(sp, t => (.019 - t * .011) * s, 10), mat));
  const hd = spline([[-.09, .13, 0], [-.135, .135, 0], [-.145, .08, 0], [-.095, .04, 0]].map(p => p.map(v => v * s)), 6); n.add(nodeOf(G.tube(hd, .009 * s, 8), mat));
  return n;
}
function teacup(colorHex = "#f2eee6", withTea = true) {
  const n = grp(), mat = MAT.ceramic(colorHex);
  n.add(nodeOf(G.lathe([[0, .0], [.03, .0], [.034, .004, 1], [.05, .02], [.062, .045, 1], [.06, .05], [.052, .046, 1], [.045, .02], [0, .012]], 30), mat, [0, .013, 0]));
  n.add(nodeOf(G.lathe([[0, 0], [.04, 0], [.075, .01], [.082, .016, 1], [.08, .018], [.07, .012], [.03, .006], [0, .006]], 36), mat));
  n.add(nodeOf(G.tube(spline([[.058, .056, 0], [.085, .056, 0], [.09, .036, 0], [.062, .028, 0]], 6), .004, 6), mat, [0, .013, 0]));
  if (withTea) { const d = new Geo(), seg = 26; d.v(0, 0, 0, 0, 1, 0, .5, .5); for (let i = 0; i <= seg; i++) { const a = i / seg * TAU; d.v(Math.cos(a) * .052, 0, Math.sin(a) * .052, 0, 1, 0, .5, .5); } for (let i = 0; i < seg; i++) d.tri(0, i + 2, i + 1); n.add(nodeOf(d.fix(), MAT.tea, [0, .013 + .04, 0])); }
  return n;
}
function mug(colorHex = "#e7dccb", latte = true) {
  const n = grp(), mat = MAT.ceramic(colorHex, {rough: .2});
  n.add(nodeOf(G.lathe([[0, 0], [.04, 0], [.044, .004, 1], [.047, .04], [.049, .09, 1], [.053, .092], [.047, .088], [.043, .04], [0, .008]], 32), mat));
  n.add(nodeOf(G.tube(spline([[.049, .08, 0], [.083, .082, 0], [.088, .045, 0], [.047, .022, 0]], 6), .0065, 8), mat));
  const d = new Geo(), seg = 28; d.v(0, 0, 0, 0, 1, 0, .5, .5); for (let i = 0; i <= seg; i++) { const a = i / seg * TAU; d.v(Math.cos(a) * .0455, 0, Math.sin(a) * .0455, 0, 1, 0, .5 + Math.cos(a) * .5, .5 + Math.sin(a) * .5); } for (let i = 0; i < seg; i++) d.tri(0, i + 2, i + 1);
  n.add(nodeOf(d.fix(), MAT.latte, [0, .08, 0])); return n;
}
function cookies(R, n = 5) { const g = new Geo(); for (let i = 0; i < n; i++) { const a = i / n * TAU, rr = i === n - 1 && n > 3 ? 0 : .04; g.add(G.lathe([[0, 0], [.026, 0], [.03, .004], [.03, .009], [.022, .012], [0, .013]], 18), MT(Math.cos(a) * rr, i === n - 1 ? .012 : 0, Math.sin(a) * rr, a)); } return nodeOf(g, MAT.cookie); }
function plate(r, colorHex = "#f4efe6") { return nodeOf(G.lathe([[0, 0], [r * .62, 0], [r * .64, .003, 1], [r * .96, .014], [r * 1.0, .017, 1], [r * .98, .019], [r * .94, .016], [r * .64, .007], [0, .007]], 40), MAT.ceramic(colorHex)); }
function sugarBowl() { const n = grp(), mat = MAT.ceramic("#2f6f73", {rough: .12}); n.add(nodeOf(G.lathe([[0, 0], [.03, 0], [.05, .03], [.052, .05, 1], [.044, .052], [.04, .045], [0, .04]], 28), mat)); n.add(nodeOf(G.lathe([[0, .052], [.03, .05], [.044, .045, 1]], 24), mat)); n.add(nodeOf(G.sphere(.009), MAT.brass, [0, .06, 0])); return n; }
function spoon() { const n = grp(); n.add(nodeOf(G.sphere(.015, .004, .009, 12, 8), MAT.steel, [0, .004, 0])); n.add(nodeOf(G.box(.075, .0028, .006, {segs: 1}), MAT.steel, [.045, .005, 0])); return n; }
function candle(h = .1, r = .016, colorHex = "#f1e6cf") { const n = grp(); n.add(nodeOf(G.lathe([[0, 0], [r, 0], [r, h], [r * .7, h + .002], [0, h - .004]], 20), MAT.matte(colorHex, {rough: .7, spec: .1}))); n.add(nodeOf(G.tube([[0, h, 0], [0, h + .012, 0]], .0012, 4), MAT.black)); n.flamePos = [0, h + .022, 0]; return n; }

/* ---------- lamps ---------- */
function tableLamp(h = .34, shadeCol = "#f3e3bd") {
  const n = grp(); n.add(nodeOf(G.lathe([[0, 0], [.05, 0], [.057, .004, 1], [.08, .05], [.075, .1], [.045, .15], [.02, .17], [.014, .19]], 32), MAT.ceramic("#c9d6d0", {rough: .15})));
  n.add(nodeOf(G.tube([[0, .19, 0], [0, h * .62, 0]], .006, 8), MAT.brass));
  const sh = nodeOf(G.lathe([[.085, h * .5, 1], [.1, h * .72], [.115, h * .96]].map(p => p), 36), Object.assign({}, MAT.lampShade)); sh.p = [0, 0, 0]; n.add(sh);
  const sg = G.lathe([[.115, h * .96], [.085, h * .5]], 36); n.shade = sh;
  const bulb = nodeOf(G.sphere(.022, .028, .022, 12, 8), {unlit: true, color: [1, .9, .6], emi: [0, 0, 0]}, [0, h * .62 + .02, 0]); n.add(bulb); n.bulb = bulb; n.top = h; return n;
}
function floorLamp() {
  const n = grp(); n.add(nodeOf(G.lathe([[0, 0], [.16, 0], [.17, .012, 1], [.15, .03], [0, .032]], 36), MAT.black));
  const path = spline([[0, .03, 0], [0, 1.3, 0], [.15, 1.85, 0], [.7, 2.05, 0], [1.15, 1.85, 0], [1.28, 1.62, 0]], 12); n.add(nodeOf(G.tube(path, .011, 8), MAT.brass));
  const last = path[path.length - 1];
  const shade = nodeOf(G.lathe([[.07, 0, 1], [.14, -.1], [.2, -.2]], 36), Object.assign({}, MAT.lampShade, {color: C("#f3dcae")})); shade.p = [last[0], last[1], 0]; n.add(shade);
  const bulb = nodeOf(G.sphere(.03, .036, .03, 12, 8), {unlit: true, color: [1, .9, .6], emi: [0, 0, 0]}, [last[0], last[1] - .06, 0]); n.add(bulb); n.shade = shade; n.bulb = bulb; n.lightPos = [last[0], last[1] - .1, 0]; return n;
}
/* ---------- clock, globe, frames ---------- */
function mantelClock() {
  const n = grp(); n.add(nodeOf(G.rbox(.2, .22, .07, .02), MAT.walnut, [0, .11, 0]));
  const face = new Geo(), seg = 40; face.v(0, 0, 0, 0, 0, 1, .5, .5); for (let i = 0; i <= seg; i++) { const a = i / seg * TAU; face.v(Math.cos(a) * .082, Math.sin(a) * .082, 0, 0, 0, 1, .5 + Math.cos(a) * .5, .5 - Math.sin(a) * .5); } for (let i = 0; i < seg; i++) face.tri(0, i + 1, i + 2);
  n.add(nodeOf(face.fix(), MAT.clockFace, [0, .125, .0365]));
  n.add(nodeOf(G.lathe([[.082, 0], [.088, 0], [.09, .004], [.088, .008], [.082, .008]], 40), MAT.brass, [0, .125, .036], [Math.PI / 2, 0, 0]));
  const pivot = [0, .125, .04]; const hh = grp(pivot), mh = grp(pivot), sh = grp(pivot);
  hh.add(nodeOf(G.box(.008, .048, .003, {segs: 1}), MAT.black, [0, .02, 0])); mh.add(nodeOf(G.box(.006, .07, .002, {segs: 1}), MAT.black, [0, .03, .003])); sh.add(nodeOf(G.box(.0025, .076, .002, {segs: 1}), MAT.ceramic("#c4372c"), [0, .026, .006]));
  n.add(hh); n.add(mh); n.add(sh); n.hands = {h: hh, m: mh, s: sh}; n.add(nodeOf(G.sphere(.006), MAT.brass, [0, .125, .044]));
  for (const x of [-.07, .07]) n.add(nodeOf(G.rbox(.025, .012, .04, .004), MAT.brass, [x, .006, 0])); return n;
}
function globe() {
  const n = grp(); n.add(nodeOf(G.lathe([[0, 0], [.07, 0], [.075, .006, 1], [.06, .02], [.012, .05], [.01, .06]], 28), MAT.brass));
  const arc = G.tube(arcPath(.125, -Math.PI * .56, Math.PI * .56, 24), .0035, 6).fix(); const ring = nodeOf(arc, MAT.brass, [0, .2, 0], [0, 0, 0]); n.add(ring);
  const sp = grp([0, .2, 0], [0, 0, .41]); const ball = nodeOf(G.sphere(.11, .11, .11, 36, 24), MAT.globe); sp.add(ball); n.add(sp); n.spin = sp; ring.r = [0, 0, 0]; n.top = .33; return n;
}
function frame(w, h, kind = 0, colorKey = "walnut") {
  const n = grp(), fw = .028, mk = MAT[colorKey] || colorKey;
  n.add(nodeOf(G.rbox(w, fw, .025, .004), mk, [0, h / 2 - fw / 2, 0])); n.add(nodeOf(G.rbox(w, fw, .025, .004), mk, [0, -h / 2 + fw / 2, 0]));
  n.add(nodeOf(G.rbox(fw, h - 2 * fw, .025, .004), mk, [w / 2 - fw / 2, 0, 0])); n.add(nodeOf(G.rbox(fw, h - 2 * fw, .025, .004), mk, [-w / 2 + fw / 2, 0, 0]));
  n.add(nodeOf(G.quad(w - 2 * fw, h - 2 * fw), {color: C("#f4efe2"), rough: .9, spec: 0, env: 0}, [0, 0, .004]));
  const mm = .035, art = nodeOf(G.quad(w - 2 * fw - 2 * mm, h - 2 * fw - 2 * mm), {tex: TX.paint(kind), rough: .6, spec: .1, env: .08, uv: [1, 1]}, [0, 0, .0055]); n.add(art); return n;
}
function stringLights(width, sag, count, seed) {
  const R = _rng(seed), n = grp(), wire = [], bulbs = [];
  for (let i = 0; i <= 40; i++) { const t = i / 40; wire.push([-width / 2 + t * width, -sag * 4 * t * (1 - t), 0]); }
  n.add(nodeOf(G.tube(wire, .0014, 4), MAT.black));
  const cols = [[1, .78, .35], [1, .55, .6], [.6, .95, .45], [.5, .85, 1]]; const g = new Geo();
  for (let i = 0; i <= count; i++) { const t = i / count, x = -width / 2 + t * width, y = -sag * 4 * t * (1 - t) - .012, c = cols[i % cols.length]; bulbs.push({pos: [x, y - .005, 0], col: c, ph: R() * 6}); }
  n.bulbs = bulbs; return n;
}

/* ============================================================
   Room: wooden bookcase, side table with tea & coffee, plants, lighting, camera, picking
   ============================================================ */
"use strict";
const MODES = {
  day: {sunDir: [-.5, .66, .56], sunCol: [3.0, 2.55, 1.95], sky: [.62, .72, .95], ground: [.52, .43, .33], exposure: 1.0, bg: [.1, .09, .08], lamps: 0, string: .15, wall: [1, 1, 1]},
  evening: {sunDir: [-.88, .3, .38], sunCol: [3.4, 1.55, .6], sky: [.5, .38, .52], ground: [.42, .29, .2], exposure: 1.05, bg: [.1, .07, .07], lamps: .85, string: .75, wall: [1, .9, .85]},
  night: {sunDir: [.38, .72, .58], sunCol: [.55, .72, 1.4], sky: [.1, .13, .3], ground: [.07, .06, .1], exposure: 1.3, bg: [.02, .03, .06], lamps: 1, string: 1, wall: [.9, .95, 1]}
};
const lerpArr = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const smooth = (x) => x * x * (3 - 2 * x);

class Room {
  constructor(canvas, opts = {}) {
    this.canvas = canvas; this.mobile = !!opts.mobile; this.storeName = opts.storeName;
    this.r = new Renderer(canvas, {shadowSize: this.mobile ? 1024 : 2048}); this.r.maxDpr = this.mobile ? 1.5 : 2;
    initMaterials();
    this.root = new Node(); this.sprites = []; this.tiles = []; this.hot = []; this.steamers = []; this.flames = []; this.bulbs = []; this.lamps = [];
    this.mode = "day"; this.modeFrom = MODES.day; this.cur = JSON.parse(JSON.stringify(MODES.day)); this.target = "day"; this.modeT = 1;
    this.sel = null; this.hover = null; this.time = 0; this.sound = opts.sound || (() => {});
    this.cb = {pick() {}, hover() {}, bg() {}, hot() {}};
    this.S = {root: this.root, light: null, sprites: this.sprites, rackMin: [0, 0, 0], rackMax: [1, 1, 1], shadowCenter: [0, 1.1, -.2]};
    this.RX = -.58; this.RZ = -.7; this.W = 2.22; this.D = .36;
    this.glowTex = TX.glow(); this.puffTex = TX.puff(); this.flameTex = TX.flame(); this.dustTex = TX.glow();
    this.buildRoom(); this.buildRack(); this.buildTable(); this.buildExtras(); this.buildDust();
    this.cam = {fov: .62, yaw: -.12, pitch: .1, dist: 6, target: [-.1, 1.1, 0], eye: [0, 1, 5]}; this.goal = {yaw: -.12, pitch: .1, dist: 6, target: [-.1, 1.1, 0]};
    this.preset("overview", true); this.lastInput = -99; this.bindInput();
  }
  /* ---------------- structure ---------------- */
  add(parent, geo, mat, p, r, s) { const n = nodeOf(geo, mat, p, r, s); parent.add(n); return n; }
  buildRoom() {
    const R = this.root;
    const wallG = (w, h, ur, vr) => { const g = new Geo(); g.v(-w / 2, -h / 2, 0, 0, 0, 1, 0, 0); g.v(w / 2, -h / 2, 0, 0, 0, 1, ur, 0); g.v(w / 2, h / 2, 0, 0, 0, 1, ur, vr); g.v(-w / 2, h / 2, 0, 0, 0, 1, 0, vr); g.tri(0, 1, 2); g.tri(0, 2, 3); return g; };
    this.wallMat = Object.assign({tex: TX.plaster("#efe3cf"), uv: [1, 1], rough: .95, spec: .02, env: .02}, {});
    this.add(R, wallG(14, 4.6, 14 / 1.6, 4.6 / 1.6), this.wallMat, [0, 2.3, -.92]);
    this.add(R, wallG(8, 4.6, 5, 3), this.wallMat, [-4.6, 2.3, 1.6], [0, Math.PI / 2, 0]);
    this.add(R, wallG(8, 4.6, 5, 3), this.wallMat, [4.6, 2.3, 1.6], [0, -Math.PI / 2, 0]);
    this.add(R, G.plane(14, 9, [14 * .6, 9 * .6]), MAT.floor, [0, 0, 1.6]);
    /* wainscot + skirting */
    const wp = {color: C("#e9e1d2"), rough: .6, spec: .12, env: .05};
    this.add(R, G.rbox(14, .11, .025, .004), wp, [0, .055, -.9]);
    this.add(R, G.rbox(14, .03, .02, .004), wp, [0, 1.05, -.91]);
    for (let i = -6; i <= 6; i++) this.add(R, G.rbox(.9, .93, .014, .003), wp, [i * 1.02 + .3, .56, -.915]);
    /* rug */
    const rug = TX.rug("#d9c3a0", "#9a5a44", "#5d7380");
    this.add(R, G.plane(3.2, 2.1, [1, 1]), {tex: rug, uv: [1, 1], rough: .98, spec: 0, env: 0}, [.35, .004, .6], [0, .04, 0]).cast = false;
    /* sun/moon window: invisible occluder that only exists in the shadow pass */
    const occ = this.occ = new Node(); R.add(occ); const om = {shadowOnly: true, color: [0, 0, 0]};
    this.windowParts = [];
    const bx = (w, h, x, y) => { const n = nodeOf(G.box(w, h, .05, {segs: 1}), om, [x, y, 0]); occ.add(n); return n; };
    const HW = 1.55, HH = 1.15; this.win = {HW, HH};
    this.winBoards = [bx(14, 8, 0, HH + 4), bx(14, 8, 0, -HH - 4), bx(8, 3, -HW - 4, 0), bx(8, 3, HW + 4, 0)];
    this.winBars = [bx(.07, HH * 2, 0, 0), bx(HW * 2, .07, 0, .38), bx(HW * 2, .07, 0, -.38), bx(.07, HH * 2, -HW * .5, 0), bx(.07, HH * 2, HW * .5, 0)];
    this.winBars[3].visible = this.winBars[4].visible = false;
    this.winBoards[2].s = [1, 1, 1];
  }
  buildRack() {
    const W = this.W, D = this.D, g = this.rack = grp([this.RX, 0, this.RZ]); this.root.add(g);
    const oak = MAT.oak, dark = MAT.oakDark;
    this.rows = 4; this.shelfY = k => .6 + k * .39;
    const top = this.shelfY(4);
    /* frame */
    for (const sx of [-1, 1]) this.add(g, G.rbox(.032, top + .035, D, .006), oak, [sx * (W / 2 - .016), (top + .035) / 2, 0]);
    this.add(g, G.rbox(W + .05, .04, D + .035, .008), oak, [0, top + .02, .0125]);
    for (let k = 0; k < 4; k++) this.add(g, G.rbox(W - .06, k === 0 ? .045 : .03, D - .01, .004), oak, [0, this.shelfY(k) - (k === 0 ? .0225 : .015), -.0]);
    this.add(g, G.rbox(W - .06, .08, D - .05, .004), dark, [0, .04, -.01]);
    const backCol = {color: C("#4d6b5a"), rough: .9, spec: .03, env: .02};
    this.add(g, G.box(W - .06, top - .08, .012, {segs: 1}), backCol, [0, .08 + (top - .08) / 2, -D / 2 + .012]);
    this.colX = []; const inner = W - .064, cw = (inner - .05) / 3; this.cw = cw;
    for (let c = 0; c < 3; c++) this.colX.push(-inner / 2 + cw / 2 + c * (cw + .025));
    for (const dx of [-1, 1]) this.add(g, G.rbox(.025, top - .6 + .01, D - .02, .003), oak, [dx * (cw / 2 + .0125), (top + .6) / 2, 0]);
    /* cabinet doors */
    const dm = {tex: dark.tex, uv: [1.1, 1.1], rough: .45, spec: .35, env: .1};
    for (let c = 0; c < 3; c++) {
      const x = this.colX[c], zf = D / 2 + .004;
      this.add(g, G.rbox(cw - .012, .5, .022, .006), dm, [x, .08 + .26, zf]);
      this.add(g, G.rbox(cw - .1, .38, .014, .004), {tex: oak.tex, uv: [1.5, 1.5], rough: .5, spec: .3, env: .08}, [x, .08 + .26, zf + .013]);
      this.add(g, G.tube([[0, -.07, 0], [0, .07, 0]], .007, 8).fix(), MAT.brass, [x + (cw / 2 - .05) * (c === 1 ? 1 : (c === 0 ? 1 : -1)), .08 + .26 + .1, zf + .04]);
    }
    this.S.rackMin = [this.RX - W / 2 + .03, .6, this.RZ - D / 2]; this.S.rackMax = [this.RX + W / 2 - .03, top, this.RZ + D / 2];
    this.items = grp(); g.add(this.items);
  }
  /* compartments ---------------------------------------------------------- */
  put(parent, node, x, y, z, ry) { node.p = [x, y, z]; if (ry !== undefined) node.r = [0, ry, 0]; parent.add(node); return node; }
  booksAt(parent, n, seed, x, y, z, o) { const b = bookRow(n, seed, o); this.put(parent, nodeOf(b.geo, MAT.vc), x, y, z); return b.width; }
  stackAt(parent, n, seed, x, y, z, o) { const b = bookStack(n, seed, o); this.put(parent, nodeOf(b.geo, MAT.vc), x, y, z); return b; }
  compose(parent, idx, cx, y, free) {
    /* free = [leftFree, rightFree]; builds the decoration of one compartment according to a recipe */
    const R = _rng(idx * 31 + 5), D = this.D, zc = .0, hw = this.cw / 2;
    const recipes = [
      () => { const w = this.booksAt(parent, 8, idx + 1, cx - hw + .03, y, zc, {h: .27}); this.put(parent, this.potPlant(R, "succ"), cx + hw - .14, y, .02); const f = frame(.16, .21, idx % 3); f.p = [cx + hw - .27, y + .105, -.1]; f.r = [-.12, .2, 0]; parent.add(f); },
      () => { const bw = bowl(.15, .075, MAT.ceramic("#2a6b6e")); this.put(parent, bw, cx - .12, y, .02); this.fruitInBowl(parent, R, cx - .12, y + .035, .02, .1); const s = this.stackAt(parent, 3, idx + 4, cx + .2, y, .0, {w: .2}); const c = candle(.09, .018); this.put(parent, c, cx + .2, y + s.height, 0); this.flames.push({node: c, off: c.flamePos, s: 1}); },
      () => { const v = vase(.16, .06, MAT.ceramic("#d9b36a")); this.put(parent, v, cx - .2, y, .02); const fl = flowers(R, 7, .05, .15, [["#f06a8a", "#ffc2d4", "#e8a23a"], ["#fff5d6", "#ffffff", "#e8a23a"], ["#f4a83a", "#ffd88a", "#7a4a1a"]]); this.put(parent, fl, cx - .2, y + .15, .02); const s = this.stackAt(parent, 4, idx + 9, cx + .13, y, .0, {w: .22}); const su = succulent(R, 14, .04); this.put(parent, su, cx + .13, y + s.height, 0); },
      () => { const gl = globe(); this.put(parent, gl, cx - .15, y, .02); this.globes = this.globes || []; this.globes.push(gl); this.hot.push({kind: "globe", node: gl, r: .15, off: [0, .2, 0]}); this.booksAt(parent, 6, idx + 3, cx + .02, y, 0, {h: .25}); },
      () => { const l = tableLamp(.3); this.put(parent, l, cx + .2, y, .02); this.lamps.push(l); const f = frame(.18, .22, (idx + 1) % 3, "black"); f.p = [cx - .02, y + .115, -.1]; f.r = [-.12, -.2, 0]; parent.add(f); const s = this.stackAt(parent, 3, idx + 6, cx - .22, y, .02, {w: .2}); this.put(parent, cactus(R, .16), cx - .22, y + s.height, .02); },
      () => { const cl = mantelClock(); this.put(parent, cl, cx - .16, y, .0); this.clocks = this.clocks || []; this.clocks.push(cl); this.hot.push({kind: "clock", node: cl, r: .13, off: [0, .12, .03]}); this.put(parent, succulent(R, 16, .045), cx + .04, y, .06); this.put(parent, makePot(.04, .06, "terra", "round"), cx + .04, y, .06); this.booksAt(parent, 5, idx + 8, cx + .12, y, 0, {h: .22}); },
      () => { const b = basketN(.14, .1); this.put(parent, b, cx - .12, y, .02); this.fruitInBowl(parent, R, cx - .12, y + .02, .02, .1, "lemon"); this.put(parent, pineapple(R, .22), cx + .22, y, 0); this.put(parent, coconutWhole(R), cx + .02, y, .06); },
      () => { this.booksAt(parent, 9, idx + 11, cx - hw + .03, y, 0, {h: .29, lean: true}); this.booksAt(parent, 6, idx + 14, cx + .08, y, 0, {h: .24, lean: false}); },
      () => { const t = tray(.34, .22); this.put(parent, t, cx - .1, y, .02, .1); this.put(parent, banana(R, 4), cx - .22, y + .02, .0, .3); this.put(parent, grapes(R), cx - .05, y + .07, .02); const mh = melonHalf(.075); mh.r = [0, .5, 0]; this.put(parent, mh, cx - .02, y + .02, -.02); this.booksAt(parent, 5, idx + 2, cx + .17, y, 0, {h: .26}); },
      () => { const pt = pothos(R, .55); this.put(parent, makePot(.075, .11, MAT.ceramic("#f1ece2"), "round"), cx + .15, y, .1); this.put(parent, pt, cx + .15, y + .11, .1); const s = this.stackAt(parent, 3, idx + 5, cx - .18, y, 0, {w: .22}); for (let i = 0; i < 3; i++) { const c = candle(.06 + i * .02, .014); this.put(parent, c, cx - .24 + i * .045, y + s.height, .0); this.flames.push({node: c, off: c.flamePos, s: .8}); } }
    ];
    const rec = recipes[(idx * 3 + 1) % recipes.length];
    try { rec(); } catch (e) { console.warn("compose", idx, e); }
  }
  compact(parent, idx, x, y) {
    const R = _rng(idx * 17 + 3), k = idx % 4;
    try {
      if (k === 0) this.put(parent, this.potPlant(R, "succ"), x, y, .03);
      else if (k === 1) { const s = this.stackAt(parent, 3, idx + 8, x, y, .02, {w: .2}); const c = candle(.08, .018); this.put(parent, c, x, y + s.height, .02); this.flames.push({node: c, off: c.flamePos, s: 1}); }
      else if (k === 2) { const v = vase(.15, .055, MAT.ceramic("#d9b36a")); this.put(parent, v, x, y, .03); const fl = flowers(R, 6, .05, .14, [["#f06a8a", "#ffc2d4", "#e8a23a"], ["#fff5d6", "#ffffff", "#e8a23a"]]); this.put(parent, fl, x, y + .14, .03); }
      else this.put(parent, cactus(R, .17), x, y, .03);
    } catch (e) { console.warn("compact", idx, e); }
  }
  potPlant(R, kind) { const n = grp(); n.add(makePot(.06, .09, MAT.terra, "round")); const f = kind === "succ" ? succulent(R, 16, .05) : kind === "snake" ? plantSnake(R, 8, .8) : plantFern(R, 10, .22); f.p = [0, .09, 0]; n.add(f); return n; }
  fruitInBowl(parent, R, x, y, z, rad, kind) {
    const list = [];
    const mk = kind === "lemon" ? (i) => lemon(R) : (i) => [apple(R, MAT.apple), orange(R), apple(R, MAT.apple2), orange(R), pear(R), lemon(R), mango(R, .04)][i % 7];
    const n = 9;
    for (let i = 0; i < n; i++) { const a = i / 6 * TAU, rr = i < 6 ? rad * .55 : 0, yy = i < 6 ? 0 : .045; const f = mk(i); f.p = [x + Math.cos(a) * rr, y + yy + (i < 6 ? .01 : .025), z + Math.sin(a) * rr]; parent.add(f); }
  }
  buildApps(apps, opts = {}) {
    this.items.kids.length = 0; this.tiles = []; this.hot = this.hot.filter(h => h.kind === "teapot"); this.flames = this.flames.filter(f => f.fixed); this.lamps = this.lamps.filter(l => l.fixed); this.globes = []; this.clocks = this.clocks ? this.clocks.filter(c => c.fixed) : [];
    const order = []; for (let r = 3; r >= 0; r--) for (let c = 0; c < 3; c++) order.push([r, c]);
    const per = {}; let ai = 0;
    for (const [r, c] of order) { per[r + "_" + c] = []; for (let k = 0; k < 2; k++) if (ai < apps.length) per[r + "_" + c].push(apps[ai++]); }
    this.overflow = Math.max(0, apps.length - 24);
    let idx = 0;
    for (const [r, c] of order) {
      const list = per[r + "_" + c], cx = this.colX[c], y = this.shelfY(r); idx++;
      if (list.length === 0) this.compose(this.items, idx, cx, y, [true, true]); else if (list.length === 1) this.compact(this.items, idx, cx + .175, y);
      list.forEach((a, k) => this.addTile(a, cx + (k === 0 ? -.175 : .175), y));
    }
    this.topDecor();
  }
  topDecor() {
    const g = this.items, W = this.W, y = this.shelfY(4) + .04, R = _rng(77);
    this.put(g, coconutPalm(R, .82), .78, y, -.02); this.put(g, makePot(.1, .13, MAT.ceramic("#e9e3d6"), "round"), .78, y, -.02);
    const pot = makePot(.09, .12, MAT.matte("#2d2d30", {rough: .55, spec: .3}), "tall"); this.put(g, pot, -.82, y, .06); this.put(g, pothos(R, .8), -.82, y + .12, .06);
    const v = vase(.22, .075, MAT.ceramic("#3a5f8a")); this.put(g, v, -.32, y, 0); this.put(g, flowers(R, 9, .07, .22, [["#fff", "#f8d9e4", "#e0a030"], ["#9cc9f2", "#d6ebff", "#e8c24a"]]), -.32, y + .2, 0);
    const s = this.stackAt(g, 5, 91, .2, y, 0, {w: .27}); this.put(g, basketN(.12, .09), .38, y, .05); this.put(g, grapes(R), .38, y + .12, .05);
    const c = candle(.12, .02); this.put(g, c, .2, y + s.height, 0); this.flames.push({node: c, off: c.flamePos, s: 1});
    this.put(g, frame(.26, .34, 0, "oak"), -.02, y + .17, -.12);
    /* fairy lights under the top board */
    const sl = stringLights(W - .1, .07, 36, 3); sl.p = [0, this.shelfY(4) - .045, this.D / 2 + .012]; this.rack.add(sl);
    this.bulbNodes = sl; this.bulbs = sl.bulbs; sl.kids.length && 0;
    if (!this.bulbMesh) {
      this.bulbMesh = []; this.bulbs.forEach((b, i) => { const n = nodeOf(G.sphere(.011, .014, .011, 8, 6), {unlit: true, color: b.col, emi: [0, 0, 0]}, b.pos); sl.add(n); this.bulbMesh.push(n); });
    }
  }
  addTile(app, x, y) {
    const S = .235, T = {app, dim: 0, hover: 0, sel: 0, ph: Math.random() * 6};
    const g = grp([x, y, .035]); this.items.add(g); T.group = g;
    const stand = this.add(g, G.rbox(.14, .04, .07, .008), MAT.oak, [0, .02, .0]);
    const pivot = grp([0, .04, .035]); g.add(pivot); T.pivot = pivot; T.baseRot = -.14;
    pivot.r = [T.baseRot, 0, 0];
    const slab = G.slab(S, S, .026, S * .2, .004, 6);
    T.bodyMat = {color: hex(app.color || "#888"), rough: .28, spec: .7, env: .35};
    const src = TX.icon(new Image(), app.color); T.src = src; T.capMat = {tex: src, uv: [1, 1], rough: .2, spec: .7, env: .45, color: [1, 1, 1], emi: [0, 0, 0]};
    const img = new Image(); img.onload = () => { try { const c = src.canvas.getContext("2d"); c.fillStyle = app.color || "#888"; c.fillRect(0, 0, 256, 256); c.drawImage(img, 0, 0, 256, 256); if (src.gl) { this.r.gl.deleteTexture(src.gl); src.gl = null; } } catch (e) {} }; img.src = app.icon;
    this.add(pivot, slab.body, T.bodyMat, [0, S / 2, 0]); this.add(pivot, slab.cap, T.capMat, [0, S / 2, 0]);
    const lab = TX.label(app.name, false), plaque = this.add(g, G.quad(.17, .0425), {tex: lab, rough: .5, spec: .3, env: .1, uv: [1, 1]}, [0, .026, .115], [-.4, 0, 0]);
    T.plaque = plaque; this.tiles.push(T);
  }
  /* table ---------------------------------------------------------------- */
  buildTable() {
    const g = this.table = grp([1.28, 0, .12]); this.root.add(g); const topY = .56;
    this.add(g, G.lathe([[0, 0], [.46, 0], [.47, .004, 1], [.47, .028], [.455, .032], [0, .032]], 56), MAT.marble, [0, topY, 0]);
    this.add(g, G.lathe([[.462, 0], [.472, 0], [.472, .02], [.462, .02]], 56), MAT.brass, [0, topY + .004, 0]);
    for (let i = 0; i < 3; i++) { const a = i / 3 * TAU + .5; const top = [Math.cos(a) * .26, topY, Math.sin(a) * .26], bot = [Math.cos(a) * .4, 0, Math.sin(a) * .4]; this.add(g, G.tube(spline([top, V.lerp(top, bot, .5), bot], 6), t => .02 - t * .007, 10), MAT.walnut); this.add(g, G.sphere(.012, .008, .012, 8, 6), MAT.brass, [bot[0], .004, bot[2]]); }
    this.add(g, G.lathe([[.19, 0], [.205, 0], [.205, .014], [.19, .014]], 40), MAT.walnut, [0, .26, 0]);
    const y0 = topY + .032, R = _rng(5);
    const tr = tray(.4, .26); this.put(g, tr, 0, y0, -.02, .12);
    const tp = teapot("#2f6f73", 1.1); this.put(g, tp, -.07, y0 + .012, -.03, .6); this.teapotNode = tp; this.hot.push({kind: "teapot", node: tp, r: .16, off: [0, .12, 0]});
    for (const [x, z, col] of [[.1, .02, "#f4efe6"], [.1, -.09, "#f4efe6"]]) { const cup = teacup(col); this.put(g, cup, x, y0 + .012, z, .4); this.steamers.push({node: cup, off: [0, .07, 0], rate: .55}); }
    this.put(g, sugarBowl(), .0, y0 + .012, .06, 0);
    const sp = spoon(); this.put(g, sp, .15, y0 + .02, .08, .5);
    this.steamers.push({node: tp, off: [.17 * 1.1 * Math.cos(.6) * 1, .15, -.17 * 1.1 * Math.sin(.6)], rate: .8, tp: 1});
    const pl = plate(.1); this.put(g, pl, .2, y0, .26, 0); this.put(g, cookies(R, 5), .2, y0 + .017, .26, 0);
    const mg = mug("#e7dccb"); this.put(g, mg, -.23, y0, .2, 2.4); this.steamers.push({node: mg, off: [0, .1, 0], rate: .7});
    const bv = vase(.12, .035, MAT.ceramic("#e8e0d2")); this.put(g, bv, -.28, y0, -.2); this.put(g, flowers(R, 3, .02, .13, [["#f7b0c6", "#ffe0ea", "#e8a23a"], ["#fff6d8", "#ffffff", "#e8a23a"]], false), -.28, y0 + .11, -.2);
    const bs = bookStack(2, 66, {w: .2}); this.put(g, nodeOf(bs.geo, MAT.vc), .2, y0, -.24, .5); const c = candle(.07, .02); this.put(g, c, .2, y0 + bs.height, -.24); this.flames.push({node: c, off: c.flamePos, s: .9, fixed: true});
    const tl = floorLamp(); this.floorLamp = tl; tl.fixed = true; tl.p = [2.35, 0, -.35]; tl.r = [0, Math.PI, 0]; this.root.add(tl); this.lamps.push(tl);
  }
  buildExtras() {
    const R = _rng(21), root = this.root;
    /* floor plants */
    const big = grp([2.15, 0, -.6]); root.add(big); big.add(makePot(.19, .34, MAT.ceramic("#d9d1c2", {rough: .5}), "tall")); const pm = plantPalm(R, 11, .95, .2); pm.p = [0, .3, 0]; big.add(pm);
    const m2 = grp([1.95, 0, .75]); root.add(m2); m2.add(makePot(.15, .26, MAT.terra, "round")); const mo = plantMonstera(R, 8, 1.5); mo.p = [0, .24, 0]; m2.add(mo);
    const sn = grp([-2.25, 0, -.45]); root.add(sn); sn.add(makePot(.17, .3, MAT.ceramic("#2b2b2e", {rough: .5}), "tall")); const sk = plantSnake(R, 14, 1.9); sk.p = [0, .28, 0]; sn.add(sk);
    const fe = grp([-2.0, 0, .55]); root.add(fe); fe.add(makePot(.13, .2, MAT.basket, "round")); const ff = plantFern(R, 14, .5); ff.p = [0, .19, 0]; fe.add(ff);
    /* stool with book + mug at left */
    const stool = grp([-1.55, 0, .75]); root.add(stool); stool.add(nodeOf(G.lathe([[0, .42], [.19, .42], [.2, .44], [.19, .46], [0, .46]], 32), MAT.oak)); for (let i = 0; i < 3; i++) { const a = i / 3 * TAU; this.add(stool, G.tube([[Math.cos(a) * .12, .43, Math.sin(a) * .12], [Math.cos(a) * .19, 0, Math.sin(a) * .19]], .014, 8), MAT.oak); }
    const bs = bookStack(3, 31, {w: .24}); this.put(stool, nodeOf(bs.geo, MAT.vc), 0, .46, 0, .3); this.put(stool, potPlantCactus(R), .02, .46 + bs.height, 0);
    /* wall: sign + frames */
    const nm = this.storeName || "APK STORE";
    this.signTex = TX.woodSign(nm, "apps for everyone"); this.signMat = {tex: this.signTex, uv: [1, 1], rough: .55, spec: .3, env: .1};
    this.sign = this.add(root, G.rbox(1.5, .38, .035, .012, {uvMode: "norm"}), this.signMat, [this.RX - .32, 3.0, -.885]);
    /* sign: only the front face carries the text, so use a quad overlay */
    this.sign.mat = {tex: TX.wood("#7a4b27", "#4b2a12", 21, 256, 128), uv: [1.2, .5], rough: .55, spec: .3, env: .1};
    this.add(root, G.quad(1.44, .36), {tex: this.signTex, uv: [1, 1], rough: .55, spec: .3, env: .1}, [this.RX - .32, 3.0, -.8665]);
    const fr = [[1.0, 1.6, .38, .5, 0, "black"], [1.45, 1.78, .3, .22, 1, "oak"], [1.62, 1.42, .22, .3, 2, "brass"], [1.18, 1.3, .2, .2, 1, "black"]];
    fr.forEach(([x, y, w, h, k, key]) => { const f = frame(w, h, k, key); f.p = [x + .0, y, -.88]; root.add(f); });
  }
  buildDust() { this.dust = []; for (let i = 0; i < 70; i++) this.dust.push({p: [(Math.random() - .5) * 4.5, Math.random() * 2.4, -.7 + Math.random() * 2.4], v: [(Math.random() - .5) * .03, .01 + Math.random() * .02, (Math.random() - .5) * .02], s: .01 + Math.random() * .015, ph: Math.random() * 6}); this.dustSprites = this.dust.map(d => ({tex: this.dustTex, pos: d.p.slice(), w: d.s, h: d.s, col: [1, .95, .8], alpha: 0, add: true})); this.dustSprites.forEach(s => this.sprites.push(s)); this.steam = []; for (let i = 0; i < 30; i++) { const s = {tex: this.puffTex, pos: [0, -9, 0], w: .05, h: .05, col: [1, 1, 1], alpha: 0, add: false, life: Math.random() * 3, src: i % 5, vy: 0}; this.steam.push(s); this.sprites.push(s); } this.flameSprites = []; this.glowSprites = []; for (let i = 0; i < 12; i++) { const s = {tex: this.flameTex, pos: [0, -9, 0], w: .03, h: .06, col: [1, .8, .45], alpha: 0, add: true}; this.flameSprites.push(s); this.sprites.push(s); } for (let i = 0; i < 40; i++) { const s = {tex: this.glowTex, pos: [0, -9, 0], w: .1, h: .1, col: [1, .8, .4], alpha: 0, add: true}; this.glowSprites.push(s); this.sprites.push(s); } this.selGlow = {tex: this.glowTex, pos: [0, -9, 0], w: .5, h: .5, col: [1, .85, .55], alpha: 0, add: true}; this.sprites.push(this.selGlow); this.badgeSprites = []; }
  /* ---------------- interaction API ---------------- */
  setMode(m, instant) { this.target = m; this.modeFrom = JSON.parse(JSON.stringify(this.cur)); this.modeT = instant ? 1 : 0; if (instant) this.cur = JSON.parse(JSON.stringify(MODES[m])); this.mode = m; }
  preset(name, instant) {
    const asp = this.canvas.clientWidth / Math.max(1, this.canvas.clientHeight), f = Math.max(1, 1.5 / asp);
    const P = {overview: {t: [.0, 1.7, 0], d: 7.3 * f, yaw: -.1, pitch: .08}, rack: {t: [this.RX, 1.35, this.RZ], d: 3.9 * f, yaw: 0, pitch: .06}, table: {t: [1.3, .72, .1], d: 2.35 * Math.max(1, 1.1 / asp), yaw: .14, pitch: .3}, plants: {t: [1.9, 1.0, 0], d: 3.4 * f, yaw: -.35, pitch: .1}}[name];
    this.goal = {yaw: P.yaw, pitch: P.pitch, dist: P.d, target: P.t.slice()}; this.presetName = name; if (instant) { this.cam.yaw = P.yaw; this.cam.pitch = P.pitch; this.cam.dist = P.d; this.cam.target = P.t.slice(); }
  }
  tileWorld(T) { const m = T.pivot.world; return M4.pt(m, [0, .1, 0]); }
  select(id, focus = true) {
    this.sel = id; const T = this.tiles.find(t => t.app.id === id);
    if (T && focus) { this.root.update(null); const p = this.tileWorld(T); this.goal = {yaw: 0, pitch: .05, dist: Math.max(1.5, 1.7 / Math.min(1, this.canvas.clientWidth / Math.max(1, this.canvas.clientHeight)) * .9), target: [p[0], p[1] - .02, p[2]]}; this.presetName = null; }
  }
  setDim(fn) { this.tiles.forEach(t => t.dimT = fn(t.app) ? 0 : 1); }
  setBadges(fn) { this.badgeFn = fn; }
  ray(px, py) {
    const rect = this.canvas.getBoundingClientRect(), x = (px - rect.left) / rect.width * 2 - 1, y = 1 - (py - rect.top) / rect.height * 2, inv = M4.invert(this.r.vp || M4.ident());
    const a = M4.pt(inv, [x, y, -1]), pw = (m, v) => { const w = m[3] * v[0] + m[7] * v[1] + m[11] * v[2] + m[15], p = M4.pt(m, v); return [p[0] / w, p[1] / w, p[2] / w]; };
    const n0 = pw(inv, [x, y, -1]), f0 = pw(inv, [x, y, 1]); return {o: this.cam.eye, d: V.norm(V.sub(f0, n0))};
  }
  pickAt(px, py) {
    const {o, d} = this.ray(px, py); let best = null, bd = 1e9;
    const hit = (c, r) => { const oc = V.sub(o, c), b = V.dot(oc, d), cc = V.dot(oc, oc) - r * r, disc = b * b - cc; if (disc < 0) return null; const t = -b - Math.sqrt(disc); return t > 0 ? t : null; };
    for (const T of this.tiles) { const c = this.tileWorld(T), t = hit(c, .125); if (t !== null && t < bd) { bd = t; best = {kind: "app", id: T.app.id}; } }
    for (const h of this.hot) { const c = M4.pt(h.node.world, h.off), t = hit(c, h.r * .7); if (t !== null && t < bd) { bd = t; best = {kind: h.kind, hot: h}; } }
    return best;
  }
  bindInput() {
    const cv = this.canvas, ptr = new Map(); let moved = 0, pinch = 0;
    cv.addEventListener("pointerdown", e => { cv.setPointerCapture(e.pointerId); ptr.set(e.pointerId, {x: e.clientX, y: e.clientY}); moved = 0; this.lastInput = this.time; if (ptr.size === 2) { const [a, b] = [...ptr.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); } });
    cv.addEventListener("pointermove", e => {
      const p = ptr.get(e.pointerId);
      if (!p) { if (e.pointerType === "mouse") { const h = this.pickAt(e.clientX, e.clientY); const id = h && h.kind === "app" ? h.id : null; if (id !== this.hover) { this.hover = id; this.cb.hover(id, e.clientX, e.clientY); } cv.style.cursor = h ? "pointer" : "grab"; if (id) this.cb.hover(id, e.clientX, e.clientY); } return; }
      const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; moved += Math.abs(dx) + Math.abs(dy); this.lastInput = this.time;
      if (ptr.size === 1) { this.goal.yaw = clamp(this.goal.yaw - dx * .0045, -.9, .9); this.goal.pitch = clamp(this.goal.pitch + dy * .003, -.05, .6); this.presetName = this.presetName; }
      else if (ptr.size === 2) { const [a, b] = [...ptr.values()], d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch) this.goal.dist = clamp(this.goal.dist * pinch / d, 1.2, 8); pinch = d; }
    });
    const up = e => { const had = ptr.delete(e.pointerId); if (!had) return; if (ptr.size < 2) pinch = 0; if (moved < 6 && e.type === "pointerup") this.click(e.clientX, e.clientY); };
    cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
    cv.addEventListener("pointerleave", () => { if (this.hover) { this.hover = null; this.cb.hover(null); } });
    cv.addEventListener("wheel", e => { e.preventDefault(); this.goal.dist = clamp(this.goal.dist * Math.exp(e.deltaY * .0012), 1.2, 8); this.lastInput = this.time; }, {passive: false});
  }
  click(x, y) {
    const h = this.pickAt(x, y);
    if (h && h.kind === "app") this.cb.pick(h.id);
    else if (h) this.hotClick(h.hot); else this.cb.bg();
  }
  hotClick(h) {
    this.cb.hot(h.kind);
    if (h.kind === "teapot") { this.burst = 1; }
    if (h.kind === "globe") { (this.globes || []).forEach(g => g.spinBoost = 6); }
    if (h.kind === "lamp") this.lampsOn = !this.lampsOn;
    if (h.kind === "clock") { }
  }
  /* ---------------- per frame ---------------- */
  update(dt, time) {
    this.time = time;
    /* light mode */
    if (this.modeT < 1) { this.modeT = Math.min(1, this.modeT + dt / 1.4); }
    const A = this.modeFrom, B = MODES[this.target], t = smooth(this.modeT), c = this.cur;
    ["sunDir", "sunCol", "sky", "ground", "bg", "wall"].forEach(k => c[k] = lerpArr(A[k], B[k], t)); ["exposure", "lamps", "string"].forEach(k => c[k] = A[k] + (B[k] - A[k]) * t);
    const L = c.lamps * (this.lampMul === undefined ? 1 : this.lampMul);
    /* lamp lights */
    const pls = [];
    const flick = 1 + Math.sin(time * 9) * .02;
    for (const l of this.lamps) {
      const on = L; const em = [1.4 * on, .95 * on, .5 * on];
      if (l.shade) { l.shade.mat.emi = em; if (l.shade.mat.emi) l.shade.mat.emi = em; }
      if (l.bulb) l.bulb.mat.emi = [on * 2, on * 1.5, on * .8];
      const pos = l.lightPos ? M4.pt(l.world, l.lightPos) : M4.pt(l.world, [0, l.top ? l.top * .7 : .2, 0]);
      pls.push({pos, col: [2.2 * on * flick, 1.5 * on * flick, .75 * on * flick], rad: l.lightPos ? 3.6 : 1.6});
    }
    /* selection light */
    let selPos = null;
    for (const T of this.tiles) {
      const sel = T.app.id === this.sel, h = T.app.id === this.hover;
      T.sel += ((sel ? 1 : 0) - T.sel) * Math.min(1, dt * 7); T.hover += ((h ? 1 : 0) - T.hover) * Math.min(1, dt * 12);
      T.dim += ((T.dimT || 0) - T.dim) * Math.min(1, dt * 8);
      const s = T.sel, hv = T.hover;
      T.group.p[2] = .035 + .05 * hv + .1 * s; T.pivot.p[1] = .04 + .02 * s + Math.sin(time * 1.5 + T.ph) * .004 * s;
      T.pivot.r = [T.baseRot * (1 - s) * (1 - hv * .5), Math.sin(time * .8 + T.ph) * .16 * s, 0]; const sc = 1 + .1 * hv + .14 * s; T.pivot.s = [sc, sc, sc];
      const dm = 1 - T.dim * .65; T.capMat.color = [dm, dm, dm]; const bc = hex(T.app.color || "#888"); T.bodyMat.color = [bc[0] * dm, bc[1] * dm, bc[2] * dm]; T.capMat.emi = [.18 * s + .08 * hv, .15 * s + .06 * hv, .1 * s];
      T.plaque.visible = T.dim < .8;
      if (sel) { this.root.update(null); selPos = this.tileWorld(T); }
    }
    if (selPos) { pls.push({pos: [selPos[0] + .05, selPos[1] + .16, selPos[2] + .5], col: [1.7, 1.45, 1.1], rad: 1.4}); this.selGlow.pos = [selPos[0], selPos[1], selPos[2] - .05]; this.selGlow.w = this.selGlow.h = .62; this.selGlow.alpha = .35 * (this.cur.lamps > .3 ? 1.5 : .9); } else this.selGlow.alpha = 0;
    while (pls.length < 3) pls.push({pos: [0, -50, 0], col: [0, 0, 0], rad: 1});
    /* clock */
    const d = new Date(), sec = d.getSeconds() + d.getMilliseconds() / 1000, mn = d.getMinutes() + sec / 60, hr = d.getHours() % 12 + mn / 60;
    (this.clocks || []).forEach(cl => { cl.hands.s.r = [0, 0, -sec / 60 * TAU]; cl.hands.m.r = [0, 0, -mn / 60 * TAU]; cl.hands.h.r = [0, 0, -hr / 12 * TAU]; });
    (this.globes || []).forEach(g => { g.spinBoost = (g.spinBoost || 0) * Math.pow(.2, dt); g.spin.r = [0, (g.spin.r[1] || 0) + dt * (.25 + g.spinBoost), .41]; });
    /* string lights */
    if (this.bulbMesh) this.bulbMesh.forEach((n, i) => { const k = c.string * (.55 + .45 * Math.sin(time * 2 + this.bulbs[i].ph)); const col = this.bulbs[i].col; n.mat.emi = [col[0] * k * 2.2, col[1] * k * 2.2, col[2] * k * 2.2]; });
    /* window occluder follows the light */
    this.root.update(null);
    const Ld = V.norm(c.sunDir), ex = V.norm(V.cross([0, 1, 0], Ld)), ey = V.cross(Ld, ex), C0 = this.S.shadowCenter, P0 = [.1, 1.2, -.25], rel = V.sub(P0, C0);
    const hx = V.dot(rel, ex), hy = V.dot(rel, ey), org = V.add(C0, V.mul(Ld, 9)); const bas = [ex, ey, Ld];
    this.occ.custom = out => { out.fill(0); out[0] = ex[0]; out[1] = ex[1]; out[2] = ex[2]; out[4] = ey[0]; out[5] = ey[1]; out[6] = ey[2]; out[8] = Ld[0]; out[9] = Ld[1]; out[10] = Ld[2]; out[12] = org[0] + ex[0] * hx + ey[0] * hy; out[13] = org[1] + ex[1] * hx + ey[1] * hy; out[14] = org[2] + ex[2] * hx + ey[2] * hy; out[15] = 1; };
    /* sprites: dust, steam, flames, glows */
    this.updateSprites(dt, time, c);
    /* camera */
    const k = 1 - Math.exp(-dt * 5), cam = this.cam, g = this.goal;
    const idle = time - this.lastInput > 4 && !this.sel;
    const sway = idle ? Math.sin(time * .25) * .05 : 0;
    cam.yaw += (g.yaw + sway - cam.yaw) * k; cam.pitch += (g.pitch - cam.pitch) * k; cam.dist += (g.dist - cam.dist) * k; for (let i = 0; i < 3; i++) cam.target[i] += (g.target[i] - cam.target[i]) * k;
    const cp = Math.cos(cam.pitch); cam.eye = [cam.target[0] + Math.sin(cam.yaw) * cp * cam.dist, Math.max(.25, cam.target[1] + Math.sin(cam.pitch) * cam.dist), cam.target[2] + Math.cos(cam.yaw) * cp * cam.dist];
    const light = {sunDir: c.sunDir, sunCol: c.sunCol, sky: c.sky, ground: c.ground, exposure: c.exposure, bg: c.bg, pl: pls};
    this.S.light = light; this.wallMat.color = c.wall;
    this.r.render(this.S, cam, time);
  }
  updateSprites(dt, time, c) {
    const night = 1 - clamp(c.sky[2] * 1.3, 0, 1) * .0, lamps = c.lamps;
    /* dust motes catch light */
    this.dust.forEach((d, i) => { d.p[0] += d.v[0] * dt + Math.sin(time * .3 + d.ph) * .0006; d.p[1] += d.v[1] * dt; d.p[2] += d.v[2] * dt; if (d.p[1] > 2.6) d.p[1] = .1; const s = this.dustSprites[i]; s.pos = d.p; s.alpha = .22 * (.5 + .5 * Math.sin(time * .8 + d.ph)) * (c.exposure < 1.2 ? 1 : .35); s.col = c.sunCol.map(v => Math.min(1, v / 3)); });
    /* steam */
    const em = this.steamers; this.steam.forEach((s, i) => {
      const src = em[s.src % em.length]; if (!src) return;
      s.life += dt * (.45 + src.rate * .4); if (this.burst > 0 && src.tp) s.life += dt * 1.2;
      if (s.life >= 1) { s.life = 0; const w = M4.pt(src.node.world, src.off); s.base = w; s.dx = (Math.random() - .5) * .02; s.seed = Math.random() * 6; }
      if (!s.base) { s.alpha = 0; return; }
      const t = s.life, rise = t * .28; s.pos = [s.base[0] + Math.sin(time * 1.5 + s.seed + t * 4) * .012 * t + s.dx * t * 8, s.base[1] + rise, s.base[2] + Math.cos(time * 1.2 + s.seed) * .008 * t]; const sz = .04 + t * .1; s.w = sz; s.h = sz; s.alpha = Math.sin(Math.PI * t) * .2 * (c.exposure > 1.2 ? 1.3 : 1); s.col = [1, .98, .94];
    });
    if (this.burst > 0) this.burst = Math.max(0, this.burst - dt * .5);
    /* candle flames */
    this.flameSprites.forEach((s, i) => { const f = this.flames[i]; if (!f) { s.alpha = 0; return; } const w = M4.pt(f.node.world, f.off); const fl = 1 + Math.sin(time * 11 + i * 3) * .1 + Math.sin(time * 17 + i) * .06; s.pos = [w[0], w[1] + .012, w[2]]; s.w = .02 * f.s * fl; s.h = .045 * f.s * fl; s.alpha = .55 + .35 * Math.min(1, lamps + c.string * .3); });
    /* glows around lamps and string lights */
    let gi = 0; const gs = this.glowSprites;
    for (const l of this.lamps) { const s = gs[gi++]; const pos = l.lightPos ? M4.pt(l.world, l.lightPos) : M4.pt(l.world, [0, l.top ? l.top * .65 : .2, 0]); s.pos = pos; s.w = s.h = l.lightPos ? .9 : .5; s.col = [1, .78, .42]; s.alpha = .28 * lamps; }
    if (this.bulbMesh) this.bulbMesh.forEach((n, i) => { const s = gs[gi++]; if (!s) return; const w = M4.pt(n.world, [0, 0, 0.0]); s.pos = [w[0], w[1], w[2] + .01]; s.w = s.h = .09; const col = this.bulbs[i].col; s.col = col; s.alpha = .22 * c.string * (.6 + .4 * Math.sin(time * 2 + this.bulbs[i].ph)); });
    for (; gi < gs.length; gi++) gs[gi].alpha = 0;
  }
}
function potPlantCactus(R) { const n = grp(); n.add(makePot(.045, .06, MAT.terra, "round")); const c = cactus(R, .13); c.p = [0, .055, 0]; n.add(c); return n; }

/* ============================================================
   Store UI: state, i18n, details panel, list view, install flow
   ============================================================ */
"use strict";
const I18N = {
  en: {shelf: "Shelf", list: "All apps", search: "Search apps…", all: "All", hint: "Drag to look around · scroll to zoom · click an app", install: "Install", update: "Update", open: "Installed ✓", downloading: "Downloading…", about: "About this app", whatsNew: "What's new", reviews: "Ratings & reviews", perms: "Permissions", similar: "Similar apps", info: "App info", version: "Version", size: "Size", android: "Requires", updated: "Updated", package: "Package", category: "Category", developer: "Developer", downloads: "Downloads", price: "Price", free: "Free", share: "Share", copied: "Link copied", wish: "Added to wishlist", unwish: "Removed from wishlist", writeRev: "Write a review", yourName: "Your name", yourRev: "Share your experience…", submit: "Submit", thanks: "Thanks for your review!", noRev: "No reviews yet — be the first.", sortPop: "Most popular", sortTop: "Top rated", sortNew: "Newest", sortAz: "A–Z", wishlist: "♥ Wishlist", installed: "Installed", none: "No apps found.", featured: "Featured", newb: "New", upd: "Update available", presets: {overview: "Room", rack: "Shelf", table: "Tea table", plants: "Plants"}, installedToast: "Installed! (APK download started)", previewToast: "Preview only — the real site downloads the APK.", teapot: "☕ Chai ready!", globe: "🌍 Spinning the globe", clock: "🕰 Tick tock", lamp: "💡 Lamp", noGl: "Your browser doesn't support WebGL2 — showing the list view.", more: "More", less: "Less", rate: "Your rating", ratings: "ratings", empty: "Empty", reviewsBy: "reviews"},
  bn: {shelf: "তাক", list: "সব অ্যাপ", search: "অ্যাপ খুঁজুন…", all: "সব", hint: "ঘোরাতে ড্র্যাগ করুন · জুম করতে স্ক্রল · অ্যাপে ক্লিক করুন", install: "ইনস্টল", update: "আপডেট", open: "ইনস্টল করা ✓", downloading: "ডাউনলোড হচ্ছে…", about: "অ্যাপ সম্পর্কে", whatsNew: "নতুন কী", reviews: "রেটিং ও রিভিউ", perms: "পারমিশন", similar: "অনুরূপ অ্যাপ", info: "অ্যাপের তথ্য", version: "ভার্সন", size: "সাইজ", android: "প্রয়োজন", updated: "আপডেট", package: "প্যাকেজ", category: "ক্যাটাগরি", developer: "ডেভেলপার", downloads: "ডাউনলোড", price: "মূল্য", free: "ফ্রি", share: "শেয়ার", copied: "লিংক কপি হয়েছে", wish: "উইশলিস্টে যোগ হয়েছে", unwish: "উইশলিস্ট থেকে সরানো হয়েছে", writeRev: "রিভিউ লিখুন", yourName: "আপনার নাম", yourRev: "আপনার অভিজ্ঞতা লিখুন…", submit: "জমা দিন", thanks: "ধন্যবাদ!", noRev: "এখনো কোনো রিভিউ নেই।", sortPop: "জনপ্রিয়", sortTop: "সেরা রেটিং", sortNew: "নতুন", sortAz: "A–Z", wishlist: "♥ উইশলিস্ট", installed: "ইনস্টল করা", none: "কোনো অ্যাপ পাওয়া যায়নি।", featured: "ফিচার্ড", newb: "নতুন", upd: "আপডেট আছে", presets: {overview: "ঘর", rack: "তাক", table: "চায়ের টেবিল", plants: "গাছ"}, installedToast: "ইনস্টল হয়েছে! (APK ডাউনলোড শুরু)", previewToast: "এটি প্রিভিউ — আসল সাইটে APK ডাউনলোড হবে।", teapot: "☕ চা তৈরি!", globe: "🌍 গ্লোব ঘুরছে", clock: "🕰 টিক টক", lamp: "💡 ল্যাম্প", noGl: "আপনার ব্রাউজারে WebGL2 নেই — লিস্ট ভিউ দেখানো হচ্ছে।", more: "আরও", less: "কম", rate: "আপনার রেটিং", ratings: "রেটিং", empty: "খালি", reviewsBy: "রিভিউ"}
};
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
const LS = {get(k, d) { try { const v = localStorage.getItem("apkstore." + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem("apkstore." + k, JSON.stringify(v)); } catch (e) {} }};

class Store {
  constructor(data) {
    this.D = data; this.apps = (data.apps || []).map((a, i) => Object.assign({developer: data.developer || "", featured: false, permissions: [], reviews: [], ratingCount: 0}, a, {_i: i}));
    this.lang = LS.get("lang", /^bn/i.test(navigator.language) ? "bn" : "en"); this.q = ""; this.cat = "all"; this.sort = "pop"; this.fWish = false; this.fInst = false; this.view = "shelf";
    this.wish = LS.get("wish", []); this.inst = LS.get("inst", {}); this.myRev = LS.get("rev", {}); this.sel = null; this.soundOn = LS.get("snd", true);
    this.mode = LS.get("mode", null) || this.autoMode();
    this.init();
  }
  t(k) { return I18N[this.lang][k] != null ? I18N[this.lang][k] : I18N.en[k]; }
  autoMode() { const h = new Date().getHours(); return h >= 6 && h < 17 ? "day" : h < 19 ? "evening" : "night"; }
  num(s) { const m = String(s || "0").replace(/,/g, "").match(/([\d.]+)\s*([KMB]?)/i); if (!m) return 0; return parseFloat(m[1]) * ({K: 1e3, M: 1e6, B: 1e9}[m[2].toUpperCase()] || 1); }
  isNew(a) { return a.updated && (Date.now() - new Date(a.updated).getTime()) < 30 * 864e5; }
  filtered() {
    const q = this.q.trim().toLowerCase();
    let r = this.apps.filter(a => (this.cat === "all" || a.category === this.cat) && (!q || [a.name, a.tagline, a.category, a.developer, a.description].join(" ").toLowerCase().includes(q)) && (!this.fWish || this.wish.includes(a.id)) && (!this.fInst || this.inst[a.id]));
    const S = {pop: (a, b) => this.num(b.downloads) - this.num(a.downloads), top: (a, b) => (b.rating || 0) - (a.rating || 0), new: (a, b) => String(b.updated).localeCompare(String(a.updated)), az: (a, b) => a.name.localeCompare(b.name)};
    return r.sort(S[this.sort] || S.pop);
  }
  /* ---------- init ---------- */
  init() {
    document.title = this.D.storeName || "APK Store"; $("#storeName").textContent = this.D.storeName || "APK Store";
    this.bindUI(); this.applyLang(); this.setMode(this.mode, true);
    this.canGL = !!document.createElement("canvas").getContext("webgl2");
    const boot = () => { const b = $("#boot"); b.style.opacity = 0; setTimeout(() => b.remove(), 900); };
    const fonts = document.fonts && document.fonts.load ? Promise.race([Promise.all([document.fonts.load('700 30px "DM Sans"'), document.fonts.load('700 30px "Noto Sans Bengali"')]), new Promise(r => setTimeout(r, 1800))]) : Promise.resolve();
    fonts.then(() => {
      if (this.canGL) {
        try { this.makeRoom(); } catch (e) { console.error(e); this.canGL = false; }
      }
      if (!this.canGL) { this.showView("list"); $("#viewSeg").style.display = "none"; $("#presets").style.display = "none"; $("#hint").remove(); this.toast(this.t("noGl"), 4000); }
      this.refresh(); boot();
      const id = decodeURIComponent((location.hash.match(/app=([^&]+)/) || [])[1] || ""); if (id && this.apps.find(a => a.id === id)) setTimeout(() => this.open(id), 600);
    });
  }
  makeRoom() {
    const mobile = matchMedia("(max-width:720px)").matches || /Mobi|Android/i.test(navigator.userAgent);
    const room = this.room = new Room($("#c"), {mobile, storeName: (this.D.storeName || "APK Store").toUpperCase()});
    room.cb.pick = (id) => { this.open(id); this.sfx("pick"); };
    room.cb.bg = () => { if (this.sel) this.close(); };
    room.cb.hot = (k) => { this.toast(this.t(k)); this.sfx(k); };
    room.cb.hover = (id, x, y) => { const tip = $("#tip"); if (!id) { tip.style.opacity = 0; return; } const a = this.apps.find(z => z.id === id); if (!a) return; tip.innerHTML = esc(a.name) + "<small>" + esc(a.category) + " · ★ " + esc(a.rating) + "</small>"; tip.style.left = x + "px"; tip.style.top = y + "px"; tip.style.opacity = 1; if (this._hv !== id) { this._hv = id; this.sfx("tick"); } };
    room.buildApps(this.apps); room.setMode(this.mode, true);
    let t0 = performance.now(), last = t0; const loop = (now) => { const dt = Math.min(.05, (now - last) / 1000); last = now; if (!document.hidden && this.view === "shelf") room.update(dt, (now - t0) / 1000); requestAnimationFrame(loop); }; requestAnimationFrame(loop);
    $("#presets").innerHTML = ["overview", "rack", "table", "plants"].map(k => `<button data-p="${k}">${esc(this.t("presets")[k])}</button>`).join("");
    $$("#presets button").forEach(b => b.onclick = () => { if (this.sel) this.close(); room.preset(b.dataset.p); room.lastInput = performance.now() / 1000; this.markPreset(b.dataset.p); this.sfx("tick"); });
    this.markPreset("overview");
    setTimeout(() => { const h = $("#hint"); if (h) h.style.opacity = 0; }, 7000);
  }
  markPreset(n) { $$("#presets button").forEach(b => b.classList.toggle("on", b.dataset.p === n)); }
  /* ---------- UI bindings ---------- */
  bindUI() {
    $("#q").oninput = (e) => { this.q = e.target.value; this.refresh(); this.suggest(); };
    $("#q").onfocus = () => this.suggest(); $("#q").onblur = () => setTimeout(() => $("#sugg").style.display = "none", 160);
    $("#q").onkeydown = (e) => { if (e.key === "Enter") { const f = this.filtered(); if (f[0]) { this.open(f[0].id); $("#q").blur(); } } };
    $$("#viewSeg button").forEach(b => b.onclick = () => this.showView(b.dataset.v));
    $$("#modeSeg button").forEach(b => b.onclick = () => this.setMode(b.dataset.m));
    $("#lang").onclick = () => { this.lang = this.lang === "en" ? "bn" : "en"; LS.set("lang", this.lang); this.applyLang(); this.refresh(); if (this.sel) this.renderPanel(); this.sfx("tick"); };
    $("#snd").onclick = () => { this.soundOn = !this.soundOn; LS.set("snd", this.soundOn); $("#snd").textContent = this.soundOn ? "🔊" : "🔇"; this.sfx("tick"); };
    $("#snd").textContent = this.soundOn ? "🔊" : "🔇";
    $("#pclose").onclick = () => this.close();
    $("#sort").onchange = (e) => { this.sort = e.target.value; this.refresh(); };
    $("#fWish").onclick = () => { this.fWish = !this.fWish; this.refresh(); }; $("#fInst").onclick = () => { this.fInst = !this.fInst; this.refresh(); };
    $("#lb").onclick = () => $("#lb").classList.remove("show");
    addEventListener("keydown", (e) => { if (e.key === "Escape") { $("#lb").classList.remove("show"); if (this.sel) this.close(); } });
  }
  applyLang() {
    document.documentElement.lang = this.lang; $("#q").placeholder = this.t("search");
    $$("[data-t]").forEach(el => el.textContent = this.t(el.dataset.t)); $("#lang").textContent = this.lang === "en" ? "বা" : "EN";
    $("#sort").innerHTML = [["pop", "sortPop"], ["top", "sortTop"], ["new", "sortNew"], ["az", "sortAz"]].map(([v, k]) => `<option value="${v}" ${this.sort === v ? "selected" : ""}>${esc(this.t(k))}</option>`).join("");
    $("#fWish").textContent = this.t("wishlist"); $("#fInst").textContent = this.t("installed");
    if (this.room) $$("#presets button").forEach(b => b.textContent = this.t("presets")[b.dataset.p]);
  }
  setMode(m, quiet) { this.mode = m; LS.set("mode", m); document.body.classList.remove("day", "evening", "night"); document.body.classList.add(m); $$("#modeSeg button").forEach(b => b.classList.toggle("on", b.dataset.m === m)); if (this.room) this.room.setMode(m); if (!quiet) this.sfx("tick"); }
  showView(v) { this.view = v; $$("#viewSeg button").forEach(b => b.classList.toggle("on", b.dataset.v === v)); $("#list").classList.toggle("show", v === "list"); if (v === "list" && this.sel) { /* keep panel */ } }
  refresh() {
    const cats = ["all", ...new Set(this.apps.map(a => a.category).filter(Boolean))];
    $("#chips").innerHTML = cats.map(c => `<button class="chip ${this.cat === c ? "on" : ""}" data-c="${esc(c)}">${esc(c === "all" ? this.t("all") : c)}</button>`).join("");
    $$("#chips .chip").forEach(b => b.onclick = () => { this.cat = b.dataset.c; this.refresh(); this.sfx("tick"); });
    $("#fWish").classList.toggle("on", this.fWish); $("#fInst").classList.toggle("on", this.fInst);
    const f = this.filtered(), ids = new Set(f.map(a => a.id));
    if (this.room) this.room.setDim(a => ids.has(a.id));
    $("#grid").innerHTML = f.length ? f.map(a => `<button class="card glass" data-id="${esc(a.id)}"><img src="${esc(a.icon)}" alt="" loading="lazy"><div><b>${esc(a.name)}</b><span>${esc(a.category)} · ${esc(a.size)}</span><span>★ ${esc(a.rating)} · ${esc(a.downloads)}</span>${this.inst[a.id] ? `<span style="color:var(--acc);font-weight:700">${esc(this.t("installed"))}</span>` : ""}</div></button>`).join("") : `<div class="empty">${esc(this.t("none"))}</div>`;
    $$("#grid .card").forEach(c => c.onclick = () => this.open(c.dataset.id));
  }
  suggest() {
    const q = this.q.trim().toLowerCase(), box = $("#sugg"); if (!q) { box.style.display = "none"; return; }
    const f = this.filtered().slice(0, 5); box.innerHTML = f.map(a => `<button data-id="${esc(a.id)}"><img src="${esc(a.icon)}" alt=""><span><b>${esc(a.name)}</b><br><small style="color:var(--mut)">${esc(a.category)}</small></span></button>`).join("");
    box.style.display = f.length ? "block" : "none"; $$("#sugg button").forEach(b => b.onmousedown = (e) => { e.preventDefault(); this.open(b.dataset.id); box.style.display = "none"; });
  }
  /* ---------- details ---------- */
  open(id) {
    const a = this.apps.find(x => x.id === id); if (!a) return; this.sel = id; this.expanded = false;
    if (this.room) { this.room.select(id, this.view === "shelf"); this.markPreset(null); if (innerWidth > 720 && this.view === "shelf") this.room.goal.target[0] += this.room.goal.dist * .21; if (innerWidth <= 720 && this.view === "shelf") this.room.goal.target[1] -= this.room.goal.dist * .2; }
    this.renderPanel(); $("#panel").classList.add("open"); try { history.replaceState(null, "", "#app=" + encodeURIComponent(id)); } catch (e) {}
  }
  close() { this.sel = null; $("#panel").classList.remove("open"); if (this.room) { this.room.select(null, false); this.room.preset("overview"); this.markPreset("overview"); } try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {} }
  reviewsOf(a) { return [...(this.myRev[a.id] || []), ...(a.reviews || [])]; }
  stars(n) { n = Math.round(n); return "★".repeat(n) + "☆".repeat(5 - n); }
  state(a) { const v = this.inst[a.id]; return !v ? "install" : v !== a.version ? "update" : "done"; }
  renderPanel() {
    const a = this.apps.find(x => x.id === this.sel); if (!a) return; const T = (k) => esc(this.t(k)), revs = this.reviewsOf(a);
    const cnt = a.ratingCount || revs.length || 0, avg = revs.length && !a.rating ? revs.reduce((s, r) => s + r.rating, 0) / revs.length : a.rating || 0;
    const dist = [5, 4, 3, 2, 1].map(s => { if (revs.length >= 3) return revs.filter(r => Math.round(r.rating) === s).length / revs.length; const d = Math.abs(s - avg); return Math.max(.03, Math.exp(-d * d / 1.2)) / 1.9 * (s === 5 ? 1.2 : 1); });
    const tot = Math.max(...dist, .01);
    const sims = this.apps.filter(x => x.id !== a.id).sort((x, y) => (y.category === a.category) - (x.category === a.category)).slice(0, 8);
    const desc = String(a.description || ""), long = desc.length > 220;
    $("#pbody").innerHTML = `
    <div class="phead"><img src="${esc(a.icon)}" alt=""><div><h2>${esc(a.name)}</h2><div class="dev">${esc(a.developer)}</div><div class="tg">${esc(a.tagline)}</div></div></div>
    <div class="badges" style="margin-top:14px">${a.featured ? `<span class="badge o">★ ${T("featured")}</span>` : ""}${this.isNew(a) ? `<span class="badge g">${T("newb")}</span>` : ""}${this.state(a) === "update" ? `<span class="badge o">${T("upd")}</span>` : ""}<span class="badge">${esc(a.category)}</span></div>
    <div class="stats"><div><b>${esc(a.rating)} ★</b><span>${cnt ? esc(cnt) + " " + T("ratings") : esc(a.android)}</span></div><div><b>${esc(a.size)}</b><span>${T("size")}</span></div><div><b>${esc(a.downloads)}</b><span>${T("downloads")}</span></div><div><b>v${esc(a.version)}</b><span>${T("version")}</span></div></div>
    ${(a.screenshots || []).length ? `<div class="shots">${a.screenshots.map(s => `<img src="${esc(s)}" alt="" loading="lazy">`).join("")}</div>` : ""}
    <div class="sec"><h3>${T("about")}</h3><p id="desc">${esc(long ? desc.slice(0, 220) + "…" : desc)}</p>${long ? `<button class="more" id="moreBtn">${T("more")}</button>` : ""}</div>
    ${(a.whatsNew || []).length ? `<div class="sec"><h3>${T("whatsNew")}</h3><ul>${a.whatsNew.map(w => `<li>${esc(w)}</li>`).join("")}</ul></div>` : ""}
    <div class="sec"><h3>${T("reviews")}</h3>
      <div class="rate"><div><div class="big">${avg ? Number(avg).toFixed(1) : "–"}</div><div class="stars">${this.stars(avg)}</div></div><div class="bars">${[5, 4, 3, 2, 1].map((s, i) => `<div>${s}<i><u style="width:${(dist[i] / tot * 100).toFixed(0)}%"></u></i></div>`).join("")}</div></div>
      ${revs.length ? revs.map(r => `<div class="rev"><div class="h">${esc(r.name || "User")}<span>${esc(r.date || "")}</span></div><div class="stars">${this.stars(r.rating)}</div><p>${esc(r.text)}</p></div>`).join("") : `<p style="margin-top:10px;color:var(--mut)">${T("noRev")}</p>`}
      <div class="write sec"><h3>${T("writeRev")}</h3><div class="starpick" id="sp">${[1, 2, 3, 4, 5].map(i => `<button data-s="${i}">★</button>`).join("")}</div><input id="rn" placeholder="${T("yourName")}" maxlength="30"><textarea id="rt" rows="3" placeholder="${T("yourRev")}" maxlength="400"></textarea><button class="btn main" id="rs" style="margin-top:8px">${T("submit")}</button></div>
    </div>
    ${(a.permissions || []).length ? `<div class="sec"><h3>${T("perms")}</h3>${a.permissions.map(p => `<span class="perm">${esc(p)}</span>`).join("")}</div>` : ""}
    <div class="sec"><h3>${T("info")}</h3><table class="info">${[["version", a.version], ["size", a.size], ["android", a.android], ["updated", a.updated], ["category", a.category], ["developer", a.developer], ["package", a.package], ["price", a.price === "Free" ? this.t("free") : a.price]].filter(r => r[1]).map(r => `<tr><td>${T(r[0])}</td><td>${esc(r[1])}</td></tr>`).join("")}</table></div>
    ${sims.length ? `<div class="sec"><h3>${T("similar")}</h3><div class="sim">${sims.map(s => `<button data-id="${esc(s.id)}"><img src="${esc(s.icon)}" alt="">${esc(s.name)}</button>`).join("")}</div></div>` : ""}`;
    const mb = $("#moreBtn"); if (mb) mb.onclick = () => { this.expanded = !this.expanded; $("#desc").textContent = this.expanded ? desc : desc.slice(0, 220) + "…"; mb.textContent = this.t(this.expanded ? "less" : "more"); };
    $$("#pbody .shots img").forEach(i => i.onclick = () => { $("#lb img").src = i.src; $("#lb").classList.add("show"); });
    $$("#pbody .sim button").forEach(b => b.onclick = () => this.open(b.dataset.id));
    let rating = 0; $$("#sp button").forEach(b => b.onclick = () => { rating = +b.dataset.s; $$("#sp button").forEach(x => x.classList.toggle("on", +x.dataset.s <= rating)); });
    $("#rs").onclick = () => { const text = $("#rt").value.trim(); if (!rating || !text) return; const list = this.myRev[a.id] || []; list.unshift({name: $("#rn").value.trim() || "You", rating, text, date: new Date().toISOString().slice(0, 10)}); this.myRev[a.id] = list; LS.set("rev", this.myRev); this.toast(this.t("thanks")); this.renderPanel(); this.sfx("ok"); };
    this.renderBar(a);
  }
  renderBar(a) {
    const s = this.state(a), w = this.wish.includes(a.id), label = s === "install" ? this.t("install") + (a.price && a.price !== "Free" ? " · " + a.price : "") : s === "update" ? this.t("update") : this.t("open");
    $("#bar").innerHTML = `<button class="sq ${w ? "on" : ""}" id="bw" title="Wishlist">${w ? "♥" : "♡"}</button><button class="inst ${s === "done" ? "done" : ""}" id="bi"><i></i><span>${esc(label)}</span></button><button class="sq" id="bs" title="${esc(this.t("share"))}">⤴</button>`;
    $("#bw").onclick = () => { const i = this.wish.indexOf(a.id); if (i < 0) { this.wish.push(a.id); this.toast(this.t("wish")); } else { this.wish.splice(i, 1); this.toast(this.t("unwish")); } LS.set("wish", this.wish); this.renderBar(a); this.refresh(); this.sfx("tick"); };
    $("#bs").onclick = async () => { const url = location.origin + location.pathname + "#app=" + encodeURIComponent(a.id); try { if (navigator.share) { await navigator.share({title: a.name, text: a.tagline, url}); return; } } catch (e) { return; } try { await navigator.clipboard.writeText(url); } catch (e) {} this.toast(this.t("copied")); };
    $("#bi").onclick = () => this.install(a);
  }
  install(a) {
    const st = this.state(a); if (st === "done") { this.toast(this.t("open")); return; }
    const btn = $("#bi"), bar = $("i", btn), span = $("span", btn); span.textContent = this.t("downloading"); btn.disabled = true; this.sfx("dl");
    let p = 0; const iv = setInterval(() => { p += 4 + Math.random() * 9; bar.style.width = Math.min(100, p) + "%"; if (p >= 100) { clearInterval(iv); this.finishInstall(a); } }, 90);
  }
  finishInstall(a) {
    if (!window.__PREVIEW) { const l = document.createElement("a"); l.href = a.apk; l.download = (a.name || "app").replace(/\s+/g, "-") + ".apk"; document.body.appendChild(l); l.click(); l.remove(); }
    this.inst[a.id] = a.version; LS.set("inst", this.inst); this.toast(window.__PREVIEW ? this.t("previewToast") : this.t("installedToast"), 3200); this.sfx("ok"); this.renderBar(a); this.refresh(); if (this.sel === a.id) this.renderPanel();
  }
  toast(msg, ms = 2000) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(this._tt); this._tt = setTimeout(() => t.classList.remove("show"), ms); }
  /* ---------- sound (synthesised, no files) ---------- */
  sfx(kind) {
    if (!this.soundOn) return; try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; const c = this.ac = this.ac || new AC(); if (c.state === "suspended") c.resume();
      const tone = (f, d, type = "sine", v = .05, at = 0, f2) => { const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, c.currentTime + at); if (f2) o.frequency.exponentialRampToValueAtTime(f2, c.currentTime + at + d); g.gain.setValueAtTime(0, c.currentTime + at); g.gain.linearRampToValueAtTime(v, c.currentTime + at + .01); g.gain.exponentialRampToValueAtTime(.0001, c.currentTime + at + d); o.connect(g).connect(c.destination); o.start(c.currentTime + at); o.stop(c.currentTime + at + d + .05); };
      if (kind === "tick") tone(900, .05, "triangle", .025);
      else if (kind === "pick") { tone(330, .18, "sine", .06, 0, 520); tone(660, .22, "sine", .04, .06); }
      else if (kind === "ok") { tone(523, .14, "sine", .06); tone(659, .14, "sine", .06, .09); tone(784, .26, "sine", .06, .18); }
      else if (kind === "dl") tone(300, .7, "sawtooth", .02, 0, 900);
      else if (kind === "teapot") { tone(1200, .5, "sine", .03, 0, 700); tone(900, .5, "sine", .02, .1, 500); }
      else if (kind === "globe") tone(200, .6, "triangle", .04, 0, 420);
      else if (kind === "clock") { tone(1500, .04, "square", .02); tone(1200, .04, "square", .02, .25); }
      else tone(500, .1, "sine", .04);
    } catch (e) {}
  }
}
window.addEventListener("load", () => {
  const start = (d) => { window.store = new Store(d); };
  if (window.__DATA) start(window.__DATA); else fetch("apps.json").then(r => r.json()).then(start).catch(e => { document.body.insertAdjacentHTML("beforeend", "<p style='position:fixed;inset:40% 0 0;text-align:center;color:#fff'>Could not load apps.json</p>"); console.error(e); });
});
