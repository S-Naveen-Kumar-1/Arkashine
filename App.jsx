import { Provider } from 'react-redux';
import { AppStack } from './src/router';
import { store } from './src/redux/store';
import FlashMessage from 'react-native-flash-message';
import FloatingDebugPanel from './src/components/FloatingDebugPanel';

function App() {
  return (
    <Provider store={store}>
      <AppStack />
      <FlashMessage position="top" />
      {/* <FloatingDebugPanel /> */}
    </Provider>
  );
}

export default App;
