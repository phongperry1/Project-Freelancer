import React, { useEffect, useState, useRef, memo } from 'react';
import { useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import './routeTransitionLoader.css';

export const RouteTransitionLoader: React.FC = memo(() => {
  const location = useLocation();
  const [visible, setVisible] = useState<boolean>(false);
  const [fading, setFading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Avoid triggering on initial mount
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    setVisible(true);
    setFading(false);
    setProgress(35);

    const stepTimer = setTimeout(() => {
      setProgress(75);
    }, 120);

    const completeTimer = setTimeout(() => {
      setProgress(100);
      setFading(true);
    }, 280);

    const hideTimer = setTimeout(() => {
      setVisible(false);
      setProgress(0);
      setFading(false);
    }, 550);

    return () => {
      clearTimeout(stepTimer);
      clearTimeout(completeTimer);
      clearTimeout(hideTimer);
    };
  }, [location.pathname, location.search]);

  if (!visible) return null;

  return (
    <>
      <div className="tku-route-loader-bar-container" aria-hidden="true">
        <div
          className="tku-route-loader-bar"
          style={{
            width: `${progress}%`,
            opacity: fading ? 0 : 1,
          }}
        />
      </div>
      <div
        className={`tku-route-loader-pill ${fading ? 'tku-route-loader-pill--fading' : ''}`}
        role="status"
        aria-live="polite"
      >
        <Loader2 size={14} className="tku-route-loader-icon" />
        <span className="tku-route-loader-text">Đang chuyển trang...</span>
      </div>
    </>
  );
});

RouteTransitionLoader.displayName = 'RouteTransitionLoader';

export default RouteTransitionLoader;
