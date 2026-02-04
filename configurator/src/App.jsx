import './index.css';
import { ConfigProvider } from './context/ConfigContext';
import ConfigurationPage from './pages/ConfigurationPage';

function App() {
  return (
    <ConfigProvider>
      <ConfigurationPage />
    </ConfigProvider>
  );
}

export default App;