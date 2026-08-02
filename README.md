# Soleil & Lune

Soleil & Lune est une application web d’éphémérides qui permet de suivre la position du Soleil et de la Lune pour une date et un lieu donnés.

L’application affiche les heures de lever et de coucher, puis calcule la trajectoire des deux astres toutes les 10 minutes. Elle fonctionne avec des villes prédéfinies, la position de l’appareil ou des coordonnées saisies manuellement.

## Fonctionnalités

- calcul du lever et du coucher du Soleil ;
- calcul du lever et du coucher de la Lune ;
- trajectoires journalières représentées sur un graphique ;
- possibilité d’afficher ou de masquer la trajectoire et la fiche de position de la Lune ;
- positions calculées toutes les 10 minutes ;
- sélection interactive de l’heure avec un curseur ;
- sélection du jour avec un curseur couvrant toute l’année choisie ;
- recalcul automatique après le déplacement du curseur annuel ;
- positionnement automatique sur le dernier créneau écoulé pour la journée actuelle ;
- bouton **Maintenant** pour revenir à la position actuelle ;
- indication de l’altitude et de l’azimut ;
- direction cardinale sur 16 directions ;
- indication de visibilité au-dessus ou sous l’horizon ;
- distance entre l’observateur et chaque astre ;
- gestion du fuseau horaire de la ville sélectionnée ;
- interface responsive pour ordinateur, tablette et mobile.

## Villes disponibles

L’application propose actuellement :

- Paris, Lyon et Marseille ;
- Londres ;
- Montréal et New York ;
- Le Caire ;
- Saint-Denis de La Réunion ;
- Tokyo ;
- Sydney.

Chaque ville possède ses propres latitude, longitude et fuseau horaire. L’option **Coordonnées personnalisées** permet d’utiliser n’importe quel autre lieu.

## Comprendre les informations affichées

### Altitude

L’altitude est l’angle vertical de l’astre par rapport à l’horizon :

- `0°` : l’astre se trouve sur l’horizon ;
- valeur positive : l’astre est au-dessus de l’horizon ;
- `90°` : l’astre est au zénith, directement au-dessus de l’observateur ;
- valeur négative : l’astre se trouve sous l’horizon.

### Azimut

L’azimut indique la direction horizontale en degrés :

- `0°` ou `360°` : nord ;
- `90°` : est ;
- `180°` : sud ;
- `270°` : ouest.

L’application traduit également cette valeur en direction cardinale : `N`, `NNE`, `NE`, `ENE`, `E`, etc.

### Visibilité

Un astre est marqué **Visible** lorsque son altitude géométrique est supérieure ou égale à `0°`. Cette indication ne tient pas compte des nuages, des bâtiments, du relief ni des autres obstacles locaux.

### Distance

La distance est affichée en kilomètres. Elle correspond à la distance calculée entre l’observateur terrestre et le Soleil ou la Lune au moment sélectionné.

## Utiliser l’application

1. Sélectionnez une ville ou cliquez sur **Ma position**.
2. Choisissez la date à étudier avec le calendrier ou le curseur annuel. Le curseur relance automatiquement le calcul après le déplacement.
3. Si nécessaire, ouvrez **Coordonnées et fuseau horaire** pour modifier les valeurs manuellement.
4. Cliquez sur **Afficher la journée**.
5. Consultez les heures de lever et de coucher.
6. Déplacez le curseur pour parcourir la journée par pas de 10 minutes.
7. Lisez l’altitude, l’azimut, la direction, la visibilité et la distance dans les fiches Soleil et Lune.

Pour la journée actuelle, le curseur s’ouvre sur le dernier créneau de 10 minutes déjà écoulé. Pour une autre date, il s’ouvre vers le milieu de la journée.

## Technologies utilisées

### Frontend

- React 19 ;
- TypeScript ;
- Vite ;
- Tailwind CSS ;
- Axios ;
- Lucide React pour les icônes.

### Backend

- Python 3.12 ;
- FastAPI ;
- Uvicorn ;
- Skyfield ;
- éphéméride JPL DE421.

## Architecture

```text
sun-moon/
├── backend/
│   ├── calculator.py       # Calculs astronomiques
│   ├── main.py             # API FastAPI
│   ├── de421.bsp           # Données d’éphéméride JPL
│   ├── requirements.txt    # Dépendances Python
│   └── venv/               # Environnement Python local
├── frontend/
│   ├── src/App.tsx         # Interface et logique React
│   ├── src/index.css       # Styles globaux
│   ├── vite.config.ts      # Configuration et proxy API
│   └── package.json        # Dépendances et scripts frontend
└── README.md
```

Le frontend appelle l’API avec des chemins commençant par `/api`. En développement, le proxy Vite transmet ces appels au backend disponible sur `http://127.0.0.1:8000`.

## Prérequis

- Python 3.12 ou une version compatible ;
- Node.js avec npm ;
- un navigateur web récent.

## Première installation

Placez-vous dans le dossier du projet :

```bash
cd /home/petik/Downloads/sun-moon
```

Créez l’environnement Python et installez le backend :

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

Le fichier `backend/de421.bsp` est déjà fourni avec le projet et doit rester dans le dossier `backend`.

## Lancer l’application

L’application utilise deux serveurs. Ouvrez deux terminaux et laissez-les actifs pendant l’utilisation.

### Terminal 1 — backend

```bash
cd /home/petik/Downloads/sun-moon
backend/venv/bin/uvicorn backend.main:app --reload
```

L’API est disponible sur <http://127.0.0.1:8000>. Sa documentation interactive FastAPI est disponible sur <http://127.0.0.1:8000/docs>.

### Terminal 2 — frontend

```bash
cd /home/petik/Downloads/sun-moon/frontend
npm run dev
```

Ouvrez ensuite :

<http://localhost:5173>

## Arrêter l’application

Dans chacun des deux terminaux, utilisez :

```text
Ctrl + C
```

## API

Les deux endpoints acceptent les paramètres suivants :

| Paramètre | Exemple | Description |
| --- | --- | --- |
| `date` | `2026-08-02` | Date au format `AAAA-MM-JJ` |
| `lat` | `48.8566` | Latitude comprise entre `-90` et `90` |
| `lon` | `2.3522` | Longitude comprise entre `-180` et `180` |
| `timezone` | `Europe/Paris` | Identifiant de fuseau horaire IANA |

### `GET /api/events`

Retourne uniquement les quatre événements principaux.

```bash
curl "http://127.0.0.1:8000/api/events?date=2026-08-02&lat=48.8566&lon=2.3522&timezone=Europe%2FParis"
```

Exemple de réponse :

```json
{
  "sunrise": "2026-08-02T04:25:08Z",
  "sunset": "2026-08-02T19:27:44Z",
  "moonrise": "2026-08-02T20:50:18Z",
  "moonset": "2026-08-02T08:35:55Z"
}
```

Les dates de l’API sont exprimées en UTC. L’interface les convertit dans le fuseau horaire sélectionné.

### `GET /api/day`

Retourne les événements, le fuseau horaire et toutes les positions de la journée par pas de 10 minutes.

```bash
curl "http://127.0.0.1:8000/api/day?date=2026-08-02&lat=48.8566&lon=2.3522&timezone=Europe%2FParis"
```

Chaque position contient :

```json
{
  "time": "2026-08-02T10:00:00Z",
  "sun": {
    "altitude": 50.9,
    "azimuth": 132.5,
    "direction": "SE",
    "above_horizon": true,
    "distance_km": 151805632
  },
  "moon": {
    "altitude": -13.8,
    "azimuth": 284.8,
    "direction": "ONO",
    "above_horizon": false,
    "distance_km": 388819
  }
}
```

## Vérifier le projet

Vérifier le frontend :

```bash
cd /home/petik/Downloads/sun-moon/frontend
npm run lint
npm run build
```

Vérifier la syntaxe du backend :

```bash
cd /home/petik/Downloads/sun-moon
backend/venv/bin/python -m py_compile backend/main.py backend/calculator.py
```

## Dépannage

### L’interface affiche « Impossible de joindre le serveur »

Vérifiez que le backend Uvicorn est toujours actif dans le premier terminal et écoute sur le port `8000`.

### La géolocalisation ne fonctionne pas

Autorisez l’accès à la position dans le navigateur. La géolocalisation fonctionne sur `localhost` ou sur un site servi en HTTPS. Vous pouvez toujours saisir les coordonnées manuellement.

### Le port est déjà utilisé

Arrêtez l’ancien serveur avec `Ctrl + C`. Le frontend attend actuellement l’API sur le port `8000` et Vite sur le port `5173`.

### Une heure semble décalée

Vérifiez le fuseau horaire dans la section avancée. Il doit utiliser un identifiant IANA valide, par exemple `Europe/Paris`, `America/New_York` ou `Asia/Tokyo`.

## Limites

- l’éphéméride DE421 limite les dates acceptées du 29 juillet 1899 au 8 octobre 2053 ;
- la visibilité ne tient pas compte de la météo, du relief, des bâtiments ou de la végétation ;
- les coordonnées personnalisées nécessitent de choisir manuellement le bon fuseau horaire ;
- les informations sont destinées à l’observation et ne doivent pas être utilisées seules pour une navigation critique.

## Crédits

© 2026 PetiK. Tous droits réservés.

Conçu avec l’assistance de Gemini et Codex.
