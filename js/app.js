document.addEventListener('DOMContentLoaded', () => {
    const contentGrid = document.getElementById('content-grid');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const vlogFilters = document.getElementById('vlog-filters');
    const modal = document.getElementById('video-modal');
    const modalContent = document.querySelector('.modal-content');
    const closeModal = document.querySelector('.close-modal');
    const modalIframe = document.getElementById('modal-iframe');
    const modalTitle = document.getElementById('modal-title');
    const modalDescription = document.getElementById('modal-description');

    let vlogsData = [];
    let tripsData = [];
    let currentTab = 'vlog';

    // Fetch All Data
    Promise.all([
        fetch('data/vlogs.json').then(res => res.json()),
        fetch('data/trips.json').then(res => res.json())
    ]).then(([vlogs, trips]) => {
        vlogsData = vlogs;
        tripsData = trips;
        renderContent();
    }).catch(error => console.error('Error loading data:', error));

    // Render Logic
    function renderContent(filteredData = null) {
        contentGrid.innerHTML = '';
        const dataToRender = filteredData || (currentTab === 'vlog' ? vlogsData : tripsData);

        dataToRender.forEach(item => {
            const card = document.createElement('div');
            card.className = 'vlog-card reveal';
            
            if (currentTab === 'vlog') {
                card.innerHTML = `
                    <div class="card-thumbnail">
                        <img src="${item.thumbnail}" alt="${item.title}">
                        <div class="play-overlay">
                            <div class="play-btn-circle">▶</div>
                        </div>
                    </div>
                    <div class="card-content">
                        <span class="card-category">${item.category}</span>
                        <h3>${item.title}</h3>
                        <p>${item.description}</p>
                    </div>
                `;
                card.addEventListener('click', () => openVideoModal(item));
            } else {
                card.innerHTML = `
                    <div class="card-thumbnail">
                        <img src="${item.thumbnail}" alt="${item.title}">
                        <div class="play-overlay">
                            <div class="play-btn-circle">📖</div>
                        </div>
                    </div>
                    <div class="card-content">
                        <span class="card-category">${item.date}</span>
                        <h3>${item.title}</h3>
                        <p>${item.description}</p>
                    </div>
                `;
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
            
            // Show/Hide Vlog Filters
            vlogFilters.style.display = currentTab === 'vlog' ? 'flex' : 'none';
            
            renderContent();
        });
    });

    // Vlog Filter Logic
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const filter = btn.getAttribute('data-filter');
            const filteredVlogs = filter === 'all' 
                ? vlogsData 
                : vlogsData.filter(v => v.category === filter);
            renderContent(filteredVlogs);
        });
    });

    // Modal Logic - Video
    function openVideoModal(vlog) {
        modalContent.className = 'modal-content';
        document.querySelector('.video-container').style.display = 'block';
        modalTitle.textContent = vlog.title;
        modalDescription.textContent = vlog.description;
        modalIframe.src = vlog.videoUrl;
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    // Modal Logic - Trip Timeline
    function openTripModal(trip) {
        modalContent.className = 'modal-content timeline-mode';
        document.querySelector('.video-container').style.display = 'none';
        
        modalTitle.textContent = trip.title;
        let timelineHtml = `<div class="timeline-container">`;
        trip.timeline.forEach(item => {
            timelineHtml += `
                <div class="timeline-item">
                    <span class="timeline-time">${item.time}</span>
                    <div class="timeline-card">
                        <span class="timeline-mood">今の気分: ${item.mood}</span>
                        <h4>${item.event}</h4>
                        <p>${item.text}</p>
                        ${item.image ? `<img src="${item.image}" class="timeline-image">` : ''}
                    </div>
                </div>
            `;
        });
        timelineHtml += `</div>`;
        modalDescription.innerHTML = timelineHtml;
        
        modalIframe.src = '';
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    closeModal.addEventListener('click', () => {
        modal.style.display = 'none';
        modalIframe.src = '';
        document.body.style.overflow = 'auto';
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) closeModal.click();
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
