import { useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useUserStore } from '@/store/userStore';
import { useToast } from '@/hooks/use-toast';
import { useSound } from '@/hooks/useSound';
import { useHaptic } from '@/hooks/useHaptic';

export function useBadgeEvents() {
    const { user } = useUserStore();
    const { toast } = useToast();
    const { play } = useSound();
    const haptics = useHaptic();

    // Pour éviter de réagir aux événements déjà traités (doublons potentiels au montage)
    const processedEvents = useRef<Set<string>>(new Set());

    useEffect(() => {
        if (!user) return;

        const eventsRef = collection(db, 'users', user.uid, 'userEvents');
        const q = query(
            eventsRef,
            where('type', '==', 'badge_unlocked'),
            orderBy('createdAt', 'desc'),
            limit(5) // On ne regarde que les récents
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const eventData = change.doc.data();
                    const eventId = change.doc.id;

                    // Ignorer les événements déjà traités (double déclenchement en mode Strict)
                    if (processedEvents.current.has(eventId)) return;
                    // Only an event this device just wrote: one read back from the server (app reloaded within the
                    // minute) was already celebrated. The event is never deleted: friends' feeds show it
                    if (!change.doc.metadata.hasPendingWrites) return;

                    // Si l'événement a plus de 1 minute, on l'ignore (probablement un vieux truc qui traîne)
                    const eventTime = eventData.createdAt?.toMillis?.() || Date.now();
                    if (Date.now() - eventTime > 60000) return;

                    processedEvents.current.add(eventId);

                    // Petit délai pour laisser le temps au toast de "Validation" de s'afficher (si applicable)
                    // afin que celui du badge arrive "après" et soit bien visible
                    setTimeout(() => {
                        // 1. Jouer son et vibration
                        play('success');
                        haptics.notification();

                        // 2. Afficher le Toast
                        toast({
                            title: "Badge débloqué ! 🏆",
                            description: `${eventData.badgeEmoji} ${eventData.badgeName}`,
                            className: "bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-orange-200",
                            duration: 6000, // Un peu plus long pour être sûr d'être vu
                        });
                    }, 1000);
                }
            });
        });

        return () => unsubscribe();
    }, [user, toast, play, haptics]);
}
