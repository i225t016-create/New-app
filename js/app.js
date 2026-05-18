document.addEventListener('DOMContentLoaded', () => {
    const vlogGrid = document.getElementById('vlog-grid');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const modal = document.getElementById('video-modal');
    const closeModal = document.querySelector('.close-modal');
    const modalIframe = document.getElementById('modal-iframe');
    const modalTitle = document.getElementById('modal-title');
    const modalDescription = document.getElementById('modal-description');

    let vlogsData = [];

    // Fetch Vlogs Data
    fetch('data/vlogs.json')
        .then(response => response.json())
        .then(data => {
            vlogsData = data;
            renderVlogs(vlogsData);
            initRevealAnimations();
        })
        .catch(error => console.error('Error loading vlogs:', error));

    // Render Vlogs to Grid
    function renderVlogs(vlogs) {
        vlogGrid.innerHTML = '';
        vlogs.forEach(vlog => {
            const card = document.createElement('div');
            card.className = 'vlog-card reveal';
            card.innerHTML = `
                <div class="card-thumbnail">
                    <img src="${vlog.thumbnail}" alt="${vlog.title}">
                    <div class="play-overlay">
                        <div class="play-btn-circle">▶</div>
                    </div>
                </div>
                <div class="card-content">
                    <span class="card-category">${vlog.category}</span>
                    <h3>${vlog.title}</h3>
                    <p>${vlog.description}</p>
                </div>
            `;
            card.addEventListener('click', () => openModal(vlog));
            vlogGrid.appendChild(card);
        });
        
        // Trigger reveal for newly added elements
        setTimeout(initRevealAnimations, 100);
    }

    // Filter Logic
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update UI
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filter = btn.getAttribute('data-filter');
            const filteredVlogs = filter === 'all' 
                ? vlogsData 
                : vlogsData.filter(vlog => vlog.category === filter);
            
            renderVlogs(filteredVlogs);
        });
    });

    // Modal Logic
    function openModal(vlog) {
        modalTitle.textContent = vlog.title;
        modalDescription.textContent = vlog.description;
        modalIframe.src = vlog.videoUrl;
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Prevent scroll
    }

    closeModal.addEventListener('click', () => {
        modal.style.display = 'none';
        modalIframe.src = ''; // Stop video
        document.body.style.overflow = 'auto';
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal.click();
        }
    });

    // Reveal Animations using Intersection Observer
    function initRevealAnimations() {
        const reveals = document.querySelectorAll('.reveal');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                }
            });
        }, { threshold: 0.1 });

        reveals.forEach(reveal => observer.observe(reveal));
    }
});
