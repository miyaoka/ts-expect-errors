import * as ts from "typescript";
import { readFileSync } from "node:fs";
import { type Range } from "./range-utils";


/**
 * TSXファイル解析結果
 */
export interface TsxParseResult {
  content: string;
  lines: string[];
  sourceFile: ts.SourceFile;
  jsxRanges: Range[];
}

/**
 * TSXファイルを解析
 */
export function parseTsxFile(filePath: string): TsxParseResult {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  
  // ソースファイルを作成
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
  
  // JSX要素の範囲を収集
  const jsxRanges = collectJsxRanges(sourceFile);
  
  return {
    content,
    lines,
    sourceFile,
    jsxRanges
  };
}

/**
 * TSXファイルからJSX要素の範囲を収集
 */
export function collectJsxRanges(sourceFile: ts.SourceFile): Range[] {
  const jsxRanges: Range[] = [];

  function collect(node: ts.Node): void {
    // JSX要素（通常のJSX、自己完結型、Fragment）の範囲を収集
    if (
      ts.isJsxElement(node) ||
      ts.isJsxSelfClosingElement(node) ||
      ts.isJsxFragment(node)
    ) {
      const start = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
      const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1;
      jsxRanges.push({ start, end });
    }
    ts.forEachChild(node, collect);
  }

  collect(sourceFile);
  return jsxRanges;
}

