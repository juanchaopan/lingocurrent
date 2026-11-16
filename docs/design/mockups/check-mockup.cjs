const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(__dirname+'/lingocurrent-input-design.html','utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1].replace(' const restored=window.openai',' globalThis.states=allStates; globalThis.readWords=()=>words; const restored=window.openai');
function setup(){let seq=0;const timers=new Map();const el=()=>({style:{},textContent:'',value:'',dataset:{},classList:{add(){},toggle(){}},getAttribute(){return null},focus(){}});
 const canvases=['desktop','touch','tablet'].map(layout=>{const handlers={},notice=el(),dialog={...el(),open:false,parts:{h2:el(),p:el(),confirm:el(),cancel:el()},showModal(){this.open=true;},close(){this.open=false},querySelector(sel){return this.parts[sel==='h2'?'h2':sel==='p'?'p':sel.includes('confirm-delete')?'confirm':'cancel'];}};return {dataset:{layout},classList:{toggle(){},add(){}},innerHTML:'',handlers,dialog,querySelector(sel){return sel==='.notice'?notice:sel==='dialog'?dialog:null},querySelectorAll(){return []},addEventListener(e,fn){(handlers[e]??=[]).push(fn)},contains(){return true},closest(){return {hidden:false}}};});
 const ctx={document:{getElementById(){return {querySelectorAll(){return canvases}}},addEventListener(){}},window:{addEventListener(){},scrollY:100,scrollTo(){}},setTimeout(fn){timers.set(++seq,fn);return seq},clearTimeout(id){timers.delete(id)},queueMicrotask(fn){fn()},matchMedia(){return {matches:true}},console};vm.createContext(ctx);vm.runInContext(script,ctx);
 function send(c,event,target,extra={}){for(const fn of c.handlers[event]||[])fn({target,preventDefault(){},...extra});}
 function click(c,data){const b={dataset:data,getAttribute(){return null}};send(c,'click',{closest(sel){return sel==='button'?b:null}});}
 function change(c,data,checked){const target={dataset:data,checked};send(c,'change',target);}
 return {ctx,canvases,timers,send,click,change,run(id){const fn=timers.get(id);timers.delete(id);fn?.();}};
}
for(let index=0;index<3;index++){
 const env=setup(),{ctx,click,change,canvases}=env,s=ctx.states[index],c=canvases[index];
 assert(!c.innerHTML.includes('class="topbar"'));assert(c.innerHTML.includes('account-corner'));assert(!c.innerHTML.includes('Last visited —'));assert(!c.innerHTML.includes('>—</td>'));
 if(s.layout==='desktop'){assert(c.innerHTML.includes('aria-label="Pagination"'));assert(!c.innerHTML.includes('data-action="more"'));assert(!c.innerHTML.includes('All loaded'));}
 else{assert(!c.innerHTML.includes('aria-label="Pagination"'));assert(c.innerHTML.includes('data-action="more"'));assert(!c.innerHTML.includes('<table'));}
 click(c,{page:'vocabulary'});assert(!c.innerHTML.includes('Practice'));assert(!ctx.readWords().some(w=>w.m.some(x=>'phase' in x||'completed' in x)));assert(s.layout==='desktop'?!c.innerHTML.includes('data-delete-id='):c.innerHTML.includes('class="swipe-delete"'));assert(!c.innerHTML.includes('class="flat icon delete-icon" data-delete-id='));
 if(s.layout==='desktop'){assert(c.innerHTML.includes('data-select-visible'));assert.equal((c.innerHTML.match(/<th(?:[ >])/g)||[]).length,8);assert(!c.innerHTML.includes('data-action="more"'));assert(!c.innerHTML.includes('data-action="delete-selected"'));}
 else{assert(c.innerHTML.includes('data-action="selection-mode"'));click(c,{action:'selection-mode'});assert.equal(s.selectMode,true);assert(c.innerHTML.includes('data-select-word="2"'));}
 change(c,{selectWord:'2'},true);change(c,{selectWord:'9'},true);assert.equal(s.selectedIds.length,2);assert(c.innerHTML.includes('2 selected'));
 if(s.layout==='desktop'){click(c,{pageno:'2'});assert.equal(s.selectedIds.length,2);change(c,{selectVisible:''},true);assert.equal(s.selectedIds.length,6);change(c,{selectVisible:''},false);assert.equal(s.selectedIds.length,2);}
 click(c,{action:'delete-selected'});assert(c.dialog.open);assert.equal(c.dialog.parts.h2.textContent,'Delete 2 words?');assert.equal(ctx.readWords().length,9);
 click(c,{action:'cancel-delete'});assert.equal(ctx.readWords().length,9);assert.equal(s.deleteIds.length,0);
 click(c,{action:'delete-selected'});click(c,{action:'confirm-delete'});assert.equal(ctx.readWords().length,7);assert(!ctx.readWords().some(w=>w.id===9||w.id===2));assert.equal(s.selectedIds.length,0);assert.equal(s.selectMode,false);
 assert(!c.innerHTML.includes('data-delete-id="2"'));assert(c.innerHTML.includes('7 words'));
 if(s.layout==='desktop'){change(c,{selectWord:'3'},true);click(c,{action:'delete-selected'});}else click(c,{deleteId:'3'});assert.equal(ctx.readWords().length,7);assert.equal(c.dialog.parts.h2.textContent,'Delete word?');click(c,{action:'cancel-delete'});click(c,{action:'clear-selection'});click(c,{card:'3'});assert.equal(s.page,'detail');assert(!c.innerHTML.includes('data-action="delete-word"'));click(c,{page:'vocabulary'});
 click(c,{mode:'Spell'});assert(c.innerHTML.includes('class="review-controls"><span>Spell</span>'));assert(!c.innerHTML.includes('class="topbar"'));assert(c.innerHTML.includes('data-action="close-review"'));click(c,{action:'close-review'});assert.equal(s.page,'vocabulary');
}
// The last row of the last page is removed and the mouse list clamps to its previous page.
// Touch opens a card from metadata/blank space; mouse keeps the existing title/word button entry.
for(let index=0;index<3;index++){
 const e=setup(),s=e.ctx.states[index],c=e.canvases[index];
 const surface=(kind,id)=>({closest(sel){if(sel==='[data-article-item]'&&kind==='article')return {dataset:{articleItem:String(id)}};if(sel==='[data-vocab-card]'&&kind==='word')return {dataset:{vocabCard:String(id)}};return null;}});
 s.sourceValues=['Yahoo'];s.pageNo=2;s.pageSize=2;s.loaded=6;s.rerender();
 e.send(c,'click',surface('article',4));
 if(s.layout==='desktop'){assert.equal(s.page,'articles');e.click(c,{read:'4'});}
 assert.equal(s.page,'reader');assert.equal(s.articleId,4);e.click(c,{action:'close-article'});assert.equal(s.page,'articles');assert.equal(s.pageNo,2);assert.equal(s.loaded,6);assert.equal(s.sourceValues[0],'Yahoo');
 e.click(c,{page:'vocabulary'});s.q='resilient';s.state='Ongoing';s.sort='next0';s.dir=-1;s.roundValues=[['3'],[],[]];s.loaded=8;s.rerender();
 e.send(c,'click',surface('word',1));
 if(s.layout==='desktop'){assert.equal(s.page,'vocabulary');e.click(c,{card:'1'});}
 assert.equal(s.page,'detail');assert(c.innerHTML.includes('data-action="close-detail"'));assert(!c.innerHTML.includes('data-lucide="arrow-left"'));e.click(c,{action:'close-detail'});assert.equal(s.page,'vocabulary');assert.equal(s.q,'resilient');assert.equal(s.sort,'next0');assert.equal(s.dir,-1);assert.equal(s.roundValues[0][0],'3');assert.equal(s.loaded,8);
 if(s.layout!=='desktop'){e.click(c,{action:'selection-mode'});e.send(c,'click',surface('word',1));assert.equal(s.page,'vocabulary');assert.equal(s.selectedIds[0],1);e.send(c,'click',surface('word',1));assert.equal(s.selectedIds.length,0);}
}
// The last row of the last page is removed and the mouse list clamps to its previous page.
{
 const e=setup(),s=e.ctx.states[0],c=e.canvases[0];e.click(c,{page:'vocabulary'});s.pageSize=4;s.pageNo=3;s.rerender();e.change(c,{selectWord:'5'},true);e.click(c,{action:'delete-selected'});e.click(c,{action:'confirm-delete'});assert.equal(s.pageNo,2);assert(!c.innerHTML.includes('data-action="more"'));
}
// A touch swipe only reveals; a long press enters selection without deleting.
for(const index of [1,2]){
 const e=setup(),s=e.ctx.states[index],c=e.canvases[index];e.click(c,{page:'vocabulary'});const front={style:{}},card={dataset:{vocabCard:'2'},querySelector(){return front},setPointerCapture(){}};
 const target={closest(sel){if(sel==='[data-vocab-card]')return card;if(sel==='[data-delete-id],input,label')return null;return null;}};
 e.send(c,'pointerdown',target,{pointerType:'touch',pointerId:1,clientX:200,clientY:200});e.send(c,'pointermove',target,{pointerId:1,clientX:140,clientY:201});e.send(c,'pointerup',target,{pointerId:1,clientX:140,clientY:201});assert.equal(s.swipeId,2);assert.equal(e.ctx.readWords().length,9);assert(c.innerHTML.includes('swipe-open'));
 e.send(c,'click',target);assert.equal(s.page,'vocabulary');
 s.suppressClickUntil=0;e.send(c,'pointerdown',target,{pointerType:'touch',pointerId:2,clientX:200,clientY:200});const hold=s.gesture.holdTimer;e.run(hold);assert.equal(s.selectMode,true);assert.equal(s.selectedIds[0],2);assert.equal(e.ctx.readWords().length,9);
}
// Scrolling a card does not turn into an accidental open at pointer-up.
{
 const e=setup(),s=e.ctx.states[1],c=e.canvases[1];e.click(c,{page:'vocabulary'});const card={dataset:{vocabCard:'2'},querySelector(){return {style:{}}}},target={closest(sel){return sel==='[data-vocab-card]'?card:null;}};
 e.send(c,'pointerdown',target,{pointerType:'touch',pointerId:1,clientX:200,clientY:200});e.send(c,'pointermove',target,{pointerId:1,clientX:201,clientY:240});e.send(c,'pointerup',target,{pointerId:1,clientX:201,clientY:240});e.send(c,'click',target);assert.equal(s.page,'vocabulary');s.suppressClickUntil=0;e.send(c,'click',target);assert.equal(s.page,'detail');
}
// Selecting a whole loaded batch over the limit changes nothing; a single extra selection is rejected too.
{
 const e=setup(),s=e.ctx.states[1],c=e.canvases[1],words=e.ctx.readWords(),base=words[0];for(let id=10;id<=110;id++)words.push({...base,id,word:'sample '+id});e.click(c,{page:'vocabulary'});s.loaded=200;s.selectMode=true;s.rerender();e.change(c,{selectVisible:''},true);assert.equal(s.selectedIds.length,0);s.selectedIds=Array.from({length:100},(_,i)=>i+1);e.change(c,{selectWord:'101'},true);assert.equal(s.selectedIds.length,100);assert(!s.selectedIds.includes(101));
}
// Each example can be reached without submitting or losing an answer, and every cloze stays hidden.
for(let index=0;index<3;index++)for(const mode of ['Speak','Spell','Translate']){
 const e=setup(),s=e.ctx.states[index],c=e.canvases[index];e.click(c,{page:'vocabulary'});e.click(c,{mode});
 assert(c.innerHTML.includes('>1 / 2</span>'));const progress=JSON.stringify(e.ctx.readWords()[0].m);
 if(mode==='Spell'){const query=c.querySelector.bind(c);c.querySelector=sel=>sel==='[data-answer]'?{value:'my unfinished answer'}:query(sel);}
 if(mode==='Translate')e.click(c,{option:'2'});
 e.click(c,{action:'example-next',exampleContext:'review',exampleLayer:'0'});
 assert.equal(s.examplePositions.review,1);assert(c.innerHTML.includes('>2 / 2</span>'));assert(c.innerHTML.includes('during'));assert.equal(s.feedback,null);
 assert.equal(JSON.stringify(e.ctx.readWords()[0].m),progress);
 if(mode==='Spell'){assert.equal(s.answerText,'my unfinished answer');assert(c.innerHTML.includes('value="my unfinished answer"'));}
 if(mode==='Translate')assert.equal(s.option,2);else{assert(!c.innerHTML.includes('data-word="resilient"'));assert(c.innerHTML.includes('aria-label="Hidden target"'));}
 e.click(c,{action:'example-next',exampleContext:'review'});assert.equal(s.examplePositions.review,1);
 e.click(c,{action:'example-prev',exampleContext:'review'});assert.equal(s.examplePositions.review,0);assert(c.innerHTML.includes('>1 / 2</span>'));
}
// The cache and saved card own separate complete example arrays. Duplicate confirmation must not save early.
{
 const e=setup(),s=e.ctx.states[0],c=e.canvases[0],word=e.ctx.readWords()[0],original=[...word.examples];
 e.click(c,{page:'vocabulary'});e.click(c,{card:'1'});assert(c.innerHTML.includes('>1 / 2</span>'));
 s.layers=[{...word,examples:[...word.examples],displayExampleIndex:0}];
 e.click(c,{action:'example-next',exampleContext:'lookup',exampleLayer:'0'});
 e.click(c,{action:'refresh-visible-example',exampleContext:'lookup',exampleLayer:'0'});
 assert.equal(s.layers[0].examples[0],original[0]);assert.notEqual(s.layers[0].examples[1],original[1]);assert.equal(word.examples[1],original[1]);
 e.click(c,{action:'add-word'});assert(c.dialog.open);assert.equal(word.examples[1],original[1]);
 e.click(c,{action:'confirm-delete'});assert.equal(word.examples[1],s.layers[0].examples[1]);assert.notEqual(word.examples,s.layers[0].examples);
 e.click(c,{page:'vocabulary'});e.click(c,{card:'2'});assert(c.innerHTML.includes('>1 / 1</span>'));
 e.click(c,{action:'example-next',exampleContext:'detail'});assert.equal(s.examplePositions.detail,0);
}
// Horizontal touch/pen movement switches examples; vertical movement or selecting words does not.
for(const pointerType of ['touch','pen']){
 const e=setup(),s=e.ctx.states[1],c=e.canvases[1];e.click(c,{page:'vocabulary'});e.click(c,{mode:'Spell'});
 const panel={dataset:{exampleContext:'review',exampleLayer:'0'}},target={closest(sel){return sel==='.example-carousel'?panel:null;}};
 const swipe=(x,y)=>{e.send(c,'pointerdown',target,{pointerType,pointerId:9,clientX:180,clientY:100});e.send(c,'pointermove',target,{pointerId:9,clientX:x,clientY:y});e.send(c,'pointerup',target,{pointerId:9,clientX:x,clientY:y});};
 swipe(110,102);assert.equal(s.examplePositions.review,1);swipe(250,101);assert.equal(s.examplePositions.review,0);swipe(178,180);assert.equal(s.examplePositions.review,0);
 e.ctx.window.getSelection=()=>({toString(){return 'selected words';}});swipe(110,101);assert.equal(s.examplePositions.review,0);
 e.ctx.window.getSelection=()=>({toString(){return '';}});
 e.send(c,'keydown',target,{key:'ArrowRight'});assert.equal(s.examplePositions.review,1);
}
assert(!/<!doctype|<html[ >]|<body[ >]/i.test(html));assert(Buffer.byteLength(html)<1000000);
console.log('Passed generated markup/state checks: touch whole-card entry, mouse title/word entry, close/return context, gesture suppression, pagination/loading, selection/deletion, page clamp, swipe, long press and review controls. Native browser/device behavior not tested.');
