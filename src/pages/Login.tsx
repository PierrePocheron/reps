
import { useNavigate, Link } from 'react-router-dom';
import { AuthForm } from '@/components/AuthForm';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useEffect } from 'react';

export default function Login() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (user && !isLoading) {
      navigate('/');
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background p-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))] flex items-center justify-center">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="mb-2 text-3xl font-bold">🏋️ Reps</h1>
          <p className="text-muted-foreground">
            Suis tes séances de renforcement et de musculation
          </p>
        </div>
        <AuthForm
          onSuccess={() => {
            navigate('/');
          }}
        />
        <p className="text-center text-xs text-muted-foreground">
          En te connectant, tu acceptes notre{' '}
          <Link to="/privacy-policy" className="underline underline-offset-2 hover:text-foreground transition-colors">
            politique de confidentialité
          </Link>
        </p>
      </div>
    </main>
  );
}
