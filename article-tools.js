const firebaseConfig={apiKey:'AIzaSyAK1W4reUyi6kDyPetwqdqtLCnXF0469tc',authDomain:'postkina.firebaseapp.com',projectId:'postkina',storageBucket:'postkina.firebasestorage.app',messagingSenderId:'594893100682',appId:'1:594893100682:web:799226823a1fee3a447f73'};
const canonical=document.querySelector('link[rel="canonical"]')?.href||location.href;
const worker='https://postkina-facebook-publisher.whatthewithyking.workers.dev';
const postId=document.querySelector('meta[name="postkina-post-id"]')?.content||canonical.match(/postkina-ai-\d+/)?.[0]||new URL(canonical).searchParams.get('post');
const article=document.querySelector('article');
const tools=article?.querySelector('.postkina-article-tools');
const savedKey='postkina_saved_posts',ratedKey='postkina_rated_posts',recentKey='postkina_recently_viewed',topicsKey='postkina_followed_topics',authorsKey='postkina_followed_authors';
const readJson=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback));}catch(_){return fallback;}};
const savedPosts=new Set(readJson(savedKey,[])),ratedPosts=readJson(ratedKey,{}),followedTopics=new Set(readJson(topicsKey,[])),followedAuthors=new Set(readJson(authorsKey,[]));
const topic=tools?.dataset.topic||document.querySelector('meta[property="article:section"]')?.content||'News';
const author=tools?.dataset.author||'postkina-ai';
const title=document.querySelector('h1')?.textContent?.trim()||'PostKina story';
const excerpt=document.querySelector('.excerpt')?.textContent?.trim()||'';
const imageUrl=document.querySelector('meta[property="og:image"]')?.content||'';
const published=document.querySelector('time')?.dateTime||new Date().toISOString();

function readingMinutes(){const words=[...article.querySelectorAll('article p,article li')].map((node)=>node.textContent).join(' ').trim().split(/\s+/).filter(Boolean).length;return Math.max(1,Math.ceil(words/220));}
function syncSetButton(button,set,value,label){if(!button)return;button.textContent=`${set.has(value)?'Following':'Follow'} ${label}`;button.setAttribute('aria-pressed',String(set.has(value)));}
function wrapText(context,text,x,y,width,lineHeight,maxLines=5){const words=String(text).split(/\s+/);let line='',lines=[];for(const word of words){const test=`${line} ${word}`.trim();if(context.measureText(test).width>width&&line){lines.push(line);line=word;}else line=test;}if(line)lines.push(line);lines.slice(0,maxLines).forEach((value,index)=>context.fillText(value,x,y+(index*lineHeight)));}
async function downloadShareCard(){const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=630;const context=canvas.getContext('2d');context.fillStyle='#14212d';context.fillRect(0,0,1200,630);context.fillStyle='#ffb000';context.fillRect(0,0,22,630);context.fillStyle='#f35c44';context.font='800 25px system-ui';context.fillText('POSTKINA · STORIES WORTH SHARING',70,78);context.fillStyle='#fff';context.font='700 54px system-ui';wrapText(context,title,70,160,720,67);context.fillStyle='#bfc9cc';context.font='500 23px system-ui';context.fillText(`${topic} · ${readingMinutes()} min read`,70,560);context.fillStyle='#ffb000';context.font='800 26px system-ui';context.fillText('postkina.online',880,570);if(imageUrl){try{const image=new Image();image.crossOrigin='anonymous';await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src=imageUrl;});context.save();context.beginPath();context.roundRect(850,65,300,430,18);context.clip();const scale=Math.max(300/image.width,430/image.height),width=image.width*scale,height=image.height*scale;context.drawImage(image,850+(300-width)/2,65+(430-height)/2,width,height);context.restore();}catch(_){context.strokeStyle='#ffb000';context.strokeRect(850,65,300,430);}}const link=document.createElement('a');link.download=`postkina-${postId}.png`;link.href=canvas.toDataURL('image/png');link.click();}

if(postId&&article&&tools){
  let recent=readJson(recentKey,[]);recent=[postId,...recent.filter((id)=>id!==postId)].slice(0,8);localStorage.setItem(recentKey,JSON.stringify(recent));
  const saveButton=tools.querySelector('.postkina-save');
  const syncSave=()=>{saveButton.textContent=savedPosts.has(postId)?'Saved ✓':'Save article ♡';};syncSave();
  saveButton.addEventListener('click',()=>{if(savedPosts.has(postId))savedPosts.delete(postId);else savedPosts.add(postId);localStorage.setItem(savedKey,JSON.stringify([...savedPosts]));syncSave();});

  const utility=document.createElement('section');utility.className='postkina-reader-tools';utility.innerHTML=`<span class="postkina-read-time">${readingMinutes()} minute read</span><button type="button" data-follow-topic></button><button type="button" data-follow-author></button><button type="button" data-share-card>Download share card</button>${navigator.share?'<button type="button" data-native-share>Share…</button>':''}`;tools.before(utility);
  const topicButton=utility.querySelector('[data-follow-topic]'),authorButton=utility.querySelector('[data-follow-author]');syncSetButton(topicButton,followedTopics,topic,topic);syncSetButton(authorButton,followedAuthors,author,'PostKina Editorial');
  topicButton.addEventListener('click',()=>{if(followedTopics.has(topic))followedTopics.delete(topic);else followedTopics.add(topic);localStorage.setItem(topicsKey,JSON.stringify([...followedTopics]));syncSetButton(topicButton,followedTopics,topic,topic);});
  authorButton.addEventListener('click',()=>{if(followedAuthors.has(author))followedAuthors.delete(author);else followedAuthors.add(author);localStorage.setItem(authorsKey,JSON.stringify([...followedAuthors]));syncSetButton(authorButton,followedAuthors,author,'PostKina Editorial');});
  utility.querySelector('[data-share-card]').addEventListener('click',downloadShareCard);
  utility.querySelector('[data-native-share]')?.addEventListener('click',()=>navigator.share({title,text:excerpt,url:canonical}).catch(()=>{}));

  const firebase=Promise.all([import('https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js'),import('https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js')]).then(([appModule,firestore])=>({...firestore,db:firestore.getFirestore(appModule.initializeApp(firebaseConfig))}));
  fetch(`${worker}?view=${encodeURIComponent(postId)}`,{keepalive:true}).catch(()=>{});
  const stars=[...tools.querySelectorAll('.postkina-stars button')],summary=tools.querySelector('.postkina-rating-summary'),status=tools.querySelector('.postkina-rating-status');let values=[];
  const updateRating=()=>{const average=values.length?(values.reduce((total,value)=>total+value,0)/values.length).toFixed(1):'—',own=Number(ratedPosts[postId]||0);summary.textContent=`${average} out of 5${values.length?` · ${values.length} rating${values.length===1?'':'s'}`:' · Be the first to rate'}`;stars.forEach((button)=>{button.classList.toggle('selected',Number(button.dataset.rating)<=own);button.disabled=Boolean(own);});if(own)status.textContent=`Your rating: ${own} star${own===1?'':'s'}.`;};
  firebase.then(({db,getDocs,query,collection,where})=>getDocs(query(collection(db,'ratings'),where('postId','==',postId)))).then((snapshot)=>{values=snapshot.docs.map((document)=>Number(document.data().rating)).filter((value)=>value>=1&&value<=5);updateRating();}).catch(()=>{summary.textContent='Rating is temporarily unavailable.';});
  stars.forEach((button)=>button.addEventListener('click',async()=>{if(ratedPosts[postId])return;const rating=Number(button.dataset.rating);stars.forEach((star)=>{star.disabled=true;});status.textContent='Saving your rating…';try{const{db,addDoc,collection,serverTimestamp}=await firebase;await addDoc(collection(db,'ratings'),{postId,rating,writerId:author,writerName:'PostKina Editorial',createdAt:serverTimestamp()});ratedPosts[postId]=rating;localStorage.setItem(ratedKey,JSON.stringify(ratedPosts));values.push(rating);status.textContent=`Thank you — you rated this article ${rating} star${rating===1?'':'s'}.`;updateRating();}catch(_){stars.forEach((star)=>{star.disabled=false;});status.textContent='Could not save your rating. Please try again.';}}));

  const related=[...article.querySelectorAll('.related a')];if(related.length){const next=document.createElement('a');next.className='postkina-next-story';next.href=related[0].href;next.innerHTML=`<span>CONTINUE READING</span><strong>${related[0].textContent}</strong><b>Next story →</b>`;article.append(next);}
}
