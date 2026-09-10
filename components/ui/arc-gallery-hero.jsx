'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

// Arc gallery hero — a fan of images curving above a headline + CTAs.
// Light-mode only (no dark: variants). Text and buttons are configurable.
export const ArcGalleryHero = ({
  images,
  title = 'Rediscover your glow',
  subtitle = 'Authentic Korean beauty, delivered.',
  primaryLabel = 'Shop now',
  primaryHref = '/shop',
  secondaryLabel = 'How it works',
  secondaryHref = '/about',
  startAngle = 20,
  endAngle = 160,
  radiusLg = 480,
  radiusMd = 360,
  radiusSm = 260,
  cardSizeLg = 120,
  cardSizeMd = 100,
  cardSizeSm = 80,
  className = '',
}) => {
  const [dimensions, setDimensions] = useState({
    radius: radiusLg,
    cardSize: cardSizeLg,
  });

  // Responsive resizing of the arc and cards.
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setDimensions({ radius: radiusSm, cardSize: cardSizeSm });
      } else if (width < 1024) {
        setDimensions({ radius: radiusMd, cardSize: cardSizeMd });
      } else {
        setDimensions({ radius: radiusLg, cardSize: cardSizeLg });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [radiusLg, radiusMd, radiusSm, cardSizeLg, cardSizeMd, cardSizeSm]);

  const count = Math.max(images.length, 2);
  const step = (endAngle - startAngle) / (count - 1);

  return (
    <section
      className={`relative overflow-hidden bg-white text-gray-900 min-h-screen flex flex-col ${className}`}
    >
      {/* Background ring container that controls geometry */}
      <div
        className="relative mx-auto"
        style={{ width: '100%', height: dimensions.radius * 1.2 }}
      >
        {/* Center pivot at bottom center */}
        <div className="absolute left-1/2 bottom-0 -translate-x-1/2">
          {images.map((src, i) => {
            const angle = startAngle + step * i;
            const angleRad = (angle * Math.PI) / 180;
            const x = Math.cos(angleRad) * dimensions.radius;
            const y = Math.sin(angleRad) * dimensions.radius;

            return (
              <div
                key={i}
                className="absolute opacity-0 animate-fade-in-up"
                style={{
                  width: dimensions.cardSize,
                  height: dimensions.cardSize,
                  left: `calc(50% + ${x}px)`,
                  bottom: `${y}px`,
                  transform: `translate(-50%, 50%)`,
                  animationDelay: `${i * 100}ms`,
                  animationFillMode: 'forwards',
                  zIndex: count - i,
                }}
              >
                <div
                  className="rounded-2xl shadow-xl overflow-hidden ring-1 ring-gray-200 bg-white transition-transform hover:scale-105 w-full h-full"
                  style={{ transform: `rotate(${angle / 4}deg)` }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={`Product ${i + 1}`}
                    className="block w-full h-full object-cover"
                    draggable={false}
                    onError={(e) => {
                      e.target.src =
                        'https://cdn.21st.dev/assets/mirror/43/43787263c53801c9064e1f3209488a5f4bd83986c0bb01223176c57bb99f959b.svg';
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Content below the arc */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-6 -mt-40 md:-mt-52 lg:-mt-64">
        <div
          className="text-center max-w-2xl px-6 opacity-0 animate-fade-in"
          style={{ animationDelay: '800ms', animationFillMode: 'forwards' }}
        >
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900">
            {title}
          </h1>
          <p className="mt-4 text-lg text-gray-600">{subtitle}</p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={primaryHref}
              className="w-full sm:w-auto px-6 py-3 rounded-full bg-slate-800 text-white hover:bg-slate-900 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {primaryLabel}
            </Link>
            <Link
              href={secondaryHref}
              className="w-full sm:w-auto px-6 py-3 rounded-full border border-gray-300 hover:bg-gray-100 transition-all duration-200"
            >
              {secondaryLabel}
            </Link>
          </div>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translate(-50%, 60%); }
          to { opacity: 1; transform: translate(-50%, 50%); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation-name: fade-in-up;
          animation-duration: 0.8s;
          animation-timing-function: ease-out;
        }
        .animate-fade-in {
          animation-name: fade-in;
          animation-duration: 0.8s;
          animation-timing-function: ease-out;
        }
      `}</style>
    </section>
  );
};
