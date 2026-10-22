// Importing @/routes loads every page, and with them BokehJS, which draws to a
// canvas at module load. jsdom has no canvas implementation.
import "vitest-canvas-mock";
