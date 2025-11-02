// Type definitions for levels and algorithms

export interface TestCase {
  id: string;
  input: Record<string, any>;
  expected: any;
  description: string;
  isHidden?: boolean;
}

export interface Level {
  id: string;
  order: number;
  title: string;
  description: string;
  explanation: string;
  codeTemplate: string;
  solution: string;
  testCases: TestCase[];
  hints: string[];
  points: number;
}

export interface Algorithm {
  id: string;
  name: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  levels: Level[];
}

export interface TestResult {
  testId: string;
  passed: boolean;
  input: Record<string, any>;
  expected: any;
  actual: any;
  error?: string;
}

export interface UserProgress {
  [algorithmId: string]: {
    [levelId: string]: {
      completed: boolean;
      code: string;
      hintsUsed: number;
    };
  };
}
