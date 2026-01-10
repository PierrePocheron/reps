import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PageLayout } from '@/components/layout/PageLayout';
import { useUserStore } from '@/store/userStore';
import { Flame, Dumbbell, Calendar, Zap, AlertTriangle, Trophy, Sunrise, Sun, Moon } from 'lucide-react';
import { AdSpace } from '@/components/AdSpace';
import { ADS_CONFIG } from '@/config/ads';

export default function Statistics() {
  const { user, stats } = useUserStore();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <PageLayout title="STATISTIQUES">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Alerte Profil Incomplet */}
        {(!user.weight || !user.height || !user.gender) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-400 p-3 rounded-lg flex gap-3 text-sm items-start"
          >
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">Profil incomplet</p>
              <p className="opacity-90 text-xs mt-0.5">
                Renseignez votre poids, taille et sexe pour un calcul précis des calories.
              </p>
              <button
                onClick={() => navigate('/profil')}
                className="text-xs font-semibold underline mt-1.5"
              >
                Mettre à jour mon profil
              </button>
            </div>
          </motion.div>
        )}

        {/* Résumé Calories */}
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="bg-card border rounded-2xl p-6 shadow-sm relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Flame className="w-24 h-24 text-primary" />
          </div>

          <div className="relative z-10">
            <h2 className="text-muted-foreground text-sm font-medium uppercase tracking-wider mb-1">
              Calories Brûlées
            </h2>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold tracking-tight">
                {user.totalCalories || 0}
              </span>
              <span className="text-primary font-medium">kcal</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Estimation basée sur vos répétitions
            </p>
          </div>
        </motion.div>

        {/* Grille de stats secondaires */}
        {/* Volume */}
        <div className="grid grid-cols-2 gap-3">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-card/50 border rounded-xl p-4 flex flex-col items-center justify-center text-center gap-2"
            >
              <div className="bg-red-500/10 p-2 rounded-full">
                <Dumbbell className="w-5 h-5 text-red-500" />
              </div>
              <div className="space-y-0.5">
                <span className="text-2xl font-bold block">{user.totalReps}</span>
                <span className="text-xs text-muted-foreground uppercase">Reps Total</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-card/50 border rounded-xl p-4 flex flex-col items-center justify-center text-center gap-2"
            >
              <div className="bg-blue-500/10 p-2 rounded-full">
                <Calendar className="w-5 h-5 text-blue-500" />
              </div>
              <div className="space-y-0.5">
                <span className="text-2xl font-bold block">{user.totalSessions}</span>
                <span className="text-xs text-muted-foreground uppercase">Séances</span>
              </div>
            </motion.div>
        </div>

        {/* Moyenne Calories / Séance (Carte dédiée) */}
        <motion.div
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.3 }}
           className="bg-card border rounded-xl p-4 flex items-center justify-between"
        >
             <div className="flex items-center gap-4">
                 <div className="bg-primary/10 p-3 rounded-full">
                    <Zap className="w-6 h-6 text-primary" />
                 </div>
                 <div className="text-left">
                     <p className="text-sm font-medium text-muted-foreground">Moyenne par séance</p>
                     <p className="text-2xl font-bold">
                        {((user.totalCalories || 0) / (user.totalSessions || 1)).toFixed(0)}
                        <span className="text-sm font-medium text-primary ml-1">kcal</span>
                     </p>
                 </div>
             </div>
        </motion.div>

        {/* Top Exercices & Détails */}
        {stats?.exercisesDistribution && stats.exercisesDistribution.length > 0 && (
          <div className="space-y-4">
             {/* Pub avant Exercices Favoris */}
            <AdSpace
              adId="ca-app-pub-1431137074985627/2893707245"
              slotId={ADS_CONFIG.ADSENSE.SLOTS.STATISTICS_TOP}
            />

            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Trophy className="w-4 h-4 text-primary" />
              Exercices Favoris
            </h3>

            {/* Top 3 Cards */}
            <div className="grid grid-cols-3 gap-3">
              {stats.exercisesDistribution.slice(0, 3).map((ex, i) => (
                <div
                  key={ex.name}
                  className="bg-card border rounded-xl p-3 flex flex-col items-center gap-2 text-center relative overflow-hidden"
                >
                  <div className={`absolute top-0 left-0 px-2 py-0.5 text-[10px] font-bold rounded-br-lg ${
                    i === 0 ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400' :
                    i === 1 ? 'bg-slate-300/20 text-slate-600 dark:text-slate-400' :
                    'bg-orange-300/20 text-orange-600 dark:text-orange-400'
                  }`}>
                    #{i + 1}
                  </div>
                  <span className="text-2xl mt-4">{ex.emoji}</span>
                  <div className="space-y-0.5 w-full">
                    <p className="text-xs font-medium truncate px-1" title={ex.name}>
                      {ex.name}
                    </p>
                    <p className="text-lg font-bold">{ex.totalReps}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Liste Détaillée */}
            <div className="bg-card border rounded-xl overflow-hidden">
               <div className="p-3 bg-muted/30 border-b text-xs font-medium flex justify-between items-center text-muted-foreground">
                   <span>Exercice</span>
                   <div className="flex gap-4 text-right">
                       <span className="w-12">Reps</span>
                       <span className="w-12">Kcal</span>
                   </div>
               </div>
               <div className="divide-y">
                 {stats.exercisesDistribution.map((ex) => (
                   <div key={ex.name} className="p-3 flex items-center justify-between hover:bg-muted/50 transition-colors text-sm">
                       <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
                           <span className="text-lg shrink-0">{ex.emoji}</span>
                           <span className="truncate font-medium">{ex.name}</span>
                       </div>
                       <div className="flex gap-4 text-right shrink-0">
                           <span className="w-12 font-bold">{ex.totalReps}</span>
                           <div className="w-12 flex items-center justify-end gap-1 text-primary">
                              <span>{ex.totalCalories}</span>
                              <Flame className="w-3 h-3" />
                           </div>
                       </div>
                   </div>
                 ))}
               </div>
            </div>
          </div>
        )}

        {/* Séries (Streaks) */}
        {stats && (
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-card border rounded-xl p-4 flex flex-col justify-between overflow-hidden relative">
                    <div className="absolute top-2 right-2 opacity-10">
                        <Flame className="w-12 h-12" />
                    </div>
                     <span className="text-xs text-muted-foreground uppercase font-semibold">Série actuelle</span>
                     <div className="mt-2">
                        <span className="text-3xl font-bold">{stats.currentStreak}</span>
                        <span className="text-sm text-muted-foreground ml-1">jours</span>
                     </div>
                </div>
                <div className="bg-card border rounded-xl p-4 flex flex-col justify-between overflow-hidden relative">
                    <div className="absolute top-2 right-2 opacity-10">
                        <Trophy className="w-12 h-12" />
                    </div>
                     <span className="text-xs text-muted-foreground uppercase font-semibold">Record</span>
                     <div className="mt-2">
                        <span className="text-3xl font-bold">{stats.longestStreak}</span>
                        <span className="text-sm text-muted-foreground ml-1">jours</span>
                     </div>
                </div>
            </div>
        )}

        {/* Habitudes (Distribution) */}
        {/* Habitudes (Distribution) */}

        {/* Pub avant Habitudes (Carte séparée) */}
        <AdSpace
          adId="ca-app-pub-1431137074985627/2893707245"
          slotId={ADS_CONFIG.ADSENSE.SLOTS.STATISTICS_BOTTOM}
        />

        <div className="bg-card border rounded-xl p-5">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Habitudes d'entraînement
            </h3>
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-full">
                        <Sunrise className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1.5">
                            <span className="font-medium">Matin</span>
                            <span className="text-muted-foreground">{user.morningSessions || 0} séances</span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${Math.min(100, ((user.morningSessions || 0) / ((user.morningSessions || 0) + (user.lunchSessions || 0) + (user.nightSessions || 0) || 1)) * 100)}%` }}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-full">
                        <Sun className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1.5">
                            <span className="font-medium">Midi</span>
                            <span className="text-muted-foreground">{user.lunchSessions || 0} séances</span>
                        </div>
                         <div className="h-2 bg-secondary rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${Math.min(100, ((user.lunchSessions || 0) / ((user.morningSessions || 0) + (user.lunchSessions || 0) + (user.nightSessions || 0) || 1)) * 100)}%` }}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-full">
                        <Moon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1.5">
                            <span className="font-medium">Soir</span>
                            <span className="text-muted-foreground">{user.nightSessions || 0} séances</span>
                        </div>
                         <div className="h-2 bg-secondary rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${Math.min(100, ((user.nightSessions || 0) / ((user.morningSessions || 0) + (user.lunchSessions || 0) + (user.nightSessions || 0) || 1)) * 100)}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>


        {/* Note informative */}
        <div className="bg-muted/50 p-4 rounded-lg text-xs text-muted-foreground">
          <p>
            <strong>Note :</strong> Le calcul des calories est personnalisé selon votre profil (Poids, Taille) et l'intensité (MET) de chaque exercice.
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1 ml-1 opacity-80">
            <li>Formule : ACSM (American College of Sports Medicine)</li>
            <li>Facteurs : Poids, Taille, MET, Temps sous tension</li>
          </ul>

          <div className="mt-4 pt-4 border-t border-border/50">
            <p className="font-semibold mb-2">Moyenne pour 10 reps (75kg) :</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 opacity-80">
                <div className="flex justify-between">
                    <span>Tractions</span>
                    <span className="text-primary font-medium">~5.0 kcal</span>
                </div>
                <div className="flex justify-between">
                    <span>Dips</span>
                    <span className="text-primary font-medium">~3.6 kcal</span>
                </div>
                 <div className="flex justify-between">
                    <span>Squats</span>
                    <span className="text-primary font-medium">~2.6 kcal</span>
                </div>
                <div className="flex justify-between">
                    <span>Pompes</span>
                    <span className="text-primary font-medium">~2.1 kcal</span>
                </div>
                 <div className="flex justify-between">
                    <span>Abdos</span>
                    <span className="text-primary font-medium">~1.3 kcal</span>
                </div>
                <div className="flex justify-between">
                    <span>Fentes</span>
                    <span className="text-primary font-medium">~3.0 kcal</span>
                </div>
            </div>
          </div>
        </div>
      </div>

    </PageLayout>
  );
}
