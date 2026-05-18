import firebaseConfig from './firebase-config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Leaflet Map Instance
let map = null;

document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const contentGrid = document.getElementById('content-grid');
    const navItems = document.querySelectorAll('.nav-item');
    const postTrigger = document.getElementById('post-trigger');
    const postModal = document.getElementById('post-modal');
    const closePostModal = document.querySelector('.close-post-modal');
    
    // Success Modal
    const successModal = document.getElementById('success-modal');
    const closeSuccessBtn = document.querySelector('.close-success-btn');

    // Image Upload Elements
    const imageDropZone = document.getElementById('image-drop-zone');
    const fileInput = document.getElementById('post-file-input');
    const imagePreview = document.getElementById('image-preview');
    const uploadPlaceholder = document.querySelector('.upload-placeholder');
    let selectedImageData = null;

    const videoModal = document.getElementById('video-modal');
    const closeModal = document.querySelector('.close-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalDescription = document.getElementById('modal-description');
    const journeyMapContainer = document.getElementById('journey-map');
    const pulseGraphBody = document.getElementById('pulse-graph');

    const userProfileModal = document.getElementById('user-profile-modal');
    const profileDetailContainer = document.getElementById('profile-detail-container');
    const closeUserModal = document.querySelector('.close-user-modal');

    const demoInfoModal = document.getElementById('demo-info-modal');
    const demoInfoTrigger = document.getElementById('demo-info-trigger');
    const closeDemoModals = document.querySelectorAll('.close-demo-modal');

    let currentView = 'feed';
    let myPostIds = JSON.parse(localStorage.getItem('myPostIds') || '[]');
    let allFetchedPosts = [];

    // --- Demo Info Logic ---
    if (!localStorage.getItem('demoShown')) {
        setTimeout(() => { demoInfoModal.style.display = 'block'; localStorage.setItem('demoShown', 'true'); }, 1000);
    }
    demoInfoTrigger.onclick = () => demoInfoModal.style.display = 'block';
    closeDemoModals.forEach(btn => btn.onclick = () => demoInfoModal.style.display = 'none');

    renderContent();

    // --- Content Rendering ---
    async function renderContent() {
        contentGrid.innerHTML = '';
        let posts = [];
        let localSamples = [];

        try {
            const res = await fetch('data/trips.json');
            localSamples = await res.json();
        } catch (e) { console.error("Local load failed", e); }

        if (currentView === 'mypage') {
            const header = document.createElement('div');
            header.className = 'profile-header container reveal';
            header.style.gridColumn = '1 / -1';
            header.innerHTML = `<div class="profile-avatar-large">ME</div><div class="profile-info"><h2>MY LIBRARY</h2><p style="color:#8e8e93;">あなたが記録した大切な思い出たち</p></div>`;
            contentGrid.appendChild(header);
        }

        const grid = document.createElement('div');
        grid.className = 'vlog-grid container';
        grid.style.gridColumn = '1 / -1';
        contentGrid.appendChild(grid);
        grid.innerHTML = '<p style="text-align:center; padding:2rem; color:#444;">Loading...</p>';

        try {
            const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
            const snap = await getDocs(q);
            snap.forEach(doc => posts.push({id: doc.id, ...doc.data()}));
        } catch (e) { console.warn("Firestore unavailable"); }

        allFetchedPosts = [...posts, ...localSamples];
        const displayPosts = currentView === 'feed' ? allFetchedPosts : allFetchedPosts.filter(p => myPostIds.includes(p.id));

        grid.innerHTML = displayPosts.length === 0 ? `<p style="text-align:center; padding:5rem; color:#444;">No logs found.</p>` : '';

        displayPosts.forEach(item => {
            const card = document.createElement('div');
            card.className = 'vlog-card reveal';
            card.innerHTML = `
                <div class="card-header">
                    <div class="user-avatar" data-user="${item.userName}">${(item.userName || "?").substring(0,1).toUpperCase()}</div>
                    <div class="card-user-info">
                        <h3>${item.userName || "Guest"}</h3>
                        <span>${item.date || "TODAY"}</span>
                    </div>
                </div>
                <div class="card-thumbnail"><img src="${item.thumbnail}">
                    <div class="card-overlay-info"><span class="location-tag">${item.location}</span></div>
                </div>
                <div class="card-content"><p>${item.title}</p></div>
            `;
            card.querySelector('.user-avatar').addEventListener('click', (e) => { e.stopPropagation(); openUserProfile(item.userName); });
            card.addEventListener('click', () => openTripModal(item));
            grid.appendChild(card);
        });
        setTimeout(initRevealAnimations, 100);
    }

    // --- Image Upload Handling ---
    imageDropZone.onclick = () => fileInput.click();
    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                selectedImageData = event.target.result;
                imagePreview.src = selectedImageData;
                imagePreview.style.display = 'block';
                uploadPlaceholder.style.display = 'none';
            };
            reader.readAsDataURL(file);
        }
    };

    // --- Post Submission ---
    document.getElementById('submit-post-btn').onclick = async () => {
        const name = document.getElementById('post-user-name').value;
        const title = document.getElementById('post-title').value;
        const loc = document.getElementById('post-location').value;
        const desc = document.getElementById('post-description').value;

        if (!title || !loc || !selectedImageData) { alert("写真、タイトル、場所を入力してください"); return; }

        const newPost = {
            userName: name || "Guest", title, location: loc, thumbnail: selectedImageData, description: desc,
            date: new Date().toLocaleDateString(), createdAt: new Date(),
            timeline: [{ time: "NOW", location: loc, event: "Memory", mood: "ワクワク", text: desc, image: selectedImageData }]
        };

        try {
            const docRef = await addDoc(collection(db, "posts"), newPost);
            myPostIds.push(docRef.id);
            localStorage.setItem('myPostIds', JSON.stringify(myPostIds));
            
            // UI Reset
            postModal.style.display = 'none';
            resetPostForm();
            
            // Show Success Animation
            successModal.style.display = 'block';
            renderContent();
        } catch (e) { alert("投稿に失敗しました。"); }
    };

    function resetPostForm() {
        document.getElementById('post-user-name').value = '';
        document.getElementById('post-title').value = '';
        document.getElementById('post-location').value = '';
        document.getElementById('post-description').value = '';
        selectedImageData = null;
        imagePreview.style.display = 'none';
        uploadPlaceholder.style.display = 'flex';
        fileInput.value = '';
    }

    closeSuccessBtn.onclick = () => { successModal.style.display = 'none'; };

    // --- User Profile Logic ---
    function openUserProfile(userName) {
        const userPosts = allFetchedPosts.filter(p => p.userName === userName);
        profileDetailContainer.innerHTML = `
            <div class="profile-header" style="border:none;">
                <div class="profile-avatar-large">${(userName || "?").substring(0,1).toUpperCase()}</div>
                <h2>${userName}</h2>
                <p style="color:#8e8e93; margin-top:0.5rem;">Total Logs: ${userPosts.length}</p>
            </div>
            <div class="vlog-grid container" style="padding:0 2rem;">
                ${userPosts.map(p => `
                    <div class="vlog-card" style="pointer-events:none;">
                        <div class="card-thumbnail"><img src="${p.thumbnail}"></div>
                        <div class="card-content"><h3>${p.title}</h3><small>${p.date}</small></div>
                    </div>
                `).join('')}
            </div>
        `;
        userProfileModal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    // --- Journey Map & Mood Pulse Logic (Same as before) ---
    function initMap(timeline) {
        if (map) map.remove();
        const coords = timeline.filter(i => i.coords).map(i => i.coords);
        if (coords.length === 0) { journeyMapContainer.style.display = 'none'; return; }
        journeyMapContainer.style.display = 'block';
        map = L.map('journey-map', { zoomControl: false, attributionControl: false }).setView(coords[0], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
        coords.forEach(c => L.marker(c).addTo(map));
        if (coords.length > 1) { L.polyline(coords, {color: '#fff', weight: 3, dashArray: '5, 10'}).addTo(map); map.fitBounds(L.polyline(coords).getBounds(), {padding: [30, 30]}); }
    }

    function initMoodPulse(timeline) {
        pulseGraphBody.innerHTML = '';
        if (!timeline) return;
        const moodMap = { "ワクワク": 100, "感動": 90, "しあわせ": 85, "おいしい": 80, "のんびり": 60, "リラックス": 55, "おつかれ": 30 };
        timeline.forEach(item => {
            const h = moodMap[item.mood] || 50;
            const bar = document.createElement('div');
            bar.className = 'pulse-bar';
            bar.style.height = '0%';
            bar.style.background = h > 70 ? '#ff8a65' : '#333';
            pulseGraphBody.appendChild(bar);
            setTimeout(() => bar.style.height = `${h}%`, 300);
        });
    }

    function openTripModal(trip) {
        modalTitle.textContent = trip.title;
        setTimeout(() => { initMap(trip.timeline || []); initMoodPulse(trip.timeline || []); if(map) map.invalidateSize(); }, 300);
        modalDescription.innerHTML = `<div class="timeline-container">${(trip.timeline || []).map(i => `
            <div class="timeline-item reveal">
                <span class="timeline-time-label">${i.time} @ ${i.location}</span>
                <div class="timeline-card">
                    ${i.image ? `<img src="${i.image}" class="timeline-image">` : ''}
                    <div class="timeline-detail"><span class="timeline-mood-tag">${i.mood}</span><h4>${i.event}</h4><p>${i.text}</p></div>
                </div>
            </div>`).join('')}</div>`;
        videoModal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        setTimeout(initRevealAnimations, 100);
    }

    // --- Event Listeners ---
    navItems.forEach(btn => btn.addEventListener('click', () => {
        navItems.forEach(i => i.classList.toggle('active', i.getAttribute('data-view') === btn.getAttribute('data-view')));
        currentView = btn.getAttribute('data-view');
        renderContent();
    }));

    postTrigger.onclick = () => postModal.style.display = 'block';
    [closePostModal, closeModal, closeUserModal].forEach(btn => {
        if(btn) btn.onclick = () => {
            postModal.style.display = 'none'; videoModal.style.display = 'none'; userProfileModal.style.display = 'none';
            document.body.style.overflow = 'auto';
        };
    });

    function initRevealAnimations() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('active'); });
        }, { threshold: 0.1 });
        document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    }
});
