export {};

declare global {
  interface Window {
    ym?: (counterId: number, action: string, goalName: string, ...args: unknown[]) => void;
  }
}
