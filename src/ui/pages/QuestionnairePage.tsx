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
import { newId } from '@/lib/format';
import { useDraftStore } from '@/storage/draft';
import { useSettingsStore } from '@/storage/settings';
import { useItemsStore } from '@/storage/store';
import type { Item } from '@/storage/types';
import { Button } from '../components/Button';
import { Notice } from '../components/Notice';
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
      const item: Item = {
        id,
        createdAt: draft.createdAt ?? now,
        updatedAt: now,
        source: draft.source,
        title: draft.title,
        category: draft.category,
        answers: state.answers,
        askedOrder: state.askedOrder,
        result: evaluate(QUESTIONS, draft.category, state.answers, state.budgetShare),
        engineVersion: ENGINE_VERSION,
        ...(draft.imageUrl ? { imageUrl: draft.imageUrl } : {}),
        ...(draft.price ? { price: draft.price } : {}),
        ...(state.budgetShare !== undefined && budget ? { budget } : {}),
      };
      upsert(item);
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

  if (!draft) {
    return (
      <div className="space-y-4">
        <Notice tone="warning">{copy.questionnaire.missingDraft}</Notice>
        <Button onClick={() => navigate('/')}>{copy.common.back}</Button>
      </div>
    );
  }

  if (!question) return <Navigate to="/" replace />;

  return (
    <div className="space-y-5">
      <header>
        <p className="truncate text-sm text-stone-500 dark:text-stone-400">{draft.title}</p>
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="font-medium">{copy.questionnaire.progress(answered + 1, maxTotal)}</span>
          <span className="text-stone-500 dark:text-stone-400">
            {copy.questionnaire.stageHint[question.stage]}
          </span>
        </div>
        <div
          className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800"
          aria-hidden="true"
        >
          <div
            className="h-full rounded-full bg-brand-600 transition-[width] duration-500"
            style={{ width: `${Math.round(((answered + 1) / (maxTotal + 1)) * 100)}%` }}
          />
        </div>
      </header>

      <QuestionCard question={question} onAnswer={onAnswer} />

      <div className="flex justify-between">
        <Button
          variant="ghost"
          disabled={answered === 0}
          onClick={() => setFlow(undoLastAnswer(QUESTIONS, flow))}
        >
          ← {copy.questionnaire.back}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            clearDraft();
            navigate('/');
          }}
        >
          {copy.questionnaire.cancel}
        </Button>
      </div>
    </div>
  );
}
