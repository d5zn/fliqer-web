// --- (WebGL/Three.js background removed for performance) ---
// --- (3D scene removed) ---

// (rest of 3D scene and animate loop removed)
// --- Text Hover Effect (Optimized) ---
const headings = document.querySelectorAll('h1, h2');
let hoverChars = [];

// Initialize chars
// Initialize chars
headings.forEach(heading => {
    // Skip footer brand to avoid clipping issues with large italic text
    if (heading.classList.contains('footer-brand')) return;

    const textNodes = Array.from(heading.childNodes);
    const newContent = document.createDocumentFragment();

    textNodes.forEach(node => {
        if (node.nodeType === 3) {
            const text = node.textContent;
            for (let char of text) {
                if (char === ' ') {
                    newContent.appendChild(document.createTextNode(' '));
                } else {
                    const span = document.createElement('span');
                    span.textContent = char;
                    span.className = 'hover-char';
                    newContent.appendChild(span);
                }
            }
        } else {
            newContent.appendChild(node.cloneNode(true));
        }
    });

    heading.innerHTML = '';
    heading.appendChild(newContent);

    // Add new spans to the global array
    const spans = Array.from(heading.querySelectorAll('.hover-char'));

    // Store span + cached position
    spans.forEach(span => {
        hoverChars.push({
            element: span,
            rect: span.getBoundingClientRect() // Cache initial position
        });
    });
});

// Function to update gradient positions
function updateGradientPositions() {
    headings.forEach(heading => {
        const headingRect = heading.getBoundingClientRect();
        const spans = heading.querySelectorAll('.hover-char');

        spans.forEach(span => {
            const spanRect = span.getBoundingClientRect();
            const leftOffset = spanRect.left - headingRect.left;

            span.style.setProperty('--heading-width', `${headingRect.width}px`);
            span.style.setProperty('--char-left', `${leftOffset}px`);
        });
    });
}

// Initial calculation
updateGradientPositions();

// Update cached positions on resize
window.addEventListener('resize', () => {
    // Update hover effect cache
    hoverChars.forEach(charObj => {
        charObj.rect = charObj.element.getBoundingClientRect();
    });

    // Update gradient positions
    updateGradientPositions();
});

// Throttled Mouse Move
let mouseX = 0, mouseY = 0;
let isTextHoverScheduled = false;

document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;

    if (!isTextHoverScheduled) {
        requestAnimationFrame(() => {
            const radius = 50;
            const maxBlur = 5;

            hoverChars.forEach(charObj => {
                // Use cached rect
                const rect = charObj.rect;
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;

                // Simple bounding box check first for speed
                if (Math.abs(mouseX - centerX) > radius || Math.abs(mouseY - centerY) > radius) {
                    if (charObj.element.style.filter !== 'blur(0px)') {
                        charObj.element.style.filter = 'blur(0px)';
                    }
                    return;
                }

                const dist = Math.hypot(mouseX - centerX, mouseY - centerY);

                if (dist < radius) {
                    const blurAmount = (1 - dist / radius) * maxBlur;
                    charObj.element.style.filter = `blur(${blurAmount}px)`;
                } else {
                    charObj.element.style.filter = 'blur(0px)';
                }
            });
            isTextHoverScheduled = false;
        });
        isTextHoverScheduled = true;
    }
});

// --- Scroll Reveal Animation ---
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, {
    threshold: 0.2,
    rootMargin: "0px 0px -300px 0px" // Increased negative margin (was -150px) to trigger even higher up
});

document.querySelectorAll('.section, .hero-content').forEach(el => {
    el.classList.add('reveal-on-scroll');
    revealObserver.observe(el);
});

// --- Nav Button Scroll Interaction (desktop "Work with us") ---
const heroBtn = document.querySelector('.hero .btn-primary');
const navBtn = document.querySelector('.nav-menu-desktop .nav-cta');

if (heroBtn && navBtn) {
    const formSection = document.getElementById('application-form');
    let isHeroVisible = true;
    let isFormVisible = false;

    const updateNavBtn = () => {
        // Button is filled if Hero is NOT visible AND Form is NOT visible
        if (!isHeroVisible && !isFormVisible) {
            navBtn.classList.add('filled');
        } else {
            navBtn.classList.remove('filled');
        }
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.target === heroBtn) {
                isHeroVisible = entry.isIntersecting;
            } else if (entry.target === formSection) {
                isFormVisible = entry.isIntersecting;
            }
        });
        updateNavBtn();
    }, {
        threshold: 0
    });

    observer.observe(heroBtn);
    if (formSection) {
        observer.observe(formSection);
    }
}

// --- Glass Card Glow Effect ---
// --- Glass Card Glow Effect ---
document.querySelectorAll('.glass-card, nav').forEach(card => {
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
    });
});

// --- Mobile Menu Toggle ---
function initMobileMenu() {
    const burgerBtn = document.querySelector('.burger-menu');
    const navMenu = document.querySelector('.nav-menu');
    if (!burgerBtn || !navMenu) return;

    const backdrop = document.createElement('div');
    backdrop.className = 'nav-menu-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    document.body.appendChild(backdrop);

    function closeMenu() {
        burgerBtn.classList.remove('active');
        navMenu.classList.remove('active');
        backdrop.classList.remove('active');
        document.body.style.overflow = '';
    }

    function toggleMenu() {
        burgerBtn.classList.toggle('active');
        navMenu.classList.toggle('active');
        backdrop.classList.toggle('active', navMenu.classList.contains('active'));
        document.body.style.overflow = navMenu.classList.contains('active') ? 'hidden' : '';
    }

    burgerBtn.addEventListener('click', (e) => {
        e.preventDefault();
        toggleMenu();
    });
    burgerBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        toggleMenu();
    }, { passive: false });

    backdrop.addEventListener('click', closeMenu);
    backdrop.addEventListener('touchstart', (e) => {
        e.preventDefault();
        closeMenu();
    }, { passive: false });

    navMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', closeMenu);
    });
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileMenu);
} else {
    initMobileMenu();
}
// --- Drum Pad Sounds (Web Audio API) ---
// Можно отключить звуки / интерактивность в блоке услуг, выставив этот флаг в false
const ENABLE_SERVICE_SOUNDS = true;

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playDrumSound(index) {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    const t = audioCtx.currentTime;

    switch (index) {
        case 0: // Kick (Deep, Punchy) - Q
            const kickOsc = audioCtx.createOscillator();
            const kickGain = audioCtx.createGain();
            kickOsc.frequency.setValueAtTime(120, t);
            kickOsc.frequency.exponentialRampToValueAtTime(0.01, t + 0.5);
            kickGain.gain.setValueAtTime(1, t);
            kickGain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
            kickOsc.connect(kickGain);
            kickGain.connect(audioCtx.destination);
            kickOsc.start(t);
            kickOsc.stop(t + 0.5);
            break;

        case 1: // Snare (Crisp, Tight) - W
            const snareNoise = audioCtx.createBufferSource();
            const snareBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.2, audioCtx.sampleRate);
            const snareData = snareBuffer.getChannelData(0);
            for (let i = 0; i < snareBuffer.length; i++) snareData[i] = Math.random() * 2 - 1;
            snareNoise.buffer = snareBuffer;
            const snareFilter = audioCtx.createBiquadFilter();
            snareFilter.type = 'highpass';
            snareFilter.frequency.value = 1500;
            const snareGain = audioCtx.createGain();
            snareGain.gain.setValueAtTime(0.8, t);
            snareGain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
            snareNoise.connect(snareFilter);
            snareFilter.connect(snareGain);
            snareGain.connect(audioCtx.destination);
            snareNoise.start(t);

            const snareOsc = audioCtx.createOscillator();
            snareOsc.type = 'triangle';
            const snareOscGain = audioCtx.createGain();
            snareOsc.frequency.setValueAtTime(200, t);
            snareOscGain.gain.setValueAtTime(0.4, t);
            snareOscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
            snareOsc.connect(snareOscGain);
            snareOscGain.connect(audioCtx.destination);
            snareOsc.start(t);
            snareOsc.stop(t + 0.1);
            break;

        case 2: // Hi-Hat (Short, Closed) - E
            const hatBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.05, audioCtx.sampleRate);
            const hatData = hatBuffer.getChannelData(0);
            for (let i = 0; i < hatBuffer.length; i++) hatData[i] = Math.random() * 2 - 1;
            const hatNoise = audioCtx.createBufferSource();
            hatNoise.buffer = hatBuffer;
            const hatFilter = audioCtx.createBiquadFilter();
            hatFilter.type = 'highpass';
            hatFilter.frequency.value = 8000;
            const hatGain = audioCtx.createGain();
            hatGain.gain.setValueAtTime(0.4, t);
            hatGain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
            hatNoise.connect(hatFilter);
            hatFilter.connect(hatGain);
            hatGain.connect(audioCtx.destination);
            hatNoise.start(t);
            break;

        case 3: // Bass (Deep Sine) - Branding (A)
            const bassOsc = audioCtx.createOscillator();
            const bassGain = audioCtx.createGain();
            bassOsc.type = 'sine';
            bassOsc.frequency.setValueAtTime(60, t);
            bassOsc.frequency.exponentialRampToValueAtTime(40, t + 0.4);

            bassGain.gain.setValueAtTime(0.8, t);
            bassGain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);

            bassOsc.connect(bassGain);
            bassGain.connect(audioCtx.destination);
            bassOsc.start(t);
            bassOsc.stop(t + 0.4);
            break;

        case 4: // Open Hat (Longer, Metallic) - Automation (S)
            const openHatBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.3, audioCtx.sampleRate);
            const openHatData = openHatBuffer.getChannelData(0);
            for (let i = 0; i < openHatBuffer.length; i++) openHatData[i] = Math.random() * 2 - 1;
            const openHatNoise = audioCtx.createBufferSource();
            openHatNoise.buffer = openHatBuffer;
            const openHatFilter = audioCtx.createBiquadFilter();
            openHatFilter.type = 'highpass';
            openHatFilter.frequency.value = 6000;
            const openHatGain = audioCtx.createGain();
            openHatGain.gain.setValueAtTime(0.4, t);
            openHatGain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
            openHatNoise.connect(openHatFilter);
            openHatFilter.connect(openHatGain);
            openHatGain.connect(audioCtx.destination);
            openHatNoise.start(t);
            break;

        case 5: // Pluck (Scott Storch Style) - Consulting (D)
            const pluckOsc = audioCtx.createOscillator();
            const pluckGain = audioCtx.createGain();
            pluckOsc.type = 'sawtooth';
            pluckOsc.frequency.setValueAtTime(440, t); // A4

            const pluckFilter = audioCtx.createBiquadFilter();
            pluckFilter.type = 'lowpass';
            pluckFilter.frequency.setValueAtTime(2000, t);
            pluckFilter.frequency.exponentialRampToValueAtTime(200, t + 0.2);

            pluckGain.gain.setValueAtTime(0.3, t);
            pluckGain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

            pluckOsc.connect(pluckFilter);
            pluckFilter.connect(pluckGain);
            pluckGain.connect(audioCtx.destination);
            pluckOsc.start(t);
            pluckOsc.stop(t + 0.3);
            break;
    }
}

// --- Visibility Check for Sounds ---
let isServicesVisible = false;
const servicesSection = document.getElementById('services');

if (servicesSection) {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            isServicesVisible = entry.isIntersecting;
        });
    }, { threshold: 0.2 }); // 20% visibility required
    observer.observe(servicesSection);
}

// Helper to check if sound should play
function canPlaySound() {
    const isPopupOpen = document.getElementById('popup-overlay')?.classList.contains('active');
    return isServicesVisible && !isPopupOpen;
}

if (ENABLE_SERVICE_SOUNDS) {
    document.querySelectorAll('.service-icon-wrapper').forEach((wrapper, index) => {
        wrapper.addEventListener('mousedown', () => {
            if (canPlaySound()) {
                playDrumSound(index);
            }
        });
    });

    // --- Keyboard Binding (Q, W, E, A, S, D) ---
    const keyMap = {
        'q': 0,
        'w': 1,
        'e': 2,
        'a': 3,
        's': 4,
        'd': 5
    };

    document.addEventListener('keydown', (e) => {
        if (e.repeat) return; // Prevent repeat on hold

        if (keyMap.hasOwnProperty(e.key.toLowerCase())) {
            const index = keyMap[e.key.toLowerCase()];
            const wrappers = document.querySelectorAll('.service-icon-wrapper');

            if (wrappers[index] && canPlaySound()) {
                playDrumSound(index);
                wrappers[index].classList.add('active-key');
            }
        }
    });

    document.addEventListener('keyup', (e) => {
        if (keyMap.hasOwnProperty(e.key.toLowerCase())) {
            const index = keyMap[e.key.toLowerCase()];
            const wrappers = document.querySelectorAll('.service-icon-wrapper');

            if (wrappers[index]) {
                wrappers[index].classList.remove('active-key');
            }
        }
    });
}


// --- Popup Form Logic ---
const popupOverlay = document.getElementById('popup-overlay');
const popupCloseBtn = document.getElementById('popup-close');
const workWithUsBtns = document.querySelectorAll('.nav-cta, .footer-cta, #hero-btn'); // Select nav, footer, and hero buttons
const popupForm = document.getElementById('project-form');

// Open Popup
workWithUsBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault(); // Prevent anchor navigation
        popupOverlay.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    });
});

// Close Popup Function
const closePopup = () => {
    popupOverlay.classList.remove('active');
    document.body.style.overflow = '';
};

// Close on Button Click
if (popupCloseBtn) {
    popupCloseBtn.addEventListener('click', closePopup);
}

// Close on Overlay Click (Outside content)
if (popupOverlay) {
    popupOverlay.addEventListener('click', (e) => {
        if (e.target === popupOverlay) {
            closePopup();
        }
    });
}

// Close on ESC Key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && popupOverlay.classList.contains('active')) {
        closePopup();
    }
});

// Popup Drag & Drop
const popupDropZone = document.getElementById('popup-drop-zone');
const popupFileInput = document.getElementById('popup-file');

if (popupDropZone && popupFileInput) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        popupDropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
        }, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        popupDropZone.addEventListener(eventName, () => {
            popupDropZone.classList.add('drag-over');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        popupDropZone.addEventListener(eventName, () => {
            popupDropZone.classList.remove('drag-over');
        }, false);
    });

    popupDropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        handlePopupFiles(files);
    }, false);

    popupDropZone.addEventListener('click', () => {
        popupFileInput.click();
    });

    popupFileInput.addEventListener('change', function () {
        handlePopupFiles(this.files);
    });

    function handlePopupFiles(files) {
        if (files.length > 0) {
            const file = files[0];
            const textSpan = popupDropZone.querySelector('.drop-zone-text');
            const subSpan = popupDropZone.querySelector('.drop-zone-sub');
            const mobileButton = document.getElementById('mobile-file-button');

            if (textSpan) textSpan.textContent = file.name;
            if (subSpan) subSpan.textContent = 'File attached';

            popupDropZone.style.borderColor = '#FF9B04';
            popupDropZone.style.background = 'rgba(255, 155, 4, 0.1)';

            // Обновляем текст кнопки на мобилке
            if (mobileButton) {
                const buttonSpan = mobileButton.querySelector('span');
                if (buttonSpan) buttonSpan.textContent = file.name;
                mobileButton.style.borderColor = '#FF9B04';
                mobileButton.style.background = 'rgba(255, 155, 4, 0.1)';
            }
        }
    }
}

// Form Submission
// --- Resend API Configuration ---
// API endpoint for sending emails via Resend
const API_ENDPOINT = '/api/send-email';

// Helper function to convert file to base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            // Remove data URL prefix (data:image/png;base64,)
            const base64 = reader.result.split(',')[1];
            resolve({ data: base64, name: file.name, type: file.type });
        };
        reader.onerror = error => reject(error);
    });
}

if (popupForm) {
    popupForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const btn = popupForm.querySelector('button[type="submit"]');
        const originalText = btn ? btn.textContent : 'Send Request';

        if (btn) {
            btn.textContent = 'Sending...';
            btn.disabled = true;
        }

        try {
            // Get form data
            const formData = {
                projectType: document.getElementById('project-type').value,
                companyName: document.getElementById('company-name').value,
                email: document.getElementById('email').value,
                message: document.getElementById('message').value,
            };

            // Handle attachment if present
            const fileInput = document.getElementById('popup-file');
            let attachment = null;

            if (fileInput && fileInput.files && fileInput.files.length > 0) {
                try {
                    attachment = await fileToBase64(fileInput.files[0]);
                } catch (error) {
                    console.warn('Failed to process attachment:', error);
                }
            }

            // Send to API
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...formData,
                    ...(attachment && { attachment }),
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to send email');
            }

            // Success
            if (btn) {
                btn.textContent = 'Sent!';
                btn.style.background = '#4CAF50';
                btn.style.borderColor = '#4CAF50';
            }

            setTimeout(() => {
                closePopup();
                // Reset form after delay
                setTimeout(() => {
                    popupForm.reset();
                    if (btn) {
                        btn.textContent = originalText;
                        btn.style.background = '';
                        btn.style.borderColor = '';
                        btn.disabled = false;
                    }

                    if (popupDropZone) {
                        const textSpan = popupDropZone.querySelector('.drop-zone-text');
                        const subSpan = popupDropZone.querySelector('.drop-zone-sub');
                        if (textSpan) textSpan.textContent = 'Drag & drop files';
                        if (subSpan) subSpan.textContent = 'or click to browse';
                        popupDropZone.style.borderColor = '';
                        popupDropZone.style.background = '';
                    }

                    // Сбрасываем кнопку на мобилке
                    const mobileButton = document.getElementById('mobile-file-button');
                    if (mobileButton) {
                        const buttonSpan = mobileButton.querySelector('span');
                        if (buttonSpan) buttonSpan.textContent = 'Attach file';
                        mobileButton.style.borderColor = '';
                        mobileButton.style.background = '';
                    }

                    // Reset file input
                    if (fileInput) {
                        fileInput.value = '';
                    }
                }, 500);
            }, 1500);
        } catch (error) {
            // Error
            console.error('Email sending error:', error);
            if (btn) {
                btn.textContent = 'Error';
                btn.style.background = '#ff4444';
                btn.style.borderColor = '#ff4444';

                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.style.background = '';
                    btn.style.borderColor = '';
                    btn.disabled = false;
                }, 3000);
            }

            alert('Failed to send message. Please try again later.');
        }
    });
}

// --- Multi-language Support ---
const translations = {
    en: {
        'nav.cases': 'Cases',
        'nav.service': 'Service',
        'nav.agency': 'Agency',
        'nav.contact': 'Contact',
        'nav.cta': 'Work with us',
        'hero.badge': 'Creative Design & Develop Agency',
        'hero.title': 'We breathe life into<br>digital products',
        'hero.subtitle': 'We build immersive web experiences and scalable design systems for ambitious brands',
        'hero.cta_start': 'Start a project',
        'hero.cta_view': 'View our work'
    },
    ru: {
        'nav.cases': 'Кейсы',
        'nav.service': 'Услуги',
        'nav.agency': 'Агентство',
        'nav.contact': 'Контакты',
        'nav.cta': 'Работать с нами',
        'hero.badge': 'Креативное агентство дизайна и разработки',
        'hero.title': 'Вдыхаем жизнь в<br>цифровые продукты',
        'hero.subtitle': 'Создаем захватывающие веб-интерфейсы и масштабируемые дизайн-системы для амбициозных брендов',
        'hero.cta_start': 'Начать проект',
        'hero.cta_view': 'Смотреть работы'
    }
};

function setLanguage(lang) {
    // Save preference
    localStorage.setItem('landing_preferred_language', lang);
    document.documentElement.lang = lang;

    // Update texts
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang] && translations[lang][key]) {
            el.innerHTML = translations[lang][key];
        }
    });

    // Update active state on buttons
    document.querySelectorAll('.lang-btn').forEach(btn => {
        if (btn.getAttribute('data-lang') === lang) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// Initialize language switcher
document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const lang = e.target.getAttribute('data-lang');
        setLanguage(lang);
    });
});

// Load preferred language or default to 'en'
const userLang = localStorage.getItem('landing_preferred_language') || 'en';
setLanguage(userLang);
