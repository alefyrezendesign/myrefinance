import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import styles from './SplashScreen.module.css';

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isTypingComplete, setIsTypingComplete] = useState(false);

  useEffect(() => {
    // Total duration of the splash screen before unmounting (2.8s)
    const timer = setTimeout(() => {
      onComplete();
    }, 2800);
    
    return () => clearTimeout(timer);
  }, [onComplete]);

  const text = "MyRefinance";

  return (
    <motion.div 
      className={styles.splashContainer}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
    >
      <div className={styles.content}>
        <motion.div
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ 
            type: "spring", 
            stiffness: 260, 
            damping: 20, 
            delay: 0.2 
          }}
          className={styles.logoWrapper}
        >
          <img src="/logo-myrefinance.png" alt="Logo MyRefinance" className={styles.logo} />
        </motion.div>
        
        <div className={styles.textContainer}>
          {text.split('').map((char, index) => (
            <motion.span
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.1,
                delay: 0.8 + index * 0.08, // Typing effect delay sequence
              }}
              onAnimationComplete={() => {
                if (index === text.length - 1) {
                  setIsTypingComplete(true);
                }
              }}
              className={styles.letter}
            >
              {char}
            </motion.span>
          ))}
          {/* Typing cursor that blinks */}
          <motion.span 
            className={styles.cursor}
            initial={{ opacity: 0 }}
            animate={{ opacity: isTypingComplete ? 0 : [0, 1, 0] }}
            transition={{
              duration: 0.8,
              repeat: isTypingComplete ? 0 : Infinity,
              ease: "linear",
              delay: 0.8
            }}
          />
        </div>
      </div>
      
      <div className={styles.glow} />
    </motion.div>
  );
}
