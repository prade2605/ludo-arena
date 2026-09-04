export const SAFE_ZONES = [0, 8, 13, 21, 26, 34, 39, 47];

export const PLAYER_CONFIG = {
  green:  { start: 0,  end: 50, homeBase: 100 },
  yellow: { start: 13, end: 11, homeBase: 200 },
  blue:   { start: 26, end: 24, homeBase: 300 },
  red:    { start: 39, end: 37, homeBase: 400 }
};

export function getNextPosition(color, currentPos, stepsWalked, dice) {
  if (currentPos === -1) {
    return dice === 6 ? { pos: PLAYER_CONFIG[color].start, steps: 0, isHome: false } : null;
  }

  const nextSteps = stepsWalked + dice;
  if (nextSteps > 56) return null;
  if (nextSteps === 56) return { pos: 'HOME', steps: 56, isHome: true };

  if (nextSteps > 50) {
    const laneIndex = nextSteps - 51;
    return { pos: PLAYER_CONFIG[color].homeBase + laneIndex, steps: nextSteps, isHome: false };
  }

  const nextPos = (currentPos + dice) % 52;
  return { pos: nextPos, steps: nextSteps, isHome: false };
}