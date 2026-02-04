import { useConfig } from '../hooks/useConfig';
import Header from '../components/Header';
import ServiceSelector from '../components/ServiceSelector';
import ConfigurationSections from '../components/ConfigurationSections';
import { Loader2 } from 'lucide-react';

const ConfigurationPage = () => {
  const { servicesByGroup } = useConfig();

  if (!servicesByGroup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <ServiceSelector />
        <ConfigurationSections />
      </main>
      <footer className="text-center py-6 text-sm text-slate-500 dark:text-slate-400">
        <p>Homelab Media Server v5.0.0 - <a href="https://github.com/BluuArtiis-FR/Jellyserv2026" className="text-blue-600 dark:text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">GitHub</a></p>
      </footer>
    </div>
  );
};

export default ConfigurationPage;
