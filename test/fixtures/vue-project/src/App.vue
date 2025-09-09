<!-- コメント -->

<script setup lang="ts">
import UserCard from "./UserCard.vue";

function sum(a: number, b: number) {
  return a + b;
}

// UserCardに渡すデータ
const userName = 123; // 型エラー: number を string に
const userAge = "abc"; // 型エラー: string を number に

// @ts-expect-error TSTS2322
const correct: string = "correct";

const incorrect: string = 123;
</script>

<template>
  <div>
    <!-- 属性エラー（要素の直前で抑制すべき） -->
    <div v-if="undefinedCondition">条件付きコンテンツ</div>

    <!-- 同一行複数要素エラー（並列） -->
    <div v-if="undefinedCondition">条件付きコンテンツ</div>
    <div v-if="undefinedCondition">条件付きコンテンツ</div>

    <!-- 同一行複数要素エラー（入れ子） -->
    <div v-if="undefinedCondition">
      条件付きコンテンツ
      <div v-if="undefinedCondition">条件付きコンテンツ</div>
    </div>

    <!-- 属性エラー -->
    <div @click="error" />

    <!-- 属性エラー + マスタッシュエラー -->
    <div @click="error">条件付きコンテンツ{{ error1 }}</div>

    <!-- v-ifエラー + マスタッシュエラー -->
    <div v-if="undefinedCondition">条件付きコンテンツ{{ error1 }}</div>

    <!-- v-ifの中でエラー -->
    <div v-if="error">
      <div @click="error">{{ error }}</div>
    </div>

    <!-- マスタッシュエラー（マスタッシュの直前で抑制すべき） -->
    <p>{{ undefinedVar }}</p>

    <!-- 複数マスタッシュ（各マスタッシュごとに抑制） -->
    <div>
      {{ error1 }}
      {{ error2 }}
    </div>

    <!-- 要素で区切られた複数エラー（要素が境界） -->
    <div>
      {{ error1a }}
      {{ error1b }}
      <span>text</span>
      {{ error2a }}
    </div>

    <div>
      <!-- 既にexpectされているところは重複してexpectしない -->
      <!-- @vue-expect-error TS2339 -->
      {{ error1 }}
    </div>

    <div>
      <!-- 既にexpectされているところは重複してexpectしない 同一行-->
      <!-- @vue-expect-error TS2339 -->{{ error1 }}
    </div>

    <div>
      <!-- 既にexpectされているところは重複してexpectしない 同一行-->
      {{ error1
      }}<!-- @vue-expect-error TS2339 -->{{ error1 }}
    </div>

    <div>
      <!-- 正しい型に対してexpectは削除する -->
      <!-- @vue-expect-error TS2339 -->
      {{ userName }}
    </div>

    <div>
      <!-- 正しい型に対してexpectは削除する。同一行にある場合 -->
      <!-- @vue-expect-error TS2339 -->{{ userName }}
    </div>

    <div>
      <!-- 正しい型に対してexpectは削除する。同一行にある場合 -->
      {{ userName
      }}<!-- @vue-expect-error TS2339 -->{{ userName }}
    </div>

    <!-- コンポーネントのプロパティ型エラー -->
    <UserCard :name="userName" :age="userAge" />

    <!-- 複数行マスタッシュ -->
    <div>
      {{
        multiLineErroraaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1 +
        multiLineErroraaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa2
      }}
    </div>

    <!-- 引数の型エラー -->
    {{ sum(6, "5") }}

    <!-- 深い階層 -->
    <div>
      <div>
        <div>
          <div v-if="error">
            {{ error1 }}
          </div>
        </div>
      </div>
    </div>

    <!-- v-ifでのエラー -->
    <div
      v-if="true"
      class="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
      @click="error"
    ></div>

    <!-- v-elseでのエラー -->
    <div
      v-if="true"
      class="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    ></div>
    <div
      v-else
      class="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
      @click="error"
    ></div>

    <!-- v-else-ifでのエラー -->
    <div
      v-if="true"
      class="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    ></div>
    <div
      v-else-if="true"
      class="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
      @click="error"
    ></div>
    <div v-else class="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"></div>
  </div>

  <!-- nestされたv-ifでのエラー -->
  <div v-if="true" class="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa">
    <div
      class="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
      @click="error"
    ></div>
  </div>
  <div
    v-else
    class="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    @click="error"
  >
    <div
      class="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
      @click="error"
    ></div>
  </div>

  <!-- v-for -->
  <div
    v-for="(val, i) in [0, 1, 2]"
    :key="`${i}`"
    class="selection"
    :style="val"
  ></div>
</template>

<!-- 複数script -->
<script lang="ts">
const str: string = 123;
</script>
