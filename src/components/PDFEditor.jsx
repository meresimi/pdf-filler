import { useState, useRef, useEffect, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════
const RENDER_SCALE = 2;
const ZOOM_MIN = 0.3;
const ZOOM_MAX = 5.0;
const FONTS = ["Helvetica","Times New Roman","Courier New","Georgia","Verdana","Arial Black"];
const COLORS = ["#000000","#1d4ed8","#dc2626","#16a34a","#d97706","#7c3aed","#db2777","#ffffff"];
const STROKE_WIDTHS = [1,2,3,5,8];
const HIGHLIGHT_COLORS = ["#FFF176","#A5F3FC","#BBF7D0","#FCA5A5","#DDD6FE"];
const DRAG_TOOLS  = new Set(["circle","textbox","highlight","blackout","line","arrow","draw"]);
const PLACE_TOOLS = new Set(["text","check","cross","date","sticky","image","sign","initials"]);

// ═══════════════════════════════════════════════════════════════════════════════
// SVG ICONS
// ═══════════════════════════════════════════════════════════════════════════════
const I = {
  Text:      ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M12 6v13M8 19h8"/></svg>,
  EditText:  ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 6h10M9 6v9M6 15h6"/><path d="M17 12l1.5 1.5L14 18H12v-2l5-4z" strokeWidth="1.5"/></svg>,
  Sign:      ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 16c2-4 4-7 5-7s1 3 2 4 3-3 4-3 2 2 3 2"/><line x1="3" y1="20" x2="21" y2="20" strokeWidth="1.5"/></svg>,
  Initials:  ()=><svg viewBox="0 0 24 24" fill="currentColor"><text x="3" y="16" fontSize="11" fontWeight="700" fontFamily="serif">JS</text><rect x="3" y="18" width="18" height="1.5" rx="1"/></svg>,
  Erase:     ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 20H7L3 16l10-10 7 7-3 4z"/><line x1="6" y1="14" x2="14" y2="6"/></svg>,
  Check:     ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="4,12 9,17 20,7"/></svg>,
  Cross:     ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>,
  Circle:    ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/></svg>,
  TextBox:   ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M7 9h4M9 9v6M13 9h4M15 9v6" strokeWidth="1.5"/></svg>,
  Date:      ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="4" width="18" height="17" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h2v2H8z M11 14h2v2h-2z M14 14h2v2h-2z" fill="currentColor" stroke="none"/></svg>,
  Img:       ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>,
  Blackout:  ()=><svg viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="10" rx="1.5" fill="currentColor"/></svg>,
  Highlight: ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3l6 0 3 9H6L9 3z"/><rect x="7" y="12" width="10" height="4"/><line x1="9" y1="20" x2="15" y2="20" strokeWidth="3"/></svg>,
  Draw:      ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3l4 4L7 21H3v-4L17 3z"/><line x1="14" y1="6" x2="18" y2="10"/></svg>,
  Line:      ()=><svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="19" x2="19" y2="5"/></svg>,
  Arrow:     ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="19" x2="19" y2="5"/><polyline points="9,5 19,5 19,15"/></svg>,
  Sticky:    ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3h14a1 1 0 0 1 1 1v12l-5 5H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><polyline points="15,3 15,16 20,16"/></svg>,
  Menu:      ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  Cursor:    ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5l3 3L12 15H9v-3L18.5 2.5z"/></svg>,
  Undo:      ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M3 13A9 9 0 1 0 6 6"/></svg>,
  Redo:      ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6"/><path d="M21 13A9 9 0 1 1 18 6"/></svg>,
  Save:      ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17,21 17,13 7,13 7,21"/><polyline points="7,3 7,8 15,8"/></svg>,
  Open:      ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
  Trash:     ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>,
  Close:     ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  ChevL:     ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15,18 9,12 15,6"/></svg>,
  ChevR:     ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9,18 15,12 9,6"/></svg>,
  Info:      ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="8" strokeWidth="3"/><line x1="12" y1="12" x2="12" y2="16"/></svg>,
};

const TOOLS = [
  {id:"text",      label:"Text",      Ic:I.Text},
  {id:"edittext",  label:"Edit text", Ic:I.EditText},
  {id:"sign",      label:"Sign",      Ic:I.Sign},
  {id:"initials",  label:"Initials",  Ic:I.Initials},
  {id:"erase",     label:"Erase",     Ic:I.Erase},
  {id:"check",     label:"Check",     Ic:I.Check},
  {id:"cross",     label:"Cross",     Ic:I.Cross},
  {id:"circle",    label:"Circle",    Ic:I.Circle},
  {id:"textbox",   label:"Text Box",  Ic:I.TextBox},
  {id:"date",      label:"Date",      Ic:I.Date},
  {id:"image",     label:"Image",     Ic:I.Img},
  {id:"blackout",  label:"Blackout",  Ic:I.Blackout},
  {id:"highlight", label:"Highlight", Ic:I.Highlight},
  {id:"draw",      label:"Draw",      Ic:I.Draw},
  {id:"line",      label:"Line",      Ic:I.Line},
  {id:"arrow",     label:"Arrow",     Ic:I.Arrow},
  {id:"sticky",    label:"Sticky",    Ic:I.Sticky},
];

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════
function loadScript(src) {
  return new Promise((res,rej)=>{
    if(document.querySelector(`script[src="${src}"]`)){res();return;}
    const s=document.createElement("script");
    s.src=src; s.onload=res; s.onerror=rej;
    document.head.appendChild(s);
  });
}
let _id=0;
const uid=()=>`a_${++_id}_${Date.now()}`;
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const dist2=(t1,t2)=>Math.hypot(t2.clientX-t1.clientX,t2.clientY-t1.clientY);
const mid2=(t1,t2)=>({x:(t1.clientX+t2.clientX)/2,y:(t1.clientY+t2.clientY)/2});
const hexToRgb=hex=>[parseInt(hex.slice(1,3),16)/255,parseInt(hex.slice(3,5),16)/255,parseInt(hex.slice(5,7),16)/255];
const todayStr=()=>{const d=new Date();return `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;};

// ═══════════════════════════════════════════════════════════════════════════════
// SWIPE STRIP
// ═══════════════════════════════════════════════════════════════════════════════
function SwipeStrip({children,style}){
  const ref=useRef(null);
  const sx=useRef(0),sl=useRef(0),active=useRef(false);
  return(
    <div ref={ref}
      onTouchStart={e=>{sx.current=e.touches[0].clientX;sl.current=ref.current.scrollLeft;}}
      onTouchMove={e=>{if(ref.current)ref.current.scrollLeft=sl.current-(e.touches[0].clientX-sx.current);}}
      onMouseDown={e=>{active.current=true;sx.current=e.clientX;sl.current=ref.current.scrollLeft;ref.current.style.cursor="grabbing";}}
      onMouseMove={e=>{if(active.current&&ref.current)ref.current.scrollLeft=sl.current-(e.clientX-sx.current);}}
      onMouseUp={()=>{active.current=false;if(ref.current)ref.current.style.cursor="grab";}}
      onMouseLeave={()=>{active.current=false;if(ref.current)ref.current.style.cursor="grab";}}
      style={{display:"flex",alignItems:"center",overflowX:"auto",scrollbarWidth:"none",WebkitOverflowScrolling:"touch",cursor:"grab",userSelect:"none",...style}}>
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// useHistory
// ═══════════════════════════════════════════════════════════════════════════════
function useHistory(initial){
  const [idx,setIdx]=useState(0);
  const stack=useRef([initial]);
  const state=stack.current[idx];
  const canUndo=idx>0,canRedo=idx<stack.current.length-1;
  const push =useCallback(next=>{stack.current=[...stack.current.slice(0,idx+1),next];setIdx(stack.current.length-1);},[idx]);
  const undo =useCallback(()=>{if(canUndo)setIdx(i=>i-1);},[canUndo]);
  const redo =useCallback(()=>{if(canRedo)setIdx(i=>i+1);},[canRedo]);
  const patch=useCallback(next=>{stack.current=[...stack.current.slice(0,idx),next,...stack.current.slice(idx+1)];},[idx]);
  return{state,push,patch,undo,redo,canUndo,canRedo};
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIGNATURE PAD MODAL
// ═══════════════════════════════════════════════════════════════════════════════
function SignaturePad({title,isInitials,onApply,onClose}){
  const canvasRef=useRef(null);
  const isDown=useRef(false);
  const paths=useRef([]);
  const cur=useRef([]);

  const getXY=e=>{
    const r=canvasRef.current.getBoundingClientRect();
    const s=e.touches?e.touches[0]:e;
    return{x:(s.clientX-r.left)*(canvasRef.current.width/r.width),y:(s.clientY-r.top)*(canvasRef.current.height/r.height)};
  };
  const redraw=()=>{
    const cvs=canvasRef.current,ctx=cvs.getContext("2d");
    ctx.clearRect(0,0,cvs.width,cvs.height);
    ctx.beginPath();ctx.strokeStyle="#e8e8e8";ctx.lineWidth=1;
    ctx.moveTo(cvs.width*0.1,cvs.height*0.78);ctx.lineTo(cvs.width*0.9,cvs.height*0.78);ctx.stroke();
    ctx.strokeStyle="#111";ctx.lineWidth=isInitials?3:2;ctx.lineCap="round";ctx.lineJoin="round";
    for(const p of [...paths.current,cur.current]){
      if(p.length<2)continue;
      ctx.beginPath();ctx.moveTo(p[0].x,p[0].y);
      for(let i=1;i<p.length;i++)ctx.lineTo(p[i].x,p[i].y);
      ctx.stroke();
    }
  };
  const down=e=>{e.preventDefault();isDown.current=true;cur.current=[getXY(e)];};
  const move=e=>{if(!isDown.current)return;e.preventDefault();cur.current.push(getXY(e));redraw();};
  const up  =()=>{if(!isDown.current)return;isDown.current=false;if(cur.current.length>1)paths.current.push([...cur.current]);cur.current=[];redraw();};
  const apply=()=>{if(paths.current.length===0)return;onApply(paths.current);};
  const W=isInitials?220:320,H=isInitials?110:150;
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.78)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#1a1a28",border:"1px solid #2a2a3a",borderRadius:16,padding:20,width:W+40,maxWidth:"92vw"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <span style={{fontWeight:600,color:"#e8e6f0",fontSize:15,fontFamily:"'DM Sans',sans-serif"}}>{title}</span>
          <button onClick={onClose} style={ST.iconBtn}><I.Close/></button>
        </div>
        <div style={{background:"#fff",borderRadius:8,overflow:"hidden",border:"1px solid #3a3a4a",touchAction:"none"}}>
          <canvas ref={canvasRef} width={W*2} height={H*2}
            style={{width:W,height:H,display:"block",touchAction:"none"}}
            onMouseDown={down} onMouseMove={move} onMouseUp={up} onMouseLeave={up}
            onTouchStart={down} onTouchMove={move} onTouchEnd={up}/>
        </div>
        <div style={{display:"flex",gap:8,marginTop:12}}>
          <button onClick={()=>{paths.current=[];cur.current=[];redraw();}} style={{...ST.menuBtn,flex:1}}>Clear</button>
          <button onClick={onClose} style={{...ST.menuBtn,flex:1}}>Cancel</button>
          <button onClick={apply} style={{...ST.menuBtn,flex:2,background:"#e94560",color:"#fff",border:"none"}}>Apply</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HAMBURGER MENU
// ═══════════════════════════════════════════════════════════════════════════════
function HamburgerMenu({onClose,onOpen,onSave,onUndo,onRedo,canUndo,canRedo,currentPage,totalPages,onPageChange,saving,hasPdf,onClearAll}){
  const [pg,setPg]=useState(String(currentPage+1));
  useEffect(()=>setPg(String(currentPage+1)),[currentPage]);
  const goPage=()=>{const n=parseInt(pg,10)-1;if(!isNaN(n)&&n>=0&&n<totalPages){onPageChange(n);onClose();}};
  return(
    <div style={{position:"fixed",inset:0,zIndex:150}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()}
        style={{position:"absolute",bottom:0,left:0,right:0,background:"#16161f",borderTop:"1px solid #2a2a3a",borderRadius:"20px 20px 0 0",padding:"8px 0 36px",maxHeight:"80vh",overflowY:"auto"}}>
        <div style={{width:36,height:4,background:"#2a2a3a",borderRadius:2,margin:"0 auto 18px"}}/>
        <div style={{padding:"0 16px"}}>
          <MSection label="FILE">
            <MRow icon={<I.Open/>} label="Open PDF"                   onClick={()=>{onOpen();onClose();}}/>
            <MRow icon={<I.Save/>} label={saving?"Saving…":"Save PDF"} onClick={()=>{if(!saving&&hasPdf){onSave();onClose();}}} disabled={!hasPdf||saving}/>
          </MSection>
          <MSection label="EDIT">
            <MRow icon={<I.Undo/>}  label="Undo"                     onClick={()=>{onUndo();onClose();}} disabled={!canUndo}/>
            <MRow icon={<I.Redo/>}  label="Redo"                     onClick={()=>{onRedo();onClose();}} disabled={!canRedo}/>
            <MRow icon={<I.Trash/>} label="Clear all annotations" accent="#ff6b6b" onClick={()=>{onClearAll();onClose();}} disabled={!hasPdf}/>
          </MSection>
          {hasPdf&&totalPages>1&&(
            <MSection label="PAGE NAVIGATION">
              <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px"}}>
                <button onClick={()=>onPageChange(Math.max(0,currentPage-1))} disabled={currentPage===0} style={ST.navBtn}><I.ChevL/></button>
                <input value={pg} onChange={e=>setPg(e.target.value)} onKeyDown={e=>e.key==="Enter"&&goPage()}
                  style={{width:44,textAlign:"center",background:"#1e1e2e",border:"1px solid #2a2a3a",color:"#e8e6f0",borderRadius:6,padding:"6px 4px",fontSize:13}}/>
                <span style={{color:"#555",fontSize:12}}>of {totalPages}</span>
                <button onClick={goPage} style={{...ST.menuBtn,padding:"6px 12px",fontSize:12}}>Go</button>
                <button onClick={()=>onPageChange(Math.min(totalPages-1,currentPage+1))} disabled={currentPage>=totalPages-1} style={ST.navBtn}><I.ChevR/></button>
              </div>
            </MSection>
          )}
          <MSection label="ABOUT">
            <div style={{padding:"12px 14px",display:"flex",gap:12,alignItems:"flex-start"}}>
              <div style={{color:"#a78bfa",width:20,height:20,flexShrink:0,marginTop:2}}><I.Info/></div>
              <div>
                <div style={{color:"#e8e6f0",fontSize:14,fontWeight:600,marginBottom:4}}>PDF Filler</div>
                <div style={{color:"#555",fontSize:12,lineHeight:1.6}}>Annotate, sign and fill PDF forms. All processing is local — nothing leaves your device.</div>
              </div>
            </div>
          </MSection>
        </div>
      </div>
    </div>
  );
}
const MSection=({label,children})=>(
  <div style={{marginBottom:14}}>
    <div style={{fontSize:10,color:"#444",letterSpacing:1.5,marginBottom:4,padding:"0 4px",fontFamily:"'DM Sans',sans-serif"}}>{label}</div>
    <div style={{background:"#0e0e16",borderRadius:10,overflow:"hidden"}}>{children}</div>
  </div>
);
const MRow=({icon,label,onClick,disabled,accent})=>(
  <button onClick={disabled?undefined:onClick}
    style={{display:"flex",alignItems:"center",gap:12,width:"100%",background:"none",border:"none",
      padding:"13px 14px",cursor:disabled?"default":"pointer",opacity:disabled?0.3:1,borderBottom:"1px solid #1a1a28"}}>
    <span style={{width:20,height:20,color:accent||"#a78bfa",flexShrink:0}}>{icon}</span>
    <span style={{color:accent||"#e8e6f0",fontSize:14,fontFamily:"'DM Sans',sans-serif"}}>{label}</span>
  </button>
);

// ═══════════════════════════════════════════════════════════════════════════════
// TOOL SETTINGS BAR
// ═══════════════════════════════════════════════════════════════════════════════
function ToolSettingsBar({activeTool,settings,onSettings,color,onColor,strokeWidth,onStrokeWidth,highlightColor,onHighlightColor}){
  if(!activeTool)return null;
  const needsColor  =["text","check","cross","date","sign","initials","draw","line","arrow","circle","textbox","sticky"].includes(activeTool);
  const needsStroke =["draw","line","arrow","circle"].includes(activeTool);
  const needsFont   =["text","textbox","date","sticky"].includes(activeTool);
  const needsHL     =activeTool==="highlight";
  if(!needsColor&&!needsStroke&&!needsFont&&!needsHL)return null;
  return(
    <div style={{background:"#0e0e16",borderTop:"1px solid #1a1a28",padding:"5px 12px",display:"flex",alignItems:"center",gap:6,overflowX:"auto",scrollbarWidth:"none",flexShrink:0}}>
      {needsHL&&HIGHLIGHT_COLORS.map(c=>(
        <div key={c} onClick={()=>onHighlightColor(c)}
          style={{width:22,height:22,borderRadius:4,background:c,cursor:"pointer",flexShrink:0,border:highlightColor===c?"2px solid #e94560":"2px solid transparent",opacity:0.9}}/>
      ))}
      {needsColor&&COLORS.map(c=>(
        <div key={c} onClick={()=>onColor(c)}
          style={{width:20,height:20,borderRadius:4,background:c,cursor:"pointer",flexShrink:0,border:color===c?"2px solid #e94560":c==="#ffffff"?"2px solid #333":"2px solid transparent"}}/>
      ))}
      {needsColor&&(
        <input type="color" value={color} onChange={e=>onColor(e.target.value)}
          style={{width:22,height:22,border:"none",background:"none",cursor:"pointer",padding:0,flexShrink:0}}/>
      )}
      {needsStroke&&(
        <div style={{display:"flex",gap:4,alignItems:"center",paddingLeft:4}}>
          <span style={{fontSize:10,color:"#444",whiteSpace:"nowrap"}}>W</span>
          {STROKE_WIDTHS.map(w=>(
            <button key={w} onClick={()=>onStrokeWidth(w)}
              style={{width:22,height:22,borderRadius:4,border:strokeWidth===w?"2px solid #e94560":"1px solid #2a2a3a",background:"#1e1e2e",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0}}>
              <div style={{width:Math.min(w*3,14),height:w,background:"#e8e6f0",borderRadius:2}}/>
            </button>
          ))}
        </div>
      )}
      {needsFont&&(
        <>
          <select value={settings.fontSize} onChange={e=>onSettings({...settings,fontSize:parseInt(e.target.value)})} style={ST.sel}>
            {[8,10,12,14,16,18,20,24,28,32,40,48].map(s=><option key={s} value={s}>{s}pt</option>)}
          </select>
          <select value={settings.fontFamily} onChange={e=>onSettings({...settings,fontFamily:e.target.value})} style={ST.sel}>
            {FONTS.map(f=><option key={f}>{f}</option>)}
          </select>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SVG SHAPES
// ═══════════════════════════════════════════════════════════════════════════════
function ArrowSVG({x0,y0,x1,y1,color,strokeWidth}){
  const dx=x1-x0,dy=y1-y0,len=Math.hypot(dx,dy);
  if(len<2)return null;
  const ux=dx/len,uy=dy/len,hs=Math.max(12,strokeWidth*4);
  const ax=x1-ux*hs,ay=y1-uy*hs,px=-uy*hs*0.5,py=ux*hs*0.5;
  return(
    <g stroke={color} fill={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <line x1={x0} y1={y0} x2={ax} y2={ay}/>
      <polygon points={`${x1},${y1} ${ax+px},${ay+py} ${ax-px},${ay-py}`} stroke="none"/>
    </g>
  );
}

function renderSVGAnnot(a,selected,onSelect,onDelete,activeTool){
  const sel=selected===a.id;
  const handleClick=e=>{
    e.stopPropagation();
    if(activeTool==="erase"){onDelete(a.id);return;}
    onSelect(a.id);
  };
  switch(a.type){
    case "draw":return(
      <g key={a.id} onClick={handleClick} style={{cursor:activeTool==="erase"?"not-allowed":"pointer"}}>
        {a.paths.map((p,i)=>(
          <polyline key={i} points={p.map(pt=>`${pt.x},${pt.y}`).join(" ")}
            stroke={a.color} fill="none" strokeWidth={a.strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
        ))}
        {sel&&a.paths[0]?.[0]&&<circle cx={a.paths[0][0].x} cy={a.paths[0][0].y} r={6} fill="#e94560" stroke="#fff" strokeWidth={1.5}/>}
      </g>
    );
    case "line":return(
      <g key={a.id} onClick={handleClick} style={{cursor:activeTool==="erase"?"not-allowed":"pointer"}}>
        <line x1={a.x0} y1={a.y0} x2={a.x1} y2={a.y1} stroke="transparent" strokeWidth={Math.max(a.strokeWidth,14)}/>
        <line x1={a.x0} y1={a.y0} x2={a.x1} y2={a.y1} stroke={a.color} strokeWidth={a.strokeWidth} strokeLinecap="round"/>
        {sel&&<><circle cx={a.x0} cy={a.y0} r={6} fill="#e94560" stroke="#fff" strokeWidth={1.5}/><circle cx={a.x1} cy={a.y1} r={6} fill="#e94560" stroke="#fff" strokeWidth={1.5}/></>}
      </g>
    );
    case "arrow":return(
      <g key={a.id} onClick={handleClick} style={{cursor:activeTool==="erase"?"not-allowed":"pointer"}}>
        <line x1={a.x0} y1={a.y0} x2={a.x1} y2={a.y1} stroke="transparent" strokeWidth={Math.max(a.strokeWidth,14)}/>
        <ArrowSVG {...a}/>
        {sel&&<circle cx={a.x0} cy={a.y0} r={6} fill="#e94560" stroke="#fff" strokeWidth={1.5}/>}
      </g>
    );
    case "circle":{
      const cx=(a.x0+a.x1)/2,cy=(a.y0+a.y1)/2,rx=Math.abs(a.x1-a.x0)/2,ry=Math.abs(a.y1-a.y0)/2;
      return(
        <g key={a.id} onClick={handleClick} style={{cursor:activeTool==="erase"?"not-allowed":"pointer"}}>
          <ellipse cx={cx} cy={cy} rx={rx+10} ry={ry+10} fill="transparent"/>
          <ellipse cx={cx} cy={cy} rx={rx} ry={ry} stroke={a.color} strokeWidth={a.strokeWidth} fill="none"/>
          {sel&&<ellipse cx={cx} cy={cy} rx={rx} ry={ry} stroke="#e94560" strokeWidth={2} fill="none" strokeDasharray="6 3"/>}
        </g>
      );
    }
    case "highlight":{
      const x=Math.min(a.x0,a.x1),y=Math.min(a.y0,a.y1),w=Math.abs(a.x1-a.x0),h=Math.abs(a.y1-a.y0);
      return(
        <g key={a.id} onClick={handleClick} style={{cursor:activeTool==="erase"?"not-allowed":"pointer"}}>
          <rect x={x} y={y} width={w} height={h} fill={a.color||"#FFF176"} opacity={0.45}/>
          {sel&&<rect x={x} y={y} width={w} height={h} fill="none" stroke="#e94560" strokeWidth={2} strokeDasharray="6 3"/>}
        </g>
      );
    }
    case "blackout":{
      const x=Math.min(a.x0,a.x1),y=Math.min(a.y0,a.y1),w=Math.abs(a.x1-a.x0),h=Math.abs(a.y1-a.y0);
      return(
        <g key={a.id} onClick={handleClick} style={{cursor:activeTool==="erase"?"not-allowed":"pointer"}}>
          <rect x={x} y={y} width={w} height={h} fill="#000"/>
          {sel&&<rect x={x} y={y} width={w} height={h} fill="none" stroke="#e94560" strokeWidth={2} strokeDasharray="6 3"/>}
        </g>
      );
    }
    case "sign":case "initials":return(
      <g key={a.id} transform={`translate(${a.x},${a.y})`} onClick={handleClick}
        style={{cursor:activeTool==="erase"?"not-allowed":"pointer"}}>
        {sel&&<rect x={-4} y={-4} width={(a.bw||80)+8} height={(a.bh||40)+8}
          fill="rgba(233,69,96,0.08)" stroke="#e94560" strokeWidth={1.5} strokeDasharray="5 3" rx={3}/>}
        {a.paths.map((p,i)=>(
          <polyline key={i} points={p.map(pt=>`${pt.x},${pt.y}`).join(" ")}
            stroke={a.color||"#000"} fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
        ))}
      </g>
    );
    default:return null;
  }
}

function LivePreview({drawing,color,strokeWidth,highlightColor}){
  if(!drawing)return null;
  const{type,x0,y0,x1,y1,points}=drawing;
  const sw=strokeWidth||2;
  switch(type){
    case "draw":return points?.length>1?<polyline points={points.map(p=>`${p.x},${p.y}`).join(" ")} stroke={color} fill="none" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" opacity={0.8}/>:null;
    case "line":return<line x1={x0} y1={y0} x2={x1} y2={y1} stroke={color} strokeWidth={sw} strokeLinecap="round" opacity={0.8}/>;
    case "arrow":return<ArrowSVG x0={x0} y0={y0} x1={x1} y1={y1} color={color} strokeWidth={sw}/>;
    case "circle":{const cx=(x0+x1)/2,cy=(y0+y1)/2,rx=Math.abs(x1-x0)/2,ry=Math.abs(y1-y0)/2;return<ellipse cx={cx} cy={cy} rx={rx} ry={ry} stroke={color} strokeWidth={sw} fill="none" opacity={0.8}/>;}
    case "highlight":{const x=Math.min(x0,x1),y=Math.min(y0,y1),w=Math.abs(x1-x0),h=Math.abs(y1-y0);return<rect x={x} y={y} width={w} height={h} fill={highlightColor||"#FFF176"} opacity={0.45}/>;}
    case "blackout":{const x=Math.min(x0,x1),y=Math.min(y0,y1),w=Math.abs(x1-x0),h=Math.abs(y1-y0);return<rect x={x} y={y} width={w} height={h} fill="#000" opacity={0.8}/>;}
    case "textbox":{const x=Math.min(x0,x1),y=Math.min(y0,y1),w=Math.abs(x1-x0),h=Math.abs(y1-y0);return<rect x={x} y={y} width={w} height={h} fill="rgba(255,255,255,0.04)" stroke="#e94560" strokeWidth={1.5} strokeDasharray="6 3" rx={2}/>;}
    default:return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DRAGGABLE HTML ANNOTATION
// ═══════════════════════════════════════════════════════════════════════════════
function DraggableAnnot({ann,selected,activeTool,zoomRef,panRef,stageRef,annotationsRef,onSelect,onUpdate,onDelete,historyPush,historyPatch}){
  const dragging=useRef(null);
  const [editing,setEditing]=useState(false);
  const inputRef=useRef(null);
  useEffect(()=>{if(editing&&inputRef.current)inputRef.current.focus();},[editing]);

  const startDrag=(clientX,clientY)=>{
    const er=stageRef.current?.getBoundingClientRect();if(!er)return;
    dragging.current={offX:clientX-er.left-ann.x*zoomRef.current,offY:clientY-er.top-ann.y*zoomRef.current};
  };
  const onDown=e=>{
    e.stopPropagation();
    if(activeTool==="erase"){onDelete(ann.id);return;}
    if(activeTool==="edittext"){if(["text","textbox","sticky","date"].includes(ann.type))setEditing(true);return;}
    onSelect(ann.id);
    if(!activeTool){const s=e.touches?e.touches[0]:e;startDrag(s.clientX,s.clientY);}
  };

  useEffect(()=>{
    if(!dragging.current)return;
    const move=e=>{
      const s=e.touches?e.touches[0]:e;
      const er=stageRef.current?.getBoundingClientRect();if(!er)return;
      const x=(s.clientX-er.left-dragging.current.offX)/zoomRef.current;
      const y=(s.clientY-er.top -dragging.current.offY)/zoomRef.current;
      const next=annotationsRef.current.map(a=>a.id===ann.id?{...a,x,y}:a);
      annotationsRef.current=next;historyPatch(next);onUpdate(next);
    };
    const up=()=>{historyPush(annotationsRef.current);dragging.current=null;};
    window.addEventListener("mousemove",move);window.addEventListener("mouseup",up);
    window.addEventListener("touchmove",move,{passive:true});window.addEventListener("touchend",up);
    return()=>{window.removeEventListener("mousemove",move);window.removeEventListener("mouseup",up);window.removeEventListener("touchmove",move);window.removeEventListener("touchend",up);};
  },[ann.id]); // eslint-disable-line

  const sel=selected===ann.id;
  const RS=RENDER_SCALE;
  const base={position:"absolute",left:ann.x,top:ann.y,border:sel?"1.5px dashed #e94560":"1.5px dashed transparent",borderRadius:3,padding:"2px 4px",background:sel?"rgba(233,69,96,0.06)":"transparent",cursor:activeTool==="erase"?"not-allowed":activeTool==="edittext"?"text":"move",userSelect:"none",touchAction:"none",zIndex:sel?20:10};

  const editArea=(key,valKey,extraStyle={})=>(
    <textarea ref={inputRef} value={ann[valKey]||""}
      onChange={e=>{const next=annotationsRef.current.map(a=>a.id===ann.id?{...a,[valKey]:e.target.value}:a);annotationsRef.current=next;onUpdate(next);}}
      onBlur={()=>{setEditing(false);historyPush(annotationsRef.current);}}
      onKeyDown={e=>{if(e.key==="Escape")setEditing(false);e.stopPropagation();}}
      style={{background:"rgba(233,69,96,0.08)",border:"1.5px solid #e94560",borderRadius:3,padding:"2px 4px",resize:"none",outline:"none",...extraStyle}}/>
  );

  if(ann.type==="text"||ann.type==="date"||ann.type==="check"||ann.type==="cross"){
    const sym=ann.type==="check"||ann.type==="cross";
    return(
      <div style={{...base,fontSize:ann.size*RS,fontFamily:ann.font||"Helvetica",fontWeight:ann.bold?"bold":"normal",fontStyle:ann.italic?"italic":"normal",color:ann.color,whiteSpace:"pre",lineHeight:1.2,minWidth:20}}
        onMouseDown={onDown} onTouchStart={onDown} onDoubleClick={()=>{if(!sym)setEditing(true);}}>
        {editing&&!sym?editArea("text","text",{fontSize:ann.size*RS,fontFamily:ann.font||"Helvetica",color:ann.color,minWidth:100,minHeight:ann.size*RS+10}):ann.text}
      </div>
    );
  }
  if(ann.type==="textbox"){
    return(
      <div style={{...base,width:ann.w,minHeight:ann.h,border:sel?"1.5px solid #e94560":`1.5px solid ${ann.color||"#000"}`,background:"rgba(255,255,255,0.03)",padding:6}}
        onMouseDown={onDown} onTouchStart={onDown} onDoubleClick={()=>setEditing(true)}>
        {editing?editArea("text","text",{width:"100%",minHeight:ann.h-12,fontSize:ann.size*RS,fontFamily:ann.font||"Helvetica",color:ann.color,border:"none",padding:0}):
          <span style={{fontSize:ann.size*RS,fontFamily:ann.font||"Helvetica",color:ann.color||"#000",whiteSpace:"pre-wrap"}}>{ann.text||<span style={{color:"#666",fontStyle:"italic",fontSize:24}}>Double-tap to edit</span>}</span>}
      </div>
    );
  }
  if(ann.type==="sticky"){
    return(
      <div style={{...base,width:ann.w,minHeight:ann.h,background:sel?"#FFF9C4":"#FFFDE7",border:sel?"1.5px solid #e94560":"1.5px solid #F9A825",borderRadius:6,boxShadow:"2px 3px 10px rgba(0,0,0,0.5)",padding:10}}
        onMouseDown={onDown} onTouchStart={onDown} onDoubleClick={()=>setEditing(true)}>
        <div style={{fontSize:11,color:"#F57F17",fontFamily:"'DM Sans',sans-serif",marginBottom:5,fontWeight:700}}>NOTE</div>
        {editing?editArea("text","text",{width:"100%",minHeight:60,background:"transparent",border:"none",color:"#333",fontSize:13,fontFamily:"'DM Sans',sans-serif"}):
          <div style={{fontSize:13,color:"#333",fontFamily:"'DM Sans',sans-serif",whiteSpace:"pre-wrap"}}>{ann.text||<span style={{color:"#aaa",fontStyle:"italic"}}>Double-tap to edit</span>}</div>}
      </div>
    );
  }
  if(ann.type==="image"){
    return(
      <div style={{...base,width:ann.w,height:ann.h,padding:0,overflow:"hidden",borderRadius:2}} onMouseDown={onDown} onTouchStart={onDown}>
        <img src={ann.dataUrl} style={{width:"100%",height:"100%",objectFit:"contain",display:"block",pointerEvents:"none"}}/>
      </div>
    );
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════
export default function PDFEditor(){
  const [pdfDoc,     setPdfDoc]     = useState(null);
  const [pdfBytes,   setPdfBytes]   = useState(null);
  const [pageImages, setPageImages] = useState([]);
  const [curPage,    setCurPage]    = useState(0);
  const [libsReady,  setLibsReady]  = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [fileName,   setFileName]   = useState("document.pdf");

  const [activeTool, setActiveTool] = useState(null);
  const [selected,   setSelected]   = useState(null);
  const [showMenu,   setShowMenu]   = useState(false);
  const [signMode,   setSignMode]   = useState(null);
  const [pendingImg, setPendingImg] = useState(null);

  const [color,          setColor]          = useState("#000000");
  const [strokeWidth,    setStrokeWidth]    = useState(2);
  const [highlightColor, setHighlightColor] = useState("#FFF176");
  const [toolSettings,   setToolSettings]   = useState({fontSize:16,fontFamily:"Helvetica"});

  const history = useHistory([]);
  const annotations = history.state;
  const annRef = useRef(annotations);
  useEffect(()=>{annRef.current=annotations;},[annotations]);

  const setAnns = useCallback((next,addHist=true)=>{
    const val=typeof next==="function"?next(annRef.current):next;
    annRef.current=val;
    if(addHist)history.push(val);else history.patch(val);
  },[history]);

  const [drawing, setDrawing] = useState(null);
  const drawingRef = useRef(null);
  useEffect(()=>{drawingRef.current=drawing;},[drawing]);

  const [zoom,setZoom]=useState(1);
  const [pan, setPan] =useState({x:0,y:0});
  const zoomRef=useRef(1);
  const panRef =useRef({x:0,y:0});
  useEffect(()=>{zoomRef.current=zoom;},[zoom]);
  useEffect(()=>{panRef.current=pan;},[pan]);

  const vpRef    = useRef(null);
  const stageRef = useRef(null);
  const fileRef  = useRef(null);
  const imgRef   = useRef(null);
  const gesture  = useRef({type:"none",prevDist:0,prevMid:{x:0,y:0},panStart:{x:0,y:0},panOrigin:{x:0,y:0}});

  // ── libs ──────────────────────────────────────────────────────────────────
  useEffect(()=>{
    Promise.all([
      loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"),
      loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js"),
    ]).then(()=>{
      window.pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      setLibsReady(true);
    });
  },[]);

  // ── render pages ──────────────────────────────────────────────────────────
  useEffect(()=>{
    if(!pdfDoc)return;
    (async()=>{
      setLoading(true);
      const imgs=[];
      for(let i=1;i<=pdfDoc.numPages;i++){
        const page=await pdfDoc.getPage(i);
        const vp=page.getViewport({scale:RENDER_SCALE});
        const cvs=document.createElement("canvas");
        cvs.width=vp.width;cvs.height=vp.height;
        await page.render({canvasContext:cvs.getContext("2d"),viewport:vp}).promise;
        imgs.push({dataUrl:cvs.toDataURL(),width:vp.width,height:vp.height});
      }
      setPageImages(imgs);setLoading(false);setZoom(1);setPan({x:0,y:0});
    })();
  },[pdfDoc]);

  // ── open pdf ──────────────────────────────────────────────────────────────
  const openFile=async e=>{
    const file=e.target.files?.[0];if(!file||!libsReady)return;
    setFileName(file.name);setLoading(true);
    const buf=await file.arrayBuffer();
    setPdfBytes(buf.slice(0));
    const doc=await window.pdfjsLib.getDocument({data:buf.slice(0)}).promise;
    setPdfDoc(doc);history.push([]);setSelected(null);setCurPage(0);
    e.target.value="";
  };

  // ── zoom ──────────────────────────────────────────────────────────────────
  const applyZoom=useCallback((nz,focal)=>{
    nz=clamp(nz,ZOOM_MIN,ZOOM_MAX);
    const oz=zoomRef.current,op=panRef.current;
    const sx=(focal.x-op.x)/oz,sy=(focal.y-op.y)/oz;
    setZoom(nz);setPan({x:focal.x-sx*nz,y:focal.y-sy*nz});
  },[]);

  // ── viewport touch ────────────────────────────────────────────────────────
  const onVpTS=useCallback(e=>{
    if(drawingRef.current)return;
    if(e.touches.length===1) gesture.current={...gesture.current,type:"pan",panStart:{x:e.touches[0].clientX,y:e.touches[0].clientY},panOrigin:{...panRef.current}};
    else if(e.touches.length===2) gesture.current={...gesture.current,type:"pinch",prevDist:dist2(e.touches[0],e.touches[1]),prevMid:mid2(e.touches[0],e.touches[1])};
  },[]);

  const onVpTM=useCallback(e=>{
    if(drawingRef.current)return;
    e.preventDefault();
    if(gesture.current.type==="pan"&&e.touches.length===1&&!activeTool){
      const dx=e.touches[0].clientX-gesture.current.panStart.x,dy=e.touches[0].clientY-gesture.current.panStart.y;
      setPan({x:gesture.current.panOrigin.x+dx,y:gesture.current.panOrigin.y+dy});
    } else if(gesture.current.type==="pinch"&&e.touches.length===2){
      const nd=dist2(e.touches[0],e.touches[1]),nm=mid2(e.touches[0],e.touches[1]);
      const sc=nd/gesture.current.prevDist,oz=zoomRef.current,op=panRef.current;
      const nz=clamp(oz*sc,ZOOM_MIN,ZOOM_MAX);
      const sx=(nm.x-op.x)/oz,sy=(nm.y-op.y)/oz;
      const mdx=nm.x-gesture.current.prevMid.x,mdy=nm.y-gesture.current.prevMid.y;
      setZoom(nz);setPan({x:nm.x-sx*nz+mdx,y:nm.y-sy*nz+mdy});
      gesture.current.prevDist=nd;gesture.current.prevMid=nm;
    }
  },[activeTool]);

  const onVpTE=useCallback(e=>{
    if(e.touches.length<2){
      if(gesture.current.type==="pinch"&&e.touches.length===1) gesture.current={...gesture.current,type:"pan",panStart:{x:e.touches[0].clientX,y:e.touches[0].clientY},panOrigin:{...panRef.current}};
      else gesture.current.type="none";
    }
  },[]);

  useEffect(()=>{
    const el=vpRef.current;if(!el)return;
    el.addEventListener("touchstart",onVpTS,{passive:true});
    el.addEventListener("touchmove", onVpTM,{passive:false});
    el.addEventListener("touchend",  onVpTE,{passive:true});
    return()=>{el.removeEventListener("touchstart",onVpTS);el.removeEventListener("touchmove",onVpTM);el.removeEventListener("touchend",onVpTE);};
  },[onVpTS,onVpTM,onVpTE]);

  useEffect(()=>{
    const el=vpRef.current;if(!el)return;
    const h=e=>{e.preventDefault();const r=el.getBoundingClientRect();applyZoom(zoomRef.current*(e.deltaY>0?0.9:1.1),{x:e.clientX-r.left,y:e.clientY-r.top});};
    el.addEventListener("wheel",h,{passive:false});
    return()=>el.removeEventListener("wheel",h);
  },[applyZoom]);

  const getPageXY=useCallback(e=>{
    const vr=vpRef.current.getBoundingClientRect();
    return{x:(e.clientX-vr.left-panRef.current.x)/zoomRef.current,y:(e.clientY-vr.top-panRef.current.y)/zoomRef.current};
  },[]);

  // ── stage pointer down ────────────────────────────────────────────────────
  const onStagePD=useCallback(e=>{
    if(!activeTool||!pageImages[curPage])return;
    if(activeTool==="erase"||activeTool==="edittext")return;
    const{x,y}=getPageXY(e);
    const pg=curPage;
    if(PLACE_TOOLS.has(activeTool)){
      if(activeTool==="text")       setAnns(p=>[...p,{id:uid(),page:pg,type:"text",x,y,text:"Text",font:toolSettings.fontFamily,size:toolSettings.fontSize,bold:false,italic:false,color}]);
      else if(activeTool==="check") setAnns(p=>[...p,{id:uid(),page:pg,type:"check",x,y,text:"✓",font:"Helvetica",size:24,bold:true,italic:false,color}]);
      else if(activeTool==="cross") setAnns(p=>[...p,{id:uid(),page:pg,type:"cross",x,y,text:"✕",font:"Helvetica",size:24,bold:true,italic:false,color}]);
      else if(activeTool==="date")  setAnns(p=>[...p,{id:uid(),page:pg,type:"date",x,y,text:todayStr(),font:toolSettings.fontFamily,size:toolSettings.fontSize,bold:false,italic:false,color}]);
      else if(activeTool==="sticky")setAnns(p=>[...p,{id:uid(),page:pg,type:"sticky",x,y,text:"",w:200,h:120}]);
      else if(activeTool==="sign")  {setSignMode({type:"sign",x,y});return;}
      else if(activeTool==="initials"){setSignMode({type:"initials",x,y});return;}
      else if(activeTool==="image") {setPendingImg({x,y,page:pg});setTimeout(()=>imgRef.current?.click(),50);return;}
      return;
    }
    if(DRAG_TOOLS.has(activeTool)){
      e.currentTarget.setPointerCapture?.(e.pointerId);
      if(activeTool==="draw"){const d={type:"draw",points:[{x,y}]};setDrawing(d);drawingRef.current=d;}
      else{const d={type:activeTool,x0:x,y0:y,x1:x,y1:y};setDrawing(d);drawingRef.current=d;}
    }
  },[activeTool,curPage,pageImages,color,toolSettings,getPageXY,setAnns]);

  const onStagePM=useCallback(e=>{
    if(!drawingRef.current)return;
    const{x,y}=getPageXY(e);
    const d=drawingRef.current;
    const next=d.type==="draw"?{...d,points:[...d.points,{x,y}]}:{...d,x1:x,y1:y};
    setDrawing(next);drawingRef.current=next;
  },[getPageXY]);

  const onStagePU=useCallback(e=>{
    if(!drawingRef.current)return;
    const d=drawingRef.current,pg=curPage;
    const commit=ann=>setAnns(p=>[...p,ann]);
    if(d.type==="draw"&&d.points.length>1)commit({id:uid(),page:pg,type:"draw",paths:[d.points],color,strokeWidth});
    else if(d.type==="line"&&Math.hypot(d.x1-d.x0,d.y1-d.y0)>5)commit({id:uid(),page:pg,type:"line",x0:d.x0,y0:d.y0,x1:d.x1,y1:d.y1,color,strokeWidth});
    else if(d.type==="arrow"&&Math.hypot(d.x1-d.x0,d.y1-d.y0)>5)commit({id:uid(),page:pg,type:"arrow",x0:d.x0,y0:d.y0,x1:d.x1,y1:d.y1,color,strokeWidth});
    else if(d.type==="circle"&&(Math.abs(d.x1-d.x0)>5||Math.abs(d.y1-d.y0)>5))commit({id:uid(),page:pg,type:"circle",x0:d.x0,y0:d.y0,x1:d.x1,y1:d.y1,color,strokeWidth});
    else if(d.type==="highlight"&&(Math.abs(d.x1-d.x0)>5||Math.abs(d.y1-d.y0)>5))commit({id:uid(),page:pg,type:"highlight",x0:d.x0,y0:d.y0,x1:d.x1,y1:d.y1,color:highlightColor});
    else if(d.type==="blackout"&&(Math.abs(d.x1-d.x0)>5||Math.abs(d.y1-d.y0)>5))commit({id:uid(),page:pg,type:"blackout",x0:d.x0,y0:d.y0,x1:d.x1,y1:d.y1});
    else if(d.type==="textbox"&&(Math.abs(d.x1-d.x0)>20||Math.abs(d.y1-d.y0)>20))commit({id:uid(),page:pg,type:"textbox",x:Math.min(d.x0,d.x1),y:Math.min(d.y0,d.y1),w:Math.abs(d.x1-d.x0),h:Math.abs(d.y1-d.y0),text:"",font:toolSettings.fontFamily,size:toolSettings.fontSize,bold:false,italic:false,color});
    setDrawing(null);drawingRef.current=null;
  },[curPage,color,strokeWidth,highlightColor,toolSettings,setAnns]);

  // ── image file ────────────────────────────────────────────────────────────
  const onImgFile=e=>{
    const file=e.target.files?.[0];if(!file||!pendingImg)return;
    const reader=new FileReader();
    reader.onload=ev=>{
      const img=new window.Image();
      img.onload=()=>{
        const sc=Math.min(300/img.width,300/img.height,1);
        setAnns(p=>[...p,{id:uid(),page:pendingImg.page,type:"image",x:pendingImg.x,y:pendingImg.y,w:img.width*sc*RENDER_SCALE,h:img.height*sc*RENDER_SCALE,dataUrl:ev.target.result}]);
      };
      img.src=ev.target.result;
    };
    reader.readAsDataURL(file);
    setPendingImg(null);e.target.value="";
  };

  // ── apply signature ───────────────────────────────────────────────────────
  const applySign=useCallback(paths=>{
    if(!signMode)return;
    const all=paths.flat();if(!all.length)return;
    const xs=all.map(p=>p.x),ys=all.map(p=>p.y);
    const minX=Math.min(...xs),minY=Math.min(...ys),bw=Math.max(...xs)-minX,bh=Math.max(...ys)-minY;
    const norm=paths.map(p=>p.map(pt=>({x:(pt.x-minX)*2,y:(pt.y-minY)*2})));
    setAnns(p=>[...p,{id:uid(),page:curPage,type:signMode.type,x:signMode.x,y:signMode.y,paths:norm,bw:bw*2,bh:bh*2,color}]);
    setSignMode(null);
  },[signMode,curPage,color,setAnns]);

  const deleteAnnot=useCallback(id=>{setAnns(p=>p.filter(a=>a.id!==id));if(selected===id)setSelected(null);},[selected,setAnns]);
  const handleDone=()=>{setActiveTool(null);setSelected(null);setDrawing(null);drawingRef.current=null;};

  // ── save pdf ──────────────────────────────────────────────────────────────
  const savePDF=async()=>{
    if(!pdfBytes||!window.PDFLib)return;
    setSaving(true);
    try{
      const{PDFDocument,rgb,StandardFonts}=window.PDFLib;
      const doc=await PDFDocument.load(pdfBytes);
      const pages=doc.getPages();
      const fc={};
      const getF=async box=>{
        const k=`${box.font||"H"}_${box.bold?1:0}_${box.italic?1:0}`;
        if(fc[k])return fc[k];
        const f=box.font||"Helvetica";
        let sf=f.includes("Times")?box.bold?StandardFonts.TimesRomanBold:box.italic?StandardFonts.TimesRomanItalic:StandardFonts.TimesRoman
          :f.includes("Courier")?box.bold?StandardFonts.CourierBold:box.italic?StandardFonts.CourierOblique:StandardFonts.Courier
          :box.bold?StandardFonts.HelveticaBold:box.italic?StandardFonts.HelveticaOblique:StandardFonts.Helvetica;
        fc[k]=await doc.embedFont(sf);return fc[k];
      };
      const RS=RENDER_SCALE;
      const pc=hex=>{const[r,g,b]=hexToRgb(hex);return rgb(r,g,b);};
      for(const a of annotations){
        const pg=pages[a.page];if(!pg)continue;
        const{height:pH}=pg.getSize();
        const toX=v=>v/RS,toY=v=>pH-v/RS;
        switch(a.type){
          case "text":case "check":case "cross":case "date":{
            const f=await getF(a);
            pg.drawText(a.text,{x:toX(a.x),y:toY(a.y)-a.size*0.15,size:a.size,font:f,color:pc(a.color)});break;
          }
          case "textbox":{
            pg.drawRectangle({x:toX(a.x),y:toY(a.y+a.h),width:a.w/RS,height:a.h/RS,borderColor:pc(a.color||"#000"),borderWidth:1,color:rgb(1,1,1),opacity:0.01,borderOpacity:0.8});
            if(a.text){const f=await getF({font:"Helvetica",bold:false,italic:false});const fs=a.size||12;a.text.split("\n").forEach((l,li)=>{if(l)pg.drawText(l,{x:toX(a.x)+4,y:toY(a.y)-fs*(li+1.2),size:fs,font:f,color:rgb(0.1,0.1,0.1)});});}
            break;
          }
          case "sticky":{
            pg.drawRectangle({x:toX(a.x),y:toY(a.y+a.h),width:a.w/RS,height:a.h/RS,color:rgb(1,0.99,0.76),opacity:0.9,borderColor:rgb(0.97,0.66,0.14),borderWidth:1});
            if(a.text){const f=await getF({font:"Helvetica",bold:false,italic:false});a.text.split("\n").forEach((l,li)=>{if(l)pg.drawText(l,{x:toX(a.x)+5,y:toY(a.y)-13*(li+1.8),size:12,font:f,color:rgb(0.2,0.1,0)});});}
            break;
          }
          case "line":pg.drawLine({start:{x:toX(a.x0),y:toY(a.y0)},end:{x:toX(a.x1),y:toY(a.y1)},thickness:a.strokeWidth,color:pc(a.color)});break;
          case "arrow":{
            const dx=a.x1-a.x0,dy=a.y1-a.y0,len=Math.hypot(dx,dy);if(len<2)break;
            const ux=dx/len,uy=dy/len,hs=12,ax=a.x1-ux*hs,ay=a.y1-uy*hs,px=-uy*hs*0.5,py=ux*hs*0.5;
            pg.drawLine({start:{x:toX(a.x0),y:toY(a.y0)},end:{x:toX(ax),y:toY(ay)},thickness:a.strokeWidth,color:pc(a.color)});
            pg.drawLine({start:{x:toX(a.x1),y:toY(a.y1)},end:{x:toX(ax+px),y:toY(ay+py)},thickness:a.strokeWidth,color:pc(a.color)});
            pg.drawLine({start:{x:toX(a.x1),y:toY(a.y1)},end:{x:toX(ax-px),y:toY(ay-py)},thickness:a.strokeWidth,color:pc(a.color)});
            break;
          }
          case "circle":{
            const cx=(a.x0+a.x1)/2,cy=(a.y0+a.y1)/2,rx=Math.abs(a.x1-a.x0)/2,ry=Math.abs(a.y1-a.y0)/2;
            pg.drawEllipse({x:toX(cx),y:toY(cy),xScale:rx/RS,yScale:ry/RS,borderColor:pc(a.color),borderWidth:a.strokeWidth,color:rgb(0,0,0),opacity:0});break;
          }
          case "highlight":{
            const x=Math.min(a.x0,a.x1)/RS,y=toY(Math.max(a.y0,a.y1)),w=Math.abs(a.x1-a.x0)/RS,h=Math.abs(a.y1-a.y0)/RS;
            pg.drawRectangle({x,y,width:w,height:h,color:rgb(1,1,0.45),opacity:0.4});break;
          }
          case "blackout":{
            const x=Math.min(a.x0,a.x1)/RS,y=toY(Math.max(a.y0,a.y1)),w=Math.abs(a.x1-a.x0)/RS,h=Math.abs(a.y1-a.y0)/RS;
            pg.drawRectangle({x,y,width:w,height:h,color:rgb(0,0,0)});break;
          }
          case "sign":case "initials":case "draw":{
            const ox=a.x||0,oy=a.y||0,col=pc(a.color||"#000");
            for(const path of a.paths){
              for(let i=1;i<path.length;i++){
                pg.drawLine({start:{x:toX(path[i-1].x+ox),y:toY(path[i-1].y+oy)},end:{x:toX(path[i].x+ox),y:toY(path[i].y+oy)},thickness:a.strokeWidth||1.5,color:col});
              }
            }
            break;
          }
          case "image":{
            try{
              const b64=a.dataUrl.split(",")[1];
              const bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));
              const emb=a.dataUrl.startsWith("data:image/jpeg")?await doc.embedJpg(bytes):await doc.embedPng(bytes);
              pg.drawImage(emb,{x:toX(a.x),y:toY(a.y+a.h),width:a.w/RS,height:a.h/RS});
            }catch(_){}
            break;
          }
          default:break;
        }
      }
      const bytes=await doc.save();
      const blob=new Blob([bytes],{type:"application/pdf"});
      const base=fileName.replace(/_filled(\.pdf)?$/i,"").replace(/\.pdf$/i,"");
      const name=`${base}_filled.pdf`;
      let saved=false;
      try{
        const{Filesystem,Directory}=await import("@capacitor/filesystem");
        const b64=await new Promise((res,rej)=>{const fr=new FileReader();fr.onload=()=>res(fr.result.split(",")[1]);fr.onerror=rej;fr.readAsDataURL(blob);});
        await Filesystem.writeFile({path:name,data:b64,directory:Directory.Downloads});
        saved=true;
        try{const{Share}=await import("@capacitor/share");const uri=await Filesystem.getUri({path:name,directory:Directory.Downloads});await Share.share({title:name,url:uri.uri});}catch(_){}
      }catch(_){saved=false;}
      if(!saved){
        const url=URL.createObjectURL(blob);
        const a2=document.createElement("a");a2.href=url;a2.download=name;
        document.body.appendChild(a2);a2.click();
        setTimeout(()=>{URL.revokeObjectURL(url);document.body.removeChild(a2);},1000);
      }
    }catch(err){console.error("Save failed",err);}
    finally{setSaving(false);}
  };

  const getCursor=()=>{if(!activeTool)return"default";if(activeTool==="erase")return"not-allowed";if(activeTool==="edittext")return"text";return"crosshair";};
  const pageImg=pageImages[curPage];

  return(
    <div style={{fontFamily:"'DM Sans',sans-serif",background:"#0e0e16",height:"100dvh",display:"flex",flexDirection:"column",color:"#e8e6f0",overflow:"hidden"}}
      onMouseMove={e=>{if(drawingRef.current)onStagePM(e);}}
      onMouseUp={e=>{if(drawingRef.current)onStagePU(e);}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Mono:wght@700&display=swap" rel="stylesheet"/>

      {/* TOP BAR */}
      <div style={{background:"#12121b",borderBottom:"1px solid #1e1e2e",height:46,flexShrink:0,display:"flex",alignItems:"center",paddingLeft:14,paddingRight:14,gap:10}}>
        <span style={{fontFamily:"'Space Mono',monospace",fontSize:13,fontWeight:700,color:"#e94560",letterSpacing:-0.5,flexShrink:0}}>PDF•FILL</span>
        {pdfDoc&&<span style={{fontSize:12,color:"#444",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{fileName}</span>}
        <div style={{display:"flex",gap:6,marginLeft:"auto",flexShrink:0}}>
          <TBtn onClick={history.undo} disabled={!history.canUndo}><I.Undo/></TBtn>
          <TBtn onClick={history.redo} disabled={!history.canRedo}><I.Redo/></TBtn>
          {pdfBytes&&<TBtn onClick={savePDF} disabled={saving} accent="#2ecc71"><I.Save/></TBtn>}
        </div>
      </div>

      {/* VIEWPORT */}
      <div ref={vpRef} style={{flex:1,overflow:"hidden",position:"relative",touchAction:"none",cursor:getCursor()}}>
        {loading&&(
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <span style={{color:"#e94560",fontFamily:"'Space Mono',monospace",fontSize:14}}>Loading…</span>
          </div>
        )}
        {!pdfBytes&&!loading&&(
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:52,marginBottom:12}}>📄</div>
              <div style={{color:"#e94560",fontFamily:"'Space Mono',monospace",fontSize:18,marginBottom:6}}>PDF FILLER</div>
              <div style={{color:"#444",fontSize:13,marginBottom:20}}>Open a PDF to start annotating</div>
              <button onClick={()=>fileRef.current?.click()} style={{background:"#e94560",color:"#fff",border:"none",borderRadius:10,padding:"11px 24px",fontSize:14,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:600}}>
                ⊕ Open PDF File
              </button>
            </div>
          </div>
        )}

        {/* Thumbnails */}
        {pageImages.length>1&&(
          <div style={{position:"absolute",left:0,top:0,bottom:0,width:60,background:"#0a0a12",borderRight:"1px solid #1e1e2e",overflowY:"auto",padding:"6px 4px",display:"flex",flexDirection:"column",gap:4,zIndex:30}}>
            {pageImages.map((img,i)=>(
              <div key={i} onClick={()=>setCurPage(i)} style={{border:i===curPage?"2px solid #e94560":"2px solid #1e1e2e",borderRadius:4,overflow:"hidden",cursor:"pointer",opacity:i===curPage?1:0.5}}>
                <img src={img.dataUrl} style={{width:"100%",display:"block"}}/>
                <div style={{textAlign:"center",fontSize:9,color:"#444",padding:"1px 0"}}>{i+1}</div>
              </div>
            ))}
          </div>
        )}

        {/* Stage */}
        {pageImg&&!loading&&(
          <div style={{position:"absolute",top:0,left:0,transformOrigin:"0 0",transform:`translate(${pan.x}px,${pan.y}px) scale(${zoom})`,willChange:"transform"}}>
            <div ref={stageRef}
              style={{position:"relative",width:pageImg.width,height:pageImg.height,boxShadow:"0 8px 40px #000b",borderRadius:3,overflow:"hidden",userSelect:"none"}}
              onPointerDown={onStagePD} onPointerMove={onStagePM} onPointerUp={onStagePU}
              onClick={e=>{if((e.target===stageRef.current||e.target===stageRef.current?.firstChild)&&!activeTool)setSelected(null);}}>
              <img src={pageImg.dataUrl} style={{width:"100%",height:"100%",display:"block",pointerEvents:"none"}}/>

              {/* SVG overlay */}
              <svg width={pageImg.width} height={pageImg.height}
                style={{position:"absolute",top:0,left:0,overflow:"visible",pointerEvents:activeTool==="erase"?"none":"all"}}>
                {annotations.filter(a=>a.page===curPage&&["draw","line","arrow","circle","highlight","blackout","sign","initials"].includes(a.type))
                  .map(a=>renderSVGAnnot(a,selected,setSelected,deleteAnnot,activeTool))}
                <LivePreview drawing={drawing} color={color} strokeWidth={strokeWidth} highlightColor={highlightColor}/>
              </svg>

              {/* HTML annotations */}
              {annotations.filter(a=>a.page===curPage&&["text","check","cross","date","textbox","sticky","image"].includes(a.type))
                .map(a=>(
                  <DraggableAnnot key={a.id} ann={a} selected={selected} activeTool={activeTool}
                    zoomRef={zoomRef} panRef={panRef} stageRef={stageRef} annotationsRef={annRef}
                    onSelect={setSelected} onDelete={deleteAnnot}
                    onUpdate={next=>{annRef.current=next;history.patch(next);}}
                    historyPush={history.push} historyPatch={history.patch}/>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* TOOL SETTINGS BAR */}
      <ToolSettingsBar activeTool={activeTool} settings={toolSettings} onSettings={setToolSettings}
        color={color} onColor={setColor} strokeWidth={strokeWidth} onStrokeWidth={setStrokeWidth}
        highlightColor={highlightColor} onHighlightColor={setHighlightColor}/>

      {/* TOOL STRIP */}
      <div style={{background:"#16161f",borderTop:"1px solid #222232",flexShrink:0}}>
        <SwipeStrip style={{padding:"6px 8px",gap:2}}>
          {TOOLS.map(tool=>{
            const active=activeTool===tool.id;
            return(
              <button key={tool.id} onClick={()=>setActiveTool(active?null:tool.id)}
                style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"7px 9px",borderRadius:10,border:"none",cursor:"pointer",
                  background:active?"#e94560":"transparent",color:active?"#fff":"#888",minWidth:52,flexShrink:0,
                  transition:"background 0.15s,color 0.15s"}}>
                <div style={{width:24,height:24,flexShrink:0}}><tool.Ic/></div>
                <span style={{fontSize:9.5,whiteSpace:"nowrap",fontFamily:"'DM Sans',sans-serif",fontWeight:500,letterSpacing:0.2}}>{tool.label}</span>
              </button>
            );
          })}
        </SwipeStrip>

        {/* ACTION BAR (hamburger + page nav + DONE) */}
        <div style={{display:"flex",alignItems:"center",padding:"5px 10px 10px",gap:8}}>
          <button onClick={()=>setShowMenu(true)} style={ST.iconBtn} title="Menu"><I.Menu/></button>

          {/* cursor / deselect mode indicator */}
          <button onClick={()=>{setActiveTool(null);setSelected(null);}} title="Select / move"
            style={{...ST.iconBtn,color:activeTool?"#e94560":"#555",border:activeTool?"1.5px solid #e94560":"1.5px solid #222232",background:activeTool?"rgba(233,69,96,0.1)":"#0e0e16"}}>
            <I.Cursor/>
          </button>

          {pageImages.length>1&&(
            <div style={{display:"flex",alignItems:"center",gap:4}}>
              <button onClick={()=>setCurPage(p=>Math.max(0,p-1))}       disabled={curPage===0}                   style={{...ST.iconBtn,width:30}}><I.ChevL/></button>
              <span style={{fontSize:11,color:"#555",fontFamily:"'Space Mono',monospace",whiteSpace:"nowrap"}}>{curPage+1}/{pageImages.length}</span>
              <button onClick={()=>setCurPage(p=>Math.min(pageImages.length-1,p+1))} disabled={curPage>=pageImages.length-1} style={{...ST.iconBtn,width:30}}><I.ChevR/></button>
            </div>
          )}

          <button onClick={handleDone}
            style={{flex:1,background:activeTool?"#e94560":"#1e1e2e",color:activeTool?"#fff":"#555",
              border:activeTool?"none":"1px solid #222232",borderRadius:10,height:42,fontSize:15,fontWeight:700,
              cursor:"pointer",fontFamily:"'DM Sans',sans-serif",transition:"background 0.18s,color 0.18s",letterSpacing:1}}>
            DONE
          </button>
        </div>
      </div>

      <input ref={fileRef} type="file" accept=".pdf"    onChange={openFile}  style={{display:"none"}}/>
      <input ref={imgRef}  type="file" accept="image/*" onChange={onImgFile} style={{display:"none"}}/>

      {signMode&&<SignaturePad title={signMode.type==="sign"?"Draw Signature":"Draw Initials"} isInitials={signMode.type==="initials"} onApply={applySign} onClose={()=>setSignMode(null)}/>}
      {showMenu&&<HamburgerMenu onClose={()=>setShowMenu(false)} onOpen={()=>fileRef.current?.click()} onSave={savePDF}
        onUndo={history.undo} onRedo={history.redo} canUndo={history.canUndo} canRedo={history.canRedo}
        currentPage={curPage} totalPages={pageImages.length} onPageChange={setCurPage}
        saving={saving} hasPdf={!!pdfBytes} onClearAll={()=>{setAnns([]);setSelected(null);}}/>}
    </div>
  );
}

// ─── shared micro-styles ──────────────────────────────────────────────────────
const ST={
  iconBtn:{width:38,height:42,display:"flex",alignItems:"center",justifyContent:"center",background:"#0e0e16",border:"1.5px solid #222232",borderRadius:8,cursor:"pointer",color:"#888",flexShrink:0,padding:0},
  menuBtn:{background:"#1e1e2e",color:"#e8e6f0",border:"1px solid #2a2a3a",borderRadius:8,padding:"8px 14px",fontSize:13,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:500},
  navBtn:{width:34,height:34,background:"#1e1e2e",border:"1px solid #2a2a3a",borderRadius:8,cursor:"pointer",color:"#a78bfa",display:"flex",alignItems:"center",justifyContent:"center",padding:0,flexShrink:0},
  sel:{background:"#1e1e2e",color:"#e8e6f0",border:"1px solid #2a2a3a",borderRadius:6,padding:"4px 7px",fontSize:11,fontFamily:"'DM Sans',sans-serif",cursor:"pointer",flexShrink:0},
};

function TBtn({children,onClick,disabled,accent="#a78bfa"}){
  return(
    <button onClick={onClick} disabled={disabled}
      style={{width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",background:"#1e1e2e",border:`1px solid ${accent}33`,borderRadius:7,cursor:disabled?"default":"pointer",color:accent,opacity:disabled?0.3:1,padding:0,flexShrink:0}}>
      <div style={{width:16,height:16}}>{children}</div>
    </button>
  );
}
