// ファイルタイプ判定関数
export function isVueFile(filePath: string): boolean {
  return filePath.endsWith(".vue");
}

export function isTsxFile(filePath: string): boolean {
  return filePath.endsWith(".tsx");
}
