import { useState } from 'react';
import TabPanel from './TabPanel';
import featuresData from '../data/featuresData';
import useScrollAnimation from '../hooks/useScrollAnimation';

/**
 * FeaturesSection Component
 *
 * Displays the features section with tabbed navigation and feature cards.
 * Integrates TabbedNavigation with TabPanel components to show different
 * feature categories.
 *
 * Features:
 * - Tabbed navigation for feature categories
 * - Tab panels with feature cards
 * - Smooth content switching with fade transitions
 * - Keyboard accessible
 * - Scroll-based animation on viewport entry
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1
 */
const FeaturesSection = () => {
  const [activeTab, setActiveTab] = useState('job-matching');
  const { ref: sectionRef, isVisible } = useScrollAnimation({ threshold: 0.1 });

  const tabs = [
    { id: 'job-matching', label: 'Job Matching' },
    { id: 'application-tracking', label: 'Application Tracking' },
    { id: 'profile-management', label: 'Profile Management' }
  ];

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
  };

  const handleKeyDown = (e, tabId, index) => {
    let newIndex = index;

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        handleTabClick(tabId);
        break;

      case 'ArrowLeft':
        e.preventDefault();
        newIndex = index > 0 ? index - 1 : tabs.length - 1;
        break;

      case 'ArrowRight':
        e.preventDefault();
        newIndex = index < tabs.length - 1 ? index + 1 : 0;
        break;

      case 'Home':
        e.preventDefault();
        newIndex = 0;
        break;

      case 'End':
        e.preventDefault();
        newIndex = tabs.length - 1;
        break;

      default:
        return;
    }

    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Home' || e.key === 'End') {
      const newTabId = tabs[newIndex].id;
      handleTabClick(newTabId);
      document.getElementById(`tab-${newTabId}`)?.focus();
    }
  };

  return (
    <section
      ref={sectionRef}
      className={`features-section py-20 px-8 min-h-[600px] animate-on-scroll ${isVisible ? 'animate-in' : ''} lg:py-[60px] lg:px-6 md:py-[60px] md:px-4`}
      style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
      aria-labelledby="features-heading"
    >
      {/* Container */}
      <div className="max-w-[1200px] mx-auto">

        {/* Heading */}
        <h2
          id="features-heading"
          className="text-[2.5rem] font-bold text-white text-center mb-12 lg:text-[2rem] lg:mb-10 md:text-[1.75rem] md:mb-8"
        >
          Powerful Features to Accelerate Your Job Search
        </h2>

        {/* Tab List */}
        <div
          role="tablist"
          aria-label="Feature categories"
          className="flex border-b-2 border-white/10 mb-8 overflow-x-auto [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.2)_transparent] [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-sm md:mb-6"
        >
          {tabs.map((tab, index) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                role="tab"
                aria-selected={isActive}
                aria-controls={`tabpanel-${tab.id}`}
                tabIndex={isActive ? 0 : -1}
                className={[
                  'flex-1 min-w-[180px] px-6 py-4 bg-transparent border-none border-b-[3px] text-base font-medium cursor-pointer transition-all duration-300 relative whitespace-nowrap',
                  'focus:outline-[2px] focus:outline-[#4a90e2] focus:outline-offset-[-2px] focus:z-[1]',
                  'focus-visible:outline-[2px] focus-visible:outline-[#4a90e2] focus-visible:outline-offset-[-2px]',
                  isActive
                    ? 'features-tab-active text-white border-b-[#4a90e2] bg-[rgba(74,144,226,0.1)]'
                    : 'text-[rgba(57, 218, 240, 0)] border-b-transparent hover:text-white/90 hover:bg-white/5',
                  'lg:min-w-[150px] lg:px-5 lg:py-3.5 lg:text-[0.95rem]',
                  'md:min-w-[140px] md:px-4 md:py-3.5 md:text-[0.9rem]',
                ].join(' ')}
                onClick={() => handleTabClick(tab.id)}
                onKeyDown={(e) => handleKeyDown(e, tab.id, index)}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Panels */}
        <div className="features-tab-panels mt-8 md:mt-6">
          {tabs.map((tab) => (
            <TabPanel
              key={tab.id}
              id={`tabpanel-${tab.id}`}
              tabId={`tab-${tab.id}`}
              isActive={activeTab === tab.id}
              features={featuresData[tab.id].items}
              title={featuresData[tab.id].title}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
