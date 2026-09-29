import { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { manifestFor, useCopy } from './i18n';
import { Layout } from './ui/components/Layout';
import { HomePage } from './ui/pages/HomePage';
import { ItemDetailPage } from './ui/pages/ItemDetailPage';
import { NewItemPage } from './ui/pages/NewItemPage';
import { NotFoundPage } from './ui/pages/NotFoundPage';
import { PrivacyPage } from './ui/pages/PrivacyPage';
import { QuestionnairePage } from './ui/pages/QuestionnairePage';
import { SettingsPage } from './ui/pages/SettingsPage';
import { SharedPage } from './ui/pages/SharedPage';
import { WishlistPage } from './ui/pages/WishlistPage';

/**
 * Keeps the document in step with the language in use: the `lang`
 * attribute (screen readers pick their voice from it), the title, the
 * description and the manifest, which is one static file per language.
 */
export function DocumentLanguage() {
  const copy = useCopy();
  useEffect(() => {
    document.documentElement.lang = copy.lang;
    document.title = copy.app.documentTitle;
    document
      .querySelector<HTMLMetaElement>('meta[name="description"]')
      ?.setAttribute('content', copy.app.description);
    document
      .querySelector<HTMLLinkElement>('link[rel="manifest"]')
      ?.setAttribute('href', manifestFor(copy.lang === 'it' ? 'it' : 'en'));
  }, [copy]);
  return null;
}

export function App() {
  return (
    <BrowserRouter>
      <DocumentLanguage />
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/new" element={<NewItemPage />} />
          <Route path="/wishlist" element={<WishlistPage />} />
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
