import type { Fish } from '@/lib/types';

// Close relationships between fish in a group, from recorded sires and dams.
export function closeRelations(members: Fish[]): string[] {
  const notes: string[] = [];
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      const a = members[i];
      const b = members[j];
      if (a.sire_id === b.id || a.dam_id === b.id) notes.push(`${b.fish_code} is a parent of ${a.fish_code}`);
      else if (b.sire_id === a.id || b.dam_id === a.id) notes.push(`${a.fish_code} is a parent of ${b.fish_code}`);
      else {
        const sameSire = !!a.sire_id && a.sire_id === b.sire_id;
        const sameDam = !!a.dam_id && a.dam_id === b.dam_id;
        if (sameSire && sameDam) notes.push(`${a.fish_code} and ${b.fish_code} are full siblings`);
        else if (sameSire || sameDam) notes.push(`${a.fish_code} and ${b.fish_code} are half siblings`);
      }
    }
  }
  return notes;
}
