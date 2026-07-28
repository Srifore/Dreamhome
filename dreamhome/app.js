/* ==========================================================================
   DREAMHOME CLIENT-SIDE LOGIC & INTERACTION
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

    // 1. MOBILE MENU TOGGLE
    const menuToggle = document.getElementById('menuToggle');
    const mobileNav = document.getElementById('mobileNav');
    const mobileLinks = document.querySelectorAll('.mobile-link');

    if (menuToggle && mobileNav) {
        menuToggle.addEventListener('click', () => {
            menuToggle.classList.toggle('active');
            mobileNav.classList.toggle('active');
            
            // Toggle hamburger animation in CSS if needed
            const bars = menuToggle.querySelectorAll('.bar');
            if (mobileNav.classList.contains('active')) {
                bars[0].style.transform = 'rotate(-45deg) translate(-5px, 6px)';
                bars[1].style.opacity = '0';
                bars[2].style.transform = 'rotate(45deg) translate(-5px, -6px)';
            } else {
                bars[0].style.transform = 'none';
                bars[1].style.opacity = '1';
                bars[2].style.transform = 'none';
            }
        });

        // Close menu on link click
        mobileLinks.forEach(link => {
            link.addEventListener('click', () => {
                menuToggle.classList.remove('active');
                mobileNav.classList.remove('active');
                const bars = menuToggle.querySelectorAll('.bar');
                bars[0].style.transform = 'none';
                bars[1].style.opacity = '1';
                bars[2].style.transform = 'none';
            });
        });
    }

    // 2. INTERACTIVE INVESTOR PITCH DECK SLIDER
    const slideTrack = document.getElementById('slideTrack');
    const slides = document.querySelectorAll('.deck-slide');
    const prevBtn = document.getElementById('prevSlide');
    const nextBtn = document.getElementById('nextSlide');
    const dotsContainer = document.getElementById('slideDots');
    let currentSlide = 0;
    const totalSlides = slides.length;

    if (slideTrack && prevBtn && nextBtn) {
        const dots = dotsContainer.querySelectorAll('.dot');

        const updateSlider = (index) => {
            currentSlide = index;
            // Translate the track horizontally
            slideTrack.style.transform = `translateX(-${currentSlide * 100}%)`;
            
            // Update dots
            dots.forEach((dot, idx) => {
                if (idx === currentSlide) {
                    dot.classList.add('active');
                } else {
                    dot.classList.remove('active');
                }
            });

            // Toggle slide active class for screen reader / animations
            slides.forEach((slide, idx) => {
                if (idx === currentSlide) {
                    slide.classList.add('active-slide');
                } else {
                    slide.classList.remove('active-slide');
                }
            });
        };

        // Next slide
        nextBtn.addEventListener('click', () => {
            let nextIndex = currentSlide + 1;
            if (nextIndex >= totalSlides) {
                nextIndex = 0; // Loop back to start
            }
            updateSlider(nextIndex);
        });

        // Prev slide
        prevBtn.addEventListener('click', () => {
            let prevIndex = currentSlide - 1;
            if (prevIndex < 0) {
                prevIndex = totalSlides - 1; // Loop to end
            }
            updateSlider(prevIndex);
        });

        // Dot navigation
        dots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
                updateSlider(index);
            });
        });

        // Add auto slide change every 8 seconds (optional, user can pause on hover)
        let autoSlideTimer = setInterval(() => {
            let nextIndex = currentSlide + 1;
            if (nextIndex >= totalSlides) nextIndex = 0;
            updateSlider(nextIndex);
        }, 8000);

        // Pause auto-sliding on manual interaction
        const resetTimer = () => {
            clearInterval(autoSlideTimer);
            autoSlideTimer = setInterval(() => {
                let nextIndex = currentSlide + 1;
                if (nextIndex >= totalSlides) nextIndex = 0;
                updateSlider(nextIndex);
            }, 12000); // Slower interval after interaction
        };

        prevBtn.addEventListener('click', resetTimer);
        nextBtn.addEventListener('click', resetTimer);
        dots.forEach(dot => dot.addEventListener('click', resetTimer));
    }

    // 3. PRODUCT CATEGORIES FILTER SYSTEM
    const tabButtons = document.querySelectorAll('.tab-btn');
    const categoryCards = document.querySelectorAll('.category-card');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active state on tab buttons
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filterValue = btn.getAttribute('data-filter');

            categoryCards.forEach(card => {
                const cardCat = card.getAttribute('data-cat');
                
                if (filterValue === 'all' || cardCat === filterValue) {
                    card.style.display = 'flex';
                    // Trigger reflow for fade-in transition
                    card.style.opacity = '0';
                    setTimeout(() => {
                        card.style.opacity = '1';
                        card.style.transform = 'translateY(0)';
                    }, 50);
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });

    // 4. HERO SECTION FADE-IN MICRO-ANIMATIONS
    const fadeElements = document.querySelectorAll('.fade-in');
    setTimeout(() => {
        fadeElements.forEach((el, index) => {
            setTimeout(() => {
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            }, index * 200);
        });
    }, 100);

});
