export interface FolderConfig {
  id: string;
  name: string;
  albumName: string; // Name in device Photos app
  icon: string; // FontAwesome icon name
  color: string;
}

export const DEFAULT_FOLDERS: FolderConfig[] = [
  { id: 'furniture', name: 'Furniture', albumName: 'Ref: Furniture', icon: 'bed', color: '#FF6B6B' },
  { id: 'materials', name: 'Materials', albumName: 'Ref: Materials', icon: 'th-large', color: '#4ECDC4' },
  { id: 'lighting', name: 'Lighting', albumName: 'Ref: Lighting', icon: 'lightbulb-o', color: '#FFE66D' },
  { id: 'florals', name: 'Florals', albumName: 'Ref: Florals', icon: 'leaf', color: '#A06CD5' },
  { id: 'signage', name: 'Signage', albumName: 'Ref: Signage', icon: 'font', color: '#FF9A76' },
  { id: 'layout', name: 'Layout', albumName: 'Ref: Layout', icon: 'map', color: '#6BCB77' },
  { id: 'venue', name: 'Venue', albumName: 'Ref: Venue', icon: 'building', color: '#4D96FF' },
  { id: 'inspo', name: 'Inspo', albumName: 'Ref: Inspo', icon: 'star', color: '#FF6B9D' },
];

let _nextId = 1;
export function generateFolderId(): string {
  return `custom-${Date.now()}-${_nextId++}`;
}
