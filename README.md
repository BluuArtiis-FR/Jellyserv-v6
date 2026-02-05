# 🐙 Jellyserv v6 - Homelab Media Server (2026 Edition)

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Docker](https://img.shields.io/badge/docker-v24+-blue.svg)
![Status](https://img.shields.io/badge/status-stable-green.svg)

> **🚀 [ACCÉDER AU CONFIGURATEUR EN LIGNE](https://bluuartiis-fr.github.io/Jellyserv-v6/)**
> *Créez votre fichier `docker-compose.yml` sur mesure en quelques clics !*

**Jellyserv v6** est une refonte complète ("Clean Slate") de la stack Homelab populaire. Fini le monolithe ingérable, place à une **architecture modulaire**, sécurisée par défaut (**Zero Trust**) et prête pour l'IA (**Ollama**).

## ✨ Nouveautés v6

- **📦 Architecture Modulaire** : Utilise `docker compose include` pour charger uniquement les modules nécessaires (`media`, `downloads`, `ai`...).
- **🛡️ Sécurité Zero-Trust** :
    - **Authentik** protège tous les services exposés (même ceux qui n'ont pas d'auth native).
    - **Socket Proxy** isole le démon Docker pour empêcher les failles de sécurité via Traefik.
- **🧠 IA Native** : Stack Ollama + OpenWebUI pré-configurée pour tourner vos propres LLM (Llama 3, Mistral) en local avec support GPU.
- **🚀 Configurateur Web** : Un tout nouveau configurateur React pour générer votre fichier `docker-compose.yml` sur mesure.

---

## 🏗️ Structure du Projet

```text
.
├── core/                  # INFRASTRUCTURE CRITIQUE
│   ├── compose.yaml       # Traefik v3, Socket Proxy
│   ├── authentik/         # Serveur SSO & IAM
│   └── config/            # Config dynamique Traefik (Middlewares)
│
├── apps/                  # MODULES APPLICATIFS
│   ├── media/             # Jellyfin, Jellyseerr
│   ├── downloads/         # Stack *Arr, qBittorrent, VPN (Gluetun)
│   └── ai/                # Ollama, Open WebUI
│
├── configurator/          # Code source du configurateur Web
├── docker-compose.yml     # Point d'entrée unique
└── .env.example           # Modèle de variables d'environnement
```

---

## 🚀 Démarrage Rapide

### Option A : Via le Configurateur (Recommandé)

1.  Rendez-vous sur le **[Configurateur Web v6](https://bluuartiis-fr.github.io/Jellyserv-v6/)**.
2.  Choisissez vos modules (Mode Simple ou Expert).
3.  Téléchargez le **ZIP prêt à l'emploi**.
4.  Décompressez le ZIP sur votre serveur et lancez :
    ```bash
    docker compose up -d
    ```

### Option B : Installation Manuelle (Développeurs)

1.  **Cloner le dépôt** :
    ```bash
    git clone https://github.com/BluuArtiis-FR/Jellyserv-v6.git
    cd Jellyserv-v6
    ```

2.  **Configurer** :
    Copiez `.env.example` vers `.env` et remplissez les valeurs.
    ```bash
    cp .env.example .env
    nano .env
    ```

3.  **Lancer** :
    ```bash
    docker compose up -d
    ```

---

## 🛠️ Modules Disponibles

| Module | Services Inclus | Description |
| :--- | :--- | :--- |
| **Core** | Traefik, SocketProxy, Authentik | *Toujours actif.* Gestion du réseau et de l'identité. |
| **Media** | Jellyfin, Jellyseerr, Tdarr | Streaming, transcodage et requêtes de médias. |
| **Downloads** | qBittorrent, *Arr Stack, Gluetun | Téléchargement automatisé via VPN strict. |
| **AI** | Ollama, OpenWebUI | Chatbot local et API LLM (compatible Nvidia). |
| **Backup** | Kopia | Sauvegarde chiffrée et dédupliquée (S3/Local). |
| **Observability**| Watchtower | Mises à jour automatiques des conteneurs. |
| **Dashboard** | Homer | Page d'accueil générée dynamiquement. |

---

## 🔒 Sécurité

Tous les services sont exposés via **HTTPS** (Let's Encrypt) et protégés par **Authentik**.
Le démon Docker est protégé par **Socket Proxy** en lecture seule.

## 🤝 Contribuer

Les Pull Requests sont les bienvenues !
Pour ajouter un nouveau module, créez un dossier dans `apps/` avec son propre `compose.yaml`.

---

© 2026 BluuArtiis-FR
