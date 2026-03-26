import type { Variants } from 'framer-motion';

// --- Timing Tokens ---
export const motionDurations = {
  veryFast: 0.15,
  fast: 0.2,
  base: 0.3,
  slow: 0.5,
};

// --- Easing Tokens ---
export const motionEasings = {
  // A standard, very smooth and professional ease-out
  default: [0.16, 1, 0.3, 1] as const,
  // Smooth entering
  enter: [0.0, 0.0, 0.2, 1] as const,
  // Smooth exiting
  exit: [0.4, 0.0, 1, 1] as const,
  // Spring configurations for natural feel
  springSmooth: { type: 'spring', stiffness: 300, damping: 30, mass: 1 },
  springBouncy: { type: 'spring', stiffness: 400, damping: 25, mass: 1 },
};

// --- View/Page Transitions ---
export const pageTransitionVariants: Variants = {
  initial: {
    opacity: 0,
    y: 10,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: motionDurations.base,
      ease: motionEasings.default,
      when: 'beforeChildren',
      staggerChildren: 0.05,
    },
    transitionEnd: {
      transform: 'none',
      WebkitTransform: 'none',
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: motionDurations.fast,
      ease: motionEasings.exit,
    },
  },
};

// --- Modal Transitions (Scale + Fade) ---
export const modalOverlayVariants: Variants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1, 
    transition: { duration: motionDurations.fast, ease: motionEasings.enter } 
  },
  exit: { 
    opacity: 0, 
    transition: { duration: motionDurations.veryFast, ease: motionEasings.exit } 
  },
};

export const modalContentVariants: Variants = {
  initial: { opacity: 0, scale: 0.96, y: 10 },
  animate: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: { duration: motionDurations.base, ease: motionEasings.default } 
  },
  exit: { 
    opacity: 0, 
    scale: 0.98, 
    y: 5,
    transition: { duration: motionDurations.veryFast, ease: motionEasings.exit } 
  },
};

// --- Bottom Sheet Transitions ---
export const bottomSheetVariants: Variants = {
  initial: { opacity: 0, y: '100%' },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { type: 'spring', stiffness: 350, damping: 35 } 
  },
  exit: { 
    opacity: 0, 
    y: '100%',
    transition: { duration: motionDurations.fast, ease: motionEasings.exit } 
  },
};

// --- List Items / Stagger Children ---
export const staggereContainerVariants: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.02,
    },
  },
  exit: {
    opacity: 0,
    transition: { staggerChildren: 0.02, staggerDirection: -1 },
  },
};

export const listItemVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: motionDurations.base, ease: motionEasings.default }
  },
  exit: { 
    opacity: 0, 
    y: -5, 
    transition: { duration: motionDurations.fast, ease: motionEasings.exit } 
  },
};

// --- Micro-interactions ---
export const tapScale = 0.97;
export const hoverScale = 1.02;

export const buttonScaleVariants = {
  hover: { scale: hoverScale, transition: { duration: 0.1 } },
  tap: { scale: tapScale, transition: { duration: 0.1 } },
};
