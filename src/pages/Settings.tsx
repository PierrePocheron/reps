import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { buildJsonExport } from '@/utils/exportJson';
import { getBodyEntries } from '@/firebase/bodyMetrics';
import { isOffline } from '@/firebase/offline';
import { getUserTemplates } from '@/firebase/templates';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ColorPicker } from '@/components/ui/color-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageLayout } from '@/components/layout/PageLayout';
import { useTheme } from '@/hooks/useTheme';
import { useSettingsStore, type LanguageSetting } from '@/store/settingsStore';
import { detectDeviceLanguage } from '@/hooks/useLanguage';
import { Moon, Sun, Monitor, Bell, Dumbbell, Shield, ChevronRight, Target, Download, Upload, Languages, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { parseWorkoutsCsv, newSessionsOnly, exerciseResolver, importSummary, POUNDS_HEADER, type ImportedSession } from '@/utils/importCsv';
import { importGymSessions } from '@/firebase/gymSessions';
import type { GymSession } from '@/firebase/types';
import { loadExerciseLibrary, toExercise } from '@/utils/exerciseLibrary';
import { MUSCULATION_EXERCISES } from '@/utils/constants';
import { useUserStore } from '@/store/userStore';
import { cn } from '@/utils/cn';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { fetchWholeHistory } from '@/hooks/useSessionHistory';
import { saveFile } from '@/utils/saveFile';
import { localDay } from '@/utils/formatters';
import { useGymSessionStore } from '@/store/gymSessionStore';
import { StartQuestionnaire } from '@/components/StartQuestionnaire';
import { sessionsToCsv } from '@/utils/exportCsv';

import { useNotifications } from '@/hooks/useNotifications';
import { version as APP_VERSION } from '../../package.json';
import { updateUserStatsAfterSession } from '@/firebase/firestore';
import { logger } from '@/utils/logger';

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
  const { notificationsEnabled, notificationTime, hapticFeedback, soundEnabled, weeklyGoal, language, streakMode, keepAwake, setNotificationsEnabled, setNotificationTime, setHapticFeedback, setSoundEnabled, setWeeklyGoal, setLanguage, setStreakMode, setKeepAwake } = useSettingsStore();
  const deviceLanguage = detectDeviceLanguage();
  const { scheduleDailyReminder, cancelReminder } = useNotifications();
  // Import d'un export Strong / Hevy (#61) : aperçu, puis confirmation
  const csvInput = useRef<HTMLInputElement>(null);
  const [importPreview, setImportPreview] = useState<{ sessions: ImportedSession[]; existing: GymSession[]; skipped: number; exercises: number; known: number; pounds: boolean } | null>(null);
  const [importing, setImporting] = useState(false);
  const importedDates = useRef<Date[]>([]); // déjà importées, avant même le rechargement de l'historique : pas de doublon
  const onPickCsv = async (file: File) => {
    try {
      const [fr, en] = await Promise.all([loadExerciseLibrary('fr'), loadExerciseLibrary('en')]);
      const known = [...MUSCULATION_EXERCISES, ...[...fr, ...en].map((e) => toExercise(e))].map((e) => ({ id: e.id, name: e.name, emoji: e.emoji }));
      const text = await file.text();
      const all = parseWorkoutsCsv(text, exerciseResolver(known));
      if (all.length === 0) {
        toast({ title: 'Aucune séance trouvée', description: "Ce fichier n'est pas un export Strong ou Hevy.", variant: 'destructive' });
        return;
      }
      const whole = user ? (await fetchWholeHistory(user.uid)).gymSessions : []; // duplicates older than a page too
      const fresh = newSessionsOnly(all, [...whole.map((s) => s.date.toDate()), ...importedDates.current]);
      const ids = new Set(fresh.flatMap((s) => s.exercises.map((e) => e.exerciseId)));
      setImportPreview({ sessions: fresh, existing: whole, skipped: all.length - fresh.length, exercises: ids.size, known: [...ids].filter((id) => !id.startsWith('import_')).length, pounds: POUNDS_HEADER.test(text.split('\n', 1)[0] ?? '') });
    } catch (err) {
      logger.error('Lecture du CSV :', err);
      // the duplicate check reads the whole history from the server
      toast({ title: 'Erreur', description: isOffline() ? 'Tu es hors ligne\u00a0: reconnecte-toi pour importer ce fichier.' : 'Impossible de lire ce fichier', variant: 'destructive' });
    }
  };
  // Arrivée depuis l'historique vide (lien « Tu viens de Strong ou Hevy ? ») : montrer le bouton d'import
  useEffect(() => {
    if (window.location.hash === '#import') document.getElementById('import')?.scrollIntoView({ block: 'center' });
  }, []);
  const confirmImport = async () => {
    if (!importPreview || !user) return;
    setImporting(true);
    try {
      await importGymSessions(user.uid, importPreview.sessions, importPreview.existing); // trophies rated against it
      importedDates.current.push(...importPreview.sessions.map((s) => s.date));
      toast({ title: `${importPreview.sessions.length} séance${importPreview.sessions.length > 1 ? 's' : ''} importée${importPreview.sessions.length > 1 ? 's' : ''}` });
      setImportPreview(null);
      await updateUserStatsAfterSession(user.uid, 0); // série, totaux et badges comptent l'historique importé
    } catch (err) {
      logger.error('Import CSV :', err);
      toast({ title: 'Erreur', description: "L'import n'a pas abouti", variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  };
  const [exporting, setExporting] = useState(false);
  const { autoRest, setAutoRest, showRpe, setShowRpe, suggestLoad, setSuggestLoad } = useGymSessionStore();
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [togglingNotif, setTogglingNotif] = useState(false);

  const handleExportData = async (format: 'json' | 'csv') => {
    setExporting(true);
    try {
      const day = localDay(new Date());
      const all = user?.uid ? await fetchWholeHistory(user.uid) : { sessions: [], gymSessions: [] }; // every session, not a page
      if (format === 'csv') {
        // BOM : Excel lit alors les accents correctement
        const done = await saveFile(`reps-export-${day}.csv`, '\uFEFF' + sessionsToCsv(all.gymSessions, all.sessions), 'text/csv');
        if (done) toast({ title: 'Export CSV prêt', description: 'Une ligne par série, compatible Strong / Hevy.' });
        return;
      }
      // everything, including body measurements and personal templates (they were missing from « toutes tes données »)
      const [body, templates] = user?.uid
        ? await Promise.all([getBodyEntries(user.uid), getUserTemplates(user.uid)]) // a failed read is an error, not a backup without them
        : [[], []];
      const exportData = buildJsonExport({ user, sessions: all.sessions, gymSessions: all.gymSessions, body, templates });

      const done = await saveFile(`reps-export-${day}.json`, JSON.stringify(exportData, null, 2), 'application/json');
      if (done) toast({ title: 'Export prêt', description: 'Toutes tes données au format JSON.' });
    } catch {
      // offline: the history is read from the server, never from the partial device cache
      toast({ title: 'Erreur', description: isOffline() ? 'Tu es hors ligne\u00a0: reconnecte-toi pour exporter toutes tes données.' : "Impossible d'exporter les données.", variant: 'destructive' });
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
    if (!newTime) return; // cleared field: keep the saved time (the input is controlled, it shows it again)
    setNotificationTime(newTime);
    if (notificationsEnabled) {
      await scheduleDailyReminder(newTime);
    }
  };

  return (
    <PageLayout title="RÉGLAGES" variant="secondary">
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
              <div className="grid grid-cols-3 gap-2" role="group" aria-label="Mode d'affichage">
                <Button
                  variant={theme === 'light' ? 'default' : 'outline'}
                  aria-pressed={theme === 'light'}
                  onClick={() => setTheme('light')}
                  className="h-auto min-w-0 flex-col gap-1 px-1.5 py-2.5"
                >
                  <Sun className="h-4 w-4" />
                  Clair
                </Button>
                <Button
                  variant={theme === 'dark' ? 'default' : 'outline'}
                  aria-pressed={theme === 'dark'}
                  onClick={() => setTheme('dark')}
                  className="h-auto min-w-0 flex-col gap-1 px-1.5 py-2.5"
                >
                  <Moon className="h-4 w-4" />
                  Sombre
                </Button>
                <Button
                  variant={theme === 'system' ? 'default' : 'outline'}
                  aria-pressed={theme === 'system'}
                  onClick={() => setTheme('system')}
                  className="h-auto min-w-0 flex-col gap-1 px-1.5 py-2.5"
                >
                  <Monitor className="h-4 w-4" />
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
              { label: 'Écran allumé', hint: 'Pendant une séance, le téléphone ne se met pas en veille', on: keepAwake, toggle: () => setKeepAwake(!keepAwake) },
              { label: 'Suggestion de charge', hint: 'Toutes tes séries réussies la dernière fois ? +2,5 kg proposés (+1,25 kg bras et épaules)', on: suggestLoad, toggle: () => setSuggestLoad(!suggestLoad) },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-3 pt-4 border-t">
                <div>
                  <p className="text-sm font-medium">{row.label}</p>
                  <p className="text-xs text-muted-foreground">{row.hint}</p>
                </div>
                <Switch checked={row.on} label={row.label} onCheckedChange={row.toggle} />
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
            <div className="grid grid-cols-5 gap-1.5" role="group" aria-label="Objectif hebdomadaire">
              {WEEKLY_GOAL_OPTIONS.map((g) => (
                <Button
                  key={g}
                  variant={weeklyGoal === g ? 'default' : 'outline'}
                  className={cn('min-w-0 px-0 max-[359px]:text-xs active:scale-95', weeklyGoal === g && 'ring-2 ring-offset-2 ring-primary')}
                  aria-pressed={weeklyGoal === g}
                  onClick={() => setWeeklyGoal(g)}
                >
                  {g === 0 ? 'Aucun' : `${g}×`}
                </Button>
              ))}
            </div>
            <div className="flex items-center justify-between gap-3 pt-4 mt-4 border-t">
              <div>
                <p className="text-sm font-medium">Série affichée</p>
                <p className="text-xs text-muted-foreground">Jours d'affilée (avec joker) ou semaines à l'objectif</p>
              </div>
              <div className="flex gap-1 p-0.5 bg-muted rounded-lg shrink-0" role="group" aria-label="Série affichée">
                {(['daily', 'weekly'] as const).map((m) => (
                  <button key={m} type="button" onClick={() => setStreakMode(m)} aria-pressed={streakMode === m}
                    className={cn('px-3 min-h-11 rounded-md text-xs font-medium', streakMode === m ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground')}>
                    {m === 'daily' ? 'Jours' : 'Semaines'}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowQuestionnaire(true)}
              className="mt-3 min-h-11 text-sm font-medium text-primary underline-offset-2 hover:underline"
            >
              Refaire le questionnaire de départ
            </button>
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
                  className={cn('flex-1 min-w-0 px-2 active:scale-95', language === opt.id && 'ring-2 ring-offset-2 ring-primary')}
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
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Rappels d'entraînement</p>
                <p className="text-xs text-muted-foreground">Reçois un rappel quotidien pour tes séances</p>
              </div>
              <Switch checked={notificationsEnabled} label="Rappels d'entraînement" disabled={togglingNotif} onCheckedChange={handleNotificationToggle} />
            </div>

            {notificationsEnabled && (
              <div>
                <Label htmlFor="notification-time" className="mb-2 block">Heure du rappel</Label>
                <Input
                  id="notification-time"
                  type="time"
                  value={notificationTime}
                  onChange={(e) => handleTimeChange(e.target.value)}
                  className="h-11"
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
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Retour haptique</p>
                <p className="text-xs text-muted-foreground">Vibrations lors des interactions</p>
              </div>
              <Switch checked={hapticFeedback} label="Retour haptique" onCheckedChange={setHapticFeedback} />
            </div>

            <div className="flex items-center justify-between gap-3 pt-4 border-t mt-4">
              <div>
                <p className="text-sm font-medium">Effets sonores</p>
                <p className="text-xs text-muted-foreground">Sons de l'interface</p>
              </div>
              <Switch checked={soundEnabled} label="Effets sonores" onCheckedChange={setSoundEnabled} />
            </div>
          </CardContent>
        </Card>
        {/* Tes données : export, import, confidentialité */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold">Tes données</CardTitle>
          </CardHeader>
          <CardContent className="p-0 divide-y">
            <button
              onClick={() => handleExportData('json')}
              disabled={exporting}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted/50 active:bg-muted transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            >
              <div className="flex items-center gap-3">
                {exporting ? (
                  <Loader2 className="h-5 w-5 shrink-0 text-muted-foreground animate-spin" />
                ) : (
                  <Download className="h-5 w-5 shrink-0 text-muted-foreground" />
                )}
                <div className="min-w-0 text-left">
                  <p className="font-medium text-sm">Exporter mes données (JSON)</p>
                  <p className="text-xs text-muted-foreground">Sauvegarde complète : profil, séances, mensurations, modèles</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
            <button
              onClick={() => handleExportData('csv')}
              disabled={exporting}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted/50 active:bg-muted transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            >
              <div className="flex items-center gap-3">
                {exporting ? (
                  <Loader2 className="h-5 w-5 shrink-0 text-muted-foreground animate-spin" />
                ) : (
                  <Download className="h-5 w-5 shrink-0 text-muted-foreground" />
                )}
                <div className="min-w-0 text-left">
                  <p className="font-medium text-sm">Exporter mes séances (CSV)</p>
                  <p className="text-xs text-muted-foreground">Une ligne par série, pour Excel, Sheets, Strong ou Hevy</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
            <button
              id="import"
              onClick={() => csvInput.current?.click()}
              disabled={importing}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted/50 active:bg-muted transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            >
              <div className="flex items-center gap-3">
                {importing ? <Loader2 className="h-5 w-5 shrink-0 text-muted-foreground animate-spin" /> : <Upload className="h-5 w-5 shrink-0 text-muted-foreground" />}
                <div className="min-w-0 text-left">
                  <p className="font-medium text-sm">Importer depuis Strong ou Hevy (CSV)</p>
                  <p className="text-xs text-muted-foreground">Reprends tout ton historique de musculation</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
            <input ref={csvInput} type="file" accept=".csv,text/csv" className="hidden" aria-hidden tabIndex={-1}
              onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void onPickCsv(f); }} />
            <button
              onClick={() => navigate('/privacy-policy')}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted/50 active:bg-muted transition-colors rounded-b-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            >
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 text-left">
                  <p className="font-medium text-sm">Politique de confidentialité</p>
                  <p className="text-xs text-muted-foreground">Tes données et tes droits</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground pb-4">
          🏋️ Reps v{APP_VERSION}
        </p>

      </div>
      {showQuestionnaire && <StartQuestionnaire onDone={() => setShowQuestionnaire(false)} />}
      <Dialog open={!!importPreview} onOpenChange={(open) => !open && !importing && setImportPreview(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Importer ton historique ?</DialogTitle>
            <DialogDescription>
              {importPreview && importPreview.sessions.length > 0
                ? importSummary(importPreview.sessions, importPreview.known, importPreview.exercises, importPreview.pounds)
                : 'Toutes les séances de ce fichier sont déjà dans ton historique.'}
              {importPreview && importPreview.skipped > 0 && ` ${importPreview.skipped} déjà présente${importPreview.skipped > 1 ? 's' : ''}, ignorée${importPreview.skipped > 1 ? 's' : ''}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="flex-1 basis-28 min-h-11" onClick={() => setImportPreview(null)} disabled={importing}>Annuler</Button>
            <Button className="flex-1 basis-28 min-h-11" onClick={() => void confirmImport()} disabled={importing || !importPreview?.sessions.length}>
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Importer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}

export default Settings;
