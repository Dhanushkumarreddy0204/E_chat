import{c as u,r as c,w as d,j as f}from"./index-Db8PbI_0.js";/**
 * @license lucide-react v0.363.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const m=u("X",[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]]);function p({label:s,onClose:t,children:l,immersive:r=!1}){const a=c.useRef(null);return c.useLayoutEffect(()=>{const e=a.current,o=document.activeElement,n=document.body.style.overflow;return document.body.style.overflow="hidden",e.showModal(),()=>{e.close(),document.body.style.overflow=n,o instanceof HTMLElement&&o.isConnected&&o.focus({preventScroll:!0})}},[]),d.createPortal(f.jsx("dialog",{ref:a,className:`modal-frame ${r?"modal-visual":""}`,"aria-label":s,onCancel:e=>{e.preventDefault(),t()},onClick:e=>{e.target===e.currentTarget&&!r&&t()},children:l}),document.body)}export{p as M,m as X};
