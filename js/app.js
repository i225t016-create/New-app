import firebaseConfig from './firebase-config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const contentGrid = document.getElementById('content-grid');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const navItems = document.querySelectorAll('.nav-item');
    const authStatus = document.getElementById('auth-status');
    
    const authModal = document.getElementById('auth-modal');
    const loginTrigger = document.getElementById('login-trigger');
    const closeAuthModal = document.querySelector('.close-auth-modal');
    
    const postModal = document.getElementById('post-modal');
    const postTrigger = document.getElementById('post-trigger');
    const closePostModal = document.querySelector('.close-post-modal');
    
    const videoModal = document.getElementById('video-modal');
    const closeModal = document.querySelector('.close-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalDescription = document.getElementById('modal-description');

    let currentView = 'feed';
    let currentUser = null;

    // --- Auth State Logic ---
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        if (user) {
            authStatus.innerHTML = `<span class="user-name">Hello, ${user.email.split('@')[0]}</span> | <button id="logout-btn" class="btn-text">ログアウト</button>`;
            document.getElementById('logout-btn').onclick = () => signOut(auth);
        } else {
            authStatus.innerHTML = `<button id="login-trigger" class="btn-text">ログイン</button>`;
            document.getElementById('login-trigger').onclick = () => authModal.style.display = 'block';
        }
        renderContent();
    });

    // --- Content Rendering ---
    async function renderContent() {
        contentGrid.innerHTML = '<p style="text-align:center; padding:2rem;">読み込み中...</p>';
        let posts = [];

        try {
            if (currentView === 'feed') {
                const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
                const querySnapshot = await getDocs(q);
                querySnapshot.forEach((doc) => posts.push({id: doc.id, ...doc.data()}));
            } else if (currentView === 'mypage') {
                if (!currentUser) {
                    contentGrid.innerHTML = '<p style="text-align:center; padding:2rem;">ログインすると自分の投稿が見れるよ！</p>';
                    return;
                }
                const q = query(collection(db, "posts"), where("userId", "==", currentUser.uid), orderBy("createdAt", "desc"));
                const querySnapshot = await getDocs(q);
                querySnapshot.forEach((doc) => posts.push({id: doc.id, ...doc.data()}));
            }
        } catch (e) {
            console.error("Error fetching posts:", e);
            contentGrid.innerHTML = '<p style="text-align:center; padding:2rem;">データの取得に失敗しました。Firebaseの設定を確認してね。</p>';
            return;
        }

        contentGrid.innerHTML = '';
        if (posts.length === 0) {
            contentGrid.innerHTML = '<p style="text-align:center; padding:2rem;">まだ投稿がありません。</p>';
        }

        posts.forEach(item => {
            const card = document.createElement('div');
            card.className = 'vlog-card reveal';
            card.innerHTML = `
                <div class="card-header">
                    <div class="user-avatar">${(item.userName || "??").substring(0,2).toUpperCase()}</div>
                    <div class="card-user-info">
                        <h3>${item.userName || "Guest"}</h3>
                        <span>${item.date || "TODAY"}</span>
                    </div>
                </div>
                <div class="card-thumbnail">
                    <img src="${item.thumbnail}" alt="${item.title}">
                    <div class="card-overlay-info">
                        <span class="location-tag">📍 ${item.location}</span>
                    </div>
                </div>
                <div class="card-content">
                    <p>${item.title}</p>
                </div>
            `;
            card.addEventListener('click', () => openTripModal(item));
            contentGrid.appendChild(card);
        });
        setTimeout(initRevealAnimations, 100);
    }

    // --- Post Submission ---
    document.getElementById('submit-post-btn').onclick = async () => {
        if (!currentUser) { alert("ログインが必要です"); return; }
        
        const newPost = {
            userId: currentUser.uid,
            userName: currentUser.email.split('@')[0],
            title: document.getElementById('post-title').value,
            location: document.getElementById('post-location').value,
            thumbnail: document.getElementById('post-thumbnail').value,
            description: document.getElementById('post-description').value,
            date: new Date().toLocaleDateString(),
            createdAt: new Date(),
            timeline: [{
                time: document.getElementById('tl-time-1').value,
                event: document.getElementById('tl-event-1').value,
                mood: document.getElementById('tl-mood-1').value,
                text: document.getElementById('tl-text-1').value,
                image: document.getElementById('post-thumbnail').value // 簡易化のためサムネイルと同じに
            }]
        };

        try {
            await addDoc(collection(db, "posts"), newPost);
            postModal.style.display = 'none';
            alert("投稿しました！");
            renderContent();
        } catch (e) {
            console.error("Error adding document: ", e);
            alert("投稿に失敗しました。Firebaseの権限設定を確認してください。");
        }
    };

    // --- Modal Logic ---
    function openTripModal(trip) {
        modalTitle.textContent = trip.title;
        let timelineHtml = `<div class="timeline-container">`;
        trip.timeline.forEach(item => {
            timelineHtml += `
                <div class="timeline-item reveal">
                    <span class="timeline-time-label">${item.time}</span>
                    <div class="timeline-card">
                        ${item.image ? `<img src="${item.image}" class="timeline-image">` : ''}
                        <div class="timeline-detail">
                            <span class="timeline-mood-tag">${item.mood}</span>
                            <h4>${item.event}</h4>
                            <p>${item.text}</p>
                        </div>
                    </div>
                </div>
            `;
        });
        timelineHtml += `</div>`;
        modalDescription.innerHTML = timelineHtml;
        videoModal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        setTimeout(initRevealAnimations, 100);
    }

    // --- Event Listeners ---
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            if (item.id === 'post-trigger') {
                if (!currentUser) { alert("ログインしてね！"); authModal.style.display = 'block'; }
                else { postModal.style.display = 'block'; }
                return;
            }
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            currentView = item.getAttribute('data-view');
            renderContent();
        });
    });

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentView = btn.getAttribute('data-tab');
            renderContent();
        });
    });

    // Close modals
    [closeAuthModal, closePostModal, closeModal].forEach(btn => {
        if(btn) btn.onclick = () => {
            authModal.style.display = 'none';
            postModal.style.display = 'none';
            videoModal.style.display = 'none';
            document.body.style.overflow = 'auto';
        };
    });

    // Auth Form Toggle
    document.getElementById('to-signup').onclick = () => {
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('signup-form').style.display = 'block';
    };
    document.getElementById('to-login').onclick = () => {
        document.getElementById('login-form').style.display = 'block';
        document.getElementById('signup-form').style.display = 'none';
    };

    // Login/Signup Actions
    document.getElementById('login-btn').onclick = () => {
        const email = document.getElementById('login-email').value;
        const pass = document.getElementById('login-password').value;
        signInWithEmailAndPassword(auth, email, pass).then(() => authModal.style.display = 'none').catch(e => alert(e.message));
    };
    document.getElementById('signup-btn').onclick = () => {
        const email = document.getElementById('signup-email').value;
        const pass = document.getElementById('signup-password').value;
        createUserWithEmailAndPassword(auth, email, pass).then(() => authModal.style.display = 'none').catch(e => alert(e.message));
    };

    function initRevealAnimations() {
        const reveals = document.querySelectorAll('.reveal');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) entry.target.classList.add('active');
            });
        }, { threshold: 0.1 });
        reveals.forEach(reveal => observer.observe(reveal));
    }
});
