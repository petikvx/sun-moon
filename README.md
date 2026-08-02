# Soleil & Lune

Soleil & Lune est une application web d’éphémérides qui permet d’explorer la position du Soleil et de la Lune pour une date et un lieu donnés. Elle réunit trajectoires journalières, crépuscules, phase lunaire et conditions météo dans une interface responsive et installable.

## Fonctionnalités

- lever et coucher du Soleil et de la Lune ;
- position toutes les 10 minutes : altitude, azimut, direction, visibilité et distance ;
- graphique de trajectoire et carte polaire du ciel ;
- affichage facultatif de la Lune ;
- phase lunaire, illumination, âge et prochaines phases majeures ;
- aubes et crépuscules civil, nautique et astronomique ;
- heures bleues, heures dorées et durée du jour ;
- curseur couvrant toute l’année, avec recalcul automatique ;
- ouverture sur le dernier créneau de 10 minutes écoulé pour la date du jour ;
- mode temps réel, actualisé chaque minute ;
- recherche mondiale de villes, favoris persistants et villes proposées par défaut ;
- géolocalisation et saisie manuelle des coordonnées et du fuseau horaire ;
- météo d’observation : nébulosité, visibilité, humidité, température et score indicatif ;
- partage de la configuration par lien ;
- export des résultats en CSV, JSON et ICS, et du graphique en PNG ;
- installation comme application web progressive (PWA) ;
- prise en compte automatique de l’heure d’été et de l’heure d’hiver grâce aux fuseaux IANA.

## Utilisation

1. Recherchez une ville, choisissez une ville proposée ou utilisez **Ma position**.
2. Choisissez une date avec le calendrier ou le curseur annuel.
3. Déplacez le curseur horaire pour parcourir la journée par pas de 10 minutes.
4. Activez **Temps réel** pour suivre automatiquement la journée en cours.
5. Affichez ou masquez la Lune selon vos besoins.
6. Utilisez les boutons d’export ou de partage pour conserver les résultats.

Les favoris sont conservés dans le navigateur. Les paramètres essentiels sont également inscrits dans l’URL afin qu’un lien partagé rouvre la même vue.

## Comprendre les données

### Altitude et azimut

L’altitude est l’angle vertical par rapport à l’horizon : `0°` correspond à l’horizon, `90°` au zénith et une valeur négative à un astre sous l’horizon.

L’azimut est la direction horizontale : `0°` indique le nord, `90°` l’est, `180°` le sud et `270°` l’ouest. L’application ajoute une direction cardinale sur 16 secteurs.

### Crépuscules

- civil : Soleil entre `0°` et `-6°` ;
- nautique : Soleil entre `-6°` et `-12°` ;
- astronomique : Soleil entre `-12°` et `-18°`.

Les heures bleues et dorées sont des plages indicatives calculées à partir de la hauteur du Soleil.

### Météo d’observation

Le score combine notamment la nébulosité, la visibilité et l’humidité. Il sert d’aide rapide à l’observation, mais ne remplace pas une prévision locale détaillée. La météo n’est disponible que pour les dates couvertes par la prévision en ligne.

La recherche de lieux et la météo utilisent les API Open-Meteo : [documentation de géocodage](https://open-meteo.com/en/docs/geocoding-api) et [documentation des prévisions](https://open-meteo.com/en/docs).

## Technologies

### Frontend

- React 19, TypeScript et Vite ;
- Recharts pour les graphiques ;
- Lucide React pour les icônes ;
- API Open-Meteo pour la recherche de villes et la météo ;
- service worker et manifeste PWA.

### Backend

- Python 3.12 ;
- FastAPI et Uvicorn ;
- Skyfield ;
- éphéméride JPL DE421.

## Architecture

```text
sun-moon/
├── .github/workflows/ci.yml       # Vérifications automatiques GitHub Actions
├── backend/
│   ├── calculator.py              # Calculs astronomiques
│   ├── main.py                    # API FastAPI
│   ├── tests/                     # Tests unitaires
│   ├── de421.bsp                  # Éphéméride JPL
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── public/                    # Manifeste et service worker PWA
│   ├── src/components/            # Composants d’interface et graphiques
│   ├── src/services/              # Accès aux services externes
│   ├── src/utils/                 # Calculs d’affichage et exports
│   ├── src/App.tsx
│   ├── src/index.css
│   ├── Dockerfile
│   └── nginx.conf
├── docker-compose.yml
└── README.md
```

En développement, Vite transmet les chemins `/api` au backend sur le port `8000`. En production Docker, Nginx sert le frontend et transmet ces mêmes chemins au conteneur backend.

## Installation classique

### Prérequis

- Python 3.12 ou compatible ;
- Node.js 22 ou compatible avec npm ;
- un navigateur récent.

Clonez le dépôt :

```bash
git clone https://github.com/petikvx/sun-moon.git
cd sun-moon
```

Installez le backend :

```bash
python3 -m venv backend/venv
backend/venv/bin/pip install -r backend/requirements.txt
```

Installez le frontend :

```bash
cd frontend
npm install
cd ..
```

Le fichier `backend/de421.bsp` est fourni avec le projet et doit rester dans ce dossier.

## Lancer en développement

Ouvrez deux terminaux à la racine du projet.

Terminal 1 — API :

```bash
backend/venv/bin/uvicorn backend.main:app --reload
```

Terminal 2 — interface :

```bash
cd frontend
npm run dev
```

Ouvrez <http://localhost:5173>. La documentation de l’API se trouve sur <http://127.0.0.1:8000/docs>.

Pour arrêter les serveurs, utilisez `Ctrl+C` dans chacun des terminaux.

## Lancer avec Docker

Docker permet de démarrer toute l’application avec une seule commande :

```bash
docker compose up --build -d
```

Ouvrez ensuite <http://localhost:8080>.

Consultez les journaux :

```bash
docker compose logs -f
```

Arrêtez l’application :

```bash
docker compose down
```

## API

Les endpoints acceptent une date au format `AAAA-MM-JJ`, une latitude entre `-90` et `90`, une longitude entre `-180` et `180`, et un identifiant de fuseau IANA tel que `Europe/Paris`.

### `GET /api/events`

Retourne les levers et couchers principaux :

```bash
curl "http://127.0.0.1:8000/api/events?date=2026-08-02&lat=48.8566&lon=2.3522&timezone=Europe%2FParis"
```

### `GET /api/day`

Retourne en une seule réponse :

- les levers et couchers ;
- les crépuscules et plages de lumière ;
- la phase et l’illumination de la Lune, ainsi que les prochaines phases ;
- toutes les positions de la journée, espacées de 10 minutes ;
- le fuseau horaire utilisé.

```bash
curl "http://127.0.0.1:8000/api/day?date=2026-08-02&lat=48.8566&lon=2.3522&timezone=Europe%2FParis"
```

Les instants sont renvoyés en UTC. L’interface les affiche dans le fuseau choisi. Une journée normale contient 145 positions, extrémités incluses ; le nombre varie lors des changements d’heure.

## Vérifier le projet

Tests du backend :

```bash
backend/venv/bin/python -m unittest discover -s backend/tests -v
```

Qualité et compilation du frontend :

```bash
cd frontend
npm run lint
npm run build
```

Construction des images :

```bash
docker compose build
```

GitHub Actions exécute automatiquement les tests, le lint et la compilation à chaque push et pull request.

## Installation PWA

Après une première ouverture de la version de production, utilisez l’option **Installer l’application** du navigateur. Le service worker met en cache l’interface pour faciliter sa réouverture ; les nouveaux calculs astronomiques et les données météo nécessitent néanmoins l’accès aux services correspondants.

## Dépannage

### Impossible de joindre le serveur

En développement, vérifiez que Uvicorn écoute sur le port `8000`. Avec Docker, contrôlez l’état et les journaux :

```bash
docker compose ps
docker compose logs
```

### Géolocalisation indisponible

Autorisez la position dans le navigateur. Cette fonction exige `localhost` ou HTTPS. La recherche de ville et les coordonnées manuelles restent disponibles.

### Une heure semble décalée

Vérifiez le fuseau IANA associé au lieu. Les transitions de mars et d’octobre sont gérées automatiquement par le moteur de fuseaux horaires.

### Pas de météo

Vérifiez la connexion Internet et choisissez une date située dans la plage de prévision disponible. Les calculs astronomiques continuent de fonctionner sans météo.

## Limites

- DE421 couvre les dates du 29 juillet 1899 au 8 octobre 2053 ;
- la visibilité astronomique ne tient pas compte du relief, des bâtiments ou de la végétation ;
- le score météo est indicatif ;
- les heures bleues et dorées reposent sur des seuils solaires conventionnels ;
- l’outil ne doit pas être utilisé seul pour une navigation critique.

## Crédits

© 2026 PetiK. Tous droits réservés.

Conçu avec l’assistance de Gemini et Codex.
