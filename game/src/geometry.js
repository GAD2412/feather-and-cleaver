/** Shared 2D geometry, clamping, and line-of-sight helpers. */

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function distSq(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  return dx * dx + dy * dy;
}

export function distance(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

export function normalizeAngle(angle) {
  let a = angle;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export function angleDiff(from, to) {
  return normalizeAngle(to - from);
}

/** Pushes a circular entity out of an axis-aligned rectangle. */
export function resolveCircleRect(entity, radius, rect) {
  const closestX = clamp(entity.x, rect.x, rect.x + rect.w);
  const closestY = clamp(entity.y, rect.y, rect.y + rect.h);
  const dx = entity.x - closestX;
  const dy = entity.y - closestY;
  const d2 = dx * dx + dy * dy;
  if (d2 >= radius * radius) return false;

  if (d2 > 1e-6) {
    const d = Math.sqrt(d2);
    const push = radius - d;
    entity.x += (dx / d) * push;
    entity.y += (dy / d) * push;
  } else {
    // Center is inside rect; push out along shortest axis.
    const leftPen = entity.x - rect.x;
    const rightPen = rect.x + rect.w - entity.x;
    const topPen = entity.y - rect.y;
    const bottomPen = rect.y + rect.h - entity.y;
    const minPen = Math.min(leftPen, rightPen, topPen, bottomPen);
    if (minPen === leftPen) entity.x = rect.x - radius;
    else if (minPen === rightPen) entity.x = rect.x + rect.w + radius;
    else if (minPen === topPen) entity.y = rect.y - radius;
    else entity.y = rect.y + rect.h + radius;
  }
  return true;
}

/** Checks whether segment AB intersects an axis-aligned rectangle. */
export function segmentIntersectsRect(ax, ay, bx, by, rect) {
  const dx = bx - ax;
  const dy = by - ay;
  let tMin = 0;
  let tMax = 1;

  const axes = [
    [ax, dx, rect.x, rect.x + rect.w],
    [ay, dy, rect.y, rect.y + rect.h],
  ];

  for (const [origin, delta, minB, maxB] of axes) {
    if (Math.abs(delta) < 1e-8) {
      if (origin < minB || origin > maxB) return false;
    } else {
      let t1 = (minB - origin) / delta;
      let t2 = (maxB - origin) / delta;
      if (t1 > t2) {
        const tmp = t1;
        t1 = t2;
        t2 = tmp;
      }
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
      if (tMin > tMax) return false;
    }
  }
  return true;
}

export function hasLineOfSight(ax, ay, bx, by, obstacles) {
  for (const rect of obstacles) {
    if (segmentIntersectsRect(ax, ay, bx, by, rect)) return false;
  }
  return true;
}
