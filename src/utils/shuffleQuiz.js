/**
 * Quiz randomisation utilities.
 *
 * Randomisation strategy:
 *  1. Question ORDER  — handled at the DB layer with ORDER BY RAND()
 *  2. Option POSITIONS — handled here by remapping option labels per question
 *
 * Why shuffle options too?
 *  If question order alone were randomised, students could still share
 *  "the answer is always option B" for a given question.  Shuffling options
 *  means the correct answer appears in a different position for each student.
 *
 * Important: the original `correct_option` letter (a/b/c/d) is stored in DB
 * and used for auto-marking.  We return a `displayOptions` array with a
 * `displayKey` that the frontend uses to label the buttons, and a
 * `mappedCorrectKey` that is NOT sent to the student — grading still uses
 * the raw DB value via getQuestionsForGrading().
 */

/**
 * Fisher-Yates shuffle (in-place).
 * @template T
 * @param {T[]} array
 * @returns {T[]}
 */
const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

/**
 * Takes a question row (as returned by getQuestionsForStudent) and returns
 * a new object where the four option texts are shuffled into random display
 * positions.
 *
 * The student-facing structure becomes:
 *   displayOptions: [{ key: 'a'|'b'|'c'|'d', text: string }, ...]
 *
 * The student submits { questionId, selectedOption: 'a'|'b'|'c'|'d' } using
 * the DISPLAY key.  Because the display keys are also stored in a per-attempt
 * mapping (see attemptOptionMap below), the service can translate the student's
 * display key back to the original DB key before saving the answer — ensuring
 * auto-marking still works correctly.
 *
 * @param {{ id, question_text, option_a, option_b, option_c, option_d, marks }} question
 * @returns {{ question: object, optionMap: Map<displayKey, originalKey> }}
 */
const shuffleQuestionOptions = (question) => {
  const originalOptions = [
    { key: 'a', text: question.option_a },
    { key: 'b', text: question.option_b },
    { key: 'c', text: question.option_c },
    { key: 'd', text: question.option_d },
  ];

  // Shuffle the text values while keeping display keys a/b/c/d
  const shuffledTexts = shuffleArray([...originalOptions]);
  const displayKeys = ['a', 'b', 'c', 'd'];

  // Map: displayKey → originalKey  (needed to translate student answer back)
  const optionMap = {};
  const displayOptions = displayKeys.map((displayKey, idx) => {
    optionMap[displayKey] = shuffledTexts[idx].key; // displayKey → originalKey
    return { key: displayKey, text: shuffledTexts[idx].text };
  });

  const shuffledQuestion = {
    id: question.id,
    quiz_id: question.quiz_id,
    question_text: question.question_text,
    marks: question.marks,
    displayOptions,
    // option_map is returned to the caller but NOT exposed in the API response
  };

  return { shuffledQuestion, optionMap };
};

/**
 * Shuffles all questions in a quiz and returns:
 *   - questions : array of student-safe question objects with displayOptions
 *   - optionMaps: { [questionId]: { [displayKey]: originalKey } }
 *
 * optionMaps must be stored server-side (in the attempt record or session)
 * so that when the student submits answers the service can translate
 * displayKey → originalKey before auto-marking.
 *
 * @param {object[]} questions  raw rows from getQuestionsForStudent()
 * @returns {{ questions: object[], optionMaps: object }}
 */
const buildShuffledQuiz = (questions) => {
  const shuffledQuestions = [];
  const optionMaps = {};

  for (const q of questions) {
    const { shuffledQuestion, optionMap } = shuffleQuestionOptions(q);
    shuffledQuestions.push(shuffledQuestion);
    optionMaps[q.id] = optionMap;
  }

  return { questions: shuffledQuestions, optionMaps };
};

module.exports = { shuffleArray, shuffleQuestionOptions, buildShuffledQuiz };
