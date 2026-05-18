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
    
    // PC & Mobile triggers
    const postTriggers = [document.getElementById('post-trigger'), document.getElementById('mobile-post-trigger')];
    const infoTriggers = [document.getElementById('demo-info-trigger'), document.getElementById('mobile-info-trigger')];
    
    const postModal = document.getElementById('post-modal');
    const closePostModal = document.querySelector('.close-post-modal');
    
    const videoModal = document.getElementById('video-modal');
    const closeModal = document.querySelector('.close-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalDescription = document.getElementById('modal-description');
    const journeyMapContainer = document.getElementById('journey-map');
    const pulseGraphBody = document.getElementById('pulse-graph');

    const demoInfoModal = document.getElementById('demo-info-modal');
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
    infoTriggers.forEach(btn => {
        if(btn) btn.onclick = () => demoInfoModal.style.display = 'block';
    });
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
            profileHeader.style.gridColumn = '1 / -1';
            profileHeader.innerHTML = `
                <div class="profile-avatar-large">ME</div>
                <div class="profile-info">
                    <h2>YOUR MEMORIES</h2>
                    <p style="color:#8e8e93;">Saved locally on this device.</p>
                </div>
            `;
            contentGrid.appendChild(profileHeader);
        }

        const gridContainer = document.createElement('div');
        gridContainer.className = 'vlog-grid container';
        gridContainer.style.gridColumn = '1 / -1';
        contentGrid.appendChild(gridContainer);
        gridContainer.innerHTML = '<p style="text-align:center; padding:2rem; color:#8e8e93;">Loading...</p>';

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
                        <span class="location-tag">${item.location}</span>
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

    // --- Mood Pulse Logic ---
    function initMoodPulse(timeline) {
        pulseGraphBody.innerHTML = '';
        if (!timeline || timeline.length === 0) return;

        // Mood values mapping
        const moodMap = {
            "ワクワク": 100, "感動": 90, "しあわせ": 85, "おいしい": 80,
            "のんびり": 60, "リラックス": 55, "おつかれ": 30
        };

        timeline.forEach(item => {
            const height = moodMap[item.mood] || 50;
            const color = height > 70 ? '#ff8a65' : '#444';
            const bar = document.createElement('div');
            bar.className = 'pulse-bar';
            bar.style.height = '0%';
            bar.style.background = color;
            pulseGraphBody.appendChild(bar);
            
            // Animation trigger
            setTimeout(() => {
                bar.style.height = `${height}%`;
            }, 300);
        });
    }

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
            initMoodPulse(trip.timeline || []);
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
            // Update all nav items (PC & Mobile)
            navItems.forEach(i => {
                if(i.getAttribute('data-view') === item.getAttribute('data-view')) {
                    i.classList.add('active');
                } else {
                    i.classList.remove('active');
                }
            });
            currentView = item.getAttribute('data-view');
            renderContent();
        });
    });

    postTriggers.forEach(btn => {
        if(btn) btn.onclick = () => postModal.style.display = 'block';
    });

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
