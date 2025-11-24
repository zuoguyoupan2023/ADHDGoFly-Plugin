(function(){
  let readySent = false;
  const send = (m)=>{ try{ chrome.runtime.sendMessage(m); }catch(e){} };
  const sendReady = ()=>{ if (!readySent){ readySent = true; send({ type:'OFFSCREEN_PDF_READY' }); } };
  sendReady();

  function getPdfjsLib(){
    return window.pdfjsLib || window['pdfjsLib'] || null;
  }

  try {
    const lib = getPdfjsLib();
    send({ type:'OFFSCREEN_PDF_LIB_STATUS', present: !!lib });
  } catch(_) {}

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse)=>{
    if (msg && msg.type === 'OFFSCREEN_PDF_PARSE_URL') {
      const url = msg.url;
      const tabId = msg.tabId;
      (async()=>{
        try{
          let pdfjsLib = getPdfjsLib();
          if (!pdfjsLib) {
            await new Promise(r=>setTimeout(r, 0));
            pdfjsLib = getPdfjsLib();
          }
          if (!pdfjsLib) {
            try {
              const script = document.createElement('script');
              script.src = chrome.runtime.getURL('offscreen/pdfjs/pdf.min.js');
              document.head.appendChild(script);
              await new Promise((r,j)=>{ script.onload=r; script.onerror=j; });
              pdfjsLib = getPdfjsLib();
            } catch(_) {}
          }
          if (!pdfjsLib) { send({ type:'OFFSCREEN_PDF_ERROR', tabId, error:'pdfjs_missing' }); sendResponse && sendResponse({ ok:false }); return true; }
          try {
            if (pdfjsLib.GlobalWorkerOptions) {
              pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('offscreen/pdfjs/pdf.worker.min.js');
            }
          } catch(_){
            // no-op
          }
          const doc = await pdfjsLib.getDocument({ url }).promise;
          const numPages = doc.numPages || 0;
          const sections = [];
          const outlineNodes = [];
          const bestByPage = {};
          try {
            const outline = await doc.getOutline();
            const walk = async (item, pathArr) => {
              let dest = item.dest || item.url || null;
              if (typeof dest === 'string' && doc.getDestination) { try { dest = await doc.getDestination(dest); } catch(_){} }
              let pageNum = null;
              if (Array.isArray(dest) && dest[0] && doc.getPageIndex) { try { const idx = await doc.getPageIndex(dest[0]); pageNum = (idx|0)+1; } catch(_){} }
              const t = String(item.title||'').trim();
              const nextArr = t ? pathArr.concat([t]) : pathArr;
              if (pageNum && t) { outlineNodes.push({ start: pageNum, title: t, level: nextArr.length, path: nextArr.join(' > ') }); }
              if (Array.isArray(item.items)) { for (const it of item.items) { await walk(it, nextArr); } }
            };
            if (Array.isArray(outline)) { for (const it of outline) { await walk(it, []); } }
          } catch(_){}
          outlineNodes.sort((a,b)=>a.start-b.start||a.level-b.level);
          if (outlineNodes.length) {
            let k = 0;
            for (let p=1;p<=numPages;p++) {
              while (k+1<outlineNodes.length && outlineNodes[k+1].start<=p) k++;
              const n = outlineNodes[k];
              if (n && n.start<=p) bestByPage[p]=n;
            }
          }
          for (let i=1;i<=numPages;i++){
            try{
              const page = await doc.getPage(i);
              const txt = await page.getTextContent();
              const items = Array.isArray(txt.items) ? txt.items : [];
              const lines = new Map();
              for (let k=0;k<items.length;k++) {
                const it = items[k];
                const s = String(it && it.str || '').trim();
                if (!s) continue;
                const tr = it && it.transform || [];
                const x = typeof tr[4] === 'number' ? tr[4] : 0;
                const y = typeof tr[5] === 'number' ? tr[5] : 0;
                const key = Math.round(y);
                const cur = lines.get(key);
                if (cur) cur.push({ x, s }); else lines.set(key, [{ x, s }]);
              }
              const sorted = Array.from(lines.entries()).sort((a,b)=>b[0]-a[0]).map(([y, arr])=>({ y, arr: arr.sort((m,n)=>m.x-n.x) }));
              const blocks = [];
              let order = 0;
              for (let q=0;q<sorted.length;q++) {
                const text = sorted[q].arr.map(z=>z.s).join(' ');
                const t = String(text||'').trim();
                if (t) blocks.push({ text: t, orderIndex: order++ });
              }
              if (!blocks.length && items.length) {
                let order2 = 0;
                items.forEach(it=>{ const t = String(it.str||'').trim(); if (t) blocks.push({ text:t, orderIndex:order2++ }); });
              }
              const node = bestByPage[i];
              const title = node ? node.title : ('PDF Page '+i);
              if (blocks.length) sections.push({ sectionId:'pdf-'+i, sectionTitle:title, headingPath:'pdf:'+i, outlinePath: node ? node.path : null, outlineLevel: node ? node.level : 0, blocks });
            }catch(_){ }
          }
          send({ type:'OFFSCREEN_PDF_RESULT', tabId, sections });
          sendResponse && sendResponse({ ok:true });
        }catch(err){ send({ type:'OFFSCREEN_PDF_ERROR', tabId, error:String(err&&err.message||err) }); sendResponse && sendResponse({ ok:false }); }
      })();
      return true;
    } else if (msg && msg.type === 'OFFSCREEN_PDF_PARSE_BUFFER') {
      const buf = msg.buffer;
      const bytes = msg.bytes;
      const tabId = msg.tabId;
      (async()=>{
        try{
          let pdfjsLib = getPdfjsLib();
          if (!pdfjsLib) {
            await new Promise(r=>setTimeout(r,0));
            pdfjsLib = getPdfjsLib();
          }
          if (!pdfjsLib) { send({ type:'OFFSCREEN_PDF_ERROR', tabId, error:'pdfjs_missing' }); sendResponse && sendResponse({ ok:false }); return true; }
          try {
            if (pdfjsLib.GlobalWorkerOptions) {
              pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('offscreen/pdfjs/pdf.worker.min.js');
            }
          } catch(_){}
          let u8 = null;
          if (bytes && Array.isArray(bytes) && bytes.length > 0) {
            u8 = new Uint8Array(bytes);
          } else if (buf && buf.byteLength > 0) {
            u8 = new Uint8Array(buf);
          } else {
            send({ type:'OFFSCREEN_PDF_ERROR', tabId, error:'empty_buffer' }); sendResponse && sendResponse({ ok:false }); return true;
          }
          const doc = await pdfjsLib.getDocument({ data: u8 }).promise;
          const numPages = doc.numPages || 0;
          const sections = [];
          const outlineNodes = [];
          const bestByPage = {};
          try {
            const outline = await doc.getOutline();
            const walk = async (item, pathArr) => {
              let dest = item.dest || item.url || null;
              if (typeof dest === 'string' && doc.getDestination) { try { dest = await doc.getDestination(dest); } catch(_){} }
              let pageNum = null;
              if (Array.isArray(dest) && dest[0] && doc.getPageIndex) { try { const idx = await doc.getPageIndex(dest[0]); pageNum = (idx|0)+1; } catch(_){} }
              const t = String(item.title||'').trim();
              const nextArr = t ? pathArr.concat([t]) : pathArr;
              if (pageNum && t) { outlineNodes.push({ start: pageNum, title: t, level: nextArr.length, path: nextArr.join(' > ') }); }
              if (Array.isArray(item.items)) { for (const it of item.items) { await walk(it, nextArr); } }
            };
            if (Array.isArray(outline)) { for (const it of outline) { await walk(it, []); } }
          } catch(_){}
          outlineNodes.sort((a,b)=>a.start-b.start||a.level-b.level);
          if (outlineNodes.length) {
            let k = 0;
            for (let p=1;p<=numPages;p++) {
              while (k+1<outlineNodes.length && outlineNodes[k+1].start<=p) k++;
              const n = outlineNodes[k];
              if (n && n.start<=p) bestByPage[p]=n;
            }
          }
          for (let i=1;i<=numPages;i++){
            try{
              const page = await doc.getPage(i);
              const txt = await page.getTextContent();
              const items = Array.isArray(txt.items) ? txt.items : [];
              const lines = new Map();
              for (let k=0;k<items.length;k++) {
                const it = items[k];
                const s = String(it && it.str || '').trim();
                if (!s) continue;
                const tr = it && it.transform || [];
                const x = typeof tr[4] === 'number' ? tr[4] : 0;
                const y = typeof tr[5] === 'number' ? tr[5] : 0;
                const key = Math.round(y);
                const cur = lines.get(key);
                if (cur) cur.push({ x, s }); else lines.set(key, [{ x, s }]);
              }
              const sorted = Array.from(lines.entries()).sort((a,b)=>b[0]-a[0]).map(([y, arr])=>({ y, arr: arr.sort((m,n)=>m.x-n.x) }));
              const blocks = [];
              let order = 0;
              for (let q=0;q<sorted.length;q++) {
                const text = sorted[q].arr.map(z=>z.s).join(' ');
                const t = String(text||'').trim();
                if (t) blocks.push({ text: t, orderIndex: order++ });
              }
              if (!blocks.length && items.length) {
                let order2 = 0;
                items.forEach(it=>{ const t = String(it.str||'').trim(); if (t) blocks.push({ text:t, orderIndex:order2++ }); });
              }
              const node = bestByPage[i];
              const title = node ? node.title : ('PDF Page '+i);
              if (blocks.length) sections.push({ sectionId:'pdf-'+i, sectionTitle:title, headingPath:'pdf:'+i, outlinePath: node ? node.path : null, outlineLevel: node ? node.level : 0, blocks });
            }catch(_){ }
          }
          send({ type:'OFFSCREEN_PDF_RESULT', tabId, sections });
          sendResponse && sendResponse({ ok:true });
        }catch(err){ send({ type:'OFFSCREEN_PDF_ERROR', tabId, error:String(err&&err.message||err) }); sendResponse && sendResponse({ ok:false }); }
      })();
      return true;
    }
  });
})();