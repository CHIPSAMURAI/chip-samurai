import { useState, useRef } from "react";
import Head from "next/head";

const BRANDS = [
  { id:"sumitomo",   label:"住友電工",       en:"Sumitomo Electric"    },
  { id:"sandvik",    label:"Sandvik",        en:"Sandvik Coromant"     },
  { id:"yg1",        label:"YG-1",           en:"YG-1"                 },
  { id:"kennametal", label:"Kennametal",     en:"Kennametal"           },
  { id:"mitsubishi", label:"三菱マテリアル", en:"Mitsubishi Materials" },
  { id:"big",        label:"BIG大昭和",      en:"BIG Daishowa"         },
  { id:"nikken",     label:"NIKKEN",         en:"Nikken"               },
  { id:"osg",        label:"OSG",            en:"OSG Corporation"      },
  { id:"kyocera",    label:"京セラ",         en:"Kyocera"              },
  { id:"iscar",      label:"イスカル",       en:"Iscar"                },
  { id:"seco",       label:"SECO",           en:"Seco Tools"           },
  { id:"tungaloy",   label:"タンガロイ",     en:"Tungaloy"             },
];

const MATERIALS = [
  "S45C (Carbon Steel)","SCM440 (Alloy Steel)","SKD11 (Tool Steel)",
  "SUS304 (Stainless)","SUS316 (Stainless)","FC200 (Gray Cast Iron)",
  "FCD500 (Ductile Iron)","A5052 (Aluminium)","A2024 (Aluminium)",
  "Ti-6Al-4V (Titanium)","Inconel 718 (Superalloy)",
  "EN8 (Carbon Steel)","EN19 (Alloy Steel)","EN31 (Bearing Steel)","IS2062 (Mild Steel)",
];

const OPERATIONS = ["Turning","Milling","Drilling","Boring","Threading","Grooving"];

export default function Home() {
  const [selectedBrands, setSelectedBrands] = useState(new Set(["sumitomo"]));
  const [material, setMaterial] = useState("");
  const [operations, setOperations] = useState(new Set());
  const [roughness, setRoughness] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("idle");
  const [result, setResult] = useState(null);
  const [activeBrand, setActiveBrand] = useState(null);
  const [loadStep, setLoadStep] = useState(0);
  const [copied, setCopied] = useState(false);
  const rawRef = useRef("");
  const stepTimer = useRef(null);

  const toggleBrand = (id) => {
    setSelectedBrands(prev => {
      const next = new Set(prev);
      if (next.has(id)) { if (next.size > 1) next.delete(id); }
      else next.add(id);
      return next;
    });
  };

  const toggleOp = (op) => {
    setOperations(prev => {
      const next = new Set(prev);
      next.has(op) ? next.delete(op) : next.add(op);
      return next;
    });
  };

  const buildPrompt = () => {
    const brands = [...selectedBrands].map(id => BRANDS.find(b=>b.id===id)?.en).filter(Boolean);
    let ctx = "";
    if (material)            ctx += `\nWorkpiece Material: ${material}`;
    if (operations.size > 0) ctx += `\nRequired Operations: ${[...operations].join(", ")}`;
    if (roughness)           ctx += `\nSurface Finish: ${roughness}`;
    if (notes)               ctx += `\nAdditional Info: ${notes}`;

    return `You are CHIP SAMURAI, an expert machining engineer based in India with deep knowledge of Japanese precision manufacturing and global cutting tool brands.

Analyze the following workpiece and provide a tooling layout for EACH brand: ${brands.join(", ")}.
${ctx}

Respond ONLY in this exact JSON (no markdown, no extra text):
{
  "title": "concise job title",
  "material_analysis": "1-2 sentence analysis",
  "badges": ["material type","machinability","tag"],
  "process_sequence": [{"step":1,"operation":"Facing","tool_short":"Insert type"}],
  "brands": [
    {
      "brand": "${brands[0]}",
      "tools": [{"step":1,"operation":"Facing","tool_name":"CNMG120408N-SU","series":"AC8035P — CVD Grade","holder":"PCLNR2525M12","specs":{"Grade":"AC8035P","Nose Radius":"0.8mm"}}],
      "highlight":"1 sentence why this brand excels here"
    }
  ],
  "cutting_conditions":[{"label":"Vc","value":"220","unit":"m/min"},{"label":"fn","value":"0.25","unit":"mm/rev"},{"label":"ap","value":"2.0","unit":"mm"},{"label":"Coolant","value":"ON","unit":""}],
  "best_brand": "${brands[0]}",
  "notes": "3-4 sentences with India-specific advice.",
  "jp_note": "日本語補足（1-2文）"
}
Generate one entry per brand: ${brands.join(", ")}.`;
  };

  const analyze = async () => {
    if (!material && operations.size === 0 && !notes.trim()) {
      alert("Please select a material or fill in at least one field.");
      return;
    }
    setStatus("loading"); setResult(null); setLoadStep(0);
    let i = 0;
    stepTimer.current = setInterval(() => { i=(i+1)%4; setLoadStep(i); }, 1800);

    try {
      const resp = await fetch("/api/tooling", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: buildPrompt() }),
      });
      if (!resp.ok) throw new Error(`Error ${resp.status}`);
      const data = await resp.json();
      rawRef.current = data.result;
      const clean = data.result.replace(/```json|```/g,"").trim();
      let parsed;
      try { parsed = JSON.parse(clean); }
      catch { parsed = { title:"RESULT", badges:[], process_sequence:[], brands:[], notes:data.result, cutting_conditions:[] }; }
      setResult(parsed);
      setActiveBrand(parsed.brands?.[0]?.brand || null);
      setStatus("done");
    } catch(e) {
      setStatus("error");
      alert("Error: " + e.message);
    } finally {
      clearInterval(stepTimer.current);
    }
  };

  const copyReport = () => {
    navigator.clipboard.writeText(rawRef.current).then(() => {
      setCopied(true); setTimeout(()=>setCopied(false),2000);
    });
  };

  const loadLabels = ["▸ Reading material...","▸ Matching catalogs...","▸ Calculating conditions...","▸ Generating layout..."];
  const bc = (i) => ["#00c8ff","#ffd60a","#00ff88","#e63946"][i%4];

  const s = {
    root:{ background:"#080810", color:"#c8d6e5", minHeight:"100vh", padding:"1rem", fontFamily:"'Share Tech Mono',monospace" },
    header:{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", borderBottom:"1px solid rgba(0,200,255,0.2)", paddingBottom:"1rem", marginBottom:"1.2rem" },
    logo:{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"1.6rem", letterSpacing:"0.08em" },
    sub:{ fontSize:"0.55rem", color:"#4a5568", letterSpacing:"0.25em", textTransform:"uppercase" },
    panel:{ background:"#0d0d1a", border:"1px solid rgba(0,200,255,0.15)", padding:"1rem", marginBottom:"1rem" },
    plabel:{ fontSize:"0.55rem", letterSpacing:"0.3em", textTransform:"uppercase", color:"#00c8ff", marginBottom:"0.8rem", display:"flex", justifyContent:"space-between" },
    chip:(on)=>({ padding:"4px 10px", border:`1px solid ${on?"#00c8ff":"rgba(255,255,255,0.1)"}`, background:on?"rgba(0,200,255,0.08)":"rgba(0,0,0,0.3)", cursor:"pointer", fontSize:"0.62rem", color:on?"#00c8ff":"#4a5568", borderRadius:"2px", userSelect:"none", WebkitUserSelect:"none" }),
    opChip:(on)=>({ padding:"6px 8px", border:`1px solid ${on?"#00ff88":"rgba(255,255,255,0.1)"}`, background:on?"rgba(0,255,136,0.06)":"rgba(0,0,0,0.3)", cursor:"pointer", fontSize:"0.62rem", color:on?"#00ff88":"#4a5568", textAlign:"center", borderRadius:"2px", userSelect:"none", WebkitUserSelect:"none" }),
    select:{ width:"100%", background:"rgba(0,0,0,0.4)", border:"1px solid rgba(0,200,255,0.15)", color:"#c8d6e5", fontFamily:"'Share Tech Mono',monospace", fontSize:"0.72rem", padding:"8px 10px", outline:"none", WebkitAppearance:"none", marginBottom:"10px" },
    textarea:{ width:"100%", background:"rgba(0,0,0,0.4)", border:"1px solid rgba(0,200,255,0.15)", color:"#c8d6e5", fontFamily:"'Share Tech Mono',monospace", fontSize:"0.72rem", padding:"8px 10px", outline:"none", resize:"vertical", minHeight:"60px", lineHeight:"1.6", marginBottom:"10px" },
    btn:{ width:"100%", background:"transparent", border:"1px solid #00c8ff", color:"#00c8ff", fontFamily:"'Bebas Neue',sans-serif", fontSize:"1.2rem", letterSpacing:"0.2em", padding:"12px", cursor:"pointer" },
    tab:(on)=>({ padding:"4px 12px", border:`1px solid ${on?"#ffd60a":"rgba(255,255,255,0.1)"}`, background:on?"rgba(255,214,10,0.06)":"transparent", fontFamily:"'Share Tech Mono',monospace", fontSize:"0.6rem", color:on?"#ffd60a":"#4a5568", cursor:"pointer" }),
    toolCard:{ background:"rgba(0,200,255,0.03)", border:"1px solid rgba(0,200,255,0.12)", padding:"12px" },
    notes:{ background:"rgba(230,57,70,0.05)", borderLeft:"2px solid #e63946", padding:"10px 12px", fontSize:"0.65rem", lineHeight:"1.9", color:"#bbb" },
  };

  return (
    <>
      <Head>
        <title>CHIP SAMURAI — AI Tooling Advisor</title>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Share+Tech+Mono&display=swap" rel="stylesheet"/>
        <style>{`body{margin:0;background:#080810;} select option{background:#0d0d1a;}`}</style>
      </Head>

      <div style={s.root}>
        {/* HEADER */}
        <div style={s.header}>
          <div>
            <div style={s.logo}>CHIP<span style={{color:"#00c8ff"}}>SAMURAI</span></div>
            <div style={s.sub}>// AI Multi-Brand Tooling Advisor</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:"6px",fontSize:"0.6rem",color:"#00ff88"}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:"#00ff88",boxShadow:"0 0 6px #00ff88"}}/>
            ONLINE
          </div>
        </div>

        {/* BRANDS */}
        <div style={s.panel}>
          <div style={s.plabel}>
            <span>// Select Brands</span>
            <span style={{fontSize:"0.58rem",color:"#00c8ff",background:"rgba(0,200,255,0.1)",border:"1px solid rgba(0,200,255,0.2)",padding:"1px 8px",borderRadius:"2px"}}>{selectedBrands.size} selected</span>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:"6px"}}>
            {BRANDS.map(b=>(
              <div key={b.id} style={s.chip(selectedBrands.has(b.id))} onClick={()=>toggleBrand(b.id)}>{b.label}</div>
            ))}
          </div>
        </div>

        {/* INPUT */}
        <div style={s.panel}>
          <div style={s.plabel}><span>// Workpiece Input</span></div>
          <label style={{fontSize:"0.58rem",letterSpacing:"0.15em",color:"#4a5568",textTransform:"uppercase",display:"block",marginBottom:"4px"}}>Material</label>
          <select style={s.select} value={material} onChange={e=>setMaterial(e.target.value)}>
            <option value="">-- Select Material --</option>
            {MATERIALS.map(m=><option key={m}>{m}</option>)}
            <option value="other">Other (describe in notes)</option>
          </select>
          <label style={{fontSize:"0.58rem",letterSpacing:"0.15em",color:"#4a5568",textTransform:"uppercase",display:"block",marginBottom:"4px"}}>Operations</label>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px",marginBottom:"10px"}}>
            {OPERATIONS.map(op=>(
              <div key={op} style={s.opChip(operations.has(op))} onClick={()=>toggleOp(op)}>{op}</div>
            ))}
          </div>
          <label style={{fontSize:"0.58rem",letterSpacing:"0.15em",color:"#4a5568",textTransform:"uppercase",display:"block",marginBottom:"4px"}}>Surface Finish (Ra)</label>
          <select style={s.select} value={roughness} onChange={e=>setRoughness(e.target.value)}>
            <option value="">-- Select --</option>
            <option>Ra 0.8 (Fine)</option><option>Ra 1.6 (General)</option>
            <option>Ra 3.2 (Medium)</option><option>Ra 6.3 (Rough)</option>
            <option>Not specified</option>
          </select>
          <label style={{fontSize:"0.58rem",letterSpacing:"0.15em",color:"#4a5568",textTransform:"uppercase",display:"block",marginBottom:"4px"}}>Notes / Dimensions</label>
          <textarea style={s.textarea} value={notes} onChange={e=>setNotes(e.target.value)}
            placeholder="e.g. Shaft dia 60mm, L=200mm, H7 tolerance..."/>
          <button style={s.btn} onClick={analyze} disabled={status==="loading"}>
            {status==="loading" ? "ANALYZING..." : "⚡ ANALYZE & GENERATE TOOLING LAYOUT"}
          </button>
        </div>

        {/* LOADING */}
        {status==="loading" && (
          <div style={{...s.panel, textAlign:"center", padding:"2rem"}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.1rem",letterSpacing:"0.2em",color:"#00c8ff",marginBottom:"12px"}}>ANALYZING...</div>
            <div style={{width:"100%",maxWidth:"300px",height:"2px",background:"rgba(0,200,255,0.1)",overflow:"hidden",margin:"0 auto 16px"}}>
              <div style={{height:"100%",width:"40%",background:"#00c8ff",boxShadow:"0 0 8px #00c8ff",animation:"none",transform:`translateX(${loadStep*80}%)`}}/>
            </div>
            {loadLabels.map((l,i)=>(
              <div key={i} style={{fontSize:"0.62rem",color:loadStep===i?"#00c8ff":"#4a5568",letterSpacing:"0.1em",lineHeight:"2"}}>{l}</div>
            ))}
          </div>
        )}

        {/* RESULT */}
        {status==="done" && result && (
          <div style={s.panel}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.3rem",letterSpacing:"0.08em",color:"#eaf4fb",marginBottom:"6px"}}>{result.title||"TOOLING ANALYSIS"}</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:"6px",marginBottom:"12px"}}>
              {(result.badges||[]).map((b,i)=>(
                <span key={i} style={{fontSize:"0.52rem",letterSpacing:"0.12em",textTransform:"uppercase",padding:"2px 8px",border:`1px solid ${bc(i)}`,color:bc(i)}}>{b}</span>
              ))}
              {result.best_brand&&<span style={{fontSize:"0.52rem",letterSpacing:"0.12em",textTransform:"uppercase",padding:"2px 8px",border:"1px solid #ffd60a",color:"#ffd60a"}}>⭐ Best: {result.best_brand}</span>}
            </div>

            {/* Sequence */}
            <div style={{fontSize:"0.55rem",letterSpacing:"0.3em",textTransform:"uppercase",color:"#00c8ff",marginBottom:"8px"}}>Process Sequence</div>
            <div style={{display:"flex",flexWrap:"wrap",background:"rgba(0,0,0,0.3)",border:"1px solid rgba(0,200,255,0.15)",marginBottom:"16px",overflow:"hidden"}}>
              {(result.process_sequence||[]).map(s=>(
                <div key={s.step} style={{flex:1,minWidth:"80px",padding:"8px 6px",textAlign:"center",borderRight:"1px solid rgba(0,200,255,0.1)"}}>
                  <div style={{fontSize:"0.5rem",color:"#4a5568",letterSpacing:"0.2em"}}>STEP {s.step}</div>
                  <div style={{fontSize:"0.6rem",color:"#c8d6e5"}}>{s.operation}</div>
                  <div style={{fontSize:"0.52rem",color:"#00c8ff",marginTop:"2px"}}>{s.tool_short||""}</div>
                </div>
              ))}
            </div>

            {/* Brand tabs */}
            <div style={{fontSize:"0.55rem",letterSpacing:"0.3em",textTransform:"uppercase",color:"#00c8ff",marginBottom:"8px"}}>Tools by Brand</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:"4px",marginBottom:"10px"}}>
              {(result.brands||[]).map(bd=>(
                <button key={bd.brand} style={s.tab(activeBrand===bd.brand)} onClick={()=>setActiveBrand(bd.brand)}>
                  {bd.brand===result.best_brand?"⭐ ":""}{bd.brand}
                </button>
              ))}
            </div>
            {(result.brands||[]).filter(bd=>bd.brand===activeBrand).map(bd=>(
              <div key={bd.brand}>
                {bd.highlight&&<div style={{fontSize:"0.65rem",color:"#aaa",padding:"6px 10px",borderLeft:"2px solid #ffd60a",background:"rgba(255,214,10,0.04)",marginBottom:"10px",lineHeight:"1.7"}}>{bd.highlight}</div>}
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:"10px"}}>
                  {(bd.tools||[]).map((t,ti)=>(
                    <div key={ti} style={s.toolCard}>
                      <div style={{fontSize:"0.52rem",letterSpacing:"0.2em",color:"#00c8ff",marginBottom:"2px"}}>STEP {t.step} — {t.operation}</div>
                      <div style={{fontSize:"0.52rem",color:"#ffd60a",marginBottom:"1px"}}>{bd.brand}</div>
                      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1rem",letterSpacing:"0.05em",color:"#eaf4fb",marginBottom:"2px"}}>{t.tool_name}</div>
                      <div style={{fontSize:"0.6rem",color:"#888",marginBottom:"8px"}}>{t.series}</div>
                      {t.holder&&<div style={{fontSize:"0.58rem",color:"#4a5568",marginBottom:"6px"}}>Holder: {t.holder}</div>}
                      {Object.entries(t.specs||{}).map(([k,v])=>(
                        <div key={k} style={{display:"flex",justifyContent:"space-between",fontSize:"0.58rem",borderBottom:"1px solid rgba(255,255,255,0.04)",paddingBottom:"3px",marginBottom:"3px"}}>
                          <span style={{color:"#4a5568"}}>{k}</span><span style={{color:"#c8d6e5"}}>{v}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Conditions */}
            {(result.cutting_conditions||[]).length>0&&(
              <div style={{background:"rgba(0,0,0,0.3)",border:"1px solid rgba(0,200,255,0.15)",padding:"12px",marginTop:"12px"}}>
                <div style={{fontSize:"0.55rem",letterSpacing:"0.3em",color:"#00c8ff",textTransform:"uppercase",marginBottom:"10px"}}>Cutting Conditions</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(100px,1fr))",gap:"10px"}}>
                  {result.cutting_conditions.map((c,i)=>(
                    <div key={i} style={{textAlign:"center"}}>
                      <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.4rem",color:"#eaf4fb",display:"block"}}>{c.value}<span style={{color:"#00c8ff",fontSize:"0.7rem"}}>{c.unit}</span></span>
                      <div style={{fontSize:"0.5rem",color:"#4a5568",letterSpacing:"0.15em",textTransform:"uppercase"}}>{c.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div style={{...s.notes,marginTop:"12px"}}>
              {result.material_analysis&&<><strong style={{color:"#e63946"}}>Material:</strong> {result.material_analysis}<br/><br/></>}
              {result.notes}
              {result.jp_note&&<><br/><br/><strong style={{color:"#e63946"}}>補足:</strong> {result.jp_note}</>}
            </div>

            <div style={{textAlign:"right",marginTop:"8px"}}>
              <button onClick={copyReport} style={{background:"transparent",border:"1px solid rgba(0,200,255,0.2)",color:"#4a5568",fontFamily:"'Share Tech Mono',monospace",fontSize:"0.58rem",letterSpacing:"0.1em",padding:"4px 12px",cursor:"pointer"}}>
                {copied?"✓ COPIED":"⎘ COPY REPORT"}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
