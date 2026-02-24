import React, { Component, useState, useEffect, ReactNode } from 'react';
import { DB, supabase } from './db';
import { UserRole, User, Diet } from './types';
import { DietEditor } from './components/DietEditor';
import { DietViewer } from './components/DietViewer';
import { useI18n } from './i18n';

// 1. CLASS ERROR BOUNDARY (Properly typed to avoid build errors)
interface EBProps { children: ReactNode; }
interface EBState { hasError: boolean; error: any; }

class ErrorBoundary extends Component<EBProps, EBState> {
  public state: EBState = { hasError: false, error: null };

  static getDerivedStateFromError(error: any): EBState {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ background: '#450a0a', color: 'white', padding: '40px', height: '100vh', fontFamily: 'sans-serif', overflow: 'auto' }}>
          <h1 style={{ color: '#f87171', fontSize: '24px', fontWeight: '900' }}>CRITICAL UI ERROR</h1>
          <p style={{ opacity: 0.7 }}>Hubo un error en la interfaz de React. Detalle técnico:</p>
          <pre style={{ background: 'black', padding: '20px', borderRadius: '10px', fontSize: '11px', whiteSpace: 'pre-wrap' }}>
            {this.state.error?.stack || String(this.state.error)}
          </pre>
          <button
            onClick={() => { localStorage.clear(); window.location.reload(); }}
            style={{ marginTop: '20px', padding: '15px 30px', background: 'white', color: '#450a0a', border: 'none', borderRadius: '30px', fontWeight: '900', cursor: 'pointer' }}
          >
            LIMPIAR Y REINICIAR
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// 2. MAIN APP COMPONENT
const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
};

const AppContent: React.FC = () => {
  // HYPER-ROBUST param detection (handles ?, #, and direct string search)
  const getParam = (name: string) => {
    // 1. Standard search
    const s = new URLSearchParams(window.location.search);
    if (s.get(name)) return s.get(name);

    // 2. Hash search (e.g., #dietId=xxx or #/path?dietId=xxx)
    const h = window.location.hash.substring(1);
    const hp = new URLSearchParams(h.includes('?') ? h.split('?')[1] : h);
    if (hp.get(name)) return hp.get(name);

    // 3. Fallback: manual splitting for weird URL formats
    const all = window.location.href;
    const parts = all.split(/[?&#]/);
    for (const p of parts) {
      if (p.toLowerCase().startsWith(name.toLowerCase() + '=')) {
        return p.split('=')[1];
      }
    }
    return null;
  };

  const [user, setUser] = useState<User | null>(() => {
    const dId = getParam('dietId');
    const role = getParam('role')?.toUpperCase();
    const sRole = localStorage.getItem('mm_user_role');
    const sDId = localStorage.getItem('mm_active_diet_id');

    if (dId) {
      if (role === 'CREATOR') return { id: 'builder', name: 'Coach', role: UserRole.CREATOR };
      // Force Client role for Link users
      localStorage.setItem('mm_user_role', UserRole.CLIENT);
      localStorage.setItem('mm_active_diet_id', dId);
      return { id: 'client-guest', name: 'Client', role: UserRole.CLIENT };
    }
    if (sRole === UserRole.CREATOR) return { id: 'builder', name: 'Coach', role: UserRole.CREATOR };
    if (sRole === UserRole.CLIENT && sDId) return { id: 'client-guest', name: 'Client', role: UserRole.CLIENT };
    return null;
  });

  const [diets, setDiets] = useState<Diet[]>([]);
  const [activeDietId, setActiveDietId] = useState<string | null>(() => {
    return getParam('dietId') || (localStorage.getItem('mm_user_role') === UserRole.CLIENT ? localStorage.getItem('mm_active_diet_id') : null);
  });

  // Aggressive Hash Listener (Handles navigation within PWA/App mode)
  useEffect(() => {
    const handleNavigation = () => {
      const dId = getParam('dietId');
      if (dId && !user) {
        setUser({ id: 'client-guest', name: 'Client', role: UserRole.CLIENT });
        setActiveDietId(dId);
        localStorage.setItem('mm_user_role', UserRole.CLIENT);
        localStorage.setItem('mm_active_diet_id', dId);
      }
    };
    window.addEventListener('hashchange', handleNavigation);
    return () => window.removeEventListener('hashchange', handleNavigation);
  }, [user]);

  const { t, lang, changeLanguage } = useI18n();
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>((localStorage.getItem('mm_theme') as any) || 'dark');

  useEffect(() => {
    localStorage.setItem('mm_theme', theme);
    document.documentElement.classList.toggle('dark-theme', theme === 'dark');
    document.body.classList.toggle('light-mode', theme === 'light');
  }, [theme]);

  const loadDiets = async () => {
    try {
      const data = await DB.getDiets();
      setDiets(data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (user?.role === UserRole.CREATOR) loadDiets();
  }, [user?.role]);

  const handleLogin = (role: UserRole) => {
    localStorage.setItem('mm_user_role', UserRole.CREATOR);
    localStorage.removeItem('mm_active_diet_id');
    setUser({ id: 'builder-' + Date.now(), name: 'Builder', role: UserRole.CREATOR });
    setActiveDietId(null);
    loadDiets();
    supabase.auth.signInAnonymously().catch(() => { });
  };

  const logout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    window.location.href = window.location.origin + window.location.pathname;
  };

  const deleteDiet = async (id: string) => {
    const { error } = await supabase.from('diets').delete().eq('id', id);
    if (!error) setDiets(prev => prev.filter(d => d.id !== id));
    setShowDeleteConfirm(null);
  };

  // 4. AGGRESSIVE REDIRECT SPLASH
  // If we have a dietId but no user yet, show ONLY the loading screen to avoid flickering login buttons
  if (!user && (getParam('dietId') || localStorage.getItem('mm_active_diet_id'))) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center gap-4 bg-black">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-white/40 text-xs font-black uppercase tracking-widest">Cargando Plan...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center p-8 bg-black">
        <div className="text-center space-y-16 max-w-sm w-full">
          <div className="space-y-6">
            <div className="w-24 h-24 bg-blue-600 rounded-[32px] mx-auto flex items-center justify-center rotate-3 border border-white/10">
              <i className="fas fa-bolt text-white text-5xl"></i>
            </div>
            <div className="space-y-2">
              <h1 className="text-6xl font-black text-white tracking-tighter italic">MacroMind</h1>
              <p className="text-white/30 font-bold uppercase tracking-[0.4em] text-[9px]">{t('perfect_plan')}</p>
            </div>
          </div>
          <button
            onClick={() => handleLogin(UserRole.CREATOR)}
            className="w-full bg-blue-600 text-white py-8 rounded-[32px] font-black text-xl shadow-2xl active:scale-95 transition-all uppercase tracking-widest border-b-8 border-black/20"
          >
            {t('im_builder')}
          </button>
          <div className="mt-8 opacity-40 text-[9px] font-mono text-center">v1.6.0 (Final Stability Fix)</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col overflow-hidden relative">
      <div className="fixed z-[200] flex items-center gap-2" style={{ top: '1.5rem', right: '1.5rem' }}>
        <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="ios-blur w-10 h-10 rounded-full flex items-center justify-center border border-white/20">
          <i className={`fas fa-${theme === 'dark' ? 'sun text-yellow-400' : 'moon text-blue-600'}`}></i>
        </button>
        <button onClick={() => changeLanguage(lang === 'ES' ? 'EN' : lang === 'EN' ? 'IT' : 'ES')} className="ios-blur w-10 h-10 rounded-full flex items-center justify-center border border-white/20 text-[10px] font-black">{lang}</button>
      </div>

      <div className="flex-1 overflow-y-auto w-full">
        {user.role === UserRole.CREATOR ? (
          activeDietId ? (
            <DietEditor dietId={activeDietId} onBack={() => { setActiveDietId(null); loadDiets(); }} />
          ) : (
            <div className="max-w-md mx-auto px-6 py-12 pb-32">
              <div className="flex justify-between items-start mb-10 text-main">
                <div>
                  <h1 className="text-4xl font-black">{t('my_plans')}</h1>
                  <p className="text-sub font-medium opacity-50">{t('builder_panel')}</p>
                </div>
                <button onClick={logout} className="bg-red-500/10 text-red-500 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest">{t('close')}</button>
              </div>
              <button
                onClick={() => setActiveDietId('new')}
                className="w-full bg-blue-600 text-white py-6 rounded-[32px] font-black text-xl mb-10 shadow-xl shadow-blue-600/30 flex items-center justify-center gap-3 active:scale-95 transition-transform"
              >
                <i className="fas fa-plus-circle"></i> {t('new_plan')}
              </button>
              <div className="space-y-5">
                <h2 className="text-[10px] font-black text-sub uppercase tracking-[0.3em] px-2 opacity-50">{t('diet_list')}</h2>
                {diets.map(d => (
                  <div key={d.id} className="ios-card rounded-[32px] p-6 flex justify-between items-center group active:scale-[0.98] transition-all">
                    <div className="flex-1 pr-4">
                      <h3 className="text-xl font-bold truncate text-main">{d.name}</h3>
                      <p className="text-sm text-sub font-medium opacity-60">{d.targetCalories} kcal</p>
                    </div>
                    <div className="flex gap-2 text-lg">
                      <button onClick={() => setShowDeleteConfirm(d.id)} className="bg-red-500/10 text-red-500 h-14 w-14 rounded-2xl flex items-center justify-center"><i className="fas fa-trash-alt"></i></button>
                      <button onClick={() => setActiveDietId(d.id)} className="bg-blue-600 text-white h-14 w-14 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20"><i className="fas fa-edit"></i></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        ) : (
          <DietViewer dietId={activeDietId || ''} />
        )}
      </div>

      {user && (
        <div className="fixed bottom-0 left-0 right-0 ios-blur border-t border-[var(--border-color)] px-10 pt-4 flex justify-between items-center z-[90] no-print" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}>
          <button onClick={() => { if (user.role === UserRole.CREATOR) setActiveDietId(null); }} className={`flex flex-col items-center gap-1.5 transition-all ${(user.role === UserRole.CREATOR && !activeDietId) || (user.role === UserRole.CLIENT) ? 'text-blue-500 scale-110' : 'text-sub opacity-50'}`}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-blue-500/10"><i className="fas fa-utensils text-xl"></i></div>
            <span className="text-[9px] font-black uppercase tracking-[0.2em]">{t('nutrition')}</span>
          </button>
          {user.role === UserRole.CREATOR && (
            <button onClick={() => setActiveDietId(null)} className={`flex flex-col items-center gap-1.5 transition-all ${!activeDietId ? 'text-blue-500 scale-110' : 'text-sub opacity-50'}`}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-blue-500/10"><i className="fas fa-calendar-alt text-xl"></i></div>
              <span className="text-[9px] font-black uppercase tracking-[0.2em]">{t('my_plans')}</span>
            </button>
          )}
          <button onClick={logout} className="text-sub flex flex-col items-center gap-1.5 opacity-40 hover:opacity-100 transition-opacity">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-red-500/5"><i className="fas fa-power-off text-xl text-red-500/60"></i></div>
            <span className="text-[9px] font-black uppercase tracking-[0.2em]">{t('logout')}</span>
          </button>
        </div>
      )}

      {/* DELETE MODAL */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-center justify-center p-6" onClick={() => setShowDeleteConfirm(null)}>
          <div className="ios-card w-full max-w-sm rounded-[40px] p-8 bg-[var(--card-bg)] border border-[var(--border-color)] space-y-6" onClick={e => e.stopPropagation()}>
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto"><i className="fas fa-trash-alt text-3xl text-red-500"></i></div>
              <h3 className="text-xl font-black text-main">{t('delete_plan_confirm')}</h3>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(null)} className="flex-1 bg-[var(--input-bg)] text-main py-4 rounded-[24px] font-black text-sm uppercase tracking-widest">{t('cancel')}</button>
              <button onClick={() => deleteDiet(showDeleteConfirm)} className="flex-1 bg-red-500 text-white py-4 rounded-[24px] font-black text-sm uppercase tracking-widest shadow-xl shadow-red-500/20">{t('delete')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
