import React from 'react';

export const Header: React.FC = () => {
  return (
    <div className="relative w-full max-w-7xl mx-auto pt-7 pb-4 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Subtle Moon Crescent Artwork on Top Right */}
      <div className="absolute right-4 -top-12 w-96 h-96 pointer-events-none select-none opacity-30 lg:opacity-60 overflow-hidden">
        <div
          className="w-full h-full rounded-full bg-cover bg-center mix-blend-multiply"
          style={{
            backgroundImage:
              'url("https://images.unsplash.com/photo-1532693322450-2cb5c511067d?auto=format&fit=crop&w=800&q=80")',
            maskImage: 'radial-gradient(circle at 60% 40%, black 30%, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(circle at 60% 40%, black 30%, transparent 75%)',
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
        {/* Left: Main Titles */}
        <div>
          <span className="text-[11px] font-bold tracking-[0.2em] text-slate-500 uppercase block mb-1.5">
            FROM IMAGES TO INSIGHTS
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold tracking-tight text-slate-900 leading-none">
            Chandra<span className="text-[#2563EB]">Match</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-600 font-normal mt-2.5 max-w-2xl">
            Multi-modal Lunar Image Registration using OHRC, TMC-2 and IIRS
          </p>
        </div>

        {/* Right: Hackathon & ISRO badges + Slogan */}
        <div className="flex flex-col items-start md:items-end text-left md:text-right shrink-0">
          <div className="flex items-center gap-4 mb-4">
            <span className="text-[11px] font-bold tracking-wider text-slate-600 uppercase">
              SMART INDIA HACKATHON 2026
            </span>

            {/* ISRO Badge Logo */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-lg shadow-2xs border border-slate-200">
              {/* ISRO Vector Emblem */}
              <div className="relative w-5 h-5 flex items-center justify-center">
                {/* Orange upward trajectory flare */}
                <div className="w-3.5 h-3.5 border-t-2 border-r-2 border-[#FF671F] rotate-45 transform" />
                <div className="w-1.5 h-1.5 bg-[#0047AB] rounded-full absolute" />
              </div>
              <div className="flex flex-col text-left leading-none">
                <span className="text-[9px] font-bold text-[#FF671F] tracking-tighter">इसरो</span>
                <span className="text-[9px] font-extrabold text-[#0047AB] tracking-tight">isro</span>
              </div>
            </div>
          </div>

          {/* Slogan */}
          <div className="space-y-0.5 text-[11px] font-bold tracking-widest text-slate-500 uppercase">
            <p>SAME MOON</p>
            <p>DIFFERENT PERSPECTIVES</p>
            <p>ONE ALIGNMENT</p>
          </div>
          <div className="w-8 h-0.5 bg-[#2563EB] rounded-full mt-2 self-start md:self-end" />
        </div>
      </div>
    </div>
  );
};
