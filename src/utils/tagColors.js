import { C } from './colors';

export const getTagColor = tag => {
  const tagColors = {
    DATA: '#22C55E',
    CMD: '#3B82F6',
    NOTIFY: '#F59E0B',
    CONNECT: '#00C896',
    DISCONNECT: '#EF4444',
    ERROR: '#EF4444',
    BLE: '#9333EA',
    CONFIG: '#06B6D4',
  };
  return tagColors[tag] || C.muted;
};