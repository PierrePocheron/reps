import { ReactNode } from 'react';
import { UserAvatar } from '@/components/UserAvatar';
import { useUserStore } from '@/store/userStore';
import { useStreak } from '@/hooks/useStreak';
import { Flame, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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

    // Initialize Streak Logic
    useStreak();

    return (
        <div className="flex flex-col min-h-screen pb-24 bg-background safe-area-inset-top">
            {/* Header */}
            {/* Header */}
            <header className="px-5 py-4 sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/40">
                <div className="max-w-2xl mx-auto flex items-center justify-between">
                    {variant === 'secondary' ? (
                        <>
                            {/* Secondary: Back + Title */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => navigate(-1)}
                                    className="p-1 rounded-full hover:bg-muted transition-colors -ml-2"
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
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20">
                                        <Flame className={`w-4 h-4 ${user.currentStreak > 0 ? 'text-orange-500 fill-orange-500' : 'text-muted-foreground'}`} />
                                        <span className={`text-sm font-bold ${user.currentStreak > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-muted-foreground'}`}>
                                            {user.currentStreak || 0}
                                        </span>
                                    </div>
                                )}

                                {/* Profile Avatar */}
                                <div onClick={() => navigate('/profil')} className="cursor-pointer">
                                    <UserAvatar size="sm" />
                                </div>
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
                                    onClick={() => navigate(-1)}
                                    className="p-1.5 rounded-full hover:bg-muted transition-colors -ml-2"
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
            <main className={`flex-1 px-5 py-4 ${className}`}>
                {children}
            </main>
        </div>
    );
}
