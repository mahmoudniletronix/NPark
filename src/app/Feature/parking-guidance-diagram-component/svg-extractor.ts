// خفيفة، Pure TS، تشتغل على SVG inline في الـDOM
const RX_CODE = /^(?:S|P)\s*\d+\b/i;
const EN = ['station', 'sensor', 'detector'];
const AR = ['حساس', 'محطة', 'مستشعر', 'ستيشن'];
const WORDS = [...EN, ...AR];

type M = [number, number, number, number, number, number]; // a,b,c,d,e,f

const I: M = [1, 0, 0, 1, 0, 0];

function mul(A: M, B: M): M {
  const [a, b, c, d, e, f] = A,
    [ma, mb, mc, md, me, mf] = B;
  return [
    a * ma + c * mb,
    b * ma + d * mb,
    a * mc + c * md,
    b * mc + d * md,
    a * me + c * mf + e,
    b * me + d * mf + f,
  ];
}
function apply(M_: M, x: number, y: number) {
  const [a, b, c, d, e, f] = M_;
  return { x: a * x + c * y + e, y: b * x + d * y + f };
}
function parseTransform(t?: string | null): M {
  if (!t) return I;
  const re = /(?:(matrix|translate))\s*\(([^)]*)\)/g;
  let cur: M = I,
    m: RegExpExecArray | null;
  while ((m = re.exec(t))) {
    const kind = m[1],
      parts = m[2]
        .split(/[\s,]+/)
        .filter(Boolean)
        .map(Number);
    let T: M = I;
    if (kind === 'matrix' && parts.length >= 6) {
      T = [parts[0], parts[1], parts[2], parts[3], parts[4], parts[5]];
    } else if (kind === 'translate') {
      const tx = parts[0] ?? 0,
        ty = parts[1] ?? 0;
      T = [1, 0, 0, 1, tx, ty];
    }
    cur = mul(cur, T);
  }
  return cur;
}
function isStationLike(s?: string | null) {
  if (!s) return false;
  if (RX_CODE.test(s)) return true;
  const low = s.toLowerCase();
  if (EN.some((w) => low.includes(w))) return true;
  if (AR.some((w) => s.includes(w))) return true;
  return false;
}

export function extractFromInlineSvg(rootSvg: SVGSVGElement, floor = 'B1') {
  const viewBox = rootSvg.getAttribute('viewBox') ?? undefined;

  // build parent map (دون كلفة عالية)
  const parents = new WeakMap<Element, Element | null>();
  (function walk(e: Element, p: Element | null) {
    parents.set(e, p);
    Array.from(e.children).forEach((c) => walk(c, e));
  })(rootSvg, null);

  function accMatrix(el: Element): M {
    const stack: Element[] = [];
    let cur: Element | null = el;
    while (cur) {
      stack.push(cur);
      cur = parents.get(cur) ?? null;
    }
    return stack
      .reverse()
      .reduce((acc, node) => mul(acc, parseTransform(node.getAttribute('transform'))), I);
  }

  // === STATIONS: نصوص + أشكال بسيطة
  const stations: any[] = [];
  rootSvg.querySelectorAll('text, rect, circle, ellipse').forEach((el: Element) => {
    const tag = el.tagName.toLowerCase();

    // TEXT
    if (tag === 'text') {
      const text = (el.textContent ?? '').trim();
      if (!isStationLike(text)) return;
      // خُد أول tspan x/y وإلا (0,0)
      const tspan = el.querySelector('tspan');
      let x = 0,
        y = 0;
      if (tspan) {
        const xs = (tspan.getAttribute('x') ?? '0').split(/[\s,]+/)[0];
        const ys = (tspan.getAttribute('y') ?? '0').split(/[\s,]+/)[0];
        x = parseFloat(xs || '0');
        y = parseFloat(ys || '0');
      }
      const M = accMatrix(el);
      const p = apply(M, x, y);
      stations.push({
        id: text,
        x: +p.x.toFixed(2),
        y: +p.y.toFixed(2),
        tag: 'text',
        type: text.match(/^P/i) ? 'ParkingSensor' : text.match(/^S/i) ? 'Sensor' : 'Unknown',
        floor,
      });
      return;
    }

    // SHAPES by id/class match
    const id = el.getAttribute('id') ?? '';
    const klass = el.getAttribute('class') ?? '';
    const label = id || klass;
    if (!isStationLike(label)) return;

    let cx = 0,
      cy = 0;
    if (tag === 'rect') {
      const x = parseFloat(el.getAttribute('x') ?? '0');
      const y = parseFloat(el.getAttribute('y') ?? '0');
      const w = parseFloat(el.getAttribute('width') ?? '0');
      const h = parseFloat(el.getAttribute('height') ?? '0');
      cx = x + w / 2;
      cy = y + h / 2;
    } else if (tag === 'circle' || tag === 'ellipse') {
      cx = parseFloat(el.getAttribute('cx') ?? '0');
      cy = parseFloat(el.getAttribute('cy') ?? '0');
    }
    const M = accMatrix(el);
    const p = apply(M, cx, cy);
    stations.push({
      id: label || 'Station',
      x: +p.x.toFixed(2),
      y: +p.y.toFixed(2),
      tag,
      type: label.match(/^P/i) ? 'ParkingSensor' : label.match(/^S/i) ? 'Sensor' : 'Unknown',
      floor,
    });
  });

  const lanes: any[] = [];
  rootSvg.querySelectorAll('polyline, path, line').forEach((el: Element, i) => {
    const id = el.getAttribute('id') ?? '';
    const klass = el.getAttribute('class') ?? '';
    const label = id || klass || `Lane_${i + 1}`;
    const lower = (id + ' ' + klass).toLowerCase();
    if (!/lane|مسار|ممر/.test(lower)) return;

    const M = accMatrix(el);
    let pts: Array<{ x: number; y: number }> = [];

    if (el.tagName.toLowerCase() === 'polyline') {
      const raw = el.getAttribute('points') ?? '';
      raw
        .trim()
        .split(/\s+/)
        .forEach((pair) => {
          const [sx, sy] = pair.split(',').map(Number);
          const p = apply(M, sx, sy);
          pts.push({ x: +p.x.toFixed(2), y: +p.y.toFixed(2) });
        });
    } else if (el.tagName.toLowerCase() === 'line') {
      const x1 = parseFloat(el.getAttribute('x1') ?? '0');
      const y1 = parseFloat(el.getAttribute('y1') ?? '0');
      const x2 = parseFloat(el.getAttribute('x2') ?? '0');
      const y2 = parseFloat(el.getAttribute('y2') ?? '0');
      const p1 = apply(M, x1, y1),
        p2 = apply(M, x2, y2);
      pts = [
        { x: +p1.x.toFixed(2), y: +p1.y.toFixed(2) },
        { x: +p2.x.toFixed(2), y: +p2.y.toFixed(2) },
      ];
    }
    if (pts.length) lanes.push({ id: label, points: pts });
  });

  return {
    floor,
    stations,
    lanes,
    viewBox,
  } as import('../../Domain/parking.models/parking.models').ExtractResult;
}
