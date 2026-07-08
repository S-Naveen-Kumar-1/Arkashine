import { Provider } from 'react-redux';
import { AppStack } from './src/router';
import { store } from './src/redux/store';
import FlashMessage from 'react-native-flash-message';
import FloatingDebugPanel from './src/components/FloatingDebugPanel';
import DebugButton from './src/components/DebugShareButton';
function App() {
  return (
    <Provider store={store}>
      <AppStack />
      <FlashMessage position="top" />
      {/* <FloatingDebugPanel /> */}
      {/* <DebugButton /> */}
    </Provider>
  );
}

export default App;
