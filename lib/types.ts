import type { EventInput, TaskInput } from "./validation";
export type Task = TaskInput & {
  id: string;
  generated: boolean;
  customized?: boolean;
};
export type Category = {
  id: string;
  name: string;
  allocated: number;
  estimated: number;
  priority: string;
  reasoning: string;
};
export type Vendor = {
  id: string;
  name: string;
  status: string;
  estimatedCost: number;
  bookingDeadline: string;
  selectionCriteria: string[];
  questions: string[];
  notes: string;
};
export type Idea = {
  id: string;
  category: string;
  idea: string;
  reason: string;
  impact: string;
  estimatedCost: number;
  priority: string;
};
export type Risk = {
  id: string;
  title: string;
  severity: string;
  probability: string;
  impact: string;
  reason: string;
  action: string;
};
export type Timeline = {
  id: string;
  title: string;
  category: string;
  dueDate: string;
  priority: string;
  status: string;
  dependencies: string[];
};
export type Action = {
  id?: string;
  tool: string;
  summary: string;
  createdAt?: string;
};
export type Message = {
  id?: string;
  role: string;
  content: string;
  createdAt?: string;
};
export type EventState = EventInput & {
  id: string;
  version: number;
  updatedAt: string;
  suppressedTaskIds: string[];
  budgetOverrides: Record<string, number>;
  categories: Category[];
  contingency: number;
  tasks: Task[];
  timeline: Timeline[];
  vendors: Vendor[];
  recommendations: Idea[];
  risks: Risk[];
  messages: Message[];
  actions: Action[];
  progress: number;
};
