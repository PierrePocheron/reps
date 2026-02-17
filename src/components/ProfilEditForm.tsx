import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateUserDocument, checkUsernameAvailability } from '@/firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/firebase/types';
import { Timestamp } from 'firebase/firestore';
import { BADGES } from '@/utils/constants';
import { logger } from '@/utils/logger';

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];
const YEARS = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i);

interface ProfilEditFormProps {
  user: User;
  onSuccess?: () => void;
}

export function ProfilEditForm({ user, onSuccess }: ProfilEditFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [formData, setFormData] = useState({
    displayName: user.displayName,
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    birthDate: user.birthDate || '',
    avatarEmoji: user.avatarEmoji || '🐥',
    weight: user.weight?.toString() || '',
    height: user.height?.toString() || '',
    gender: user.gender || 'male',
  });
  const { toast } = useToast();

  const getDaysBeforeNextChange = () => {
    if (!user.lastUsernameChange) return 0;
    const lastChange = user.lastUsernameChange.toDate();
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - lastChange.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, 7 - diffDays); // Il faut attendre 7 jours min
  };

  const canEditUsername = getDaysBeforeNextChange() <= 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validation du pseudo
      const username = formData.displayName.trim();
      const usernameRegex = /^[a-z0-9_.]+$/;

      if (username !== user.displayName) {
        // 1. Check Rate Limit
        if (!canEditUsername) {
          throw new Error(`Vous devez attendre ${getDaysBeforeNextChange()} jours avant de changer de pseudo.`);
        }

        // 2. Check Regex
        if (!usernameRegex.test(username)) {
            throw new Error('Le pseudo doit être en minuscules, sans espace, et ne contenir que des lettres, chiffres, underscores ou points.');
        }

        if (username.length < 3) {
            throw new Error('Le pseudo doit contenir au moins 3 caractères.');
        }

        // 3. Check Uniqueness
        const isAvailable = await checkUsernameAvailability(username, user.uid);
        if (!isAvailable) {
            throw new Error('Ce pseudo est déjà pris.');
        }
      }

      // Validation Poids
      if (formData.weight) {
        const weight = parseFloat(formData.weight);
        if (isNaN(weight)) throw new Error("C'est pas un chiffre ça...");
        if (weight < 20) throw new Error("Mange encore un peu 🍔");
        if (weight > 300) throw new Error("T'as pas ajouté un 0 en trop ? 👀");
      }

      // Validation Taille
      if (formData.height) {
        const height = parseInt(formData.height);
        if (isNaN(height)) throw new Error("C'est pas une taille ça...");
        if (height < 50) throw new Error("Reviens quand tu pourras faire des tractions 😅");
        if (height > 250) throw new Error("Ça va les chevilles ? 👀");
      }

      // Validation Age
      if (formData.birthDate) {
         const birthDate = new Date(formData.birthDate);
         const today = new Date();
         let age = today.getFullYear() - birthDate.getFullYear();
         const m = today.getMonth() - birthDate.getMonth();
         if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
             age--;
         }

         if (age < 5) {
             throw new Error("T'es un peu jeune non ? 👶");
         }
         if (age > 100) {
             throw new Error("T'abuses un peu sur l'âge 👀");
         }
      }

      const updates: Partial<User> = {
        displayName: username,
        firstName: formData.firstName,
        lastName: formData.lastName,
        avatarEmoji: formData.avatarEmoji,
        birthDate: formData.birthDate || undefined,
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        height: formData.height ? parseInt(formData.height) : undefined,
        gender: formData.gender as 'male' | 'female' | 'other',
      };

      // Supprimer les champs undefined pour éviter l'erreur Firestore
      Object.keys(updates).forEach(key => updates[key as keyof User] === undefined && delete updates[key as keyof User]);

      // Si le pseudo a changé, on met à jour le Timestamp
      if (username !== user.displayName) {
        updates.lastUsernameChange = Timestamp.now();
      }

      await updateUserDocument(user.uid, updates);

      toast({
        title: 'Profil mis à jour',
        description: 'Vos informations ont été enregistrées.',
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      logger.error('Profile update failed', error as Error);
      const err = error as Error;
      toast({
        title: 'Erreur',
        description: err.message || 'Impossible de mettre à jour le profil.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="displayName">Pseudo</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium select-none">@</span>
          <Input
            id="displayName"
            value={formData.displayName}
            onChange={(e) => setFormData({ ...formData, displayName: e.target.value.toLowerCase() })} // Force lowercase input visual
            placeholder="pseudo_unique"
            required
            disabled={!canEditUsername}
            className={`pl-8 ${!canEditUsername ? "opacity-50 cursor-not-allowed" : ""}`}
          />
        </div>
        {!canEditUsername && (
            <p className="text-xs text-muted-foreground text-orange-500">
                Vous pourrez changer de pseudo dans {getDaysBeforeNextChange()} jours.
            </p>
        )}
        {canEditUsername && (
            <p className="text-xs text-muted-foreground">
                Minuscules, chiffres, _ et . uniquement. Modifiable tous les 7 jours.
            </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">Prénom</Label>
          <Input
            id="firstName"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            placeholder="Prénom"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Nom</Label>
          <Input
            id="lastName"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            placeholder="Nom"
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Date de naissance</Label>
          <div className="grid grid-cols-3 gap-2">
            <select
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={formData.birthDate ? parseInt(formData.birthDate.split('-')[2] || '0') || '' : ''}
              onChange={(e) => {
                const d = e.target.value.padStart(2, '0');
                const parts = formData.birthDate?.split('-') || ['2000', '01', '01'];
                const m = parts[1] || '01';
                const y = parts[0] || '2000';
                setFormData({ ...formData, birthDate: `${y}-${m}-${d}` });
              }}
            >
              <option value="">Jour</option>
              {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>

            <select
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={formData.birthDate ? parseInt(formData.birthDate.split('-')[1] || '0') || '' : ''}
              onChange={(e) => {
                const m = e.target.value.padStart(2, '0');
                const parts = formData.birthDate?.split('-') || ['2000', '01', '01'];
                const d = parts[2] || '01';
                const y = parts[0] || '2000';
                setFormData({ ...formData, birthDate: `${y}-${m}-${d}` });
              }}
            >
              <option value="">Mois</option>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>

            <select
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={formData.birthDate ? parseInt(formData.birthDate.split('-')[0] || '0') || '' : ''}
              onChange={(e) => {
                const y = e.target.value;
                const parts = formData.birthDate?.split('-') || ['2000', '01', '01'];
                const m = parts[1] || '01';
                const d = parts[2] || '01';
                setFormData({ ...formData, birthDate: `${y}-${m}-${d}` });
              }}
            >
              <option value="">Année</option>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Sexe</Label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, gender: 'male' })}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors border ${
                formData.gender === 'male'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background hover:bg-muted border-input'
              }`}
            >
              Homme
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, gender: 'female' })}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors border ${
                formData.gender === 'female'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background hover:bg-muted border-input'
              }`}
            >
              Femme
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="weight">Poids (kg)</Label>
          <Input
            id="weight"
            type="number"
            step="0.1"
            value={formData.weight}
            onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
            placeholder="kg"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="height">Taille (cm)</Label>
          <Input
            id="height"
            type="number"
            value={formData.height}
            onChange={(e) => setFormData({ ...formData, height: e.target.value })}
            placeholder="cm"
          />
        </div>
      </div>

      <div className="pt-2 border-t mt-4">
        <Label className="mb-3 block font-semibold">Avatar</Label>
        <div className="flex items-center justify-between p-3 rounded-lg bg-card/50 border border-border mb-2">
             <div className="flex items-center gap-3">
                 <div className="text-3xl w-12 h-12 flex items-center justify-center bg-muted rounded-full border border-border">
                    {formData.avatarEmoji}
                 </div>
                 <div>
                    <p className="text-sm font-medium">Avatar actuel</p>
                    <p className="text-xs text-muted-foreground">
                      {BADGES.find(b => b.emoji === formData.avatarEmoji)?.name || "Poussin"}
                    </p>
                 </div>
             </div>
             <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAvatarPicker(!showAvatarPicker)}
             >
                {showAvatarPicker ? 'Masquer' : 'Modifier'}
             </Button>
        </div>

        {showAvatarPicker && (
            <div className="p-4 rounded-lg bg-muted/30 border border-muted animate-in fade-in zoom-in-95 duration-200">
            <div className="text-xs text-muted-foreground mb-3 font-medium">
                Choisissez parmi vos badges débloqués :
            </div>

            <div className="grid grid-cols-6 gap-2">
                {/* Toujours afficher le poussin */}
                <button
                type="button"
                onClick={() => setFormData({ ...formData, avatarEmoji: '🐥' })}
                className={`aspect-square flex items-center justify-center text-xl rounded-md transition-all ${
                    formData.avatarEmoji === '🐥'
                    ? 'bg-primary/20 ring-2 ring-primary scale-110'
                    : 'bg-muted hover:bg-muted/80'
                }`}
                >
                🐥
                </button>

                {/* Afficher les autres badges débloqués */}
                {BADGES.filter(b => user.badges?.includes(b.id) && b.id !== 'poussin').map((badge) => (
                <button
                    key={badge.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, avatarEmoji: badge.emoji })}
                    className={`aspect-square flex items-center justify-center text-xl rounded-md transition-all ${
                    formData.avatarEmoji === badge.emoji
                        ? 'bg-primary/20 ring-2 ring-primary scale-110'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                    title={badge.name}
                >
                    {badge.emoji}
                </button>
                ))}
            </div>
            {BADGES.filter(b => user.badges?.includes(b.id)).length === 0 && (
                <p className="text-xs text-center text-muted-foreground mt-2">
                Débloquez des badges pour obtenir plus d'avatars !
                </p>
            )}
            </div>
         )}
      </div>

      <div className="sticky bottom-0 bg-background pt-4 pb-2 border-t mt-4 z-10 -mx-1 px-1">
        <Button type="submit" className="w-full shadow-lg" disabled={isLoading}>
            {isLoading ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
      </div>
    </form>
  );
}
