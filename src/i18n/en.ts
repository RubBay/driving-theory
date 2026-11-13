/** English UI strings. Copy this file to ru.ts / hy.ts to add a language. */
const en = {
  'app.title': 'Armenian Driving Theory',
  'theme.toLight': 'Switch to light theme',
  'theme.toDark': 'Switch to dark theme',

  'footer.source': 'Questions:',
  'footer.sourceName': 'Road Police of the Republic of Armenia',
  'footer.unofficial':
    'This is an unofficial study tool. It is not affiliated with or endorsed by the Road Police.',

  'home.heading': 'Theory exam practice',
  'home.intro': 'The official question bank, one question at a time.',
  'group.title': 'Group {n}',
  'group.categories': '{categories} categories',
  'group.questions': '{count} questions',
  'group.answered': 'Answered',
  'group.correct': 'Correct',
  'group.wrong': 'Wrong',
  'group.progress': '{answered} of {total} answered',
  'group.practice': 'Practice',
  'group.mistakes': 'My mistakes',
  'group.reset': 'Reset progress',
  'group.resetTitle': 'Reset progress?',
  'group.resetBody':
    'This clears all answers and mistakes for Group {n} on this device. It cannot be undone.',
  'group.resetConfirm': 'Reset',
  'common.cancel': 'Cancel',
  'common.back': 'Home',
  'common.loading': 'Loading questions…',
  'common.loadError': 'The questions could not be loaded. Check your connection and try again.',
  'common.retry': 'Try again',
  'common.notFound': 'This group does not exist.',

  'practice.title': 'Practice',
  'mistakes.title': 'My mistakes',
  'runner.position': '{current} / {total}',
  'runner.positionLabel': 'Question {current} of {total}',
  'runner.number': 'No. {n}',
  'runner.previous': 'Previous',
  'runner.next': 'Next',
  'runner.nextRound': 'Next round',
  'runner.shuffle': 'Shuffle question order',
  'runner.showAnswer': 'Show answer',
  'runner.tryAgain': 'Try again',
  'runner.navigator': 'All questions',
  'runner.navigatorShow': 'Show question list',
  'runner.navigatorHide': 'Hide question list',
  'stats.record': 'Your record: {correct} correct · {wrong} wrong · {pct}% correct',
  'stats.none': 'Not answered yet',
  'group.accuracy': 'Accuracy: {pct}% ({correct} of {attempts} attempts correct)',
  'runner.jumpTo': 'Question {n}, {status}',
  'runner.imageAlt': 'Illustration for question {n}',
  'runner.imageOpen': 'View the illustration for question {n} full screen',
  'runner.keysHint': 'Keys: 1–5 answer, ← → move between questions.',
  'runner.explanation': 'Explanation',

  'status.unanswered': 'not answered',
  'status.correct': 'answered correctly',
  'status.wrong': 'answered wrong',
  'legend.unanswered': 'Unanswered',
  'legend.correct': 'Correct',
  'legend.wrong': 'Wrong',

  'feedback.correct': 'Correct.',
  'feedback.wrong': 'Wrong. The correct answer is {n}.',
  'feedback.revealed': 'The correct answer is {n}.',
  'feedback.yourAnswer': 'your answer',
  'feedback.correctAnswer': 'correct answer',
  'feedback.streak': 'Correct {streak} of {needed} times in a row. Once more to clear it.',
  'feedback.cleared': 'Cleared from My mistakes.',
  'feedback.stays':
    'It stays in My mistakes until you answer it correctly {needed} times in a row.',

  'mistakes.empty': 'No mistakes to review.',
  'mistakes.emptyHint':
    'Questions you answer wrong appear here and leave after {needed} correct answers in a row.',
  'mistakes.toPractice': 'Go to practice',

  'viewer.close': 'Close full-screen image',
  'viewer.hint': 'Pinch or scroll to zoom, drag to move, double-tap to zoom.',
} as const

export type StringKey = keyof typeof en
export default en
