// ========================================
// DOM Elements
// ========================================
const navbar = document.querySelector('.navbar');
const navToggle = document.querySelector('.nav-toggle');
const navMenu = document.querySelector('.nav-menu');
const navLinks = document.querySelectorAll('.nav-menu a');
const sections = document.querySelectorAll('section[id]');

// ========================================
// Navigation
// ========================================

// Scroll effect for navbar
function handleNavbarScroll() {
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
}

// Mobile menu toggle
function toggleMobileMenu() {
    navToggle.classList.toggle('active');
    navMenu.classList.toggle('active');
}

// Close mobile menu
function closeMobileMenu() {
    navToggle.classList.remove('active');
    navMenu.classList.remove('active');
}

// Update active nav link based on scroll position
function updateActiveNavLink() {
    const scrollPos = window.scrollY + 150;

    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.offsetHeight;
        const sectionId = section.getAttribute('id');

        if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${sectionId}`) {
                    link.classList.add('active');
                }
            });
        }
    });
}

// ========================================
// Smooth Scroll
// ========================================
function smoothScroll(e) {
    const href = e.currentTarget.getAttribute('href');
    
    if (href && href.startsWith('#')) {
        e.preventDefault();
        const targetId = href.substring(1);
        const targetElement = document.getElementById(targetId);
        
        if (targetElement) {
            const offsetTop = targetElement.offsetTop - 80;
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
            closeMobileMenu();
        }
    }
}

// ========================================
// Fade In Animation
// ========================================
function initFadeInElements() {
    const fadeSelectors = [
        '.about-card',
        '.profile-card',
        '.skill-category',
        '.publication-item',
        '.project-card',
        '.award-item',
        '.vision-card',
        '.contact-card'
    ];
    
    fadeSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
            el.classList.add('fade-in');
        });
    });
}

function handleFadeIn() {
    const fadeElements = document.querySelectorAll('.fade-in');
    
    fadeElements.forEach(el => {
        const rect = el.getBoundingClientRect();
        const isVisible = rect.top < window.innerHeight - 80;

        if (isVisible) {
            el.classList.add('visible');
        }
    });
}

// ========================================
// Intersection Observer for Animations
// ========================================
function initIntersectionObserver() {
    if ('IntersectionObserver' in window) {
        const observerOptions = {
            root: null,
            rootMargin: '0px 0px -100px 0px',
            threshold: 0.1
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, observerOptions);

        document.querySelectorAll('.fade-in').forEach(el => {
            observer.observe(el);
        });
    }
}

// ========================================
// Staggered Animation for Cards
// ========================================
function addStaggeredDelay() {
    const cardGroups = [
        '.skills-grid .skill-category',
        '.projects-grid .project-card',
        '.vision-grid .vision-card',
        '.contact-grid .contact-card'
    ];

    cardGroups.forEach(selector => {
        document.querySelectorAll(selector).forEach((card, index) => {
            card.style.transitionDelay = `${index * 0.1}s`;
        });
    });
}

// ========================================
// Event Listeners
// ========================================
function initEventListeners() {
    // Scroll events
    window.addEventListener('scroll', () => {
        handleNavbarScroll();
        updateActiveNavLink();
        handleFadeIn();
    }, { passive: true });

    // Mobile menu toggle
    if (navToggle) {
        navToggle.addEventListener('click', toggleMobileMenu);
    }

    // Navigation links
    navLinks.forEach(link => {
        link.addEventListener('click', smoothScroll);
    });

    // Scroll indicator
    const scrollIndicator = document.querySelector('.scroll-indicator');
    if (scrollIndicator) {
        scrollIndicator.addEventListener('click', smoothScroll);
    }

    // Hero buttons with anchor links
    document.querySelectorAll('.hero-actions a[href^="#"]').forEach(btn => {
        btn.addEventListener('click', smoothScroll);
    });

    // Close mobile menu on resize
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            closeMobileMenu();
        }
    });

    // Close mobile menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.navbar') && navMenu.classList.contains('active')) {
            closeMobileMenu();
        }
    });
}

// ========================================
// Initialize
// ========================================
function init() {
    initFadeInElements();
    addStaggeredDelay();
    initEventListeners();
    initIntersectionObserver();
    
    // Initial state
    handleNavbarScroll();
    handleFadeIn();
}

// Run on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Run on full page load
window.addEventListener('load', () => {
    handleFadeIn();
});
