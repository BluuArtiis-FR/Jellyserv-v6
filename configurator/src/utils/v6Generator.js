import JSZip from 'jszip';

// ============================================================================
// TEMPLATES YAML (Inlined for simplicity in browser environment)
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
`;

const TEMPLATES = {
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

    'core/config/dynamic.yml': `http:
  middlewares:
    auth:
      forwardAuth:
        address: "http://authentik-server:9000/outpost.goauthentik.io/auth/traefik"
        trustForwardHeader: true
        authResponseHeaders:
          - X-authentik-username`
};

export const generateV6Package = async (selectedServices, configValues) => {
    const zip = new JSZip();

    // 1. ADD STATIC MODULES
    zip.file('core/compose.yaml', TEMPLATES['core/compose.yaml']);
    zip.file('core/authentik/compose.yaml', TEMPLATES['core/authentik/compose.yaml']);
    zip.file('core/config/dynamic.yml', TEMPLATES['core/config/dynamic.yml']);

    // 2. DYNAMICALLY ADD SELECTED MODULES
    let includes = "";

    // Logic to determine which modules to enable based on selectedServices
    const hasMedia = Array.from(selectedServices).some(s => ['jellyfin', 'plex', 'emby'].includes(s));
    const hasAI = Array.from(selectedServices).some(s => ['ollama', 'open-webui'].includes(s));

    // NOTE: Simple check for now, later we can have granular checks
    if (hasMedia) {
        zip.file('apps/media/compose.yaml', TEMPLATES['apps/media/compose.yaml']);
        includes += `  - path: apps/media/compose.yaml
    env_file: .env
    project_directory: .
`;
    }

    if (hasAI) {
        zip.file('apps/ai/compose.yaml', TEMPLATES['apps/ai/compose.yaml']);
        includes += `  - path: apps/ai/compose.yaml
    env_file: .env
    project_directory: .
`;
    }

    // Update Root Compose
    const rootCompose = TEMPLATE_ROOT.replace('__INCLUDES__', includes);
    zip.file('docker-compose.yml', rootCompose);

    // 3. GENERATE ENV FILE
    let envContent = `# JELLYSERV v6 ENV\nDOMAIN=${configValues.DOMAIN}\nACME_EMAIL=${configValues.ACME_EMAIL}\n`;
    envContent += `AUTHENTIK_SECRET_KEY=${configValues.AUTHENTIK_SECRET_KEY || 'generate_me'}\n`;
    envContent += `AUTHENTIK_PG_PASS=${configValues.AUTHENTIK_PG_PASS || 'secret'}\n`;
    envContent += `MEDIA_ROOT=${configValues.MEDIA_PATH || './media'}\n`;

    zip.file('.env', envContent);

    return zip;
};
