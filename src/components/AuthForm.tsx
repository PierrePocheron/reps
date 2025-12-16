import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Mail, Lock, User, Loader2 } from 'lucide-react';

interface AuthFormProps {
  onSuccess?: () => void;
}

/**
 * Formulaire d'authentification (connexion et inscription)
 */
export function AuthForm({ onSuccess }: AuthFormProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithApple } = useAuth();
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
        await signUpWithEmail(email, password, firstName, lastName);
        toast({
          title: 'Inscription réussie',
          description: 'Bienvenue sur Reps ! 🎉',
        });
      } else {
        await signInWithEmail(email, password);
        toast({
          title: 'Connexion réussie',
          description: 'Bon retour ! 💪',
        });
      }
      onSuccess?.();
    } catch (error: unknown) {
      let errorMessage = 'Une erreur est survenue';
      const firebaseError = error as { code?: string; message?: string };
      if (firebaseError.code === 'auth/user-not-found') {
        errorMessage = 'Aucun compte trouvé avec cet email';
      } else if (firebaseError.code === 'auth/wrong-password') {
        errorMessage = 'Mot de passe incorrect';
      } else if (firebaseError.code === 'auth/email-already-in-use') {
        errorMessage = 'Cet email est déjà utilisé';
      } else if (firebaseError.code === 'auth/weak-password') {
        errorMessage = 'Le mot de passe est trop faible (minimum 6 caractères)';
      } else if (firebaseError.code === 'auth/invalid-email') {
        errorMessage = 'Email invalide';
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

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
      toast({
        title: 'Connexion réussie',
        description: 'Bon retour ! 💪',
      });
      onSuccess?.();
    } catch (error: unknown) {
      console.error('Erreur connexion Google:', error);
      const firebaseError = error as { code?: string; message?: string };
      toast({
        title: 'Erreur',
        description: `Impossible de se connecter: ${firebaseError.message || 'Erreur inconnue'}`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    toast({
      title: 'Bientôt disponible',
      description: 'La connexion avec Apple n\'est pas encore implémentée.',
    });
  };



  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{isSignUp ? 'Créer un compte' : 'Se connecter'}</CardTitle>
        <CardDescription>
          {isSignUp
            ? 'Rejoignez Reps pour suivre vos entraînements'
            : 'Connectez-vous pour accéder à votre profil'}
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
          <Button
            onClick={handleAppleSignIn}
            variant="outline"
            className="w-full"
            disabled={isLoading}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
            Continuer avec Apple
          </Button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Ou</span>
          </div>
        </div>

        {/* Formulaire email/password */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Prénom"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Nom"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
              <input
                id="email"
                type="email"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-10 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Mot de passe
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-10 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                required
                minLength={6}
              />
            </div>
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
  );
}

