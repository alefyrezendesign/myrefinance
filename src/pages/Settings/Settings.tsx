import { useState, useEffect, useCallback } from 'react';
import { User, List, Plus, Bell, BellOff, CheckCircle, AlertTriangle } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import { requestNotificationPermission, getNotificationStatus } from '../../lib/onesignal';
import { CategoryModal } from '../../components/domain/CategoryModal';
import { TagModal } from '../../components/domain/TagModal';
import type { Category, Person as PersonType } from '../../types';
import styles from './Settings.module.css';

type SettingsView = 'categories' | 'notifications';

export function Settings() {
  const { data } = useFinance();
  const { user } = useAuth();
  const [activeView, setActiveView] = useState<SettingsView>('categories');
  const [activeTab, setActiveTab] = useState<'income' | 'expense' | 'people'>('income');

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | undefined>(undefined);

  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<PersonType | undefined>(undefined);

  // Notification state
  const [notifStatus, setNotifStatus] = useState<{ isSupported: boolean; permission: boolean; isSubscribed: boolean }>({ isSupported: false, permission: false, isSubscribed: false });
  const [isRequesting, setIsRequesting] = useState(false);

  const refreshNotifStatus = useCallback(() => {
    const status = getNotificationStatus();
    setNotifStatus(status);
  }, []);

  useEffect(() => {
    if (activeView === 'notifications') {
      refreshNotifStatus();
    }
  }, [activeView, refreshNotifStatus]);

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    await requestNotificationPermission();
    // Small delay for OneSignal to propagate
    setTimeout(() => {
      refreshNotifStatus();
      setIsRequesting(false);
    }, 1500);
  };

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
        <h1 className={styles.title}>Configurações</h1>
      </header>

      {/* View Switcher */}
      <div className={styles.viewTabs}>
        <button 
          className={activeView === 'categories' ? styles.viewTabActive : styles.viewTab}
          onClick={() => setActiveView('categories')}
        >
          <List size={16} />
          Categorias
        </button>
        <button 
          className={activeView === 'notifications' ? styles.viewTabActive : styles.viewTab}
          onClick={() => setActiveView('notifications')}
        >
          <Bell size={16} />
          Notificações
        </button>
      </div>

      {activeView === 'categories' && (
        <>
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
        </>
      )}

      {activeView === 'notifications' && (
        <section className={styles.section}>
          <div className={styles.notifCard}>
            <div className={styles.notifIconRow}>
              {notifStatus.permission ? (
                <div className={styles.notifIconCircle} style={{ background: 'rgba(0,200,83,0.12)', borderColor: 'rgba(0,200,83,0.3)' }}>
                  <Bell size={24} color="var(--color-primary-green)" />
                </div>
              ) : (
                <div className={styles.notifIconCircle} style={{ background: 'rgba(255,179,0,0.12)', borderColor: 'rgba(255,179,0,0.3)' }}>
                  <BellOff size={24} color="#FFB300" />
                </div>
              )}
            </div>

            <h3 className={styles.notifTitle}>
              {notifStatus.permission ? 'Notificações Ativas' : 'Notificações Desativadas'}
            </h3>
            <p className={styles.notifDesc}>
              {notifStatus.permission 
                ? 'Você receberá alertas de vencimento de faturas, despesas pendentes, limites de orçamento e lembretes de metas.'
                : 'Ative para receber alertas sobre faturas, despesas, limites de orçamento e metas financeiras.'
              }
            </p>

            {/* Status Items */}
            <div className={styles.notifStatusList}>
              <div className={styles.notifStatusItem}>
                <span className={styles.notifStatusLabel}>Permissão do Navegador</span>
                <span className={styles.notifStatusValue} style={{ color: notifStatus.permission ? 'var(--color-primary-green)' : '#FFB300' }}>
                  {notifStatus.permission ? (
                    <><CheckCircle size={14} /> Permitido</>
                  ) : (
                    <><AlertTriangle size={14} /> Pendente</>
                  )}
                </span>
              </div>
              <div className={styles.notifStatusItem}>
                <span className={styles.notifStatusLabel}>Inscrição Push</span>
                <span className={styles.notifStatusValue} style={{ color: notifStatus.isSubscribed ? 'var(--color-primary-green)' : 'var(--color-text-muted)' }}>
                  {notifStatus.isSubscribed ? (
                    <><CheckCircle size={14} /> Inscrito</>
                  ) : (
                    'Não inscrito'
                  )}
                </span>
              </div>
              {user && (
                <div className={styles.notifStatusItem}>
                  <span className={styles.notifStatusLabel}>User ID Vinculado</span>
                  <span className={styles.notifStatusValue} style={{ color: 'var(--color-text-muted)', fontSize: '11px', fontFamily: 'monospace' }}>
                    {user.id.slice(0, 8)}…
                  </span>
                </div>
              )}
            </div>

            {!notifStatus.permission && (
              <button 
                className={styles.notifActivateBtn}
                onClick={handleRequestPermission}
                disabled={isRequesting}
              >
                <Bell size={18} />
                {isRequesting ? 'Solicitando...' : 'Ativar Notificações Push'}
              </button>
            )}

            {notifStatus.permission && !notifStatus.isSubscribed && (
              <button 
                className={styles.notifActivateBtn}
                onClick={handleRequestPermission}
                disabled={isRequesting}
              >
                <Bell size={18} />
                {isRequesting ? 'Reconectando...' : 'Reconectar Inscrição Push'}
              </button>
            )}
          </div>

          <div className={styles.notifInfoCard}>
            <h4 className={styles.notifInfoTitle}>Tipos de Alerta</h4>
            <div className={styles.notifInfoGrid}>
              <div className={styles.notifInfoItem}>
                <span>💳</span>
                <span>Fechamento e vencimento de faturas</span>
              </div>
              <div className={styles.notifInfoItem}>
                <span>📅</span>
                <span>Despesas manuais próximas do vencimento</span>
              </div>
              <div className={styles.notifInfoItem}>
                <span>🛑</span>
                <span>Limite de categoria atingindo 85%</span>
              </div>
              <div className={styles.notifInfoItem}>
                <span>🎯</span>
                <span>Aportes pendentes em metas no dia 25</span>
              </div>
              <div className={styles.notifInfoItem}>
                <span>📊</span>
                <span>Relatório mensal disponível no dia 1º</span>
              </div>
            </div>
          </div>
        </section>
      )}

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
