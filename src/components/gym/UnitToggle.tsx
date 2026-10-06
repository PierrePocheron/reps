/** Unité des séries d'un exercice : reps ⇄ secondes (gainage, #55) ; un appui bascule tout l'exercice. */
export function UnitToggle({ timed, onToggle }: { timed: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title="Changer l'unité (reps ⇄ secondes)"
      aria-label={timed ? 'Unité : secondes, passer en répétitions' : 'Unité : répétitions, passer en secondes'}
      // 32 px wide whatever the unit (« s » alone was 6 px); -mx-1 takes it from the gaps, not from the row
      className="min-h-11 min-w-8 -my-1.5 -mx-1 text-center text-xs text-muted-foreground underline decoration-dotted underline-offset-4 hover:text-foreground"
    >
      {timed ? 's' : 'reps'}
    </button>
  );
}
