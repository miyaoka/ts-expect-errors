import { parse } from "@vue/compiler-sfc";
import {
  compile,
  NodeTypes,
  type RootNode,
  type TemplateChildNode,
  type ElementNode,
} from "@vue/compiler-dom";
import { readFileSync, writeFileSync } from "node:fs";
import { isInRanges, getVueSectionRanges } from "../../../utils/range-utils";
import type { TsError } from "../core";

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

/**
 * Vue ファイルのエラー抑制コメントを処理
 *
 * 処理順序：
 * 1. エラーを行ごとにグループ化
 * 2. 行番号の降順でソート（下から処理して行番号のずれを防ぐ）
 * 3. 各行のエラーを処理：
 *    - template部: インラインでコメント挿入（同一位置への重複挿入を防ぐ）
 *    - script部: 前の行にコメント挿入
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
  const lines = source.split("\n");

  // templateのASTを一度だけコンパイル
  const templateAst = sfc.descriptor.template
    ? compile(sfc.descriptor.template.content, {
        onError: () => {}, // エラーを無視
      }).ast
    : null;

  // エラーを行ごとにグループ化
  const errorsByLine = new Map<number, TsError[]>();
  for (const error of errors) {
    const existing = errorsByLine.get(error.line) || [];
    existing.push(error);
    errorsByLine.set(error.line, existing);
  }

  // 行番号を降順でソート（後ろから処理することで行番号がずれない）
  const sortedLines = Array.from(errorsByLine.keys()).sort((a, b) => b - a);

  // 各セクションの範囲を事前に定義
  const { templateRanges, scriptRanges } = getVueSectionRanges(sfc.descriptor);

  // template部で処理済みの位置を記録（同一位置への重複挿入を防ぐ）
  const templateProcessedPositions = new Set<string>();

  for (const lineNum of sortedLines) {
    const lineErrors = errorsByLine.get(lineNum);
    if (!lineErrors) continue;

    // template部の処理
    if (isInRanges(lineNum, templateRanges)) {
      // TS2578エラー（不要な@vue-expect-error）の場合は削除
      if (lineErrors.some((e) => e.code === "TS2578")) {
        const lineContent = lines[lineNum - 1];
        if (lineContent) {
          // @vue-expect-errorコメントを削除
          const vueCommentPattern =
            /<!--\s*@vue-expect-error(?:\s+TS\d+)?\s*-->/g;
          const newContent = lineContent.replace(vueCommentPattern, "");
          lines[lineNum - 1] = newContent;
        }
        continue;
      }

      // template内でのエラー処理（インラインコメント挿入）
      if (templateAst) {
        processTemplateLineErrors(
          lines,
          lineErrors,
          sfc.descriptor.template,
          templateAst,
          filePath,
          templateProcessedPositions
        );
      }
      continue;
    }

    // script/script setup部の処理
    if (isInRanges(lineNum, scriptRanges)) {
      // TS2578エラー（不要な@ts-expect-error）の場合は削除
      if (lineErrors.some((e) => e.code === "TS2578")) {
        lines.splice(lineNum - 1, 1);
        continue;
      }

      // script内でのエラー処理（前の行にコメント挿入）
      const index = lineNum - 1;
      const targetLine = lines[index];
      const indent = targetLine?.match(/^(\s*)/)?.[1] || "";
      const firstError = lineErrors[0];
      if (firstError) {
        const comment = `${indent}// @ts-expect-error ${firstError.code}`;
        lines.splice(index, 0, comment);
      }
      continue;
    }

    // いずれのセクションにも属さない場合は無視
  }

  // ファイルを更新
  writeFileSync(filePath, lines.join("\n"));
}

/**
 * template部の1行のエラー処理
 */
function processTemplateLineErrors(
  lines: string[],
  lineErrors: TsError[],
  template: any,
  ast: RootNode,
  filePath: string,
  processedPositions: Set<string>
): void {
  // templateの開始行（1ベース）
  const templateStartLine = template.loc.start.line;

  // 同一行の各エラーを処理（列番号降順）
  const sortedErrors = lineErrors.sort((a, b) => b.column - a.column);

  for (const error of sortedErrors) {
    // template内での相対行番号（1ベース）
    const relativeLineInTemplate = error.line - template.loc.start.line + 1;

    // エラー位置を含むノードを探す
    const targetNode = findNodeAtPosition(
      ast,
      relativeLineInTemplate,
      error.column,
      0,
      filePath
    );

    if (targetNode) {
      // エラー位置（ファイル全体での行番号、1ベース）
      let errorLine: number;
      let errorColumn: number;

      // 属性エラーの場合は要素の開始位置を使用
      if (
        targetNode.type === NodeTypes.ELEMENT &&
        isErrorInAttribute(targetNode, relativeLineInTemplate, error.column)
      ) {
        // 属性エラーの場合、要素の開始位置を使用
        errorLine = templateStartLine + targetNode.loc.start.line - 1;
        errorColumn = targetNode.loc.start.column;
      } else {
        // それ以外（マスタッシュなど）の場合、ノードの開始位置を使用
        errorLine = templateStartLine + targetNode.loc.start.line - 1;
        errorColumn = targetNode.loc.start.column;
      }

      // 位置をキーとして使用
      const positionKey = `${errorLine}:${errorColumn}`;

      // 同一位置に既にコメントを挿入済みの場合はスキップ（複数属性エラーなどは要素に対して単一コメントにする）
      if (processedPositions.has(positionKey)) {
        continue;
      }
      processedPositions.add(positionKey);

      // 配列・文字列操作用インデックス（0ベース）
      const lineIndex = errorLine - 1;
      const columnIndex = errorColumn - 1;

      // コメントを挿入
      const comment = `<!-- @vue-expect-error ${error.code} -->`;

      // 同一行にコメントを挿入
      const lineContent = lines[lineIndex];
      if (lineContent) {
        const before = lineContent.slice(0, columnIndex);
        const after = lineContent.slice(columnIndex);
        lines[lineIndex] = before + comment + after;
      }
    }
  }
}

/**
 * エラー位置を含むノードを探す
 * @param node ASTノード
 * @param line エラー行（template内での相対位置、1ベース）
 * @param column エラー列（1ベース）
 * @param parentIfNode v-else/v-else-ifのエラーの場合に親のIFノードを返すため
 * @returns エラー位置を含む最も深いノード、またはnull
 */
function findNodeAtPosition(
  node: TemplateChildNode | RootNode,
  line: number,
  column: number,
  depth: number = 0,
  filePath: string = "",
  parentIfNode: TemplateChildNode | null = null
): TemplateChildNode | null {
  if (!node || !node.loc) {
    return null;
  }

  const { start, end } = node.loc;

  // エラー行のノードは全探索する
  // loc範囲チェックは最後に行う

  // 全ての子ノードを探索
  let bestChild = null;

  // IFノードのbranches
  if (node.type === NodeTypes.IF && node.branches) {
    for (let i = 0; i < node.branches.length; i++) {
      const branch = node.branches[i];
      if (branch) {
        // v-else/v-else-ifのブランチ（index > 0）の場合、IFノードを親として渡す
        const isElseBranch = i > 0;
        const result = findNodeAtPosition(
          branch,
          line,
          column,
          depth + 1,
          filePath,
          isElseBranch ? node : parentIfNode // v-else/v-else-ifの場合はIFノードを、そうでない場合は現在のparentIfNodeを渡す
        );
        if (result) bestChild = result;
      }
    }
  }

  // 通常のchildren（ROOT, ELEMENT, IF_BRANCH, FOR, COMPOUNDなど）
  if ("children" in node && node.children && Array.isArray(node.children)) {
    for (const child of node.children) {
      // CompoundExpressionNodeのchildrenにはSimpleExpressionNodeや文字列も含まれる
      // SimpleExpressionNodeはTemplateChildNodeではないのでスキップ
      if (
        typeof child === "object" &&
        child !== null &&
        child.type !== NodeTypes.SIMPLE_EXPRESSION
      ) {
        const result = findNodeAtPosition(
          child,
          line,
          column,
          depth + 1,
          filePath,
          parentIfNode
        );
        if (result) bestChild = result;
      }
    }
  }

  // TEXT_CALLのcontent（InterpolationNodeを持つ）
  if (node.type === NodeTypes.TEXT_CALL) {
    const result = findNodeAtPosition(
      node.content,
      line,
      column,
      depth + 1,
      filePath,
      parentIfNode
    );
    if (result) bestChild = result;
  }

  // IF_BRANCHのcondition
  if (node.type === NodeTypes.IF_BRANCH) {
    const condLoc = node.condition?.loc;
    if (condLoc) {
      const condContainsError =
        (line > condLoc.start.line ||
          (line === condLoc.start.line && column >= condLoc.start.column)) &&
        (line < condLoc.end.line ||
          (line === condLoc.end.line && column <= condLoc.end.column));
      if (condContainsError) {
        // v-else-if/v-elseのconditionエラーの場合、親のIFノードを返す
        if (parentIfNode) {
          return parentIfNode;
        }
        // v-ifのconditionエラーの場合、IF_BRANCHノードを返す
        return node;
      }
    }

    // v-else/v-else-ifブランチの直接の子要素（v-else/v-else-if要素自体）のエラーの場合
    // 各要素の直前にコメントを挿入する必要があるため、要素自体を返す
    if (parentIfNode && node.children && node.children.length > 0) {
      const firstChild = node.children[0];
      if (
        firstChild &&
        firstChild.type === NodeTypes.ELEMENT &&
        firstChild.loc
      ) {
        // この要素の属性エラーかチェック
        if (isErrorInAttribute(firstChild, line, column)) {
          return firstChild;
        }
      }
    }
  }

  // 子ノードが見つかった場合
  if (bestChild) {
    // 子ノードをそのまま返す
    // IFノードやFORノードに遡らない
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

  // ELEMENTの属性エラーの判定を先に行う
  if (node.type === NodeTypes.ELEMENT) {
    if (isErrorInAttribute(node, line, column)) {
      return node;
    }
  }

  // ROOTノードは返さない
  if (node.type === NodeTypes.ROOT) {
    return null;
  }

  // この時点でnodeはTemplateChildNodeのいずれか
  return node;
}

/**
 * エラーが要素の属性部分にあるかチェック
 */
function isErrorInAttribute(
  element: ElementNode,
  line: number,
  column: number
): boolean {
  const { start, end } = element.loc;

  // 要素が複数行にまたがる場合
  if (start.line !== end.line) {
    // エラー行が要素の開始行と終了行の間にある場合
    if (line > start.line && line < end.line) {
      // 子要素がある場合、子要素の開始より前ならば属性エラー
      if (element.children && element.children.length > 0) {
        const firstChild = element.children[0];
        if (
          typeof firstChild === "object" &&
          firstChild !== null &&
          firstChild.loc
        ) {
          // エラーが子要素の開始行より前、または同じ行で子要素の開始列より前
          return (
            line < firstChild.loc.start.line ||
            (line === firstChild.loc.start.line &&
              column < firstChild.loc.start.column)
          );
        }
      }
      // 子要素がない場合は属性エラーと判定
      return true;
    }
    // エラーが開始行にある場合
    if (line === start.line) {
      return column >= start.column;
    }
    // エラーが終了行にある場合（閉じタグなど）、属性エラーではない
    return false;
  }

  // 単一行の要素の場合
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
