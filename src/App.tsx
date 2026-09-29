import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './ui/components/Layout';
import { HomePage } from './ui/pages/HomePage';
import { ItemDetailPage } from './ui/pages/ItemDetailPage';
import { NewItemPage } from './ui/pages/NewItemPage';
import { NotFoundPage } from './ui/pages/NotFoundPage';
import { PrivacyPage } from './ui/pages/PrivacyPage';
import { QuestionnairePage } from './ui/pages/QuestionnairePage';
import { SettingsPage } from './ui/pages/SettingsPage';
import { SharedPage } from './ui/pages/SharedPage';

export function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/new" element={<NewItemPage />} />
          <Route path="/evaluate" element={<QuestionnairePage />} />
          <Route path="/items/:id" element={<ItemDetailPage />} />
          <Route path="/i" element={<SharedPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
