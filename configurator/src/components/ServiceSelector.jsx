import { useState } from 'react';
import { useConfig } from '../hooks/useConfig';
import { SERVICE_GROUPS } from '../services';
import { ChevronDown, ChevronUp, Check, LayoutGrid } from 'lucide-react';
import clsx from 'clsx';

const ServiceSelector = () => {
  const { servicesByGroup, selectedServices, updateSelection } = useConfig();
  const [openGroups, setOpenGroups] = useState(() => {
    // Open the first group by default
    const firstGroupKey = Object.keys(servicesByGroup)[0];
    return firstGroupKey ? { [firstGroupKey]: true } : {};
  });

  const toggleGroup = (groupKey) => {
    setOpenGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  const handleSelectAll = (groupKey, servicesInGroup, isChecked) => {
    const serviceKeysInGroup = new Set(servicesInGroup.map(s => s.key));
    updateSelection(serviceKeysInGroup, isChecked);
  };

  const handleServiceChange = (serviceKey, isChecked) => {
    updateSelection(new Set([serviceKey]), isChecked);
  };

  return (
    <section className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <LayoutGrid className="w-6 h-6 text-blue-600" />
            Catalogue de Services
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Sélectionnez les applications pour votre Homelab.</p>
        </div>
      </div>

      {Object.entries(servicesByGroup).map(([groupKey, services]) => {
        if (services.length === 0) return null;

        const selectedCount = services.filter(s => selectedServices.has(s.key)).length;
        const isAllSelected = selectedCount === services.length;
        const isOpen = openGroups[groupKey];

        return (
          <div
            key={groupKey}
            className={`
                bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border rounded-xl shadow-sm transition-all duration-300
                ${isOpen ? 'border-blue-200 dark:border-blue-900 ring-1 ring-blue-100 dark:ring-blue-900/50' : 'border-slate-200 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-900'}
            `}
          >
            <header
              className="flex items-center justify-between p-4 cursor-pointer select-none"
              onClick={() => toggleGroup(groupKey)}
            >
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${selectedCount > 0 ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                  {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">
                    {SERVICE_GROUPS[groupKey] || groupKey}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {services.length} services disponibles
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {selectedCount > 0 && (
                  <span className="flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full">
                    <Check className="w-4 h-4" />
                    {selectedCount}
                  </span>
                )}

                <div
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    id={`select-all-${groupKey}`}
                    className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-slate-700 cursor-pointer"
                    checked={isAllSelected}
                    onChange={(e) => handleSelectAll(groupKey, services, e.target.checked)}
                  />
                  <label htmlFor={`select-all-${groupKey}`} className="text-sm font-medium text-slate-600 dark:text-slate-400 cursor-pointer">
                    Tout
                  </label>
                </div>
              </div>
            </header>

            <Collapse in={isOpen}>
              <div className="p-4 pt-0 border-t border-slate-100 dark:border-slate-800/50">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                  {services.map(service => {
                    const isSelected = selectedServices.has(service.key);
                    return (
                      <div
                        key={service.key}
                        className={`
                                relative flex items-start p-3 rounded-lg border transition-all duration-200 cursor-pointer
                                ${isSelected
                            ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-900'
                            : 'bg-white dark:bg-slate-800/50 border-slate-100 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800'}
                            `}
                        onClick={() => handleServiceChange(service.key, !isSelected)}
                      >
                        <div className="flex items-center h-5 mt-0.5">
                          <input
                            type="checkbox"
                            id={`service-${service.key}`}
                            className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-slate-700 cursor-pointer"
                            checked={isSelected}
                            onChange={(e) => {
                              e.stopPropagation(); // prevent double trigger
                              handleServiceChange(service.key, e.target.checked);
                            }}
                          />
                        </div>
                        <div className="ml-3 select-none">
                          <label htmlFor={`service-${service.key}`} className={`font-medium cursor-pointer ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'}`}>
                            {service.name}
                          </label>
                          <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5 leading-relaxed">
                            {service.description}
                          </p>
                          {service.doc_url && (
                            <a
                              href={service.doc_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-[10px] text-slate-400 hover:text-blue-500 hover:underline mt-1 inline-block transition-colors"
                            >
                              Documentation →
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Collapse>
          </div>
        );
      })}
    </section>
  );
};

// A simple Collapse component for smooth transitions
const Collapse = ({ in: inProp, children }) => {
  return (
    <div
      className={clsx('transition-all duration-300 ease-in-out overflow-hidden', {
        'grid-rows-[1fr] opacity-100': inProp,
        'grid-rows-[0fr] opacity-0': !inProp,
      })}
      style={{ display: 'grid' }}
    >
      <div className="min-h-0">{children}</div>
    </div>
  );
};

export default ServiceSelector;
