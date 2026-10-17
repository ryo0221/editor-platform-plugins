# Claude Desktop 拡張のインストール

実機検証の担当者は [Windows / macOS 受入表](claude-desktop-acceptance.md)を使用してください。
実機受入と署名・正式提供の判断が完了するまでは、未署名プレビューを維持します。

配布ファイル: `editor-platform-claude-0.1.3.mcpb`

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

図表を含む内容を試す場合:

> Editor Platform で成長戦略のスライドを1枚作って。棒グラフ、比較表、色付きの強調枠、文字の大小を使ってレイアウトして。各要素は編集できる状態にし、例示の数値には「架空データ」と明記して。

0.1.2 では、タイトルと本文だけでなく、図形・グラフ・表・画像・文字装飾を含む
native content を作成・変更提案できます。Claude がモデル構造を知るための
`get_editor_guide` も追加しました。更新後は Desktop を再起動し、新しい会話を
開いてください。以前の会話が古いツール定義を保持することがあります。

0.1.3 では Slide の変更案を送る契約と例を詳しくし、独自の Graph Profile を作成時に
渡して保持できるようにしました。不要な成果物はチャットから削除を依頼するか、
Editor の「ゴミ箱へ移動」を使えます。「成果物の一覧」で「ゴミ箱」を選ぶと復元できます。
定義そのものの変更・移行、別の表や関係図をスライドに参照埋め込みする機能、
元データ変更の自動連動は未対応です。更新後は再起動して新しい会話を使ってください。

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
