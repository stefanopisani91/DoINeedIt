import { describe, expect, it } from 'vitest';
import {
  answerValue,
  applyAnswer,
  computeConfidence,
  computeScore,
  evaluate,
  nextQuestion,
  questionsFor,
  undoLastAnswer,
  verdictFor,
  type Answer,
  type Answers,
  type FlowState,
  type Question,
} from './index';
import { QUESTIONS } from '@/data/questions';
import { CATEGORIES } from '@/data/categories';

const q = (partial: Partial<Question> & { id: string }): Question => ({
  text: partial.id,
  dimension: 'utility',
  stage: 1,
  weight: 1,
  polarity: 'need',
  ...partial,
});

describe('answerValue', () => {
  it('maps yes/no/maybe and flips the sign for skip questions', () => {
    expect(answerValue('yes', 'need')).toBe(1);
    expect(answerValue('no', 'need')).toBe(-1);
    expect(answerValue('maybe', 'need')).toBe(0);
    expect(answerValue('yes', 'skip')).toBe(-1);
    expect(answerValue('no', 'skip')).toBe(1);
    expect(answerValue('maybe', 'skip')).toBe(0);
  });
});

describe('computeScore', () => {
  const bank = [
    q({ id: 'a', weight: 3, polarity: 'skip' }),
    q({ id: 'b', weight: 3 }),
    q({ id: 'c', weight: 2 }),
    q({ id: 'd', weight: 2 }),
    q({ id: 'e', weight: 2, polarity: 'skip' }),
  ];

  it('is neutral with no answers', () => {
    expect(computeScore(bank, {})).toBe(50);
  });

  it('reaches 100 when every answer points to "need"', () => {
    expect(computeScore(bank, { a: 'no', b: 'yes', c: 'yes', d: 'yes', e: 'no' })).toBe(100);
  });

  it('reaches 0 when every answer points to "skip"', () => {
    expect(computeScore(bank, { a: 'yes', b: 'no', c: 'no', d: 'no', e: 'yes' })).toBe(0);
  });

  it('treats "maybe" as neutral but still counts its weight', () => {
    // numerator 3+3+2+2 = 10, denominator 3+3+2+2+2 = 12 → 50 + 50·10/12 = 91.67
    expect(computeScore(bank, { a: 'no', b: 'yes', c: 'yes', d: 'maybe', e: 'no' })).toBe(92);
    // all "maybe" stays at 50
    expect(computeScore(bank, { a: 'maybe', b: 'maybe' })).toBe(50);
  });

  it('ignores answers to unknown questions', () => {
    expect(computeScore(bank, { zzz: 'yes' })).toBe(50);
  });
});

describe('verdictFor', () => {
  it('splits the score into three bands', () => {
    expect(verdictFor(100)).toBe('buy');
    expect(verdictFor(70)).toBe('buy');
    expect(verdictFor(69)).toBe('wait');
    expect(verdictFor(40)).toBe('wait');
    expect(verdictFor(39)).toBe('skip');
    expect(verdictFor(0)).toBe('skip');
  });
});

describe('computeConfidence', () => {
  it('is zero with no answers and grows with clarity, firm answers and coverage', () => {
    expect(computeConfidence(50, 0, 0)).toBe(0);
    const clear = computeConfidence(95, 6, 0);
    const vague = computeConfidence(52, 6, 3);
    expect(clear).toBeGreaterThan(vague);
    expect(computeConfidence(95, 12, 0)).toBeGreaterThan(clear);
    expect(computeConfidence(100, 12, 0)).toBe(100);
  });
});

describe('question bank integrity', () => {
  it('has unique ids and valid follow-up references', () => {
    const ids = QUESTIONS.map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const question of QUESTIONS) {
      if (question.showIf) {
        const parentIndex = ids.indexOf(question.showIf.questionId);
        expect(parentIndex).toBeGreaterThanOrEqual(0);
        expect(parentIndex).toBeLessThan(ids.indexOf(question.id));
      }
      for (const category of question.categories ?? []) {
        expect(CATEGORIES.map((c) => c.id)).toContain(category);
      }
    }
  });

  it('gives every category the same core and tie-break questions plus its own deepening ones', () => {
    for (const category of CATEGORIES) {
      const list = questionsFor(QUESTIONS, category.id);
      expect(list.filter((x) => x.stage === 1)).toHaveLength(7);
      expect(list.filter((x) => x.stage === 3)).toHaveLength(3);
      const specific = list.filter((x) => x.categories);
      expect(specific).toHaveLength(category.id === 'other' ? 0 : 3);
      // category-specific questions come before generic ones within stage 2
      const stage2 = list.filter((x) => x.stage === 2);
      const firstGeneric = stage2.findIndex((x) => !x.categories);
      expect(stage2.slice(0, firstGeneric).every((x) => x.categories)).toBe(true);
    }
  });
});

/** Runs the flow to completion answering with the given strategy. */
function runFlow(category: FlowState['category'], strategy: (question: Question) => Answer) {
  let state: FlowState = { category, answers: {}, askedOrder: [] };
  let guard = 0;
  for (;;) {
    const question = nextQuestion(QUESTIONS, state);
    if (!question) break;
    state = applyAnswer(state, question.id, strategy(question));
    if (++guard > 50) throw new Error('flow does not terminate');
  }
  return state;
}

describe('adaptive flow', () => {
  it('asks the core questions first, in bank order', () => {
    let state: FlowState = { category: 'tech', answers: {}, askedOrder: [] };
    expect(nextQuestion(QUESTIONS, state)?.id).toBe('own_similar');
    state = applyAnswer(state, 'own_similar', 'no');
    // follow-ups are skipped when the parent answer does not match
    expect(nextQuestion(QUESTIONS, state)?.id).toBe('concrete_need');
  });

  it('shows follow-up questions right after their parent', () => {
    let state: FlowState = { category: 'tech', answers: {}, askedOrder: [] };
    state = applyAnswer(state, 'own_similar', 'yes');
    expect(nextQuestion(QUESTIONS, state)?.id).toBe('own_works');
    state = applyAnswer(state, 'own_works', 'yes');
    expect(nextQuestion(QUESTIONS, state)?.id).toBe('new_different');
  });

  it('stops after the core stage when the purchase is clearly unnecessary', () => {
    const state = runFlow('tech', (question) => (question.polarity === 'skip' ? 'yes' : 'no'));
    expect(state.askedOrder).toHaveLength(7);
    expect(evaluate(QUESTIONS, 'tech', state.answers).score).toBe(0);
    expect(evaluate(QUESTIONS, 'tech', state.answers).verdict).toBe('skip');
  });

  it('stops after the core stage when the purchase is clearly necessary', () => {
    const state = runFlow('home', (question) => (question.polarity === 'need' ? 'yes' : 'no'));
    expect(state.askedOrder).toHaveLength(5);
    expect(evaluate(QUESTIONS, 'home', state.answers).verdict).toBe('buy');
  });

  it('keeps asking when every answer is "maybe", up to the tie-break stage', () => {
    const state = runFlow('kitchen', () => 'maybe');
    const asked = state.askedOrder.map((id) => QUESTIONS.find((x) => x.id === id)!);
    expect(asked.some((x) => x.stage === 2 && x.categories?.includes('kitchen'))).toBe(true);
    expect(asked.filter((x) => x.stage === 3)).toHaveLength(3);
    const result = evaluate(QUESTIONS, 'kitchen', state.answers);
    expect(result.score).toBe(50);
    expect(result.verdict).toBe('wait');
    expect(result.confidence).toBeLessThan(40);
  });

  it('stops during the deepening stage once the picture is clear', () => {
    // Core answers land in the uncertain band, deepening answers all say "need".
    const core: Answers = {
      own_similar: 'yes',
      own_works: 'maybe',
      new_different: 'maybe',
      concrete_need: 'yes',
      weekly_use: 'maybe',
      problem_soon: 'no',
      impulse_today: 'no',
    };
    let state: FlowState = { category: 'sport', answers: core, askedOrder: Object.keys(core) };
    expect(nextQuestion(QUESTIONS, state)?.stage).toBe(2);
    let asked = 0;
    for (;;) {
      const question = nextQuestion(QUESTIONS, state);
      if (!question) break;
      expect(question.stage).toBe(2);
      state = applyAnswer(state, question.id, question.polarity === 'need' ? 'yes' : 'no');
      asked++;
    }
    expect(asked).toBeGreaterThanOrEqual(3);
    expect(asked).toBeLessThan(8);
    expect(evaluate(QUESTIONS, 'sport', state.answers).verdict).toBe('buy');
  });

  it('never asks more than 18 questions', () => {
    for (const category of CATEGORIES) {
      const state = runFlow(category.id, () => 'maybe');
      expect(state.askedOrder.length).toBeLessThanOrEqual(18);
    }
  });
});

describe('evaluate', () => {
  it('reports per-dimension scores, drivers and null for dimensions without answers', () => {
    const answers: Answers = { own_similar: 'no', concrete_need: 'yes', impulse_today: 'yes' };
    const result = evaluate(QUESTIONS, 'tech', answers);
    expect(result.dimensions.utility).toBe(100);
    expect(result.dimensions.impulse).toBe(0);
    expect(result.dimensions.urgency).toBeNull();
    expect(result.dimensions.budget).toBeNull();
    expect(result.answeredCount).toBe(3);
    expect(result.drivers.map((d) => d.questionId)).toEqual([
      'own_similar',
      'concrete_need',
      'impulse_today',
    ]);
    expect(result.drivers[0]?.contribution).toBe(3);
    expect(result.drivers[2]?.contribution).toBe(-2);
  });
});

describe('undoLastAnswer', () => {
  it('removes the last answer and any follow-ups that depended on it', () => {
    let state: FlowState = { category: 'tech', answers: {}, askedOrder: [] };
    state = applyAnswer(state, 'own_similar', 'yes');
    state = applyAnswer(state, 'own_works', 'no');
    state = undoLastAnswer(QUESTIONS, state);
    expect(state.askedOrder).toEqual(['own_similar']);
    state = applyAnswer(state, 'own_works', 'no');
    state = applyAnswer(state, 'new_different', 'yes');
    // undo three times: new_different, own_works, own_similar
    state = undoLastAnswer(QUESTIONS, undoLastAnswer(QUESTIONS, undoLastAnswer(QUESTIONS, state)));
    expect(state.answers).toEqual({});
    expect(undoLastAnswer(QUESTIONS, state)).toEqual(state);
  });
});
