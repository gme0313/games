# CLAUDE.md — games

給 Claude 的專案說明。使用者是繁體中文（台灣）使用者：**介面文字、註解、回覆一律用繁體中文台灣用語**。

## 專案概述

給小朋友玩的英文字母、單字與注音小遊戲集合，純前端，**沒有 build 步驟、沒有套件管理、沒有測試框架**。

- `abc-adventure/`：主要作品。Phaser 3.80.1（從 cdnjs 載入），畫布 540×960 直式，`Phaser.Scale.FIT` 置中縮放。
- `abc-game/`：早期的單檔簡單版（戳氣球、字母配圖片），自己有一份內嵌的 `WORDS`，**和 `abc-adventure/js/words.js` 無關**，兩邊不共用資料。
- 用 GitHub Pages 從 `main` 根目錄發佈（<https://gme0313.github.io/games/>）。**repo 必須維持公開**（免費帳號的私人 repo 不能用 Pages）。**推送到 `main` 就會直接更新線上版**，推送前先跟使用者確認。

## 執行

- `abc-game/index.html` 可直接雙擊開啟。
- `abc-adventure/` 建議用本機伺服器：`python -m http.server 8000`（在 `abc-adventure/` 底下執行），再開 `http://localhost:8000`。
- 語音用瀏覽器的 `speechSynthesis`，需要使用者先點擊一次才會發聲；建議用 Chrome／Edge 測試。

## abc-adventure 檔案與載入順序

`index.html` 依序載入 `words.js` → `look.js` → `game.js`，**全部是全域變數，沒有模組**。`look.js` 和 `words.js` 會用到 `game.js` 的常數（`W`、`H`、`GROUND`、`pick`、`shuffle`），但只在函式執行時才用，所以載入順序不能亂改。

| 檔案 | 內容 |
|---|---|
| `js/words.js` | `WORDS`（每個字母底下的 `[英文, 中文, 圖示]`）、`COLOR_NAMES`、`NUMBER_NAMES`、`PIC_WORDS`（可出「看英文選圖片」的單字）、`SIMILAR`（長得像的單字群組） |
| `js/look.js` | `DINOS`（6 種配色）、`SCENES`（早晨／白天／傍晚／夜晚）、`CHARS`（8 種主角與 `drawXxx` 繪圖函式）、`look`（目前外觀）、背景生成 `makeBackground` 等、`TERRAINS`（草原／海邊／火山／雪地）、`addBackdrop` |
| `js/game.js` | 語音 `say()`、音效 `beep()`／`pop()`、背景音樂 `music`、共用 UI（`txt`、`button`、`confetti`、`popper`）、出題 `pickQuestions()`／`questionSpec()`、所有場景 |

### 場景（`game.js` 最底下的 `scene` 陣列）

`Title` → 選模式：

- `Walk`（冒險之旅）→ `Bonus`（開寶箱）→ `End`（總分）
- `Feed`（餵恐龍）→ `End`
- `Trace`（描字母／注音）→ `End`
- `Select`（選主角）→ 回 `Title`

`End` 的 `again` 參數決定「再玩一次」回到哪個場景。

## 設計重點與陷阱

1. **素材全部用程式畫，沒有圖檔和音檔**。主角用 Phaser `Graphics` 畫（`drawTrex` 等，畫布 160×150、面向右、腳底約 y=145，參數 `a`／`b` 是後腳／前腳抬起高度、`bob`、`tail`、`cheer`），背景用 canvas 畫粉筆風格並依時段與地形快取成貼圖。貼圖名稱靠 `tex()`／`bgKey()` 組出來，**第一次用到才產生**（`ensureLook`、`ensureChar`、`ensureTerrain`），新增素材請沿用這個模式。
2. **新增主角**：在 `look.js` 寫 `drawXxx(g, pal, {a, b, bob, tail, cheer})`，加進 `CHARS`（含 `name`、`en`、`crown`）。`SelectScene` 的卡片是 2 欄 4 列、最多 8 隻，超過要調整 `cardCenter()`。
3. **新增單字**：加到 `words.js` 的 `WORDS` 對應字母。圖示盡量用舊款 Android 也能顯示的 emoji，且不要和其他單字重複。要出現在「看英文選圖片」就要同時加進 `PIC_WORDS`；長得像的單字（例如 Boat／Ship）加進 `SIMILAR`，避免當成彼此的干擾選項。X 沒有適合的單字，所以略過。
4. **出題規則**（`pickQuestions()`）：每局題型分配由 `MIX` 決定（總和 = `ROUNDS` = 10），第 1 題固定是 `word`。單字配圖題先挑有 `PIC_WORDS` 單字的字母；玩過的單字記在 localStorage `abc-adventure-seen`，全部玩過才重新輪一輪。
5. **干擾選項**：大小寫題避開字形像的字母（`CONFUSABLE`，例如題目 b 不會出現 D）；單字題的干擾項首字母不同、不在同一個 `SIMILAR` 群組，顏色題只配顏色、數字題只配數字。
6. **計分**：冒險之旅每題最多 3 分，一次答對 3 分、錯一次 2 分、錯兩次公布答案得 1 分，無論對錯都進下一題。連續「一次答對」會有皇冠和彩虹獎勵。
7. **語音**（`say()`）：一種語言一段，**不要把中英文混在同一句**。`voiceFor()` 優先挑 Natural／Online，再挑 Google，中文只接受台灣腔。`speakOne()` 有逾時保底，因為 Android 偶爾不會觸發 `onend`。`sayId` 用來讓新的語音取代舊的；離開場景前要 `sayId++` 並 `speechSynthesis.cancel()`。
8. **場景切換傳資料**：`this.scene.start('Walk', {})` 一定要傳物件。沒傳的話 Phaser 會沿用上一次的資料（例如描字母會直接進上次選的模式）。
9. **按鈕**（`button()`）：用獨立的透明矩形接收點擊，不要用容器本身接收，避免點擊範圍問題。
10. **音樂**：Web Audio 即時合成，音量 `MUSIC_VOLUME` 刻意壓得比語音小很多。瀏覽器要求先有一次點擊才能發聲；切到背景分頁會 `suspend`。
11. **localStorage**（全部包 try/catch，隱私模式下可能不能用）：`abc-adventure-char`（主角）、`abc-adventure-music`（音樂開關）、`abc-adventure-seen`（玩過的單字）。
12. **描字母**：只能在字母附近畫得出線（`TRACE_BAND`），畫出來的顏色只留在字母裡面，描到 `TRACE_NEED`（80%）就過關，不限制筆順。注音符號 37 個，不含聲調。

## abc-game（簡單版）

單一 HTML 檔，原生 DOM 與 CSS 動畫，沒有框架。`WORDS` 每個字母只有一個單字；`GROUPS` 是字母範圍。目前以 `abc-adventure` 為主，這份除非使用者要求，否則不用動。

## 修改後的檢查

沒有自動測試，用瀏覽器手動玩過：

- 冒險之旅整局（10 題各題型、換地形、開寶箱、總分）
- 餵恐龍、描字母（英文與注音）
- 選主角、音樂開關、回首頁
- 用手機尺寸（直式）看版面，語音有沒有念出來
