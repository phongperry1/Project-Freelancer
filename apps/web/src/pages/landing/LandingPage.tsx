import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Footer } from '../../components/common/Footer';
import { Navbar } from '../../components/common/Navbar';
import { useAuth } from '../../context/useAuth';
import { AiAssistantSection } from './components/AiAssistantSection';
import { CoursesSection } from './components/CoursesSection';
import { FeaturesSection } from './components/FeaturesSection';
import { HeroSection } from './components/HeroSection';
import './landing.css';

export const LandingPage: React.FC = () => {
  const { user, token } = useAuth();

  useEffect(() => {
    document.title = 'TKU - Nền tảng học tập hiện đại';
    window.scrollTo(0, 0);
  }, []);

  if (token && user?.role === 'ADMIN') {
    return <Navigate to="/admin" replace />;
  }

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
