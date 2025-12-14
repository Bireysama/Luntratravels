/**
 * script.js — polished interactions for Luntra Travels
 * - Mobile nav
 * - Hero parallax (debounced)
 * - IntersectionObserver animations (fade/slide)
 * - Accessible slider with auto-advance + controls
 * - Contact form POST + UI states
 * - Performance-minded (throttling/debouncing, reduced-motion)
 */

(function () {
  'use strict';

  // Utilities
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  // Small debounce util
  function debounce(fn, wait = 15) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  // Throttle (for scroll)
  function throttle(fn, limit = 16) {
    let last = 0;
    return (...args) => {
      const now = Date.now();
      if (now - last >= limit) {
        last = now;
        fn(...args);
      }
    };
  }

  document.addEventListener('DOMContentLoaded', () => {
    // NAV: mobile toggle + keyboard accessibility
    const menuToggle = $('#menuToggle');
    const navList = $('#navList');
    if (menuToggle && navList) {
      menuToggle.addEventListener('click', () => {
        const open = navList.classList.toggle('open');
        menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });

      // Close on escape when open
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && navList.classList.contains('open')) {
          navList.classList.remove('open');
          menuToggle.setAttribute('aria-expanded', 'false');
          menuToggle.focus();
        }
      });
      // Ensure focus trap not required (simple)
    }

    // HERO: parallax effect (respect prefers-reduced-motion)
    const heroParallax = document.getElementById('heroParallax');
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (heroParallax && !prefersReduced) {
      const onScroll = throttle(() => {
        const y = window.scrollY || window.pageYOffset;
        // small translate for subtle parallax
        heroParallax.style.transform = `translateY(${Math.min(y * 0.18, 140)}px)`;
      }, 16);
      window.addEventListener('scroll', onScroll, { passive: true });
    }

    // INTERSECTION OBSERVER: reveal animations
    const animTargets = [...$$('.card'), ...$$('.service-card'), ...$$('.dest'), ...$$('.contact-card'), ...$$('.slide')];
    if ('IntersectionObserver' in window && animTargets.length) {
      const reveal = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
            obs.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12 });
      animTargets.forEach(el => reveal.observe(el));
    } else {
      // fallback if not supported
      animTargets.forEach(el => {
        el.style.opacity = '1';
        el.style.transform = 'none';
      });
    }

    // SLIDER: accessible auto-advance + manual controls (simple)
    const sliderEl = $('.slider');
    if (sliderEl) {
      const slides = $$('.slider .slide', sliderEl);
      let idx = slides.findIndex(s => s.classList.contains('active'));
      if (idx < 0) idx = 0;

      function show(i) {
        slides.forEach((s, n) => s.classList.toggle('active', n === i));
      }
      show(idx);

      // auto-advance
      let interval = setInterval(() => {
        idx = (idx + 1) % slides.length;
        show(idx);
      }, 4500);

      // pause on hover / focus
      sliderEl.addEventListener('mouseenter', () => clearInterval(interval));
      sliderEl.addEventListener('mouseleave', () => {
        interval = setInterval(() => {
          idx = (idx + 1) % slides.length;
          show(idx);
        }, 4500);
      });
      // allow keyboard advance via left/right arrow when focused
      sliderEl.tabIndex = 0;
      sliderEl.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') { idx = (idx + 1) % slides.length; show(idx); }
        if (e.key === 'ArrowLeft') { idx = (idx - 1 + slides.length) % slides.length; show(idx); }
      });
    }

    // SMOOTH SCROLL for anchor links (native-friendly)
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', (ev) => {
        const href = a.getAttribute('href');
        if (href.length > 1) {
          const target = document.querySelector(href);
          if (target) {
            ev.preventDefault();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            // close mobile nav if open
            if (navList && navList.classList.contains('open')) {
              navList.classList.remove('open');
              if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
            }
          }
        }
      });
    });

    // CONTACT FORM: submit using fetch to /api/contact
    const contactForm = $('#contactForm');
    const formStatus = $('#formStatus');
    if (contactForm) {
      contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!formStatus) return;
        // Basic client-side validation
        const name = (contactForm.querySelector('#cname') || {}).value?.trim() || '';
        const email = (contactForm.querySelector('#cemail') || {}).value?.trim() || '';
        const message = (contactForm.querySelector('#cmessage') || {}).value?.trim() || '';
        if (!name || !email || !message) {
          formStatus.textContent = 'Please complete your name, email and message.';
          formStatus.style.color = '#c2410c';
          return;
        }

        // Disable inputs while sending
        const submitBtn = contactForm.querySelector('button[type="submit"]');
        const inputs = contactForm.querySelectorAll('input, textarea, select, button');
        inputs.forEach(i => i.disabled = true);
        formStatus.textContent = 'Sending…';
        formStatus.style.color = '';

        try {
          const payload = {
            name,
            email,
            phone: (contactForm.querySelector('#cphone') || {}).value?.trim() || '',
            service: (contactForm.querySelector('#cservice') || {}).value || '',
            message
          };
          const res = await fetch('/api/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            credentials: 'same-origin'
          });
          const json = await res.json();
          if (res.ok) {
            formStatus.textContent = 'Thanks — your enquiry was sent. We will respond shortly.';
            formStatus.style.color = '';
            contactForm.reset();
          } else {
            formStatus.textContent = json.error || 'Failed to send — please try again later.';
            formStatus.style.color = '#c2410c';
            console.warn('Contact error', json);
          }
        } catch (err) {
          formStatus.textContent = 'Network error — please try again later.';
          formStatus.style.color = '#c2410c';
          console.error('Send error', err);
        } finally {
          // re-enable after a short delay to avoid double sends
          setTimeout(() => inputs.forEach(i => i.disabled = false), 600);
        }
      });
    }

    // Insert current year into any #year nodes
    $$('[id="year"]').forEach(el => { el.textContent = new Date().getFullYear(); });

    // Performance note: remove parallax on small devices for smoother scroll
    const handleResize = debounce(() => {
      if (window.innerWidth < 680 && heroParallax) {
        heroParallax.style.transform = 'translateY(0)';
      }
    }, 120);
    window.addEventListener('resize', handleResize);
  });
})();
