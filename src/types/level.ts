// Type definitions for levels and algorithms

// Simple test case used in MVP (string-based eval)
export interface SimpleTest {
  code: string;
  expected: any;
}

// Hints grouped by difficulty for MVP
export interface HintSet {
  easy: string[];
  medium: string[];
  hard: string[];
}

// Simple level schema matching current JSON structure
export interface SimpleLevel {
  id: string;
  order: number;
  title: string;
  description: string;
  exportName: string;
  starterCode: string;
  tests: SimpleTest[];
  hints: HintSet;
}

// Future: Structured test case (safer, no eval)
export interface StructuredTestCase {
  id: string;
  args: any[];
  expected: any;
  description: string;
  isHidden?: boolean;
}

// Future: Structured level (when migrating away from string eval)
export interface StructuredLevel {
  id: string;
  order: number;
  title: string;
  description: string;
  explanation: string;
  exportName: string;
  codeTemplate: string;
  solution: string;
  testCases: StructuredTestCase[];
  hints: string[];
  points: number;
}

export interface Algorithm {
  id: string;
  name: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  levels: SimpleLevel[];
}

export interface TestResult {
  pass: boolean;
  actual: any;
  expected: any;
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
