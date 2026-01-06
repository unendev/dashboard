// FSRS v4.5 Simplified Implementation
// Based on the open-source FSRS algorithm: https://github.com/open-spaced-repetition/fsrs.js

export interface FSRSCard {
  state: number; // 0:New, 1:Learning, 2:Review, 3:Relearning
  stability: number; // Memory stability (days)
  difficulty: number; // Difficulty (1-10)
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  last_review: Date;
}

export interface ReviewLog {
  rating: 1 | 2 | 3 | 4; // 1:Again, 2:Hard, 3:Good, 4:Easy
  elapsed_days: number;
  scheduled_days: number;
  review: Date;
  state: number;
}

// Default parameters (optimized for language learning)
const p = {
  w: [0.40255, 1.18385, 3.173, 15.69105, 7.19605, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192, 1.01925, 1.9395, 0.11, 0.29605, 0.3131, 1.332, 2.05575],
};

export const State = {
  New: 0,
  Learning: 1,
  Review: 2,
  Relearning: 3,
};

export const Rating = {
  Again: 1,
  Hard: 2,
  Good: 3,
  Easy: 4,
};

export function createEmptyCard(): FSRSCard {
  return {
    state: State.New,
    stability: 0,
    difficulty: 0,
    elapsed_days: 0,
    scheduled_days: 0,
    reps: 0,
    last_review: new Date(),
  };
}

export function nextInterval(card: FSRSCard, rating: number, now: Date = new Date()): FSRSCard {
  const newCard = { ...card };
  if (card.last_review) {
    newCard.elapsed_days = (now.getTime() - new Date(card.last_review).getTime()) / (1000 * 60 * 60 * 24);
  }
  newCard.last_review = now;
  newCard.reps += 1;

  if (card.state === State.New) {
    newCard.difficulty = initDifficulty(rating);
    newCard.stability = initStability(rating);
    newCard.state = State.Learning;
    // Simple short intervals for learning phase
    switch (rating) {
      case Rating.Again: newCard.scheduled_days = 0; break; // 1 min
      case Rating.Hard: newCard.scheduled_days = 0; break; // 5 min
      case Rating.Good: newCard.scheduled_days = 0; break; // 10 min
      case Rating.Easy: 
        newCard.state = State.Review; 
        newCard.scheduled_days = newCard.stability; 
        break; 
    }
  } else if (card.state === State.Learning || card.state === State.Relearning) {
    if (rating === Rating.Again) {
      newCard.scheduled_days = 0;
      newCard.stability = p.w[0]; // Reset short-term stability
    } else if (rating === Rating.Easy) {
      newCard.state = State.Review;
      newCard.scheduled_days = newCard.stability;
    } else {
      newCard.scheduled_days = 0; // Keep in learning today
    }
  } else if (card.state === State.Review) {
    const interval = card.elapsed_days;
    const retrievability = Math.exp(Math.log(0.9) * interval / card.stability);
    
    if (rating === Rating.Again) {
      newCard.state = State.Relearning;
      newCard.stability = nextForgetStability(card.difficulty, card.stability, retrievability);
      newCard.difficulty = nextDifficulty(card.difficulty, rating);
      newCard.scheduled_days = 0;
    } else {
      newCard.stability = nextRecallStability(card.difficulty, card.stability, retrievability, rating);
      newCard.difficulty = nextDifficulty(card.difficulty, rating);
      newCard.scheduled_days = newCard.stability;
    }
  }

  // Ensure scheduled_days is at least 1 for Review state, but for Learning it can be 0 (same day)
  if (newCard.state === State.Review) {
      newCard.scheduled_days = Math.max(1, Math.round(newCard.scheduled_days));
  } else {
      // In Learning, we treat 0 as "due immediately/today".
      // But database stores Date. So we will add minutes?
      // For simplicity in MVP:
      // Again/Hard -> Due now (add 1 min)
      // Good -> Due in 10 mins
      // Easy -> Due in days
      if (newCard.scheduled_days === 0) {
          // It's technically fractional days, but we handle it in `actions.ts`
      }
  }

  return newCard;
}

function initStability(r: number): number {
  return Math.max(0.1, p.w[r - 1]);
}

function initDifficulty(r: number): number {
  return Math.min(Math.max(1, p.w[4] - p.w[5] * (r - 3)), 10);
}

function nextDifficulty(d: number, r: number): number {
  const nextD = d - p.w[6] * (r - 3);
  return Math.min(Math.max(1, nextD), 10); // clamp 1-10
  // Mean reversion
  // return Math.min(Math.max(1, nextD), 10) * (1 - p.w[7]) + p.w[4] * p.w[7]; (Simplified)
}

function nextRecallStability(d: number, s: number, r: number, rating: number): number {
  const hardPenalty = rating === Rating.Hard ? p.w[15] : 1;
  const easyBonus = rating === Rating.Easy ? p.w[16] : 1;
  return s * (1 + Math.exp(p.w[8]) *
    (11 - d) *
    Math.pow(s, -p.w[9]) *
    (Math.exp((1 - r) * p.w[10]) - 1) *
    hardPenalty *
    easyBonus);
}

function nextForgetStability(d: number, s: number, r: number): number {
  return p.w[11] * Math.pow(d, -p.w[12]) * Math.pow(s + 1, p.w[13]) * Math.exp((1 - r) * p.w[14]);
}
