# Vue Template AST構造

## 基本構造

### マスタッシュのみの場合: `<div>{{ error }}</div>`

```
ROOT (type: 0)
└── children[]
    └── ELEMENT (type: 1, tag: "div")
        └── children[]
            └── INTERPOLATION (type: 5)
                └── content: SIMPLE_EXPRESSION (type: 4, content: "_ctx.error")
```

位置情報:
- ELEMENT: 行1列1-23
- INTERPOLATION: 行1列6-17 (`{{ error }}`)
- content: 行1列9-14 (`error`)

### テキストとマスタッシュが混在する場合: `<div>条件付きコンテンツ{{ error }}</div>`

```
ROOT (type: 0)
└── children[]
    └── ELEMENT (type: 1, tag: "div")
        └── children[]
            └── COMPOUND_EXPRESSION (type: 8)
                └── children[]
                    ├── TEXT (type: 2, content: "条件付きコンテンツ")
                    ├── " + " (文字列リテラル)
                    └── INTERPOLATION (type: 5)
                        └── content: SIMPLE_EXPRESSION (type: 4, content: "_ctx.error")
```

位置情報:
- ELEMENT: 行1列1-32
- COMPOUND_EXPRESSION: 行1列6-15 (テキスト部分のみの範囲)
- TEXT: 行1列6-15 (`条件付きコンテンツ`)
- INTERPOLATION: 行1列15-26 (`{{ error }}`)
- content: 行1列18-23 (`error`)

**重要**: COMPOUND_EXPRESSIONのchildren配列には:
- ノードオブジェクト（TEXT、INTERPOLATION）
- 文字列リテラル（" + "）
が混在する

### v-ifありの場合: `<div v-if="condition">{{ error }}</div>`

```
ROOT (type: 0)
└── children[]
    └── IF (type: 9)
        └── branches[]
            └── IF_BRANCH (type: 10)
                ├── condition: SIMPLE_EXPRESSION (type: 4, content: "_ctx.condition")
                └── children[]
                    └── ELEMENT (type: 1, tag: "div")
                        └── children[]
                            └── INTERPOLATION (type: 5)
                                └── content: SIMPLE_EXPRESSION (type: 4, content: "_ctx.error")
```

位置情報:
- IF: 行1列1-40
- IF_BRANCH: 行1列1-40
- condition: 行1列12-21 (`condition`)
- ELEMENT: 行1列1-40
- INTERPOLATION: 行1列23-34 (`{{ error }}`)
- content: 行1列26-31 (`error`)

## 重要な違い

1. **マスタッシュのみ**: ELEMENTの直下にINTERPOLATION
2. **テキスト混在**: ELEMENTの直下にCOMPOUND_EXPRESSION → その中にTEXTとINTERPOLATION
3. **v-ifあり**: IFノード → branchesプロパティ → IF_BRANCHノード → childrenプロパティ → ELEMENTノード

### ネストしたdivの場合: `<div><div>{{ error }}</div></div>`

```
ROOT (type: 0)
└── children[]
    └── ELEMENT (type: 1, tag: "div")  // 外側のdiv
        └── children[]
            └── ELEMENT (type: 1, tag: "div")  // 内側のdiv
                └── children[]
                    └── INTERPOLATION (type: 5)
                        └── content: SIMPLE_EXPRESSION (type: 4, content: "_ctx.error")
```

位置情報:
- 外側のELEMENT: 行1列1-34
- 内側のELEMENT: 行1列6-28
- INTERPOLATION: 行1列11-22 (`{{ error }}`)
- content: 行1列14-19 (`error`)

### カスタムコンポーネントにv-modelの場合: `<UserCard v-model="userInput">{{ error }}</UserCard>`

```
ROOT (type: 0)
└── children[]
    └── ELEMENT (type: 1, tag: "UserCard", tagType: 1)
        ├── props[]
        │   └── DIRECTIVE (type: 7, name: "model")
        │       └── exp: SIMPLE_EXPRESSION (type: 4, content: "_ctx.userInput")
        └── children[]
            └── TEXT_CALL (type: 12)
                └── content: INTERPOLATION (type: 5)
                    └── content: SIMPLE_EXPRESSION (type: 4, content: "_ctx.error")
```

位置情報:
- ELEMENT: 行1列1-53
- DIRECTIVE: 行1列11-30 (`v-model="userInput"`)
- exp: 行1列20-29 (`userInput`)
- TEXT_CALL: 行1列31-42
- INTERPOLATION: 行1列31-42 (`{{ error }}`)
- content: 行1列34-39 (`error`)

**重要**: 
- カスタムコンポーネントは`tagType: 1`（通常のHTML要素は`tagType: 0`）
- v-modelはpropsの中にDIRECTIVEとして格納される
- コンポーネント内のコンテンツはTEXT_CALLノードとしてchildrenに入る
- v-modelはIFのような構造変化を起こさない

## v-ifとテキスト混在: `<div v-if="condition">条件付きコンテンツ{{ error }}</div>`

```
ROOT (type: 0)
└── children[]
    └── IF (type: 9)
        └── branches[]
            └── IF_BRANCH (type: 10)
                ├── condition: SIMPLE_EXPRESSION (type: 4)
                └── children[]
                    └── ELEMENT (type: 1, tag: "div")
                        └── children[]
                            └── COMPOUND_EXPRESSION (type: 8)
                                └── children[]
                                    ├── TEXT (type: 2, content: "条件付きコンテンツ")
                                    ├── " + " (文字列リテラル)
                                    └── INTERPOLATION (type: 5)
```

**重要**: v-ifがあってもテキストとマスタッシュが混在する場合はCOMPOUND_EXPRESSIONになる

## v-for: `<div v-for="item in items">{{ item }}</div>`

```
ROOT (type: 0)
└── children[]
    └── FOR (type: 11)
        ├── source: SIMPLE_EXPRESSION (type: 4, content: "_ctx.items")
        ├── valueAlias: "item"
        └── children[]
            └── ELEMENT (type: 1, tag: "div")
                └── children[]
                    └── INTERPOLATION (type: 5)
```

## 複数の子要素: `<div>{{ error1 }} text {{ error2 }}</div>`

```
ROOT (type: 0)
└── children[]
    └── ELEMENT (type: 1, tag: "div")
        └── children[]
            └── COMPOUND_EXPRESSION (type: 8)
                └── children[]
                    ├── INTERPOLATION (type: 5, content: "_ctx.error1")
                    ├── " + " (文字列リテラル)
                    ├── TEXT (type: 2, content: " text ")
                    ├── " + " (文字列リテラル)
                    └── INTERPOLATION (type: 5, content: "_ctx.error2")
```

**重要**: 複数のマスタッシュとテキストは1つのCOMPOUND_EXPRESSIONにまとめられる

## 属性バインディング: `<div :class="className">{{ error }}</div>`

```
ROOT (type: 0)
└── children[]
    └── ELEMENT (type: 1, tag: "div")
        ├── props[]
        │   └── DIRECTIVE (type: 7, name: "bind", arg: "class")
        │       └── exp: SIMPLE_EXPRESSION (type: 4, content: "_ctx.className")
        └── children[]
            └── INTERPOLATION (type: 5)
```

## イベントハンドラ: `<div @click="handler">{{ error }}</div>`

```
ROOT (type: 0)
└── children[]
    └── ELEMENT (type: 1, tag: "div")
        ├── props[]
        │   └── DIRECTIVE (type: 7, name: "on", arg: "click")
        │       └── exp: SIMPLE_EXPRESSION (type: 4, content: "_ctx.handler")
        └── children[]
            └── INTERPOLATION (type: 5)
```

## v-if, v-else-if, v-else

```html
<div v-if="cond1">{{ error1 }}</div>
<div v-else-if="cond2">{{ error2 }}</div>
<div v-else>{{ error3 }}</div>
```

```
ROOT (type: 0)
└── children[]
    └── IF (type: 9)  // 1つのIFノードにまとめられる
        └── branches[]  // 3つの分岐が配列に入る
            ├── IF_BRANCH (type: 10)  // v-if
            │   ├── condition: SIMPLE_EXPRESSION (type: 4, content: "_ctx.cond1")
            │   └── children[]
            │       └── ELEMENT (type: 1, tag: "div")
            │           └── children[]
            │               └── INTERPOLATION (type: 5, content: "_ctx.error1")
            ├── IF_BRANCH (type: 10)  // v-else-if
            │   ├── condition: SIMPLE_EXPRESSION (type: 4, content: "_ctx.cond2")
            │   └── children[]
            │       └── ELEMENT (type: 1, tag: "div")
            │           └── children[]
            │               └── INTERPOLATION (type: 5, content: "_ctx.error2")
            └── IF_BRANCH (type: 10)  // v-else
                ├── condition: undefined  // v-elseはconditionがundefined
                └── children[]
                    └── ELEMENT (type: 1, tag: "div")
                        └── children[]
                            └── INTERPOLATION (type: 5, content: "_ctx.error3")
```

**重要**: 
- v-if, v-else-if, v-elseは別々の要素でも、1つのIFノードにまとめられる
- branches配列に全ての分岐が順番に入る
- v-elseのIF_BRANCHはconditionがundefined

## AST探索の要点

1. **COMPOUND_EXPRESSION**は以下の場合に生成される：
   - テキストとマスタッシュが混在
   - 複数のマスタッシュが存在
   - v-ifの中でもテキストとマスタッシュが混在すれば生成される

2. **COMPOUND_EXPRESSIONのchildren**には：
   - ノードオブジェクト（TEXT、INTERPOLATION）
   - 文字列リテラル（" + "）
   が混在する

3. **構造変化を起こすディレクティブ**：
   - v-if → IFノード
   - v-for → FORノード
   - v-model、:class、@clickなど → propsに入るだけで構造は変わらない

## NodeTypes

### テンプレートAST用（0-12）
- 0: ROOT - ルートノード
- 1: ELEMENT - HTML要素またはコンポーネント
- 2: TEXT - テキストノード
- 3: COMMENT - コメントノード
- 4: SIMPLE_EXPRESSION - 単純な式
- 5: INTERPOLATION - マスタッシュ `{{ }}`
- 6: ATTRIBUTE - 静的属性
- 7: DIRECTIVE - ディレクティブ (v-if, v-for, v-model, @click, :class など)
- 8: COMPOUND_EXPRESSION - 複合式（テキストとマスタッシュが混在）
- 9: IF - v-ifディレクティブのルートノード
- 10: IF_BRANCH - v-if/v-else-if/v-elseの各分岐
- 11: FOR - v-forディレクティブのノード
- 12: TEXT_CALL - コンポーネントスロット内のテキスト

### コード生成用（13-26）
- 13: VNODE_CALL - VNode生成の呼び出し
- 14: JS_CALL_EXPRESSION - JavaScript関数呼び出し
- 15: JS_OBJECT_EXPRESSION - JavaScriptオブジェクト
- 16: JS_PROPERTY - JavaScriptプロパティ
- 17: JS_ARRAY_EXPRESSION - JavaScript配列
- 18: JS_FUNCTION_EXPRESSION - JavaScript関数式
- 19: JS_CONDITIONAL_EXPRESSION - JavaScript三項演算子
- 20: JS_CACHE_EXPRESSION - キャッシュ式
- 21: JS_BLOCK_STATEMENT - JavaScriptブロック文
- 22: JS_TEMPLATE_LITERAL - テンプレートリテラル
- 23: JS_IF_STATEMENT - JavaScript if文
- 24: JS_ASSIGNMENT_EXPRESSION - JavaScript代入式
- 25: JS_SEQUENCE_EXPRESSION - JavaScriptシーケンス式
- 26: JS_RETURN_STATEMENT - JavaScript return文

**注**: 13以降はコンパイル後のコード生成で使用され、テンプレートの直接的な解析では通常現れない

## 探索時の注意点

1. IFノードは`children`ではなく`branches`プロパティを持つ
2. IF_BRANCHノードの`children`にELEMENTが入る
3. COMPOUND_EXPRESSIONの`children`には文字列リテラルも含まれる
4. locの位置情報は1ベース（行・列ともに1から始まる）