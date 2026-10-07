import { ReactNode } from 'react';
import { UserAvatar } from '@/components/UserAvatar';
import { useUserStore } from '@/store/userStore';
import { useStreak } from '@/hooks/useStreak';
import { liveStreak, liveWeeklyStreak } from '@/utils/streak';
import { useSettingsStore } from '@/store/settingsStore';
import { Flame, ChevronLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

interface PageLayoutProps {
    children: ReactNode;
    title?: string;
    isHome?: boolean;
    backButton?: boolean;
    headerAction?: ReactNode;
    variant?: 'default' | 'secondary';
    className?: string;
}

export function PageLayout({ children, title, isHome, headerAction, backButton, variant = 'default', className = '' }: PageLayoutProps) {
    const { user } = useUserStore();
    const navigate = useNavigate();
    const location = useLocation();
    // Opened directly (link, bookmark, reopened tab): no previous page in the app, so lead into it instead of leaving it.
    // The router keeps idx 0 on that first entry across replaces (History's tab, filter), which give it a new key;
    // the 'default' key covers MemoryRouter, which has no window.history state
    const goBack = () => (location.key === 'default' || (window.history.state as { idx?: number } | null)?.idx === 0 ? navigate('/') : navigate(-1));

    // Initialize Streak Logic
    useStreak();
    const weekly = useSettingsStore((s) => s.streakMode === 'weekly');
    const streak = !user ? 0 : weekly
      ? liveWeeklyStreak(user.weeklyStreak ?? 0, user.lastMetWeek)
      : liveStreak(user.currentStreak || 0, user.lastTrainingDate?.toDate(), user.lastJokerDay);
    const streakLabel = weekly
      ? `${streak} semaine${streak > 1 ? 's' : ''} d'affilée à l'objectif`
      : `${streak} jour${streak > 1 ? 's' : ''} d'entraînement d'affilée`;

    return (
        <div className="flex flex-col min-h-screen pb-24 bg-background">
            {/* Header */}
            {/* Header */}
            <header className="px-5 py-4 sticky top-[calc(env(safe-area-inset-top)+var(--offline-h,0px))] z-50 bg-background/80 backdrop-blur-md border-b border-border/40">
                <div className="max-w-2xl mx-auto flex items-center justify-between">
                    {variant === 'secondary' ? (
                        <>
                            {/* Secondary: Back + Title */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={goBack}
                                    className="p-2.5 -ml-2.5 rounded-full hover:bg-muted active:bg-muted transition-colors"
                                    aria-label="Retour"
                                >
                                    <ChevronLeft className="w-6 h-6 text-foreground" />
                                </button>
                                <h1 className="text-xl font-bold uppercase tracking-tight text-foreground">{title}</h1>
                            </div>

                            {/* Right: Action */}
                            <div>
                                {headerAction}
                            </div>
                        </>
                    ) : (
                        <>
                            {/* LEFT: Brand */}
                            <h1 className="text-2xl font-black text-foreground tracking-tight">Reps</h1>

                            {/* RIGHT: Streak + Profile */}
                            <div className="flex items-center gap-3">
                                {/* Streak Badge */}
                                {user && (
                                    <div
                                        role="img"
                                        aria-label={`Série en cours : ${streakLabel}`}
                                        title={weekly ? "Semaines d'affilée à l'objectif" : "Jours d'entraînement d'affilée"}
                                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20"
                                    >
                                        <Flame className={`w-4 h-4 ${streak > 0 ? 'text-orange-500 fill-orange-500' : 'text-muted-foreground'}`} />
                                        <span className={`text-sm font-bold ${streak > 0 ? 'text-orange-700 dark:text-orange-400' : 'text-muted-foreground'}`}>
                                            {streak}
                                        </span>
                                    </div>
                                )}

                                {/* Profile Avatar */}
                                <button
                                    type="button"
                                    onClick={() => navigate('/profil')}
                                    aria-label={user?.newBadgeIds?.length ? 'Mon profil — nouveaux badges' : 'Mon profil'}
                                    className="relative rounded-full p-1.5 -m-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-95 transition-transform"
                                >
                                    <UserAvatar user={user} size="sm" />
                                    {user?.newBadgeIds && user.newBadgeIds.length > 0 && (
                                        <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-background animate-pulse" />
                                    )}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </header>

            {/* Page Title Sub-Header (Only for default variant) */}
            {variant === 'default' && !isHome && title && (
                <div className="px-5 pt-8 pb-2">
                     <div className="max-w-2xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-1">
                            {backButton && (
                                <button
                                    onClick={goBack}
                                    className="p-2 -ml-2 rounded-full hover:bg-muted active:bg-muted transition-colors"
                                    aria-label="Retour"
                                >
                                    <ChevronLeft className="w-7 h-7 text-foreground" />
                                </button>
                            )}
                            <h2 className="text-3xl font-black uppercase tracking-tight text-foreground">{title}</h2>
                        </div>
                        {headerAction}
                     </div>
                </div>
            )}

            {/* Content */}
            <div className={`flex-1 px-5 py-4 ${className}`}>
                {children}
            </div>
        </div>
    );
}
