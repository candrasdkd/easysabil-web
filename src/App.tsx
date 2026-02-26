import AppRoutes from './routes'
import "./App.css";
import InstallPWA from './components/InstallPWA';
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <AuthProvider>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: { borderRadius: '12px', fontSize: '14px' },
        }}
      />
      <AppRoutes />
      <InstallPWA />
    </AuthProvider>
  )
}

export default App
