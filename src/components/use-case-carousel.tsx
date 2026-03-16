'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface UseCase {
  role: string;
  pain: string;
  solution: string;
}

const useCases: UseCase[] = [
  {
    role: 'Customer Success Teams',
    pain: "You record Loom walkthroughs for customers all day — but those videos aren't searchable or reusable.",
    solution: 'Turn every Loom into a help center article automatically.',
  },
  {
    role: 'Technical Writers',
    pain: 'Your backlog is full of "we recorded a video of this, can you write the article?" requests.',
    solution: 'Convert the video backlog into structured articles in minutes, not days.',
  },
  {
    role: 'Product Teams',
    pain: 'You demo features in meetings but never find time to write the release notes or docs.',
    solution: 'Paste the meeting recording URL and get a feature article ready to publish.',
  },
  {
    role: 'Ops Teams',
    pain: "Runbooks and SOPs live in people's heads or scattered recordings. Onboarding takes forever.",
    solution: 'Convert process walkthroughs into clear, step-by-step operational docs your team can follow.',
  },
  {
    role: 'Agencies & Consultants',
    pain: 'You manage documentation for multiple clients and need workspace isolation.',
    solution: 'Separate workspaces per client, each with custom templates and branding.',
  },
];

export function UseCaseCarousel() {
  const [active, setActive] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const next = useCallback(() => {
    setActive((prev) => (prev + 1) % useCases.length);
  }, []);

  const goTo = useCallback((index: number) => {
    setActive(index);
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 5000);
  }, []);

  useEffect(() => {
    if (isPaused) return;
    intervalRef.current = setInterval(next, 4000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPaused, next]);

  const current = useCases[active];

  return (
    <div className="relative max-w-2xl mx-auto">
      {/* Card */}
      <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm min-h-[220px]">
        <div
          key={active}
          className="p-8 animate-carousel-in"
        >
          <h3 className="font-semibold text-gray-900 text-xl mb-4">{current.role}</h3>
          <p className="text-sm text-gray-500 mb-4 leading-relaxed">
            <span className="text-red-400 font-medium">The problem:</span> {current.pain}
          </p>
          <p className="text-sm text-gray-600 leading-relaxed">
            <span className="text-green-500 font-medium">With KBPipe:</span> {current.solution}
          </p>
        </div>
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-2 mt-6">
        {useCases.map((uc, i) => (
          <button
            key={uc.role}
            onClick={() => goTo(i)}
            aria-label={`Go to ${uc.role}`}
            className={`relative h-2 rounded-full transition-all duration-500 ${
              i === active
                ? 'w-8 bg-violet-500'
                : 'w-2 bg-gray-200 hover:bg-gray-300'
            }`}
          />
        ))}
      </div>

      {/* Nav arrows */}
      <button
        onClick={() => goTo((active - 1 + useCases.length) % useCases.length)}
        aria-label="Previous"
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 w-9 h-9 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:text-violet-500 hover:border-violet-200 transition-colors shadow-sm hidden md:flex"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button
        onClick={() => goTo((active + 1) % useCases.length)}
        aria-label="Next"
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 w-9 h-9 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:text-violet-500 hover:border-violet-200 transition-colors shadow-sm hidden md:flex"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <style jsx>{`
        @keyframes carouselIn {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-carousel-in {
          animation: carouselIn 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}
