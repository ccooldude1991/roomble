/*
 * Arcbolt constants. The camera viewport is the logical resolution (640x360); the
 * arena is larger and the camera follows the player, bounded to the arena.
 */

export const LOGICAL_W = 640;
export const LOGICAL_H = 360;

export const ARENA_W = 1280;
export const ARENA_H = 720;

// Player
export const PLAYER_R = 9;
export const PLAYER_SPEED = 215;
export const HULL_MAX = 5;
export const INVULN_AFTER_HIT = 0.9; // s of mercy invulnerability after taking a hit

// Dash
export const DASH_SPEED = 640;
export const DASH_TIME = 0.16; // s of dash motion
export const DASH_IFRAME = 0.3; // s invulnerable while/after dashing
export const DASH_CD = 1.1; // s cooldown (reduced by upgrade)

// Bullets
export const BULLET_SPEED = 540;
export const BULLET_R = 3;
export const BULLET_LIFE = 0.95; // s
export const FIRE_CD = 0.22; // s base (reduced by fire-rate upgrade)

// Enemy bullets
export const EBULLET_SPEED = 190;
export const EBULLET_R = 4;
export const EBULLET_LIFE = 4;

// Pools (fixed caps — object counts must not grow across runs)
export const MAX_BULLETS = 400;
export const MAX_ENEMIES = 200;
export const MAX_PARTICLES_DESKTOP = 500;
export const MAX_PARTICLES_MOBILE = 220;
export const MAX_EBULLETS = 240;

export const GRID_CELL = 40;

export const COLORS = {
  bg: '#07040e',
  grid: '#1e1033',
  gridWarp: '#33204f',
  bezel: '#33204f',
  ticket: '#fff4dc',
  dim: '#c9b9a6',
  phosphor: '#4df0d0',
  marquee: '#ffc21a',
  joystick: '#ff3d6e',
  player: '#4df0d0',
} as const;
