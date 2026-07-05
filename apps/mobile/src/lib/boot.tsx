import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

// Sinal de "a primeira tela já tem conteúdo". A Início chama markContentReady()
// quando termina a primeira carga; o (app)/_layout segura o BrandSplash por cima
// da home até lá - assim o usuário nunca vê o spinner da home, só o splash e o
// conteúdo já pronto por baixo.
type BootState = { contentReady: boolean; markContentReady: () => void };

const BootContext = createContext<BootState>({ contentReady: false, markContentReady: () => {} });

export function BootProvider({ children }: { children: ReactNode }) {
  const [contentReady, setContentReady] = useState(false);
  const markContentReady = useCallback(() => setContentReady(true), []);
  return (
    <BootContext.Provider value={{ contentReady, markContentReady }}>{children}</BootContext.Provider>
  );
}

export const useBoot = () => useContext(BootContext);
