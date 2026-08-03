import { Contrast, Laptop, Moon, Sun } from 'lucide-react';
import type { ThemeMode } from '../types';

const options = [
  { value: 'auto' as const, label: 'Auto', icon: Laptop },
  { value: 'dark' as const, label: 'Sombre', icon: Moon },
  { value: 'light' as const, label: 'Clair', icon: Sun },
  { value: 'contrast' as const, label: 'Contraste', icon: Contrast },
];

export function ThemeSwitcher({ value, onChange }: { value: ThemeMode; onChange: (theme: ThemeMode) => void }) {
  return <div className="flex flex-wrap gap-1 rounded-xl border border-white/10 bg-slate-900/80 p-1" role="group" aria-label="Thème d’affichage">{options.map(({ value: option, label, icon: Icon }) => <button key={option} type="button" aria-pressed={value === option} onClick={() => onChange(option)} className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold ${value === option ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:bg-white/5'}`}><Icon size={14}/><span className="hidden sm:inline">{label}</span></button>)}</div>;
}
