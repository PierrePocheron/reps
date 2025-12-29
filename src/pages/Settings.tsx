import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ColorPicker } from '@/components/ui/color-picker';
import { BackButton } from '@/components/BackButton';
import { useTheme } from '@/hooks/useTheme';
import { useSettingsStore } from '@/store/settingsStore';
import { Moon, Sun, Monitor, Bell, Vibrate, Dumbbell, Volume2 } from 'lucide-react';
import { useUserStore } from '@/store/userStore';
import { cn } from '@/utils/cn';

import { useNotifications } from '@/hooks/useNotifications';

function Settings() {
  const { theme, colorTheme, setTheme, setColorTheme } = useTheme();
  const { user, updateProfile } = useUserStore();
  const { notificationsEnabled, notificationTime, hapticFeedback, soundEnabled, setNotificationsEnabled, setNotificationTime, setHapticFeedback, setSoundEnabled } = useSettingsStore();
  const { scheduleDailyReminder, cancelReminder } = useNotifications();

  const handleNotificationToggle = async () => {
    const newState = !notificationsEnabled;
    setNotificationsEnabled(newState);

    if (newState) {
      await scheduleDailyReminder(notificationTime);
    } else {
      await cancelReminder();
    }
  };

  const handleTimeChange = async (newTime: string) => {
    setNotificationTime(newTime);
    if (notificationsEnabled) {
      await scheduleDailyReminder(newTime);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <BackButton to="/profil" />
          <h1 className="text-2xl font-bold">Paramètres</h1>
        </div>

        {/* Thème */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Apparence
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Mode</p>
              <div className="flex gap-2">
                <Button
                  variant={theme === 'light' ? 'default' : 'outline'}
                  onClick={() => setTheme('light')}
                  className="flex-1"
                >
                  <Sun className="h-4 w-4 mr-2" />
                  Clair
                </Button>
                <Button
                  variant={theme === 'dark' ? 'default' : 'outline'}
                  onClick={() => setTheme('dark')}
                  className="flex-1"
                >
                  <Moon className="h-4 w-4 mr-2" />
                  Sombre
                </Button>
                <Button
                  variant={theme === 'system' ? 'default' : 'outline'}
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
            <CardTitle className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5" />
              Session
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Boutons de répétitions</p>
              <p className="text-xs text-muted-foreground mb-3">
                Choisissez jusqu'à 4 boutons à afficher (min 1).
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
                        "h-10 w-10 p-0 rounded-full",
                        isSelected && "ring-2 ring-offset-2 ring-primary"
                      )}
                      disabled={isDisabled}
                      onClick={async () => {
                        let newButtons;
                        if (isSelected) {
                          if (currentButtons.length <= 1) return; // Prevent removing last button
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
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Rappels d'entraînement</p>
                <p className="text-sm text-muted-foreground">
                  Recevez des rappels pour vos séances (App mobile)
                </p>
              </div>
              <Button
                variant={notificationsEnabled ? 'default' : 'outline'}
                size="sm"
                onClick={handleNotificationToggle}
              >
                {notificationsEnabled ? 'Activé' : 'Désactivé'}
              </Button>
            </div>

            {notificationsEnabled && (
              <div>
                <p className="text-sm font-medium mb-2">Heure du rappel</p>
                <input
                  type="time"
                  value={notificationTime}
                  onChange={(e) => handleTimeChange(e.target.value)}
                  className="w-full p-2 border rounded-md"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Autres */}
        <Card>
          <CardHeader>
            <CardTitle>Autres</CardTitle>
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
                size="sm"
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
                size="sm"
                onClick={() => setSoundEnabled(!soundEnabled)}
              >
                {soundEnabled ? 'Activé' : 'Désactivé'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default Settings;
