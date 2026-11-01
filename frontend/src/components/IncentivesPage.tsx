import React, { useEffect, useState } from 'react';
import { Form } from './clinical/ClinicalCircuit';
import { liveRequest } from '../services/liveApi';

type Row = {idextraccion:number; idincentivo:number|null; nombres:string; apellidos:string; tipoarticulo:string|null; refrigerioentregado:boolean|null};
export function IncentivesPage({token}:{token:string}) {
  const [rows,setRows]=useState<Row[]>([]),[error,setError]=useState(''),[message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  async function confirm(ident:number) {
    if(!window.confirm('Confirma que el refrigerio ya fue entregado físicamente.'))return;
    setBusy(true);setError('');
    try{await liveRequest(`agenda/incentivos/${ident}/confirmar-refrigerio/`,token,{confirmada:true});setMessage('Refrigerio entregado y confirmado.');await load();}
    catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  async function load(signal?:AbortSignal) {
    try {setRows(await liveRequest<Row[]>('agenda/incentivos/',token,undefined,signal));}
    catch(e){if(!(e instanceof DOMException && e.name==='AbortError'))setError((e as Error).message);}
  }
  useEffect(()=>{const c=new AbortController();void load(c.signal);return()=>c.abort();},[token]);
  return <section className="space-y-4">
    <header className="p-6 border rounded-3xl bg-white"><h1 className="text-2xl font-bold">Refrigerio e incentivos</h1><p>Registra únicamente lo entregado después de una extracción real. Las entregas no modifican la aptitud ni la liberación del lote.</p></header>
    {error&&<p role="alert" className="p-4 bg-rose-50 text-rose-900 rounded-xl">{error}</p>}
    {message&&<p role="status" className="p-4 bg-emerald-50 rounded-xl">{message}</p>}
    <Form title="Registrar entrega postcolecta" fields={[
      {name:'idextraccion',label:'Extracción sin entrega registrada',options:rows.filter(r=>!r.idincentivo).map(r=>[String(r.idextraccion),`#${r.idextraccion} · ${r.nombres} ${r.apellidos}`])},
      {name:'tipoarticulo',label:'Artículo realmente entregado (o indicar Sin artículo)',maxLength:80},
      {name:'refrigerioentregado',label:'El refrigerio fue entregado',type:'checkbox',required:false},
    ]} submit={async d=>{await liveRequest('agenda/incentivos/',token,d);setMessage('Entrega registrada.');setError('');await load();}} />
    <div className="bg-white border rounded-3xl p-6 space-y-3"><h2 className="font-bold text-xl">Últimas 200 extracciones</h2>
      {!rows.length&&<p>No hay extracciones disponibles.</p>}
      {rows.map(r=><article key={r.idextraccion} className="border rounded-xl p-4"><p className="font-bold">Extracción #{r.idextraccion} · {r.nombres} {r.apellidos}</p><p>{r.idincentivo?`${r.tipoarticulo} · Refrigerio ${r.refrigerioentregado?'entregado':'pendiente de entrega'}`:'Sin entrega registrada'}</p>{r.idincentivo&&!r.refrigerioentregado&&<button disabled={busy} className="mt-3 bg-emerald-700 text-white rounded-xl p-3" onClick={()=>void confirm(r.idincentivo!)}>Confirmar refrigerio entregado #{r.idincentivo}</button>}</article>)}
    </div>
  </section>;
}
