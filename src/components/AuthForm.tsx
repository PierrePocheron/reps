import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Mail, Lock, User, Loader2 } from 'lucide-react';
import { sendPasswordResetEmail } from '@/firebase/auth';
import { validatePassword, PASSWORD_MIN_LENGTH } from '@/utils/validation';
import { logger } from '@/utils/logger';

/**
 * Formulaire d'authentification (connexion et inscription)
 */
export function AuthForm() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Password Reset State
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        if (!firstName.trim() || !lastName.trim()) {
          toast({
            title: 'Erreur',
            description: 'Le prénom et le nom sont requis',
            variant: 'destructive',
          });
          setIsLoading(false);
          return;
        }

        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
            toast({
                title: 'Mot de passe invalide',
                description: passwordValidation.message,
                variant: 'destructive',
            });
            setIsLoading(false);
            return;
        }

        await signUpWithEmail(email, password, firstName, lastName);
        toast({
          title: 'Bienvenue !',
          description: 'Ton aventure commence maintenant ! 🐥',
        });
      } else {
        await signInWithEmail(email, password);
        toast({
          title: 'Connexion réussie',
          description: 'Bon retour ! 💪',
        });
      }
    } catch (error: unknown) {
      // ... existing error handling ...
      let errorMessage = 'Une erreur est survenue';
      const firebaseError = error as { code?: string; message?: string };
      // ... existing error handlers ...
      if (firebaseError.code === 'auth/user-not-found' || firebaseError.code === 'auth/invalid-credential') {
        errorMessage = 'Email ou mot de passe incorrect';
      } else if (firebaseError.code === 'auth/wrong-password') {
        errorMessage = 'Mot de passe incorrect';
      } else if (firebaseError.code === 'auth/email-already-in-use') {
        errorMessage = 'Cet email est déjà utilisé (as-tu un compte Google ?)';
      } else if (firebaseError.code === 'auth/weak-password') {
        errorMessage = `Le mot de passe est trop faible (minimum ${PASSWORD_MIN_LENGTH} caractères)`;
      } else if (firebaseError.code === 'auth/invalid-email') {
        errorMessage = 'Email invalide';
      } else if (firebaseError.code === 'auth/too-many-requests') {
        errorMessage = 'Trop de tentatives, réessaie dans quelques minutes';
      }

      toast({
        title: 'Erreur',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };





  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return;

    setIsResetting(true);
    try {
      await sendPasswordResetEmail(resetEmail);
      toast({
        title: 'Email envoyé',
        description: 'Vérifie ta boîte de réception pour réinitialiser ton mot de passe.',
      });
      setShowResetDialog(false);
      setResetEmail('');
    } catch (error: unknown) {
      logger.error('Password reset failed', error as Error);
      const firebaseError = error as { code?: string; message?: string };
      let errorMessage = "Impossible d'envoyer l'email";

      if (firebaseError.code === 'auth/user-not-found') {
        errorMessage = "Aucun compte associé à cet email";
      } else if (firebaseError.code === 'auth/invalid-email') {
        errorMessage = "Format d'email invalide";
      }

      toast({
        title: 'Erreur',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsResetting(false);
    }
  };


  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
      toast({
        title: 'Connexion réussie',
        description: 'Bon retour ! 💪',
      });
    } catch (error: unknown) {
      logger.error('Erreur connexion Google:', error);
      const firebaseError = error as { code?: string; message?: string };
      toast({
        title: 'Erreur',
        description: `Impossible de se connecter : ${firebaseError.message || 'Erreur inconnue'}`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };





  return (
    <>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{isSignUp ? 'Créer un compte' : 'Se connecter'}</CardTitle>
          <CardDescription>
            {isSignUp
              ? 'Rejoins Reps pour suivre tes entraînements'
              : 'Connecte-toi pour accéder à ton profil'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Boutons OAuth */}
          <div className="space-y-2">
            <Button
              onClick={handleGoogleSignIn}
              variant="outline"
              className="w-full"
              disabled={isLoading}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continuer avec Google
            </Button>

          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Ou</span>
            </div>
          </div>

          {/* Formulaire email/password */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Prénom"
                        aria-label="Prénom"
                        autoComplete="given-name"
                        className="pl-9"
                        disabled={isLoading}
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Nom"
                        aria-label="Nom"
                        autoComplete="family-name"
                        className="pl-9"
                        disabled={isLoading}
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>
              )}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="ton@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  disabled={isLoading}
                  autoComplete="email"
                  inputMode="email"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium">
                  Mot de passe
                </label>
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={() => {
                        setResetEmail(email);
                        setShowResetDialog(true);
                    }}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    Mot de passe oublié ?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  disabled={isLoading}
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  required
                  minLength={6}
                />
              </div>
              {isSignUp && <p className="text-xs text-muted-foreground">Au moins {PASSWORD_MIN_LENGTH} caractères, avec une lettre et un chiffre</p>}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isSignUp ? 'Inscription...' : 'Connexion...'}
                </>
              ) : (
                isSignUp ? 'S\'inscrire' : 'Se connecter'
              )}
            </Button>
          </form>

          {/* Lien pour basculer entre connexion/inscription */}
          <div className="text-center text-sm">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setEmail('');
                setPassword('');
              }}
              className="text-primary hover:underline"
            >
              {isSignUp
                ? 'Déjà un compte ? Se connecter'
                : 'Pas encore de compte ? S\'inscrire'}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Dialog Mot de passe oublié */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Réinitialiser le mot de passe</DialogTitle>
            <DialogDescription>
              Entre ton adresse email pour recevoir un lien de réinitialisation.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="reset-email" className="text-sm font-medium">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="ton@email.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="pl-10"
                  disabled={isResetting}
                  required
                />
              </div>
            </div>
            <DialogFooter>
               <Button type="button" variant="outline" onClick={() => setShowResetDialog(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={isResetting}>
                {isResetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Envoyer le lien
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
