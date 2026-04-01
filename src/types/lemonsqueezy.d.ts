interface LemonSqueezy {
  Url: {
    Open: (url: string) => void;
  };
}

declare global {
  interface Window {
    createLemonSqueezy?: () => void;
    LemonSqueezy?: LemonSqueezy;
  }
}

export {};
