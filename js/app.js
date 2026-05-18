import firebaseConfig from './firebase-config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Leaflet Map Instance
let map = null;

document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const contentGrid = document.getElementById('content-grid');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const navItems = document.querySelectorAll('.nav-item');
    const authStatus = document.getElementById('auth-status');
    
    const authModal = document.getElementById('auth-modal');
    const closeAuthModal = document.querySelector('.close-auth-modal');
    
    const postModal = document.getElementById('post-modal');
    const closePostModal = document.querySelector('.close-post-modal');
    
    const videoModal = document.getElementById('video-modal');
    const closeModal = document.querySelector('.close-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalDescription = document.getElementById('modal-description');
    const journeyMapContainer = document.getElementById('journey-map');

    let currentView = 'feed';
    let currentUser = null;

    // --- Auth State Logic ---
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        if (user) {
            const userName = user.email.split('@')[0];
            authStatus.innerHTML = `
                <div class="user-badge">${userName}</div>
                <button id="logout-btn" class="btn-text">ログアウト</button>
            `;
            document.getElementById('logout-btn').onclick = () => signOut(auth);
        } else {
            authStatus.innerHTML = `<button id="login-trigger" class="btn-text">ログイン</button>`;
            document.getElementById('login-trigger').onclick = () => authModal.style.display = 'block';
        }
        renderContent();
    });

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
            if (!currentUser) {
                contentGrid.innerHTML = '<p style="text-align:center; padding:5rem; color:#8e8e93;">ログインして自分の記録を残そう。</p>';
                return;
            }
            
            const profileHeader = document.createElement('div');
            profileHeader.className = 'profile-header container reveal';
            const userName = currentUser.email.split('@')[0];
            profileHeader.innerHTML = `
                <div class="profile-avatar-large">${userName.substring(0,1).toUpperCase()}</div>
                <div class="profile-info">
                    <h2>${userName}</h2>
                    <div class="profile-stats">
                        <div class="stat-item"><span class="stat-value" id="post-count">-</span><span class="stat-label">Posts</span></div>
                        <div class="stat-item"><span class="stat-value">0</span><span class="stat-label">Following</span></div>
                        <div class="stat-item"><span class="stat-value">0</span><span class="stat-label">Followers</span></div>
                    </div>
                </div>
            `;
            contentGrid.appendChild(profileHeader);
        }

        const gridContainer = document.createElement('div');
        gridContainer.className = 'vlog-grid container';
        contentGrid.appendChild(gridContainer);
        gridContainer.innerHTML = '<p style="text-align:center; padding:2rem; color:#8e8e93;">読み込み中...</p>';

        try {
            if (currentView === 'feed') {
                try {
                    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
                    const querySnapshot = await getDocs(q);
                    querySnapshot.forEach((doc) => posts.push({id: doc.id, ...doc.data()}));
                } catch (e) {
                    console.warn("Firestore access failed.");
                }
                posts = [...posts, ...localSamples];
            } else if (currentView === 'mypage') {
                const q = query(collection(db, "posts"), where("userId", "==", currentUser.uid), orderBy("createdAt", "desc"));
                const querySnapshot = await getDocs(q);
                querySnapshot.forEach((doc) => posts.push({id: doc.id, ...doc.data()}));
                const postCountEl = document.getElementById('post-count');
                if (postCountEl) postCountEl.textContent = posts.length;
            }
        } catch (e) {
            console.error("Error fetching posts:", e);
        }

        gridContainer.innerHTML = '';
        posts.forEach(item => {
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

    // --- Journey Map Logic ---
    function initMap(timeline) {
        // Reset map if exists
        if (map) {
            map.remove();
        }

        const validCoords = timeline.filter(item => item.coords).map(item => item.coords);
        
        if (validCoords.length === 0) {
            journeyMapContainer.style.display = 'none';
            return;
        }

        journeyMapContainer.style.display = 'block';
        
        // Use the first coordinate as center
        map = L.map('journey-map', {
            zoomControl: false,
            attributionControl: false
        }).setView(validCoords[0], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

        // Add Markers and draw line
        const latlngs = [];
        validCoords.forEach((coord, index) => {
            L.marker(coord).addTo(map)
                .bindPopup(`<b>${timeline[index].location}</b><br>${timeline[index].time}`);
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
        
        // Init Map
        setTimeout(() => initMap(trip.timeline || []), 100);

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
            if (item.id === 'post-trigger') {
                if (!currentUser) { authModal.style.display = 'block'; }
                else { postModal.style.display = 'block'; }
                return;
            }
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            currentView = item.getAttribute('data-view');
            renderContent();
        });
    });

    closeModal.addEventListener('click', () => {
        videoModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    });

    // Close other modals and auth form toggles (same as before)
    [closeAuthModal, closePostModal].forEach(btn => {
        if(btn) btn.onclick = () => {
            authModal.style.display = 'none';
            postModal.style.display = 'none';
            document.body.style.overflow = 'auto';
        };
    });

    document.getElementById('to-signup').onclick = (e) => {
        e.preventDefault();
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('signup-form').style.display = 'block';
    };
    document.getElementById('to-login').onclick = (e) => {
        e.preventDefault();
        document.getElementById('login-form').style.display = 'block';
        document.getElementById('signup-form').style.display = 'none';
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
