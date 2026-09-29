import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { useSettingsStore } from './storage/settings';
import { Layout } from './ui/components/Layout';
import { PageFallback, RouteAnnouncer } from './ui/components/RouteAnnouncer';
import { HomePage } from './ui/pages/HomePage';
import { ItemDetailPage } from './ui/pages/ItemDetailPage';
import { NewItemPage } from './ui/pages/NewItemPage';
import { QuestionnairePage } from './ui/pages/QuestionnairePage';
import { applyTheme, resolveTheme, systemPrefersDark } from './ui/theme';

// The pages of the main flow load with the app; the others arrive on demand.
// The service worker precaches every chunk, so the app stays complete offline.
const InsightsPage = lazy(() =>
  import('./ui/pages/InsightsPage').then((m) => ({ default: m.InsightsPage })),
);
const SettingsPage = lazy(() =>
  import('./ui/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);
const WishlistPage = lazy(() =>
  import('./ui/pages/WishlistPage').then((m) => ({ default: m.WishlistPage })),
);
const SharedPage = lazy(() =>
  import('./ui/pages/SharedPage').then((m) => ({ default: m.SharedPage })),
);
const PrivacyPage = lazy(() =>
  import('./ui/pages/PrivacyPage').then((m) => ({ default: m.PrivacyPage })),
);
const NotFoundPage = lazy(() =>
  import('./ui/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
);

/**
 * Applies the chosen theme and, while the choice is "system", follows the
 * device. The inline script in index.html already set the attribute before
 * the first paint; this keeps it in step afterwards.
 */
export function ThemeEffect() {
  const theme = useSettingsStore((state) => state.theme);
  useEffect(() => {
    const apply = () => applyTheme(resolveTheme(theme, systemPrefersDark()));
    apply();
    if (theme !== null || typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);
  return null;
}

export function App() {
  return (
    <BrowserRouter>
      <ThemeEffect />
      <RouteAnnouncer />
      <Layout>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/new" element={<NewItemPage />} />
            <Route path="/wishlist" element={<WishlistPage />} />
            <Route path="/evaluate" element={<QuestionnairePage />} />
            <Route path="/items/:id" element={<ItemDetailPage />} />
            <Route path="/i" element={<SharedPage />} />
            <Route path="/insights" element={<InsightsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </Layout>
    </BrowserRouter>
  );
}
