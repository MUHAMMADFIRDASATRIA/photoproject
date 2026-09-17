import { FrameItem, DesignItem } from '../store/kioskStore';

export const SAMPLE_FRIENDS_PHOTO =
  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=80';

export const DEFAULT_FRAMES: FrameItem[] = [
  {
    id: 101,
    name: '2R',
    code: 'frame_2r',
    width: 1200,
    height: 1600,
    photoCount: 1,
    price: 15000,
    slotsConfig: [{ x: 100, y: 120, width: 1000, height: 1200 }],
  },
  {
    id: 102,
    name: '4R',
    code: 'frame_4r',
    width: 1800,
    height: 1200,
    photoCount: 2,
    price: 25000,
    slotsConfig: [
      { x: 100, y: 100, width: 750, height: 1000 },
      { x: 950, y: 100, width: 750, height: 1000 },
    ],
  },
  {
    id: 103,
    name: 'STRIP',
    code: 'frame_strip',
    width: 600,
    height: 1800,
    photoCount: 4,
    price: 20000,
    slotsConfig: [
      { x: 60, y: 80, width: 480, height: 380 },
      { x: 60, y: 500, width: 480, height: 380 },
      { x: 60, y: 920, width: 480, height: 380 },
      { x: 60, y: 1340, width: 480, height: 380 },
    ],
  },
];

export interface MockDesignCategory {
  id: string;
  label: string;
}

export const DESIGN_CATEGORIES: MockDesignCategory[] = [
  { id: 'all', label: 'Semua' },
  { id: 'cute', label: 'Cute' },
  { id: 'minimal', label: 'Minimal' },
  { id: 'vintage', label: 'Vintage' },
  { id: 'fun', label: 'Fun' },
];

export interface ExtendedDesignItem extends DesignItem {
  category: 'cute' | 'minimal' | 'vintage' | 'fun';
  numberLabel: string;
}

export const MOCK_DESIGNS: ExtendedDesignItem[] = [
  {
    id: 201,
    frameId: 101,
    name: 'Sweet Days',
    numberLabel: '01',
    category: 'cute',
    overlayUrl: '',
    thumbnailUrl: '',
    bgColorHex: '#FFF0F3',
    slotBorderColor: '#FFCCD5',
    slotBorderWidth: 4,
  },
  {
    id: 202,
    frameId: 101,
    name: 'Retro Vibes',
    numberLabel: '02',
    category: 'vintage',
    overlayUrl: '',
    thumbnailUrl: '',
    bgColorHex: '#FFE5D9',
    slotBorderColor: '#D8B4E2',
    slotBorderWidth: 4,
  },
  {
    id: 203,
    frameId: 101,
    name: 'Minimal',
    numberLabel: '03',
    category: 'minimal',
    overlayUrl: '',
    thumbnailUrl: '',
    bgColorHex: '#FFFFFF',
    slotBorderColor: '#E4E4E7',
    slotBorderWidth: 2,
  },
  {
    id: 204,
    frameId: 101,
    name: 'Polaroid',
    numberLabel: '04',
    category: 'minimal',
    overlayUrl: '',
    thumbnailUrl: '',
    bgColorHex: '#FDFBF7',
    slotBorderColor: '#D4D4D8',
    slotBorderWidth: 2,
  },
  {
    id: 205,
    frameId: 101,
    name: 'Film Strip',
    numberLabel: '05',
    category: 'vintage',
    overlayUrl: '',
    thumbnailUrl: '',
    bgColorHex: '#18181B',
    slotBorderColor: '#FFFFFF',
    slotBorderWidth: 3,
  },
  {
    id: 206,
    frameId: 101,
    name: 'Blue Mood',
    numberLabel: '06',
    category: 'cute',
    overlayUrl: '',
    thumbnailUrl: '',
    bgColorHex: '#E0F2FE',
    slotBorderColor: '#7DD3FC',
    slotBorderWidth: 4,
  },
  {
    id: 207,
    frameId: 101,
    name: 'Vintage',
    numberLabel: '07',
    category: 'vintage',
    overlayUrl: '',
    thumbnailUrl: '',
    bgColorHex: '#F5EBE0',
    slotBorderColor: '#D5BDAF',
    slotBorderWidth: 4,
  },
  {
    id: 208,
    frameId: 101,
    name: 'Cartoon',
    numberLabel: '08',
    category: 'fun',
    overlayUrl: '',
    thumbnailUrl: '',
    bgColorHex: '#FEF08A',
    slotBorderColor: '#F59E0B',
    slotBorderWidth: 5,
  },
  {
    id: 209,
    frameId: 101,
    name: 'Love',
    numberLabel: '09',
    category: 'cute',
    overlayUrl: '',
    thumbnailUrl: '',
    bgColorHex: '#FCE7F3',
    slotBorderColor: '#F472B6',
    slotBorderWidth: 4,
  },
  {
    id: 210,
    frameId: 101,
    name: 'Black & White',
    numberLabel: '10',
    category: 'minimal',
    overlayUrl: '',
    thumbnailUrl: '',
    bgColorHex: '#E4E4E7',
    slotBorderColor: '#27272A',
    slotBorderWidth: 3,
  },
];
