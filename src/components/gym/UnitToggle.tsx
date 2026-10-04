/** Unité des séries d'un exercice : reps ⇄ secondes (gainage, #55) ; un appui bascule tout l'exercice. */
export function UnitToggle({ timed, onToggle }: { timed: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title="Changer l'unité (reps ⇄ secondes)"
      aria-label={timed ? 'Unité : secondes, passer en répétitions' : 'Unité : répétitions, passer en secondes'}
      className="min-h-11 -my-1.5 text-xs text-muted-foreground underline decoration-dotted underline-offset-4 hover:text-foreground"
    >
      {timed ? 's' : 'reps'}
    </button>
  );
}
