import { createContext, useState, useMemo, useEffect } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { SERVICE_MANIFEST } from '../services';
import { generateV6Package } from '../utils/v6Generator';
import { generateOnboardingGuide } from '../utils/guideGenerator';
import { generateDockerComposeContent } from '../utils/dockerComposeGenerator'; // Still imported but used only for debug/legacy if needed

const ConfigContext = createContext();

const initialGlobalConfig = {
  DOMAIN: '',
  ACME_EMAIL: '',
  TZ: 'Europe/Paris',
  PUID: '1000',
  PGID: '1000',
  RESTART_POLICY: 'unless-stopped',
  PROJECT_BASE_DIR: '/opt/homelab',
};

const generateRandomString = (length = 32) => {
  const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

export const ConfigProvider = ({ children }) => {
  const [selectedServices, setSelectedServices] = useState(new Set());
  const [configValues, setConfigValues] = useState(initialGlobalConfig);
  const [pathMode, setPathMode] = useState('default'); // 'default' or 'custom'
  const [configMode, setConfigMode] = useState('simple'); // 'simple' or 'expert'

  const togglePathMode = () => {
    setPathMode(prev => (prev === 'default' ? 'custom' : 'default'));
  };

  const toggleConfigMode = () => {
    setConfigMode(prev => (prev === 'simple' ? 'expert' : 'simple'));
  };

  const defaultPaths = useMemo(() => {
    const baseDir = configValues.PROJECT_BASE_DIR || initialGlobalConfig.PROJECT_BASE_DIR;
    return {
      CONFIG_PATH: `${baseDir}/config`,
      DATA_PATH: `${baseDir}/data`,
      DOWNLOADS_PATH: `${baseDir}/downloads`,
      MEDIA_PATH: `${baseDir}/media`,
      UPLOAD_PATH: `${baseDir}/uploads`,
    };
  }, [configValues.PROJECT_BASE_DIR]);

  useEffect(() => {
    if (pathMode === 'default') {
      setConfigValues(prev => ({
        ...prev,
        ...defaultPaths
      }));
    }
  }, [defaultPaths, pathMode]);

  const getRequiredDependencies = (serviceKey, manifest) => {
    let deps = new Set();
    const toCheck = [serviceKey];
    const checked = new Set();
    while (toCheck.length > 0) {
      const currentKey = toCheck.pop();
      if (checked.has(currentKey)) continue;
      checked.add(currentKey);
      if (manifest[currentKey]?.dependencies) {
        for (const depKey of manifest[currentKey].dependencies) {
          if (!deps.has(depKey)) {
            deps.add(depKey);
            toCheck.push(depKey);
          }
        }
      }
    }
    return deps;
  };

  const updateSelection = (servicesToUpdate, isChecked) => {
    const newSelected = new Set(selectedServices);
    if (isChecked) {
      servicesToUpdate.forEach(key => {
        newSelected.add(key);
        getRequiredDependencies(key, SERVICE_MANIFEST).forEach(dep => newSelected.add(dep));
      });
    } else {
      const allDepsToKeep = new Set();
      newSelected.forEach(key => {
        if (!servicesToUpdate.has(key)) {
          getRequiredDependencies(key, SERVICE_MANIFEST).forEach(dep => allDepsToKeep.add(dep));
        }
      });
      servicesToUpdate.forEach(key => {
        newSelected.delete(key);
        const depsOfKey = getRequiredDependencies(key, SERVICE_MANIFEST);
        depsOfKey.forEach(depKey => {
          if (!allDepsToKeep.has(depKey)) {
            newSelected.delete(depKey);
          }
        });
      });
    }
    setSelectedServices(newSelected);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setConfigValues(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const setRandomValue = (fieldName) => {
    setConfigValues(prev => ({ ...prev, [fieldName]: generateRandomString() }));
  };

  // Apply a preset (select multiple services at once)
  const applyPreset = (services) => {
    if (services === 'all') {
      // Select all non-internal services
      const allServices = new Set();
      for (const serviceKey in SERVICE_MANIFEST) {
        if (!SERVICE_MANIFEST[serviceKey].internal) {
          allServices.add(serviceKey);
        }
      }
      setSelectedServices(allServices);
    } else if (Array.isArray(services)) {
      const newSelected = new Set();
      services.forEach(key => {
        if (SERVICE_MANIFEST[key]) {
          newSelected.add(key);
          getRequiredDependencies(key, SERVICE_MANIFEST).forEach(dep => newSelected.add(dep));
        }
      });
      setSelectedServices(newSelected);
    }
  };

  useEffect(() => {
    const newValues = {};
    let needsUpdate = false;
    selectedServices.forEach(sKey => {
      const service = SERVICE_MANIFEST[sKey];
      if (service?.env_vars) {
        service.env_vars.forEach(envVar => {
          const varName = envVar.link_to || envVar.name;

          // Auto-generate random values
          if (envVar.generator && !configValues[varName]) {
            newValues[varName] = generateRandomString();
            needsUpdate = true;
          }
          // Set defaults
          if (envVar.default !== undefined && configValues[varName] === undefined) {
            newValues[varName] = envVar.default;
            needsUpdate = true;
          }
        });
      }
      if (service?.expose) {
        const exposeKey = `${sKey}_expose_traefik`;
        if (configValues[exposeKey] === undefined) {
          newValues[exposeKey] = service.expose_traefik !== undefined ? service.expose_traefik : true;
          needsUpdate = true;
        }
        const subdomainKey = `${sKey}_custom_subdomain`;
        if (configValues[subdomainKey] === undefined) {
          newValues[subdomainKey] = service.custom_subdomain || '';
          needsUpdate = true;
        }
      }
    });

    const currentConfigKeys = Object.keys(configValues);
    for (const key of currentConfigKeys) {
      if (key.endsWith('_expose_traefik') || key.endsWith('_custom_subdomain')) {
        const sKey = key.split('_')[0];
        if (!selectedServices.has(sKey)) {
          delete configValues[key];
          needsUpdate = true;
        }
      }
    }

    if (needsUpdate) {
      setConfigValues(prev => ({ ...prev, ...newValues }));
    }
  }, [selectedServices]);

  const generatePackage = async () => {
    // Basic validation
    if (!configValues.DOMAIN && configMode === 'simple') {
      alert("Veuillez remplir au moins le nom de domaine.");
      return;
    }

    try {
      // --- V6 GENERATION ---
      const zip = await generateV6Package(selectedServices, configValues);

      // Add Onboarding Guide
      const onboardingHtml = generateOnboardingGuide(selectedServices, configValues);
      zip.file('onboarding.html', onboardingHtml);

      // README V6
      zip.file('README.txt', `JELLYSERV v6 - ARCHITECTURE MODULAIRE 2026
===============================================
Félicitations ! Vous avez généré une configuration "Clean Slate" modulaire.

STRUCTURE DU PACKAGE :
/
├── core/             -> Infrastructure (Traefik v3, Authentik, SocketProxy)
├── apps/             -> Modules applicatifs (Media, Downloads, AI)
├── docker-compose.yml -> Point d'entrée unique (utilise 'include')
├── .env              -> Vos variables (Secrets générés)
└── onboarding.html   -> Guide de démarrage interactif

INSTALLATION :
1. Extrayez tout le contenu sur votre serveur (ex: /opt/homelab).
2. Vérifiez le fichier .env (si besoin).
3. Lancez la stack :
   docker compose up -d

ACCES :
- Dashboard Traefik : https://traefik.${configValues.DOMAIN || 'localhost'}
- Authentik : https://auth.${configValues.DOMAIN || 'localhost'}

Documentation : https://github.com/BluuArtiis-FR/Jellyserv2026
`);

      // Helper Scripts
      zip.file('start.sh', "#!/bin/bash\ndocker compose up -d\n", { unixPermissions: 0o755 });
      zip.file('stop.sh', "#!/bin/bash\ndocker compose down\n", { unixPermissions: 0o755 });

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'jellyserv-v6-setup.zip');

    } catch (error) {
      console.error("Erreur lors de la génération du package v6 :", error);
      alert("Une erreur est survenue lors de la génération. Consultez la console.");
    }
  };

  const value = {
    selectedServices,
    configValues,
    pathMode,
    togglePathMode,
    configMode,
    toggleConfigMode,
    defaultPaths,
    servicesByGroup: useMemo(() => {
      const groups = {};
      for (const serviceKey in SERVICE_MANIFEST) {
        const service = SERVICE_MANIFEST[serviceKey];
        if (!service.internal) {
          if (!groups[service.group]) {
            groups[service.group] = [];
          }
          groups[service.group].push({ key: serviceKey, ...service });
        }
      }
      return groups;
    }, []),
    updateSelection,
    handleInputChange,
    setRandomValue,
    generatePackage,
    applyPreset
  };

  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  );
};

export default ConfigContext;
