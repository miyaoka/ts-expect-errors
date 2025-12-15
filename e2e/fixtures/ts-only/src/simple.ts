// 型エラーを含むシンプルなファイル
const value: string = 123; // 数値を文字列型に代入

function greet(name: string) {
  console.log(`Hello, ${name}`);
}

greet(42); // 数値を文字列型の引数に渡す

const obj = { foo: 'bar' };
console.log(obj.baz); // 存在しないプロパティにアクセス