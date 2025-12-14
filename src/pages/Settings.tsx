import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ColorPicker } from '@/components/ui/color-picker';
import { BackButton } from '@/components/BackButton';
import { useTheme } from '@/hooks/useTheme';
import { useSettingsStore } from '@/store/settingsStore';
import { Moon, Sun, Monitor, Bell, Vibrate } from 'lucide-react';

function Settings() {
  const { theme, colorTheme, setTheme, setColorTheme } = useTheme();
  const { notificationsEnabled, notificationTime, hapticFeedback, setNotificationsEnabled, setNotificationTime, setHapticFeedback } = useSettingsStore();

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <BackButton to="/profile" />
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
                  Recevez des rappels pour vos séances
                </p>
              </div>
              <Button
                variant={notificationsEnabled ? 'default' : 'outline'}
                size="sm"
                onClick={() => setNotificationsEnabled(!notificationsEnabled)}
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
                  onChange={(e) => setNotificationTime(e.target.value)}
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default Settings;
