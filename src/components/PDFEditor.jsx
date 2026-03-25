import { useState, useRef, useEffect, useCallback } from "react";

// ─── Constants ─────────────────────────────────────────────────────────────────
const FONTS  = ["Helvetica","Times New Roman","Courier New","Georgia","Verdana","Arial Black"];
const COLORS = ["#000000","#ffffff","#e94560","#a78bfa","#f5a623","#2ecc71","#3498db","#ff6b6b","#1a1a2e","#0f3460"];
const DEFAULT_FONT_SIZE = 16;
const RENDER_SCALE = 2;
const ZOOM_MIN = 0.3;
const ZOOM_MAX = 5.0;

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
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const dist2  = (t1, t2) => Math.hypot(t2.clientX-t1.clientX, t2.clientY-t1.clientY);
const mid2   = (t1, t2) => ({ x:(t1.clientX+t2.clientX)/2, y:(t1.clientY+t2.clientY)/2 });

// ─── SwipeStrip ───────────────────────────────────────────────────────────────
function SwipeStrip({ children, style }) {
  const ref = useRef(null);
  const sx  = useRef(0), sl = useRef(0), active = useRef(false);
  return (
    <div ref={ref}
      onTouchStart={e=>{ sx.current=e.touches[0].clientX; sl.current=ref.current.scrollLeft; }}
      onTouchMove={e=>{ if(ref.current) ref.current.scrollLeft=sl.current-(e.touches[0].clientX-sx.current); }}
      onMouseDown={e=>{ active.current=true; sx.current=e.clientX; sl.current=ref.current.scrollLeft; ref.current.style.cursor="grabbing"; }}
      onMouseMove={e=>{ if(active.current&&ref.current) ref.current.scrollLeft=sl.current-(e.clientX-sx.current); }}
      onMouseUp={()=>{ active.current=false; if(ref.current) ref.current.style.cursor="grab"; }}
      onMouseLeave={()=>{ active.current=false; if(ref.current) ref.current.style.cursor="grab"; }}
      style={{ display:"flex",alignItems:"center",gap:8,overflowX:"auto",scrollbarWidth:"none",WebkitOverflowScrolling:"touch",cursor:"grab",userSelect:"none",...style }}>
      {children}
    </div>
  );
}

// ─── FontSizeControl ──────────────────────────────────────────────────────────
function FontSizeControl({ value, onChange }) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(String(value));
  const inputRef = useRef(null);
  useEffect(()=>{ setDraft(String(value)); },[value]);
  useEffect(()=>{ if(editing&&inputRef.current) inputRef.current.select(); },[editing]);
  const commit = () => {
    setEditing(false);
    const n = parseInt(draft,10);
    if(!isNaN(n)&&n>=4&&n<=200) onChange(n); else setDraft(String(value));
  };
  return (
    <div style={{ display:"flex",alignItems:"center",background:"#1e1e2e",border:"1px solid #2a2a3a",borderRadius:6,overflow:"hidden",flexShrink:0 }}>
      <button onClick={()=>onChange(Math.max(4,value-1))} style={{ background:"none",border:"none",color:"#a78bfa",fontSize:16,padding:"0 8px",cursor:"pointer",lineHeight:"28px",flexShrink:0 }}>−</button>
      {editing
        ? <input ref={inputRef} value={draft} onChange={e=>setDraft(e.target.value)} onBlur={commit}
            onKeyDown={e=>{ if(e.key==="Enter") commit(); if(e.key==="Escape"){setEditing(false);setDraft(String(value));} }}
            style={{ width:40,textAlign:"center",background:"#16161f",border:"none",color:"#e8e6f0",fontSize:13,fontFamily:"'Space Mono',monospace",padding:"0 2px",outline:"none",height:28 }} />
        : <span onClick={()=>setEditing(true)} style={{ width:40,textAlign:"center",color:"#e8e6f0",fontSize:13,fontFamily:"'Space Mono',monospace",cursor:"text",lineHeight:"28px",display:"block",flexShrink:0 }}>{value}</span>
      }
      <button onClick={()=>onChange(Math.min(200,value+1))} style={{ background:"none",border:"none",color:"#a78bfa",fontSize:16,padding:"0 8px",cursor:"pointer",lineHeight:"28px",flexShrink:0 }}>+</button>
    </div>
  );
}

// ─── useHistory ───────────────────────────────────────────────────────────────
function useHistory(initial) {
  const [idx, setIdx] = useState(0);
  const stack = useRef([initial]);
  const state   = stack.current[idx];
  const canUndo = idx > 0;
  const canRedo = idx < stack.current.length - 1;
  const push  = useCallback((next) => { stack.current=[...stack.current.slice(0,idx+1),next]; setIdx(stack.current.length-1); },[idx]);
  const undo  = useCallback(()=>{ if(canUndo) setIdx(i=>i-1); },[canUndo]);
  const redo  = useCallback(()=>{ if(canRedo) setIdx(i=>i+1); },[canRedo]);
  // patch: update current slot silently (used during drag so every pixel isn't a history entry)
  const patch = useCallback((next) => { stack.current=[...stack.current.slice(0,idx),next,...stack.current.slice(idx+1)]; },[idx]);
  return { state, push, patch, undo, redo, canUndo, canRedo };
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function PDFEditor() {
  const [pdfDoc,      setPdfDoc]      = useState(null);
  const [pdfBytes,    setPdfBytes]    = useState(null);
  const [pageImages,  setPageImages]  = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [libsReady,   setLibsReady]   = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [fileName,    setFileName]    = useState("document.pdf");
  const [saving,      setSaving]      = useState(false);

  const history   = useHistory([]);
  const textBoxes = history.state;

  // setTextBoxes(fn, addToHistory?)
  const setTextBoxes = useCallback((updater, addToHistory=true) => {
    const next = typeof updater==="function" ? updater(history.state) : updater;
    if(addToHistory) history.push(next); else history.patch(next);
  },[history]);

  const [selected,   setSelected]   = useState(null);
  const [clipboard,  setClipboard]  = useState(null);
  const [addingText, setAddingText] = useState(false);

  // FIX: dragging stored in a ref so touch handlers always see latest value
  // without needing to be recreated on every state change
  const draggingRef = useRef(null); // { id, offX, offY } | null
  const [draggingId, setDraggingId] = useState(null); // only for re-render trigger

  const [fontSize,   setFontSize]   = useState(DEFAULT_FONT_SIZE);
  const [fontFamily, setFontFamily] = useState("Helvetica");
  const [bold,       setBold]       = useState(false);
  const [italic,     setItalic]     = useState(false);
  const [color,      setColor]      = useState("#000000");

  const [zoom, setZoom] = useState(1);
  const [pan,  setPan]  = useState({ x:0, y:0 });
  const zoomRef = useRef(1);
  const panRef  = useRef({ x:0, y:0 });
  useEffect(()=>{ zoomRef.current=zoom; },[zoom]);
  useEffect(()=>{ panRef.current=pan;   },[pan]);

  // Keep a ref to textBoxes so touch handlers can read it without stale closure
  const textBoxesRef = useRef(textBoxes);
  useEffect(()=>{ textBoxesRef.current=textBoxes; },[textBoxes]);

  const gesture    = useRef({ type:"none", prevDist:0, prevMid:{x:0,y:0}, panStart:{x:0,y:0}, panOrigin:{x:0,y:0} });
  const viewportRef = useRef(null);
  const stageRef    = useRef(null);
  const fileRef     = useRef(null);

  // ── Load libs ─────────────────────────────────────────────────────────────
  useEffect(()=>{
    Promise.all([
      loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"),
      loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js"),
    ]).then(()=>{
      window.pdfjsLib.GlobalWorkerOptions.workerSrc=
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      setLibsReady(true);
    });
  },[]);

  // ── Render pages ──────────────────────────────────────────────────────────
  useEffect(()=>{
    if(!pdfDoc) return;
    (async()=>{
      setLoading(true);
      const imgs=[];
      for(let i=1;i<=pdfDoc.numPages;i++){
        const page=await pdfDoc.getPage(i);
        const vp=page.getViewport({scale:RENDER_SCALE});
        const cvs=document.createElement("canvas");
        cvs.width=vp.width; cvs.height=vp.height;
        await page.render({canvasContext:cvs.getContext("2d"),viewport:vp}).promise;
        imgs.push({dataUrl:cvs.toDataURL(),width:vp.width,height:vp.height});
      }
      setPageImages(imgs); setLoading(false);
      setZoom(1); setPan({x:0,y:0});
    })();
  },[pdfDoc]);

  // ── Open file ─────────────────────────────────────────────────────────────
  const openFile = async(e)=>{
    const file=e.target.files?.[0];
    if(!file||!libsReady) return;
    setFileName(file.name); setLoading(true);
    const buf=await file.arrayBuffer();
    setPdfBytes(buf.slice(0));
    const doc=await window.pdfjsLib.getDocument({data:buf.slice(0)}).promise;
    setPdfDoc(doc);
    history.push([]); setSelected(null); setCurrentPage(0);
    e.target.value="";
  };

  // ── Zoom toward a point ───────────────────────────────────────────────────
  const applyZoom = useCallback((newZoom, focal)=>{
    newZoom=clamp(newZoom,ZOOM_MIN,ZOOM_MAX);
    const oz=zoomRef.current, op=panRef.current;
    const sx=(focal.x-op.x)/oz, sy=(focal.y-op.y)/oz;
    setZoom(newZoom);
    setPan({ x:focal.x-sx*newZoom, y:focal.y-sy*newZoom });
  },[]);

  // ── Viewport touch handlers ───────────────────────────────────────────────
  // FIX: all touch logic uses refs so we never have stale closure over draggingRef
  const onViewportTouchStart = useCallback((e)=>{
    if(draggingRef.current) return; // text-box drag in progress

    if(e.touches.length===1){
      gesture.current={ ...gesture.current, type:"pan",
        panStart:{x:e.touches[0].clientX,y:e.touches[0].clientY},
        panOrigin:{...panRef.current} };
    } else if(e.touches.length===2){
      gesture.current={ ...gesture.current, type:"pinch",
        prevDist:dist2(e.touches[0],e.touches[1]),
        prevMid:mid2(e.touches[0],e.touches[1]) };
    }
  },[]);

  const onViewportTouchMove = useCallback((e)=>{
    // ── Text-box drag ────────────────────────────────────────────────────────
    if(draggingRef.current){
      e.preventDefault();
      const t=e.touches[0];
      const sr=stageRef.current?.getBoundingClientRect();
      if(!sr) return;
      const {id,offX,offY}=draggingRef.current;
      const x=(t.clientX-sr.left-offX)/zoomRef.current;
      const y=(t.clientY-sr.top -offY)/zoomRef.current;
      const next=textBoxesRef.current.map(b=>b.id===id?{...b,x,y}:b);
      textBoxesRef.current=next;           // update ref immediately
      history.patch(next);                 // update history slot silently
      setTextBoxes(()=>next, false);       // trigger re-render
      return;
    }

    e.preventDefault();

    if(gesture.current.type==="pan"&&e.touches.length===1){
      const dx=e.touches[0].clientX-gesture.current.panStart.x;
      const dy=e.touches[0].clientY-gesture.current.panStart.y;
      setPan({ x:gesture.current.panOrigin.x+dx, y:gesture.current.panOrigin.y+dy });

    } else if(gesture.current.type==="pinch"&&e.touches.length===2){
      const newDist=dist2(e.touches[0],e.touches[1]);
      const newMid =mid2(e.touches[0],e.touches[1]);
      const scale  =newDist/gesture.current.prevDist;
      const midDx  =newMid.x-gesture.current.prevMid.x;
      const midDy  =newMid.y-gesture.current.prevMid.y;
      const oz=zoomRef.current, op=panRef.current;
      const nz=clamp(oz*scale,ZOOM_MIN,ZOOM_MAX);
      const sx=(newMid.x-op.x)/oz, sy=(newMid.y-op.y)/oz;
      setZoom(nz);
      setPan({ x:newMid.x-sx*nz+midDx, y:newMid.y-sy*nz+midDy });
      gesture.current.prevDist=newDist;
      gesture.current.prevMid =newMid;
    }
  },[history, setTextBoxes]);

  const onViewportTouchEnd = useCallback((e)=>{
    // ── End text-box drag ────────────────────────────────────────────────────
    if(draggingRef.current){
      history.push(textBoxesRef.current); // commit to history
      draggingRef.current=null;
      setDraggingId(null);
      return;
    }
    if(e.touches.length<2){
      if(gesture.current.type==="pinch"&&e.touches.length===1){
        gesture.current={ ...gesture.current, type:"pan",
          panStart:{x:e.touches[0].clientX,y:e.touches[0].clientY},
          panOrigin:{...panRef.current} };
      } else {
        gesture.current.type="none";
      }
    }
  },[history]);

  // Attach touch listeners with passive:false so we can preventDefault
  useEffect(()=>{
    const el=viewportRef.current;
    if(!el) return;
    el.addEventListener("touchstart", onViewportTouchStart, {passive:true});
    el.addEventListener("touchmove",  onViewportTouchMove,  {passive:false});
    el.addEventListener("touchend",   onViewportTouchEnd,   {passive:true});
    el.addEventListener("touchcancel",onViewportTouchEnd,   {passive:true});
    return()=>{
      el.removeEventListener("touchstart", onViewportTouchStart);
      el.removeEventListener("touchmove",  onViewportTouchMove);
      el.removeEventListener("touchend",   onViewportTouchEnd);
      el.removeEventListener("touchcancel",onViewportTouchEnd);
    };
  },[onViewportTouchStart, onViewportTouchMove, onViewportTouchEnd]);

  // Mouse wheel zoom
  useEffect(()=>{
    const el=viewportRef.current;
    if(!el) return;
    const handler=(e)=>{
      e.preventDefault();
      const vr=el.getBoundingClientRect();
      applyZoom(zoomRef.current*(e.deltaY>0?0.9:1.1),{x:e.clientX-vr.left,y:e.clientY-vr.top});
    };
    el.addEventListener("wheel",handler,{passive:false});
    return()=>el.removeEventListener("wheel",handler);
  },[applyZoom]);

  // ── Place text ────────────────────────────────────────────────────────────
  const handleStageClick = useCallback((e)=>{
    if(!addingText||!pageImages[currentPage]) return;
    const sr=stageRef.current.getBoundingClientRect();
    const x=(e.clientX-sr.left)/zoomRef.current;
    const y=(e.clientY-sr.top )/zoomRef.current;
    const nb={id:uid(),x,y,page:currentPage,text:"Text",font:fontFamily,size:fontSize,bold,italic,color};
    setTextBoxes(prev=>[...prev,nb]);
    setSelected(nb.id);
    setAddingText(false);
  },[addingText,pageImages,currentPage,fontFamily,fontSize,bold,italic,color,setTextBoxes]);

  // Click on viewport background → deselect (closes properties panel)
  const handleViewportClick = useCallback((e)=>{
    // Only deselect if clicking the stage background, not a text box
    if(e.target===stageRef.current||e.target===stageRef.current?.firstChild){
      setSelected(null);
    }
  },[]);

  // ── Mouse drag ────────────────────────────────────────────────────────────
  const startMouseDrag = useCallback((e, id)=>{
    e.stopPropagation();
    const elRect=e.currentTarget.getBoundingClientRect();
    draggingRef.current={ id, offX:e.clientX-elRect.left, offY:e.clientY-elRect.top };
    setDraggingId(id);
    setSelected(id);
  },[]);

  const onMouseMove = useCallback((e)=>{
    if(!draggingRef.current||!stageRef.current) return;
    const sr=stageRef.current.getBoundingClientRect();
    const {id,offX,offY}=draggingRef.current;
    const x=(e.clientX-sr.left-offX)/zoomRef.current;
    const y=(e.clientY-sr.top -offY)/zoomRef.current;
    const next=textBoxesRef.current.map(b=>b.id===id?{...b,x,y}:b);
    textBoxesRef.current=next;
    history.patch(next);
    setTextBoxes(()=>next, false);
  },[history, setTextBoxes]);

  const stopMouseDrag = useCallback(()=>{
    if(draggingRef.current){
      history.push(textBoxesRef.current);
      draggingRef.current=null;
      setDraggingId(null);
    }
  },[history]);

  // ── Touch drag start (called from TextBox) ────────────────────────────────
  const startTouchDrag = useCallback((id, offX, offY)=>{
    draggingRef.current={ id, offX, offY };
    setDraggingId(id);
    setSelected(id);
  },[]);

  // ── Sync toolbar ← selected ───────────────────────────────────────────────
  const applyStyle = useCallback((key,val)=>{
    if(!selected) return;
    setTextBoxes(prev=>prev.map(b=>b.id===selected?{...b,[key]:val}:b));
  },[selected,setTextBoxes]);

  useEffect(()=>{
    if(!selected) return;
    const b=textBoxes.find(x=>x.id===selected);
    if(!b) return;
    setFontFamily(b.font); setFontSize(b.size); setBold(b.bold); setItalic(b.italic); setColor(b.color);
  },[selected]); // eslint-disable-line

  // ── Copy / Paste / Delete ─────────────────────────────────────────────────
  const copySelected   = ()=>{ const b=textBoxes.find(x=>x.id===selected); if(b) setClipboard({...b}); };
  const pasteClipboard = ()=>{
    if(!clipboard) return;
    const nb={...clipboard,id:uid(),x:clipboard.x+20,y:clipboard.y+20};
    setTextBoxes(prev=>[...prev,nb]); setSelected(nb.id);
  };
  const deleteSelected = ()=>{ setTextBoxes(prev=>prev.filter(b=>b.id!==selected)); setSelected(null); };

  // ── Save PDF ──────────────────────────────────────────────────────────────
  const savePDF = async()=>{
    if(!pdfBytes||!window.PDFLib) return;
    setSaving(true);
    try{
      const {PDFDocument,rgb,StandardFonts}=window.PDFLib;
      const doc=await PDFDocument.load(pdfBytes);
      const pages=doc.getPages();
      const cache={};
      const stdFont=(box)=>{
        if(box.font==="Times New Roman") return box.bold?StandardFonts.TimesRomanBold:box.italic?StandardFonts.TimesRomanItalic:StandardFonts.TimesRoman;
        if(box.font==="Courier New")     return box.bold?StandardFonts.CourierBold:box.italic?StandardFonts.CourierOblique:StandardFonts.Courier;
        return box.bold?StandardFonts.HelveticaBold:box.italic?StandardFonts.HelveticaOblique:StandardFonts.Helvetica;
      };
      for(const box of textBoxes){
        const pg=pages[box.page]; if(!pg) continue;
        const {height:pdfH}=pg.getSize();
        const pdfX=box.x/RENDER_SCALE;
        const pdfY=pdfH-(box.y/RENDER_SCALE)-box.size;
        const sf=stdFont(box);
        if(!cache[sf]) cache[sf]=await doc.embedFont(sf);
        const [r,g,b]=hexToRgbArr(box.color);
        pg.drawText(box.text,{x:pdfX,y:pdfY,size:box.size,font:cache[sf],color:rgb(r,g,b)});
      }
      const bytes=await doc.save();
      const blob=new Blob([bytes],{type:"application/pdf"});
      const outName=fileName.replace(/\.pdf$/i,"_edited.pdf");
      try{
        const {Filesystem,Directory}=await import("@capacitor/filesystem");
        const {Share}=await import("@capacitor/share");
        const b64=await new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result.split(",")[1]); r.onerror=rej; r.readAsDataURL(blob); });
        const result=await Filesystem.writeFile({path:outName,data:b64,directory:Directory.Documents});
        await Share.share({title:outName,url:result.uri,dialogTitle:"Save or share PDF"});
      }catch(_){
        const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=outName; a.click();
      }
    }finally{ setSaving(false); }
  };

  const selBox  = textBoxes.find(b=>b.id===selected);
  const pageImg = pageImages[currentPage];

  const zoomBy    = (f)=>{ if(!viewportRef.current) return; const r=viewportRef.current.getBoundingClientRect(); applyZoom(zoomRef.current*f,{x:r.width/2,y:r.height/2}); };
  const zoomReset = ()=>{ setZoom(1); setPan({x:0,y:0}); };

  return (
    <div
      style={{ fontFamily:"'DM Sans',sans-serif",background:"#0e0e16",height:"100dvh",display:"flex",flexDirection:"column",color:"#e8e6f0",overflow:"hidden" }}
      onMouseMove={onMouseMove}
      onMouseUp={stopMouseDrag}
    >
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Space+Mono:wght@700&display=swap" rel="stylesheet" />

      {/* ══ TOP BAR ═══════════════════════════════════════════════════════════ */}
      <div style={{ background:"#16161f",borderBottom:"1px solid #2a2a3a",height:50,flexShrink:0,display:"flex",alignItems:"center" }}>
        <div style={{ flexShrink:0,padding:"0 14px",borderRight:"1px solid #2a2a3a",height:"100%",display:"flex",alignItems:"center" }}>
          <span style={{ fontFamily:"'Space Mono',monospace",fontSize:14,fontWeight:700,color:"#e94560",letterSpacing:-0.5,whiteSpace:"nowrap" }}>PDF•ED</span>
        </div>
        <SwipeStrip style={{ flex:1,height:"100%",padding:"0 10px",gap:8 }}>
          <Btn onClick={()=>fileRef.current.click()} accent="#e94560">⊕ Open</Btn>
          <input ref={fileRef} type="file" accept=".pdf" onChange={openFile} style={{ display:"none" }} />
          <Div />
          <Btn onClick={()=>setAddingText(t=>!t)} accent="#e94560" active={addingText}>
            {addingText?"✎ Tap page…":"✎ Add Text"}
          </Btn>
          <Div />
          <Btn onClick={history.undo} disabled={!history.canUndo} accent="#a78bfa">↩ Undo</Btn>
          <Btn onClick={history.redo} disabled={!history.canRedo} accent="#a78bfa">↪ Redo</Btn>
          <Div />
          <Btn onClick={copySelected}   disabled={!selected}  accent="#a78bfa">⎘ Copy</Btn>
          <Btn onClick={pasteClipboard} disabled={!clipboard} accent="#a78bfa">⎘ Paste</Btn>
          <Btn onClick={deleteSelected} disabled={!selected}  accent="#ff6b6b">✕ Delete</Btn>
          <Div />
          <Btn onClick={savePDF} disabled={!pdfBytes||saving} accent="#2ecc71" style={{ fontWeight:600 }}>
            {saving?"Saving…":"↓ Save PDF"}
          </Btn>
        </SwipeStrip>
      </div>

      {/* ══ TOOLBAR ═══════════════════════════════════════════════════════════ */}
      {pdfDoc && (
        <div style={{ background:"#12121b",borderBottom:"1px solid #2a2a3a",height:46,flexShrink:0,display:"flex",alignItems:"center" }}>
          <SwipeStrip style={{ flex:1,height:"100%",padding:"0 10px",gap:8 }}>
            <select value={fontFamily} onChange={e=>{ setFontFamily(e.target.value); applyStyle("font",e.target.value); }} style={selStyle}>
              {FONTS.map(f=><option key={f}>{f}</option>)}
            </select>
            <FontSizeControl value={fontSize} onChange={v=>{ setFontSize(v); applyStyle("size",v); }} />
            <Div />
            <Btn onClick={()=>{ const v=!bold;   setBold(v);   applyStyle("bold",v);   }} accent="#a78bfa" active={bold}   style={{ fontWeight:700,minWidth:32,padding:"4px 10px" }}>B</Btn>
            <Btn onClick={()=>{ const v=!italic; setItalic(v); applyStyle("italic",v); }} accent="#a78bfa" active={italic} style={{ fontStyle:"italic",minWidth:32,padding:"4px 10px" }}>I</Btn>
            <Div />
            {COLORS.map(c=>(
              <div key={c} onClick={()=>{ setColor(c); applyStyle("color",c); }}
                style={{ width:22,height:22,borderRadius:5,background:c,cursor:"pointer",flexShrink:0,border:color===c?"2px solid #e94560":"2px solid #2a2a3a" }} />
            ))}
            <input type="color" value={color} onChange={e=>{ setColor(e.target.value); applyStyle("color",e.target.value); }}
              style={{ width:24,height:24,border:"none",background:"none",cursor:"pointer",padding:0,flexShrink:0 }} />
            <Div />
            <span style={{ fontSize:11,color:"#555",whiteSpace:"nowrap",flexShrink:0 }}>ZOOM</span>
            <Btn onClick={()=>zoomBy(0.9)} accent="#a78bfa" style={{ minWidth:28,padding:"4px 8px" }}>−</Btn>
            <span style={{ fontSize:12,color:"#a78bfa",minWidth:42,textAlign:"center",fontFamily:"'Space Mono',monospace",flexShrink:0 }}>{Math.round(zoom*100)}%</span>
            <Btn onClick={()=>zoomBy(1.1)} accent="#a78bfa" style={{ minWidth:28,padding:"4px 8px" }}>+</Btn>
            <Btn onClick={zoomReset} accent="#666" style={{ fontSize:10,padding:"4px 8px" }}>↺</Btn>
          </SwipeStrip>
        </div>
      )}

      {/* ══ MAIN ══════════════════════════════════════════════════════════════ */}
      <div style={{ flex:1,display:"flex",overflow:"hidden",position:"relative" }}>

        {/* Thumbnails */}
        {pageImages.length>1 && (
          <div style={{ width:70,background:"#10101a",borderRight:"1px solid #1e1e2e",overflowY:"auto",padding:"6px 4px",display:"flex",flexDirection:"column",gap:5,flexShrink:0 }}>
            {pageImages.map((img,i)=>(
              <div key={i} onClick={()=>setCurrentPage(i)}
                style={{ border:i===currentPage?"2px solid #e94560":"2px solid #2a2a3a",borderRadius:4,overflow:"hidden",cursor:"pointer",opacity:i===currentPage?1:0.55 }}>
                <img src={img.dataUrl} style={{ width:"100%",display:"block" }} />
                <div style={{ textAlign:"center",fontSize:9,color:"#555",padding:"1px 0" }}>{i+1}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Viewport ─────────────────────────────────────────────────────── */}
        <div
          ref={viewportRef}
          onClick={handleViewportClick}
          style={{ flex:1,overflow:"hidden",position:"relative",touchAction:"none",cursor:addingText?"crosshair":"default" }}
        >
          {loading && (
            <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center" }}>
              <div style={{ color:"#e94560",fontFamily:"'Space Mono',monospace" }}>Loading PDF…</div>
            </div>
          )}
          {!pdfBytes&&!loading && (
            <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center" }}>
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:52,marginBottom:12 }}>📄</div>
                <div style={{ color:"#e94560",fontFamily:"'Space Mono',monospace",fontSize:20,marginBottom:6 }}>PDF EDITOR</div>
                <div style={{ color:"#444",fontSize:13,marginBottom:20 }}>Open a PDF to start annotating</div>
                <button onClick={()=>fileRef.current.click()} style={{ background:"#e94560",color:"#fff",border:"none",borderRadius:8,padding:"10px 22px",fontSize:14,cursor:"pointer" }}>
                  ⊕ Open PDF File
                </button>
              </div>
            </div>
          )}

          {pageImg&&!loading && (
            <div
              ref={stageRef}
              onClick={handleStageClick}
              style={{ position:"absolute",top:0,left:0,transformOrigin:"0 0",transform:`translate(${pan.x}px,${pan.y}px) scale(${zoom})`,willChange:"transform" }}
            >
              <div style={{ position:"relative",width:pageImg.width,height:pageImg.height,boxShadow:"0 8px 40px #000b",borderRadius:3,overflow:"hidden",userSelect:"none" }}>
                <img src={pageImg.dataUrl} style={{ width:"100%",height:"100%",display:"block",pointerEvents:"none" }} />
                {textBoxes.filter(b=>b.page===currentPage).map(b=>(
                  <TextBox key={b.id} box={b}
                    selected={b.id===selected}
                    onSelect={()=>setSelected(b.id)}
                    onStartMouseDrag={(e)=>startMouseDrag(e,b.id)}
                    onStartTouchDrag={(offX,offY)=>startTouchDrag(b.id,offX,offY)}
                    onChange={(text)=>setTextBoxes(prev=>prev.map(x=>x.id===b.id?{...x,text}:x))}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Properties panel — FIX: overlay on mobile, closable ──────────── */}
        {selBox && (
          <div style={{
            position:"absolute", top:0, right:0, bottom:0,
            width:200,
            background:"#10101a",
            borderLeft:"1px solid #1e1e2e",
            padding:12,
            display:"flex", flexDirection:"column", gap:10,
            overflowY:"auto",
            zIndex:50,
            boxShadow:"-4px 0 20px #000a",
          }}>
            {/* Header with close button */}
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
              <div style={{ fontFamily:"'Space Mono',monospace",fontSize:10,color:"#e94560",letterSpacing:1 }}>PROPERTIES</div>
              <button
                onClick={()=>setSelected(null)}
                style={{ background:"none",border:"none",color:"#555",fontSize:18,cursor:"pointer",lineHeight:1,padding:"0 2px" }}
                title="Close">✕</button>
            </div>

            <PropRow label="Text">
              <textarea value={selBox.text}
                onChange={e=>setTextBoxes(prev=>prev.map(b=>b.id===selected?{...b,text:e.target.value}:b))}
                style={{ width:"100%",background:"#1e1e2e",border:"1px solid #2a2a3a",color:"#e8e6f0",borderRadius:4,padding:5,fontSize:12,resize:"vertical",fontFamily:"inherit",minHeight:52,boxSizing:"border-box" }} />
            </PropRow>
            <PropRow label="Font">
              <select value={selBox.font} onChange={e=>{ setTextBoxes(prev=>prev.map(b=>b.id===selected?{...b,font:e.target.value}:b)); setFontFamily(e.target.value); }} style={{ ...selStyle,width:"100%" }}>
                {FONTS.map(f=><option key={f}>{f}</option>)}
              </select>
            </PropRow>
            <PropRow label="Size">
              <FontSizeControl value={selBox.size} onChange={v=>{ setTextBoxes(prev=>prev.map(b=>b.id===selected?{...b,size:v}:b)); setFontSize(v); }} />
            </PropRow>
            <div style={{ display:"flex",gap:6 }}>
              <Btn onClick={()=>{ const v=!selBox.bold;   setTextBoxes(prev=>prev.map(b=>b.id===selected?{...b,bold:v}:b));   setBold(v);   }} accent="#a78bfa" active={selBox.bold}   style={{ flex:1,fontWeight:700 }}>B</Btn>
              <Btn onClick={()=>{ const v=!selBox.italic; setTextBoxes(prev=>prev.map(b=>b.id===selected?{...b,italic:v}:b)); setItalic(v); }} accent="#a78bfa" active={selBox.italic} style={{ flex:1,fontStyle:"italic" }}>I</Btn>
            </div>
            <PropRow label="Color">
              <div style={{ display:"flex",flexWrap:"wrap",gap:4 }}>
                {COLORS.map(c=>(
                  <div key={c} onClick={()=>{ setTextBoxes(prev=>prev.map(b=>b.id===selected?{...b,color:c}:b)); setColor(c); }}
                    style={{ width:18,height:18,borderRadius:3,background:c,cursor:"pointer",border:selBox.color===c?"2px solid #e94560":"2px solid #333" }} />
                ))}
                <input type="color" value={selBox.color}
                  onChange={e=>{ setTextBoxes(prev=>prev.map(b=>b.id===selected?{...b,color:e.target.value}:b)); setColor(e.target.value); }}
                  style={{ width:20,height:20,border:"none",background:"none",cursor:"pointer",padding:0 }} />
              </div>
            </PropRow>
            <PropRow label="Position">
              <span style={{ fontSize:11,color:"#555" }}>x:{Math.round(selBox.x)} y:{Math.round(selBox.y)}</span>
            </PropRow>
            <Btn onClick={copySelected}   accent="#a78bfa" style={{ fontSize:11 }}>⎘ Copy Box</Btn>
            <Btn onClick={deleteSelected} accent="#ff6b6b" style={{ fontSize:11 }}>✕ Remove</Btn>
          </div>
        )}
      </div>

      {/* ══ PAGE NAV ══════════════════════════════════════════════════════════ */}
      {pageImages.length>0 && (
        <div style={{ background:"#16161f",borderTop:"1px solid #2a2a3a",height:40,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",gap:12 }}>
          <IBtn onClick={()=>setCurrentPage(p=>Math.max(0,p-1))}                          disabled={currentPage===0}>‹</IBtn>
          <span style={{ fontSize:12,color:"#555",fontFamily:"'Space Mono',monospace" }}>{currentPage+1} / {pageImages.length}</span>
          <IBtn onClick={()=>setCurrentPage(p=>Math.min(pageImages.length-1,p+1))} disabled={currentPage>=pageImages.length-1}>›</IBtn>
        </div>
      )}
    </div>
  );
}

// ─── TextBox ──────────────────────────────────────────────────────────────────
function TextBox({ box, selected, onSelect, onStartMouseDrag, onStartTouchDrag, onChange }) {
  const [editing, setEditing] = useState(false);
  const ref = useRef(null);
  useEffect(()=>{ if(editing&&ref.current) ref.current.focus(); },[editing]);

  const base = {
    position:"absolute", left:box.x, top:box.y,
    fontSize:box.size, fontFamily:box.font,
    fontWeight:box.bold?"bold":"normal", fontStyle:box.italic?"italic":"normal",
    color:box.color,
    border:selected?"1.5px dashed #e94560":"1.5px dashed transparent",
    borderRadius:3, padding:"2px 4px",
    background:selected?"rgba(233,69,96,0.06)":"transparent",
    whiteSpace:"pre", lineHeight:1.2, zIndex:selected?10:5,
    minWidth:20, cursor:"move", userSelect:"none",
    touchAction:"none",
  };

  const onTouchStart = (e) => {
    e.stopPropagation();
    onSelect();
    const touch  = e.touches[0];
    const elRect = e.currentTarget.getBoundingClientRect();
    // Pass offsets in screen pixels; parent divides by zoom
    onStartTouchDrag(touch.clientX-elRect.left, touch.clientY-elRect.top);
  };

  if(editing) return (
    <textarea ref={ref} value={box.text}
      onChange={e=>onChange(e.target.value)}
      onBlur={()=>setEditing(false)}
      onKeyDown={e=>{ if(e.key==="Escape") setEditing(false); e.stopPropagation(); }}
      style={{ ...base,cursor:"text",resize:"none",outline:"none",background:"rgba(233,69,96,0.08)",border:"1.5px solid #e94560",overflow:"hidden",minWidth:100,minHeight:box.size+10 }}
    />
  );

  return (
    <div style={base}
      onMouseDown={e=>{ onSelect(); onStartMouseDrag(e); }}
      onTouchStart={onTouchStart}
      onDoubleClick={e=>{ e.stopPropagation(); setEditing(true); }}>
      {box.text}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const Btn = ({ children, onClick, accent="#e8e6f0", active=false, disabled=false, style={} }) => (
  <button onClick={onClick} disabled={disabled}
    style={{ background:active?accent:"#1e1e2e",color:active?"#fff":accent,border:`1px solid ${accent}44`,
      borderRadius:6,padding:"5px 11px",cursor:disabled?"default":"pointer",fontSize:12,
      fontFamily:"'DM Sans',sans-serif",fontWeight:500,whiteSpace:"nowrap",flexShrink:0,
      opacity:disabled?0.35:1,transition:"background .15s, color .15s",...style }}>
    {children}
  </button>
);
const IBtn = ({ children, onClick, disabled }) => (
  <button onClick={onClick} disabled={disabled}
    style={{ background:"#1e1e2e",color:"#a78bfa",border:"1px solid #2a2a3a",borderRadius:5,padding:"3px 12px",cursor:"pointer",fontSize:16,opacity:disabled?0.3:1 }}>
    {children}
  </button>
);
const Div = () => <div style={{ width:1,height:24,background:"#2a2a3a",flexShrink:0 }} />;
const selStyle = { background:"#1e1e2e",color:"#e8e6f0",border:"1px solid #2a2a3a",borderRadius:5,padding:"4px 7px",fontSize:12,fontFamily:"'DM Sans',sans-serif",cursor:"pointer",flexShrink:0 };
const PropRow = ({ label, children }) => (
  <div>
    <div style={{ fontSize:10,color:"#555",letterSpacing:0.5,marginBottom:3,textTransform:"uppercase" }}>{label}</div>
    {children}
  </div>
);
