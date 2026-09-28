import React, { useEffect } from 'react';
import { Navbar } from '../../components/common/Navbar';
import { Footer } from '../../components/common/Footer';
import { HeroSection } from './components/HeroSection';
import { FeaturesSection } from './components/FeaturesSection';
import { CoursesSection } from './components/CoursesSection';
import { AiAssistantSection } from './components/AiAssistantSection';
import './landing.css';

export const LandingPage: React.FC = () => {
  useEffect(() => {
    document.title = 'TKU - Nền tảng học tập hiện đại';
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="tku-app">
      <Navbar />

      <main>
        <HeroSection />
        <FeaturesSection />
        <CoursesSection />
        <AiAssistantSection />
      </main>

      <Footer />
    </div>
  );
};

export default LandingPage;
