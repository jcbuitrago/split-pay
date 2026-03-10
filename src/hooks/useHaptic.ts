export function useHaptic() {
  function haptic(pattern: number | number[] = 50) {
    if ('vibrate' in navigator) navigator.vibrate(pattern);
  }
  return haptic;
}
