import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCopy } from '@/i18n';
import { decodeShare } from '@/lib/share';
import { useItemsStore } from '@/storage/store';
import { Button, ButtonLink } from '../components/Button';
import { Notice } from '../components/Notice';
import { ResultView } from '../components/ResultView';

export function SharedPage() {
  const copy = useCopy();
  const location = useLocation();
  const navigate = useNavigate();
  const item = useMemo(() => decodeShare(location.hash), [location.hash]);
  const merge = useItemsStore((state) => state.merge);
  const upsert = useItemsStore((state) => state.upsert);
  const [saved, setSaved] = useState(false);

  if (!item) {
    return (
      <div className="space-y-4">
        <Notice tone="error">{copy.shared.invalid}</Notice>
        <ButtonLink to="/">{copy.notFound.back}</ButtonLink>
      </div>
    );
  }

  const save = () => {
    const added = merge([item]);
    if (added === 0) upsert(item);
    setSaved(true);
    navigate(`/items/${item.id}`);
  };

  return (
    <div className="space-y-6">
      <Notice tone="info">
        <strong className="font-semibold">{copy.shared.title}.</strong> {copy.shared.body}
      </Notice>
      <ResultView item={item} />
      <Button size="lg" onClick={save} disabled={saved}>
        {saved ? copy.shared.saved : copy.shared.save}
      </Button>
    </div>
  );
}
