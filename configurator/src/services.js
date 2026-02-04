// services.js
// This file is the "manifest" of all services available in docker-compose.yml
// It defines their group, dependencies, and specific configuration variables.
// SYNCHRONIZED with docker-compose.yml v5.5.0 (79 services)

// Helper function to create a standard secret variable definition
const createSecret = (name, description, link_to = null) => ({
  name,
  description,
  type: 'password',
  link_to: link_to || name,
  generator: true,
  advanced: true // Secrets are advanced by default (auto-generated)
});

export const SERVICE_GROUPS = {
  "infrastructure": "🏗️ Infrastructure (Toujours actif)",
  "download": "⬇️ Téléchargement & Automatisation",
  "media": "🎬 Média & Streaming",
  "cloud": "☁️ Cloud Personnel & Fichiers",
  "office": "💼 Bureautique & Productivité",
  "docs": "📚 Documentation & Prise de Notes",
  "productivity": "✅ Productivité & Gestion de Projets",
  "monitoring": "📊 Monitoring & Alertes",
  "management": "🛠️ Gestion de la Stack",
  "recipes": "🍲 Gestion de Recettes",
  "photos": "🖼️ Gestion de Photos",
  "home-automation": "🏠 Domotique",
  "utils": "⚙️ Utilitaires",
  "finance": "💰 Finances Personnelles",
  "security": "🛡️ Sécurité",
  "inventory": "📦 Inventaire & Stock",
  "network": "🌐 Réseau & DNS",
  "remote-support": "🆘 Support à distance",
  "health-fitness": "💪 Santé & Fitness"
};

export const SERVICE_MANIFEST = {
  // ===========================================================================
  // INFRASTRUCTURE - Always active (no profile)
  // ===========================================================================
  "homer": {
    group: "infrastructure",
    name: "Homer",
    description: "Dashboard d'accueil personnalisable avec tous vos services.",
    doc_url: "https://github.com/bastienwirtz/homer",
    always_on: true,
    expose: true,
    subdomain: "",
    port: 8080
  },
  "traefik": {
    group: "infrastructure",
    name: "Traefik",
    description: "Reverse proxy et load balancer avec SSL automatique via Let's Encrypt.",
    doc_url: "https://doc.traefik.io/traefik/",
    always_on: true,
    port: 443,
    env_vars: [
      { name: "ACME_EMAIL", description: "Email pour les certificats Let's Encrypt.", type: "email", required: true }
    ]
  },
  "authentik-postgres": {
    group: "infrastructure",
    name: "Authentik PostgreSQL",
    description: "Base de données PostgreSQL pour Authentik.",
    internal: true,
    always_on: true
  },
  "authentik-redis": {
    group: "infrastructure",
    name: "Authentik Redis",
    description: "Cache Redis pour Authentik.",
    internal: true,
    always_on: true
  },
  "authentik-server": {
    group: "infrastructure",
    name: "Authentik Server",
    description: "Serveur d'authentification SSO et gestion d'identité.",
    doc_url: "https://docs.goauthentik.io/",
    always_on: true,
    dependencies: ["authentik-postgres", "authentik-redis"],
    expose: true,
    subdomain: "auth",
    port: 9000,
    env_vars: [
      createSecret("AUTHENTIK_SECRET_KEY", "Clé secrète pour Authentik (min 50 caractères)."),
      createSecret("AUTHENTIK_PG_PASS", "Mot de passe PostgreSQL pour Authentik.")
    ]
  },
  "authentik-worker": {
    group: "infrastructure",
    name: "Authentik Worker",
    description: "Worker de tâches pour Authentik.",
    internal: true,
    always_on: true,
    dependencies: ["authentik-postgres", "authentik-redis"]
  },

  // ===========================================================================
  // DOWNLOAD PROFILE - Download services
  // ===========================================================================
  "gluetun": {
    group: "download",
    name: "Gluetun (VPN)",
    description: "Container VPN essentiel pour anonymiser le trafic des services de téléchargement.",
    doc_url: "https://github.com/qdm12/gluetun-wiki",
    dependencies: [],
    env_vars: [
      { name: "VPN_SERVICE_PROVIDER", description: "Fournisseur VPN.", type: "select", options: ['protonvpn', 'mullvad', 'nordvpn', 'expressvpn', 'private internet access', 'surfshark', 'windscribe', 'custom'], required: true },
      { name: "VPN_TYPE", description: "Type de protocole VPN.", type: "select", options: ['openvpn', 'wireguard'], advanced: true, default: 'openvpn' },
      { name: "OPENVPN_USER", description: "Nom d'utilisateur OpenVPN.", type: "text", condition: (config) => config.VPN_TYPE === 'openvpn', required: true },
      { name: "OPENVPN_PASSWORD", description: "Mot de passe OpenVPN.", type: "password", condition: (config) => config.VPN_TYPE === 'openvpn', required: true },
      { name: "SERVER_COUNTRIES", description: "Pays des serveurs VPN (séparés par virgule).", type: "text", default: "Switzerland", advanced: true }
    ]
  },
  "qbittorrent": {
    group: "download",
    name: "qBittorrent",
    description: "Client BitTorrent avec interface web.",
    doc_url: "https://github.com/qbittorrent/qBittorrent/wiki",
    dependencies: ["gluetun"],
    port: 8080
  },
  "prowlarr": {
    group: "download",
    name: "Prowlarr",
    description: "Gestionnaire d'indexers pour Sonarr, Radarr, Lidarr.",
    doc_url: "https://wiki.servarr.com/prowlarr",
    dependencies: ["gluetun", "flaresolverr"],
    expose: true,
    subdomain: "prowlarr",
    port: 9696
  },
  "flaresolverr": {
    group: "download",
    name: "FlareSolverr",
    description: "Proxy pour contourner les protections Cloudflare des indexers.",
    doc_url: "https://github.com/FlareSolverr/FlareSolverr",
    internal: true,
    port: 8191
  },
  "sonarr": {
    group: "download",
    name: "Sonarr",
    description: "Gestion automatique de séries TV.",
    doc_url: "https://wiki.servarr.com/sonarr",
    dependencies: ["prowlarr"],
    expose: true,
    subdomain: "sonarr",
    port: 8989,
    env_vars: [
      { ...createSecret("SONARR_API_KEY", "Clé API pour Sonarr (obtenue dans Settings > General)."), generator: false, advanced: true }
    ]
  },
  "radarr": {
    group: "download",
    name: "Radarr",
    description: "Gestion automatique de films.",
    doc_url: "https://wiki.servarr.com/radarr",
    dependencies: ["prowlarr"],
    expose: true,
    subdomain: "radarr",
    port: 7878,
    env_vars: [
      { ...createSecret("RADARR_API_KEY", "Clé API pour Radarr (obtenue dans Settings > General)."), generator: false, advanced: true }
    ]
  },
  "lidarr": {
    group: "download",
    name: "Lidarr",
    description: "Gestion automatique de musique.",
    doc_url: "https://wiki.servarr.com/lidarr",
    dependencies: ["prowlarr"],
    expose: true,
    subdomain: "lidarr",
    port: 8686,
    env_vars: [
      { ...createSecret("LIDARR_API_KEY", "Clé API pour Lidarr."), generator: false, advanced: true }
    ]
  },
  "readarr": {
    group: "download",
    name: "Readarr",
    description: "Gestion automatique de livres et ebooks.",
    doc_url: "https://wiki.servarr.com/readarr",
    dependencies: ["prowlarr"],
    expose: true,
    subdomain: "readarr",
    port: 8787,
    env_vars: [
      { ...createSecret("READARR_API_KEY", "Clé API pour Readarr."), generator: false, advanced: true }
    ]
  },
  "bazarr": {
    group: "download",
    name: "Bazarr",
    description: "Gestion de sous-titres pour Sonarr & Radarr.",
    doc_url: "https://wiki.bazarr.media",
    dependencies: ["sonarr", "radarr"],
    expose: true,
    subdomain: "bazarr",
    port: 6767
  },
  "unpackerr": {
    group: "download",
    name: "Unpackerr",
    description: "Décompresse automatiquement les archives téléchargées.",
    doc_url: "https://unpackerr.zip",
    dependencies: ["sonarr", "radarr"],
    internal: true
  },
  "recyclarr": {
    group: "download",
    name: "Recyclarr",
    description: "Synchronise les guides TRaSH pour optimiser la qualité de Sonarr/Radarr.",
    doc_url: "https://recyclarr.dev",
    dependencies: ["sonarr", "radarr"],
    internal: true
  },
  "cross-seed": {
    group: "download",
    name: "Cross-Seed",
    description: "Cross-seeding automatique pour améliorer vos ratios sur les trackers.",
    doc_url: "https://cross-seed.org",
    dependencies: ["qbittorrent"],
    internal: true,
    port: 2468
  },

  // ===========================================================================
  // MEDIA PROFILE - Streaming and media management
  // ===========================================================================
  "jellyfin": {
    group: "media",
    name: "Jellyfin",
    description: "Serveur de streaming multimédia open source.",
    doc_url: "https://jellyfin.org/docs",
    expose: true,
    subdomain: "jellyfin",
    port: 8096
  },
  "jellyseerr": {
    group: "media",
    name: "Jellyseerr",
    description: "Interface de demandes de contenu pour Jellyfin.",
    doc_url: "https://docs.overseerr.dev",
    dependencies: ["jellyfin"],
    expose: true,
    subdomain: "requests",
    port: 5055
  },
  "requestrr": {
    group: "media",
    name: "Requestrr",
    description: "Bot Discord pour les demandes de films/séries via Sonarr/Radarr.",
    doc_url: "https://github.com/thomst08/requestrr",
    dependencies: ["sonarr", "radarr"],
    expose: true,
    subdomain: "requestrr",
    port: 4545
  },
  "tdarr": {
    group: "media",
    name: "Tdarr",
    description: "Automatisation du transcodage de librairies multimédias.",
    doc_url: "https://docs.tdarr.io",
    expose: true,
    subdomain: "tdarr",
    port: 8265
  },
  "jellystat": {
    group: "media",
    name: "Jellystat",
    description: "Statistiques et suivi d'activité pour Jellyfin.",
    doc_url: "https://github.com/CyferShepard/Jellystat",
    dependencies: ["jellyfin", "jellystat-db"],
    expose: true,
    subdomain: "jellystat",
    port: 3000,
    env_vars: [
      createSecret("JELLYSTAT_DB_PASS", "Mot de passe PostgreSQL pour Jellystat."),
      createSecret("JELLYSTAT_JWT_SECRET", "Clé secrète JWT pour Jellystat.")
    ]
  },
  "jellystat-db": {
    group: "media",
    name: "Jellystat DB",
    description: "Base de données PostgreSQL pour Jellystat.",
    internal: true
  },
  "wizarr": {
    group: "media",
    name: "Wizarr",
    description: "Gestion des invitations utilisateurs pour Jellyfin.",
    doc_url: "https://github.com/Wizarrrr/wizarr",
    dependencies: ["jellyfin"],
    expose: true,
    subdomain: "invite",
    port: 5690
  },
  "maintainerr": {
    group: "media",
    name: "Maintainerr",
    description: "Nettoyage automatique des médias non regardés de vos bibliothèques.",
    doc_url: "https://github.com/jorenn92/Maintainerr",
    dependencies: ["jellyfin", "sonarr", "radarr"],
    expose: true,
    subdomain: "maintainerr",
    port: 6246
  },
  "autoscan": {
    group: "media",
    name: "Autoscan",
    description: "Déclenche automatiquement les scans de bibliothèques Jellyfin/Plex après téléchargement.",
    doc_url: "https://github.com/Cloudbox/autoscan",
    dependencies: ["jellyfin"],
    internal: true,
    port: 3030
  },

  // ===========================================================================
  // CLOUD PROFILE - Storage and files
  // ===========================================================================
  "nextcloud": {
    group: "cloud",
    name: "Nextcloud",
    description: "Suite cloud personnel (fichiers, contacts, calendriers...).",
    doc_url: "https://docs.nextcloud.com",
    dependencies: ["nextcloud-db", "nextcloud-redis"],
    expose: true,
    subdomain: "nextcloud",
    port: 80,
    env_vars: [
      createSecret("NEXTCLOUD_ADMIN_PASS", "Mot de passe administrateur Nextcloud."),
      createSecret("NEXTCLOUD_DB_PASS", "Mot de passe PostgreSQL pour Nextcloud.")
    ]
  },
  "nextcloud-db": {
    group: "cloud",
    name: "Nextcloud DB",
    description: "Base de données PostgreSQL pour Nextcloud.",
    internal: true
  },
  "nextcloud-redis": {
    group: "cloud",
    name: "Nextcloud Redis",
    description: "Cache Redis pour Nextcloud.",
    internal: true
  },
  "duplicati": {
    group: "cloud",
    name: "Duplicati",
    description: "Logiciel de sauvegarde avec chiffrement.",
    doc_url: "https://duplicati.readthedocs.io",
    expose: true,
    subdomain: "backup",
    port: 8200
  },
  "filebrowser": {
    group: "cloud",
    name: "FileBrowser",
    description: "Interface web de gestion de fichiers.",
    doc_url: "https://filebrowser.org",
    expose: true,
    subdomain: "files",
    port: 80
  },

  // ===========================================================================
  // OFFICE PROFILE - Office suite
  // ===========================================================================
  "onlyoffice": {
    group: "office",
    name: "OnlyOffice",
    description: "Suite bureautique en ligne (édition de documents).",
    doc_url: "https://helpcenter.onlyoffice.com",
    expose: true,
    subdomain: "office",
    port: 80,
    env_vars: [
      createSecret("ONLYOFFICE_JWT_SECRET", "Clé secrète JWT pour OnlyOffice.")
    ]
  },
  "stirling-pdf": {
    group: "office",
    name: "Stirling PDF",
    description: "Outil complet pour manipuler les fichiers PDF.",
    doc_url: "https://docs.stirlingpdf.com",
    expose: true,
    subdomain: "pdf",
    port: 8080
  },
  "jirafeau": {
    group: "office",
    name: "Jirafeau",
    description: "Partage de fichiers volumineux avec un lien temporaire.",
    doc_url: "https://gitlab.com/mojo42/jirafeau",
    expose: true,
    subdomain: "share",
    port: 80
  },

  // ===========================================================================
  // DOCS PROFILE - Documentation and notes
  // ===========================================================================
  "bookstack": {
    group: "docs",
    name: "Bookstack",
    description: "Plateforme de documentation et de wiki.",
    doc_url: "https://www.bookstackapp.com/docs",
    dependencies: ["bookstack-db"],
    expose: true,
    subdomain: "wiki",
    port: 80,
    env_vars: [
      createSecret("BOOKSTACK_DB_PASS", "Mot de passe MariaDB pour Bookstack."),
      createSecret("BOOKSTACK_DB_ROOT_PASS", "Mot de passe root MariaDB (optionnel).")
    ]
  },
  "bookstack-db": {
    group: "docs",
    name: "Bookstack DB",
    description: "Base de données MariaDB pour Bookstack.",
    internal: true
  },
  "paperless-ngx": {
    group: "docs",
    name: "Paperless-ngx",
    description: "Archive numérique intelligente pour documents physiques.",
    doc_url: "https://docs.paperless-ngx.com",
    dependencies: ["paperless-db", "paperless-redis"],
    expose: true,
    subdomain: "paperless",
    port: 8000,
    env_vars: [
      createSecret("PAPERLESS_SECRET_KEY", "Clé secrète pour Paperless-ngx."),
      createSecret("PAPERLESS_DB_PASS", "Mot de passe PostgreSQL pour Paperless."),
      { name: "PAPERLESS_ADMIN_USER", description: "Nom d'utilisateur admin.", type: "text", default: "admin", advanced: true },
      createSecret("PAPERLESS_ADMIN_PASS", "Mot de passe admin pour Paperless.")
    ]
  },
  "paperless-db": {
    group: "docs",
    name: "Paperless DB",
    description: "Base de données PostgreSQL pour Paperless.",
    internal: true
  },
  "paperless-redis": {
    group: "docs",
    name: "Paperless Redis",
    description: "Cache Redis pour Paperless.",
    internal: true
  },

  // ===========================================================================
  // SECURITY PROFILE - Security and passwords
  // ===========================================================================
  "vaultwarden": {
    group: "security",
    name: "Vaultwarden",
    description: "Gestionnaire de mots de passe compatible Bitwarden.",
    doc_url: "https://github.com/dani-garcia/vaultwarden/wiki",
    expose: true,
    subdomain: "vault",
    port: 80,
    env_vars: [
      { name: "VAULTWARDEN_SIGNUPS", description: "Autoriser les inscriptions.", type: "select", options: ['true', 'false'], default: 'false', advanced: true },
      createSecret("VAULTWARDEN_ADMIN_TOKEN", "Token admin pour Vaultwarden (optionnel).")
    ]
  },
  "tailscale": {
    group: "security",
    name: "Tailscale",
    description: "Réseau privé VPN entre vos appareils.",
    doc_url: "https://tailscale.com/kb",
    env_vars: [
      { name: "TAILSCALE_AUTHKEY", description: "Clé d'authentification Tailscale.", type: "text", required: true }
    ]
  },

  // ===========================================================================
  // RECIPES PROFILE - Recipe management
  // ===========================================================================
  "mealie": {
    group: "recipes",
    name: "Mealie",
    description: "Gestionnaire de recettes de cuisine.",
    doc_url: "https://docs.mealie.io",
    expose: true,
    subdomain: "recipes",
    port: 9000
  },

  // ===========================================================================
  // PHOTOS PROFILE - Photo management
  // ===========================================================================
  "immich-server": {
    group: "photos",
    name: "Immich",
    description: "Solution de sauvegarde de photos et vidéos (Google Photos alternative).",
    doc_url: "https://immich.app/docs",
    dependencies: ["immich-db", "immich-redis", "immich-ml"],
    expose: true,
    subdomain: "photos",
    port: 3001,
    env_vars: [
      createSecret("IMMICH_DB_PASS", "Mot de passe PostgreSQL pour Immich.")
    ]
  },
  "immich-ml": {
    group: "photos",
    name: "Immich ML",
    description: "Service Machine Learning pour Immich (reconnaissance faciale, etc.).",
    internal: true,
    port: 3003
  },
  "immich-db": {
    group: "photos",
    name: "Immich DB",
    description: "Base de données PostgreSQL avec pgvecto-rs pour Immich.",
    internal: true
  },
  "immich-redis": {
    group: "photos",
    name: "Immich Redis",
    description: "Cache Redis pour Immich.",
    internal: true
  },

  // ===========================================================================
  // FINANCE PROFILE - Financial management
  // ===========================================================================
  "firefly-iii": {
    group: "finance",
    name: "Firefly III",
    description: "Gestionnaire de finances personnelles.",
    doc_url: "https://docs.firefly-iii.org",
    dependencies: ["firefly-db"],
    expose: true,
    subdomain: "finance",
    port: 8080,
    env_vars: [
      createSecret("FIREFLY_APP_KEY", "Clé d'application Laravel (32 caractères)."),
      createSecret("FIREFLY_DB_PASS", "Mot de passe PostgreSQL pour Firefly III.")
    ]
  },
  "firefly-db": {
    group: "finance",
    name: "Firefly DB",
    description: "Base de données PostgreSQL pour Firefly III.",
    internal: true
  },

  // ===========================================================================
  // INVENTORY PROFILE - Stock management
  // ===========================================================================
  "grocy": {
    group: "inventory",
    name: "Grocy",
    description: "ERP pour votre maison, gestion de stock alimentaire.",
    doc_url: "https://grocy.info",
    expose: true,
    subdomain: "grocy",
    port: 80
  },

  // ===========================================================================
  // HOME-AUTOMATION PROFILE - Home automation
  // ===========================================================================
  "home-assistant": {
    group: "home-automation",
    name: "Home Assistant",
    description: "Plateforme de domotique open-source.",
    doc_url: "https://www.home-assistant.io/docs",
    expose: true,
    subdomain: "home",
    port: 8123
  },

  // ===========================================================================
  // UTILS PROFILE - Various utilities
  // ===========================================================================
  "freshrss": {
    group: "utils",
    name: "FreshRSS",
    description: "Agrégateur de flux RSS auto-hébergé.",
    doc_url: "https://freshrss.github.io/FreshRSS",
    expose: true,
    subdomain: "rss",
    port: 80
  },
  "metube": {
    group: "utils",
    name: "MeTube",
    description: "Téléchargeur vidéo basé sur yt-dlp.",
    doc_url: "https://github.com/alexta69/metube",
    expose: true,
    subdomain: "metube",
    port: 8081
  },
  "changedetection": {
    group: "utils",
    name: "Changedetection.io",
    description: "Surveille les changements sur les pages web.",
    doc_url: "https://changedetection.io/docs",
    dependencies: ["changedetection-browser"],
    expose: true,
    subdomain: "changes",
    port: 5000
  },
  "changedetection-browser": {
    group: "utils",
    name: "Changedetection Browser",
    description: "Navigateur headless Chrome pour Changedetection.",
    internal: true
  },
  "shlink": {
    group: "utils",
    name: "Shlink",
    description: "Raccourcisseur d'URL auto-hébergé.",
    doc_url: "https://shlink.io/documentation",
    dependencies: ["shlink-db"],
    expose: true,
    subdomain: "s",
    port: 8080,
    env_vars: [
      createSecret("SHLINK_DB_PASS", "Mot de passe PostgreSQL pour Shlink."),
      createSecret("SHLINK_API_KEY", "Clé API initiale pour Shlink."),
      { name: "GEOLITE_LICENSE_KEY", description: "Clé MaxMind GeoLite2 (optionnel, pour géolocalisation).", type: "text", advanced: true }
    ]
  },
  "shlink-db": {
    group: "utils",
    name: "Shlink DB",
    description: "Base de données PostgreSQL pour Shlink.",
    internal: true
  },
  "apprise": {
    group: "utils",
    name: "Apprise",
    description: "API de notifications universelle (80+ services: Discord, Telegram, Email...).",
    doc_url: "https://github.com/caronc/apprise-api",
    expose: true,
    subdomain: "notify",
    port: 8000
  },

  // ===========================================================================
  // PRODUCTIVITY PROFILE - Gestion de projets et tâches
  // ===========================================================================
  "planka": {
    group: "productivity",
    name: "Planka",
    description: "Tableau Kanban collaboratif (alternative à Trello).",
    doc_url: "https://docs.planka.cloud",
    dependencies: ["planka-db"],
    expose: true,
    subdomain: "kanban",
    port: 1337,
    env_vars: [
      createSecret("PLANKA_SECRET_KEY", "Clé secrète pour Planka."),
      createSecret("PLANKA_DB_PASS", "Mot de passe PostgreSQL pour Planka."),
      { name: "PLANKA_ADMIN_EMAIL", description: "Email de l'administrateur.", type: "email", default: "admin@example.com", advanced: true },
      createSecret("PLANKA_ADMIN_PASSWORD", "Mot de passe admin Planka.")
    ]
  },
  "planka-db": {
    group: "productivity",
    name: "Planka DB",
    description: "Base de données PostgreSQL pour Planka.",
    internal: true
  },
  "vikunja": {
    group: "productivity",
    name: "Vikunja",
    description: "Gestionnaire de tâches et todo list (alternative à Todoist).",
    doc_url: "https://vikunja.io/docs",
    dependencies: ["vikunja-db"],
    expose: true,
    subdomain: "tasks",
    port: 3456,
    env_vars: [
      createSecret("VIKUNJA_JWT_SECRET", "Clé secrète JWT pour Vikunja."),
      createSecret("VIKUNJA_DB_PASS", "Mot de passe PostgreSQL pour Vikunja.")
    ]
  },
  "vikunja-db": {
    group: "productivity",
    name: "Vikunja DB",
    description: "Base de données PostgreSQL pour Vikunja.",
    internal: true
  },

  // ===========================================================================
  // MANAGEMENT PROFILE - Administration
  // ===========================================================================
  "portainer": {
    group: "management",
    name: "Portainer",
    description: "Interface de gestion de conteneurs Docker.",
    doc_url: "https://docs.portainer.io",
    expose: true,
    subdomain: "portainer",
    port: 9000
  },
  "code-server": {
    group: "management",
    name: "Code-Server",
    description: "VS Code accessible depuis un navigateur.",
    doc_url: "https://coder.com/docs/code-server",
    expose: true,
    subdomain: "code",
    port: 8443,
    env_vars: [
      createSecret("CODESERVER_PASSWORD", "Mot de passe pour Code-Server."),
      createSecret("CODESERVER_SUDO_PASSWORD", "Mot de passe sudo (optionnel).")
    ]
  },
  "dozzle": {
    group: "management",
    name: "Dozzle",
    description: "Visualiseur de logs Docker en temps réel.",
    doc_url: "https://dozzle.dev",
    expose: true,
    subdomain: "logs",
    port: 8080
  },

  // ===========================================================================
  // NETWORK PROFILE - Network and DNS
  // ===========================================================================
  "adguardhome": {
    group: "network",
    name: "AdGuard Home",
    description: "Bloqueur de pubs et traqueurs au niveau DNS.",
    doc_url: "https://adguard.com/kb/adguard-home",
    expose: true,
    subdomain: "adguard",
    port: 80,
    env_vars: [
      { name: "ADGUARD_HOME_USER", description: "Nom d'utilisateur admin.", type: "text", advanced: true, default: "admin" },
      { ...createSecret("ADGUARD_HOME_ADMIN_PASS", "Mot de passe admin AdGuard."), generator: true } // Removed advanced:true so user sees the password
    ]
  },

  // ===========================================================================
  // REMOTE-SUPPORT PROFILE - Remote assistance
  // ===========================================================================
  "rustdesk-server": {
    group: "remote-support",
    name: "RustDesk Server",
    description: "Serveur de signalisation pour RustDesk.",
    doc_url: "https://rustdesk.com/docs/en/self-host",
    dependencies: ["rustdesk-relay"],
    port: 21116
  },
  "rustdesk-relay": {
    group: "remote-support",
    name: "RustDesk Relay",
    description: "Serveur relais pour RustDesk.",
    internal: true,
    port: 21117
  },

  // ===========================================================================
  // HEALTH-FITNESS PROFILE - Health and fitness
  // ===========================================================================
  "wger": {
    group: "health-fitness",
    name: "Wger",
    description: "Suivi d'entraînement et de nutrition.",
    doc_url: "https://wger.readthedocs.io",
    dependencies: ["wger-db", "wger-redis"],
    expose: true,
    subdomain: "wger",
    port: 8000,
    env_vars: [
      createSecret("WGER_SECRET_KEY", "Clé secrète Django pour Wger."),
      createSecret("WGER_DB_PASS", "Mot de passe PostgreSQL pour Wger.")
    ]
  },
  "wger-db": {
    group: "health-fitness",
    name: "Wger DB",
    description: "Base de données PostgreSQL pour Wger.",
    internal: true
  },
  "wger-redis": {
    group: "health-fitness",
    name: "Wger Redis",
    description: "Cache Redis pour Wger.",
    internal: true
  },

  // ===========================================================================
  // MONITORING PROFILE - Monitoring and alerting
  // ===========================================================================
  "prometheus": {
    group: "monitoring",
    name: "Prometheus",
    description: "Système de monitoring et d'alertes time-series.",
    doc_url: "https://prometheus.io",
    dependencies: ["node-exporter", "cadvisor"],
    expose: true,
    subdomain: "prometheus",
    port: 9090
  },
  "grafana": {
    group: "monitoring",
    name: "Grafana",
    description: "Plateforme de visualisation de métriques.",
    doc_url: "https://grafana.com/docs/grafana/latest/",
    dependencies: ["prometheus"],
    expose: true,
    subdomain: "grafana",
    port: 3000,
    env_vars: [
      createSecret("GRAFANA_ADMIN_PASS", "Mot de passe administrateur Grafana."),
      { name: "GRAFANA_OAUTH_CLIENT_ID", description: "ID Client OAuth Authentik (optionnel).", type: "text", advanced: true },
      { name: "GRAFANA_OAUTH_CLIENT_SECRET", description: "Secret Client OAuth Authentik (optionnel).", type: "password", advanced: true }
    ]
  },
  "alertmanager": {
    group: "monitoring",
    name: "Alertmanager",
    description: "Gestion des alertes Prometheus.",
    doc_url: "https://prometheus.io/docs/alerting/latest/alertmanager/",
    expose: true,
    subdomain: "alerts",
    port: 9093,
    env_vars: [
      { name: "DISCORD_WEBHOOK_URL", description: "Webhook Discord pour les alertes (optionnel).", type: "text", advanced: true }
    ]
  },
  "uptime-kuma": {
    group: "monitoring",
    name: "Uptime Kuma",
    description: "Outil de surveillance (uptime monitoring) self-hosted.",
    doc_url: "https://github.com/louislam/uptime-kuma",
    expose: true,
    subdomain: "status",
    port: 3001
  },
  "node-exporter": {
    group: "monitoring",
    name: "Node Exporter",
    description: "Exportateur de métriques système pour Prometheus.",
    internal: true,
    always_on: true
  },
  "cadvisor": {
    group: "monitoring",
    name: "cAdvisor",
    description: "Analyseur de l'utilisation des ressources et des performances des conteneurs.",
    internal: true,
    always_on: true
  }
};

export const getServiceDependencies = (serviceId) => {
  const service = SERVICE_MANIFEST[serviceId];
  if (!service) return [];

  let deps = [serviceId];
  if (service.dependencies) {
    service.dependencies.forEach(dep => {
      deps = [...deps, ...getServiceDependencies(dep)];
    });
  }
  return [...new Set(deps)];
};
