import { useCallback, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  ENGINE_VERSION,
  applyAnswer,
  budgetShare,
  evaluate,
  nextQuestion,
  remainingUpperBound,
  undoLastAnswer,
  type Answer,
  type FlowState,
} from '@/engine';
import { useCopy } from '@/i18n';
import { addDays, COOLING_OFF_DAYS, withHistory } from '@/insights/lifecycle';
import { newId } from '@/lib/format';
import { useDraftStore } from '@/storage/draft';
import { useSettingsStore } from '@/storage/settings';
import { useItemsStore } from '@/storage/store';
import type { Item } from '@/storage/types';
import { Button, ButtonLink } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Notice } from '../components/Notice';
import { ProductContext } from '../components/ProductContext';
import { QuestionCard } from '../components/QuestionCard';
import { useQuestions } from '../hooks';

export function QuestionnairePage() {
  const copy = useCopy();
  const QUESTIONS = useQuestions();
  const navigate = useNavigate();
  const draft = useDraftStore((state) => state.draft);
  const clearDraft = useDraftStore((state) => state.clearDraft);
  const upsert = useItemsStore((state) => state.upsert);
  const budget = useSettingsStore((state) => state.budget);
  const [confirming, setConfirming] = useState(false);
  const [flow, setFlow] = useState<FlowState>(() => {
    const share = budgetShare(draft?.price, budget);
    return {
      category: draft?.category ?? 'other',
      answers: {},
      askedOrder: [],
      ...(share !== undefined ? { budgetShare: share } : {}),
    };
  });

  const question = useMemo(() => nextQuestion(QUESTIONS, flow), [QUESTIONS, flow]);
  const answered = flow.askedOrder.length;
  const maxTotal = answered + remainingUpperBound(QUESTIONS, flow);

  const finish = useCallback(
    (state: FlowState) => {
      if (!draft) return;
      const now = new Date().toISOString();
      const id = draft.itemId ?? newId();
      const result = evaluate(QUESTIONS, draft.category, state.answers, state.budgetShare);
      const item: Item = {
        id,
        createdAt: draft.createdAt ?? now,
        updatedAt: now,
        source: draft.source,
        title: draft.title,
        category: draft.category,
        answers: state.answers,
        askedOrder: state.askedOrder,
        result,
        engineVersion: ENGINE_VERSION,
        ...(draft.imageUrl ? { imageUrl: draft.imageUrl } : {}),
        ...(draft.price ? { price: draft.price } : {}),
        ...(state.budgetShare !== undefined && budget ? { budget } : {}),
        // A "wait" verdict comes with the date to come back to it.
        ...(result.verdict === 'wait' ? { reconsiderAt: addDays(now, COOLING_OFF_DAYS) } : {}),
      };
      // A re-evaluation keeps the note and remembers the previous verdict.
      const previous = draft.itemId
        ? useItemsStore.getState().items.find((x) => x.id === draft.itemId)
        : undefined;
      upsert(withHistory(previous, item));
      clearDraft();
      navigate(`/items/${id}`, { replace: true });
    },
    [QUESTIONS, draft, budget, upsert, clearDraft, navigate],
  );

  const onAnswer = useCallback(
    (answer: Answer) => {
      if (!question) return;
      const next = applyAnswer(flow, question.id, answer);
      if (nextQuestion(QUESTIONS, next) === null) finish(next);
      else setFlow(next);
    },
    [QUESTIONS, flow, question, finish],
  );

  const undo = useCallback(() => {
    if (answered > 0) setFlow((current) => undoLastAnswer(QUESTIONS, current));
  }, [QUESTIONS, answered]);

  const leave = () => {
    clearDraft();
    navigate('/');
  };

  if (!draft) {
    return (
      <div className="space-y-4">
        <Notice tone="warning">{copy.questionnaire.missingDraft}</Notice>
        <div className="flex flex-wrap gap-3">
          <ButtonLink to="/" leadingIcon="arrow-left">
            {copy.common.back}
          </ButtonLink>
          <ButtonLink to="/new" variant="secondary">
            {copy.questionnaire.missingDraftManual}
          </ButtonLink>
        </div>
      </div>
    );
  }

  if (!question) return <Navigate to="/" replace />;

  return (
    <div className="space-y-5">
      <ProductContext draft={draft} />
      <header>
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-medium tabular-nums">
            {copy.questionnaire.progress(answered + 1, maxTotal)}
          </span>
          <span className="text-right text-ink-faint">
            {copy.questionnaire.stageHint[question.stage]}
          </span>
        </div>
        <div
          className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken"
          aria-hidden="true"
        >
          <div
            className="h-full rounded-full bg-brand-600 transition-[width] duration-500 ease-out-expo"
            style={{ width: `${Math.round(((answered + 1) / (maxTotal + 1)) * 100)}%` }}
          />
        </div>
      </header>

      <QuestionCard
        question={question}
        onAnswer={onAnswer}
        onUndo={answered > 0 ? undo : undefined}
      />

      <div className="flex justify-between">
        <Button variant="ghost" disabled={answered === 0} onClick={undo} leadingIcon="arrow-left">
          {copy.questionnaire.back}
        </Button>
        <Button variant="ghost" onClick={() => (answered === 0 ? leave() : setConfirming(true))}>
          {copy.questionnaire.cancel}
        </Button>
      </div>

      <ConfirmDialog
        open={confirming}
        title={copy.questionnaire.confirmCancel.title}
        body={copy.questionnaire.confirmCancel.body(answered)}
        confirmLabel={copy.questionnaire.confirmCancel.confirm}
        cancelLabel={copy.questionnaire.confirmCancel.keep}
        tone="danger"
        onConfirm={leave}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
