# 危老檢查你我他

輸入臺北市地址，查你家這一里的危老風險分數，並在 3D 地圖上疊液化潛勢、逐棟屋齡、高齡人口與救災困難巷道。

- `index.html`、`app.js`：地址查詢＋3D 里分數地圖
- `check.html`：單棟初篩
- `config.js`：Google Maps 金鑰與 Map ID（留空就用免費的 OpenFreeMap 底圖）
- `data/`：靜態資料（見下方）

## 換成 Google 地圖

1. Google Cloud Console 開專案，啟用 **Maps JavaScript API**，建立 API 金鑰，並把金鑰限制在本站網域（例如 `https://<帳號>.github.io/*`）。
2. 「地圖管理」建立一個 **JavaScript／向量** 類型的 Map ID，在「地圖樣式」把配色設成米白底、藍色水域、白色道路、黃色快速道路，隱藏 POI。
3. 把金鑰和 Map ID 填進 `config.js`。沒有 Map ID 也能用，但只有 2D。
4. 測試時也可以直接在網址加 `?key=金鑰&mapId=地圖ID`；加 `?engine=free` 強制用免費底圖。

## 資料

| 檔案 | 內容 | 來源 |
| --- | --- | --- |
| `data/villages.json` | 456 里界、液化／高齡／老屋三項指標、消防列管清冊 | A 版原型；data.taipei |
| `data/liquefaction.json` | 土壤液化潛勢（高／中／低） | 臺北市政府 |
| `data/houses.json` | 62,570 棟建物的屋齡、樓層、建材 | 實價登錄 2011–2026（只含有成交過的建物） |
| `data/addresses.json` | 約 25 萬個門牌座標 | 內政部門牌位置資料（GitHub 鏡像 monkey1wizard/taiwan-address-data） |

分數是一個里的平均狀況，不是單棟耐震評估。
