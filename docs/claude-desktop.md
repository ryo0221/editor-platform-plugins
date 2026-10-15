# Claude Desktop 拡張のインストール

配布ファイル: `editor-platform-claude-0.1.1.mcpb`

## インストール

1. 最新の Claude Desktop を開きます（Windows / macOS）。
2. **設定 → Extensions → Advanced settings → Install Extension…** を選びます。
3. ダウンロードした `.mcpb` ファイルを選び、内容を確認してインストールします。
4. 新しい会話で Editor Platform を有効にします。

Git・npm・Node.js の別途インストール、API キー、公開サーバーの準備は不要です。
Claude Desktop 内蔵の Node.js 20.19 以上を使用します。対応していない場合は
Claude Desktop を更新してください。拡張の処理は Desktop が起動・終了します。
このファイルは Claude Desktop 専用で、ChatGPT 用インストーラーではありません。

## 最初の動作確認

次のように依頼します。

> Editor Platform の list_editors を呼んで、使える Editor を教えて。

続いて:

> Editor Platform で「動作確認」という Document を作り、編集画面を開いて。

編集画面が表示されたら、文字を入力して「保存」を押し、再度開いて確認します。
AI に変更案を依頼した場合は、Editor の画面でプレビューし、採用または却下します。
9 種類の Editor のローカルハーネス検証とは別に、この実環境での表示・保存・
変更案・ダウンロード確認が必要です。

## 保存先と権限

成果物は拡張のインストール先とは別の、次の専用フォルダーに保存します。
拡張の更新でこのフォルダーを置き換えません。

| OS | 標準保存先 |
| --- | --- |
| Windows | `%LOCALAPPDATA%\EditorPlatform\ClaudeDesktop` |
| macOS | `~/Library/Application Support/EditorPlatform/ClaudeDesktop` |

必要なときはこのフォルダーをバックアップしてください。アンインストール後に
データを消したい場合は、Claude Desktop を終了してから削除してください。
標準では Node のファイル操作で専用フォルダーだけを使用し、HTTP ポートを開きません。
OS による追加のファイルシステム制限を実装しているわけではありません。
同じ保存先に複数のサーバープロセスを同時に起動しないでください。

拡張自体は AI API を呼びません。Claude に渡した成果物・ツール結果の取り扱いは
利用する Claude アカウントの条件に従います。拡張独自のログインや課金はありません。

## この配布版の範囲

Slide / Document / Design / Whiteboard / Data / Graph / Review / File / React UI。
React UI の実コンポーネント描画、Office 出力、Animation / Video / GIS は含みません。

これは署名なしのローカル連携プレビューです。公式ディレクトリ掲載・審査済みの
拡張ではありません。ビルドと展開後の stdio 検証は実施しますが、ログイン済みの
Claude Desktop でのインストール・UI 表示が確認済みであるとは主張していません。
会社の管理ポリシーによりカスタム拡張が制限されている場合もあります。

## 開発者による再作成

公開リポジトリを submodule 込みで取得し、開発用 Node 22.18 以上で実行します。

```sh
npm ci
npm run package:claude
npm run test:claude-package
```

出力は `release/`。パッケージにはビルド済み UI、サーバーと全ランタイム依存、
公開ソースのスナップショット、ライセンスを含みます。ビルド用の開発依存は
ランタイムには不要です。`.mcpb` の隣に SHA-256 チェックサムも出力します。
生成物・成果物データ・インストール済み依存を Git に追加しません。

参考:
- https://support.claude.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop
- https://github.com/modelcontextprotocol/mcpb/blob/main/MANIFEST.md
