/* Lanyard, 3D renderer (Three.js, self-hosted in js/vendor). lanyard.js owns the physics and the pointer input;
   this file only draws: a glossy plastic badge with thickness (front + back textures painted on canvases),
   a metal clasp and ring, a printed strap that twists with the card, and a soft shadow on the page behind.
   World units are CSS pixels: the camera's frustum is fitted so the z = 0 plane lines up with the page,
   with the vanishing point kept on the badge (like CSS perspective on the card). */
import * as THREE from "./vendor/three.module.min.js";
import { RoomEnvironment } from "./vendor/RoomEnvironment.js";

const STRAP_TEXT = "ELKAN TONG  ✦  @ELKANTONGG  ✦  ";
const D = 1100; // camera distance = perspective strength

const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/* ---------------------------------------------------------------- textures */
function paintFace(back, tw, th, img) {
  const c = document.createElement("canvas");
  c.width = tw; c.height = th;
  const g = c.getContext("2d");
  // the holder rim seen through clear plastic, and the slot the ring goes through
  rr(g, 0, 0, tw, th, tw * 0.07);
  const rim = g.createLinearGradient(0, 0, tw, th);
  rim.addColorStop(0, "#2a2a31"); rim.addColorStop(0.6, "#111114");
  g.fillStyle = rim; g.fill();
  rr(g, tw * 0.38, th * 0.036, tw * 0.24, th * 0.026, th);
  g.fillStyle = "#050506"; g.fill();

  // the printed card inside
  const x0 = tw * 0.046, y0 = tw * 0.11, cw = tw - 2 * x0, ch = th - y0 - tw * 0.046;
  const u = cw / 100, pad = 6.5 * u, X = x0 + pad, R = x0 + cw - pad, B = y0 + ch - 5 * u;
  g.save();
  rr(g, x0, y0, cw, ch, cw * 0.035); g.clip();
  const paper = g.createRadialGradient(back ? x0 + cw : x0, y0, 0, back ? x0 + cw : x0, y0, cw * 1.4);
  if (back) { paper.addColorStop(0, "#1f1f25"); paper.addColorStop(0.7, "#111114"); }
  else { paper.addColorStop(0, "#f8f4eb"); paper.addColorStop(0.7, "#e9e3d5"); }
  g.fillStyle = paper; g.fillRect(x0, y0, cw, ch);
  const ink = back ? "#f3f3f1" : "#121214";
  g.textBaseline = "alphabetic";

  const spaced = (txt, x, y, em, align = "left") => {
    g.letterSpacing = `${em}px`;
    g.textAlign = align;
    g.fillText(txt, x, y);
    g.letterSpacing = "0px";
  };

  // top row
  let y = y0 + pad + 3.6 * u;
  const tl = back ? "LINKEDIN" : "SMU · INFORMATION SYSTEMS", tr = back ? "ELKAN TONG" : "@ELKANTONGG";
  let fs = 3.6 * u; // shrink the top row until both labels fit side by side
  for (;;) {
    g.font = `700 ${fs}px Inter, sans-serif`;
    g.letterSpacing = `${0.08 * fs}px`;
    const need = g.measureText(tl).width + g.measureText(tr).width + 4 * u;
    g.letterSpacing = "0px";
    if (need <= R - X || fs < 2 * u) break;
    fs *= 0.94;
  }
  g.fillStyle = back ? "#9b9ba6" : ink;
  spaced(tl, X, y, 0.08 * fs);
  spaced(tr, R, y, 0.08 * fs, "right");
  y += 3.5 * u;
  g.fillStyle = back ? "rgba(255,255,255,0.18)" : "rgba(18,18,20,0.25)";
  g.fillRect(X, y, R - X, Math.max(1, u * 0.3));

  // kicker + big word
  y += 5 * u + 7.2 * u;
  g.save();
  g.translate(X, y); g.rotate((-4 * Math.PI) / 180);
  g.font = `italic 800 ${7.2 * u}px Inter, sans-serif`;
  g.fillStyle = back ? "#ff3341" : "#c4121f"; g.textAlign = "left";
  g.fillText(back ? "Scan to" : "Full-stack", 0, 0);
  g.restore();
  const big = back ? 24 : 27;
  y += 0.6 * u + big * u * 0.8;
  g.font = `400 ${big * u}px Anton, Impact, sans-serif`;
  g.fillStyle = back ? "#ff3341" : ink;
  spaced(back ? "CONNECT" : "BUILDER", X - 0.6 * u, y, 0.01 * big * u);
  y += 3.5 * u + big * u * 0.06;

  // foot (bottom up)
  const footH = 14 * u * 0.8;
  g.font = `400 ${14 * u}px Anton, Impact, sans-serif`;
  g.fillStyle = ink;
  spaced(back ? "ELKAN TONG" : "PORTFOLIO", X, B, 0);
  g.font = `700 ${3.8 * u}px Inter, sans-serif`;
  g.letterSpacing = `${0.12 * 3.8 * u}px`;
  const yw = g.measureText("2026").width + 5.2 * u, yh = 3.8 * u + 2.8 * u;
  rr(g, R - yw, B - yh, yw, yh, yh); g.fillStyle = "#ff3341"; g.fill();
  g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText("2026", R - yw / 2 + 0.2 * u, B - yh / 2 + 0.2 * u);
  g.letterSpacing = "0px"; g.textBaseline = "alphabetic";
  const footTop = B - footH - 4 * u;

  if (!back) {
    // photo + vertical word, name plate overlapping the photo's bottom edge
    const plateH = 7 * u + 3.8 * u;
    const photoB = footTop - plateH + 7 * u;
    const vertW = 11.5 * u * 0.95;
    const pR = R - vertW - 2.5 * u;
    g.save();
    rr(g, X, y, pR - X, photoB - y, 2 * u); g.clip();
    const s = Math.max((pR - X) / img.width, (photoB - y) / img.height);
    const iw = img.width * s, ih = img.height * s;
    g.drawImage(img, X + (pR - X - iw) / 2, y + (photoB - y - ih) * 0.3, iw, ih);
    g.restore();
    g.save();
    g.translate(R - vertW * 0.12, photoB); g.rotate(Math.PI / 2);
    g.font = `400 ${11.5 * u}px Anton, Impact, sans-serif`; g.fillStyle = ink;
    spaced("SINGAPORE", -0.04 * 11.5 * u, 0, 0.04 * 11.5 * u, "right");
    g.restore();
    g.font = `400 ${7 * u}px Anton, Impact, sans-serif`;
    g.letterSpacing = `${0.04 * 7 * u}px`;
    const nw = g.measureText("ELKAN TONG KAI EN").width + 6.4 * u + 1.8 * u;
    const nx = X - u, ny = footTop - plateH;
    g.fillStyle = "#121214"; g.fillRect(nx, ny, nw, plateH);
    g.fillStyle = "#ff3341"; g.fillRect(nx, ny, 1.8 * u, plateH);
    g.fillStyle = "#f3f3f1"; g.textAlign = "left";
    g.fillText("ELKAN TONG KAI EN", nx + 1.8 * u + 3.2 * u, ny + plateH - 2 * u);
    g.letterSpacing = "0px";
  } else {
    // LinkedIn QR on a white tile, sized to the space left
    const caption = 4.4 * u;
    const avail = footTop - y - caption - 6 * u;
    const q = Math.min(R - X, avail);
    const qx = X + (R - X - q) / 2, qy = y + 1 * u;
    rr(g, qx, qy, q, q, 3 * u); g.fillStyle = "#ffffff"; g.fill();
    const m = q * 0.08;
    g.imageSmoothingEnabled = false;
    g.drawImage(img, qx + m, qy + m, q - 2 * m, q - 2 * m);
    g.imageSmoothingEnabled = true;
    g.font = `600 ${caption}px Inter, sans-serif`; g.fillStyle = "#9b9ba6"; g.textAlign = "center";
    g.fillText("linkedin.com/in/elkan-tong", (X + R) / 2, qy + q + 3 * u + caption);
  }
  g.restore();
  return c;
}

function paintStrap(sw) {
  const w = 64, h = 1024; // one repeat of the print, running along v
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d");
  g.fillStyle = "#16161a"; g.fillRect(0, 0, w, h);
  g.fillStyle = "rgba(255,255,255,0.1)";
  g.fillRect(w * 0.12, 0, 1.2, h); g.fillRect(w * 0.88 - 1.2, 0, 1.2, h);
  // weave texture
  for (let yy = 0; yy < h; yy += 3) { g.fillStyle = `rgba(255,255,255,${(yy / 3) % 2 ? 0.015 : 0.035})`; g.fillRect(0, yy, w, 1); }
  g.save();
  g.translate(w / 2, h); g.rotate(-Math.PI / 2); // text reads up the strap
  g.font = `700 ${w * 0.42}px Inter, sans-serif`;
  g.textBaseline = "middle";
  g.letterSpacing = `${w * 0.06}px`;
  // fit a whole number of repeats in the tile so it wraps seamlessly
  const one = g.measureText(STRAP_TEXT).width;
  const reps = Math.max(1, Math.round(h / one));
  g.scale(h / (one * reps), 1);
  let x = 0;
  for (let r = 0; r < reps; r++) {
    for (const ch of STRAP_TEXT) {
      g.fillStyle = ch === "✦" ? "#ff3341" : "rgba(240,240,238,0.92)";
      g.fillText(ch, x, 0);
      x += g.measureText(ch).width + w * 0.06;
    }
  }
  g.restore();
  return { canvas: c, period: (h / w) * sw }; // world length of one tile along the strap
}

/* ------------------------------------------------------------------ create */
export async function createLanyard3D(layer, dims) {
  const canvas = document.createElement("canvas");
  canvas.className = "lanyard__gl";
  canvas.setAttribute("aria-hidden", "true");
  try { // check quietly first; Three.js logs errors when WebGL is missing
    const probe = document.createElement("canvas");
    if (!(probe.getContext("webgl2") || probe.getContext("webgl"))) return null;
  } catch (e) { return null; }
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch (e) {
    return null; // no WebGL: lanyard.js keeps the 2D badge
  }
  if (!renderer.getContext()) return null;

  const [photo, qr] = await Promise.all([
    loadImg("assets/me/elkan.jpg"),
    loadImg("assets/me/linkedin-qr.svg"),
    document.fonts ? Promise.all([
      document.fonts.load("400 40px Anton"), document.fonts.load("700 40px Inter"),
      document.fonts.load("italic 800 40px Inter"), document.fonts.load("600 40px Inter"),
    ]) : null,
  ]);

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x221a1a, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.radius = 14;
  key.shadow.blurSamples = 16;
  key.shadow.bias = -0.0005;
  scene.add(key, key.target);
  const LIGHT_DIR = new THREE.Vector3(-0.35, 0.55, 1).normalize();

  // page behind the badge: only receives the shadow
  const catcher = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShadowMaterial({ opacity: 0.42 }));
  catcher.receiveShadow = true;
  scene.add(catcher);

  const badge = new THREE.Group();
  scene.add(badge);
  const strapMat = new THREE.MeshStandardMaterial({ roughness: 0.75, metalness: 0, side: THREE.DoubleSide });
  const metal = new THREE.MeshStandardMaterial({ color: 0xc9ccd3, metalness: 1, roughness: 0.22 });
  const strapGeo = new THREE.BufferGeometry();
  const strap = new THREE.Mesh(strapGeo, strapMat);
  strap.castShadow = true;
  strap.frustumCulled = false;
  scene.add(strap);

  let built = null; // rebuilt when the badge size changes
  let strapTex = null, period = 100;
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  function build(d) {
    if (built) {
      badge.clear();
      built.dispose.forEach((x) => x.dispose());
    }
    const { bw, bodyTop, bodyH, sw } = d;
    const dispose = [];
    const t = bw * 0.018, bev = bw * 0.006;

    // plastic holder with real thickness
    const shape = new THREE.Shape();
    const r = bw * 0.07, x0 = -bw / 2 + bev, x1 = bw / 2 - bev, y0 = -bodyH + bev, y1 = -bev;
    shape.moveTo(x0 + r, y1);
    shape.lineTo(x1 - r, y1); shape.quadraticCurveTo(x1, y1, x1, y1 - r);
    shape.lineTo(x1, y0 + r); shape.quadraticCurveTo(x1, y0, x1 - r, y0);
    shape.lineTo(x0 + r, y0); shape.quadraticCurveTo(x0, y0, x0, y0 + r);
    shape.lineTo(x0, y1 - r); shape.quadraticCurveTo(x0, y1, x0 + r, y1);
    const holderGeo = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 3, curveSegments: 10 });
    holderGeo.translate(0, -bodyTop, -t / 2);
    const holderMat = new THREE.MeshPhysicalMaterial({ color: 0x18181c, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.1 });
    const holder = new THREE.Mesh(holderGeo, holderMat);
    holder.castShadow = true;
    badge.add(holder);
    dispose.push(holderGeo, holderMat);

    // printed faces under a glossy sleeve
    const tw = 768, th = Math.round((tw * bodyH) / bw);
    const z = t / 2 + bev + 0.4;
    [false, true].forEach((back) => {
      const tex = new THREE.CanvasTexture(paintFace(back, tw, th, back ? qr : photo));
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = maxAniso;
      const mat = new THREE.MeshPhysicalMaterial({
        map: tex, alphaTest: 0.5, roughness: 0.42, clearcoat: 1, clearcoatRoughness: 0.06,
      });
      const geo = new THREE.PlaneGeometry(bw, bodyH);
      const face = new THREE.Mesh(geo, mat);
      face.position.set(0, -bodyTop - bodyH / 2, back ? -z : z);
      if (back) face.rotation.y = Math.PI;
      badge.add(face);
      dispose.push(tex, mat, geo);
    });

    // clasp: strap tab, metal clip, swivel and a ring through the slot
    const tabGeo = new THREE.BoxGeometry(sw, bw * 0.07, bw * 0.02);
    const tab = new THREE.Mesh(tabGeo, strapMat); tab.position.y = -bw * 0.035; tab.castShadow = true;
    const clipGeo = new THREE.BoxGeometry(bw * 0.075, bw * 0.065, bw * 0.034);
    const clip = new THREE.Mesh(clipGeo, metal); clip.position.y = -bw * 0.095; clip.castShadow = true;
    const swGeo = new THREE.CylinderGeometry(bw * 0.012, bw * 0.012, bw * 0.03, 16);
    const swv = new THREE.Mesh(swGeo, metal); swv.position.y = -bw * 0.138;
    const slotY = -bodyTop - bodyH * 0.049;
    const ringR = (-bw * 0.15 - slotY) / 2 + bw * 0.012;
    const ringGeo = new THREE.TorusGeometry(ringR, bw * 0.0075, 12, 40);
    const ring = new THREE.Mesh(ringGeo, metal);
    ring.rotation.y = Math.PI / 2; // loop runs through the card, at right angles to it
    ring.position.y = -bw * 0.15 - ringR + bw * 0.006;
    ring.castShadow = true;
    badge.add(tab, clip, swv, ring);
    dispose.push(tabGeo, clipGeo, swGeo, ringGeo);

    if (strapTex) strapTex.dispose();
    const sp = paintStrap(sw);
    strapTex = new THREE.CanvasTexture(sp.canvas);
    strapTex.colorSpace = THREE.SRGBColorSpace;
    strapTex.wrapS = strapTex.wrapT = THREE.RepeatWrapping;
    strapTex.anisotropy = maxAniso;
    strapMat.map = strapTex; strapMat.needsUpdate = true;
    period = sp.period;

    catcher.scale.set(bw * 5, bw * 5, 1);
    const s = key.shadow.camera;
    s.left = -bw * 2.2; s.right = bw * 2.2; s.top = bw * 2.6; s.bottom = -bw * 2.6; s.near = 10; s.far = 5000;
    s.updateProjectionMatrix();
    built = { key: `${bw}|${bodyH}|${bodyTop}`, dispose };
  }

  let posArr = null, uvArr = null;
  function updateStrap(pts, yaw, sw) {
    const n = pts.length;
    if (!posArr || posArr.length !== n * 6) {
      posArr = new Float32Array(n * 6); uvArr = new Float32Array(n * 4);
      const idx = [];
      for (let i = 0; i < n - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      strapGeo.setIndex(idx);
      strapGeo.setAttribute("position", new THREE.BufferAttribute(posArr, 3));
      strapGeo.setAttribute("uv", new THREE.BufferAttribute(uvArr, 2));
    }
    // arc length measured from the clasp so the print stays put on the strap as it moves
    let len = 0;
    const cum = new Array(n).fill(0);
    for (let i = n - 2; i >= 0; i--) { len += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y); cum[i] = len; }
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      let tx = b.x - a.x, ty = -(b.y - a.y);
      const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
      // width direction: in the page plane at the top, turning with the card towards the clasp
      const u = i / (n - 1), k = Math.max(0, Math.min(1, (u - 0.4) / 0.6));
      const tw = yaw * k * k * (3 - 2 * k);
      const c = Math.cos(tw), s = Math.sin(tw);
      const wx = -ty * c, wy = tx * c, wz = -s;
      const h = sw / 2, X = pts[i].x, Y = -pts[i].y;
      posArr.set([X - wx * h, Y - wy * h, -wz * h, X + wx * h, Y + wy * h, wz * h], i * 6);
      const v = cum[i] / period;
      uvArr.set([0, v, 1, v], i * 4);
    }
    strapGeo.attributes.position.needsUpdate = true;
    strapGeo.attributes.uv.needsUpdate = true;
    strapGeo.computeVertexNormals();
    strapGeo.computeBoundingSphere();
  }

  let W = 0, Hc = 0;
  return {
    canvas,
    resize(w, h, dpr) {
      W = w; Hc = h;
      renderer.setPixelRatio(Math.min(1.5, dpr));
      renderer.setSize(w, h, false);
      canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
    },
    render(s) {
      const d = dims();
      if (!built || built.key !== `${d.bw}|${d.bodyH}|${d.bodyTop}`) build(d);
      badge.position.set(s.P.x, -s.P.y, 0);
      badge.rotation.set(-s.pitch, s.yaw, -s.phi, "ZYX");
      updateStrap(s.pts, s.yaw, d.sw);

      // camera: z = 0 maps 1:1 to page pixels, vanishing point on the badge
      const cx = s.C.x, cy = s.C.y, near = 10;
      camera.position.set(cx, -cy, D);
      camera.projectionMatrix.makePerspective(
        ((0 - cx) * near) / D, ((W - cx) * near) / D, (cy * near) / D, ((cy - Hc) * near) / D, near, 6000);
      camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
      camera.updateMatrixWorld();

      catcher.position.set(cx, -cy, -d.bw * 0.4);
      key.target.position.set(cx, -cy, 0);
      key.position.copy(key.target.position).addScaledVector(LIGHT_DIR, 2000);
      renderer.render(scene, camera);
    },
  };
}
