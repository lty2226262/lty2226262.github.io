window.HELP_IMPROVE_VIDEOJS = false;

// More Works Dropdown Functionality
function toggleMoreWorks() {
    const dropdown = document.getElementById('moreWorksDropdown');
    const button = document.querySelector('.more-works-btn');
    
    if (dropdown.classList.contains('show')) {
        dropdown.classList.remove('show');
        button.classList.remove('active');
    } else {
        dropdown.classList.add('show');
        button.classList.add('active');
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
    const container = document.querySelector('.more-works-container');
    const dropdown = document.getElementById('moreWorksDropdown');
    const button = document.querySelector('.more-works-btn');
    
    if (container && !container.contains(event.target)) {
        dropdown.classList.remove('show');
        button.classList.remove('active');
    }
});

// Close dropdown on escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const dropdown = document.getElementById('moreWorksDropdown');
        const button = document.querySelector('.more-works-btn');
        dropdown.classList.remove('show');
        button.classList.remove('active');
    }
});

// Copy BibTeX to clipboard
function copyBibTeX() {
    const bibtexElement = document.getElementById('bibtex-code');
    const button = document.querySelector('.copy-bibtex-btn');
    const copyText = button.querySelector('.copy-text');
    
    if (bibtexElement) {
        navigator.clipboard.writeText(bibtexElement.textContent).then(function() {
            // Success feedback
            button.classList.add('copied');
            copyText.textContent = 'Copied';
            
            setTimeout(function() {
                button.classList.remove('copied');
                copyText.textContent = 'Copy';
            }, 2000);
        }).catch(function(err) {
            console.error('Failed to copy: ', err);
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = bibtexElement.textContent;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            
            button.classList.add('copied');
            copyText.textContent = 'Copied';
            setTimeout(function() {
                button.classList.remove('copied');
                copyText.textContent = 'Copy';
            }, 2000);
        });
    }
}

// Scroll to top functionality
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Show/hide scroll to top button
window.addEventListener('scroll', function() {
    const scrollButton = document.querySelector('.scroll-to-top');
    if (window.pageYOffset > 300) {
        scrollButton.classList.add('visible');
    } else {
        scrollButton.classList.remove('visible');
    }
});

// Abstract video gallery auto-rotation
const ABSTRACT_VIDEO_ROTATE_DELAY = 5000;
let abstractVideoRotationTimer = null;
let currentAbstractVideoIndex = 0;

function getPreviewItems() {
    return Array.from(document.querySelectorAll('.preview-column .preview-item'));
}

// 修复后的双缓冲切换逻辑 (更稳健)
function updateMainAbstractVideoFromItem(item) {
    const layer1 = document.getElementById('video-layer-1');
    const layer2 = document.getElementById('video-layer-2');
    const caption = document.getElementById('abstractVideoCaption');

    if (!layer1 || !layer2 || !item) return;

    const newSrc = item.getAttribute('data-video-src');
    const newLabel = item.getAttribute('data-video-label') || '';

    if (!newSrc) return;

    // 1. 判断当前显示的是哪一层
    let activeVideo = layer1.classList.contains('active-layer') ? layer1 : layer2;
    let nextVideo = activeVideo === layer1 ? layer2 : layer1;

    // 2. 如果点击的是当前正在播放的视频，直接忽略
    if (activeVideo.getAttribute('src') && activeVideo.src.includes(newSrc)) {
        return;
    }

    // 记录当前播放时间
    const currentTime = activeVideo.currentTime;

    // 更新标题
    if (caption) caption.textContent = newLabel;

    // 3. 准备下一层视频
    nextVideo.src = newSrc;
    nextVideo.load(); // 强制重新加载

    // 定义切换动作
    const performSwitch = () => {
        // 设置新视频的播放时间为当前时间
        nextVideo.currentTime = currentTime;

        nextVideo.classList.add('active-layer');
        nextVideo.classList.remove('hidden-layer');
        
        activeVideo.classList.remove('active-layer');
        activeVideo.classList.add('hidden-layer');
        
        setTimeout(() => {
            activeVideo.pause();
        }, 600);
    };

    nextVideo.onloadeddata = () => {
        const playPromise = nextVideo.play();

        if (playPromise !== undefined) {
            playPromise
                .then(() => {
                    performSwitch();
                })
                .catch(error => {
                    console.warn("Auto-play prevented, switching anyway:", error);
                    performSwitch();
                });
        } else {
            performSwitch();
        }
        
        nextVideo.onloadeddata = null;
    };
}

function highlightPreviewItemByIndex(index) {
    const items = getPreviewItems();
    if (items.length === 0) {
        return;
    }

    const safeIndex = ((index % items.length) + items.length) % items.length;
    currentAbstractVideoIndex = safeIndex;

    items.forEach((btn, idx) => {
        const isCurrent = idx === safeIndex;
        btn.classList.toggle('is-active', isCurrent);
        btn.setAttribute('aria-selected', isCurrent ? 'true' : 'false');
    });

    updateMainAbstractVideoFromItem(items[safeIndex]);
}

function scheduleAbstractVideoRotation() {
    if (abstractVideoRotationTimer) {
        clearTimeout(abstractVideoRotationTimer);
    }

    abstractVideoRotationTimer = setTimeout(() => {
        const items = getPreviewItems();
        if (items.length === 0) {
            return;
        }

        const nextIndex = (currentAbstractVideoIndex + 1) % items.length;
        highlightPreviewItemByIndex(nextIndex);
        scheduleAbstractVideoRotation();
    }, ABSTRACT_VIDEO_ROTATE_DELAY);
}

function handleManualPreviewSelection(index) {
    highlightPreviewItemByIndex(index);
    scheduleAbstractVideoRotation();
}

function initAbstractVideoGallery() {
    const items = getPreviewItems();

    if (items.length === 0) {
        return;
    }

    items.forEach((item, idx) => {
        item.addEventListener('click', () => {
            handleManualPreviewSelection(idx);
        });

        item.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handleManualPreviewSelection(idx);
            }
        });
    });

    highlightPreviewItemByIndex(0);
    scheduleAbstractVideoRotation();
}

// Video carousel autoplay when in view
function setupVideoCarouselAutoplay() {
    const carouselVideos = document.querySelectorAll('.results-carousel video');
    
    if (carouselVideos.length === 0) return;
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const video = entry.target;
            if (entry.isIntersecting) {
                // Video is in view, play it
                video.play().catch(e => {
                    // Autoplay failed, probably due to browser policy
                    console.log('Autoplay prevented:', e);
                });
            } else {
                // Video is out of view, pause it
                video.pause();
            }
        });
    }, {
        threshold: 0.5 // Trigger when 50% of the video is visible
    });
    
    carouselVideos.forEach(video => {
        observer.observe(video);
    });
}

$(document).ready(function() {
    // Check for click events on the navbar burger icon

    var options = {
                slidesToScroll: 1,
                slidesToShow: 1,
                loop: true,
                infinite: true,
                autoplay: true,
                autoplaySpeed: 5000,
    }

    // Initialize all div with carousel class
    var carousels = bulmaCarousel.attach('.carousel', options);
        
    bulmaSlider.attach();
    
    // Setup video autoplay for carousel
    setupVideoCarouselAutoplay();

    initAbstractVideoGallery();
    
    // ==========================================
    // 【修改点 1】：新增 light 模块的初始化
    // ==========================================
    initProgressiveVideoShowcase('snow');
    initProgressiveVideoShowcase('rain');
    initProgressiveVideoShowcase('light'); 
    
    // Preload all video sources for faster switching
    preloadProgressiveVideos();
    
    // Ensure all progressive videos loop properly
    ensureProgressiveVideosLoop();
})

// ==========================================
// 【修改点 2】：增加 light 视频预加载
// ==========================================
function preloadProgressiveVideos() {
    // Snow videos
    const snowVideos = [
        'static/videos/snow_114.mov',
        'static/videos/snow_114_add_falling.mov',
        'static/videos/snow_114_falling_acc.mov',
        'static/videos/snow_114_falling_acc_ground.mov'
    ];
    
    // Rain videos
    const rainVideos = [
        'static/videos/raw_video_220.mov',
        'static/videos/add_raindrops_220.mov',
        'static/videos/add_raindrops_plus_puddle_220.mov'
    ];

    // Light videos
    const lightVideos = [
        '../static/autoweather4d/videos/nolight.mp4',
        '../static/autoweather4d/videos/targetA.mp4',
        '../static/autoweather4d/videos/targetB.mp4',
        '../static/autoweather4d/videos/alllight.mp4'
    ];
    
    // Create hidden video elements to preload
    const preloadContainer = document.createElement('div');
    preloadContainer.style.display = 'none';
    document.body.appendChild(preloadContainer);
    
    [...snowVideos, ...rainVideos, ...lightVideos].forEach(src => {
        const video = document.createElement('video');
        video.src = src;
        video.preload = 'auto';
        video.muted = true;
        preloadContainer.appendChild(video);
    });
}

// ==========================================
// 【修改点 3】：用 Class 选择器代替硬编码 ID，自动适配所有模块
// ==========================================
function ensureProgressiveVideosLoop() {
    // 直接选中所有 progressive 播放器的视频元素，无需再写死 ID
    const videos = document.querySelectorAll('.progressive-main-video');
    
    videos.forEach(video => {
        if (video) {
            video.loop = true;
            // Use timeupdate for seamless looping
            const handleTimeUpdate = () => {
                // If video is very close to the end (within 0.05 seconds), reset to start for seamless loop
                if (video.duration && video.currentTime >= video.duration - 0.05) {
                    video.currentTime = 0.01; // Set to small value to avoid exact 0 which might cause issues
                }
            };
            video.addEventListener('timeupdate', handleTimeUpdate);
        }
    });
}

// =========================================
// Progressive Effect Showcase (Snow/Rain/Light)
// =========================================

function initProgressiveVideoShowcase(type) {
    // Find the container for this showcase type using data attribute
    const container = document.querySelector(`.progressive-timeline-container[data-showcase-type="${type}"]`);
    
    if (!container) return;
    
    const steps = container.querySelectorAll('.progressive-step');

    // ==========================================
    // 【修改点 4】：动态解析进度条 ID
    // ==========================================
    const prefix = type === 'snow' ? 'progressive' : type; 
    const progressBarId = `${prefix}TimelineProgress`;
    const progressBar = document.getElementById(progressBarId);
    
    if (steps.length === 0) return;

    let currentStep = 0;

    steps.forEach((step, index) => {
        step.addEventListener('click', () => {
            toggleStep(index, type);
        });

        step.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                toggleStep(index, type);
            }
        });
    });

    function toggleStep(index, showcaseType) {
        if (index < 0 || index >= steps.length) return;
        
        const step = steps[index];
        const isCurrentlyActive = step.classList.contains('is-active');
        
        // If clicking the active step, deactivate it and go back to previous (or first)
        if (isCurrentlyActive) {
            // Find the previous active step (or go to first if current is first)
            let targetIndex = index > 0 ? index - 1 : 0;
            switchToStep(targetIndex, showcaseType);
        } else {
            // Normal switch to clicked step
            switchToStep(index, showcaseType);
        }
    }

    function switchToStep(index, showcaseType) {
        if (index < 0 || index >= steps.length) return;
        
        const step = steps[index];
        const videoSrc = step.getAttribute('data-video-src');
        const videoLabel = step.getAttribute('data-video-label');

        if (!videoSrc) return;

        // Update active state (only for this showcase's steps)
        steps.forEach((s, i) => {
            s.classList.toggle('is-active', i === index);
            
            // Update eye icon state:
            const eyeIcon = s.querySelector('.step-eye-icon');
            if (eyeIcon) {
                if (i === 0) {
                    eyeIcon.classList.add('eye-open');
                } else {
                    if (i <= index && index > 0) {
                        eyeIcon.classList.add('eye-open');
                    } else {
                        eyeIcon.classList.remove('eye-open');
                    }
                }
            }
        });

        // Update progress bar
        if (progressBar) {
            const progress = ((index + 1) / steps.length) * 100;
            progressBar.style.width = `${progress}%`;
        }

        // Switch video
        updateProgressiveVideo(videoSrc, videoLabel, showcaseType);
        currentStep = index;
    }

    switchToStep(0, type);
    
    if (steps.length > 0) {
        const firstEyeIcon = steps[0].querySelector('.step-eye-icon');
        if (firstEyeIcon) {
            firstEyeIcon.classList.add('eye-open');
        }
    }
}

function updateProgressiveVideo(newSrc, newLabel, type) {
    // ==========================================
    // 【修改点 5】：动态解析 Layer ID
    // ==========================================
    const prefix = type === 'snow' ? 'progressive' : type; 
    const layer1Id = `${prefix}-video-layer-1`;
    const layer2Id = `${prefix}-video-layer-2`;
    
    const layer1 = document.getElementById(layer1Id);
    const layer2 = document.getElementById(layer2Id);
    
    // Find the loader within the same showcase container
    const container = layer1 ? layer1.closest('.progressive-video-wrapper') : null;
    const loader = container ? container.querySelector('.progressive-video-loader') : null;

    if (!layer1 || !layer2) return;

    // Check if already playing this video
    let activeVideo = layer1.classList.contains('active-layer') ? layer1 : layer2;
    if (activeVideo.getAttribute('src') && activeVideo.src.includes(newSrc)) {
        return;
    }

    // Save current playback time to sync with next video
    const currentTime = activeVideo.currentTime;

    // Show loader
    if (loader) {
        loader.classList.add('show');
    }

    // Prepare next layer
    let nextVideo = activeVideo === layer1 ? layer2 : layer1;
    
    // If video source is already set and loaded, use it directly
    if (nextVideo.src && nextVideo.src.includes(newSrc) && nextVideo.readyState >= 3) {
        // Video is already loaded, just switch immediately
        nextVideo.currentTime = currentTime;
        nextVideo.classList.add('active-layer');
        nextVideo.classList.remove('hidden-layer');
        activeVideo.classList.remove('active-layer');
        activeVideo.classList.add('hidden-layer');
        if (loader) loader.classList.remove('show');
        setTimeout(() => { activeVideo.pause(); }, 600);
        
        const playPromise = nextVideo.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => console.warn("Auto-play prevented:", error));
        }
        return;
    }
    
    // Define switch function
    const performSwitch = () => {
        // Set the same playback time before switching
        nextVideo.currentTime = currentTime;
        
        nextVideo.classList.add('active-layer');
        nextVideo.classList.remove('hidden-layer');
        
        activeVideo.classList.remove('active-layer');
        activeVideo.classList.add('hidden-layer');
        
        // Hide loader
        if (loader) {
            loader.classList.remove('show');
        }
        
        // Pause old video after transition (but keep its time for potential future use)
        setTimeout(() => {
            activeVideo.pause();
        }, 600);
    };
    
    nextVideo.src = newSrc;
    nextVideo.preload = 'auto';
    nextVideo.load();

    nextVideo.onloadeddata = () => {
        // Set the playback time to match current video
        nextVideo.currentTime = currentTime;
        
        // Ensure loop is enabled
        nextVideo.loop = true;
        
        // Use timeupdate to detect near end and loop seamlessly
        const handleTimeUpdate = () => {
            if (nextVideo.duration && nextVideo.currentTime >= nextVideo.duration - 0.05) {
                nextVideo.currentTime = 0.01; 
            }
        };
        
        // Remove old listener if exists
        nextVideo.removeEventListener('timeupdate', handleTimeUpdate);
        nextVideo.addEventListener('timeupdate', handleTimeUpdate);
        
        const playPromise = nextVideo.play();

        if (playPromise !== undefined) {
            playPromise
                .then(() => {
                    performSwitch();
                })
                .catch(error => {
                    console.warn("Auto-play prevented, switching anyway:", error);
                    performSwitch();
                });
        } else {
            performSwitch();
        }
        
        nextVideo.onloadeddata = null;
    };
}