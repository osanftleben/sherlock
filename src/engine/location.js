import * as THREE from 'three';
import { reportError } from '../core/errors.js';

// Ein Ort, den man betreten kann: die Straße genauso wie jede Stube.
// Hinzu kommende Stadtviertel und Fälle docken über `anchors` und `hotspots` an.
export class Location {
  constructor(id, name, { ambience = 'interior', surface = 'wood' } = {}) {
    this.id = id;
    this.name = name;
    this.ambience = ambience;
    this.surface = surface;
    this.scene = new THREE.Scene();
    this.colliders = [];
    this.raised = [];
    this.hotspots = [];
    this.anchors = {};
    this.updaters = [];
    this.spawn = { pos: [0, 0, 0], yaw: 0 };
    this.exposure = 1;
  }

  // Achsenparallele Rechtecke in der XZ-Ebene.
  collide(minX, maxX, minZ, maxZ) {
    const rect = {
      minX: Math.min(minX, maxX),
      maxX: Math.max(minX, maxX),
      minZ: Math.min(minZ, maxZ),
      maxZ: Math.max(minZ, maxZ),
    };
    this.colliders.push(rect);
    return rect;
  }

  anchor(name, x, y, z, yaw = 0) {
    this.anchors[name] = { pos: new THREE.Vector3(x, y, z), yaw };
  }

  addHotspot(spot) {
    const pos = spot.pos instanceof THREE.Vector3 ? spot.pos : new THREE.Vector3(...spot.pos);
    const entry = { range: 2.6, radius: 0.3, ...spot, pos };
    this.hotspots.push(entry);
    return entry;
  }

  onUpdate(fn) {
    this.updaters.push(fn);
    return fn;
  }

  // Nimmt wieder heraus, was ein Fall hinzugefügt hat; Rückgabewerte von
  // addHotspot, collide und onUpdate.
  remove({ hotspot, collider, updater, object }) {
    if (hotspot) this.hotspots = this.hotspots.filter((s) => s !== hotspot);
    if (collider) this.colliders = this.colliders.filter((c) => c !== collider);
    if (updater) this.updaters = this.updaters.filter((f) => f !== updater);
    if (object) this.scene.remove(object);
  }

  // Wirft ein Teil (Zug, Passanten, Regen …), laufen die übrigen trotzdem weiter.
  update(dt, time, ctx) {
    for (const fn of this.updaters) {
      try {
        fn(dt, time, ctx);
      } catch (err) {
        reportError(`Ort ${this.id}`, err);
      }
    }
  }

  heightAt(x, z) {
    let h = 0;
    for (const r of this.raised) {
      if (x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ) h = Math.max(h, r.h);
    }
    return h;
  }
}
