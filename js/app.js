document.addEventListener('DOMContentLoaded', () => {
    const contentGrid = document.getElementById('content-grid');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const modal = document.getElementById('video-modal');
    const modalContent = document.querySelector('.modal-content');
    const closeModal = document.querySelector('.close-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalDescription = document.getElementById('modal-description');

    let vlogsData = [];
    let tripsData = [];
    let currentTab = 'trip'; // デフォルトを旅ログに

    // 初期タブの設定
    document.querySelector('[data-tab="trip"]').classList.add('active');
    document.querySelector('[data-tab="vlog"]').classList.remove('active');

    // Fetch All Data
    Promise.all([
        fetch('data/vlogs.json').then(res => res.json()),
        fetch('data/trips.json').then(res => res.json())
    ]).then(([vlogs, trips]) => {
        vlogsData = vlogs;
        tripsData = trips;
        renderContent();
    }).catch(error => console.error('Error loading data:', error));

    function renderContent() {
        contentGrid.innerHTML = '';
        const dataToRender = currentTab === 'vlog' ? vlogsData : tripsData;

        dataToRender.forEach(item => {
            const card = document.createElement('div');
            card.className = 'vlog-card reveal';
            
            const dateStr = item.date || "TODAY";
            const locationStr = item.location || "Somewhere";

            card.innerHTML = `
                <div class="card-header">
                    <div class="user-avatar">ME</div>
                    <div class="card-user-info">
                        <h3>My Memory</h3>
                        <span>${dateStr}</span>
                    </div>
                </div>
                <div class="card-thumbnail">
                    <img src="${item.thumbnail}" alt="${item.title}">
                    <div class="card-overlay-info">
                        <span class="location-tag">📍 ${locationStr}</span>
                    </div>
                </div>
                <div class="card-content">
                    <p>${item.title}</p>
                </div>
            `;
            
            if (currentTab === 'vlog') {
                card.addEventListener('click', () => openVideoModal(item));
            } else {
                card.addEventListener('click', () => openTripModal(item));
            }
            contentGrid.appendChild(card);
        });
        
        setTimeout(initRevealAnimations, 100);
    }

    // Tab Switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTab = btn.getAttribute('data-tab');
            renderContent();
        });
    });

    function openVideoModal(vlog) {
        // シンプルにするため、動画もタイムライン風の全画面表示に
        modalTitle.textContent = vlog.title;
        modalDescription.innerHTML = `
            <div style="width:100%; aspect-ratio:16/9; margin-bottom:2rem;">
                <iframe src="${vlog.videoUrl}" style="width:100%; height:100%; border-radius:15px;" frameborder="0" allowfullscreen></iframe>
            </div>
            <p style="padding:0 1rem;">${vlog.description}</p>
        `;
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    function openTripModal(trip) {
        modalTitle.textContent = trip.title;
        let timelineHtml = `<div class="timeline-container">`;
        trip.timeline.forEach(item => {
            timelineHtml += `
                <div class="timeline-item reveal">
                    <span class="timeline-time-label">${item.time} @ ${item.location || ''}</span>
                    <div class="timeline-card">
                        <img src="${item.image}" class="timeline-image">
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
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        setTimeout(initRevealAnimations, 100);
    }

    closeModal.addEventListener('click', () => {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
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
