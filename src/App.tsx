import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider } from './hooks/useAuth';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { PainelArtesao } from './pages/PainelArtesao';
import { PaginaPublicaArtesao } from './pages/PaginaPublicaArtesao';
import { PrivacidadePage } from './pages/PrivacidadePage';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/entrar" element={<AuthPage />} />
            <Route path="/painel" element={<PainelArtesao />} />
            <Route path="/a/:slug" element={<PaginaPublicaArtesao />} />
            <Route path="/privacidade" element={<PrivacidadePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
