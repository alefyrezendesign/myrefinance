import { useState } from 'react';
import { User, List, Plus } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { CategoryModal } from '../../components/domain/CategoryModal';
import { TagModal } from '../../components/domain/TagModal';
import type { Category, Person as PersonType } from '../../types';
import styles from './Settings.module.css';

export function Settings() {
  const { data } = useFinance();
  const [activeTab, setActiveTab] = useState<'income' | 'expense' | 'people'>('income');

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | undefined>(undefined);

  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<PersonType | undefined>(undefined);

  const handleAddCategory = () => {
    setSelectedCategory(undefined);
    setIsCategoryModalOpen(true);
  };

  const handleEditCategory = (category: Category) => {
    setSelectedCategory(category);
    setIsCategoryModalOpen(true);
  };

  const handleAddTag = () => {
    setSelectedTag(undefined);
    setIsTagModalOpen(true);
  };

  const handleEditTag = (tag: PersonType) => {
    setSelectedTag(tag);
    setIsTagModalOpen(true);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Categorias e Pessoas</h1>
      </header>

      <div className={styles.tabsContainer}>
        <button 
          className={activeTab === 'income' ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab('income')}
        >
          Receita
        </button>
        <button 
          className={activeTab === 'expense' ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab('expense')}
        >
          Despesa
        </button>
        <button 
          className={activeTab === 'people' ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab('people')}
        >
          Pessoas
        </button>
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            {activeTab === 'people' ? <User size={20} /> : <List size={20} />} 
            {activeTab === 'income' ? 'Categorias de Receita' : activeTab === 'expense' ? 'Categorias de Despesa' : 'Pessoas'}
          </h2>
          <button 
            className={styles.addButton} 
            onClick={activeTab === 'people' ? handleAddTag : handleAddCategory}
          >
            <Plus size={16} /> Nova
          </button>
        </div>
        
        <div className={styles.listContainer}>
          {activeTab === 'people' ? (
            data.people.length === 0 ? (
               <p className={styles.emptyText}>Nenhuma pessoa cadastrada.</p>
            ) : (
              data.people.map(t => (
                <div key={t.id} className={styles.listItem} onClick={() => handleEditTag(t)}>
                  <span>{t.name}</span>
                </div>
              ))
            )
          ) : (
            data.categories.filter(c => c.type === activeTab).length === 0 ? (
              <p className={styles.emptyText}>Nenhuma categoria cadastrada.</p>
            ) : (
              data.categories.filter(c => c.type === activeTab).map(c => (
                <div key={c.id} className={styles.listItem} onClick={() => handleEditCategory(c)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ 
                      width: 14, height: 14, borderRadius: '50%', backgroundColor: c.color, 
                      display: 'inline-block', flexShrink: 0 
                    }} />
                    <span>{c.name}</span>
                  </div>
                </div>
              ))
            )
          )}
        </div>
      </section>
      
      <div className={styles.paddingBottom} />

      <CategoryModal 
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categoryToEdit={selectedCategory}
      />

      <TagModal
        isOpen={isTagModalOpen}
        onClose={() => setIsTagModalOpen(false)}
        tagToEdit={selectedTag}
      />
    </div>
  );
}
