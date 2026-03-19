import { useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { BottomBar } from './BottomBar';
import { TransactionMenu } from '../domain/TransactionMenu';
import { TransactionModal } from '../domain/TransactionModal';
import styles from './Layout.module.css';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<'income' | 'expense' | null>(null);
  
  const location = useLocation();
  const isAuthPage = location.pathname === '/login';

  const handleSelectType = (type: 'income' | 'expense') => {
    setIsMenuOpen(false);
    setTransactionType(type);
    setIsTransactionModalOpen(true);
  };

  return (
    <div className={styles.container} style={{ minHeight: isAuthPage ? '100vh' : undefined }}>
      <main className={styles.mainContent} style={{ padding: isAuthPage ? 0 : undefined, overflow: isAuthPage ? 'hidden' : 'auto' }}>
        {children}
      </main>
      
      {!isAuthPage && (
        <>
          <BottomBar onFabClick={() => setIsMenuOpen(true)} />
          
          <TransactionMenu 
            isOpen={isMenuOpen} 
            onClose={() => setIsMenuOpen(false)} 
            onSelectType={handleSelectType}
          />
          
          <TransactionModal
            isOpen={isTransactionModalOpen}
            type={transactionType}
            onClose={() => setIsTransactionModalOpen(false)}
          />
        </>
      )}
    </div>
  );
}
