'use client';

import { useEffect, useState } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Suggestion = { label: string; lat: number; lon: number };

// Monta um rótulo BR legível a partir das props do Photon (base OSM).
function formatLabel(p: Record<string, string | undefined>): string {
  const line1 = [p.street ?? p.name, p.housenumber].filter(Boolean).join(', ');
  const parts = [line1, p.district, p.city, p.state].filter(Boolean);
  // capitais têm cidade == estado ("São Paulo, São Paulo") - remove o repetido seguido.
  return parts.filter((v, i) => v !== parts[i - 1]).join(', ');
}

// Autocomplete de endereço via Photon (photon.komoot.io): grátis, sem chave, mesma
// base OSM do geocode do save. A sugestão já traz lat/lng, gravados em inputs hidden
// pra busca por proximidade no app - sem re-geocodificar. Digitar à mão zera as coords
// (o server action cai no fallback Nominatim).
export function AddressAutocomplete({ defaultValue }: { defaultValue: string }) {
  const [value, setValue] = useState(defaultValue);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    const q = value.trim();
    // Só busca depois que o usuário editar (senão o endereço já salvo abriria a lista no load),
    // e não logo após escolher (coords preenchido).
    if (!touched || coords || q.length < 4) {
      setSuggestions([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const url = new URL('https://photon.komoot.io/api/');
        url.searchParams.set('q', q);
        url.searchParams.set('lang', 'default');
        url.searchParams.set('limit', '5');
        const res = await fetch(url, { signal: ctrl.signal });
        if (!res.ok) return;
        const data = (await res.json()) as {
          features?: Array<{
            geometry?: { coordinates?: [number, number] };
            properties?: Record<string, string | undefined>;
          }>;
        };
        const hits = (data.features ?? [])
          .filter((f) => f.properties?.countrycode === 'BR' && f.geometry?.coordinates)
          .map((f) => ({
            label: formatLabel(f.properties ?? {}),
            lon: f.geometry!.coordinates![0],
            lat: f.geometry!.coordinates![1],
          }))
          .filter((s) => s.label);
        // Photon devolve vários pontos da mesma via (lat/lon distintos) que caem no mesmo
        // rótulo sem número - fica a primeira ocorrência de cada label.
        const seen = new Set<string>();
        const unique = hits.filter((s) => !seen.has(s.label) && seen.add(s.label));
        setSuggestions(unique);
        setOpen(unique.length > 0);
        setActive(-1);
      } catch {
        // rede/abort - deixa sem sugestões, o campo continua editável à mão.
      }
    }, 300);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [value, coords, touched]);

  function choose(s: Suggestion) {
    setValue(s.label);
    setCoords({ lat: s.lat, lon: s.lon });
    setSuggestions([]);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      choose(suggestions[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="address">Endereço - opcional</Label>
      <div className="relative">
        <Input
          id="address"
          name="address"
          autoComplete="off"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setCoords(null); // texto novo invalida as coords da sugestão anterior
            setTouched(true);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder="Comece a digitar: Rua Exemplo, 123…"
        />
        {open && (
          <ul className="bg-popover text-popover-foreground absolute z-10 mt-1 w-full overflow-hidden rounded-md border shadow-md">
            {suggestions.map((s, i) => (
              <li
                key={`${s.lat},${s.lon},${i}`}
                // onMouseDown (não onClick) pra escolher antes do blur fechar a lista.
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(s);
                }}
                className={`cursor-pointer px-3 py-2 text-sm ${
                  i === active ? 'bg-accent' : 'hover:bg-accent'
                }`}
              >
                {s.label}
              </li>
            ))}
          </ul>
        )}
      </div>
      <input type="hidden" name="latitude" value={coords?.lat ?? ''} />
      <input type="hidden" name="longitude" value={coords?.lon ?? ''} />
      <p className="text-muted-foreground text-xs">
        Escolha uma sugestão pra fixar o local no mapa e aparecer em &quot;perto de você&quot; no
        app.
      </p>
    </div>
  );
}
