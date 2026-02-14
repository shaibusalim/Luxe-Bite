import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import heroImage from '@/assets/hero-food.jpg';

const HERO_IMAGES = [
  heroImage,
  'https://images.unsplash.com/photo-1604329760661-e71dc83f2d26?w=1200&q=80',
  'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200&q=80',
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1200&q=80',
];

const SLIDE_INTERVAL = 4500;

export const HeroSlider = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % HERO_IMAGES.length);
    }, SLIDE_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <AnimatePresence mode="wait" initial={false}>
        {HERO_IMAGES.map((src, index) =>
          index === activeIndex ? (
            <motion.div
              key={index}
              className="absolute inset-0 bg-cover bg-center"
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1.1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{
                opacity: { duration: 0.8, ease: 'easeInOut' },
                scale: { duration: 4, ease: 'easeOut' },
              }}
              style={{ backgroundImage: `url(${src})` }}
            />
          ) : null
        )}
      </AnimatePresence>
      {/* Dark gradient overlay for text readability */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, rgba(20,15,15,0.85) 0%, rgba(20,15,15,0.65) 45%, rgba(20,15,15,0.45) 100%)',
        }}
      />
    </div>
  );
};
