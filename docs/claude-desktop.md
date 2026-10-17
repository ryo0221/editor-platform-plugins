# Claude Desktop 拡張のインストール

実機検証の担当者は [Windows / macOS 受入表](https://github.com/ryo0221/editor-platform-plugins/blob/main/docs/claude-desktop-acceptance.md)を使用してください。
実機受入と署名・正式提供の判断が完了するまでは、未署名プレビューを維持します。

配布ファイル: `editor-platform-claude-0.1.3.mcpb`

## インストール

1. 提供された候補の SHA-256 が同梱チェックサムと一致することを確認します。チェックサムは破損検出用で、発行者の署名や安全性の保証ではありません。
2. 最新の Claude Desktop を開きます（Windows / macOS）。
3. **設定 → Extensions → Advanced settings → Install Extension…** を選びます。
4. ダウンロードした `.mcpb` ファイルを選び、内容を確認してインストールします。
5. 新しい会話で Editor Platform を有効にします。

Git・npm・Node.js の別途インストール、API キー、公開サーバーの準備は不要です。
manifest は Node.js 20.19 以上を要求します。Desktop が実際に選んだ内蔵 Node の版は
実機受入時に確認してください。公式案内は内蔵 Node の提供を説明していますが、この候補の
受入済み Desktop 最低版はまだありません。起動できない場合は Desktop の版とログを記録します。拡張の処理は Desktop が起動・終了します。
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
Profile 定義の変更・移行は未対応です。保存済み Data／Graph の Slide への固定・追従参照に対応し、
追従表示は保存済みの元データを読み直します。明示的な保存・書き出しで参照 snapshot を確定します。
Desktop 実ホストでの受入は未実施です。更新後は再起動して新しい会話を使ってください。

編集画面が表示されたら、文字を入力して「保存」を押し、再度開いて確認します。
AI に変更案を依頼した場合は、Editor の画面でプレビューし、採用または却下します。
10 種類の Editor のローカルハーネス検証とは別に、この実環境での表示・保存・
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

Slide / Document / Design / Whiteboard / Data / Graph / Review / File / React UI / Animation。
Animation は公開 schema-1 の矩形／グループと native JSON 出力に限定します。
React UI の構造とプロパティは保持できますが、Code 専用の実行プレビュー listener は
Desktop では起動しません。Office 出力と Video / GIS アダプターは含みません。

これは署名なしのローカル連携プレビューです。公式ディレクトリ掲載・審査済みの
拡張ではありません。ビルドと展開後の stdio 検証は実施しますが、ログイン済みの
Claude Desktop でのインストール・UI 表示が確認済みであるとは主張していません。
会社の管理ポリシーによりカスタム拡張が制限されている場合もあります。

## 更新・導入できない場合

この私的配布候補は自動更新を前提にしません。更新前に保存先をバックアップし、
提供者から受け取った新しい `.mcpb` の版・commit・SHA-256 を確認して、同じ導入経路で
更新してください。再起動後の新しい会話で、以前の成果物 ID と保存内容を確認します。
同じ `0.1.3` 表示でも候補のバイト列が異なり得るため、ファイル名だけで区別しないでください。
この手順の実 Desktop 更新受入は未実施です。

Extensions の項目がない、または未署名・組織ポリシーで拒否された場合は、その表示と
OS／Desktop 版を記録し、管理者・提供者へ確認してください。署名警告を消すための
自己署名証明書の信頼追加や、管理ポリシー変更はこの導入手順に含みません。
API キー・署名証明書・追加サービス契約は要求しません。

署名調査とローカル検証の範囲は [Desktop パッケージ検証](https://github.com/ryo0221/editor-platform-plugins/blob/main/docs/claude-desktop-package-verification.md)、
実機操作は [受入表](https://github.com/ryo0221/editor-platform-plugins/blob/main/docs/claude-desktop-acceptance.md)を参照してください。

同梱文書の正確な版は、展開したパッケージの `source/editor-platform-plugins/docs/`
にも保存されています。Web 上の文書は後の版へ更新される場合があります。

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
