import { useState, useEffect } from 'react';
import { formatNumber, frDate } from '@/utils/formatters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageLayout } from '@/components/layout/PageLayout';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useUserStore } from '@/store/userStore';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Timestamp } from 'firebase/firestore';
import {
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  getFriendsDetails,
  getFriendsActivity,
  removeFriend,
  type ActivityItem
} from '@/firebase/firestore';
import { UserAvatar } from '@/components/UserAvatar';
import type { User, FriendRequest, Session } from '@/firebase/types';
import { UserPlus, Search, Check, X, Users, Activity, Calendar, Award, MoreVertical, UserMinus, Flame, Copy } from 'lucide-react';
import { logger } from '@/utils/logger';
import { KudosButton } from '@/components/Kudos';
import { FriendTemplatesDialog } from '@/components/FriendTemplatesDialog';

export default function Friends() {
  const { user, friendRequests } = useUserStore();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('activity');
  const [templatesOf, setTemplatesOf] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [friends, setFriends] = useState<User[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);
  // a failed read is shown as such (it used to look like « no friends » / an empty feed), with a retry
  const [friendsFailed, setFriendsFailed] = useState(false);
  const [activityFailed, setActivityFailed] = useState(false);
  const [retry, setRetry] = useState(0);

  const [pendingUid, setPendingUid] = useState<string | null>(null);
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);
  const [friendToRemove, setFriendToRemove] = useState<User | null>(null);

  // Load friends
  useEffect(() => {
    if (!user || !user.friends || user.friends.length === 0) {
      setFriends([]);
      return;
    }

    const loadFriends = async () => {
      setIsLoadingFriends(true);
      try {
        const friendsList = await getFriendsDetails(user.friends);
        setFriends(friendsList);
        setFriendsFailed(false);
      } catch (error) {
        logger.error('Error loading friends:', error);
        setFriendsFailed(true);
      } finally {
        setIsLoadingFriends(false);
      }
    };

    loadFriends();
  }, [user, user?.friends, retry]);

  // Load activity when tab changes to 'activity' and friends are loaded
  useEffect(() => {
    if (!user?.friends?.length) { setActivities([]); return; } // last friend removed: the old items rendered as a blank area
    if (activeTab === 'activity') {
      const loadActivity = async () => {
        setIsLoadingActivity(true);
        try {
          const sessions = await getFriendsActivity(user.friends);
          setActivities(sessions);
          setActivityFailed(false);
        } catch (error) {
          logger.error('Error loading activity:', error);
          setActivityFailed(true);
        } finally {
          setIsLoadingActivity(false);
        }
      };
      loadActivity();
    }
  }, [activeTab, user?.friends, retry]);

  const loadError = (what: string) => (
    <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
      <p className="font-semibold">Impossible de charger {what}</p>
      <p className="text-sm text-muted-foreground">Vérifie ta connexion puis réessaie.</p>
      <Button variant="outline" size="sm" className="rounded-xl min-h-11" onClick={() => setRetry((n) => n + 1)}>Réessayer</Button>
    </div>
  );

  // Debounced search
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchTerm.length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const results = await searchUsers(searchTerm);
        // Self only: friends stay, shown as « Ami » (filtering them made the search answer « aucun utilisateur »)
        const filteredResults = results.filter(u => u.uid !== user?.uid);
        setSearchResults(filteredResults);
      } catch (error) {
        logger.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    }, 500); // 500ms delay

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, user]);

  const handleSendRequest = async (toUserId: string) => {
    if (!user) return;
    setPendingUid(toUserId);
    try {
      await sendFriendRequest(user, toUserId);
      toast({
        title: 'Demande envoyée',
        description: 'Ta demande d\'ami a été envoyée !',
      });
      // Remove from search results to give feedback
      setSearchResults(prev => prev.filter(u => u.uid !== toUserId));
    } catch (error) {
      const err = error as Error;
      toast({
        title: 'Erreur',
        description: err.message || 'Impossible d\'envoyer la demande',
        variant: 'destructive',
      });
    } finally {
      setPendingUid(null);
    }
  };

  const handleAcceptRequest = async (request: FriendRequest) => {
    if (!user) return;
    setPendingRequestId(request.id);
    try {
      await acceptFriendRequest(request.id, request.fromUserId, user.uid);
      toast({
        title: 'Ami ajouté',
        description: `Tu es maintenant ami avec ${request.fromDisplayName}`,
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'accepter la demande',
        variant: 'destructive',
      });
    } finally {
      setPendingRequestId(null);
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    setPendingRequestId(requestId);
    try {
      await declineFriendRequest(requestId);
      toast({
        title: 'Demande refusée',
        description: 'La demande d\'ami a été refusée',
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de refuser la demande',
        variant: 'destructive',
      });
    } finally {
      setPendingRequestId(null);
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!user) return;
    try {
      await removeFriend(user.uid, friendId);
      toast({
        title: 'Ami supprimé',
        description: 'Cet utilisateur a été retiré de ta liste d\'amis.',
      });
      // Update local state
      setFriends(prev => prev.filter(f => f.uid !== friendId));
      setFriendToRemove(null);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer l\'ami',
        variant: 'destructive',
      });
    }
  };

  const getFriendDetails = (userId: string) => {
    return friends.find(f => f.uid === userId);
  };

  const formatDate = (timestamp: Timestamp | null | undefined) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const now = new Date();
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const dayDiff = Math.round((startOfDay(now) - startOfDay(date)) / 86400000);

    const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    if (dayDiff === 0) return `Aujourd'hui à ${timeStr}`;
    if (dayDiff === 1) return `Hier à ${timeStr}`;
    return frDate(date, { day: 'numeric', month: 'short' }) + ` à ${timeStr}`;
  };







  if (!user) return null;

  return (
    <PageLayout title="SOCIAL">
      <div className="max-w-2xl mx-auto space-y-6">

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="activity">Activité</TabsTrigger>
            <TabsTrigger value="friends" className="relative">
              Amis
              {friendRequests.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-[1.25rem] px-1 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                  {friendRequests.length}
                  <span className="sr-only"> demande{friendRequests.length > 1 ? 's' : ''} en attente</span>
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="activity" className="space-y-4 animate-in fade-in-50">
            {activityFailed && !isLoadingActivity ? loadError("l'activité de tes amis") : isLoadingActivity ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : activities.length > 0 ? (
              <div className="space-y-4">
                {activities.map((activityItem) => {
                  const item = activityItem as unknown as Session & { id?: string; type?: string; badgeName?: string; badgeEmoji?: string };
                  const friend = getFriendDetails(item.userId);
                  // Pour les événements 'new_friend', on veut afficher l'info même si on n'est pas (encore) ami avec la 3ème personne
                  // Mais ici item.userId est celui qui a généré l'événement (donc notre ami).
                  if (!friend) return null;

                  if (item.type === 'badge_unlocked') {
                    return (
                      <Card key={item.id} className="overflow-hidden border-none shadow-sm bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-l-4 border-l-yellow-500">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <UserAvatar user={friend} size="md" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm">
                                <span className="font-semibold">{friend.displayName}</span> a débloqué un badge !
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-2xl">{item.badgeEmoji}</span>
                                <span className="font-bold text-primary truncate">{item.badgeName}</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(item.createdAt)}
                              </p>
                            </div>
                            <Award className="h-8 w-8 text-yellow-500 opacity-50" />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  }

                  if (item.type === 'new_friend') {
                    return (
                      <Card key={item.id} className="overflow-hidden border-none shadow-sm bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-l-4 border-l-blue-500">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <UserAvatar user={friend} size="md" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm">
                                <span className="font-semibold">{friend.displayName}</span> a un nouvel ami !
                              </p>
                              <div className="flex items-center gap-2 mt-1 text-blue-600 dark:text-blue-400">
                                <UserPlus className="h-4 w-4" />
                                <span className="font-medium">Nouvelle connexion</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(item.createdAt)}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  }

                  // C'est une session
                  return (
                    <Card key={item.sessionId} className="overflow-hidden border-none shadow-sm bg-card/50">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <UserAvatar user={friend} size="md" />
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                              <div className="min-w-0">
                                <h3 className="font-semibold text-sm truncate">{friend.displayName}</h3>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {formatDate(item.date || item.createdAt)}
                                </p>
                              </div>
                              <div className="text-right shrink-0 ml-2">
                                <span className="text-lg font-bold text-primary">{item.totalReps}</span>
                                <span className="text-xs text-muted-foreground ml-1">reps</span>
                                {(item.totalCalories || 0) > 0 && (
                                  <div className="flex items-center justify-end gap-1 text-orange-700 dark:text-orange-400 mt-1">
                                    <Flame className="h-3 w-3" />
                                    <span className="text-xs font-bold">{item.totalCalories} kcal</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="mt-3 space-y-1">
                              {item.exercises && item.exercises
                                .sort((a, b) => b.reps - a.reps)
                                .slice(0, 3)
                                .map((exo, idx) => (
                                <div key={idx} className="flex items-center justify-between text-sm bg-muted/30 p-1.5 rounded-md">
                                  <span className="flex items-center gap-2 truncate">
                                    <span>{exo.emoji}</span>
                                    <span className="truncate">{exo.name}</span>
                                  </span>
                                  <span className="font-medium text-muted-foreground">{exo.reps}</span>
                                </div>
                              ))}
                              {item.exercises && item.exercises.length > 3 && (
                                <p className="text-xs text-center text-muted-foreground pt-1">
                                  {`+ ${item.exercises.length - 3} autre${item.exercises.length - 3 > 1 ? 's' : ''} exercice${item.exercises.length - 3 > 1 ? 's' : ''}`}
                                </p>
                              )}
                            </div>
                            <KudosButton ownerId={item.userId} sessionId={item.sessionId} ownerName={friend.displayName} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (user.friends?.length ?? 0) === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <div className="bg-muted/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 opacity-50" />
                </div>
                <p className="mb-2">Ton fil est vide pour l'instant.</p>
                <p className="text-sm opacity-75 mb-4">Ajoute des amis pour suivre leurs séances ici.</p>
                <Button variant="secondary" onClick={() => setActiveTab('friends')}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Trouver des amis
                </Button>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <div className="bg-muted/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Activity className="h-8 w-8 opacity-50" />
                </div>
                <p className="mb-2">Aucune activité récente.</p>
                <p className="text-sm opacity-75">Tes amis n'ont pas encore fait de sport !</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="friends" className="space-y-6 animate-in fade-in-50">
            {/* Barre de recherche */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                inputMode="search"
                enterKeyHint="search"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                aria-label="Rechercher un utilisateur par pseudo ou e-mail"
                placeholder="Pseudo ou e-mail…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-10 bg-card/50"
              />
              {searchTerm && (
                <button
                  type="button"
                  aria-label="Effacer la recherche"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-1 top-1/2 -translate-y-1/2 p-2 rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Résultats de recherche */}
            {searchTerm.length >= 2 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground">Résultats de recherche</h3>
                {isSearching ? (
                  <div className="flex justify-center py-4">
                    <LoadingSpinner />
                  </div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((result) => (
                    <Card key={result.uid} className="overflow-hidden border-none shadow-sm bg-card/50">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <UserAvatar user={result} size="md" />
                          <div className="min-w-0">
                            <p className="font-medium truncate">{result.displayName}</p>
                            {user.friends?.includes(result.uid) ? (
                              <p className="text-xs text-green-700 dark:text-green-400 flex items-center gap-1">
                                <Check className="h-3 w-3" /> Ami
                              </p>
                            ) : friendRequests.some(req => req.fromUserId === result.uid) ? (
                              <p className="text-xs text-blue-600 dark:text-blue-400">Demande reçue</p>
                            ) : (
                              <p className="text-xs text-muted-foreground truncate">Envoie-lui une demande d'ami</p>
                            )}
                          </div>
                        </div>
                        {!user.friends?.includes(result.uid) && !friendRequests.some(req => req.fromUserId === result.uid) && (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={pendingUid === result.uid}
                            onClick={() => handleSendRequest(result.uid)}
                            className="shrink-0 active:scale-95"
                          >
                            {pendingUid === result.uid ? (
                              <LoadingSpinner size="sm" />
                            ) : (
                              <>
                                <UserPlus className="h-4 w-4 mr-2" />
                                Ajouter
                              </>
                            )}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Aucun utilisateur ne correspond à «&nbsp;{searchTerm}&nbsp;».</p>
                    <p className="text-sm mt-1">Vérifie l'orthographe du pseudo ou essaie l'adresse e-mail exacte.</p>
                  </div>
                )}
              </div>
            )}

            {/* Demandes d'amis (si pas de recherche active) */}
            {searchTerm.length < 2 && friendRequests.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
                  Demandes en attente
                </h3>
                {friendRequests.map((request) => (
                  <Card key={request.id} className="overflow-hidden border-none shadow-sm bg-card/50 border-l-4 border-l-primary">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <UserAvatar user={{ displayName: request.fromDisplayName }} emoji={request.fromAvatarEmoji} size="md" />
                        <div className="min-w-0">
                          <p className="font-medium truncate">{request.fromDisplayName}</p>
                          <p className="text-xs text-muted-foreground">veut t'ajouter</p>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="icon"
                          aria-label={`Accepter la demande de ${request.fromDisplayName}`}
                          className="rounded-full shrink-0 active:scale-95"
                          disabled={pendingRequestId === request.id}
                          onClick={() => handleAcceptRequest(request)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          aria-label={`Refuser la demande de ${request.fromDisplayName}`}
                          className="rounded-full shrink-0 text-muted-foreground hover:text-destructive hover:border-destructive/40 active:scale-95"
                          disabled={pendingRequestId === request.id}
                          onClick={() => handleDeclineRequest(request.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Liste d'amis (si pas de recherche active) */}
            {searchTerm.length < 2 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground">Mes amis{isLoadingFriends ? '' : ` (${friends.length})`}</h3>
                {friendsFailed && !isLoadingFriends ? loadError('tes amis') : isLoadingFriends ? (
                  <div className="flex justify-center py-12">
                    <LoadingSpinner />
                  </div>
                ) : friends.length > 0 ? (
                  friends.map((friend) => (
                    <Card key={friend.uid} className="overflow-hidden border-none shadow-sm bg-card/50">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <UserAvatar user={friend} size="md" />
                          <div className="min-w-0">
                            <p className="font-medium truncate">{friend.displayName}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {friend.totalSessions} séance{friend.totalSessions > 1 ? 's' : ''} • {formatNumber(friend.totalReps)} reps
                            </p>
                          </div>
                        </div>

                        <DropdownMenu modal={false}>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="shrink-0 -mr-2" aria-label={`Options pour ${friend.displayName}`}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="cursor-pointer" onClick={() => setTemplatesOf(friend)}>
                              <Copy className="mr-2 h-4 w-4" />
                              Voir ses modèles
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-100/10"
                              onClick={() => setFriendToRemove(friend)}
                            >
                              <UserMinus className="mr-2 h-4 w-4" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <div className="bg-muted/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Users className="h-8 w-8 opacity-50" />
                    </div>
                    <p className="mb-2">Tu n'as pas encore d'amis.</p>
                    <p className="text-sm opacity-75">Utilise la barre de recherche ci-dessus pour en ajouter !</p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!friendToRemove} onOpenChange={(o) => !o && setFriendToRemove(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer cet ami ?</DialogTitle>
            <DialogDescription>
              {friendToRemove?.displayName} ne verra plus ton activité et tu ne verras plus la sienne. Tu pourras le ré-ajouter plus tard.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-3 mt-2">
            <Button variant="outline" className="flex-1 basis-28" onClick={() => setFriendToRemove(null)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              className="flex-1 basis-28"
              onClick={() => friendToRemove && handleRemoveFriend(friendToRemove.uid)}
            >
              Supprimer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <FriendTemplatesDialog friend={templatesOf} onClose={() => setTemplatesOf(null)} />
    </PageLayout>
  );
}
