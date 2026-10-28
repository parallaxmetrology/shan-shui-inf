// Hands for {Shan, Shui}*
//
// Draws the scroll's strokes in a learned brush hand instead of the one built-in brush.
// A hand is a small vocabulary of marks (length, width, taper, pressure, dryness, hatching, dots, wash),
// each learned from public-domain drawings and paintings by one artist, with how often it was used.
// The landscape itself (what is placed where) is unchanged: same seed, same scroll, different hand.
//
// Choose with ?hand=shenzhou (or shitao, taiga, buson, hokusai, hakuin, kyosai; rembrandt, vangogh for pen);
// no hand = the original.
// ?hscale=1.6 sets how big the hand's marks are against the scroll.
//
// None of this calls Math.random: every choice comes from a hash of where the stroke is, so the
// scroll's own random sequence, and therefore its landscape, is exactly the original's.

var Hands = (function() {
  var DATA = typeof HANDS_DATA != "undefined" ? HANDS_DATA : {};
  var arg = function(k) {
    var m = window.location.search.match(new RegExp("[?&]" + k + "=([^&]*)"));
    return m ? decodeURIComponent(m[1]) : null;
  };
  var key = arg("hand");
  var H = key && DATA[key] ? DATA[key] : null;
  var S = parseFloat(arg("hscale")) || 1.6;
  // a brush hand lays darker ink than the scroll's pale grey pencil; ?ink= scales it
  var G = parseFloat(arg("ink")) || 1.8;

  // ---------------------------------------------------------------- randomness that is not Math.random

  function hash(a, b) {
    var h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b + 0x632be5ab) | 0, 0xc2b2ae35);
    h ^= h >>> 15;
    h = Math.imul(h, 0x2c1b3c6d);
    h ^= h >>> 12;
    return (h >>> 0) / 4294967296;
  }
  // a stroke is known by where it starts and which way it first goes
  function sidOf(pts) {
    var p = pts[0],
      q = pts[Math.min(1, pts.length - 1)];
    return (
      (Math.floor(p[0] * 16) * 73856093) ^
      (Math.floor(p[1] * 16) * 19349663) ^
      (Math.floor(q[0] * 4) * 83492791) ^
      (Math.floor(q[1] * 4) * 2654435761)
    );
  }
  function rngOf(sid) {
    var a = sid >>> 0;
    return function() {
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------------------------------------------------------------- ink

  var INK_GREY = H ? (H.ink[0] + H.ink[1] + H.ink[2]) / 3 : 0;
  // the scroll writes greys like rgba(100,100,100,0.3) over the paper; keep how dark that is, in the hand's ink
  function parseCol(col) {
    var m = String(col).match(/rgba?\(([^)]*)\)/);
    if (!m) return { grey: 100, a: col == "white" ? 0 : 0.9 };
    var v = m[1].split(",").map(parseFloat);
    return { grey: (v[0] + v[1] + v[2]) / 3, a: v.length > 3 ? v[3] : 1 };
  }
  function inkAlpha(col) {
    var c = parseCol(col);
    return Math.min(1, (c.a * (255 - c.grey)) / (255 - INK_GREY));
  }
  function ink(a) {
    return "rgba(" + H.ink[0] + "," + H.ink[1] + "," + H.ink[2] + "," + Math.max(0, Math.min(1, a)).toFixed(3) + ")";
  }

  // ---------------------------------------------------------------- which mark

  var role = "edge";
  function setRole(r) {
    var was = role;
    role = r;
    return was;
  }
  function pool(r) {
    var ms = H.marks,
      out;
    if (r == "shade") out = ms.filter(function(m) { return m.kind == "wash"; });
    else if (r == "tex") out = ms.filter(function(m) { return m.role == "mass" && m.kind != "wash"; });
    else out = ms.filter(function(m) { return m.role != "mass" && m.kind != "wash" && m.kind != "dots"; });
    if (!out.length) out = ms.filter(function(m) { return m.kind != "wash" && m.kind != "dots"; });
    if (!out.length) out = ms;
    return out;
  }
  var POOLS = {};
  // as often as the artist used it, and nearer the width the scroll asked for
  function pick(r, wid, u) {
    var ps = POOLS[r] || (POOLS[r] = pool(r));
    var sig = r == "edge" ? 0.7 : 1.3;
    var ws = ps.map(function(m) {
      var l = Math.log((m.w * S) / Math.max(0.3, wid));
      return m.uses * Math.exp((-l * l) / (2 * sig * sig));
    });
    var t = 0;
    for (var i = 0; i < ws.length; i++) t += ws[i];
    var x = u * t;
    for (var i = 0; i < ws.length; i++) if ((x -= ws[i]) <= 0) return ps[i];
    return ps[ps.length - 1];
  }

  // ---------------------------------------------------------------- geometry

  function cut(pts) {
    // arc length along the path
    var L = [0];
    for (var i = 1; i < pts.length; i++)
      L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return L;
  }
  function at(pts, L, s) {
    // the point and direction at arc length s
    var i = 1;
    while (i < pts.length - 1 && L[i] < s) i++;
    var a = pts[i - 1],
      b = pts[i],
      d = L[i] - L[i - 1] || 1,
      f = Math.max(0, Math.min(1, (s - L[i - 1]) / d));
    var ux = (b[0] - a[0]) / d,
      uy = (b[1] - a[1]) / d;
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, ux, uy];
  }
  function fmt(p) {
    return p[0].toFixed(1) + "," + p[1].toFixed(1);
  }
  function polygon(left, right, fill) {
    if (left.length < 2) return "";
    var s = "<polygon points='";
    for (var i = 0; i < left.length; i++) s += fmt(left[i]) + " ";
    for (var i = right.length - 1; i >= 0; i--) s += fmt(right[i]) + " ";
    return s + "' style='fill:" + fill + ";stroke:none'/>";
  }

  // the centreline a mark travels for t in [0,1] over [s0, s1] of the path:
  //   along: the scroll's own line; fixed: a straight hatch at the hand's slant through the middle;
  //   zig: a zigzag that keeps the line's course and swings either side of it
  function course(m, pts, L, s0, len, sid, n) {
    var P = [];
    if (m.mode == "fixed") {
      var c = at(pts, L, s0 + len / 2);
      var a = m.angle + (hash(sid + 41, 0) - 0.5) * 0.25;
      var hx = Math.cos(a),
        hy = Math.sin(a);
      for (var i = 0; i <= n; i++) {
        var u = (i / n - 0.5) * len;
        P.push([c[0] + hx * u, c[1] + hy * u, i / n]);
      }
      return P;
    }
    if (m.mode == "zig") {
      var leg = Math.max(1.5, m.zper * S),
        fwd = leg * Math.cos(m.zamp),
        amp = leg * Math.sin(m.zamp);
      var steps = Math.max(n, Math.ceil((len / Math.max(0.5, fwd)) * 4));
      for (var i = 0; i <= steps; i++) {
        var s = (i / steps) * len,
          q = at(pts, L, s0 + s);
        var ph = (s / Math.max(0.5, fwd)) % 2;
        var o = (ph < 1 ? ph : 2 - ph) * amp - amp / 2;
        P.push([q[0] - q[3] * o, q[1] + q[2] * o, i / steps]);
      }
      return P;
    }
    for (var i = 0; i <= n; i++) {
      var q = at(pts, L, s0 + (i / n) * len);
      P.push([q[0], q[1], i / n]);
    }
    return P;
  }

  // one mark laid along [s0, s1] of the path
  function lay(m, pts, L, s0, s1, w, a, sid, r) {
    var len = s1 - s0;
    if (len < 0.5) return "";
    var step = Math.max(1.5, Math.min(4, len / 6));
    var n = Math.max(2, Math.ceil(len / step));
    var out = "";
    var press = m.press;
    var reed = m.kind == "reed";

    if (m.kind == "dots") {
      var gap = Math.max(1.5, m.gap * S),
        k = 0;
      for (var s = s0; s <= s1; s += gap, k++) {
        var q = at(pts, L, s);
        var off = (hash(sid, k) - 0.5) * m.w * S * 0.6;
        var hd = hash(sid + 2, k);
        var rad = m.dot * S * 0.6 * (0.55 + 0.45 * press) * (0.6 + 0.8 * hd * hd);
        out +=
          "<circle cx='" + (q[0] - q[3] * off).toFixed(1) + "' cy='" + (q[1] + q[2] * off).toFixed(1) +
          "' r='" + rad.toFixed(1) + "' style='fill:" + ink(a * (0.6 + 0.4 * hash(sid + 4, k))) + "'/>";
      }
      return out;
    }

    var P = course(m, pts, L, s0, len, sid, n);
    var lines = m.lines || 1;
    for (var li = 0; li < lines; li++) {
      var hatch = lines > 1;
      var lo = hatch ? (li - (lines - 1) / 2 + 0.35 * (hash(sid + 17, li) - 0.5)) * m.spacing * S : 0;
      var lp = hatch ? 0.55 + 0.45 * hash(sid + 19, li) : 1;
      var edge = hatch ? Math.abs(li - (lines - 1) / 2) / ((lines - 1) / 2) : 0;
      var trim = hatch ? 0.06 + 0.34 * edge * edge : 0;
      var t0 = hatch ? trim * (0.4 + 0.9 * hash(sid + 11, li)) : 0,
        t1 = hatch ? 1 - trim * (0.4 + 0.9 * hash(sid + 13, li)) : 1;

      // the centreline and half-width at each step, as the Hands engine shapes a stroke
      var C = [];
      for (var i = 0; i < P.length; i++) {
        var t = P[i][2];
        if (t < t0 || t > t1) continue;
        var pa = P[Math.max(0, i - 1)],
          pb = P[Math.min(P.length - 1, i + 1)];
        var ux = pb[0] - pa[0],
          uy = pb[1] - pa[1],
          ul = Math.hypot(ux, uy) || 1;
        ux /= ul;
        uy /= ul;
        var sw = Math.sin(Math.PI * t);
        var hw = (w / 2) * (1 - 0.85 * m.taper * (1 - sw));
        if (hatch) hw *= 1 - 0.35 * ((t - t0) / (t1 - t0 || 1));
        // a cut reed is broad across its nib and thin along it, so the line swells and narrows as it turns
        if (reed) hw *= 0.28 + 0.72 * Math.abs(Math.sin(Math.atan2(uy, ux) - m.nib));
        var wob = m.jit * w * 4 * (hash(sid + 31, (t * len) | 0) - 0.5);
        var o = lo + wob;
        C.push([P[i][0] - uy * o, P[i][1] + ux * o, ux, uy, Math.max(0.25, hw), t]);
      }
      if (C.length < 2) continue;

      if (m.kind == "wash") {
        // a pale wash that dries darker at its edge
        var Lf = [],
          Rt = [];
        for (var i = 0; i < C.length; i++) {
          var c = C[i];
          Lf.push([c[0] - c[3] * c[4], c[1] + c[2] * c[4]]);
          Rt.push([c[0] + c[3] * c[4], c[1] - c[2] * c[4]]);
        }
        out += polygon(Lf, Rt, ink(a * press * 0.22));
        out += polygon(Lf, Lf.map(function(p, i) {
          return [p[0] * 0.85 + C[i][0] * 0.15, p[1] * 0.85 + C[i][1] * 0.15];
        }), ink(a * press * 0.18));
        continue;
      }

      // a brush has bristles across it; a dry one runs out of ink unevenly and skips.
      // a reed pen is one line that fades as it runs out of ink, and skips where it is running dry.
      var dry = reed ? m.dry : Math.min(0.95, m.dry + 0.9 * Math.max(0, 0.85 - press));
      var nb = !reed && dry > 0.2 && w > 2.2 ? Math.max(2, Math.min(5, Math.round(w / 1.1))) : 1;
      var base = a * lp * Math.min(1, press / 0.85);
      for (var b = 0; b < nb; b++) {
        var u0 = -1 + (2 * b) / nb,
          u1 = -1 + (2 * (b + 1)) / nb;
        if (nb > 1) {
          // each bristle a little narrower than its share, so the dry brush shows paper between
          var mid = (u0 + u1) / 2,
            half = ((u1 - u0) / 2) * (0.55 + 0.35 * hash(sid + 5, b));
          u0 = mid - half;
          u1 = mid + half;
        }
        var outAt = !reed && (nb > 1 || dry > 0.2) ? 1 - dry * (0.2 + 0.8 * hash(sid, b)) : 1;
        var Lf = [],
          Rt = [],
          band = 0,
          fill = ink(base);
        for (var i = 0; i < C.length; i++) {
          var c = C[i];
          var skip = reed
            ? dry > 0 && hash(sid + 7, (c[5] * len * 0.45) | 0) < dry * 0.6 * c[5]
            : dry > 0 && hash(sid + 3 + b, (c[5] * len * 0.35) | 0) < dry * 0.55 * c[5];
          var bd = reed ? Math.min(2, (c[5] * 3) | 0) : 0;
          if (c[5] > outAt || skip || bd != band) {
            if (bd != band && !skip && Lf.length) {
              // keep the line joined where only the ink changes
              Lf.push([c[0] - c[3] * c[4] * u0, c[1] + c[2] * c[4] * u0]);
              Rt.push([c[0] - c[3] * c[4] * u1, c[1] + c[2] * c[4] * u1]);
            }
            out += polygon(Lf, Rt, fill);
            Lf = [];
            Rt = [];
            band = bd;
            fill = ink(base * (1 - 0.55 * dry * ((bd + 0.5) / 3)));
            if (c[5] > outAt || skip) continue;
          }
          Lf.push([c[0] - c[3] * c[4] * u0, c[1] + c[2] * c[4] * u0]);
          Rt.push([c[0] - c[3] * c[4] * u1, c[1] + c[2] * c[4] * u1]);
        }
        out += polygon(Lf, Rt, fill);
      }
    }
    return out;
  }

  // ---------------------------------------------------------------- what the scroll calls

  // in place of the scroll's stroke(): the path is cut into marks of the hand's own lengths
  function stroke(ptlist, args) {
    var xof = args.xof || 0,
      yof = args.yof || 0;
    var wid = args.wid != undefined ? args.wid : 2;
    var col = args.col != undefined ? args.col : "rgba(200,200,200,0.9)";
    var pts = [];
    for (var i = 0; i < ptlist.length; i++) {
      var p = ptlist[i];
      if (isFinite(p[0]) && isFinite(p[1])) pts.push([p[0] + xof, p[1] + yof]);
    }
    if (pts.length < 2) return "";
    var a = inkAlpha(col);
    if (a <= 0.003) return "";
    a = Math.min(1, a * G);
    var L = cut(pts),
      total = L[L.length - 1];
    if (total < 0.5) return "";
    var sid = sidOf(pts),
      R = rngOf(sid);
    var r = role == "edge" && wid > 6 ? "shade" : role;
    var out = "",
      s = 0,
      k = 0;
    while (s < total && k < 400) {
      var m = pick(r, wid, R());
      var ml = m.len * S * (0.7 + 0.6 * R());
      var e = Math.min(total, s + ml);
      if (total - e < ml * 0.3) e = total; // no stub at the end
      var w =
        m.kind == "wash" ? Math.max(wid, m.w * S * 0.5) : m.kind == "dots" ? m.w * S : Math.sqrt(m.w * S * Math.max(0.5, wid));
      out += lay(m, pts, L, s, e, w, a, (sid + 977 * k) | 0, R);
      // the brush lifts and comes down again: sometimes a small gap, sometimes a small overlap
      s = e + (R() - 0.4) * Math.min(6, ml * 0.12);
      k++;
    }
    return out;
  }

  // the scroll's blobs (leaves, dots, small rocks) keep their shape, in the hand's ink and touch
  var BLOB_PRESS = null;
  function blobFill(col) {
    if (BLOB_PRESS == null) {
      var ps = pool("tex"),
        t = 0,
        u = 0;
      ps.forEach(function(m) {
        t += m.press * m.uses;
        u += m.uses;
      });
      BLOB_PRESS = u ? t / u : 0.85;
    }
    return ink(inkAlpha(col) * Math.min(1, BLOB_PRESS / 0.85));
  }

  // the share of the artist's marks that were washes
  var WASH = null;
  function washShare() {
    if (WASH == null) {
      var w = 0,
        t = 0;
      H.marks.forEach(function(m) {
        t += m.uses;
        if (m.kind == "wash") w += m.uses;
      });
      WASH = t ? w / t : 0;
    }
    return WASH;
  }
  // after a mountain's texture: pale washes laid along some of its texture lines, as many as the artist
  // would have (a dry hand lays almost none, a wet one many); chosen by hash, never Math.random
  function washes(texlist, xof, yof) {
    var share = washShare();
    if (!share || !texlist.length) return "";
    var out = "",
      was = setRole("shade");
    for (var j = 0; j < texlist.length; j++) {
      var tl = texlist[j];
      if (tl.length < 3) continue;
      if (hash(sidOf(tl), 101) > share * 0.5) continue;
      out += stroke(tl, { xof: xof, yof: yof, col: "rgba(100,100,100,0.6)", wid: 10 });
    }
    setRole(was);
    return out;
  }

  return {
    on: !!H,
    washes: washes,
    key: key,
    hand: H,
    list: DATA,
    setRole: setRole,
    stroke: stroke,
    blobFill: blobFill,
    paper: function(r, g, b) {
      // tint the scroll's paper toward the hand's own paper
      if (!H) return [r, g, b];
      var p = H.paper,
        k = 0.6;
      return [r * (1 - k) + ((r * p[0]) / 247) * k, g * (1 - k) + ((g * p[1]) / 235) * k, b * (1 - k) + ((b * p[2]) / 210) * k];
    },
  };
})();
