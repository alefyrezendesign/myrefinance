import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowRight, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import styles from './Login.module.css';

export function Login() {
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // O e-mail do admin está hardcoded para manter a interface de Cofre apenas com senha
  const ADMIN_EMAIL = 'alefyrezendesign@gmail.com';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    
    setErrorMsg('');
    setIsLoading(true);
    
    const { error } = await login(ADMIN_EMAIL, password);
    
    if (!error) {
      navigate('/', { replace: true });
    } else {
      setIsLoading(false);
      setErrorMsg(error.message.includes('Invalid') ? 'Senha incorreta' : 'Erro ao realizar login. Tente novamente.');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.backgroundGlow}></div>
      <div className={styles.backgroundGlow2}></div>

      <motion.div 
        className={styles.loginCard}
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className={styles.header}>
          <motion.div 
            className={styles.logoContainer}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2, stiffness: 200, damping: 20 }}
          >
            <img src="/logo-myrefinance.png" alt="Logo" className={styles.logoImage} />
          </motion.div>
          
          <motion.h1 
            className={styles.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            MyRefinance
          </motion.h1>
          <motion.p 
            className={styles.subtitle}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.4 }}
          >
            Sua vida financeira, simplificada.
          </motion.p>
        </div>

        <motion.form 
          className={styles.form} 
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          <div className={styles.inputGroup}>
            <div className={styles.inputIconWrapper}>
              <Lock size={20} className={styles.inputIcon} />
            </div>
            <input 
              type="password" 
              className={`${styles.passwordInput} ${errorMsg ? styles.inputError : ''}`}
              placeholder="Digite sua senha de acesso" 
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              required
              autoFocus
            />
          </div>

          <AnimatePresence>
            {errorMsg && (
              <motion.div 
                className={styles.errorContainer}
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
              >
                <ShieldAlert size={16} />
                <span>{errorMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button 
            type="submit" 
            className={styles.submitButton}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={password.length === 0 || isLoading}
          >
            <span>{isLoading ? 'Entrando...' : 'Entrar'}</span>
            <ArrowRight size={20} />
          </motion.button>
        </motion.form>
      </motion.div>
    </div>
  );
}
