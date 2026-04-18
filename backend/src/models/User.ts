export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  apiKey: string;
  createdAt: number;
}
