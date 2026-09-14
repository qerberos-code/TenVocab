import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Button, colors, s } from '@/ui';
import { report, today, type SightingStat } from '@/sightings';

const MIN = '2024-03-01'; // the digital SAT's first US administration
const shift = (d: string, days: number, months: number) => { const [y, m, dd] = d.split('-').map(Number); return new Date(Date.UTC(y, m - 1 + months, dd + days)).toISOString().slice(0, 10); };
const clamp = (d: string) => (d < MIN ? MIN : d > today() ? today() : d);
const nice = (d: string) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });

/** "I saw this on the SAT" — pick a date with four step buttons, no native picker needed. */
export function SightingControl({ wordId, stat, mine, onReported }: { wordId: string; stat?: SightingStat; mine?: string; onReported: (date: string) => void }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(mine ?? today());
  const [note, setNote] = useState('');
  const step = (label: string, days = 0, months = 0) => (
    <Pressable key={label} onPress={() => setDate(d => clamp(shift(d, days, months)))} accessibilityRole="button" accessibilityLabel={`Move date ${label}`}
      style={({ pressed }) => [{ paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, backgroundColor: '#EEF1F8' }, pressed && { opacity: .6 }]}>
      <Text style={{ fontSize: 13, fontWeight: '800' }}>{label}</Text>
    </Pressable>
  );
  const save = async () => {
    const r = await report(wordId, date);
    if (r === 'invalid') { setNote('That date is outside the digital SAT era.'); return; }
    onReported(date); setOpen(false);
    setNote(r === 'sent' ? 'Recorded. Thank you.' : 'Saved on this device. It will be sent when you are online.');
  };
  const summary = stat ? `Reported ${stat.reports} ${stat.reports === 1 ? 'time' : 'times'} · last seen ${nice(stat.lastSeen)}` : 'No reports yet.';
  return <View style={{ marginTop: 16 }}>
    <Text style={{ fontSize: 12, color: colors.muted, fontWeight: '800' }}>SEEN ON THE SAT</Text>
    <Text style={[s.subtitle, { marginTop: 6 }]}>{summary}{mine ? ` · You reported ${nice(mine)}.` : ''}</Text>
    {!open
      ? <View style={{ marginTop: 10 }}><Button label={mine ? 'CHANGE MY DATE' : 'I SAW THIS ON THE SAT'} secondary onPress={() => setOpen(true)} /></View>
      : <View style={{ marginTop: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
            {step('−1m', 0, -1)}{step('−1d', -1)}
            <Text style={{ fontSize: 16, fontWeight: '800' }}>{nice(date)}</Text>
            {step('+1d', 1)}{step('+1m', 0, 1)}
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            <View style={{ flex: 1 }}><Button label="TODAY" secondary onPress={() => setDate(today())} /></View>
            <View style={{ flex: 1 }}><Button label="SAVE" onPress={save} /></View>
          </View>
          <Pressable onPress={() => setOpen(false)} style={{ marginTop: 10, alignSelf: 'center' }}><Text style={{ color: colors.muted, fontWeight: '700' }}>Cancel</Text></Pressable>
        </View>}
    {note ? <Text style={[s.subtitle, { marginTop: 8 }]}>{note}</Text> : null}
  </View>;
}
