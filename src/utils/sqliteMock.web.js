// Mock for expo-sqlite on web platform
export const openDatabaseSync = () => {
  console.warn('SQLite not available on web platform');
  return {
    closeSync: () => {},
    runSync: () => ({ changes: 0, insertId: null }),
    execSync: () => {},
    getAllSync: () => [],
    getFirstSync: () => null,
    prepareSync: () => ({
      executeSync: () => ({ changes: 0, insertId: null }),
      finalizeSync: () => {},
    }),
  };
};

export const openDatabase = openDatabaseSync;

export default {
  openDatabaseSync,
  openDatabase,
}; 