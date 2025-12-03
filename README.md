# GeoPlan Pro 📐

**GeoPlan Pro** 是一個輕量級、基於瀏覽器的幾何規劃與比例尺校正工具。專為工程師、室內設計師與規劃愛好者打造。它允許用戶匯入底圖（如平面圖）、定義真實比例尺，並在無限畫布上進行精準的佈局規劃與標註。

無需後端伺服器，無需安裝複雜軟體，一切都在瀏覽器中完成。

## ✨ 主要功能

  * **無限畫布 (Infinite Canvas)**：支援平移 (Pan) 與縮放 (Zoom) 操作，輕鬆處理高解析度底圖。
  * **精準比例尺校正**：通過繪製參考線並輸入真實長度（如 `5m`, `300cm`），自動計算像素與物理尺寸的轉換比率。
  * **即時尺寸標註**：繪製圖形時，自動根據校正後的比例顯示真實長寬（公尺/公分）。
  * **圖形編輯**：支援矩形與正方形的繪製、拖曳移動、以及透過控制點 (Handles) 調整大小。
  * **高品質匯出**：所見即所得 (WYSIWYG)，一鍵將底圖與規劃內容合併匯出為 PNG 圖片。
  * **現代化 UI**：採用 Glassmorphism（毛玻璃）設計風格，介面簡潔直觀。

## 🚀 快速開始

由於專案使用原生 ES Modules，建議透過本地伺服器運行以避免瀏覽器的 CORS 限制。

### 方法 1：使用 Python (macOS/Linux/Windows)

```bash
# 1. 下載專案
git clone https://github.com/your-username/geoplan-pro.git
cd geoplan-pro

# 2. 啟動簡易伺服器
python -m http.server 8000

# 3. 在瀏覽器打開
# http://localhost:8000
```

### 方法 2：使用 VS Code Live Server

1.  使用 VS Code 打開專案資料夾。
2.  安裝 "Live Server" 擴充套件。
3.  右鍵點擊 `index.html` 並選擇 "Open with Live Server"。

## 📖 使用指南

### 1\. 匯入底圖

點擊工具列左側的 **「匯入」** 按鈕，選擇你的平面圖或地圖文件 (`.jpg`, `.png`)。

### 2\. 校正比例 (Calibration)

1.  點擊工具列的 **尺規圖示** (或按 `C` 鍵)。
2.  在圖上找一段已知長度（例如門寬、比例尺規）。
3.  點擊起點與終點拉出一條線。
4.  在彈出視窗中輸入真實長度（例如 `1.2m` 或 `150cm`）。
5.  系統會自動計算比例，之後繪製的所有圖形都會顯示真實尺寸。

### 3\. 繪製與編輯

  * **正方形/長方形**：點擊對應圖示（或按 `S` / `R`），在畫布上拖曳繪製。
  * **移動**：切換回游標模式（按 `Esc`），拖曳圖形中心。
  * **調整大小**：點擊圖形選取後，拖曳四周的白色控制點。
  * **刪除**：右鍵點擊圖形選擇「刪除物件」，或選取後按 `Delete` 鍵。

### 4\. 匯出

完成規劃後，點擊最右側的 **下載圖示**，系統將生成包含標註的 PNG 圖片。

## ⌨️ 鍵盤快捷鍵

| 按鍵 | 功能 |
| :--- | :--- |
| `Space` (按住) | 切換平移模式 (Pan) |
| `C` | 切換至校正工具 (Calibrate) |
| `S` | 繪製正方形 (Square) |
| `R` | 繪製長方形 (Rect) |
| `Esc` | 取消操作 / 回到選取模式 |
| `Delete` / `Backspace` | 刪除選取的圖形 |
| `Wheel` (滾輪) | 縮放畫布 |

## 📂 專案結構

```text
geoplan-pro/
├── index.html          # 應用程式入口與 DOM 結構
├── styles.css          # 所有樣式定義 (CSS Variables, Glassmorphism)
├── app.js              # 核心邏輯 (State, Canvas渲染, 事件監聽)
└── export.module.js    # 獨立模組：處理 SVG/Canvas 混合匯出功能
```

## 🛠️ 技術細節

  * **Frontend**: 純 HTML5, CSS3, JavaScript (ES6+)。無任何外部框架依賴 (jQuery-free, React-free)。
  * **Rendering**: 混合渲染模式。
      * `Canvas`: 用於繪製高性能的底圖。
      * `SVG`: 用於繪製可互動的向量圖層（標註、圖形、控制點），確保縮放時線條清晰。
  * **State Management**: 簡單的集中式 State 物件管理視圖變換與圖形數據。

## 📝 待辦事項 (Roadmap)

  - [ ] 支援多頁面/多圖層管理。
  - [ ] 增加圓形與多邊形繪製工具。
  - [ ] 支援匯出/匯入專案檔 (.json) 以保存編輯進度。
  - [ ] 增加測距儀功能 (僅測量不留圖形)。

## 🤝 貢獻

歡迎提交 Pull Request 或開立 Issue！

## 📄 授權

此專案採用 [MIT License](https://www.google.com/search?q=LICENSE) 授權。

-----

*Created with ❤️ by [Gemini3Pro]*

-----