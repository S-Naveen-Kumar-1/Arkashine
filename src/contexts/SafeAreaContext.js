import React, { createContext } from 'react';
import { SafeAreaView } from 'react-native';
import { C } from '../utils/colors';

const SafeAreaContext = createContext(null);

export function SafeAreaProvider({ children }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg, marginTop: 30 }}>
      <SafeAreaContext.Provider value={{}}>{children}</SafeAreaContext.Provider>
    </SafeAreaView>
  );
}

export default SafeAreaContext;