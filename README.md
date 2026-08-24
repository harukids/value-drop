# Value Drop online

AI-Driven School 卒業制作。仕事仲間と価値観を言語化するカードワークの Web アプリ。

## セットアップ

1. [Supabase](https://supabase.com) でプロジェクト作成
2. `supabase/schema.sql` を SQL Editor で実行
3. 環境変数をコピーして値を入れる

```bash
cp .env.local.example .env.local
```

4. 開発サーバー

```bash
npm install
npm run dev
```

5. http://localhost:3000 を開く（入室）。部屋作成は http://localhost:3000/host （`ADMIN_SECRET` の合言葉）

## ドキュメント

- 状態マシン: `../卒業制作_状態マシン仕様.md`
- 企画スライド: Surge 上の企画概要

## いま動くもの

- ホーム: コードで入室
- `/host`: 合言葉つきで部屋作成
- 型・60枚デッキ・localStorage 復帰キー
- Supabase スキーマ
