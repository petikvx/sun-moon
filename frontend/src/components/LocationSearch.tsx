import { useEffect, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { searchLocations } from '../services/openMeteo';
import type { GeocodingResult } from '../types';

export function LocationSearch({ onSelect }: { onSelect: (result: GeocodingResult) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length < 2) { setResults([]); return; }
      setLoading(true);
      try { setResults(await searchLocations(query)); } catch { setResults([]); } finally { setLoading(false); }
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="relative">
      <label className="text-sm font-semibold text-slate-300">Recherche mondiale</label>
      <div className="relative mt-2"><Search className="absolute left-3 top-3.5 text-slate-500" size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ville ou code postal…" className="w-full rounded-xl border border-slate-700 bg-slate-800 py-3 pl-10 pr-10 text-white outline-none focus:border-indigo-400" />{loading && <Loader2 className="absolute right-3 top-3.5 animate-spin text-indigo-300" size={18} />}</div>
      {results.length > 0 && <div className="absolute z-30 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">{results.map((result) => <button type="button" key={result.id} onClick={() => { onSelect(result); setQuery(`${result.name}, ${result.country ?? ''}`); setResults([]); }} className="block w-full border-b border-white/5 px-4 py-3 text-left transition last:border-0 hover:bg-indigo-500/10"><span className="font-semibold text-white">{result.name}</span><span className="ml-2 text-sm text-slate-400">{result.admin1 ? `${result.admin1}, ` : ''}{result.country}</span></button>)}</div>}
      <p className="mt-1 text-[11px] text-slate-600">Recherche fournie par Open-Meteo / GeoNames</p>
    </div>
  );
}
