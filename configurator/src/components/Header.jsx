
import { useConfig } from '../hooks/useConfig';
import { Download, Github, BookOpen } from 'lucide-react';

const Header = () => {
  const { generatePackage, selectedServices } = useConfig();
  const serviceCount = selectedServices.size;

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white p-2 rounded-lg shadow-lg shadow-blue-500/20">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300">
                Jellyserv Configurator
              </h1>
              <p className="text-xs text-slate-500 font-medium">v5.5.0 • Edition 2026</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 mr-4">
              <a href="https://github.com/BluuArtiis-FR/Jellyserv2026"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                title="Voir sur GitHub">
                <Github className="w-5 h-5" />
              </a>
              <a href="https://github.com/BluuArtiis-FR/Jellyserv2026/blob/main/docs/SETUP_GUIDE.md"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                title="Documentation">
                <BookOpen className="w-5 h-5" />
              </a>
            </div>

            <button
              onClick={generatePackage}
              disabled={serviceCount === 0}
              className={`
                group relative flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold transition-all duration-300 shadow-md hover:shadow-xl
                ${serviceCount > 0
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white translate-y-0'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed translate-y-0 shadow-none'}
              `}
            >
              <Download className={`w-4 h-4 transition-transform duration-300 ${serviceCount > 0 ? 'group-hover:-translate-y-0.5' : ''}`} />
              <span>Télécharger</span>
              {serviceCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-indigo-500 text-[10px] items-center justify-center text-white font-bold border border-white">
                    {serviceCount}
                  </span>
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
