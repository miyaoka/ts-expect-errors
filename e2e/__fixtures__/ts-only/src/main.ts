import { User, createUser } from "./user";

const user: User = createUser(42); // 型エラー: number を string に

const numbers: number[] = [1, 2, "3"]; // 型エラー: string を number[] に

// 既にexpectされているところは重複してexpectされないこと
// @ts-expect-error TS2322: Type 'string' is not assignable to type 'number'.
const errorNumbers: number[] = [1, 2, "3"]; // 型エラー: string を number[] に

// expectされているのに型が正常な場合はコメントが削除されること
// @ts-expect-error TS2322: Type 'string' is not assignable to type 'number'.
const correctNumbers: number[] = [1, 2, 3]; // 正常な型

// 存在しないメソッドを呼ぶ
user.save(); // 型エラー: save メソッドは存在しない
