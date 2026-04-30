import { Provider } from 'react-redux';
import { AppStack } from './src/router';
import { store } from './src/redux/store';
import FlashMessage from 'react-native-flash-message';

function App() {
  return (
    <Provider store={store}>
      <AppStack />
      <FlashMessage position="top" />
    </Provider>
  );
}

export default App;
