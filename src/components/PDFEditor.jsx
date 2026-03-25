import { useState, useRef, useEffect, useCallback } from "react";

// ─── Constants ─────────────────────────────────────────────────────────────────
const FONTS = ["Helvetica", "Times New Roman", "Courier New", "Georgia", "Verdana", "Arial Black"];
const COLORS = ["#000000","#ffffff","#e94560","#a78bfa","#f5a623","#2ecc71","#3498db","#ff6b6b","#1a1a2e","#0f3460"];
const DEFAULT_FONT_SIZE = 16;
const RENDER_SCALE = 2; // pdf.js render scale — must match savePDF mapping

// ─── Helpers ───────────────────────────────────────────────────────────────────
function loadScript(src) {
  return new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
    const s = document.createElement("script");
    s.src = src; s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
}
let _id = 0;
const uid = () => `tb_${++_id}_${Date.now()}`;
const hexToRgbArr = (hex) => [
  parseInt(hex.slice(1,3),16)/255,
  parseInt(hex.slice(3,5),16)/255,
  parseInt(hex.slice(5,7),16)/255,
];

// ─── SwipeStrip ────────────────────────────────────────────────────────────────
function SwipeStrip({ children, style }) {
  const ref = useRef(null);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const active = useRef(false);

  const onTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
    scrollLeft.current = ref.current.scrollLeft;
  };
  const onTouchMove = (e) => {
    if (!ref.current) return;
    ref.current.scrollLeft = scrollLeft.current - (e.touches[0].clientX - startX.current);
  };
  const onMouseDown = (e) => {
    active.current = true;
    startX.current = e.clientX;
    scrollLeft.current = ref.current.scrollLeft;
    ref.current.style.cursor = "grabbing";
  };
  const onMouseMove = (e) => {
    if (!active.current || !ref.current) return;
    ref.current.scrollLeft = scrollLeft.current - (e.clientX - startX.current);
  };
  const onMouseUp = () => {
    active.current = false;
    if (ref.current) ref.current.style.cursor = "grab";
  };

  return (
    <div ref={ref}
      onTouchStart={onTouchStart} onTouchMove={onTouchMove}
      onMouseDown={onMouseDown} onMouseMove={onMouseMove}
      onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
      style={{
        display:"flex", alignItems:"center", gap:8,
        overflowX:"auto", scrollbarWidth:"none",
        WebkitOverflowScrolling:"touch",
        cursor:"grab", userSelect:"none",
        ...style,
      }}>
      {children}
    </div>
  );
}

// ─── FontSizeControl ──────────────────────────────────────────────────────────
function FontSizeControl({ value, onChange }) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(String(value));
  const inputRef = useRef(null);

  useEffect(() => { setDraft(String(value)); }, [value]);
  useEffect(() => { if (editing && inputRef.current) inputRef.current.select(); }, [editing]);

  const commit = () => {
    setEditing(false);
    const n = parseInt(draft, 10);
    if (!isNaN(n) && n >= 4 && n <= 200) onChange(n);
    else setDraft(String(value));
  };

  return (
    <div style={{ display:"flex", alignItems:"center", background:"#1e1e2e", border:"1px solid #2a2a3a", borderRadius:6, overflow:"hidden", flexShrink:0 }}>
      <button onClick={() => onChange(Math.max(4, value - 1))}
        style={{ background:"none", border:"none", color:"#a78bfa", fontSize:16, padding:"0 8px", cursor:"pointer", lineHeight:"28px", flexShrink:0 }}>−</button>

      {editing ? (
        <input ref={inputRef} value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key==="Enter") commit(); if (e.key==="Escape") { setEditing(false); setDraft(String(value)); }}}
          style={{ width:40, textAlign:"center", background:"#16161f", border:"none", color:"#e8e6f0", fontSize:13, fontFamily:"'Space Mono',monospace", padding:"0 2px", outline:"none", height:28 }}
        />
      ) : (
        <span onClick={() => setEditing(true)}
          style={{ width:40, textAlign:"center", color:"#e8e6f0", fontSize:13, fontFamily:"'Space Mono',monospace", cursor:"text", lineHeight:"28px", display:"block", flexShrink:0 }}>
          {value}
        </span>
      )}

      <button onClick={() => onChange(Math.min(200, value + 1))}
        style={{ background:"none", border:"none", color:"#a78bfa", fontSize:16, padding:"0 8px", cursor:"pointer", lineHeight:"28px", flexShrink:0 }}>+</button>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function PDFEditor() {
  const [pdfDoc,      setPdfDoc]      = useState(null);
  const [pdfBytes,    setPdfBytes]    = useState(null);
  const [pageImages,  setPageImages]  = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [zoom,        setZoom]        = useState(1);
  const [textBoxes,   setTextBoxes]   = useState([]);
  const [selected,    setSelected]    = useState(null);
  const [clipboard,   setClipboard]   = useState(null);
  const [dragging,    setDragging]    = useState(null);
  const [addingText,  setAddingText]  = useState(false);
  const [libsReady,   setLibsReady]   = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [fileName,    setFileName]    = useState("document.pdf");
  const [saving,      setSaving]      = useState(false);

  const [fontSize,   setFontSize]   = useState(DEFAULT_FONT_SIZE);
  const [fontFamily, setFontFamily] = useState("Helvetica");
  const [bold,       setBold]       = useState(false);
  const [italic,     setItalic]     = useState(false);
  const [color,      setColor]      = useState("#000000");

  const fileRef      = useRef(null);
  const containerRef = useRef(null);
  const scrollRef    = useRef(null); // FIX: ref for the scroll container

  // ── Load libs ─────────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"),
      loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js"),
    ]).then(() => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      setLibsReady(true);
    });
  }, []);

  // ── Render pages ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!pdfDoc) return;
    (async () => {
      setLoading(true);
      const imgs = [];
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const vp = page.getViewport({ scale: RENDER_SCALE });
        const canvas = document.createElement("canvas");
        canvas.width = vp.width; canvas.height = vp.height;
        await page.render({ canvasContext: canvas.getContext("2d"), viewport: vp }).promise;
        imgs.push({ dataUrl: canvas.toDataURL(), width: vp.width, height: vp.height });
      }
      setPageImages(imgs);
      setLoading(false);
    })();
  }, [pdfDoc]);

  // ── Open file ─────────────────────────────────────────────────────────────
  const openFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !libsReady) return;
    setFileName(file.name);
    setLoading(true);
    const buf = await file.arrayBuffer();
    setPdfBytes(buf.slice(0));
    const doc = await window.pdfjsLib.getDocument({ data: buf.slice(0) }).promise;
    setPdfDoc(doc);
    setTextBoxes([]); setSelected(null); setCurrentPage(0);
    e.target.value = "";
  };

  // ── Place text ────────────────────────────────────────────────────────────
  // Coordinates stored in canvas pixels (at RENDER_SCALE), independent of zoom
  const handleCanvasClick = (e) => {
    if (!addingText || !pageImages[currentPage]) return;
    const rect = e.currentTarget.getBoundingClientRect();
    // Divide by zoom to get canvas-space coords (not PDF points, not screen pixels)
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top)  / zoom;
    const nb = { id: uid(), x, y, page: currentPage, text: "Text", font: fontFamily, size: fontSize, bold, italic, color };
    setTextBoxes(prev => [...prev, nb]);
    setSelected(nb.id);
    setAddingText(false);
  };

  // ── Drag ──────────────────────────────────────────────────────────────────
  const startDrag = (e, id) => {
    e.stopPropagation();
    const box = textBoxes.find(b => b.id === id);
    if (!box) return;
    const elRect = e.currentTarget.getBoundingClientRect();
    setDragging({ id, offX: e.clientX - elRect.left, offY: e.clientY - elRect.top });
    setSelected(id);
  };

  const onMouseMove = useCallback((e) => {
    if (!dragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setTextBoxes(prev => prev.map(b => b.id === dragging.id
      ? { ...b, x: (e.clientX - rect.left - dragging.offX) / zoom, y: (e.clientY - rect.top - dragging.offY) / zoom }
      : b));
  }, [dragging, zoom]);

  const onTouchMove = useCallback((e) => {
    if (!dragging || !containerRef.current) return;
    const t = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    setTextBoxes(prev => prev.map(b => b.id === dragging.id
      ? { ...b, x: (t.clientX - rect.left - dragging.offX) / zoom, y: (t.clientY - rect.top - dragging.offY) / zoom }
      : b));
  }, [dragging, zoom]);

  const stopDrag = useCallback(() => setDragging(null), []);

  // ── Sync toolbar ← selected ───────────────────────────────────────────────
  const applyStyle = (key, val) => {
    if (!selected) return;
    setTextBoxes(prev => prev.map(b => b.id === selected ? { ...b, [key]: val } : b));
  };

  useEffect(() => {
    if (!selected) return;
    const b = textBoxes.find(x => x.id === selected);
    if (!b) return;
    setFontFamily(b.font); setFontSize(b.size);
    setBold(b.bold); setItalic(b.italic); setColor(b.color);
  }, [selected]);

  // ── Copy / Paste / Delete ─────────────────────────────────────────────────
  const copySelected   = () => { const b = textBoxes.find(x => x.id === selected); if (b) setClipboard({...b}); };
  const pasteClipboard = () => {
    if (!clipboard) return;
    const nb = { ...clipboard, id: uid(), x: clipboard.x + 20, y: clipboard.y + 20 };
    setTextBoxes(prev => [...prev, nb]); setSelected(nb.id);
  };
  const deleteSelected = () => { setTextBoxes(prev => prev.filter(b => b.id !== selected)); setSelected(null); };

  // ── Save PDF ──────────────────────────────────────────────────────────────
  // box.x / box.y are in canvas pixels (rendered at RENDER_SCALE).
  // PDF points = canvas pixels / RENDER_SCALE.
  // Y in PDF-lib is bottom-up, so: pdfY = pdfHeight - (box.y / RENDER_SCALE) - fontSize
  const savePDF = async () => {
    if (!pdfBytes || !window.PDFLib) return;
    setSaving(true);
    try {
      const { PDFDocument, rgb, StandardFonts } = window.PDFLib;
      const doc   = await PDFDocument.load(pdfBytes);
      const pages = doc.getPages();
      const cache = {};

      const stdFont = (box) => {
        if (box.font === "Times New Roman") return box.bold ? StandardFonts.TimesRomanBold   : box.italic ? StandardFonts.TimesRomanItalic   : StandardFonts.TimesRoman;
        if (box.font === "Courier New")     return box.bold ? StandardFonts.CourierBold       : box.italic ? StandardFonts.CourierOblique     : StandardFonts.Courier;
        return box.bold ? StandardFonts.HelveticaBold : box.italic ? StandardFonts.HelveticaOblique : StandardFonts.Helvetica;
      };

      for (const box of textBoxes) {
        const pg = pages[box.page]; if (!pg) continue;
        const { width: pdfW, height: pdfH } = pg.getSize();

        // canvas pixels → PDF points (undo the RENDER_SCALE factor)
        const pdfX = box.x / RENDER_SCALE;
        const pdfY = pdfH - (box.y / RENDER_SCALE) - box.size;

        const sf = stdFont(box);
        if (!cache[sf]) cache[sf] = await doc.embedFont(sf);
        const [r,g,b] = hexToRgbArr(box.color);
        pg.drawText(box.text, {
          x: pdfX,
          y: pdfY,
          size: box.size,
          font: cache[sf],
          color: rgb(r, g, b),
        });
      }

      const bytes = await doc.save();
      const blob  = new Blob([bytes], { type:"application/pdf" });
      const outName = fileName.replace(/\.pdf$/i, "_edited.pdf");

      // Capacitor path
      try {
        const { Filesystem, Directory } = await import("@capacitor/filesystem");
        const { Share } = await import("@capacitor/share");
        const b64 = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload  = () => res(r.result.split(",")[1]);
          r.onerror = rej;
          r.readAsDataURL(blob);
        });
        const result = await Filesystem.writeFile({ path: outName, data: b64, directory: Directory.Documents });
        await Share.share({ title: outName, url: result.uri, dialogTitle: "Save or share PDF" });
      } catch (_) {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = outName;
        a.click();
      }
    } finally { setSaving(false); }
  };

  const selBox  = textBoxes.find(b => b.id === selected);
  const pageImg = pageImages[currentPage];

  return (
    <div
      style={{ fontFamily:"'DM Sans',sans-serif", background:"#0e0e16", height:"100dvh", display:"flex", flexDirection:"column", color:"#e8e6f0", overflow:"hidden" }}
      onMouseMove={onMouseMove} onMouseUp={stopDrag}
      onTouchMove={onTouchMove} onTouchEnd={stopDrag}
    >
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Space+Mono:wght@700&display=swap" rel="stylesheet" />

      {/* ══ TOP BAR ═══════════════════════════════════════════════════════════ */}
      <div style={{ background:"#16161f", borderBottom:"1px solid #2a2a3a", height:50, flexShrink:0, display:"flex", alignItems:"center" }}>
        <div style={{ flexShrink:0, padding:"0 14px", borderRight:"1px solid #2a2a3a", height:"100%", display:"flex", alignItems:"center" }}>
          <span style={{ fontFamily:"'Space Mono',monospace", fontSize:14, fontWeight:700, color:"#e94560", letterSpacing:-0.5, whiteSpace:"nowrap" }}>PDF•ED</span>
        </div>
        <SwipeStrip style={{ flex:1, height:"100%", padding:"0 10px", gap:8 }}>
          <Btn onClick={() => fileRef.current.click()} accent="#e94560">⊕ Open</Btn>
          <input ref={fileRef} type="file" accept=".pdf" onChange={openFile} style={{ display:"none" }} />
          <Div />
          <Btn onClick={() => setAddingText(t => !t)} accent="#e94560" active={addingText}>
            {addingText ? "✎ Tap page…" : "✎ Add Text"}
          </Btn>
          <Div />
          <Btn onClick={copySelected}   disabled={!selected}  accent="#a78bfa">⎘ Copy</Btn>
          <Btn onClick={pasteClipboard} disabled={!clipboard} accent="#a78bfa">⎘ Paste</Btn>
          <Btn onClick={deleteSelected} disabled={!selected}  accent="#ff6b6b">✕ Delete</Btn>
          <Div />
          <Btn onClick={savePDF} disabled={!pdfBytes || saving} accent="#2ecc71" style={{ fontWeight:600 }}>
            {saving ? "Saving…" : "↓ Save PDF"}
          </Btn>
        </SwipeStrip>
      </div>

      {/* ══ TOOLBAR ═══════════════════════════════════════════════════════════ */}
      {pdfDoc && (
        <div style={{ background:"#12121b", borderBottom:"1px solid #2a2a3a", height:46, flexShrink:0, display:"flex", alignItems:"center" }}>
          <SwipeStrip style={{ flex:1, height:"100%", padding:"0 10px", gap:8 }}>

            <select value={fontFamily}
              onChange={e => { setFontFamily(e.target.value); applyStyle("font", e.target.value); }}
              style={selStyle}>
              {FONTS.map(f => <option key={f}>{f}</option>)}
            </select>

            <FontSizeControl value={fontSize} onChange={v => { setFontSize(v); applyStyle("size", v); }} />

            <Div />

            <Btn onClick={() => { const v=!bold; setBold(v); applyStyle("bold",v); }} accent="#a78bfa" active={bold} style={{ fontWeight:700, minWidth:32, padding:"4px 10px" }}>B</Btn>
            <Btn onClick={() => { const v=!italic; setItalic(v); applyStyle("italic",v); }} accent="#a78bfa" active={italic} style={{ fontStyle:"italic", minWidth:32, padding:"4px 10px" }}>I</Btn>

            <Div />

            {COLORS.map(c => (
              <div key={c} onClick={() => { setColor(c); applyStyle("color",c); }}
                style={{ width:22, height:22, borderRadius:5, background:c, cursor:"pointer", flexShrink:0, border: color===c?"2px solid #e94560":"2px solid #2a2a3a" }} />
            ))}
            <input type="color" value={color}
              onChange={e => { setColor(e.target.value); applyStyle("color",e.target.value); }}
              style={{ width:24, height:24, border:"none", background:"none", cursor:"pointer", padding:0, flexShrink:0 }} />

            <Div />

            <span style={{ fontSize:11, color:"#555", whiteSpace:"nowrap", flexShrink:0 }}>ZOOM</span>
            <Btn onClick={() => setZoom(z => parseFloat(Math.max(0.3,z-0.1).toFixed(1)))} accent="#a78bfa" style={{ minWidth:28, padding:"4px 8px" }}>−</Btn>
            <span style={{ fontSize:12, color:"#a78bfa", minWidth:42, textAlign:"center", fontFamily:"'Space Mono',monospace", flexShrink:0 }}>{Math.round(zoom*100)}%</span>
            <Btn onClick={() => setZoom(z => parseFloat(Math.min(4,z+0.1).toFixed(1)))}   accent="#a78bfa" style={{ minWidth:28, padding:"4px 8px" }}>+</Btn>
            <Btn onClick={() => setZoom(1)} accent="#666" style={{ fontSize:10, padding:"4px 8px" }}>↺</Btn>

          </SwipeStrip>
        </div>
      )}

      {/* ══ MAIN ══════════════════════════════════════════════════════════════ */}
      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>

        {/* Thumbnails */}
        {pageImages.length > 1 && (
          <div style={{ width:70, background:"#10101a", borderRight:"1px solid #1e1e2e", overflowY:"auto", padding:"6px 4px", display:"flex", flexDirection:"column", gap:5, flexShrink:0 }}>
            {pageImages.map((img, i) => (
              <div key={i} onClick={() => setCurrentPage(i)}
                style={{ border: i===currentPage?"2px solid #e94560":"2px solid #2a2a3a", borderRadius:4, overflow:"hidden", cursor:"pointer", opacity: i===currentPage?1:0.55 }}>
                <img src={img.dataUrl} style={{ width:"100%", display:"block" }} />
                <div style={{ textAlign:"center", fontSize:9, color:"#555", padding:"1px 0" }}>{i+1}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── PDF scroll container — FIX: touchAction here, not on the canvas div */}
        <div
          ref={scrollRef}
          style={{
            flex:1, overflow:"auto",
            display:"flex", justifyContent:"center", alignItems:"flex-start",
            padding:20,
            // Allow panning in both axes so zoomed PDFs are scrollable with one finger.
            // When dragging a text box we hand full control to our JS handlers instead.
            touchAction: dragging ? "none" : "pan-x pan-y",
          }}
        >

          {loading && <div style={{ color:"#e94560", fontFamily:"'Space Mono',monospace", marginTop:60 }}>Loading PDF…</div>}

          {!pdfBytes && !loading && (
            <div style={{ marginTop:60, textAlign:"center" }}>
              <div style={{ fontSize:52, marginBottom:12 }}>📄</div>
              <div style={{ color:"#e94560", fontFamily:"'Space Mono',monospace", fontSize:20, marginBottom:6 }}>PDF EDITOR</div>
              <div style={{ color:"#444", fontSize:13, marginBottom:20 }}>Open a PDF to start annotating</div>
              <button onClick={() => fileRef.current.click()}
                style={{ background:"#e94560", color:"#fff", border:"none", borderRadius:8, padding:"10px 22px", fontSize:14, cursor:"pointer" }}>
                ⊕ Open PDF File
              </button>
            </div>
          )}

          {pageImg && !loading && (
            <div
              ref={containerRef}
              onClick={handleCanvasClick}
              style={{
                position:"relative",
                width:pageImg.width * zoom,
                height:pageImg.height * zoom,
                flexShrink:0,
                cursor: addingText ? "crosshair" : "default",
                boxShadow:"0 8px 40px #000b",
                borderRadius:3,
                overflow:"hidden",
                userSelect:"none",
                // FIX: canvas div must NOT consume touch events — let the scroll
                // container handle panning. Only block when dragging a text box.
                touchAction: dragging ? "none" : "auto",
              }}
            >
              <img src={pageImg.dataUrl} style={{ width:"100%", height:"100%", display:"block", pointerEvents:"none" }} />
              {textBoxes.filter(b => b.page === currentPage).map(b => (
                <TextBox key={b.id} box={b} zoom={zoom}
                  selected={b.id===selected}
                  onSelect={() => setSelected(b.id)}
                  onStartDrag={(e) => startDrag(e, b.id)}
                  onChange={(text) => setTextBoxes(prev => prev.map(x => x.id===b.id ? {...x,text} : x))}
                />
              ))}
            </div>
          )}
        </div>

        {/* Properties panel */}
        {selBox && (
          <div style={{ width:185, background:"#10101a", borderLeft:"1px solid #1e1e2e", padding:12, display:"flex", flexDirection:"column", gap:10, overflowY:"auto", flexShrink:0 }}>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:10, color:"#e94560", letterSpacing:1 }}>PROPERTIES</div>

            <PropRow label="Text">
              <textarea value={selBox.text}
                onChange={e => setTextBoxes(prev => prev.map(b => b.id===selected?{...b,text:e.target.value}:b))}
                style={{ width:"100%", background:"#1e1e2e", border:"1px solid #2a2a3a", color:"#e8e6f0", borderRadius:4, padding:5, fontSize:12, resize:"vertical", fontFamily:"inherit", minHeight:52, boxSizing:"border-box" }} />
            </PropRow>

            <PropRow label="Font">
              <select value={selBox.font}
                onChange={e => { setTextBoxes(prev => prev.map(b => b.id===selected?{...b,font:e.target.value}:b)); setFontFamily(e.target.value); }}
                style={{ ...selStyle, width:"100%" }}>
                {FONTS.map(f => <option key={f}>{f}</option>)}
              </select>
            </PropRow>

            <PropRow label="Size">
              <FontSizeControl value={selBox.size}
                onChange={v => { setTextBoxes(prev => prev.map(b => b.id===selected?{...b,size:v}:b)); setFontSize(v); }} />
            </PropRow>

            <div style={{ display:"flex", gap:6 }}>
              <Btn onClick={() => { const v=!selBox.bold;   setTextBoxes(prev=>prev.map(b=>b.id===selected?{...b,bold:v}:b));   setBold(v);   }} accent="#a78bfa" active={selBox.bold}   style={{ flex:1, fontWeight:700 }}>B</Btn>
              <Btn onClick={() => { const v=!selBox.italic; setTextBoxes(prev=>prev.map(b=>b.id===selected?{...b,italic:v}:b)); setItalic(v); }} accent="#a78bfa" active={selBox.italic} style={{ flex:1, fontStyle:"italic" }}>I</Btn>
            </div>

            <PropRow label="Color">
              <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                {COLORS.map(c => (
                  <div key={c} onClick={() => { setTextBoxes(prev=>prev.map(b=>b.id===selected?{...b,color:c}:b)); setColor(c); }}
                    style={{ width:18, height:18, borderRadius:3, background:c, cursor:"pointer", border: selBox.color===c?"2px solid #e94560":"2px solid #333" }} />
                ))}
                <input type="color" value={selBox.color}
                  onChange={e => { setTextBoxes(prev=>prev.map(b=>b.id===selected?{...b,color:e.target.value}:b)); setColor(e.target.value); }}
                  style={{ width:20, height:20, border:"none", background:"none", cursor:"pointer", padding:0 }} />
              </div>
            </PropRow>

            <PropRow label="Position">
              <span style={{ fontSize:11, color:"#555" }}>x:{Math.round(selBox.x)} y:{Math.round(selBox.y)}</span>
            </PropRow>

            <Btn onClick={copySelected}   accent="#a78bfa" style={{ fontSize:11 }}>⎘ Copy Box</Btn>
            <Btn onClick={deleteSelected} accent="#ff6b6b" style={{ fontSize:11 }}>✕ Remove</Btn>
          </div>
        )}
      </div>

      {/* ══ PAGE NAV ══════════════════════════════════════════════════════════ */}
      {pageImages.length > 0 && (
        <div style={{ background:"#16161f", borderTop:"1px solid #2a2a3a", height:40, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", gap:12 }}>
          <IBtn onClick={() => setCurrentPage(p=>Math.max(0,p-1))}                         disabled={currentPage===0}>‹</IBtn>
          <span style={{ fontSize:12, color:"#555", fontFamily:"'Space Mono',monospace" }}>{currentPage+1} / {pageImages.length}</span>
          <IBtn onClick={() => setCurrentPage(p=>Math.min(pageImages.length-1,p+1))} disabled={currentPage>=pageImages.length-1}>›</IBtn>
        </div>
      )}
    </div>
  );
}

// ─── TextBox ──────────────────────────────────────────────────────────────────
function TextBox({ box, zoom, selected, onSelect, onStartDrag, onChange }) {
  const [editing, setEditing] = useState(false);
  const ref = useRef(null);
  useEffect(() => { if (editing && ref.current) ref.current.focus(); }, [editing]);

  const base = {
    position:"absolute", left:box.x*zoom, top:box.y*zoom,
    fontSize:box.size*zoom, fontFamily:box.font,
    fontWeight:box.bold?"bold":"normal", fontStyle:box.italic?"italic":"normal",
    color:box.color,
    border:  selected?"1.5px dashed #e94560":"1.5px dashed transparent",
    borderRadius:3, padding:"2px 4px",
    background: selected?"rgba(233,69,96,0.06)":"transparent",
    whiteSpace:"pre", lineHeight:1.2, zIndex: selected?10:5,
    minWidth:20, cursor:"move", userSelect:"none",
    // FIX: touchAction:none only on the text box itself so drag works,
    // but this won't block the parent scroll when no text box is being touched
    touchAction:"none",
  };

  const startTouchDrag = (e) => {
    e.stopPropagation();
    onSelect();
    const touch  = e.touches[0];
    const elRect = e.currentTarget.getBoundingClientRect();
    onStartDrag({ clientX:touch.clientX, clientY:touch.clientY, currentTarget:{ getBoundingClientRect:()=>elRect }, stopPropagation:()=>{} });
  };

  if (editing) return (
    <textarea ref={ref} value={box.text}
      onChange={e => onChange(e.target.value)}
      onBlur={() => setEditing(false)}
      onKeyDown={e => { if (e.key==="Escape") setEditing(false); e.stopPropagation(); }}
      style={{ ...base, cursor:"text", resize:"none", outline:"none", background:"rgba(233,69,96,0.08)", border:"1.5px solid #e94560", overflow:"hidden", minWidth:100, minHeight:box.size*zoom+10 }}
    />
  );

  return (
    <div style={base}
      onMouseDown={e => { onSelect(); onStartDrag(e); }}
      onTouchStart={startTouchDrag}
      onDoubleClick={e => { e.stopPropagation(); setEditing(true); }}>
      {box.text}
    </div>
  );
}

// ─── Tiny helpers ─────────────────────────────────────────────────────────────
const Btn = ({ children, onClick, accent="#e8e6f0", active=false, disabled=false, style={} }) => (
  <button onClick={onClick} disabled={disabled}
    style={{ background:active?accent:"#1e1e2e", color:active?"#fff":accent, border:`1px solid ${accent}44`,
      borderRadius:6, padding:"5px 11px", cursor:disabled?"default":"pointer", fontSize:12,
      fontFamily:"'DM Sans',sans-serif", fontWeight:500, whiteSpace:"nowrap", flexShrink:0,
      opacity:disabled?0.35:1, transition:"background .15s, color .15s", ...style }}>
    {children}
  </button>
);

const IBtn = ({ children, onClick, disabled }) => (
  <button onClick={onClick} disabled={disabled}
    style={{ background:"#1e1e2e", color:"#a78bfa", border:"1px solid #2a2a3a", borderRadius:5, padding:"3px 12px", cursor:"pointer", fontSize:16, opacity:disabled?0.3:1 }}>
    {children}
  </button>
);

const Div = () => <div style={{ width:1, height:24, background:"#2a2a3a", flexShrink:0 }} />;

const selStyle = { background:"#1e1e2e", color:"#e8e6f0", border:"1px solid #2a2a3a", borderRadius:5, padding:"4px 7px", fontSize:12, fontFamily:"'DM Sans',sans-serif", cursor:"pointer", flexShrink:0 };

const PropRow = ({ label, children }) => (
  <div>
    <div style={{ fontSize:10, color:"#555", letterSpacing:0.5, marginBottom:3, textTransform:"uppercase" }}>{label}</div>
    {children}
  </div>
);
