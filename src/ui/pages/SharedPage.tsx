import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCopy } from '@/i18n';
import { formatDate } from '@/lib/format';
import { decodeShare } from '@/lib/share';
import { useItemsStore } from '@/storage/store';
import { Button, ButtonLink } from '../components/Button';
import { Notice } from '../components/Notice';
import { ResultView } from '../components/ResultView';
import { Surface } from '../components/Surface';

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

  // The reader can run the same evaluation on the product: from its link when
  // there is one, otherwise from its name.
  const evaluateTo = item.source.url
    ? `/new?url=${encodeURIComponent(item.source.url)}`
    : `/new?title=${encodeURIComponent(item.title)}`;

  return (
    <div className="space-y-6">
      <Notice tone="info">
        <strong className="font-semibold">{copy.shared.title}.</strong> {copy.shared.body}{' '}
        {copy.shared.sharedOn(formatDate(item.updatedAt, copy.locale))}
      </Notice>
      <ResultView item={item} perspective="shared" />
      <Surface as="div" className="flex flex-wrap gap-3">
        <Button size="lg" leadingIcon="download" onClick={save} disabled={saved}>
          {saved ? copy.shared.saved : copy.shared.save}
        </Button>
        <ButtonLink size="lg" variant="secondary" leadingIcon="sparkle" to={evaluateTo}>
          {copy.shared.evaluateYourself}
        </ButtonLink>
      </Surface>
    </div>
  );
}
