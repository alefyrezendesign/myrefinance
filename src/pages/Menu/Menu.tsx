import { PieChart, CreditCard, List, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import styles from './Menu.module.css';

export function Menu() {
  const navigate = useNavigate();

  const menuItems = [
    { id: 'cartoes', label: 'Cartões de Crédito', icon: <CreditCard size={24} />, path: '/cards' },
    { id: 'categorias', label: 'Categorias e Pessoas', icon: <List size={24} />, path: '/settings' },
    { id: 'relatorios', label: 'Relatórios', icon: <PieChart size={24} />, path: '/reports' },
  ];

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Mais opções</h1>
      </header>

      <div className={styles.menuList}>
        {menuItems.map(item => (
          <button 
            key={item.id} 
            className={styles.menuItem}
            onClick={() => navigate(item.path)}
          >
            <div className={styles.itemIcon}>{item.icon}</div>
            <span className={styles.itemLabel}>{item.label}</span>
            <ChevronRight size={20} className={styles.chevron} />
          </button>
        ))}
      </div>
    </div>
  );
}
