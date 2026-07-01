import React, { createContext } from 'react';
import { C } from '../utils/colors';
import { SafeAreaView } from 'react-native-safe-area-context';

const SafeAreaContext = createContext(null);

export function SafeAreaProvider({ children }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg, marginTop: 30 }}>
      <SafeAreaContext.Provider value={{}}>{children}</SafeAreaContext.Provider>
    </SafeAreaView>
  );
}

export default SafeAreaContext;