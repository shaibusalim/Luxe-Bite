import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import heroImage from '@/assets/hero-food.jpg';

const REMOTE_IMAGES = [
  'https://images.unsplash.com/photo-1604329760661-e71dc83f2d26?w=1600&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1600&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1600&q=80&auto=format&fit=crop',
];

const SLIDE_INTERVAL = 4500;

export const HeroSlider = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [images, setImages] = useState<string[]>([heroImage]);

  useEffect(() => {
    let disposed = false;
    const preload = async () => {
      const loaded: string[] = [heroImage];
      await Promise.all(
        REMOTE_IMAGES.map(
          (src) =>
            new Promise<void>((resolve) => {
              const img = new Image();
              img.onload = () => resolve(loaded.push(src) as unknown as void);
              img.onerror = () => resolve();
              img.src = src;
            }),
        ),
      );
      if (!disposed) setImages(loaded);
    };
    preload();
    return () => {
      disposed = true;
    };
  }, []);

  useEffect(() => {
    if (!images.length) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % images.length);
    }, SLIDE_INTERVAL);
    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {images.map((src, index) => (
        <motion.div
          key={index}
          className="absolute inset-0 bg-cover bg-center"
          initial={false}
          animate={{
            opacity: index === activeIndex ? 1 : 0,
            scale: index === activeIndex ? 1.1 : 1.05,
          }}
          transition={{
            opacity: { duration: 0.8, ease: 'easeInOut' },
            scale: { duration: 4, ease: 'easeOut' },
          }}
          style={{ backgroundImage: `url(${src})` }}
        />
      ))}
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
