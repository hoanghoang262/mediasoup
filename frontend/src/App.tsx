import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { JoinPage } from '@/pages/JoinPage';
import { RoomPage } from '@/pages/RoomPage';

function App() {
  return (
    <BrowserRouter>
      <Toaster 
        position="top-right" 
        toastOptions={{
          // Group duplicates to prevent multiple identical toasts
          closeButton: true,
          // Custom styles to make toast container more compact
          style: {
            margin: '8px 0',
          }
        }}
        // Use a smaller gap between toasts
        gap={8}
        // Use a slightly faster animation
        duration={4000}
        // Group duplicate toasts
        richColors
      />
      <Routes>
        <Route path="/" element={<JoinPage />} />
        <Route path="/room" element={<RoomPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
