/* .cube 3D LUT parsing + LUT sampling used by the canvas pixel pipeline. */
import type { Lut } from '../types';
import { uid } from '../types';

export interface ParsedCube {
  title: string;
  size: number;
  domain: [number, number];
  /** flat rgb triplets, blue changes fastest (as defined by the .cube spec) */
  data: number[];
}

export function parseCube(text: string): ParsedCube {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  let size = 0;
  let title = 'Imported LUT';
  let domainMin = 0;
  let domainMax = 1;
  const data: number[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const upper = line.toUpperCase();
    if (upper.startsWith('TITLE')) {
      const m = line.match(/"([^"]+)"/);
      if (m) title = m[1];
      continue;
    }
    if (upper.startsWith('LUT_3D_SIZE')) {
      size = parseInt(line.split(/\s+/)[1], 10);
      continue;
    }
    if (upper.startsWith('LUT_1D_SIZE')) {
      throw new Error('1D LUTs are not supported — please use a 3D .cube file');
    }
    if (upper.startsWith('DOMAIN_MIN')) {
      const p = line.split(/\s+/).slice(1).map(Number);
      domainMin = p[0];
      continue;
    }
    if (upper.startsWith('DOMAIN_MAX')) {
      const p = line.split(/\s+/).slice(1).map(Number);
      domainMax = p[0];
      continue;
    }
    if (/^[-\d.]+/.test(line)) {
      const p = line.split(/\s+/).map(Number);
      if (p.length >= 3 && p.every((n) => Number.isFinite(n))) data.push(p[0], p[1], p[2]);
    }
  }
  if (!size || size > 64) throw new Error('Unsupported LUT size');
  if (data.length !== size * size * size * 3) throw new Error('LUT data does not match its size');
  return { title, size, domain: [domainMin, domainMax], data };
}

export function importCube(text: string): Lut {
  const parsed = parseCube(text);
  return {
    id: uid('lut'),
    name: parsed.title,
    size: parsed.size,
    data: parsed.data,
    domain: parsed.domain,
    createdAt: Date.now(),
  };
}
