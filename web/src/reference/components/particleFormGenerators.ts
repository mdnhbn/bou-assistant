/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

export const PARTICLE_COUNT = 28000;

/**
 * Creates a soft glowing radial particle dot texture using HTML5 Canvas.
 * No external asset dependency, instant loading.
 */
export function createGlowParticleTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.18, 'rgba(210, 245, 255, 0.95)');
    gradient.addColorStop(0.45, 'rgba(56, 189, 248, 0.5)');
    gradient.addColorStop(0.8, 'rgba(14, 165, 233, 0.15)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Procedural point generation for [ ORB ]:
 * Celestial nebula sphere with dense pulsing core + outer orbital halo.
 */
export function generateOrbPoints(count: number): Float32Array {
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const isCore = i < count * 0.45;
    const isRing = i > count * 0.85;

    if (isCore) {
      // Dense volumetric core
      const r = Math.pow(Math.random(), 0.65) * 0.75;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      positions[i3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = r * Math.cos(phi);
    } else if (isRing) {
      // Saturn-like orbital stardust ring halo
      const angle = Math.random() * Math.PI * 2;
      const dist = 0.95 + Math.random() * 0.45;
      const ringTilt = 0.35;

      const rx = Math.cos(angle) * dist;
      const rz = Math.sin(angle) * dist;
      const ry = (Math.random() - 0.5) * 0.08 + rx * Math.sin(ringTilt);

      positions[i3] = rx * Math.cos(ringTilt);
      positions[i3 + 1] = ry;
      positions[i3 + 2] = rz;
    } else {
      // Outer spherical shell with fibonacci-like dispersion
      const r = 0.68 + Math.random() * 0.38;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      positions[i3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = r * Math.cos(phi);
    }
  }

  return positions;
}

/**
 * Procedural point generation for [ FEMALE ] (Bou bust):
 * Ethereal feminine humanoid bust (head, gentle hair contours, slender neck, shoulders).
 */
export function generateFemaleBustPoints(count: number): Float32Array {
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const rand = Math.random();

    let x = 0;
    let y = 0;
    let z = 0;

    if (rand < 0.38) {
      // Cranium and delicate feminine face
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = v * Math.PI;

      // Feminine oval head shape (tapering towards chin)
      const headRadius = 0.38 + Math.sin(phi) * 0.04;
      const yNorm = Math.cos(phi);
      const taper = yNorm < 0 ? 1.0 + yNorm * 0.32 : 1.0 - yNorm * 0.08;

      x = headRadius * Math.sin(phi) * Math.cos(theta) * taper * 0.88;
      y = headRadius * yNorm * 1.15 + 0.32;
      z = headRadius * Math.sin(phi) * Math.sin(theta) * taper * 0.95;

      // Soft nose & chin contour emphasis on front
      if (z > 0.15 && y > 0.15 && y < 0.45) {
        z += 0.05 * Math.sin((y - 0.15) * 10);
      }
    } else if (rand < 0.65) {
      // Flowing ethereal hair strands framing head and cascading down
      const angle = (Math.random() * 0.85 + 0.1) * Math.PI * 2;
      const hairLen = Math.random();
      const strandSpread = (Math.random() - 0.5) * 0.12;

      const arcX = Math.cos(angle) * (0.42 + hairLen * 0.18) + strandSpread;
      const arcZ = Math.sin(angle) * (0.38 + hairLen * 0.15);
      const arcY = 0.52 - hairLen * 0.85 + Math.sin(angle * 3) * 0.04;

      x = arcX * 0.95;
      y = arcY;
      z = arcZ * 0.92;
    } else if (rand < 0.78) {
      // Slender neck and throat
      const theta = Math.random() * Math.PI * 2;
      const h = Math.random();
      const r = 0.14 + (1 - h) * 0.06;

      x = Math.cos(theta) * r;
      y = -0.05 - h * 0.22;
      z = Math.sin(theta) * r * 0.92;
    } else {
      // Graceful shoulders and collarbone / upper chest
      const side = Math.random() > 0.5 ? 1 : -1;
      const t = Math.random(); // 0 to 1 distance from neck to shoulder edge
      const shoulderX = side * (0.16 + t * 0.78);
      const shoulderY = -0.26 - Math.pow(t, 1.4) * 0.22 + (Math.random() - 0.5) * 0.08;
      const shoulderZ = (Math.random() - 0.5) * (0.28 * (1 - t * 0.5));

      x = shoulderX;
      y = shoulderY;
      z = shoulderZ;
    }

    positions[i3] = x;
    positions[i3 + 1] = y;
    positions[i3 + 2] = z;
  }

  return positions;
}

/**
 * Procedural point generation for [ MALE ] (Aether bust):
 * Ethereal masculine humanoid bust (chiseled jawline, brow, wider athletic shoulders).
 */
export function generateMaleBustPoints(count: number): Float32Array {
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const rand = Math.random();

    let x = 0;
    let y = 0;
    let z = 0;

    if (rand < 0.42) {
      // Stronger cranium, angular jawline & brow
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = v * Math.PI;

      const yNorm = Math.cos(phi);
      // Chiseled jaw angle modification
      const jawBox = yNorm < 0 ? 0.92 + Math.abs(Math.sin(theta * 2)) * 0.12 : 1.0;
      const headRadius = 0.41;

      x = headRadius * Math.sin(phi) * Math.cos(theta) * jawBox * 0.96;
      y = headRadius * yNorm * 1.12 + 0.35;
      z = headRadius * Math.sin(phi) * Math.sin(theta) * jawBox;

      // Defined brow ridge
      if (z > 0.2 && y > 0.36 && y < 0.44) {
        z += 0.045;
      }
    } else if (rand < 0.62) {
      // Short structured hair & cybernetic crest
      const angle = Math.random() * Math.PI * 2;
      const r = 0.42 + Math.random() * 0.06;
      const h = Math.random() * 0.25;

      x = Math.cos(angle) * r;
      y = 0.48 + h + (Math.random() - 0.5) * 0.04;
      z = Math.sin(angle) * r;
    } else if (rand < 0.74) {
      // Athletic neck and trapezius connection
      const theta = Math.random() * Math.PI * 2;
      const h = Math.random();
      const r = 0.19 + (1 - h) * 0.09;

      x = Math.cos(theta) * r;
      y = -0.04 - h * 0.24;
      z = Math.sin(theta) * r * 0.95;
    } else {
      // Broad athletic shoulders and squared collar line
      const side = Math.random() > 0.5 ? 1 : -1;
      const t = Math.random();
      const shoulderX = side * (0.2 + t * 0.92); // Wider shoulder profile
      const shoulderY = -0.28 - Math.pow(t, 1.2) * 0.18 + (Math.random() - 0.5) * 0.08;
      const shoulderZ = (Math.random() - 0.5) * (0.34 * (1 - t * 0.4));

      x = shoulderX;
      y = shoulderY;
      z = shoulderZ;
    }

    positions[i3] = x;
    positions[i3 + 1] = y;
    positions[i3 + 2] = z;
  }

  return positions;
}
