export interface User {
  id: number;
  name: string;
  email: string;
}

export function createUser(name: string): User {
  return {
    id: '1', // 型エラー: string を number に
    name: name,
    email: 123 // 型エラー: number を string に
  };
}