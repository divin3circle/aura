import React from "react";

const testimonials = [
  {
    image: "/spec1.avif",
    quote:
      "Authentic Korean skincare I couldn't find anywhere in Kenya — and at prices that actually beat the shops in town.",
    name: "Wanjiru M.",
    role: "Nairobi",
  },
  {
    image: "/spec3.avif",
    quote:
      "Ordered on a Monday, glowing by the weekend. Fast delivery and everything arrived exactly as pictured.",
    name: "Brian O.",
    role: "Mombasa",
  },
  {
    image: "/spec2.jpeg",
    quote:
      "Finally a plug for genuine Korean products. My skin has never looked better and my wallet is happy too.",
    name: "Aisha K.",
    role: "Kisumu",
  },
];

const OurSpecs = () => {
  return (
    <div className="aura-testimonials px-6 my-20 max-w-6xl mx-auto">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap');
        .aura-testimonials, .aura-testimonials * { font-family: 'Poppins', sans-serif; }
      `}</style>

      <div className="flex flex-col items-center text-center mb-12">
        <h2 className="text-2xl font-semibold text-slate-800">
          Loved by our customers
        </h2>
        <p className="max-w-lg text-sm text-slate-600 mt-2">
          Real glow, real savings — here's what shoppers across Kenya are saying
          about Aura.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-6">
        {testimonials.map((t, index) => (
          <div key={index} className="max-w-80 bg-black text-white rounded-2xl">
            <div className="relative -mt-px overflow-hidden rounded-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={t.image}
                alt={t.name}
                className="h-[270px] w-full rounded-2xl hover:scale-105 transition-all duration-300 object-cover object-top"
              />
              <div className="absolute bottom-0 z-10 h-60 w-full bg-gradient-to-t pointer-events-none from-black to-transparent"></div>
            </div>
            <div className="px-4 pb-4">
              <p className="font-medium border-b border-gray-600 pb-5">
                “{t.quote}”
              </p>
              <p className="mt-4">— {t.name}</p>
              <p className="text-sm font-medium text-gray-400">{t.role}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OurSpecs;
