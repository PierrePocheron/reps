import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BackButton } from '@/components/BackButton';
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
  searchUsers,
  sendFriendRequest,
  subscribeToFriendRequests,
  acceptFriendRequest,
  declineFriendRequest,
  getFriendsDetails,
  getFriendsActivity,
  removeFriend
} from '@/firebase/firestore';
import type { User, FriendRequest, Session } from '@/firebase/types';
import { UserPlus, Search, Check, X, User as UserIcon, Users, Activity, Calendar, Dumbbell, Award, MoreVertical, UserMinus, Trophy, Medal } from 'lucide-react';

export default function Friends() {
  const { user } = useUserStore();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('activity');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<User[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);

  const [activities, setActivities] = useState<Session[]>([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);

  // Subscribe to friend requests
  useEffect(() => {
    if (!user) return;
    console.log('Subscribing to friend requests for:', user.uid);
    const unsubscribe = subscribeToFriendRequests(user.uid, (newRequests) => {
      console.log('Received friend requests:', newRequests);
      // Filtrer les demandes provenant de personnes déjà amies
      const filteredRequests = newRequests.filter(req => !user.friends?.includes(req.fromUserId));
      setFriendRequests(filteredRequests);
    });
    return () => unsubscribe();
  }, [user]);

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
      } catch (error) {
        console.error('Error loading friends:', error);
      } finally {
        setIsLoadingFriends(false);
      }
    };

    loadFriends();
  }, [user?.friends]);

  // Load activity when tab changes to 'activity' and friends are loaded
  useEffect(() => {
    if (activeTab === 'activity' && user?.friends && user.friends.length > 0) {
      const loadActivity = async () => {
        setIsLoadingActivity(true);
        try {
          const sessions = await getFriendsActivity(user.friends);
          setActivities(sessions);
        } catch (error) {
          console.error('Error loading activity:', error);
        } finally {
          setIsLoadingActivity(false);
        }
      };
      loadActivity();
    }
  }, [activeTab, user?.friends]);

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
        // Filter out self and existing friends
        const filteredResults = results.filter(u =>
          u.uid !== user?.uid &&
          !user?.friends.includes(u.uid)
        );
        setSearchResults(filteredResults);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    }, 500); // 500ms delay

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, user]);

  const handleSendRequest = async (toUserId: string) => {
    if (!user) return;
    try {
      await sendFriendRequest(user, toUserId);
      toast({
        title: 'Demande envoyée',
        description: 'Votre demande d\'ami a été envoyée !',
      });
      // Remove from search results to give feedback
      setSearchResults(prev => prev.filter(u => u.uid !== toUserId));
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible d\'envoyer la demande',
        variant: 'destructive',
      });
    }
  };

  const handleAcceptRequest = async (request: FriendRequest) => {
    if (!user) return;
    try {
      await acceptFriendRequest(request.id, request.fromUserId, user.uid);
      toast({
        title: 'Ami ajouté',
        description: `Vous êtes maintenant ami avec ${request.fromDisplayName}`,
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'accepter la demande',
        variant: 'destructive',
      });
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
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
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!user) return;
    try {
      if (!confirm('Êtes-vous sûr de vouloir supprimer cet ami ?')) return;

      await removeFriend(user.uid, friendId);
      toast({
        title: 'Ami supprimé',
        description: 'Cet utilisateur a été retiré de votre liste d\'amis.',
      });
      // Update local state
      setFriends(prev => prev.filter(f => f.uid !== friendId));
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

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 1) return 'Aujourd\'hui';
    if (diffDays <= 2) return 'Hier';
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  // Calculer le classement
  const leaderboard = [...friends, ...(user ? [user] : [])]
    .sort((a, b) => (b.totalReps || 0) - (a.totalReps || 0));

  const getRankStyle = (index: number) => {
    switch (index) {
      case 0: return "bg-yellow-500/10 border-yellow-500/50 text-yellow-600";
      case 1: return "bg-gray-400/10 border-gray-400/50 text-gray-600";
      case 2: return "bg-orange-500/10 border-orange-500/50 text-orange-600";
      default: return "bg-card/50 border-transparent";
    }
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <Trophy className="h-6 w-6 text-yellow-500" />;
      case 1: return <Medal className="h-6 w-6 text-gray-400" />;
      case 2: return <Medal className="h-6 w-6 text-orange-500" />;
      default: return <span className="font-bold text-muted-foreground w-6 text-center">{index + 1}</span>;
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <BackButton to="/" />
          <h1 className="text-2xl font-bold">Social</h1>
          <div className="w-10" />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="activity">Activité</TabsTrigger>
            <TabsTrigger value="leaderboard">Top</TabsTrigger>
            <TabsTrigger value="friends">Amis</TabsTrigger>
            <TabsTrigger value="add">Ajouter</TabsTrigger>
            <TabsTrigger value="requests" className="relative">
              Demandes
              {friendRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white animate-pulse">
                  {friendRequests.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="activity" className="space-y-4 animate-in fade-in-50">
            {isLoadingActivity ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : activities.length > 0 ? (
              <div className="space-y-4">
                {activities.map((item: any) => {
                  const friend = getFriendDetails(item.userId);
                  // Pour les événements 'new_friend', on veut afficher l'info même si on n'est pas (encore) ami avec la 3ème personne
                  // Mais ici item.userId est celui qui a généré l'événement (donc notre ami).
                  if (!friend) return null;

                  if (item.type === 'badge_unlocked') {
                    return (
                      <Card key={item.id} className="overflow-hidden border-none shadow-sm bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-l-4 border-l-yellow-500">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            {friend.photoURL ? (
                              <img src={friend.photoURL} alt={friend.displayName} className="w-10 h-10 rounded-full object-cover border border-background" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center border border-background">
                                <UserIcon className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1">
                              <p className="text-sm">
                                <span className="font-semibold">{friend.displayName}</span> a débloqué un badge !
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-2xl">{item.badgeEmoji}</span>
                                <span className="font-bold text-primary">{item.badgeName}</span>
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
                            {friend.photoURL ? (
                              <img src={friend.photoURL} alt={friend.displayName} className="w-10 h-10 rounded-full object-cover border border-background" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center border border-background">
                                <UserIcon className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1">
                              <p className="text-sm">
                                <span className="font-semibold">{friend.displayName}</span> a un nouvel ami !
                              </p>
                              <div className="flex items-center gap-2 mt-1 text-blue-600">
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
                          {friend.photoURL ? (
                            <img src={friend.photoURL} alt={friend.displayName} className="w-10 h-10 rounded-full object-cover border border-background" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center border border-background">
                              <UserIcon className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="font-semibold text-sm">{friend.displayName}</h3>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {formatDate(item.date || item.createdAt)}
                                </p>
                              </div>
                              <div className="text-right">
                                <span className="text-lg font-bold text-primary">{item.totalReps}</span>
                                <span className="text-xs text-muted-foreground ml-1">reps</span>
                              </div>
                            </div>

                            <div className="mt-3 space-y-1">
                              {item.exercises && item.exercises
                                .sort((a: any, b: any) => b.reps - a.reps)
                                .slice(0, 3)
                                .map((exo: any, idx: number) => (
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
                                  + {item.exercises.length - 3} autres exercices
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <div className="bg-muted/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Activity className="h-8 w-8 opacity-50" />
                </div>
                <p className="mb-2">Aucune activité récente.</p>
                <p className="text-sm opacity-75">Vos amis n'ont pas encore fait de sport !</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="leaderboard" className="space-y-4 animate-in fade-in-50">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold flex items-center justify-center gap-2">
                <Trophy className="h-6 w-6 text-yellow-500" />
                Classement Général
              </h2>
              <p className="text-sm text-muted-foreground">Basé sur le nombre total de répétitions</p>
            </div>

            <div className="space-y-3">
              {leaderboard.map((player, index) => (
                <Card key={player.uid} className={`overflow-hidden border-2 shadow-sm transition-all ${getRankStyle(index)}`}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="flex-shrink-0 w-8 flex justify-center">
                      {getRankIcon(index)}
                    </div>

                    {player.photoURL ? (
                      <img src={player.photoURL} alt={player.displayName} className="w-12 h-12 rounded-full object-cover border-2 border-background" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center border-2 border-background">
                        <UserIcon className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold truncate">{player.displayName}</h3>
                        {player.uid === user?.uid && (
                          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
                            Moi
                          </span>
                        )}
                      </div>
                      <p className="text-xs opacity-80 truncate">
                        {player.totalSessions} séances
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xl font-black block">{player.totalReps}</span>
                      <span className="text-[10px] uppercase tracking-wider opacity-70">Reps</span>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {leaderboard.length === 0 && (
                 <div className="text-center py-12 text-muted-foreground">
                  <p>Aucun classement disponible.</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="friends" className="space-y-4 animate-in fade-in-50">
            {isLoadingFriends ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : friends.length > 0 ? (
              <div className="grid gap-3">
                {friends.map((friend) => (
                  <Card key={friend.uid} className="overflow-hidden border-none shadow-sm bg-card/50">
                    <CardContent className="p-3 flex items-center gap-4">
                      {friend.photoURL ? (
                        <img src={friend.photoURL} alt={friend.displayName} className="w-12 h-12 rounded-full object-cover border-2 border-background" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center border-2 border-background">
                          <UserIcon className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{friend.displayName}</h3>
                        <p className="text-xs text-muted-foreground truncate">
                          {friend.totalSessions} séances • {friend.totalReps} reps
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => handleRemoveFriend(friend.uid)}>
                            <UserMinus className="h-4 w-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <div className="bg-muted/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 opacity-50" />
                </div>
                <p className="mb-2">Vous n'avez pas encore d'amis.</p>
                <Button variant="link" onClick={() => setActiveTab('add')}>
                  Trouver des amis
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="add" className="space-y-6 animate-in fade-in-50">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un pseudo ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-11 bg-muted/50 border-none focus-visible:ring-1"
              />
              {isSearching && (
                <div className="absolute right-3 top-3">
                  <LoadingSpinner size="sm" />
                </div>
              )}
            </div>

            <div className="space-y-3">
              {searchResults.map((result) => (
                <Card key={result.uid} className="overflow-hidden border-none shadow-sm bg-card/50">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      {result.photoURL ? (
                        <img src={result.photoURL} alt={result.displayName} className="w-10 h-10 rounded-full object-cover border border-background" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center border border-background">
                          <UserIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <span className="font-medium truncate">{result.displayName}</span>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => handleSendRequest(result.uid)} className="shrink-0">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Ajouter
                    </Button>
                  </CardContent>
                </Card>
              ))}
              {searchResults.length === 0 && searchTerm.length >= 2 && !isSearching && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Aucun utilisateur trouvé.</p>
                </div>
              )}
              {searchTerm.length < 2 && (
                <div className="text-center py-12 text-muted-foreground opacity-50">
                  <Search className="h-12 w-12 mx-auto mb-4" />
                  <p>Recherchez vos amis pour les ajouter</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="requests" className="space-y-4 animate-in fade-in-50">
            {friendRequests.length > 0 ? (
              friendRequests.map((request) => (
                <Card key={request.id} className="overflow-hidden border-none shadow-sm bg-card/50">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      {request.fromPhotoURL ? (
                        <img src={request.fromPhotoURL} alt={request.fromDisplayName} className="w-10 h-10 rounded-full object-cover border border-background" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center border border-background">
                          <UserIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium truncate">{request.fromDisplayName}</p>
                        <p className="text-xs text-muted-foreground">veut vous ajouter</p>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full" onClick={() => handleDeclineRequest(request.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                      <Button size="icon" className="h-8 w-8 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-sm" onClick={() => handleAcceptRequest(request)}>
                        <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <div className="bg-muted/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <UserPlus className="h-8 w-8 opacity-50" />
                </div>
                <p>Aucune demande en attente.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
