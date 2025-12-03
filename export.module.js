// export.module.js - Fix for WYSIWYG (Matching Modern UI)
(function(global){
  function createExportModule({ getBgCanvas, getOverlaySvg, getTheme, getOutlineColor }){
    let _clickHandler = null;
    
    function exportPNG(filename = 'export.png'){
      const bgCanvas = getBgCanvas();
      const overlay = getOverlaySvg();
      // 在新版 UI 中我們通常鎖定為 Light 主題，但這裡保留彈性
      const theme = getTheme() || 'light'; 
      const outline = getOutlineColor();

      // 1. 建立 Canvas
      const out = document.createElement('canvas');
      out.width = bgCanvas.width;
      out.height = bgCanvas.height;
      const octx = out.getContext('2d');
      
      // 2. 繪製底圖
      octx.drawImage(bgCanvas, 0, 0);

      // 3. 處理 SVG (Clone 並注入樣式)
      const ov = overlay.cloneNode(true);
      ov.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      
      // 確保 ViewBox 正確，防止匯出時跑版
      if (!ov.getAttribute('viewBox')) ov.setAttribute('viewBox', `0 0 ${bgCanvas.width} ${bgCanvas.height}`);
      if (!ov.getAttribute('width')) ov.setAttribute('width', String(bgCanvas.width));
      if (!ov.getAttribute('height')) ov.setAttribute('height', String(bgCanvas.height));

      // 4. 定義匯出時的樣式 (這是關鍵：必須與 styles.css 一致)
      // 新版 UI 顏色定義：
      // Primary Blue: #2563eb
      // Shape Fill: rgba(37, 99, 235, 0.1)
      // Selected: #d946ef (Magenta)
      
      const style = document.createElementNS('http://www.w3.org/2000/svg','style');
      style.textContent = `
        /* 文字樣式 (自動描邊以確保在深色/淺色底圖都清楚) */
        text.dim { 
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-size: 12px; 
          fill: #ffffff; 
          paint-order: stroke; 
          stroke: rgba(0,0,0,0.8); 
          stroke-width: 3px; 
          font-weight: bold;
        }

        /* 輔助線 (虛線) */
        .line-guide { 
          stroke: #2563eb; 
          stroke-width: 2px; 
          stroke-dasharray: 6 4; 
          fill: none; 
        }

        /* 關鍵修正：形狀樣式 (對應 styles.css .shape) */
        .shape {
          fill: rgba(37, 99, 235, 0.1); 
          stroke: #2563eb;
          stroke-width: 2px;
        }

        /* 選取狀態 (雖然匯出時通常不希望看到選取框，但保留以防萬一) */
        .shape.selected {
          stroke: #d946ef;
          fill: rgba(217, 70, 239, 0.15);
        }

        /* 控制點 (Handle) */
        .handle { 
          fill: #ffffff; 
          stroke: #d946ef; 
          stroke-width: 2px; 
        }
        .handle.move { 
          fill: #2563eb; 
          stroke: #ffffff; 
        }
      `;
      ov.insertBefore(style, ov.firstChild);

      // 5. 序列化並繪製到 Canvas
      const xml = new XMLSerializer().serializeToString(ov);
      const svgBlob = new Blob([xml], {type:'image/svg+xml;charset=utf-8'});
      const url = URL.createObjectURL(svgBlob);
      
      const img = new Image();
      img.onload = () => {
        // 將 SVG 畫在底圖之上
        octx.drawImage(img, 0, 0);
        
        // 釋放記憶體
        URL.revokeObjectURL(url);
        
        // 下載觸發
        const a = document.createElement('a');
        a.download = filename;
        a.href = out.toDataURL('image/png');
        a.click();
      };
      
      img.onerror = (e) => {
        console.error(e);
        alert('匯出失敗：可能是瀏覽器安全性限制 (CORS) 或圖片過大。');
        URL.revokeObjectURL(url);
      };
      
      img.src = url;
    }

    function bindUI({ exportBtn, filename = 'export.png' }) {
      if (exportBtn){
        // 移除舊的監聽器 (如果有的話) 以免重複綁定
        const newHandler = () => exportPNG(filename);
        exportBtn.removeEventListener('click', _clickHandler); 
        exportBtn.addEventListener('click', newHandler);
        _clickHandler = newHandler;
      }
    }

    return { exportPNG, bindUI };
  }

  global.CreateExportModule = createExportModule;
})(window);