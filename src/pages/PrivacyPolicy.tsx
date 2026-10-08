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
          <p className="text-muted-foreground">Dernière mise à jour&nbsp;: 8 octobre 2026</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">1. Présentation</h2>
          <p>
            L'application <strong>Reps</strong> (<em>com.pierre.reps.app</em>) est développée et maintenue par {LEGAL_NAME}.
            Elle te permet de suivre tes séances d'entraînement (renforcement musculaire et musculation), de consulter
            tes statistiques et de te mesurer à tes amis.
          </p>
          <p>
            Cette politique décrit les données que nous collectons, pourquoi, et comment exercer tes droits. Elle
            s'applique à l'application Android, à l'application iOS et à la version web
            accessible sur <strong>pedro-reps.web.app</strong>.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">2. Données collectées</h2>

          <div className="space-y-4">
            <div className="rounded-xl bg-muted/50 p-4 space-y-1">
              <p className="font-medium">Compte et identité</p>
              <p className="text-muted-foreground">
                Tu te connectes avec ton compte Google ou avec une adresse e-mail et un mot de passe. Nous
                enregistrons ton adresse e-mail, ton prénom, ton nom et ton pseudo&nbsp;; avec Google, ils viennent de
                ton compte Google (ta photo de profil Google n'est pas utilisée). Ton mot de passe est géré par
                Firebase Authentication&nbsp;: nous ne le voyons jamais. Une empreinte (hachage SHA-256) de ton e-mail
                permet à tes amis de te retrouver par e-mail sans que l'adresse soit visible.
              </p>
            </div>

            <div className="rounded-xl bg-muted/50 p-4 space-y-1">
              <p className="font-medium">Données d'entraînement</p>
              <p className="text-muted-foreground">
                Séances (date, durée, titre, note, exercices, répétitions, charges, type de série, effort ressenti
                RPE si tu l'actives, notes par exercice), modèles de séance, exercices et défis personnalisés,
                statistiques, records, badges et série de jours d'entraînement, y compris l'historique que tu
                importes depuis une autre application. Ces données sont le cœur du service et sont stockées dans
                notre base Firebase Firestore.
              </p>
            </div>

            <div className="rounded-xl bg-muted/50 p-4 space-y-1">
              <p className="font-medium">Informations de profil facultatives</p>
              <p className="text-muted-foreground">
                Date de naissance, sexe, poids et taille, utilisés pour ton âge et tes statistiques (calories, IMC),
                et, si tu les saisis, l'historique daté de ton poids et de tes mensurations (tour de taille,
                poitrine, bras, cuisse). Ces données sont facultatives, stockées dans un espace privé accessible à
                toi seul, avec les réglages qui suivent ton compte (objectif de la semaine, mode de série).
              </p>
            </div>

            <div className="rounded-xl bg-muted/50 p-4 space-y-1">
              <p className="font-medium">Ce que voient les autres utilisateurs</p>
              <p className="text-muted-foreground">
                Ton profil public (pseudo, prénom, nom, avatar, totaux, séries et badges), tes séances de
                renforcement, ton fil d'activité et tes exercices personnalisés sont lisibles par les autres
                utilisateurs connectés&nbsp;: ils servent à la recherche d'amis, au classement et au fil de tes amis.
                Tes amis voient aussi tes modèles de séance, pour pouvoir les copier. Ta liste d'amis, tes demandes
                d'amis et les encouragements échangés sont stockés dans Firestore pour ces mêmes fonctions.
              </p>
            </div>

            <div className="rounded-xl bg-muted/50 p-4 space-y-1">
              <p className="font-medium">Préférences et partages, sur ton appareil</p>
              <p className="text-muted-foreground">
                Les réponses au questionnaire de départ et tes réglages (repos automatique, RPE, disques
                disponibles…) restent sur ton appareil. Les images de séance que tu partages et les fichiers
                d'export sont créés sur l'appareil&nbsp;: rien n'est envoyé tant que tu ne choisis pas toi-même une
                application de destination.
              </p>
            </div>

            <div className="rounded-xl bg-muted/50 p-4 space-y-1">
              <p className="font-medium">Notifications</p>
              <p className="text-muted-foreground">
                Sur mobile, le rappel d'entraînement et la fin du minuteur de repos sont des notifications locales
                programmées sur ton appareil&nbsp;: aucun identifiant n'est stocké ni envoyé. Sur le web, si tu actives
                les rappels, nous stockons ton jeton de notification (FCM), révocable à tout moment depuis les
                réglages.
              </p>
            </div>

            <div className="rounded-xl bg-muted/50 p-4 space-y-1">
              <p className="font-medium">Publicité</p>
              <p className="text-muted-foreground">
                Aucune publicité dans cette version. Le module publicitaire (Google AdMob) est désactivé et
                l'application ne demande pas l'identifiant publicitaire de ton appareil.
              </p>
            </div>

            <div className="rounded-xl bg-muted/50 p-4 space-y-1">
              <p className="font-medium">Rapports d'erreurs et de performance (Sentry)</p>
              <p className="text-muted-foreground">
                En cas de plantage ou d'erreur, des informations techniques sont envoyées à Sentry (trace de
                l'erreur, version de l'application, type d'appareil et de navigateur), avec une relecture de
                l'écran autour de l'erreur dont tous les textes sont masqués et les images bloquées. Pour une
                partie des sessions, des mesures de performance (temps de chargement des écrans) sont aussi
                envoyées. Ni ton nom ni ton e-mail n'y sont joints.
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
                  <td className="py-2 pr-4">Compte et suivi d'entraînement</td>
                  <td className="py-2 text-muted-foreground">Exécution du contrat</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Fonctionnalités sociales (amis, classement, fil)</td>
                  <td className="py-2 text-muted-foreground">Exécution du contrat</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Informations de profil facultatives</td>
                  <td className="py-2 text-muted-foreground">Consentement (tu choisis de les saisir)</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Rappels d'entraînement</td>
                  <td className="py-2 text-muted-foreground">Consentement</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Correction des bugs (rapports d'erreurs et de performance)</td>
                  <td className="py-2 text-muted-foreground">Intérêt légitime</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">4. Sous-traitants</h2>
          <p>Tes données ne sont jamais vendues. Elles sont traitées pour notre compte par&nbsp;:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-2">
            <li><strong className="text-foreground">Google Firebase</strong> — authentification, base de données, notifications web et hébergement de la version web (Google LLC, États-Unis)</li>
            <li><strong className="text-foreground">Google reCAPTCHA</strong> (Firebase App Check) — version web uniquement&nbsp;: vérifie que les requêtes viennent bien de l'application (Google LLC, États-Unis)</li>
            <li><strong className="text-foreground">Google Fonts</strong> — polices de caractères chargées à l'ouverture de l'application, sur le web comme sur Android&nbsp;; seule ton adresse IP transite (Google LLC, États-Unis)</li>
            <li><strong className="text-foreground">jsDelivr</strong> — réseau de diffusion (CDN) qui sert les illustrations de la bibliothèque d'exercices, chargées à la demande&nbsp;; seule ton adresse IP transite, aucune donnée de compte</li>
            <li><strong className="text-foreground">Sentry</strong> — rapports d'erreurs et de performance (Functional Software, Inc., États-Unis)</li>
          </ul>
          <p className="text-muted-foreground">
            Google Firebase et Sentry traitent ces données sous des clauses contractuelles types conformes au RGPD.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">5. Conservation des données</h2>
          <p>
            Tes données sont conservées tant que ton compte existe. Quand tu le supprimes, elles sont effacées
            immédiatement (voir ci-dessous). Les rapports d'erreurs sont effacés automatiquement par Sentry au
            bout de 90&nbsp;jours au plus.
          </p>
        </section>

        <section className="space-y-3" id="suppression-compte">
          <h2 className="text-base font-semibold">5 bis. Suppression de ton compte et de tes données</h2>
          <p>Tu peux supprimer définitivement ton compte et toutes les données associées&nbsp;:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-2">
            <li>
              <strong className="text-foreground">Depuis l'application</strong>&nbsp;: ouvre{' '}
              <strong className="text-foreground">Profil → Supprimer mon compte</strong>, puis confirme (mot de
              passe ou reconnexion Google demandés). La suppression est immédiate et définitive.
            </li>
            <li>
              <strong className="text-foreground">Par e-mail</strong>&nbsp;: envoie ta demande à{' '}
              <strong className="text-foreground">{CONTACT_EMAIL}</strong> depuis l'adresse associée à ton
              compte. Traitement sous 30&nbsp;jours.
            </li>
          </ul>
          <p className="text-muted-foreground">
            Données supprimées&nbsp;: ton compte, ton profil et ses données privées, tes séances, modèles, exercices et
            défis personnalisés, ton fil d'activité, les encouragements donnés et reçus, tes demandes et liens
            d'amitié, tes notifications et ton jeton de notification, ainsi que la copie locale de l'appareil.
            Seule exception&nbsp;: les notifications et les cartes «&nbsp;nouvel ami&nbsp;» déjà reçues par tes amis gardent ton
            pseudo.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">6. Tes droits (RGPD)</h2>
          <p>Si tu résides dans l'Espace économique européen, tu disposes des droits suivants&nbsp;:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-2">
            <li><strong className="text-foreground">Accès</strong>&nbsp;: obtenir une copie de tes données</li>
            <li><strong className="text-foreground">Rectification</strong>&nbsp;: corriger des données inexactes</li>
            <li><strong className="text-foreground">Effacement</strong>&nbsp;: supprimer ton compte (voir ci-dessus)</li>
            <li><strong className="text-foreground">Portabilité</strong>&nbsp;: exporter toi-même tes données depuis les réglages (JSON complet, ou CSV de tes séances)</li>
            <li><strong className="text-foreground">Opposition</strong>&nbsp;: t'opposer au traitement fondé sur l'intérêt légitime</li>
            <li><strong className="text-foreground">Retrait du consentement</strong>&nbsp;: pour les traitements fondés sur le consentement</li>
          </ul>
          <p>Pour exercer ces droits, écris à&nbsp;: <strong>{CONTACT_EMAIL}</strong></p>
          <p className="text-muted-foreground">
            Tu peux aussi adresser une réclamation à la CNIL (cnil.fr).
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">7. Sécurité</h2>
          <p>
            Les règles de sécurité Firebase encadrent l'accès aux données&nbsp;: toi seul peux modifier les tiennes, et
            tes données privées (e-mail, date de naissance, sexe, poids, taille, mensurations) ne sont lisibles que
            par toi. Les échanges sont chiffrés (HTTPS/TLS).
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">8. Enfants</h2>
          <p>
            L'application n'est pas destinée aux moins de 13&nbsp;ans&nbsp;: une date de naissance indiquant moins de
            13&nbsp;ans est refusée. Si tu penses qu'un enfant nous a transmis des données, contacte-nous pour que nous
            les supprimions.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">9. Modifications</h2>
          <p>
            Cette politique peut évoluer. La date de dernière mise à jour est indiquée en haut de page. En cas de
            changement important, nous te prévenons dans l'application.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">10. Contact</h2>
          <p>Pour toute question sur cette politique ou sur tes données personnelles&nbsp;:</p>
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
