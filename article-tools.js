const firebaseConfig = {
  apiKey: 'AIzaSyAK1W4reUyi6kDyPetwqdqtLCnXF0469tc',
  authDomain: 'postkina.firebaseapp.com',
  projectId: 'postkina',
  storageBucket: 'postkina.firebasestorage.app',
  messagingSenderId: '594893100682',
  appId: '1:594893100682:web:799226823a1fee3a447f73'
};

const canonical = document.querySelector('link[rel="canonical"]')?.href || location.href;
const postId = document.querySelector('meta[name="postkina-post-id"]')?.content || canonical.match(/postkina-ai-\d+/)?.[0] || new URL(canonical).searchParams.get('post');
const article = document.querySelector('article');

if (postId && article) {
  const savedKey = 'postkina_saved_posts';
  const ratedKey = 'postkina_rated_posts';
  const savedPosts = new Set(JSON.parse(localStorage.getItem(savedKey) || '[]'));
  const ratedPosts = JSON.parse(localStorage.getItem(ratedKey) || '{}');
  let tools = article.querySelector('.postkina-article-tools');
  if (!tools) {
    tools = document.createElement('section');
    tools.className = 'postkina-article-tools';
    tools.innerHTML = `
      <div class="postkina-save-row"><button type="button" class="postkina-save">Save article ♡</button></div>
      <div class="postkina-rating">
        <strong>Rate this article</strong>
        <span class="postkina-rating-summary">Loading rating…</span>
        <div class="postkina-stars" role="group" aria-label="Rate this article from one to five stars">
          ${[1, 2, 3, 4, 5].map((value) => `<button type="button" data-rating="${value}" aria-label="${value} star${value === 1 ? '' : 's'}">★</button>`).join('')}
        </div>
        <span class="postkina-rating-status" aria-live="polite"></span>
      </div>`;
    const related = article.querySelector('.related');
    if (related) related.before(tools); else article.append(tools);
  }

  const saveButton = tools.querySelector('.postkina-save');
  const updateSaveButton = () => { saveButton.textContent = savedPosts.has(postId) ? 'Saved ✓' : 'Save article ♡'; };
  updateSaveButton();
  saveButton.addEventListener('click', () => {
    if (savedPosts.has(postId)) savedPosts.delete(postId); else savedPosts.add(postId);
    localStorage.setItem(savedKey, JSON.stringify([...savedPosts]));
    updateSaveButton();
  });

  const firebase = Promise.all([
    import('https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js')
  ]).then(([appModule, firestoreModule]) => ({
    ...firestoreModule,
    db: firestoreModule.getFirestore(appModule.initializeApp(firebaseConfig))
  }));

  const stars = [...tools.querySelectorAll('.postkina-stars button')];
  const summary = tools.querySelector('.postkina-rating-summary');
  const status = tools.querySelector('.postkina-rating-status');
  let ratingValues = [];
  const updateRating = () => {
    const average = ratingValues.length ? (ratingValues.reduce((total, value) => total + value, 0) / ratingValues.length).toFixed(1) : '—';
    summary.textContent = `${average} out of 5${ratingValues.length ? ` · ${ratingValues.length} rating${ratingValues.length === 1 ? '' : 's'}` : ' · Be the first to rate'}`;
    const ownRating = Number(ratedPosts[postId] || 0);
    stars.forEach((button) => {
      button.classList.toggle('selected', Number(button.dataset.rating) <= ownRating);
      button.disabled = Boolean(ownRating);
    });
    if (ownRating) status.textContent = `Your rating: ${ownRating} star${ownRating === 1 ? '' : 's'}.`;
  };

  firebase.then(({ db, getDocs, query, collection, where }) => getDocs(query(collection(db, 'ratings'), where('postId', '==', postId)))).then((snapshot) => {
    ratingValues = snapshot.docs.map((document) => Number(document.data().rating)).filter((value) => value >= 1 && value <= 5);
    updateRating();
  }).catch(() => { summary.textContent = 'Rating is temporarily unavailable.'; });

  stars.forEach((button) => button.addEventListener('click', async () => {
    if (ratedPosts[postId]) return;
    const rating = Number(button.dataset.rating);
    stars.forEach((star) => { star.disabled = true; });
    status.textContent = 'Saving your rating…';
    try {
      const { db, addDoc, collection, serverTimestamp } = await firebase;
      await addDoc(collection(db, 'ratings'), {
        postId,
        rating,
        writerId: 'postkina-ai',
        writerName: 'PostKina Editorial',
        createdAt: serverTimestamp()
      });
      ratedPosts[postId] = rating;
      localStorage.setItem(ratedKey, JSON.stringify(ratedPosts));
      ratingValues.push(rating);
      status.textContent = `Thank you — you rated this article ${rating} star${rating === 1 ? '' : 's'}.`;
      updateRating();
    } catch (_) {
      stars.forEach((star) => { star.disabled = false; });
      status.textContent = 'Could not save your rating. Please try again.';
    }
  }));
}
