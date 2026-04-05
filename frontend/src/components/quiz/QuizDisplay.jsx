import React, { useState } from 'react';
import './QuizDisplay.css';

/**
 * QuizDisplay Component
 * Displays quiz questions with multiple-choice options
 * Allows for quiz submission
 */
const QuizDisplay = ({ 
  quiz, 
  onSubmit, 
  loading = false,
  showAnswers = false,
  userAnswers = {}
}) => {
  const [answers, setAnswers] = useState(userAnswers || {});
  const [submitted, setSubmitted] = useState(false);

  if (!quiz || !quiz.questions) {
    return <div className="alert alert-error">No quiz data available</div>;
  }

  const handleAnswerChange = (questionId, answer) => {
    if (!submitted && !loading) {
      setAnswers(prev => ({
        ...prev,
        [questionId]: answer
      }));
    }
  };

  const handleSubmit = async () => {
    // Validate all questions answered
    const unansweredCount = quiz.questions.length - Object.keys(answers).length;
    if (unansweredCount > 0) {
      alert(`Please answer all ${unansweredCount} unanswered question(s)`);
      return;
    }

    // Transform answers to API format
    const submittedAnswers = quiz.questions.map(q => ({
      questionId: q._id,
      answer: answers[q._id] || ''
    }));

    if (onSubmit) {
      await onSubmit(submittedAnswers);
      setSubmitted(true);
    }
  };

  const calculateProgress = () => {
    return Math.round((Object.keys(answers).length / quiz.questions.length) * 100);
  };

  return (
    <div className="quiz-display">
      {/* Header */}
      <div className="quiz-header">
        <h2 className="text-heading">{quiz.title}</h2>
        {quiz.sourceLecture && (
          <p className="text-sm text-muted">
            Generated from: <strong>{quiz.sourceLecture.title}</strong>
          </p>
        )}
        {quiz.aiGenerated && (
          <span className="badge badge-ai">🤖 AI Generated</span>
        )}
      </div>

      {/* Progress bar */}
      <div className="progress-section">
        <div className="progress-info">
          <span>Progress: {Object.keys(answers).length}/{quiz.questions.length} answered</span>
          <span className="progress-percent">{calculateProgress()}%</span>
        </div>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${calculateProgress()}%` }}
          ></div>
        </div>
      </div>

      {/* Questions */}
      <div className="questions-container">
        {quiz.questions.map((question, index) => (
          <div key={question._id} className="question-card">
            <div className="question-header">
              <span className="question-number">Question {index + 1}</span>
              {showAnswers && question.correctAnswer && (
                <span className={`answer-status ${
                  answers[question._id] === question.correctAnswer 
                    ? 'correct' 
                    : 'incorrect'
                }`}>
                  {answers[question._id] === question.correctAnswer 
                    ? '✓ Correct' 
                    : '✗ Incorrect'}
                </span>
              )}
            </div>

            <h3 className="question-text">{question.question}</h3>

            {/* Options */}
            <div className="options-container">
              {question.options && question.options.map((option, optIndex) => {
                const isSelected = answers[question._id] === option;
                const isCorrect = option === question.correctAnswer;
                const showCorrect = showAnswers && isCorrect;
                const showIncorrect = showAnswers && isSelected && !isCorrect;

                return (
                  <label
                    key={optIndex}
                    className={`option-label ${
                      isSelected ? 'selected' : ''
                    } ${
                      showCorrect ? 'correct' : ''
                    } ${
                      showIncorrect ? 'incorrect' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name={`question-${question._id}`}
                      value={option}
                      checked={isSelected}
                      onChange={() => handleAnswerChange(question._id, option)}
                      disabled={submitted || loading}
                      className="option-radio"
                    />
                    <span className="option-text">{option}</span>
                    {showCorrect && <span className="option-badge">Correct Answer</span>}
                    {showIncorrect && <span className="option-badge">Your Answer</span>}
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Time limit info */}
      {quiz.timeLimit && (
        <div className="time-limit-info">
          <p className="text-sm text-muted">
            ⏱️ Time Limit: {quiz.timeLimit} minutes
          </p>
        </div>
      )}

      {/* Submit button */}
      {!submitted && (
        <div className="quiz-footer">
          <button
            className="btn btn-primary btn-lg"
            onClick={handleSubmit}
            disabled={loading || Object.keys(answers).length === 0}
          >
            {loading ? (
              <>
                <span className="spinner"></span> Submitting...
              </>
            ) : (
              `Submit Quiz (${Object.keys(answers).length}/${quiz.questions.length} answered)`
            )}
          </button>
        </div>
      )}

      {/* Submitted message */}
      {submitted && (
        <div className="alert alert-success">
          <p>✓ Quiz submitted successfully! Your responses have been recorded.</p>
        </div>
      )}
    </div>
  );
};

export default QuizDisplay;
