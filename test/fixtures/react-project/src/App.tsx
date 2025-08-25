import React from "react";

interface Props {
  name: string;
  age: number;
}

export const App: React.FC<Props> = ({ name, age }) => {
  // 型エラー: numberをstringに代入
  const message: string = age;

  // expect済み
  // @ts-expect-error TS2322
  const message2: string = age;

  // エラーではないところにexpect
  // @ts-expect-error TS2322
  const message3: number = age;

  return (
    <div>
      {/* 型エラー: 必須プロパティの不足 */}
      <UserCard name="John" />
    </div>
  );
};

const UserCard: React.FC<Props> = ({ name, age }) => {
  return (
    <>
      <div>
        {/* 同一行に複数エラー */}
        {name2} ({age2})
      </div>
      <div>
        {/* エラーexpect済み */}
        {/* @ts-expect-error TS2552 */}
        {name2} ({age2})
      </div>
      <div>
        {/* エラーでないところにexpect-error */}
        {/* @ts-expect-error TS2552 */}
        {name} ({age})
      </div>
    </>
  );
};
