import React, { useEffect } from 'react';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { HeroSection } from './components/landing/HeroSection';
import { FeaturesSection } from './components/landing/FeaturesSection';
import { CoursesSection } from './components/landing/CoursesSection';
import { AiAssistantSection } from './components/landing/AiAssistantSection';

export const App: React.FC = () => {
  useEffect(() => {
    // Đảm bảo khi mới vào hoặc tải lại trang, luôn hiển thị ở vị trí đầu trang (Hero)
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="tku-app">
      {/* Sticky Header Navigation */}
      <Navbar />

      {/* Main Landing Page Content */}
      <main>
        <HeroSection />
        <FeaturesSection />
        <CoursesSection />
        <AiAssistantSection />
      </main>

      {/* Dark Navy Footer */}
      <Footer />
    </div>
  );
};

export default App;