import { Provider } from 'react-redux';
import { AppStack } from './src/router';
import {store} from "./src/store/store"
function App() {
  return (
    <Provider store={store}>
      <AppStack />
    </Provider>
  );
}

export default App;