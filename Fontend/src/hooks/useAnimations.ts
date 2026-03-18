import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Animated counter from 0 → target value.
 * Used for risk score percentage display.
 */
export function useCountUp(
  target: number | null,
  duration: number = 1800,
  enabled: boolean = true
): number {
  const [current, setCurrent] = useState(0);
  const prevTarget = useRef<number | null>(null);

  useEffect(() => {
    if (target === null || !enabled) {
      setCurrent(0);
      prevTarget.current = null;
      return;
    }

    // Only animate when target changes
    if (prevTarget.current === target) return;
    prevTarget.current = target;

    const startValue = 0;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(startValue + (target - startValue) * eased);

      setCurrent(value);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [target, duration, enabled]);

  return current;
}

/**
 * Detect when an element enters the viewport.
 * Triggers animations on scroll.
 */
export function useInView(
  options: IntersectionObserverInit = { threshold: 0.1 }
): [React.RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true);
        observer.unobserve(el); // Only trigger once
      }
    }, options);

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, inView];
}

/**
 * Returns the appropriate stagger delay class based on index.
 */
export function getStaggerClass(index: number): string {
  const delayNum = Math.min(index + 1, 8);
  return `anim-delay-${delayNum}`;
}

/**
 * Creates a ripple effect on button click.
 * Call this in the onClick handler and pass the event.
 */
export function createRipple(event: React.MouseEvent<HTMLElement>) {
  const button = event.currentTarget;
  const rect = button.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  const ripple = document.createElement('span');
  ripple.className = 'ripple-effect';
  ripple.style.left = `${x - 10}px`;
  ripple.style.top = `${y - 10}px`;

  button.appendChild(ripple);

  setTimeout(() => {
    ripple.remove();
  }, 600);
}
