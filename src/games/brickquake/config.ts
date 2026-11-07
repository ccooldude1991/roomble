/* Shared constants for Brickquake. Used by both the pure logic and the scene. */
export const LOGICAL_W = 400;
export const LOGICAL_H = 640;

export const COLS = 10;
export const CELL_W = 38;
export const CELL_H = 20;
export const MARGIN_X = 10; // (400 - 10*38) / 2 = 10
export const MARGIN_TOP = 80;
export const MAX_ROWS = 16;

export const BALL_R = 6;
export const BALL_SPEED = 260;
export const BALL_SPEED_STEP = 6; // per paddle hit, within a stage
export const BALL_SPEED_MAX = 430;
export const MIN_VY = 120; // never near-horizontal / stuck in a loop
export const SUBSTEP_MAX = CELL_H / 2; // move at most this far per collision substep (anti-tunnel)

export const PADDLE_Y = 600;
export const PADDLE_H = 12;
export const PADDLE_W = 72;
export const PADDLE_W_WIDE = 112;
export const PADDLE_W_NARROW = 48;
export const PADDLE_MAX_ANGLE = (60 * Math.PI) / 180; // from vertical

export const LIVES = 3;
export const BOSS_EVERY = 5;

export const cellX = (col: number): number => MARGIN_X + col * CELL_W;
export const cellY = (row: number): number => MARGIN_TOP + row * CELL_H;
