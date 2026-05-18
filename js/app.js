import firebaseConfig from './firebase-config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Leaflet Map Instance
let map = null;

document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const contentGrid = document.getElementById('content-grid');
    const navItems = document.querySelectorAll('.nav-item');
    
    const postModal = document.getElementById('post-modal');
    const postTrigger = document.getElementById('post-trigger');
    const closePostModal = document.querySelector('.close-post-modal');
    
    const videoModal = document.getElementById('video-modal');
    const closeModal = document.querySelector('.close-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalDescription = document.getElementById('modal-description');
    const journeyMapContainer = document.getElementById('journey-map');

    const demoInfoModal = document.getElementById('demo-info-modal');
    const demoInfoTrigger = document.getElementById('demo-info-trigger');
    const closeDemoModals = document.querySelectorAll('.close-demo-modal');

    let currentView = 'feed';
    let myPostIds = JSON.parse(localStorage.getItem('myPostIds') || '[]');

    // --- Demo Info Modal Logic ---
    if (!localStorage.getItem('demoShown')) {
        setTimeout(() => {
            demoInfoModal.style.display = 'block';
            localStorage.setItem('demoShown', 'true');
        }, 1000);
    }
    demoInfoTrigger.onclick = () => demoInfoModal.style.display = 'block';
    closeDemoModals.forEach(btn => {
        btn.onclick = () => demoInfoModal.style.display = 'none';
    });

    renderContent();

    // --- Content Rendering ---
    async function renderContent() {
        contentGrid.innerHTML = '';
        let posts = [];
        let localSamples = [];

        try {
            const res = await fetch('data/trips.json');
            localSamples = await res.json();
        } catch (e) { console.error("Local data load failed", e); }

        if (currentView === 'mypage') {
            const profileHeader = document.createElement('div');
            profileHeader.className = 'profile-header container reveal';
            profileHeader.style.gridColumn = '1 / -1'; // Grid全体に広げる
            profileHeader.innerHTML = `
                <div class="profile-avatar-large">ME</div>
                <div class="profile-info">
                    <h2>あなたの投稿一覧</h2>
                    <p style="color:#8e8e93;">このブラウザで投稿した内容が表示されます。</p>
                </div>
            `;
            contentGrid.appendChild(profileHeader);
        }

        const gridContainer = document.createElement('div');
        gridContainer.className = 'vlog-grid container';
        gridContainer.style.gridColumn = '1 / -1';
        contentGrid.appendChild(gridContainer);
        gridContainer.innerHTML = '<p style="text-align:center; padding:2rem; color:#8e8e93;">読み込み中...</p>';

        try {
            const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((doc) => {
                posts.push({id: doc.id, ...doc.data()});
            });
        } catch (e) {
            console.warn("Firestore access failed.");
        }

        const allPosts = [...posts, ...localSamples];
        let displayPosts = [];

        if (currentView === 'feed') {
            displayPosts = allPosts;
        } else if (currentView === 'mypage') {
            displayPosts = allPosts.filter(p => myPostIds.includes(p.id));
        }

        gridContainer.innerHTML = '';
        if (displayPosts.length === 0) {
            gridContainer.innerHTML = `<p style="text-align:center; padding:5rem; color:#8e8e93;">${currentView === 'mypage' ? 'まだ自分の投稿がありません。' : '投稿がありません。'}</p>`;
        }

        displayPosts.forEach(item => {
            const card = document.createElement('div');
            card.className = 'vlog-card reveal';
            card.innerHTML = `
                <div class="card-header">
                    <div class="user-avatar">${(item.userName || "??").substring(0,1).toUpperCase()}</div>
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
            gridContainer.appendChild(card);
        });
        setTimeout(initRevealAnimations, 100);
    }

    // --- Post Submission ---
    document.getElementById('submit-post-btn').onclick = async () => {
        const userName = document.getElementById('post-user-name').value || "ゲスト";
        const title = document.getElementById('post-title').value;
        const location = document.getElementById('post-location').value;
        const thumbnail = document.getElementById('post-thumbnail').value;
        const description = document.getElementById('post-description').value;

        if (!title || !location || !thumbnail) {
            alert("タイトル、場所、画像URLは必須です。");
            return;
        }

        const newPost = {
            userName: userName,
            title: title,
            location: location,
            thumbnail: thumbnail,
            description: description,
            date: new Date().toLocaleDateString(),
            createdAt: new Date(),
            timeline: [{
                time: "NOW",
                location: location,
                event: "Memory",
                mood: "ワクワク",
                text: description,
                image: thumbnail
            }]
        };

        try {
            const docRef = await addDoc(collection(db, "posts"), newPost);
            myPostIds.push(docRef.id);
            localStorage.setItem('myPostIds', JSON.stringify(myPostIds));
            postModal.style.display = 'none';
            alert("投稿しました！");
            renderContent();
        } catch (e) {
            console.error("Error adding document: ", e);
            alert("投稿に失敗しました。Firebaseの設定を確認してください。");
        }
    };

    // --- Journey Map Logic ---
    function initMap(timeline) {
        if (map) map.remove();
        const validCoords = timeline.filter(item => item.coords).map(item => item.coords);
        if (validCoords.length === 0) {
            journeyMapContainer.style.display = 'none';
            return;
        }
        journeyMapContainer.style.display = 'block';
        map = L.map('journey-map', { zoomControl: false, attributionControl: false }).setView(validCoords[0], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
        const latlngs = [];
        validCoords.forEach((coord, index) => {
            L.marker(coord).addTo(map);
            latlngs.push(coord);
        });
        if (latlngs.length > 1) {
            L.polyline(latlngs, {color: '#ffffff', weight: 3, dashArray: '5, 10'}).addTo(map);
            map.fitBounds(L.polyline(latlngs).getBounds(), {padding: [30, 30]});
        }
    }

    // --- Modal Logic ---
    function openTripModal(trip) {
        modalTitle.textContent = trip.title;
        setTimeout(() => {
            initMap(trip.timeline || []);
            // PCで見やすくなるように地図の表示をリフレッシュ
            if (map) map.invalidateSize();
        }, 300);

        let timelineHtml = `<div class="timeline-container">`;
        if (trip.timeline && trip.timeline.length > 0) {
            trip.timeline.forEach(item => {
                timelineHtml += `
                    <div class="timeline-item reveal">
                        <span class="timeline-time-label">${item.time} @ ${item.location}</span>
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
        }
        timelineHtml += `</div>`;
        modalDescription.innerHTML = timelineHtml;
        videoModal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        setTimeout(initRevealAnimations, 100);
    }

    // --- Event Listeners ---
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            currentView = item.getAttribute('data-view');
            renderContent();
        });
    });

    postTrigger.onclick = () => {
        postModal.style.display = 'block';
    };

    [closePostModal, closeModal].forEach(btn => {
        if(btn) btn.onclick = () => {
            postModal.style.display = 'none';
            videoModal.style.display = 'none';
            document.body.style.overflow = 'auto';
        };
    });

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
