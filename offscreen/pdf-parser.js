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
              script.src = chrome.runtime.getURL('offscreen/pdf.min.js');
              document.head.appendChild(script);
              await new Promise((r,j)=>{ script.onload=r; script.onerror=j; });
            } catch(_) {}
            if (!pdfjsLib) {
              try {
                const alt = document.createElement('script');
                alt.src = chrome.runtime.getURL('offscreen/pdfjs/pdf.min.js');
                document.head.appendChild(alt);
                await new Promise((r,j)=>{ alt.onload=r; alt.onerror=j; });
              } catch(_) {}
            }
            pdfjsLib = getPdfjsLib();
          }
          if (!pdfjsLib) { send({ type:'OFFSCREEN_PDF_ERROR', tabId, error:'pdfjs_missing' }); sendResponse && sendResponse({ ok:false }); return true; }
          try {
            if (pdfjsLib.GlobalWorkerOptions) {
              pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('offscreen/pdf.worker.min.js');
            }
          } catch(_){
            try {
              if (pdfjsLib.GlobalWorkerOptions) {
                pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('offscreen/pdfjs/pdf.worker.min.js');
              }
            } catch(__){}
          }
          const doc = await pdfjsLib.getDocument({ url }).promise;
          const numPages = doc.numPages || 0;
          const sections = [];
          const outlineTitleByPage = {};
          try {
            const outline = await doc.getOutline();
            const mapItem = async (item) => {
              try {
                let dest = item.dest || item.url || null;
                if (typeof dest === 'string' && doc.getDestination) {
                  try { dest = await doc.getDestination(dest); } catch(_){}
                }
                let pageNum = null;
                if (Array.isArray(dest) && dest[0] && doc.getPageIndex) {
                  try { const idx = await doc.getPageIndex(dest[0]); pageNum = (idx|0)+1; } catch(_){}
                }
                if (pageNum && item.title) {
                  const t = String(item.title||'').trim();
                  if (t) { if (!outlineTitleByPage[pageNum]) outlineTitleByPage[pageNum] = t; }
                }
                if (Array.isArray(item.items)) {
                  for (const it of item.items) { await mapItem(it); }
                }
              } catch(_){}
            };
            if (Array.isArray(outline)) { for (const it of outline) { await mapItem(it); } }
          } catch(_){}
          for (let i=1;i<=numPages;i++){
            try{
              const page = await doc.getPage(i);
              const txt = await page.getTextContent();
              const blocks = [];
              let order = 0;
              txt.items.forEach(it=>{ const t = String(it.str||'').trim(); if (t) blocks.push({ text:t, orderIndex:order++ }); });
              const title = outlineTitleByPage[i] ? outlineTitleByPage[i] : ('PDF Page '+i);
              if (blocks.length) sections.push({ sectionId:'pdf-'+i, sectionTitle:title, headingPath:'pdf:'+i, blocks });
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
              pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('offscreen/pdf.worker.min.js');
            }
          } catch(_){
            try {
              if (pdfjsLib.GlobalWorkerOptions) {
                pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('offscreen/pdfjs/pdf.worker.min.js');
              }
            } catch(__){}
          }
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
          const outlineTitleByPage = {};
          try {
            const outline = await doc.getOutline();
            const mapItem = async (item) => {
              try {
                let dest = item.dest || item.url || null;
                if (typeof dest === 'string' && doc.getDestination) {
                  try { dest = await doc.getDestination(dest); } catch(_){}
                }
                let pageNum = null;
                if (Array.isArray(dest) && dest[0] && doc.getPageIndex) {
                  try { const idx = await doc.getPageIndex(dest[0]); pageNum = (idx|0)+1; } catch(_){}
                }
                if (pageNum && item.title) {
                  const t = String(item.title||'').trim();
                  if (t) { if (!outlineTitleByPage[pageNum]) outlineTitleByPage[pageNum] = t; }
                }
                if (Array.isArray(item.items)) {
                  for (const it of item.items) { await mapItem(it); }
                }
              } catch(_){}
            };
            if (Array.isArray(outline)) { for (const it of outline) { await mapItem(it); } }
          } catch(_){}
          for (let i=1;i<=numPages;i++){
            try{
              const page = await doc.getPage(i);
              const txt = await page.getTextContent();
              const blocks = [];
              let order = 0;
              txt.items.forEach(it=>{ const t = String(it.str||'').trim(); if (t) blocks.push({ text:t, orderIndex:order++ }); });
              const title = outlineTitleByPage[i] ? outlineTitleByPage[i] : ('PDF Page '+i);
              if (blocks.length) sections.push({ sectionId:'pdf-'+i, sectionTitle:title, headingPath:'pdf:'+i, blocks });
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