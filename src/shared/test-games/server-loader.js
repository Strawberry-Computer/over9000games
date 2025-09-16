// Server-side loader that returns raw game code (no QuickJS execution)
import simpleMovementCode from './simple-movement.js?raw';
import pongCode from './pong.js?raw';
import platformerCode from './platformer.js?raw';

const testGameCode = {
  'simple-movement': simpleMovementCode,
  'pong': pongCode,
  'platformer': platformerCode
};

export function getTestGameCode(gameName) {
  const gameCode = testGameCode[gameName];
  if (!gameCode) {
    throw new Error(`Unknown test game: ${gameName}`);
  }
  return gameCode;
}

export function getAvailableTestGames() {
  return Object.keys(testGameCode);
}