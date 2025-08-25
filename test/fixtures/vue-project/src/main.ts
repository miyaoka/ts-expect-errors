import { createApp } from 'vue'
import App from './App.vue'

// 型エラー: numberをstringに代入
const appName: string = 123

// 型エラー: 存在しないメソッドを呼ぶ
createApp(App).mounts('#app')

// 型エラー: 間違った型の引数
const wrongType: number[] = ['1', '2', '3']