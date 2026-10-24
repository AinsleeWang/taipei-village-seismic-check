# 危老檢查你我他

臺北市政 debug 松 #6「危老耐震如何查、風險評級怎麼找」｜團隊 404 Not Fallen（Ainslee、Tiffany）

輸入臺北市地址，查你家這一里的危老風險分數，並在 3D 地圖上疊液化潛勢、逐棟屋齡、高齡人口與救災困難巷道；再用手機替自家那一棟做單棟初篩。

- 作品網站：https://ainsleewang.github.io/taipei-village-seismic-check/
- 單棟初篩：https://ainsleewang.github.io/taipei-village-seismic-check/check.html
- 百日實施方案：https://claude.ai/artifact/BkZUAcHQQtgutCrc6LvFVV

## 功能

**危老分數地圖**（`index.html`、`app.js`）

- 地址查詢：輸入門牌，找到所在的里並顯示分數與三項指標
- 雙老熱區：456 里依「液化 40％＋65 歲以上比例 30％＋30 年以上老屋比例 30％」上色，可切 2D／3D
- 2035 推估：切到 2035 年看十年後的分數；「增加多少」顯示 2035 比現在多幾分，並有「現在 → 2035 變化」圖（2035 前 20、上升最多 20）
- 全市前 10 名：在地圖上標出，點一下就飛過去
- 疊圖：土壤液化潛勢、逐棟屋齡（成交樣本）、高齡人口、救災困難巷道
- 進階設定：分數權重、透明度、配色

**單棟初篩**（`check.html`）

- 四個步驟、約五分鐘：房子基本資料 → 用手機陀螺儀量地板或柱子傾斜 → 拍裂縫讓頁面判讀 → 四級結果
- 結果可以列印，帶去找技師或里辦公處
- 照片只在手機上分析，不會上傳

## 哪些是真實資料、哪些是推估

| 項目 | 類型 | 說明 |
| --- | --- | --- |
| 土壤液化潛勢 | 真實開放資料 | 臺北市政府工務局土壤液化潛勢圖 |
| 高齡人口（65 歲以上比例） | 真實開放資料 | 臺北市各里人口數按年齡分，115 年 9 月 |
| 救災困難巷道 | 真實開放資料 | 臺北市消防通道清冊；清冊只有路名，位置用門牌座標對出 |
| 門牌座標（地址查詢） | 真實開放資料 | 內政部門牌位置資料，約 25 萬筆 |
| 里界 | 真實開放資料 | 內政部國土測繪中心村（里）界，taiwan-atlas 簡化版 |
| 逐棟屋齡、老屋比例 | 真實資料，但屬推估 | 內政部實價登錄 2011–2026 成交建物 62,570 棟，只占全市約 28%；新大樓成交多，屋齡偏新約 11 個百分點（全市 30 年以上算出約 80%，官方統計 90.9%）。已用臺北市歷年使用執照摘要抽查，97.4% 相差 1 年以內 |
| 2035 分數 | 推估 | 各里單一年齡人口往後推 10 年，套簡化十年存活率，未計遷入遷出；不是正式人口推計 |
| 單棟初篩結果 | 使用者自填與手機量測 | 只是提醒要不要找技師，不是結構安全鑑定 |

沒有使用模擬資料，也沒有使用個人資料。分數是一個里的平均狀況，不是單棟耐震評估。

## 用了哪些 AI 與開源工具

| 工具 | 用途 |
| --- | --- |
| Claude（Anthropic） | 資料盤點與清理、分數計算程式、網站程式、文案 |
| [MapLibre GL JS](https://maplibre.org/) 4.7.1 | 2D／3D 地圖（BSD-3-Clause，見 `lib/LICENSE-maplibre.txt`） |
| [deck.gl](https://deck.gl/) 9.1.14 | 里塊、逐棟屋齡與巷道圖層（MIT，見 `lib/LICENSE-deck.gl.txt`） |
| [OpenFreeMap](https://openfreemap.org/) | 免費向量底圖 |
| [taiwan-atlas](https://www.npmjs.com/package/taiwan-atlas) | 村里界 TopoJSON |
| [monkey1wizard/taiwan-address-data](https://github.com/monkey1wizard/taiwan-address-data) | 內政部門牌位置資料整理版 |
| [monkey1wizard/taiwan-lvr-geodata](https://github.com/monkey1wizard/taiwan-lvr-geodata) | 實價登錄建物座標整理版 |
| Python、Shapely | 里界與液化分區疊圖、人口推估、建物落點到里 |
| Noto Sans TC、Archivo Black、JetBrains Mono（Google Fonts） | 字型 |

## 市府上任 100 天內要做什麼

完整內容見[百日實施方案](https://claude.ai/artifact/BkZUAcHQQtgutCrc6LvFVV)。

- **第 1–30 天：市府內部開始用。** 由都發局主責成立跨局處小組。稅捐處提供房屋稅籍屋齡與構造別、建管處提供建照與耐震初評結果，都彙總到里並去識別化，用來重算老屋分數。網站移到市府網域。
- **第 31–60 天：5 個里試辦。** 從前 30 名挑 4 個里，加 1 個 2035 新進熱區的里，每里辦一場說明會：技師諮詢、志工陪長輩做單棟初篩、當場預約耐震初評。C、D 級住戶由建管處 14 天內聯繫。
- **第 61–100 天：公開與擴大。** 全市排行與方法上架臺北市資料大平臺，決定第二批 25 個里。既有初評補助與健檢名額依排行先排給高分里，不另增補助預算。

經費：第一年粗估 180 萬元，百日內約 90 萬元（系統開發、資料整理、維運、說明會）。第 100 天的 KPI 包括 5 場說明會、500 份單棟初篩、100 件耐震初評預約。

## 檔案

- `index.html`、`app.js`：地址查詢＋3D 里分數地圖
- `check.html`：單棟初篩
- `config.js`：Google Maps 金鑰與 Map ID（留空就用免費的 OpenFreeMap 底圖）
- `data/`：靜態資料（見下方）
- `lib/`：MapLibre GL JS、deck.gl 與授權檔

## 資料檔

| 檔案 | 內容 | 來源 |
| --- | --- | --- |
| `data/villages.json` | 456 里界、液化／高齡／老屋三項指標、消防列管清冊 | data.taipei；內政部村里界 |
| `data/liquefaction.json` | 土壤液化潛勢（高／中／低） | 臺北市政府 |
| `data/houses.json` | 62,570 棟建物的屋齡、樓層、建材 | 實價登錄 2011–2026（只含有成交過的建物） |
| `data/addresses.json` | 約 25 萬個門牌座標 | 內政部門牌位置資料（GitHub 鏡像 monkey1wizard/taiwan-address-data） |
| `data/fire.json` | 救災困難巷道位置 | 臺北市消防通道清冊＋門牌座標 |

## 換成 Google 地圖

1. Google Cloud Console 開專案，啟用 **Maps JavaScript API**，建立 API 金鑰，並把金鑰限制在本站網域（例如 `https://<帳號>.github.io/*`）。
2. 「地圖管理」建立一個 **JavaScript／向量** 類型的 Map ID，在「地圖樣式」把配色設成米白底、藍色水域、白色道路、黃色快速道路，隱藏 POI。
3. 把金鑰和 Map ID 填進 `config.js`。沒有 Map ID 也能用，但只有 2D。
4. 測試時也可以直接在網址加 `?key=金鑰&mapId=地圖ID`；加 `?engine=free` 強制用免費底圖。
