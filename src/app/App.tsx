import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { TalvexHeader } from './components/TalvexHeader';
import { ScenariosPage } from '../modules/scenarios/ScenariosPage';
import { BlocksPage } from '../modules/blocks/BlocksPage';

export function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-[#fafafa] text-[#111418]">
        <TalvexHeader />
        <main className="flex-1 min-h-0 px-6 py-6 flex flex-col">
          <Routes>
            <Route path="/" element={<Navigate to="/scenarios" replace />} />
            <Route path="/scenarios" element={<ScenariosPage />} />
            <Route path="/blocks" element={<BlocksPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
