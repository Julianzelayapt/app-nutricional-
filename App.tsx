
import React, { useState, useEffect } from 'react';
import { DB, supabase } from './db';
import { UserRole, User, Diet } from './types';
import { DietEditor } from './components/DietEditor';
import { DietViewer } from './components/DietViewer';
import { useI18n, Language } from './i18n';

const App: React.FC = () => {
  // Ultra-robust param detection (Case-insensitive & Hash-safe & Regex Fallback)
  const getParam = (name: string) => {
    // 1. Try standard search params
    const search = new URLSearchParams(window.location.search);
    for (const [key, value] of search.entries()) {
      if (key.toLowerCase() === name.toLowerCase()) return value;
    }

    // 2. Try hash params (Handles #dietId=123 AND #/route?dietId=123)
    // Remove the leading '#'
    const rawHash = window.location.hash.substring(1);
    // If it looks like a query string (has =), try parsing it directly
    const hashParams = new URLSearchParams(rawHash);
    for (const [key, value] of hashParams.entries()) {
      if (key.toLowerCase() === name.toLowerCase()) return value;
    }

    // Also try splitting by '?' in case of hash router style #/path?param=val
    if (rawHash.includes('?')) {
      const afterQuestion = rawHash.split('?')[1];
      const deepHashParams = new URLSearchParams(afterQuestion);
      for (const [key, value] of deepHashParams.entries()) {
        if (key.toLowerCase() === name.toLowerCase()) return value;
      }
    }

    // 3. Regex Fallback (The ultimate fallback for ANY part of the URL)
    const regex = new RegExp(`[?&#]${name}=([^&#]*)`, 'i');
    const match = window.location.href.match(regex);
    if (match) return match[1];

    return null;
  };

  const [user, setUser] = useState<User | null>(() => {
    const dietIdParam = getParam('dietId');
    const roleParam = getParam('role')?.toUpperCase();
    const savedRole = localStorage.getItem('mm_user_role');
    const savedDietId = localStorage.getItem('mm_active_diet_id');

    // 1. FORCE CLIENT VIEW IF LINK IS PRESENT
    if (dietIdParam) {
      if (roleParam === 'CREATOR') {
        return { id: 'builder', name: 'Coach', role: UserRole.CREATOR };
      }
      // Any link with a dietId that isn't explicitly role=CREATOR must be a client
      localStorage.setItem('mm_user_role', UserRole.CLIENT);
      localStorage.setItem('mm_active_diet_id', dietIdParam);
      return { id: 'client-guest', name: 'Client', role: UserRole.CLIENT };
    }

    // 2. NO URL PARAMS: Restore session
    if (savedRole === UserRole.CREATOR) {
      return { id: 'builder', name: 'Coach', role: UserRole.CREATOR };
    }

    if (savedRole === UserRole.CLIENT && savedDietId) {
      return { id: 'client-guest', name: 'Client', role: UserRole.CLIENT };
    }

    // 3. RECOVERY: If we have ANY dietId in storage but no role, force client
    if (savedDietId && !savedRole) {
      localStorage.setItem('mm_user_role', UserRole.CLIENT);
      return { id: 'client-guest', name: 'Client', role: UserRole.CLIENT };
    }

    return null;
  });

  const [diets, setDiets] = useState<Diet[]>([]);
  const [activeDietId, setActiveDietId] = useState<string | null>(() => {
    const dietIdParam = getParam('dietId');
    if (dietIdParam) return dietIdParam;

    const savedRole = localStorage.getItem('mm_user_role');
    if (savedRole === UserRole.CREATOR) return null;

    return localStorage.getItem('mm_active_diet_id');
  });
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const { t, lang, changeLanguage } = useI18n();

  const [theme, setTheme] = useState<'dark' | 'light'>((localStorage.getItem('mm_theme') as any) || 'dark');

  useEffect(() => {
    localStorage.setItem('mm_theme', theme);
    if (theme === 'light') {
      document.documentElement.classList.remove('dark-theme');
    } else {
      document.documentElement.classList.add('dark-theme');
    }
  }, [theme]);

  // 1. Initial Load
  useEffect(() => {
    const savedRole = localStorage.getItem('mm_user_role');

    if (savedRole === UserRole.CREATOR) {
      loadDiets();
    }
    loadFoods();
  }, []);

  // SAFETY RE-CHECK: If stuck on login but a link is present, FORCE it.
  useEffect(() => {
    if (!user) {
      const dietIdParam = getParam('dietId');
      if (dietIdParam) {
        console.log("Forcing client view from safety effect...");
        setUser({ id: 'client-guest', name: 'Client', role: UserRole.CLIENT });
        setActiveDietId(dietIdParam);
        localStorage.setItem('mm_user_role', UserRole.CLIENT);
        localStorage.setItem('mm_active_diet_id', dietIdParam);
      }
    }
  }, [user]);

  // Sync active diet to storage
  useEffect(() => {
    if (activeDietId) {
      localStorage.setItem('mm_active_diet_id', activeDietId);
    }
    if (user?.role) {
      localStorage.setItem('mm_user_role', user.role);
    }
  }, [activeDietId, user?.role]);

  const loadDiets = async () => {
    setLoading(true);
    const data = await DB.getDiets();
    setDiets(data);
    setLoading(false);
  };

  const loadFoods = async () => {
    await DB.getFoods();
  };

  const deleteDiet = async (dietId: string) => {
    // Note: DB.deleteDiet isn't implemented yet in db.ts artifact, assuming we might need it or handle via supabase direct
    // For now, let's just assume we delete it manually via supabase
    const { error } = await supabase.from('diets').delete().eq('id', dietId);
    if (!error) {
      setDiets(prev => prev.filter(d => d.id !== dietId));
    }
    setShowDeleteConfirm(null);
  };

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-mode');
    } else {
      document.body.classList.remove('light-mode');
    }
    localStorage.setItem('mm_theme', theme);
  }, [theme]);


  // Login handler
  const handleLogin = (role: UserRole) => {
    // 1. SET PERSISTENCE FIRST
    localStorage.setItem('mm_user_role', UserRole.CREATOR);
    localStorage.removeItem('mm_active_diet_id'); // Clear any past diet to start fresh at dashboard

    // 2. IMMEDIATE STATE
    setUser({
      id: 'builder-' + Date.now(),
      name: 'Builder',
      role: UserRole.CREATOR
    });
    setActiveDietId(null); // Ensure dashboard view
    loadDiets(); // Pre-load client diets

    // 3. SILENT AUTH
    supabase.auth.signInAnonymously().catch(() => { });
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    window.location.search = '';
  };

  // ---------------------------------------------------------------------------
  // CRITICAL: DISABLE LOGIN SCREEN IF LINK IS DETECTED
  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  // EMERGENCY BYPASS SYSTEM (The "Nuclear" Option)
  // ---------------------------------------------------------------------------
  const currentUrl = window.location.href.toLowerCase();
  const hasDietSignal = currentUrl.includes('dietid');

  if (!user && hasDietSignal) {
    // 1. Try to extract ID (Robustly)
    const effectiveDietId = getParam('dietId');

    // 2. If we found an ID, FORCE THE VIEWER
    if (effectiveDietId) {
      // Silent Auth Trigger (Anti-Race Condition)
      if (!supabase.auth.getSession().then(s => s.data.session)) {
        supabase.auth.signInAnonymously().catch(() => { });
      }

      console.log("EMERGENCY BYPASS: Rendering Viewer for", effectiveDietId);
      return <DietViewer dietId={effectiveDietId} onBack={logout} />;
    }

    // 3. If we see "dietId" but can't find the value, Show Error (NOT LOGIN)
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-black text-white p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-2">
          <i className="fas fa-link text-red-500 text-2xl"></i>
        </div>
        <h2 className="text-xl font-black uppercase tracking-widest text-red-500">Enlace No Válido</h2>
        <p className="opacity-60 text-sm max-w-[280px]">Detectamos un enlace de dieta, pero no pudimos leer el ID correctamente.</p>
        <p className="text-[10px] font-mono opacity-30 bg-white/5 p-2 rounded break-all">{window.location.href}</p>
        <button onClick={() => window.location.reload()} className="bg-white/10 text-white px-6 py-3 rounded-full font-black text-xs uppercase tracking-widest mt-4">
          Reintentar
        </button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center p-8 bg-black">
        <div className="text-center space-y-16 animate-in fade-in zoom-in duration-1000 max-w-sm w-full">
          <div className="space-y-6">
            <div className="w-24 h-24 bg-blue-600 rounded-[32px] mx-auto flex items-center justify-center rotate-3 shadow-2xl shadow-blue-600/20">
              <i className="fas fa-bolt text-white text-5xl"></i>
            </div>
            <div className="space-y-2">
              <h1 className="text-6xl font-black text-white tracking-tighter italic">MacroMind</h1>
              <p className="text-white/30 font-bold uppercase tracking-[0.4em] text-[9px]">{t('perfect_plan')}</p>
            </div>
          </div>

          <div className="space-y-4 w-full">
            <button
              onClick={() => handleLogin(UserRole.CREATOR)}
              className="w-full bg-blue-600 text-white py-8 rounded-[32px] font-black text-xl shadow-2xl shadow-blue-600/40 active:scale-95 transition-all uppercase tracking-widest border-b-8 border-black/20"
            >
              {t('im_builder')}
            </button>

            <div className="pt-8 space-y-4">
              <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em]">{t('im_client')}</p>

              <div className="bg-white/5 p-6 rounded-[24px] border border-white/10 space-y-4">
                <p className="text-white/40 text-[9px] font-medium leading-relaxed">
                  ¿El enlace no abre? Ingresa el ID manualmente:
                </p>
                <div className="flex gap-2">
                  <input
                    placeholder="Ej: d-x8s9..."
                    className="bg-black/20 flex-1 rounded-xl px-4 py-3 text-white text-xs font-bold outline-none border border-white/5 focus:border-blue-500/50 transition-colors uppercase placeholder:normal-case"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = (e.target as HTMLInputElement).value.trim();
                        if (val) {
                          setUser({ id: 'client-guest', name: 'Client', role: UserRole.CLIENT });
                          setActiveDietId(val);
                          localStorage.setItem('mm_user_role', UserRole.CLIENT);
                          localStorage.setItem('mm_active_diet_id', val);
                        }
                      }
                    }}
                    id="manual-diet-id"
                  />
                  <button
                    onClick={() => {
                      const val = (document.getElementById('manual-diet-id') as HTMLInputElement).value.trim();
                      if (val) {
                        setUser({ id: 'client-guest', name: 'Client', role: UserRole.CLIENT });
                        setActiveDietId(val);
                        localStorage.setItem('mm_user_role', UserRole.CLIENT);
                        localStorage.setItem('mm_active_diet_id', val);
                      }
                    }}
                    className="bg-blue-600 px-4 rounded-xl text-white font-black text-xs active:scale-95 transition-transform"
                  >
                    GO
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-8 opacity-20 text-[9px] font-mono text-center">v1.5.5 (Manual Access)</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col overflow-hidden relative">
      {/* HEADER CONTROLS - Adjusted for mobile clearance and safe areas */}
      <div
        className="fixed z-[200] flex items-center gap-2 no-print transition-all"
        style={{
          top: 'max(1.5rem, env(safe-area-inset-top, 0px))',
          right: 'max(1.5rem, env(safe-area-inset-right, 0px))'
        }}
      >
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="ios-blur w-10 h-10 rounded-full flex items-center justify-center shadow-xl border border-white/20 active:scale-95 transition-transform"
        >
          <i className={`fas fa-${theme === 'dark' ? 'sun text-yellow-400' : 'moon text-blue-600'} text-sm`}></i>
        </button>
        <button
          onClick={() => changeLanguage(lang === 'ES' ? 'EN' : lang === 'EN' ? 'IT' : 'ES')}
          className="ios-blur w-10 h-10 rounded-full flex items-center justify-center shadow-xl border border-white/20 text-[10px] font-black"
        >
          {lang}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto w-full">
        {user.role === UserRole.CREATOR ? (
          activeDietId ? (
            <DietEditor dietId={activeDietId} onBack={() => { setActiveDietId(null); loadDiets(); }} />
          ) : (
            <div className="max-w-md mx-auto px-6 py-12 pb-32">
              <div className="flex justify-between items-start mb-10">
                <div>
                  <h1 className="text-4xl font-black text-main">{t('my_plans')}</h1>
                  <p className="text-sub font-medium">{t('builder_panel')}</p>
                </div>
                <button
                  onClick={logout}
                  className="bg-red-500/10 text-red-500 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider"
                >
                  {t('close')}
                </button>
              </div>

              <button
                onClick={() => setActiveDietId('new')}
                className="w-full bg-blue-600 text-white py-6 rounded-[32px] font-bold text-xl mb-10 shadow-xl shadow-blue-600/30 flex items-center justify-center gap-3 active:scale-95 transition-transform"
              >
                <i className="fas fa-plus-circle"></i> {t('new_plan')}
              </button>

              <div className="space-y-5">
                <h2 className="text-xs font-bold text-sub uppercase tracking-[0.2em] px-2">{t('diet_list')}</h2>
                {diets.map(d => (
                  <div key={d.id} className="ios-card rounded-[32px] p-6 flex justify-between items-center group active:scale-[0.98] transition-all">
                    <div className="flex-1 pr-4">
                      <h3 className="text-xl font-bold truncate text-main">{d.name}</h3>
                      <p className="text-sm text-sub font-medium truncate">
                        {d.targetCalories} kcal
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {/* Delete Button */}
                      <button onClick={() => setShowDeleteConfirm(d.id)} className="bg-red-500/10 text-red-500 h-14 w-14 rounded-2xl flex items-center justify-center hover:bg-red-500/20 transition-colors">
                        <i className="fas fa-trash-alt text-lg"></i>
                      </button>
                      {/* Edit Button */}
                      <button onClick={() => setActiveDietId(d.id)} className="bg-blue-600 text-white h-14 w-14 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                        <i className="fas fa-edit text-lg"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Delete Confirmation Modal */}
              {showDeleteConfirm && (
                <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-6" onClick={() => setShowDeleteConfirm(null)}>
                  <div className="ios-card w-full max-w-sm rounded-[40px] p-8 border border-[var(--border-color)] bg-[var(--card-bg)] space-y-6" onClick={e => e.stopPropagation()}>
                    <div className="text-center space-y-4">
                      <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
                        <i className="fas fa-trash-alt text-3xl text-red-500"></i>
                      </div>
                      <h3 className="text-xl font-black text-main">{t('delete_plan_confirm')}</h3>
                      <p className="text-sm text-sub">{diets.find(d => d.id === showDeleteConfirm)?.name}</p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowDeleteConfirm(null)}
                        className="flex-1 bg-[var(--input-bg)] text-main py-4 rounded-[24px] font-black text-sm uppercase tracking-widest border border-[var(--border-color)] active:scale-95 transition-all"
                      >
                        {t('cancel')}
                      </button>
                      <button
                        onClick={() => deleteDiet(showDeleteConfirm)}
                        className="flex-1 bg-red-500 text-white py-4 rounded-[24px] font-black text-sm uppercase tracking-widest shadow-xl shadow-red-500/20 active:scale-95 transition-all"
                      >
                        {t('delete')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

          )
        ) : (
          // CLIENT VIEW
          <DietViewer dietId={activeDietId || ''} />
        )}
      </div>

      {/* NAV BAR - Visible for both Coach and Client */}
      {user && (
        <div
          className="fixed bottom-0 left-0 right-0 ios-blur border-t border-[var(--border-color)] px-10 pt-4 flex justify-between items-center z-[90] no-print"
          style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
        >
          <button
            onClick={() => {
              if (user.role === UserRole.CREATOR) {
                setActiveDietId(null);
              }
            }}
            className={`flex flex-col items-center gap-1.5 transition-all ${(user.role === UserRole.CREATOR && !activeDietId) || (user.role === UserRole.CLIENT)
              ? 'text-blue-500 scale-110'
              : 'text-sub opacity-50'
              }`}
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-blue-500/10">
              <i className="fas fa-utensils text-xl"></i>
            </div>
            <span className="text-[9px] font-black uppercase tracking-[0.2em]">{t('nutrition')}</span>
          </button>

          {user.role === UserRole.CREATOR && (
            <button
              onClick={() => setActiveDietId(null)}
              className={`flex flex-col items-center gap-1.5 transition-all ${!activeDietId ? 'text-blue-500 scale-110' : 'text-sub'
                }`}
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-blue-500/10">
                <i className="fas fa-calendar-alt text-xl"></i>
              </div>
              <span className="text-[9px] font-black uppercase tracking-[0.2em]">{t('my_plans')}</span>
            </button>
          )}

          <button
            onClick={logout}
            className="text-sub flex flex-col items-center gap-1.5 opacity-40 hover:opacity-100 transition-opacity"
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-red-500/5">
              <i className="fas fa-power-off text-xl text-red-500/60"></i>
            </div>
            <span className="text-[9px] font-black uppercase tracking-[0.2em]">{t('logout')}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
