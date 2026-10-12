import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-analytics.js';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js';
import { getFirestore, collection, getDocs, query, where, limit, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyAK1W4reUyi6kDyPetwqdqtLCnXF0469tc',
  authDomain: 'postkina.firebaseapp.com', projectId: 'postkina', storageBucket: 'postkina.firebasestorage.app',
  messagingSenderId: '594893100682', appId: '1:594893100682:web:799226823a1fee3a447f73', measurementId: 'G-DX3P7VCSDN'
};
const app = initializeApp(firebaseConfig);
try { getAnalytics(app); } catch (error) { console.info('Analytics unavailable in this environment.'); }
const db = getFirestore(app), auth = getAuth(app), $ = (s) => document.querySelector(s);
let posts = [], sortMode = 'latest';
const articleGrid = $('#articleGrid');
const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const asDate = (value) => value?.toDate ? value.toDate() : value ? new Date(value) : new Date();
const dateLabel = (value) => value ? asDate(value).toLocaleDateString('si-LK', {day:'numeric', month:'short'}) : 'pending';

function renderPosts() {
  const term = ($('#searchInput').value || '').toLowerCase();
  let list = posts.filter((p) => `${p.title || ''} ${p.excerpt || ''} ${p.category || ''} ${p.author || ''}`.toLowerCase().includes(term));
  if (sortMode === 'trending') list.sort((a, b) => (b.views || 0) - (a.views || 0));
  articleGrid.innerHTML = list.length ? list.map((p) => `<article class="article-card" data-id="${p.id}"><div class="article-visual ${p.accent || ''}" ${p.imageData ? `style="background-image:url('${p.imageData}')"` : ''}></div><span class="article-meta">${escapeHtml(p.category || 'කයිය')} · ${dateLabel(p.publishedAt)}</span><h3>${escapeHtml(p.title)}</h3><p>${escapeHtml(p.excerpt || '')}</p><div class="card-foot"><span class="author">${escapeHtml(p.author || 'PostKinaa writer')}</span><span class="rank-chip">★ ${Number(p.rank || 0).toFixed(1)}</span></div></article>`).join('') : '<div class="empty-state">දැනට publish කරපු ලිපි නැහැ. Writer කෙනෙක් වෙලා පළමු post එක ලියන්න.</div>';
  articleGrid.querySelectorAll('.article-card').forEach((card) => card.addEventListener('click', () => openArticle(posts.find((p) => p.id === card.dataset.id))));
}

function renderRanking() {
  const grouped = {};
  posts.forEach((p) => { const key = p.author || 'PostKinaa writer'; if (!grouped[key]) grouped[key] = {name:key, total:0, count:0, initial:key.trim().charAt(0)}; grouped[key].total += Number(p.rank || 0); grouped[key].count += 1; });
  const names = Object.values(grouped).sort((a,b) => (b.total/b.count) - (a.total/a.count)).slice(0, 4);
  $('#rankingList').innerHTML = names.length ? names.map((n,i) => `<div class="rank-row"><span class="rank-num">0${i+1}</span><span class="avatar">${escapeHtml(n.initial)}</span><span class="rank-name">${escapeHtml(n.name)}</span><span class="rank-pts">★ ${(n.total/n.count).toFixed(2)}</span></div>`).join('') : '<p class="muted">පළමු writer ranking එක මෙතන පෙන්වයි.</p>';
}

function showModal(html) { $('#modalContent').innerHTML = html; $('#modalBackdrop').hidden = false; document.body.style.overflow = 'hidden'; }
function closeModal() { $('#modalBackdrop').hidden = true; document.body.style.overflow = ''; }
function openArticle(p) { if (!p) return; showModal(`<span class="eyebrow">${escapeHtml(p.category || 'කයිය')} · ${dateLabel(p.publishedAt)}</span><h2>${escapeHtml(p.title)}</h2>${p.imageData ? `<img class="article-modal-image" src="${p.imageData}" alt="${escapeHtml(p.title)}"/>` : ''}<p>${escapeHtml(p.excerpt || '')}</p><p>${escapeHtml(p.body || 'මේ ලිපියේ full body එක මෙතන පෙන්වයි.')}</p><div class="card-foot"><span class="author">${escapeHtml(p.author || 'PostKinaa writer')}</span><span class="rank-chip">★ ${Number(p.rank || 0).toFixed(1)} reader rating</span></div><button class="button button-accent" style="margin-top:22px" id="suggestBtn">ලිපියේ වැරැද්දක් කියන්න ↗</button>`); $('#suggestBtn').addEventListener('click', () => suggestionForm(p)); }

async function signIn() { const result = await signInWithPopup(auth, new GoogleAuthProvider()); return result.user; }
async function compressImage(file) { if (!file.type.startsWith('image/')) throw new Error('Image file එකක් තෝරන්න.'); if (file.size > 8 * 1024 * 1024) throw new Error('Image එක 8MB ට වඩා අඩු විය යුතුයි.'); const bitmap = await createImageBitmap(file); const max = 1400, scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height)); const canvas = document.createElement('canvas'); canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale); canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height); let data = canvas.toDataURL('image/webp', .7); if (data.length > 600000) data = canvas.toDataURL('image/jpeg', .52); if (data.length > 720000) throw new Error('Compressed image එක තවම ලොකුයි. පොඩි image එකක් upload කරන්න.'); return data; }

function writerForm() { showModal(`<span class="eyebrow">WRITER STUDIO</span><h2>ඔයාගේ story එක<br/><em>publish කරන්න.</em></h2><p>Google account එකෙන් sign in වෙලා post එක submit කරන්න. Submit කළාම post එක public feed එකට යනවා.</p><button class="button button-dark" id="googleLogin">Google සමඟ sign in ↗</button><div id="writerStatus" class="form-note"></div><form class="form-grid" id="postForm"><label>Post title<input name="title" required placeholder="ඔයාගේ post එකේ title එක"/></label><label>Category<input name="category" required placeholder="ජීවිතය / සමාජය / තාක්ෂණය"/></label><label>Caption / excerpt<textarea name="excerpt" required maxlength="240" placeholder="Home feed එකේ පෙන්වන කෙටි විස්තරය"></textarea></label><label>Full article<textarea name="body" required placeholder="ඔයාගේ සම්පූර්ණ ලිපිය..."></textarea></label><label>Cover image<input name="image" type="file" accept="image/*"/><small>Firestore එකට යන්න කලින් browser එකේ compress වෙනවා. Firebase Storage භාවිතා නොකරයි.</small></label><button class="button button-accent" type="submit">Publish post ↗</button></form>`); let currentUser = null; $('#googleLogin').addEventListener('click', async () => { try { currentUser = await signIn(); $('#writerStatus').textContent = `Signed in as ${currentUser.email}`; $('#googleLogin').textContent = 'Signed in ✓'; } catch (error) { $('#writerStatus').textContent = error.message; } }); $('#postForm').addEventListener('submit', async (e) => { e.preventDefault(); if (!currentUser) { $('#writerStatus').textContent = 'Post submit කරන්න කලින් Google sign in වෙන්න.'; return; } const data = Object.fromEntries(new FormData(e.target)); try { $('#writerStatus').textContent = 'Image compress කරමින් සහ publish කරමින්...'; const imageData = data.image?.size ? await compressImage(data.image) : ''; await addDoc(collection(db, 'posts'), {title:data.title, category:data.category, excerpt:data.excerpt, body:data.body, imageData, author:currentUser.displayName || currentUser.email.split('@')[0], authorEmail:currentUser.email, authorId:currentUser.uid, status:'published', rank:0, views:0, publishedAt:serverTimestamp(), createdAt:serverTimestamp()}); showModal('<span class="eyebrow">PUBLISHED</span><h2>Post එක live ✳</h2><p>ඔයාගේ post එක දැන් public feed එකේ පෙන්වනවා.</p>'); await loadFirebasePosts(); } catch (error) { $('#writerStatus').textContent = error.message; } }); }

function suggestionForm(p) { showModal(`<span class="eyebrow">HELP US KEEP IT CLEAN</span><h2>මේ ලිපිය ගැන කියන්න</h2><p>ඔයාට පේන issue එක writer සහ admin දෙන්නටම යවන්න.</p><form class="form-grid" id="suggestionForm"><label>Email (optional)<input name="email" type="email" placeholder="you@example.com"/></label><label>Suggestion<textarea name="message" required placeholder="වැරැද්ද / suggestion එක මෙතන ලියන්න..."></textarea></label><button class="button button-accent">Send suggestion ↗</button></form>`); $('#suggestionForm').addEventListener('submit', async (e) => { e.preventDefault(); const data = Object.fromEntries(new FormData(e.target)); await addDoc(collection(db, 'suggestions'), {postId:p.id, ...data, createdAt:serverTimestamp(), status:'new'}); showModal('<span class="eyebrow">SENT</span><h2>ස්තුතියි ✳</h2><p>ඔයාගේ suggestion එක writer සහ admin වෙත යැව්වා.</p>'); }); }

async function loadFirebasePosts() { try { const snap = await getDocs(query(collection(db, 'posts'), where('status', '==', 'published'), limit(50))); posts = snap.docs.map((d) => ({id:d.id, ...d.data()})).sort((a,b) => asDate(b.publishedAt) - asDate(a.publishedAt)); renderPosts(); renderRanking(); } catch (error) { articleGrid.innerHTML = '<div class="empty-state">Firestore connect වෙන්න බැරි වුණා. Firebase rules සහ config පරීක්ෂා කරන්න.</div>'; console.error(error); } }

document.querySelectorAll('.sort').forEach((btn) => btn.addEventListener('click', () => { document.querySelectorAll('.sort').forEach((b) => b.classList.remove('active')); btn.classList.add('active'); sortMode = btn.dataset.sort; renderPosts(); }));
$('#searchInput').addEventListener('input', renderPosts); $('#searchFocus').addEventListener('click', () => $('#searchInput').focus()); $('#modalClose').addEventListener('click', closeModal); $('#modalBackdrop').addEventListener('click', (e) => { if (e.target.id === 'modalBackdrop') closeModal(); }); ['#writerLogin','#heroWriter','#joinWriter'].forEach((s) => $(s).addEventListener('click', writerForm));
document.querySelectorAll('.topic').forEach((btn) => btn.addEventListener('click', () => { document.querySelectorAll('.topic').forEach((b) => b.classList.remove('active')); btn.classList.add('active'); const val = btn.textContent.trim(); $('#searchInput').value = val === 'සියල්ල' ? '' : val; renderPosts(); }));
loadFirebasePosts();
