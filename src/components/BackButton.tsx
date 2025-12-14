import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  to?: string;
  className?: string;
}

/**
 * Bouton de retour avec navigation
 */
export function BackButton({ to, className }: BackButtonProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (to) {
      navigate(to);
    } else {
      navigate(-1);
    }
  };

  return (
    <Button variant="ghost" size="icon" onClick={handleClick} className={className}>
      <ArrowLeft className="h-5 w-5" />
      <span className="sr-only">Retour</span>
    </Button>
  );
}

