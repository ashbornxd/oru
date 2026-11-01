import type { OruPage, PageWidget } from "./project.js";
import type { PageRoute } from "./routes.js";

export interface BrowserPage {
  route: string;
  page: OruPage;
}

function safeJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}

/** Produce a self-contained browser shell and embedded Canvas 2D runtime. */
export function renderBrowserDocument(
  currentRoute: string,
  pages: BrowserPage[],
  routes: Map<string, PageRoute>
): string {
  const current = pages.find(item => item.route === currentRoute);
  if (!current) throw new Error("Cannot render missing route: " + currentRoute);
  const payload = safeJson({ currentRoute, pages: pages.map(item => ({ route: item.route, page: item.page })), routes: [...routes.keys()] });
  const title = escapeHtml(current.page.metadata.title);
  const description = escapeHtml(current.page.metadata.description);
  const language = escapeHtml(current.page.metadata.language);
  return `<!doctype html>
<html lang="${language}">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title><meta name="description" content="${description}">
<style>
*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:#fff;color:#171717;font-family:Arial,sans-serif}
#oru-root{position:relative;min-height:100vh;width:100%;overflow:auto}
#oru-canvas{display:block;width:100%;min-height:100vh}
#oru-accessible{position:absolute;inset:0;pointer-events:none}
#oru-accessible button,#oru-accessible a,#oru-accessible input{pointer-events:auto;position:absolute;opacity:.001;z-index:2}
#oru-accessible button:focus-visible,#oru-accessible a:focus-visible,#oru-accessible input:focus-visible{opacity:1;outline:2px solid #2457d6}
</style>
</head><body><main id="oru-root"><canvas id="oru-canvas" aria-hidden="true"></canvas><div id="oru-accessible"></div></main>
<script type="application/json" id="oru-data">${payload}</script>
<script>
(()=>{"use strict";
const data=JSON.parse(document.getElementById("oru-data").textContent);
const canvas=document.getElementById("oru-canvas"),ctx=canvas.getContext("2d"),a11y=document.getElementById("oru-accessible"),root=document.getElementById("oru-root");
let hits=[],scale=1;
const css=(v,fallback)=>typeof v==="string"?v:fallback;
const color=(w,k,f)=>css(w.properties[k],f);
function measure(w,width){const p=w.properties||{};const pad=number(p.padding,12);if(w.type==="text"||w.type==="button"||w.type==="link")return {w:Math.min(width,Math.max(40,ctx.measureText(w.text||"").width+pad*2)),h:number(p.height,38)};
if(w.type==="input")return {w:Math.min(width,number(p.width,width)),h:number(p.height,42)};
if(w.type==="image")return {w:Math.min(width,number(p.width,160)),h:number(p.height,100)};
if(w.type==="box")return {w:Math.min(width,number(p.width,width)),h:number(p.height,Math.max(48,childrenHeight(w,width)))};
return {w:Math.min(width,number(p.width,width)),h:Math.max(number(p.height,0),childrenHeight(w,width))};}
function number(v,d){if(typeof v==="number")return v;if(typeof v==="string"&&/^\\d+(?:\\.\\d+)?(?:px)?$/.test(v))return parseFloat(v);return d}
function childrenHeight(w,width){let total=0;for(const c of w.children||[]){const s=measure(c,width);total+=s.h+number(c.properties?.["margin.bottom"],8)}return total}
function drawWidget(w,x,y,width,parentDir="column"){
const p=w.properties||{},pad=number(p.padding,12),size=measure(w,width),h=size.h;
ctx.save();ctx.fillStyle=color(w,"background.color","transparent");ctx.strokeStyle=color(w,"border.color","transparent");ctx.lineWidth=number(p["border.width"],1);
if(w.type==="box"||w.type==="button"||w.type==="input"){ctx.fillStyle=color(w,"background.color",w.type==="button"?"#eeeeee":"#ffffff");roundRect(x,y,size.w,h,number(p["border.radius"],6));if(ctx.fillStyle!=="transparent")ctx.fill();if(color(w,"border.color","transparent")!=="transparent")ctx.stroke()}
if(w.type==="text"||w.type==="button"||w.type==="link"){ctx.fillStyle=color(w,"text.color",w.type==="link"?"#2457d6":"#171717");ctx.font=number(p["text.size"],16)+"px "+css(p["text.font"],"Arial");ctx.textBaseline="middle";ctx.fillText(w.text||"",x+pad,y+h/2,Math.max(0,size.w-pad*2));}
if(w.type==="image"){const src=css(p.src,w.text||"");if(src){const img=new Image();img.onload=()=>{ctx.drawImage(img,x,y,size.w,h)};img.src=src}}
if(w.type==="input"){ctx.fillStyle="#777";ctx.font="14px Arial";ctx.textBaseline="middle";ctx.fillText(css(p.placeholder,""),x+10,y+h/2);const input=document.createElement("input");input.type=css(p.type,"text")==="password"?"password":"text";input.placeholder=css(p.placeholder,"");input.setAttribute("aria-label",css(p.label,p.placeholder||"Input"));positionSemantic(input,x,y,size.w,h);a11y.append(input)}
if(w.type==="button"||w.type==="link"){const el=document.createElement(w.type==="link"?"a":"button");el.textContent=w.text||w.route||"Action";el.setAttribute("aria-label",el.textContent);if(w.type==="link"){el.href=w.route||"#";el.addEventListener("click",e=>{if(el.href&&el.getAttribute("href")!=="#"){e.preventDefault();navigate(w.route)}})}else el.type="button";positionSemantic(el,x,y,size.w,h);a11y.append(el);hits.push({x,y,w:size.w,h,action:()=>w.type==="link"&&navigate(w.route)})}
const kids=w.children||[];if(kids.length){let cursorY=y+pad,cursorX=x+pad;const innerW=Math.max(0,size.w-pad*2),dir=w.type==="row"?"row":"column";for(const child of kids){const s=measure(child,innerW);if(dir==="row"){drawWidget(child,cursorX,cursorY,Math.min(s.w,innerW),"row");cursorX+=s.w+8}else{drawWidget(child,cursorX,cursorY,innerW,"column");cursorY+=s.h+number(child.properties?.["margin.bottom"],8)}}}
ctx.restore();return h}
function positionSemantic(el,x,y,w,h){el.style.left=x+"px";el.style.top=y+"px";el.style.width=w+"px";el.style.height=h+"px"}
function roundRect(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
function paint(){const route=data.currentRoute,page=data.pages.find(p=>p.route===route)?.page;if(!page)return;document.title=page.metadata.title||"ORU";document.documentElement.lang=page.metadata.language||"en";let width=root.clientWidth;scale=window.devicePixelRatio||1;const height=Math.max(window.innerHeight,childrenHeight({children:page.widgets},width)+32);canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale);canvas.style.height=height+"px";ctx.setTransform(scale,0,0,scale,0,0);ctx.clearRect(0,0,width,height);hits=[];a11y.replaceChildren();let y=16;for(const widget of page.widgets){y+=drawWidget(widget,16,y,width-32)+8}}
function navigate(route){if(!route)return;const normalized=route.startsWith("/")?route:"/"+route;if(!data.routes.includes(normalized))return;history.pushState({}, "",normalized);data.currentRoute=normalized;paint()}
window.addEventListener("popstate",()=>{data.currentRoute=location.pathname;paint()});window.addEventListener("resize",paint);canvas.addEventListener("click",e=>{const r=canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;for(const hit of hits.slice().reverse())if(x>=hit.x&&x<=hit.x+hit.w&&y>=hit.y&&y<=hit.y+hit.h){hit.action();break}});paint();
})();
</script></body></html>`;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
