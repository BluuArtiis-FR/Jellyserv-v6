import JSZip from 'jszip';
import { SERVICE_MANIFEST } from '../services'; // Import service manifest to get details for dashboard

// ============================================================================
// TEMPLATES YAML (Extended for Phase 2)
// ============================================================================

const TEMPLATE_ROOT = `name: jellyserv

include:
  - path:
      - core/compose.yaml
      - core/authentik/compose.yaml
  
  # MODULES DYNAMIQUES
__INCLUDES__

networks:
  web:
    name: jellyserv_web
    driver: bridge
  db_int:
    name: jellyserv_db
    internal: true
  ai_net:
    name: jellyserv_ai
    driver: bridge

volumes:
  traefik_data:
  db_data:
  redis_data:
  kopia_config:
  kopia_cache:
`;

const TEMPLATES = {
  // ... CORE
  'core/compose.yaml': `name: jellyserv-core
services:
  socket-proxy:
    image: lscr.io/linuxserver/socket-proxy:latest
    container_name: socket-proxy
    environment:
      - CONTAINERS=1
      - SERVICES=1
      - NETWORKS=1
      - POST=0
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    networks:
      - socket_net
    restart: unless-stopped
    read_only: true
    tmpfs:
      - /run

  traefik:
    image: traefik:v3.0
    container_name: traefik
    command:
      - "--api.dashboard=true"
      - "--providers.docker=true"
      - "--providers.docker.endpoint=tcp://socket-proxy:2375"
      - "--providers.docker.exposedbydefault=false"
      - "--providers.docker.network=jellyserv_web"
      - "--providers.file.directory=/etc/traefik/dynamic"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--entrypoints.websecure.http.tls=true"
      - "--entrypoints.websecure.http.tls.certresolver=letsencrypt"
      - "--certificatesresolvers.letsencrypt.acme.email=\${ACME_EMAIL}"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
      - "--certificatesresolvers.letsencrypt.acme.tlschallenge=true"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - traefik_data:/letsencrypt
      - ./config:/etc/traefik/dynamic:ro
    networks:
      - web
      - socket_net
    depends_on:
      - socket-proxy
    restart: unless-stopped

networks:
  web:
    name: jellyserv_web
    external: true
  socket_net:
    internal: true`,

  'core/authentik/compose.yaml': `name: jellyserv-authentik
services:
  postgresql:
    image: postgres:16-alpine
    container_name: authentik-db
    environment:
      POSTGRES_PASSWORD: \${AUTHENTIK_PG_PASS}
      POSTGRES_USER: authentik
      POSTGRES_DB: authentik
    volumes:
      - db_data:/var/lib/postgresql/data
    networks:
      - db_int
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    container_name: authentik-redis
    networks:
      - db_int
    restart: unless-stopped

  server:
    image: ghcr.io/goauthentik/server:2024.2
    container_name: authentik-server
    command: server
    environment:
      AUTHENTIK_REDIS__HOST: authentik-redis
      AUTHENTIK_POSTGRESQL__HOST: authentik-db
      AUTHENTIK_POSTGRESQL__PASSWORD: \${AUTHENTIK_PG_PASS}
      AUTHENTIK_SECRET_KEY: \${AUTHENTIK_SECRET_KEY}
    networks:
      - web
      - db_int
    ports:
      - "9000:9000"
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.authentik.rule=Host(\`auth.\${DOMAIN}\`)"
      - "traefik.http.routers.authentik.entrypoints=websecure"
      - "traefik.http.routers.authentik.tls.certresolver=letsencrypt"
      - "traefik.http.services.authentik.loadbalancer.server.port=9000"
    restart: unless-stopped

  worker:
    image: ghcr.io/goauthentik/server:2024.2
    container_name: authentik-worker
    command: worker
    environment:
      AUTHENTIK_REDIS__HOST: authentik-redis
      AUTHENTIK_POSTGRESQL__HOST: authentik-db
      AUTHENTIK_POSTGRESQL__PASSWORD: \${AUTHENTIK_PG_PASS}
      AUTHENTIK_SECRET_KEY: \${AUTHENTIK_SECRET_KEY}
    networks:
      - db_int
    restart: unless-stopped

networks:
  web:
    name: jellyserv_web
    external: true
  db_int:
    external: true`,

  'core/config/dynamic.yml': `http:
  middlewares:
    auth:
      forwardAuth:
        address: "http://authentik-server:9000/outpost.goauthentik.io/auth/traefik"
        trustForwardHeader: true
        authResponseHeaders:
          - X-authentik-username`,

  // APPS
  'apps/media/compose.yaml': `name: jellyserv-media
services:
  jellyfin:
    image: jellyfin/jellyfin:latest
    container_name: jellyfin
    environment:
      - JELLYFIN_PublishedServerUrl=https://jellyfin.\${DOMAIN}
    volumes:
      - ./config:/config
      - \${MEDIA_ROOT}:/media
    networks:
      - web
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.jellyfin.rule=Host(\`jellyfin.\${DOMAIN}\`)"
      - "traefik.http.routers.jellyfin.entrypoints=websecure"
      - "traefik.http.routers.jellyfin.tls.certresolver=letsencrypt"
      - "traefik.http.services.jellyfin.loadbalancer.server.port=8096"
    restart: unless-stopped

networks:
  web:
    name: jellyserv_web
    external: true`,

  'apps/ai/compose.yaml': `name: jellyserv-ai
services:
  ollama:
    image: ollama/ollama:latest
    container_name: ollama
    networks:
      - ai_net
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    restart: unless-stopped

  open-webui:
    image: ghcr.io/open-webui/open-webui:main
    container_name: open-webui
    environment:
      - OLLAMA_BASE_URL=http://ollama:11434
    networks:
      - web
      - ai_net
    depends_on:
      - ollama
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.ai.rule=Host(\`ai.\${DOMAIN}\`)"
      - "traefik.http.routers.ai.entrypoints=websecure"
      - "traefik.http.routers.ai.tls.certresolver=letsencrypt"
      - "traefik.http.services.ai.loadbalancer.server.port=8080"
    restart: unless-stopped

networks:
  web:
    name: jellyserv_web
    external: true
  ai_net:
    name: jellyserv_ai
    external: true`,

  // NEW MODULES
  'apps/backup/compose.yaml': `name: jellyserv-backup
services:
  kopia:
    image: kopia/kopia:latest
    container_name: kopia
    environment:
      - KOPIA_PASSWORD=\${BACKUP_ENCRYPTION_PASS}
      - KOPIA_SERVER_USERNAME=admin
      - KOPIA_SERVER_PASSWORD=\${BACKUP_UI_PASS}
    command:
      - server
      - start
      - --insecure
      - --address=0.0.0.0:51515
      - --server-username=admin
      - --server-password=\${BACKUP_UI_PASS}
      - --without-password
    volumes:
      - kopia_config:/app/config
      - \${DATA_ROOT}:/data/jellyserv_data:ro
    networks:
      - web
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.backup.rule=Host(\`backup.\${DOMAIN}\`)"
      - "traefik.http.routers.backup.entrypoints=websecure"
      - "traefik.http.routers.backup.tls.certresolver=letsencrypt"
      - "traefik.http.services.backup.loadbalancer.server.port=51515"
    restart: unless-stopped

networks:
  web:
    name: jellyserv_web
    external: true

volumes:
  kopia_config:`,

  'apps/observability/compose.yaml': `name: jellyserv-observability
services:
  watchtower:
    image: containrrr/watchtower
    container_name: watchtower
    environment:
      - WATCHTOWER_SCHEDULE=0 0 4 * * *
      - WATCHTOWER_CLEANUP=true
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    restart: unless-stopped

networks:
  default:
    name: jellyserv_web
    external: true`,

  'apps/dashboard/compose.yaml': `name: jellyserv-dashboard
services:
  homer:
    image: b4bz/homer
    container_name: homer
    volumes:
      - ./assets:/www/assets
    networks:
      - web
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.home.rule=Host(\`\${DOMAIN}\`)"
      - "traefik.http.routers.home.entrypoints=websecure"
      - "traefik.http.routers.home.tls.certresolver=letsencrypt"
      - "traefik.http.services.home.loadbalancer.server.port=8080"
    restart: unless-stopped

networks:
  web:
    name: jellyserv_web
    external: true`
};

const getServiceIcon = (serviceKey) => {
  // Basic mapping, could be extended
  const map = {
    'jellyfin': 'fas fa-play',
    'sonarr': 'fas fa-tv',
    'radarr': 'fas fa-film',
    'prowlarr': 'fas fa-search',
    'qbittorrent': 'fas fa-download',
    'open-webui': 'fas fa-brain',
    'kopia': 'fas fa-save',
    'portainer': 'fas fa-box',
    'grafana': 'fas fa-chart-line',
    'traefik': 'fas fa-network-wired'
  };
  return map[serviceKey] || 'fas fa-cube';
};

const generateHomerConfig = (selectedServices, domain) => {
  let items = [];

  // Core Services (Always there)
  items.push({
    name: "Authentik",
    logo: "assets/tools/authentik.png",
    subtitle: "Identity Provider",
    tag: "Core",
    url: `https://auth.\${domain}`,
    icon: "fas fa-shield-alt"
  });
  items.push({
    name: "Traefik",
    logo: "assets/tools/traefik.png",
    subtitle: "Edge Router",
    tag: "Core",
    url: `https://traefik.\${domain}`,
    icon: "fas fa-network-wired"
  });

  // Dynamic Services
  selectedServices.forEach(sKey => {
    const service = SERVICE_MANIFEST[sKey];
    if (service && service.expose && !service.internal) {
      items.push({
        name: service.name,
        // logo: \`assets/tools/\${sKey}.png\`, // TODO: Add assets folder
        subtitle: service.description,
        tag: service.group,
        url: \`https://\${service.subdomain || sKey}.\${domain}\`,
                icon: getServiceIcon(sKey)
            });
        }
    });

    // Add new modules manual entries if selected (since they might not be in legacy map yet)
    if (selectedServices.has('kopia')) {
         items.push({ name: "Backup", subtitle: "Kopia UI", tag: "Admin", url: \`https://backup.\${domain}\`, icon: "fas fa-save" });
    }
    if (selectedServices.has('open-webui')) {
         items.push({ name: "JellyAI", subtitle: "Open WebUI", tag: "AI", url: \`https://ai.\${domain}\`, icon: "fas fa-brain" });
    }

    // Group by Tag
    const groups = {};
    items.forEach(item => {
        const groupName = item.tag || "Services";
        if (!groups[groupName]) groups[groupName] = [];
        groups[groupName].push(item);
    });

    let yaml = \`title: "Jellyserv Dashboard"
subtitle: "Homelab v6"
logo: "logo.png"
header: true
footer: '<p>Powered by <a href="https://github.com/BluuArtiis-FR/Jellyserv2026">Jellyserv v6</a></p>'

services:
\`;

    Object.keys(groups).forEach(groupName => {
        yaml += \`  - name: "\${groupName}"\\n    icon: "fas fa-code-branch"\\n    items:\\n\`;
        groups[groupName].forEach(item => {
            yaml += \`      - name: "\${item.name}"\\n        logo: "\${item.icon}"\\n        subtitle: "\${item.subtitle}"\\n        tag: "\${item.tag}"\\n        url: "\${item.url}"\\n\`;
        });
    });

    return yaml;
};

export const generateV6Package = async (selectedServices, configValues) => {
  const zip = new JSZip();

  // 1. ADD STATIC MODULES
  zip.file('core/compose.yaml', TEMPLATES['core/compose.yaml']);
  zip.file('core/authentik/compose.yaml', TEMPLATES['core/authentik/compose.yaml']);
  zip.file('core/config/dynamic.yml', TEMPLATES['core/config/dynamic.yml']);

  // 2. DYNAMICALLY ADD SELECTED MODULES & NEW FEATURES
  let includes = "";
  
  const hasMedia = Array.from(selectedServices).some(s => ['jellyfin', 'plex', 'emby'].includes(s));
  const hasAI = Array.from(selectedServices).some(s => ['ollama', 'open-webui'].includes(s));
  
  // Dashboard is ALWAYS included in v6
  zip.file('apps/dashboard/compose.yaml', TEMPLATES['apps/dashboard/compose.yaml']);
  includes += \`  - path: apps/dashboard/compose.yaml
    env_file: .env
    project_directory: .\\n\`;
  
  // Generate Homer Config
  const homerConfig = generateHomerConfig(selectedServices, configValues.DOMAIN);
  zip.file('apps/dashboard/assets/config.yml', homerConfig);

  // Backup Module (Proposed feature, assumed always available or toggleable)
  // For now let's add it if user selects 'kopia' (we need to add kopia to manifest later, or just auto-include)
  // Let's assume we include it by default for "Premium" experience
  // Assuming 'kopia' service key exists or strictly adding it
  zip.file('apps/backup/compose.yaml', TEMPLATES['apps/backup/compose.yaml']);
  includes += \`  - path: apps/backup/compose.yaml
    env_file: .env
    project_directory: .\\n\`;

  // Observability
  zip.file('apps/observability/compose.yaml', TEMPLATES['apps/observability/compose.yaml']);
  includes += \`  - path: apps/observability/compose.yaml
    env_file: .env
    project_directory: .\\n\`;

  if (hasMedia) {
    zip.file('apps/media/compose.yaml', TEMPLATES['apps/media/compose.yaml']);
    includes += \`  - path: apps/media/compose.yaml
    env_file: .env
    project_directory: .\\n\`;
  }

  if (hasAI) {
    zip.file('apps/ai/compose.yaml', TEMPLATES['apps/ai/compose.yaml']);
    includes += \`  - path: apps/ai/compose.yaml
    env_file: .env
    project_directory: .\\n\`;
  }
  
  // Update Root Compose
  const rootCompose = TEMPLATE_ROOT.replace('__INCLUDES__', includes);
  zip.file('docker-compose.yml', rootCompose);

  // 3. GENERATE ENV FILE
  let envContent = \`# JELLYSERV v6 ENV\\nDOMAIN=\${configValues.DOMAIN}\\nACME_EMAIL=\${configValues.ACME_EMAIL}\\n\`;
  envContent += \`AUTHENTIK_SECRET_KEY=\${configValues.AUTHENTIK_SECRET_KEY || 'generate_me'}\\n\`;
  envContent += \`AUTHENTIK_PG_PASS=\${configValues.AUTHENTIK_PG_PASS || 'secret'}\\n\`;
  envContent += \`BACKUP_ENCRYPTION_PASS=\${configValues.BACKUP_ENCRYPTION_PASS || 'change_me_fast'}\\n\`;
  envContent += \`BACKUP_UI_PASS=\${configValues.BACKUP_UI_PASS || 'admin'}\\n\`;
  envContent += \`MEDIA_ROOT=\${configValues.MEDIA_PATH || './media'}\\n\`;
  envContent += \`DATA_ROOT=\${configValues.DATA_PATH || './data'}\\n\`;
  
  zip.file('.env', envContent);

  return zip;
};
