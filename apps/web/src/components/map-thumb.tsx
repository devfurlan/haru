const TILE = 256;
const MAP_ZOOM = 16;

// Pino coral (teardrop) com a ponta no centro do container (marca o ponto exato).
export function MapMarker() {
  return (
    <span
      aria-hidden
      className="bg-coral absolute left-1/2 top-1/2 h-[26px] w-[26px] rounded-br-[13px] rounded-tl-[13px] rounded-tr-[13px] shadow-[0_4px_8px_rgba(255,90,54,0.6)]"
      style={{ marginLeft: -13, marginTop: -17, transform: 'rotate(-45deg)' }}
    />
  );
}

/**
 * Miniatura de mapa real: grade 3x3 de tiles do OpenStreetMap centrada nas coordenadas.
 * Keyless (só <img>), espelha o MapThumb do app. Centralização por CSS (`left: calc(50%
 * + …)`) - não precisa medir a largura. Fonte única - reusado no histórico do cliente e na
 * página pública. ponytail: tiles direto do OSM servem no tamanho atual; se escalar, migrar
 * pra provider com key (a política do OSM desencoraja tráfego alto sem User-Agent).
 */
export function MapThumb({ lat, lng, height = 110 }: { lat: number; lng: number; height?: number }) {
  const n = 2 ** MAP_ZOOM;
  // Coordenadas fracionárias de tile (projeção Web Mercator / slippy map).
  const fx = ((lng + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const fy = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  const tx0 = Math.floor(fx);
  const ty0 = Math.floor(fy);

  const tiles: { tx: number; ty: number }[] = [];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const tx = tx0 + dx;
      const ty = ty0 + dy;
      if (tx >= 0 && ty >= 0 && tx < n && ty < n) tiles.push({ tx, ty });
    }
  }

  return (
    <div className="relative overflow-hidden bg-[#dfe7df]" style={{ height }}>
      {tiles.map(({ tx, ty }) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`${tx}-${ty}`}
          src={`https://tile.openstreetmap.org/${MAP_ZOOM}/${tx}/${ty}.png`}
          alt=""
          width={TILE}
          height={TILE}
          className="absolute max-w-none"
          style={{
            left: `calc(50% + ${((tx - fx) * TILE).toFixed(2)}px)`,
            top: `calc(${height / 2}px + ${((ty - fy) * TILE).toFixed(2)}px)`,
          }}
        />
      ))}
      <MapMarker />
      {/* Atribuição exigida pela licença do OpenStreetMap. */}
      <span className="absolute bottom-[3px] right-[5px] text-[8px] text-[#5a6b60]">
        © OpenStreetMap
      </span>
    </div>
  );
}
