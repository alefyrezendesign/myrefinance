import { useState } from 'react';
import { Goals } from '../Goals/Goals';
import { Limits } from '../Limits/Limits';
import styles from './Planning.module.css';

export function Planning() {
  const [activeTab, setActiveTab] = useState<'goals' | 'limits'>('goals');

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Metas</h1>
      </header>
      
      <div className={styles.tabsContainer}>
        <button 
          className={activeTab === 'goals' ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab('goals')}
        >
          Objetivos
        </button>
        <button 
          className={activeTab === 'limits' ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab('limits')}
        >
          Limites de Gastos
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === 'goals' ? <Goals /> : <Limits />}
      </div>
    </div>
  );
}
