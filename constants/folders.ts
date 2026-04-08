export interface FolderConfig {
  id: string;
  name: string;
  albumName: string; // Name in device Photos app
  icon: string; // FontAwesome icon name
  color: string;
}

export const DEFAULT_FOLDERS: FolderConfig[] = [
  { id: 'props', name: 'Props', albumName: 'Ref: Props', icon: 'cube', color: '#FF6B6B' },
  { id: 'color-ref', name: 'Color Ref', albumName: 'Ref: Color Ref', icon: 'paint-brush', color: '#4ECDC4' },
  { id: 'lighting', name: 'Lighting', albumName: 'Ref: Lighting', icon: 'lightbulb-o', color: '#FFE66D' },
  { id: 'wardrobe', name: 'Wardrobe', albumName: 'Ref: Wardrobe', icon: 'user', color: '#A06CD5' },
  { id: 'set-design', name: 'Set Design', albumName: 'Ref: Set Design', icon: 'home', color: '#FF9A76' },
  { id: 'location', name: 'Location', albumName: 'Ref: Location', icon: 'map-marker', color: '#6BCB77' },
  { id: 'continuity', name: 'Continuity', albumName: 'Ref: Continuity', icon: 'camera', color: '#4D96FF' },
];

let _nextId = 1;
export function generateFolderId(): string {
  return `custom-${Date.now()}-${_nextId++}`;
}
