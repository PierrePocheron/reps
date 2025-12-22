import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateUserDocument, checkUsernameAvailability } from '@/firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/firebase/types';
import { Timestamp } from 'firebase/firestore';
import { BADGES } from '@/utils/constants';

interface ProfileEditFormProps {
  user: User;
}

export function ProfileEditForm({ user }: ProfileEditFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    displayName: user.displayName,
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    birthDate: user.birthDate || '',
    avatarEmoji: user.avatarEmoji || '🐥',
    weight: user.weight?.toString() || '',
    height: user.height?.toString() || '',
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

      // Validation Poids / Taille
      if (formData.weight) {
        const weight = parseFloat(formData.weight);
        if (isNaN(weight) || weight < 20 || weight > 300) {
            throw new Error('Le poids doit être compris entre 20 et 300 kg.');
        }
      }

      if (formData.height) {
        const height = parseInt(formData.height);
        if (isNaN(height) || height < 50 || height > 250) {
            throw new Error('La taille doit être comprise entre 50 et 250 cm.');
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
      };

      // Si le pseudo a changé, on met à jour le Timestamp
      if (username !== user.displayName) {
        updates.lastUsernameChange = Timestamp.now();
      }

      await updateUserDocument(user.uid, updates);

      toast({
        title: 'Profil mis à jour',
        description: 'Vos informations ont été enregistrées.',
      });
    } catch (error) {
      console.error(error);
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour le profil.',
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
        <Input
          id="displayName"
          value={formData.displayName}
          onChange={(e) => setFormData({ ...formData, displayName: e.target.value.toLowerCase() })} // Force lowercase input visual
          placeholder="pseudo_unique"
          required
          disabled={!canEditUsername}
          className={!canEditUsername ? "opacity-50 cursor-not-allowed" : ""}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="avatarEmoji">Avatar (Emoji)</Label>
        <div className="flex gap-2">
          <Input
            id="avatarEmoji"
            value={formData.avatarEmoji}
            onChange={(e) => setFormData({ ...formData, avatarEmoji: e.target.value })}
            placeholder="🐥"
            className="text-2xl text-center w-16"
            maxLength={2}
          />
          <div className="text-sm text-muted-foreground flex items-center">
            Choisissez un emoji pour votre profil
          </div>
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

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="birthDate">Date de naissance</Label>
          <Input
            id="birthDate"
            type="date"
            value={formData.birthDate}
            onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
          />
        </div>
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

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Enregistrement...' : 'Enregistrer'}
      </Button>
    </form>
  );
}
