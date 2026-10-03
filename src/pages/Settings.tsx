import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ColorPicker } from '@/components/ui/color-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageLayout } from '@/components/layout/PageLayout';
import { useTheme } from '@/hooks/useTheme';
import { useSettingsStore, type LanguageSetting } from '@/store/settingsStore';
import { detectDeviceLanguage } from '@/hooks/useLanguage';
import { Moon, Sun, Monitor, Bell, Vibrate, Dumbbell, Volume2, Shield, ChevronRight, Target, Download, Languages, Loader2 } from 'lucide-react';
import { useUserStore } from '@/store/userStore';
import { cn } from '@/utils/cn';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useSessionHistory } from '@/hooks/useSessionHistory';
import { saveFile } from '@/utils/saveFile';
import { useGymSessionStore } from '@/store/gymSessionStore';
import { sessionsToCsv } from '@/utils/exportCsv';

import { useNotifications } from '@/hooks/useNotifications';
import { version as APP_VERSION } from '../../package.json';

const WEEKLY_GOAL_OPTIONS = [0, 2, 3, 4, 5] as const;
const LANGUAGE_OPTIONS: { id: LanguageSetting; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'fr', label: 'Français' },
  { id: 'en', label: 'English' },
];

function Settings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, colorTheme, setTheme, setColorTheme } = useTheme();
  const { user, updateProfile } = useUserStore();
  const { notificationsEnabled, notificationTime, hapticFeedback, soundEnabled, weeklyGoal, language, setNotificationsEnabled, setNotificationTime, setHapticFeedback, setSoundEnabled, setWeeklyGoal, setLanguage } = useSettingsStore();
  const deviceLanguage = detectDeviceLanguage();
  const { scheduleDailyReminder, cancelReminder } = useNotifications();
  const { sessions, gymSessions, loading: historyLoading } = useSessionHistory(500);
  const [exporting, setExporting] = useState(false);
  const { autoRest, setAutoRest, showRpe, setShowRpe } = useGymSessionStore();
  const [togglingNotif, setTogglingNotif] = useState(false);

  const handleExportData = async (format: 'json' | 'csv') => {
    setExporting(true);
    try {
      const day = new Date().toISOString().slice(0, 10);
      if (format === 'csv') {
        // BOM : Excel lit alors les accents correctement
        const done = await saveFile(`reps-export-${day}.csv`, '\uFEFF' + sessionsToCsv(gymSessions, sessions), 'text/csv');
        if (done) toast({ title: 'Export CSV prêt', description: 'Une ligne par série, compatible Strong / Hevy.' });
        return;
      }
      const exportData = {
        exportedAt: new Date().toISOString(),
        user: {
          displayName: user?.displayName,
          email: user?.email,
          weight: user?.weight,
          height: user?.height,
          gender: user?.gender,
          totalReps: user?.totalReps,
          totalSessions: user?.totalSessions,
          currentStreak: user?.currentStreak,
          longestStreak: user?.longestStreak,
          badges: user?.badges,
          createdAt: user?.createdAt,
        },
        sessions: sessions.map((s) => ({
          date: s.date.toDate().toISOString(),
          duration: s.duration,
          totalReps: s.totalReps,
          totalCalories: s.totalCalories,
          exercises: s.exercises,
        })),
        gymSessions: gymSessions.map((s) => ({
          date: s.date.toDate().toISOString(),
          duration: s.duration,
          totalVolume: s.totalVolume,
          totalSets: s.totalSets,
          exercises: s.exercises.map((ex) => ({
            name: ex.name,
            sets: ex.sets.filter((set) => set.completed).map((set) => ({
              weight: set.actualWeight ?? set.weight,
              reps: set.actualReps ?? set.reps,
            })),
          })),
        })),
      };

      const done = await saveFile(`reps-export-${day}.json`, JSON.stringify(exportData, null, 2), 'application/json');
      if (done) toast({ title: 'Export prêt', description: 'Toutes tes données au format JSON.' });
    } catch {
      toast({ title: 'Erreur', description: "Impossible d'exporter les données.", variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  const handleNotificationToggle = async () => {
    const newState = !notificationsEnabled;
    setTogglingNotif(true);
    try {
      if (newState) {
        const ok = await scheduleDailyReminder(notificationTime);
        setNotificationsEnabled(ok);
      } else {
        await cancelReminder();
        setNotificationsEnabled(false);
      }
    } finally {
      setTogglingNotif(false);
    }
  };

  const handleTimeChange = async (newTime: string) => {
    setNotificationTime(newTime);
    if (notificationsEnabled) {
      await scheduleDailyReminder(newTime);
    }
  };

  return (
    <PageLayout title="PARAMÈTRES" variant="secondary">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Thème */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <Monitor className="h-5 w-5" />
              Apparence
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Mode</p>
              <div className="flex gap-2" role="group" aria-label="Mode d'affichage">
                <Button
                  variant={theme === 'light' ? 'default' : 'outline'}
                  aria-pressed={theme === 'light'}
                  onClick={() => setTheme('light')}
                  className="flex-1"
                >
                  <Sun className="h-4 w-4 mr-2" />
                  Clair
                </Button>
                <Button
                  variant={theme === 'dark' ? 'default' : 'outline'}
                  aria-pressed={theme === 'dark'}
                  onClick={() => setTheme('dark')}
                  className="flex-1"
                >
                  <Moon className="h-4 w-4 mr-2" />
                  Sombre
                </Button>
                <Button
                  variant={theme === 'system' ? 'default' : 'outline'}
                  aria-pressed={theme === 'system'}
                  onClick={() => setTheme('system')}
                  className="flex-1"
                >
                  <Monitor className="h-4 w-4 mr-2" />
                  Système
                </Button>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Couleur</p>
              <ColorPicker selectedColor={colorTheme} onColorChange={setColorTheme} />
            </div>
          </CardContent>
        </Card>

        {/* Session */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <Dumbbell className="h-5 w-5" />
              Séance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Boutons de répétitions</p>
              <p className="text-xs text-muted-foreground mb-3">
                Choisis jusqu'à 4 boutons à afficher (1 minimum).
              </p>
              <div className="flex flex-wrap gap-2">
                {[1, 3, 5, 10, 20].map((value) => {
                  const currentButtons = user?.repButtons || [5, 10];
                  const isSelected = currentButtons.includes(value);
                  const isDisabled = !isSelected && currentButtons.length >= 4;

                  return (
                    <Button
                      key={value}
                      variant={isSelected ? 'default' : 'outline'}
                      className={cn(
                        "h-11 w-11 p-0 rounded-full active:scale-95",
                        isSelected && "ring-2 ring-offset-2 ring-primary"
                      )}
                      disabled={isDisabled}
                      onClick={async () => {
                        let newButtons;
                        if (isSelected) {
                          if (currentButtons.length <= 1) {
                            toast({ title: 'Garde au moins un bouton', description: 'Sélectionne-en un autre avant de retirer celui-ci.' });
                            return;
                          }
                          newButtons = currentButtons.filter(b => b !== value);
                        } else {
                          newButtons = [...currentButtons, value].sort((a, b) => a - b);
                        }
                        try {
                          await updateProfile({ repButtons: newButtons });
                        } catch (e) {
                          // Error handling managed by store/toast usually
                        }
                      }}
                    >
                      +{value}
                    </Button>
                  );
                })}
              </div>
            </div>
            {[
              { label: 'Repos automatique', hint: 'Lance le minuteur à chaque série validée (muscu)', on: autoRest, toggle: () => setAutoRest(!autoRest) },
              { label: 'RPE par série', hint: "Note l'effort ressenti (6 à 10) des séries validées", on: showRpe, toggle: () => setShowRpe(!showRpe) },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-3 pt-4 border-t">
                <div>
                  <p className="text-sm font-medium">{row.label}</p>
                  <p className="text-xs text-muted-foreground">{row.hint}</p>
                </div>
                <Button variant={row.on ? 'default' : 'outline'} className="min-w-[6.5rem] shrink-0" role="switch" aria-checked={row.on} aria-label={row.label} onClick={row.toggle}>
                  {row.on ? 'Activé' : 'Désactivé'}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Objectif hebdomadaire */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <Target className="h-5 w-5" />
              Objectif hebdomadaire
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Nombre de séances visées par semaine (affiché dans les statistiques).
            </p>
            <div className="flex gap-2" role="group" aria-label="Objectif hebdomadaire">
              {WEEKLY_GOAL_OPTIONS.map((g) => (
                <Button
                  key={g}
                  variant={weeklyGoal === g ? 'default' : 'outline'}
                  className={cn('flex-1 active:scale-95', weeklyGoal === g && 'ring-2 ring-offset-2 ring-primary')}
                  aria-pressed={weeklyGoal === g}
                  onClick={() => setWeeklyGoal(g)}
                >
                  {g === 0 ? 'Aucun' : `${g}×`}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Langue des exercices */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <Languages className="h-5 w-5" />
              Langue des exercices
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Noms, instructions et muscles de la bibliothèque d'exercices.
              {' '}En mode Auto, suit la langue de l'appareil ({deviceLanguage === 'fr' ? 'français' : 'anglais'} détecté).
            </p>
            <div className="flex gap-2" role="group" aria-label="Langue des exercices">
              {LANGUAGE_OPTIONS.map((opt) => (
                <Button
                  key={opt.id}
                  variant={language === opt.id ? 'default' : 'outline'}
                  className={cn('flex-1 active:scale-95', language === opt.id && 'ring-2 ring-offset-2 ring-primary')}
                  aria-pressed={language === opt.id}
                  onClick={() => setLanguage(opt.id)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Rappels d'entraînement</p>
                <p className="text-sm text-muted-foreground">
                  Reçois un rappel quotidien pour tes séances
                </p>
              </div>
              <Button
                variant={notificationsEnabled ? 'default' : 'outline'}
                className="min-w-[6.5rem] shrink-0"
                role="switch"
                aria-checked={notificationsEnabled}
                disabled={togglingNotif}
                onClick={handleNotificationToggle}
              >
                {notificationsEnabled ? 'Activé' : 'Désactivé'}
              </Button>
            </div>

            {notificationsEnabled && (
              <div>
                <Label htmlFor="notification-time" className="mb-2 block">Heure du rappel</Label>
                <Input
                  id="notification-time"
                  type="time"
                  value={notificationTime}
                  onChange={(e) => handleTimeChange(e.target.value)}
                  className="h-11 dark:[color-scheme:dark]"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Autres */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold">Autres</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Vibrate className="h-5 w-5" />
                <div>
                  <p className="font-medium">Feedback haptique</p>
                  <p className="text-sm text-muted-foreground">
                    Vibrations lors des interactions
                  </p>
                </div>
              </div>
              <Button
                variant={hapticFeedback ? 'default' : 'outline'}
                className="min-w-[6.5rem] shrink-0"
                role="switch"
                aria-checked={hapticFeedback}
                onClick={() => setHapticFeedback(!hapticFeedback)}
              >
                {hapticFeedback ? 'Activé' : 'Désactivé'}
              </Button>
            </div>

            <div className="flex items-center justify-between pt-4 border-t mt-4">
              <div className="flex items-center gap-2">
                <Volume2 className="h-5 w-5" />
                <div>
                  <p className="font-medium">Effets sonores</p>
                  <p className="text-sm text-muted-foreground">
                    Sons de l'interface
                  </p>
                </div>
              </div>
              <Button
                variant={soundEnabled ? 'default' : 'outline'}
                className="min-w-[6.5rem] shrink-0"
                role="switch"
                aria-checked={soundEnabled}
                onClick={() => setSoundEnabled(!soundEnabled)}
              >
                {soundEnabled ? 'Activé' : 'Désactivé'}
              </Button>
            </div>
          </CardContent>
        </Card>
        {/* À propos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold">À propos</CardTitle>
          </CardHeader>
          <CardContent className="p-0 divide-y">
            <button
              onClick={() => handleExportData('json')}
              disabled={exporting || historyLoading} // exporter avant la fin du chargement donnait un fichier vide
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted/50 active:bg-muted transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            >
              <div className="flex items-center gap-3">
                {exporting ? (
                  <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
                ) : (
                  <Download className="h-5 w-5 text-muted-foreground" />
                )}
                <div className="text-left">
                  <p className="font-medium text-sm">Exporter mes données (JSON)</p>
                  <p className="text-xs text-muted-foreground">Sauvegarde complète : profil, séances, badges</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
            <button
              onClick={() => handleExportData('csv')}
              disabled={exporting || historyLoading} // exporter avant la fin du chargement donnait un fichier vide
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted/50 active:bg-muted transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            >
              <div className="flex items-center gap-3">
                {exporting ? (
                  <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
                ) : (
                  <Download className="h-5 w-5 text-muted-foreground" />
                )}
                <div className="text-left">
                  <p className="font-medium text-sm">Exporter mes séances (CSV)</p>
                  <p className="text-xs text-muted-foreground">Une ligne par série, pour Excel, Sheets, Strong ou Hevy</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
            <button
              onClick={() => navigate('/privacy-policy')}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted/50 active:bg-muted transition-colors rounded-b-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            >
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <div className="text-left">
                  <p className="font-medium text-sm">Politique de confidentialité</p>
                  <p className="text-xs text-muted-foreground">Tes données et tes droits</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground pb-4">
          🏋️ Reps v{APP_VERSION}
        </p>

      </div>
    </PageLayout>
  );
}

export default Settings;
