import * as THREE from 'three';

const EYE = 1.72;
const RADIUS = 0.34;

// Ich-Perspektive mit Kreis-gegen-Rechteck-Kollision in der Ebene.
export class Player {
  constructor(camera) {
    this.camera = camera;
    this.pos = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0;
    this.bob = 0;
    this.groundY = 0;
    this.stepPhase = 0;
    this.camera.rotation.order = 'YXZ';
  }

  teleport(pos, yaw, location) {
    this.pos.set(pos[0], 0, pos[2]);
    this.yaw = yaw;
    this.pitch = 0;
    this.groundY = location.heightAt(pos[0], pos[2]);
    this.apply();
  }

  update(dt, input, location, audio, moveEnabled) {
    if (moveEnabled) {
      const mouse = input.consumeMouse();
      this.yaw -= mouse.x * 0.0022;
      this.pitch = THREE.MathUtils.clamp(this.pitch - mouse.y * 0.0022, -1.35, 1.35);

      let f = 0;
      let s = 0;
      if (input.down('KeyW', 'ArrowUp')) f += 1;
      if (input.down('KeyS', 'ArrowDown')) f -= 1;
      if (input.down('KeyD', 'ArrowRight')) s += 1;
      if (input.down('KeyA', 'ArrowLeft')) s -= 1;

      const moving = f !== 0 || s !== 0;
      if (moving) {
        const len = Math.hypot(f, s);
        const speed = input.down('ShiftLeft', 'ShiftRight') ? 5.4 : 2.9;
        const sin = Math.sin(this.yaw);
        const cos = Math.cos(this.yaw);
        const dx = ((-sin * f + cos * s) / len) * speed * dt;
        const dz = ((-cos * f - sin * s) / len) * speed * dt;
        this.pos.x += dx;
        this.pos.z += dz;
        this.resolve(location);

        this.bob += dt * speed * 2.2;
        this.stepPhase += dt * speed;
        if (this.stepPhase > 1.55) {
          this.stepPhase = 0;
          audio.step(location.surface === 'wood');
        }
      }
      this.focus = null;
    } else {
      input.consumeMouse();
      this.turnToFocus(dt);
    }

    const target = location.heightAt(this.pos.x, this.pos.z);
    this.groundY += (target - this.groundY) * Math.min(1, dt * 10);
    this.apply();
  }

  // Wendet den Blick im Gespräch sanft der Figur zu.
  turnToFocus(dt) {
    if (!this.focus) return;
    const dx = this.focus.x - this.pos.x;
    const dz = this.focus.z - this.pos.z;
    let dyaw = Math.atan2(-dx, -dz) - this.yaw;
    while (dyaw > Math.PI) dyaw -= Math.PI * 2;
    while (dyaw < -Math.PI) dyaw += Math.PI * 2;
    const pitch = Math.atan2(this.focus.y - this.camera.position.y, Math.hypot(dx, dz));
    const k = Math.min(1, dt * 5);
    this.yaw += dyaw * k;
    this.pitch += (pitch - this.pitch) * k;
  }

  resolve(location) {
    for (let pass = 0; pass < 2; pass++) {
      for (const c of location.colliders) {
        const nx = Math.max(c.minX, Math.min(this.pos.x, c.maxX));
        const nz = Math.max(c.minZ, Math.min(this.pos.z, c.maxZ));
        const dx = this.pos.x - nx;
        const dz = this.pos.z - nz;
        const d2 = dx * dx + dz * dz;
        if (d2 >= RADIUS * RADIUS) continue;
        if (d2 > 1e-8) {
          const d = Math.sqrt(d2);
          this.pos.x = nx + (dx / d) * RADIUS;
          this.pos.z = nz + (dz / d) * RADIUS;
        } else {
          // Mittelpunkt liegt im Rechteck: zur nächstgelegenen Kante hinaus.
          const left = this.pos.x - c.minX;
          const right = c.maxX - this.pos.x;
          const near = this.pos.z - c.minZ;
          const far = c.maxZ - this.pos.z;
          const min = Math.min(left, right, near, far);
          if (min === left) this.pos.x = c.minX - RADIUS;
          else if (min === right) this.pos.x = c.maxX + RADIUS;
          else if (min === near) this.pos.z = c.minZ - RADIUS;
          else this.pos.z = c.maxZ + RADIUS;
        }
      }
    }
  }

  apply() {
    const bobY = Math.sin(this.bob) * 0.022;
    this.camera.position.set(this.pos.x, this.groundY + EYE + bobY, this.pos.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }

  // Wählt den Hotspot, auf den der Blick am ehesten zielt.
  findTarget(location, state) {
    const origin = this.camera.position;
    const dir = new THREE.Vector3(0, 0, -1).applyEuler(this.camera.rotation);
    const to = new THREE.Vector3();
    let best = null;
    let bestScore = Infinity;
    for (const spot of location.hotspots) {
      if (spot.when && !state.check(spot.when)) continue;
      to.copy(spot.pos).sub(origin);
      const along = to.dot(dir);
      if (along < 0.1 || along > spot.range) continue;
      const missing = Math.sqrt(Math.max(0, to.lengthSq() - along * along));
      if (missing > spot.radius) continue;
      const score = missing / spot.radius + along * 0.1;
      if (score < bestScore) {
        bestScore = score;
        best = spot;
      }
    }
    return best;
  }
}
