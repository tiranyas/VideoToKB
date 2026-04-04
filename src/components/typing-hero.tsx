'use client';

import { useState, useEffect } from 'react';

const PHRASES = [
  'publish-ready KB article',
  'step-by-step guide',
  'onboarding tutorial',
  'troubleshooting doc',
];

const TYPING_SPEED = 60;
const DELETING_SPEED = 35;
const PAUSE_AFTER_TYPE = 2000;
const PAUSE_AFTER_DELETE = 400;

export function TypingHero() {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  const currentPhrase = PHRASES[phraseIndex];
  const displayText = currentPhrase.slice(0, charIndex);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    if (!isDeleting && charIndex === currentPhrase.length) {
      // Finished typing, pause then start deleting
      timeout = setTimeout(() => setIsDeleting(true), PAUSE_AFTER_TYPE);
    } else if (isDeleting && charIndex === 0) {
      // Finished deleting, move to next phrase
      setIsDeleting(false);
      setPhraseIndex((prev) => (prev + 1) % PHRASES.length);
      timeout = setTimeout(() => {}, PAUSE_AFTER_DELETE);
    } else {
      // Typing or deleting
      const speed = isDeleting ? DELETING_SPEED : TYPING_SPEED;
      timeout = setTimeout(() => {
        setCharIndex((prev) => prev + (isDeleting ? -1 : 1));
      }, speed);
    }

    return () => clearTimeout(timeout);
  }, [charIndex, isDeleting, currentPhrase]);

  return (
    <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 tracking-tight leading-[1.1]">
      From a short video to a{' '}
      <span className="bg-gradient-to-r from-violet-600 to-blue-500 bg-clip-text text-transparent">
        {displayText}
        <span className="animate-blink text-violet-500">|</span>
      </span>
      {' '}in minutes
    </h1>
  );
}
