import React from 'react';

type StationStatus = 'complete' | 'pending' | 'issue' | 'idle';
type StationData = {
  no: number;
  colourName: string;
  status: StationStatus;
  swatchVar: string;
};

const STATIONS: StationData[] = [
  { no: 1, colourName: 'Cyan', status: 'complete', swatchVar: 'var(--stn-cyan)' },
  { no: 2, colourName: 'Magenta', status: 'complete', swatchVar: 'var(--stn-magenta)' },
  { no: 3, colourName: 'Yellow', status: 'pending', swatchVar: 'var(--stn-yellow)' },
  { no: 4, colourName: 'Black', status: 'issue', swatchVar: 'var(--stn-black)' },
  { no: 5, colourName: 'Ground', status: 'pending', swatchVar: 'var(--stn-ground)' },
  { no: 6, colourName: 'Self 1', status: 'issue', swatchVar: 'var(--stn-self1)' },
  { no: 7, colourName: 'Self 2', status: 'idle', swatchVar: 'var(--stn-self2)' },
  { no: 8, colourName: 'White', status: 'idle', swatchVar: 'var(--stn-white)' },
];

export function StationRail() {
  return (
    <div className="flex flex-col gap-1 rounded-md border border-border bg-card p-2 w-max shadow-sm">
      {STATIONS.map((st) => (
        <div key={st.no} className="flex h-[var(--row-h)] items-center gap-3 px-2 rounded hover:bg-muted cursor-pointer transition-colors">
          {/* Swatch cell */}
          <div className="flex h-full py-1">
            <div
              className={`w-4 h-full rounded-sm border border-black/10 ${st.status === 'idle' ? 'bg-transparent border-dashed' : ''}`}
              style={{ backgroundColor: st.status !== 'idle' ? st.swatchVar : 'transparent' }}
            />
          </div>
          
          {/* Number and Name */}
          <div className="flex items-center gap-3 font-data text-[length:var(--base)]">
            <span className={st.status === 'idle' ? 'text-steel-400' : 'text-foreground'}>{st.no}</span>
            <span className={`w-24 ${st.status === 'idle' ? 'text-steel-400' : 'text-ink-600'}`}>
              {st.colourName}
            </span>
          </div>

          {/* Status Indicator */}
          <div className="flex items-center gap-2 text-sm">
            {st.status === 'complete' && <span className="text-signal-ok">●</span>}
            {st.status === 'pending' && <span className="text-ink-600">○</span>}
            {st.status === 'issue' && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-signal-warn text-signal-warn text-xs font-bold">
                !
              </span>
            )}
            {st.status === 'idle' && <span className="text-steel-400">—</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
