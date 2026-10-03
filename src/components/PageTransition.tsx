import { ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

/**
 * Fondu d'entrée en CSS. Pas de framer-motion ici : il laissait des valeurs résiduelles
 * (translateY 0,0097 px puis opacité 0,9995) qui créaient un contexte d'empilement ;
 * la barre de séance (position: fixed) et les feuilles finissaient sous la navigation (#44).
 */
export function PageTransition({ children, className }: PageTransitionProps) {
  return <div className={cn('animate-fade-in', className)}>{children}</div>;
}
