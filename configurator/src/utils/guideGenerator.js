
import { SERVICE_MANIFEST } from '../services';

export const generateOnboardingGuide = (selectedServices, configValues) => {
  const domain = configValues.DOMAIN || 'example.com';
  const services = Array.from(selectedServices).map(id => SERVICE_MANIFEST[id]).filter(s => s && s.expose);

  const css = `
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; max-width: 900px; margin: 0 auto; padding: 2rem; color: #333; }
    h1 { color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 0.5rem; }
    h2 { margin-top: 2rem; color: #1e40af; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1.5rem; margin-bottom: 1rem; }
    .service-link { display: inline-block; background: #2563eb; color: white; padding: 0.5rem 1rem; text-decoration: none; border-radius: 4px; margin-top: 0.5rem; }
    .service-link:hover { background: #1d4ed8; }
    code { background: #eff6ff; padding: 0.2rem 0.4rem; border-radius: 4px; font-family: monospace; color: #1e40af; }
    .warning { background: #fff7ed; border-left: 4px solid #f97316; padding: 1rem; margin: 1rem 0; }
    .step { margin-bottom: 1.5rem; }
    .step-number { background: #2563eb; color: white; border-radius: 50%; width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; margin-right: 0.5rem; font-size: 0.9rem; }
    .copy-btn { margin-left: 0.5rem; cursor: pointer; border: 1px solid #ccc; background: white; border-radius: 4px; padding: 0.2rem 0.5rem; font-size: 0.8rem; }
  `;

  let html = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Guide de Démarrage - Jellyserv2026</title>
    <style>${css}</style>
</head>
<body>
    <h1>🚀 Votre Serveur est Prêt !</h1>
    <p>Félicitations pour la configuration de votre Homelab. Voici votre guide personnalisé pour finaliser l'installation.</p>

    <div class="warning">
        <strong>⚠️ IMPORTANT :</strong> Ce fichier contient des informations sensibles. Ne le partagez pas.
    </div>

    <h2>1. Installation</h2>
    <div class="step">
        <span class="step-number">1</span>
        Copiez les fichiers <code>docker-compose.yml</code> et <code>.env</code> dans un dossier sur votre serveur.
    </div>
    <div class="step">
        <span class="step-number">2</span>
        Ouvrez un terminal dans ce dossier et lancez la commande :
        <pre style="background: #1e293b; color: #e2e8f0; padding: 1rem; border-radius: 8px;">docker compose up -d</pre>
    </div>

    <h2>2. Accès à vos Services</h2>
    <p>Une fois les conteneurs démarrés (attendez quelques minutes), vos services seront accessibles aux adresses suivantes :</p>

    ${services.map(s => {
        const url = `https://${s.subdomain || s.name.toLowerCase()}.${domain}`;
        return `
        <div class="card">
            <h3>${s.name}</h3>
            <p>${s.description}</p>
            <div><strong>URL :</strong> <a href="${url}" target="_blank">${url}</a></div>
            ${s.port ? `<div><strong>Port Local :</strong> <code>localhost:${s.port}</code></div>` : ''}
            <a href="${url}" target="_blank" class="service-link">Ouvrir ${s.name}</a>
        </div>
        `;
    }).join('')}

    <h2>3. Prochaines Étapes Critiques</h2>
`;

  // Dynamic Specific Guides
  if (selectedServices.has('prowlarr')) {
      html += `
    <div class="card">
        <h3>Configuration Prowlarr</h3>
        <ol>
            <li>Ouvrez Prowlarr et créez votre compte admin.</li>
            <li>Allez dans <strong>Settings > Indexers > Proxy</strong> et ajoutez FlareSolverr (URL: <code>http://flaresolverr:8191</code>).</li>
            <li>Ajoutez vos indexeurs préférés.</li>
        </ol>
    </div>`;
  }

  if (selectedServices.has('sonarr') || selectedServices.has('radarr')) {
     html += `
    <div class="card">
        <h3>Connexion ${selectedServices.has('sonarr') ? 'Sonarr' : ''} ${selectedServices.has('radarr') ? '/ Radarr' : ''}</h3>
        <p>Dans Prowlarr, allez dans <strong>Settings > Apps</strong> et ajoutez vos applications :</p>
        <ul>
            <li><strong>Prowlarr Server :</strong> <code>http://prowlarr:9696</code></li>
            <li><strong>Sonarr Server :</strong> <code>http://sonarr:8989</code></li>
            <li><strong>Radarr Server :</strong> <code>http://radarr:7878</code></li>
        </ul>
        <p>Récupérez les clés API dans <em>Settings > General</em> de chaque application.</p>
    </div>`;
  }

  html += `
    <h2>4. Commandes Utiles</h2>
    <ul>
        <li>Voir les logs : <code>docker compose logs -f [service]</code></li>
        <li>Mettre à jour : <code>docker compose pull && docker compose up -d</code></li>
        <li>Arrêter : <code>docker compose down</code></li>
    </ul>

    <footer style="margin-top: 3rem; text-align: center; color: #64748b; font-size: 0.9rem;">
        Généré par Jellyserv2026 Configurator
    </footer>
</body>
</html>
  `;

  return html;
};
