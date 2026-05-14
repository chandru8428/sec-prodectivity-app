/**
 * Countdown Timer Utility
 */
export function startCountdown(targetDate, element, onComplete) {
  function update() {
    const now = new Date().getTime();
    const target = new Date(targetDate).getTime();
    const diff = target - now;

    if (diff <= 0) {
      element.textContent = 'Now!';
      element.classList.add('countdown-expired');
      onComplete?.();
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (days > 0) {
      element.textContent = `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      element.textContent = `${hours}h ${minutes}m ${seconds}s`;
    } else {
      element.textContent = `${minutes}m ${seconds}s`;
    }

    requestAnimationFrame(update);
  }

  update();
}

export function formatCountdown(targetDate) {
  const now = new Date().getTime();
  const target = new Date(targetDate).getTime();
  const diff = target - now;

  if (diff <= 0) return 'Completed';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h`;
  return 'Less than 1h';
}
