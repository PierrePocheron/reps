import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

// Identité de l'éditeur : injectée au build (.env), jamais versionnée (repo public)
const LEGAL_NAME = import.meta.env.VITE_LEGAL_NAME ?? "L'éditeur de l'application";
const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL ?? '';

export default function PrivacyPolicy() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            // opened directly (store listing, new tab): no previous page in the app, so lead into it
            onClick={() => (location.key === 'default' ? navigate('/') : navigate(-1))}
            aria-label="Retour"
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-semibold">Politique de confidentialité</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8 text-sm leading-relaxed">
        <div>
          <p className="text-muted-foreground">Dernière mise à jour : 3 octobre 2026</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">1. Présentation</h2>
          <p>
            L'application <strong>Reps</strong> (<em>com.pierre.reps.app</em>) est développée et maintenue par
            {LEGAL_NAME}. Elle permet de suivre vos séances d'entraînement (renforcement musculaire et
            musculation), de consulter vos statistiques et de vous mesurer à vos amis.
          </p>
          <p>
            La présente politique décrit quelles données nous collectons, pourquoi et comment vous pouvez
            exercer vos droits. Elle s'applique à l'application mobile Android, à l'application iOS et à
            la version web accessible sur <strong>pedro-reps.web.app</strong>.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">2. Données collectées</h2>

          <div className="space-y-4">
            <div className="rounded-xl bg-muted/50 p-4 space-y-1">
              <p className="font-medium">Compte et identité</p>
              <p className="text-muted-foreground">
                Lors de la connexion via Google, nous récupérons votre adresse e-mail, votre nom
                d'affichage et votre photo de profil. Ces données sont nécessaires pour créer et
                identifier votre compte.
              </p>
            </div>

            <div className="rounded-xl bg-muted/50 p-4 space-y-1">
              <p className="font-medium">Données d'entraînement</p>
              <p className="text-muted-foreground">
                Séances (date, durée, exercices, répétitions, poids, type de série, effort ressenti
                RPE si vous l'activez, notes par exercice), modèles de séance personnalisés,
                statistiques agrégées, badges débloqués, série de jours d'entraînement. Ces données
                constituent le cœur du service et sont stockées dans notre base de données Firebase
                Firestore.
              </p>
            </div>

            <div className="rounded-xl bg-muted/50 p-4 space-y-1">
              <p className="font-medium">Informations de profil optionnelles</p>
              <p className="text-muted-foreground">
                Poids, taille, genre — utilisés uniquement pour calculer vos statistiques (calories,
                IMC) — et, si vous les saisissez, l'historique daté de votre poids et de vos mensurations
                (taille, poitrine, bras, cuisse). Ces données sont facultatives, stockées dans un espace
                privé accessible à vous seul, et supprimées avec votre compte.
              </p>
            </div>

            <div className="rounded-xl bg-muted/50 p-4 space-y-1">
              <p className="font-medium">Préférences et partages, sur votre appareil</p>
              <p className="text-muted-foreground">
                Les réponses au questionnaire de départ et vos réglages (repos automatique, RPE,
                disques disponibles…) restent sur votre appareil. Les images de séance que vous
                partagez et les fichiers d'export sont créés sur l'appareil : rien n'est envoyé tant
                que vous ne choisissez pas vous-même une application de destination.
              </p>
            </div>

            <div className="rounded-xl bg-muted/50 p-4 space-y-1">
              <p className="font-medium">Données sociales</p>
              <p className="text-muted-foreground">
                Liste d'amis et demandes d'amis — stockées dans Firestore pour les fonctionnalités
                de classement et fil d'activité.
              </p>
            </div>

            <div className="rounded-xl bg-muted/50 p-4 space-y-1">
              <p className="font-medium">Notifications push</p>
              <p className="text-muted-foreground">
                Sur mobile, le rappel d'entraînement et la fin du minuteur de repos sont des
                notifications locales programmées sur votre appareil : aucun identifiant n'est
                stocké ni envoyé. Sur le web, si vous activez les rappels, nous stockons votre token
                de notification (FCM), révocable à tout moment depuis les paramètres.
              </p>
            </div>

            <div className="rounded-xl bg-muted/50 p-4 space-y-1">
              <p className="font-medium">Données publicitaires (AdMob)</p>
              <p className="text-muted-foreground">
                Sur la version mobile, Google AdMob peut collecter votre identifiant publicitaire
                Android (AD_ID) pour afficher des publicités personnalisées. Vous pouvez
                désactiver la personnalisation dans les paramètres de votre appareil.
              </p>
            </div>

            <div className="rounded-xl bg-muted/50 p-4 space-y-1">
              <p className="font-medium">Rapports d'erreurs (Sentry)</p>
              <p className="text-muted-foreground">
                En cas de crash ou d'erreur, des informations techniques sont envoyées à Sentry
                (stack trace, version de l'app, type d'appareil), ainsi que, pour une partie des
                sessions, une relecture de l'interface dont tous les textes sont masqués et les
                images bloquées. Aucune donnée personnelle identifiable n'est incluse dans ces
                rapports.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">3. Base légale et finalités</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 font-medium">Finalité</th>
                  <th className="text-left py-2 pr-4 font-medium">Base légale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="py-2 pr-4">Fourniture du service (suivi d'entraînement)</td>
                  <td className="py-2 text-muted-foreground">Exécution du contrat</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Fonctionnalités sociales (classement, amis)</td>
                  <td className="py-2 text-muted-foreground">Exécution du contrat</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Rappels d'entraînement</td>
                  <td className="py-2 text-muted-foreground">Consentement</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Publicités personnalisées (AdMob)</td>
                  <td className="py-2 text-muted-foreground">Consentement (opt-in)</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Amélioration du service (rapports d'erreurs)</td>
                  <td className="py-2 text-muted-foreground">Intérêt légitime</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">4. Partage des données</h2>
          <p>Vos données ne sont pas vendues à des tiers. Elles peuvent être partagées avec :</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-2">
            <li><strong className="text-foreground">Google Firebase</strong> — hébergement, base de données, authentification (Google LLC, États-Unis)</li>
            <li><strong className="text-foreground">Google AdMob</strong> — publicités mobiles (Google LLC, États-Unis)</li>
            <li><strong className="text-foreground">Sentry</strong> — rapports d'erreurs (Functional Software, Inc., États-Unis)</li>
            <li><strong className="text-foreground">Firebase Hosting</strong> — hébergement de la version web (Google LLC, États-Unis)</li>
            <li><strong className="text-foreground">jsDelivr</strong> — réseau de diffusion (CDN) qui sert les illustrations de la bibliothèque d'exercices, chargées à la demande ; seule votre adresse IP transite, aucune donnée de compte</li>
          </ul>
          <p className="text-muted-foreground">
            Tous ces sous-traitants opèrent sous des clauses contractuelles types conformes au RGPD.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">5. Conservation des données</h2>
          <p>
            Vos données sont conservées tant que votre compte est actif. Si vous supprimez votre
            compte (depuis la page Profil), l'ensemble de vos données est effacé de Firestore
            dans un délai de 30 jours.
          </p>
        </section>

        <section className="space-y-3" id="suppression-compte">
          <h2 className="text-base font-semibold">5 bis. Suppression de votre compte et de vos données</h2>
          <p>Vous pouvez supprimer définitivement votre compte et l'ensemble des données associées :</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-2">
            <li>
              <strong className="text-foreground">Depuis l'application</strong> — ouvrez{' '}
              <strong className="text-foreground">Profil → Supprimer mon compte</strong>, puis confirmez.
              La suppression est immédiate et irréversible.
            </li>
            <li>
              <strong className="text-foreground">Par e-mail</strong> — envoyez une demande à{' '}
              <strong className="text-foreground">{CONTACT_EMAIL}</strong> depuis l'adresse
              associée à votre compte. Traitement sous 30 jours.
            </li>
          </ul>
          <p className="text-muted-foreground">
            Données supprimées : profil, séances, records, défis, relations d'amitié, badges et
            jetons de notification. Aucune donnée n'est conservée après suppression, à l'exception
            des journaux techniques anonymisés (Sentry) purgés automatiquement sous 90 jours.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">6. Vos droits (RGPD)</h2>
          <p>Si vous résidez dans l'Espace Économique Européen, vous disposez des droits suivants :</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-2">
            <li><strong className="text-foreground">Accès</strong> — obtenir une copie de vos données</li>
            <li><strong className="text-foreground">Rectification</strong> — corriger des données inexactes</li>
            <li><strong className="text-foreground">Effacement</strong> — demander la suppression de votre compte</li>
            <li><strong className="text-foreground">Portabilité</strong> — exporter vos données vous-même depuis Réglages (JSON complet, ou CSV de vos séances)</li>
            <li><strong className="text-foreground">Opposition</strong> — vous opposer au traitement basé sur l'intérêt légitime</li>
            <li><strong className="text-foreground">Retrait du consentement</strong> — pour les traitements basés sur le consentement</li>
          </ul>
          <p>Pour exercer ces droits, contactez : <strong>{CONTACT_EMAIL}</strong></p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">7. Sécurité</h2>
          <p>
            L'accès aux données Firestore est protégé par des règles de sécurité Firebase : chaque
            utilisateur ne peut lire et modifier que ses propres données. Les communications sont
            chiffrées via HTTPS/TLS.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">8. Enfants</h2>
          <p>
            L'application n'est pas destinée aux personnes de moins de 13 ans. Nous ne collectons
            pas sciemment des données personnelles d'enfants. Si vous pensez qu'un enfant nous a
            fourni des données, contactez-nous pour les supprimer.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">9. Modifications</h2>
          <p>
            Cette politique peut être mise à jour. La date de dernière mise à jour est indiquée en
            haut de page. Pour les changements significatifs, nous vous notifierons via l'application.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">10. Contact</h2>
          <p>
            Pour toute question concernant cette politique ou vos données personnelles :
          </p>
          <div className="rounded-xl bg-muted/50 p-4">
            <p className="font-medium">{LEGAL_NAME}</p>
            <p className="text-muted-foreground">{CONTACT_EMAIL}</p>
            <p className="text-muted-foreground">Développeur indépendant — France</p>
          </div>
        </section>

        <div className="pt-4 border-t text-xs text-muted-foreground text-center">
          Reps v1.0 — com.pierre.reps.app
        </div>
      </div>
    </div>
  );
}
