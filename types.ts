export interface GradedSubProblem {
  id: number;
  text: string;
  solution: string;
  studentScore: number; // For sub-problems, this will be binary 1 (correct) or 0 (incorrect)
  feedback: string;
}

export interface Exercise {
  id: number;
  title: string; // e.g., "Bài 1"
  totalPossiblePoints: number; // Set by the user, can be edited
  studentScore: number; // Calculated by the client
  problems: GradedSubProblem[];
}


export interface GradingResult {
  totalScore: number;
  totalPossiblePoints: number;
  exercises: Exercise[];
}

export enum AppState {
  UPLOAD_EXAM,
  UPLOAD_STUDENT_WORK,
  GRADING,
  SHOW_RESULTS,
}