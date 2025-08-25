import { parse } from "@vue/compiler-sfc";
import { compile, NodeTypes } from "@vue/compiler-dom";
import { readFileSync, writeFileSync } from "node:fs";

/**
 * Vue ファイルのエラー処理仕様
 *
 * 基本方針：
 * 1. vue-tsc のエラーログから行列位置を取得
 * 2. その位置を含む最も内側（最小）の要素またはマスタッシュを AST から探す
 * 3. 見つかったノードの直前にコメントを挿入
 *
 * 重要：
 * - v-if などの属性エラーでも、その要素全体の直前にコメントを入れる
 * - マスタッシュエラーは、そのマスタッシュの直前にコメントを入れる
 * - エラー位置を含む最小のノードを選ぶ（外側の親要素ではない）
 *
 * 例：
 * エラー: <div v-if="undefinedVar"> の undefinedVar
 * → <div v-if="undefinedVar"> の直前にコメント
 *
 * エラー: {{ undefinedVar }} の undefinedVar
 * → {{ undefinedVar }} の直前にコメント
 *
 * エラー: <div>テキスト{{ error }}</div> の error
 * → {{ error }} の直前にコメント（div の前ではない）
 */

// TypeScriptエラー情報の型（core.tsと共通）
interface TsError {
  file: string;
  line: number;
  column: number;
  code: string;
  message: string;
}

/**
 * Vue ファイルのエラー抑制コメントを処理
 *
 * 処理順序：
 * 1. エラーを行ごとにグループ化
 * 2. 行番号の降順でソート（下から処理）
 * 3. script部のエラーを処理（行がずれるため先に処理）
 * 4. template部のエラーを処理（行がずれないため後で処理）
 *
 * @param filePath 対象の .vue ファイルパス
 * @param errors vue-tsc で検出されたエラーのリスト
 */
export function processVueExpectErrors(
  filePath: string,
  errors: TsError[]
): void {
  const source = readFileSync(filePath, "utf-8");
  const sfc = parse(source);

  // エラーを行ごとにグループ化
  const errorsByLine = new Map<number, TsError[]>();
  for (const error of errors) {
    const lineErrors = errorsByLine.get(error.line) || [];
    lineErrors.push(error);
    errorsByLine.set(error.line, lineErrors);
  }

  // 行ごとのエラーを配列に変換し、各行のエラーは列番号降順でソート
  const errorLines: Array<{ line: number; errors: TsError[] }> = [];
  for (const [line, lineErrors] of errorsByLine) {
    // 同一行のエラーは列番号の降順でソート（右から処理）
    lineErrors.sort((a, b) => b.column - a.column);
    errorLines.push({ line, errors: lineErrors });
  }

  // 行番号の降順でソート（下から処理）
  errorLines.sort((a, b) => b.line - a.line);

  // エラーをtemplate部とscript部に分類
  const templateErrorLines: Array<{ line: number; errors: TsError[] }> = [];
  const scriptSetupErrorLines: Array<{ line: number; errors: TsError[] }> = [];
  const scriptErrorLines: Array<{ line: number; errors: TsError[] }> = [];

  for (const errorLine of errorLines) {
    if (
      sfc.descriptor.template &&
      isInRange(errorLine.line, sfc.descriptor.template.loc)
    ) {
      templateErrorLines.push(errorLine);
      continue;
    }
    
    if (
      sfc.descriptor.scriptSetup &&
      isInRange(errorLine.line, sfc.descriptor.scriptSetup.loc)
    ) {
      scriptSetupErrorLines.push(errorLine);
      continue;
    }
    
    if (
      sfc.descriptor.script &&
      isInRange(errorLine.line, sfc.descriptor.script.loc)
    ) {
      scriptErrorLines.push(errorLine);
    }
  }

  let result = source;

  // script部のエラー処理（先に処理。行がずれるため）
  // script setup部のエラー処理
  if (scriptSetupErrorLines.length > 0 && sfc.descriptor.scriptSetup) {
    result = processScriptErrors(
      result,
      sfc.descriptor.scriptSetup,
      scriptSetupErrorLines
    );
  }

  // script部のエラー処理
  if (scriptErrorLines.length > 0 && sfc.descriptor.script) {
    result = processScriptErrors(
      result,
      sfc.descriptor.script,
      scriptErrorLines
    );
  }

  // template部のエラー処理（最後に処理。行がずれないため）
  if (templateErrorLines.length > 0 && sfc.descriptor.template) {
    result = processTemplateErrors(
      result,
      sfc.descriptor.template,
      templateErrorLines
    );
  }

  writeFileSync(filePath, result);
}

/**
 * 行番号が指定範囲内かチェック
 */
function isInRange(
  line: number,
  loc: { start: { line: number }; end: { line: number } }
): boolean {
  return line >= loc.start.line && line <= loc.end.line;
}

/**
 * template部のエラー処理
 *
 * 処理内容：
 * - 同一行の各エラーすべてに対して処理
 * - 各エラー位置の直近の親要素またはマスタッシュの直前にコメント挿入
 * - 行がずれないため、右から処理（列番号降順）
 *
 * @param source ファイル全体のソース
 * @param template templateディスクリプタ
 * @param errorLines 行ごとにグループ化されたエラー（行番号降順）
 */
function processTemplateErrors(
  source: string,
  template: any,
  errorLines: Array<{ line: number; errors: TsError[] }>
): string {
  // templateのASTを解析
  const compileResult = compile(template.content, {
    onError: () => {}, // エラーを無視
  });

  // compileの結果はastプロパティを含むオブジェクト
  const ast = compileResult.ast;

  let result = source;
  const lines = result.split("\n");

  // templateの開始行（0ベース）
  const templateStartLine = template.loc.start.line - 1;

  // 処理済みの位置を追跡（同じ位置に複数のコメントを入れないため）
  const processedPositions = new Set<string>();

  // 各行のエラーを処理（行番号降順）
  for (const { line, errors } of errorLines) {
    // TS2578エラー（不要な@vue-expect-error）の場合は削除
    if (errors.some((e) => e.code === "TS2578")) {
      const lineIndex = line - 1;
      const lineContent = lines[lineIndex];
      if (lineContent) {
        // @vue-expect-errorコメントを削除
        const vueCommentPattern =
          /<!--\s*@vue-expect-error(?:\s+TS\d+)?\s*-->/g;
        const newContent = lineContent.replace(vueCommentPattern, "");
        // 空行になる場合は削除
        if (newContent.trim() === "") {
          lines.splice(lineIndex, 1);
          continue;
        }
        lines[lineIndex] = newContent;
      }
      continue;
    }
    // 同一行の各エラーを処理（列番号降順）
    for (const error of errors) {
      // template内での相対行番号（1ベース）
      const relativeLineInTemplate = error.line - template.loc.start.line + 1;

      // エラー位置を含むノードを探す
      const targetNode = findNodeAtPosition(
        ast,
        relativeLineInTemplate,
        error.column
      );

      if (targetNode) {
        // コメント挿入位置を決定
        const insertLine = templateStartLine + targetNode.loc.start.line - 1;
        const insertColumn = targetNode.loc.start.column - 1;
        const positionKey = `${insertLine}:${insertColumn}`;

        // 既に処理済みの位置はスキップ
        if (processedPositions.has(positionKey)) {
          continue;
        }

        // 既存のコメントをチェック（挿入位置周辺も確認）
        const lineContent = lines[insertLine];
        if (lineContent) {
          // 挿入位置の前後30文字をチェック
          const checkStart = Math.max(0, insertColumn - 30);
          const checkEnd = Math.min(lineContent.length, insertColumn + 30);
          const nearbyContent = lineContent.slice(checkStart, checkEnd);
          if (nearbyContent.includes("@vue-expect-error")) {
            continue;
          }
        }

        // コメントを挿入
        const comment = `<!-- @vue-expect-error -->`;

        // 同一行にコメントを挿入
        if (lineContent) {
          const before = lineContent.slice(0, insertColumn);
          const after = lineContent.slice(insertColumn);
          lines[insertLine] = before + comment + after;
        }

        processedPositions.add(positionKey);
      }
    }
  }

  return lines.join("\n");
}

/**
 * script部のエラー処理
 *
 * 処理内容：
 * - 同一行に複数エラーがある場合は先頭（最小列番号）のエラーのみ処理
 * - エラー行の前の行に @ts-expect-error コメントを挿入
 * - 行がずれるため、下から処理（行番号降順）
 *
 * @param source ファイル全体のソース
 * @param script scriptディスクリプタ
 * @param errorLines 行ごとにグループ化されたエラー（行番号降順）
 */
function processScriptErrors(
  source: string,
  script: any,
  errorLines: Array<{ line: number; errors: TsError[] }>
): string {
  const lines = source.split("\n");

  for (const { line, errors } of errorLines) {
    const lineIndex = line - 1;

    // TS2578エラー（不要な@ts-expect-error）の場合は削除
    if (errors.some((e) => e.code === "TS2578")) {
      // 該当行を削除（0ベースインデックス）
      lines.splice(lineIndex, 1);
      continue;
    }

    const lineContent = lines[lineIndex];

    // 既に@ts-expect-errorがある行はスキップ
    if (lineContent && lineContent.includes("@ts-expect-error")) {
      continue;
    }

    // 同一行の複数エラーから先頭（最小列番号）のエラーを取得
    // errorsは列番号降順なので、最後の要素が最小列番号
    const firstError = errors.at(-1);
    if (!firstError) continue;

    // インデントを取得
    const indent = lineContent?.match(/^(\s*)/)?.[1] || "";

    // コメントを挿入
    const comment = `${indent}// @ts-expect-error TS${firstError.code}`;
    lines.splice(lineIndex, 0, comment);
  }

  return lines.join("\n");
}

/**
 * エラー位置を含むノードを探す
 * @param node ASTノード
 * @param line エラー行（template内での相対位置、1ベース）
 * @param column エラー列（1ベース）
 * @returns エラー位置を含む最も深いノード、またはnull
 */
function findNodeAtPosition(
  node: any,
  line: number,
  column: number,
  depth: number = 0
): any {
  if (!node || !node.loc) {
    return null;
  }

  const { start, end } = node.loc;

  // エラー行のノードは全探索する
  // loc範囲チェックは最後に行う

  // 全ての子ノードを探索
  let bestChild = null;

  // IFノードのbranches
  if (node.branches) {
    for (const branch of node.branches) {
      const result = findNodeAtPosition(branch, line, column, depth + 1);
      if (result) bestChild = result;
    }
  }

  // 通常のchildren
  if (node.children && Array.isArray(node.children)) {
    for (const child of node.children) {
      if (typeof child === "object" && child !== null) {
        const result = findNodeAtPosition(child, line, column, depth + 1);
        if (result) bestChild = result;
      }
    }
  }

  // TEXT_CALLのcontent
  if ((node as any).content) {
    const result = findNodeAtPosition(
      (node as any).content,
      line,
      column,
      depth + 1
    );
    if (result) bestChild = result;
  }

  // IF_BRANCHのcondition
  if (node.type === NodeTypes.IF_BRANCH && node.condition) {
    const condLoc = node.condition.loc;
    if (condLoc) {
      const condContainsError =
        (line > condLoc.start.line ||
          (line === condLoc.start.line && column >= condLoc.start.column)) &&
        (line < condLoc.end.line ||
          (line === condLoc.end.line && column <= condLoc.end.column));
      if (condContainsError) {
        // conditionにエラーが含まれる場合、IFノードを返す
        return node;
      }
    }
  }

  // 子ノードが見つかった場合
  if (bestChild) {
    // v-if/v-for属性エラーの場合、親のIF/FORノードを返す
    if (
      bestChild.type === NodeTypes.ELEMENT &&
      isErrorInAttribute(bestChild, line, column)
    ) {
      if (node.type === NodeTypes.IF || node.type === NodeTypes.FOR) {
        return node;
      }
    }
    return bestChild;
  }

  // 子ノードがない場合、エラー行と一致するノードのみ返す
  // 行が一致する場合のみノードを返す
  if (line !== start.line && line !== end.line) {
    // エラー行がノードの開始行でも終了行でもない場合
    const isInRange = line > start.line && line < end.line;
    if (!isInRange) {
      return null;
    }
  }

  // エラー位置を正確に含むか確認
  const isInRange =
    (line > start.line || (line === start.line && column >= start.column)) &&
    (line < end.line || (line === end.line && column <= end.column));

  if (!isInRange) {
    return null;
  }

  // ノードタイプ別の判定
  if (
    node.type === NodeTypes.INTERPOLATION ||
    node.type === NodeTypes.TEXT ||
    node.type === NodeTypes.COMMENT
  ) {
    return node;
  }

  if (
    node.type === NodeTypes.ELEMENT &&
    isErrorInAttribute(node, line, column)
  ) {
    return node;
  }

  return null;
}

/**
 * エラーが要素の属性部分にあるかチェック
 */
function isErrorInAttribute(
  element: any,
  line: number,
  column: number
): boolean {
  if (element.type !== NodeTypes.ELEMENT) {
    return false;
  }

  // 要素の開始タグ内かつ、子要素の前であれば属性エラーと判定
  const { start } = element.loc;

  // 子要素がある場合、その開始位置を取得
  let childStartColumn = element.loc.end.column;
  if (element.children && element.children.length > 0) {
    const firstChild = element.children[0];
    if (
      typeof firstChild === "object" &&
      firstChild !== null &&
      firstChild.loc
    ) {
      childStartColumn = firstChild.loc.start.column;
    }
  }

  // エラーが開始タグ内にある場合
  return (
    line === start.line && column >= start.column && column < childStartColumn
  );
}
