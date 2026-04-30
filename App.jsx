import { Provider } from 'react-redux';
import { AppStack } from './src/router';
import { store } from './src/redux/store';
import FlashMessage from 'react-native-flash-message';
import { BLEProvider } from './src/contexts/BLEContext';

function App() {
  return (
    <Provider store={store}>
      <BLEProvider>
        <AppStack />
        <FlashMessage position="top" />
      </BLEProvider>
    </Provider>
  );
}

export default App;
