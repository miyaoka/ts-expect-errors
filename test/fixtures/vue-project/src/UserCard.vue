<template>
  <div class="user-card">
    <p>{{ name }} ({{ age }})</p>
    <slot :title="'Card Title'" :count="42" />
  </div>
</template>

<script setup lang="ts">
interface Props {
  name: string;
  age: number;
}

defineProps<Props>();

// expect済みなら重複してexpectしない
// @ts-expect-error TS2322: Type 'string' is not assignable to type 'boolean'.
const wrongType2: boolean = "not boolean";

// 型が解決されているならexpectを削除する
// @ts-expect-error TS2322: Type 'string' is not assignable to type 'boolean'.
const correctType2: boolean = true;

// script内の型エラーのテスト
const wrongType: boolean = "not boolean";
</script>
