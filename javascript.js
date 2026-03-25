(function() {
    'use strict';

    function initFootnotesTooltip() {
        if (document.querySelector('.footnote-tooltip-container')) return null;

        const TOOLTIP_CONTAINER_CLASS = 'footnote-tooltip-container';
        const FOOTNOTE_LINK_SELECTOR = '.wp-block-footnotes a, sup.wp-block-footnote a, a[href^="#"]';
        const CLOSE_BUTTON_CLASS = 'close-tooltip';
        const OVERLAY_CLASS = 'tooltip-overlay';
        const ID_PREFIX = 'tt-';

        const tooltip = document.createElement('div');
        tooltip.className = TOOLTIP_CONTAINER_CLASS;
        tooltip.setAttribute('role', 'dialog');
        tooltip.setAttribute('aria-modal', 'true');
        tooltip.setAttribute('aria-label', 'Footnote content');
        document.body.appendChild(tooltip);

        const overlay = document.createElement('div');
        overlay.className = OVERLAY_CLASS;
        document.body.appendChild(overlay);

        const mobileQuery = window.matchMedia('(max-width: 768px)');
        let currentActiveLink = null;
        let rafId = null;

        function getCssValue(variable, defaultValue) {
            const style = getComputedStyle(tooltip);
            const value = style.getPropertyValue(variable).trim() || defaultValue;
            return parseInt(value, 10);
        }

        function transformIdsAndLinks(element) {
            if (!element) return;
            if (element.id) element.id = ID_PREFIX + element.id;
            element.querySelectorAll('[id]').forEach(el => {
                el.id = ID_PREFIX + el.id;
            });

            const internalLinks = element.querySelectorAll('a[href^="#"]');
            internalLinks.forEach(link => {
                const href = link.getAttribute('href');
                if (href && href.length > 1) {
                    link.setAttribute('href', '#' + ID_PREFIX + href.substring(1));
                }
            });
        }

        function positionTooltip(linkElement) {
            if (mobileQuery.matches || !linkElement) {
                tooltip.style.top = '';
                tooltip.style.left = '';
                tooltip.style.transform = '';
                return;
            }
            
            const margin = getCssValue('--tooltip-margin', '15px');
            const offset = getCssValue('--tooltip-offset', '15px');
            const linkRect = linkElement.getBoundingClientRect();
            const tooltipRect = tooltip.getBoundingClientRect();
            
            let top = linkRect.top + window.scrollY - tooltipRect.height - offset;
            let left = linkRect.left + window.scrollX + (linkRect.width / 2) - (tooltipRect.width / 2);

            if (top < window.scrollY + margin) {
                top = linkRect.bottom + window.scrollY + offset;
            }

            const minLeft = window.scrollX + margin;
            const maxLeft = window.innerWidth + window.scrollX - tooltipRect.width - margin;
            left = Math.max(minLeft, Math.min(left, maxLeft));

            tooltip.style.top = Math.round(top) + 'px';
            tooltip.style.left = Math.round(left) + 'px';
            tooltip.style.transform = 'none';
        }

        function updateTooltipPosition() {
            if (!tooltip.classList.contains('visible') || !currentActiveLink) return;
            if (rafId) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => {
                positionTooltip(currentActiveLink);
                rafId = null;
            });
        }

        function cleanupTooltipContent() {
            // [Added] Re-check visibility to prevent accidental deletion during rapid interaction
            if (tooltip.classList.contains('visible')) return;
            while (tooltip.firstChild) {
                tooltip.removeChild(tooltip.firstChild);
            }
        }

        function hideTooltip() {
            if (!tooltip.classList.contains('visible')) return;
            tooltip.classList.remove('visible');
            overlay.classList.remove('visible');
            
            if (currentActiveLink) {
                currentActiveLink.setAttribute('aria-expanded', 'false');
                currentActiveLink.focus();
                currentActiveLink = null;
            }
            setTimeout(cleanupTooltipContent, 300);
        }

        function showTooltip(linkElement) {
            const href = linkElement.getAttribute('href');
            const targetId = href ? href.substring(1) : null;
            if (!targetId) return;

            const source = document.getElementById(targetId);

            if (source && (source.closest('.wp-block-footnotes') || linkElement.closest('sup'))) {
                if (tooltip.classList.contains('visible') && currentActiveLink === linkElement) {
                    hideTooltip();
                    return;
                }

                // [Added] Ensure container is empty before appending new content
                while (tooltip.firstChild) tooltip.removeChild(tooltip.firstChild);

                const clone = source.cloneNode(true);
                transformIdsAndLinks(clone);

                const backRefs = clone.querySelectorAll('.footnote-backref, .footnote-return, a[href*="-link"], a[href^="#fnref"]');
                backRefs.forEach(ref => ref.remove());

                tooltip.appendChild(clone);
                
                const closeBtn = document.createElement('button');
                closeBtn.className = CLOSE_BUTTON_CLASS;
                closeBtn.textContent = 'Close';
                closeBtn.setAttribute('aria-label', 'Close tooltip');
                closeBtn.onclick = (e) => { e.stopPropagation(); hideTooltip(); }; // [Fixed] Stop propagation
                tooltip.appendChild(closeBtn);

                currentActiveLink = linkElement;
                linkElement.setAttribute('aria-expanded', 'true');
                tooltip.classList.add('visible');
                overlay.classList.add('visible');

                positionTooltip(linkElement);
                tooltip.setAttribute('tabindex', '-1');
                tooltip.focus();
            }
        }

        overlay.addEventListener('touchmove', (e) => {
            if (e.touches.length < 2) e.preventDefault();
        }, { passive: false });
        
        const handleClick = (e) => {
            const link = e.target.closest(FOOTNOTE_LINK_SELECTOR);
            const closeBtn = e.target.closest(`.${CLOSE_BUTTON_CLASS}`);

            if (tooltip.contains(e.target) && e.target.tagName === 'A' && !closeBtn) return; 

            if (closeBtn) {
                e.preventDefault();
                hideTooltip();
            } else if (link) {
                const href = link.getAttribute('href');
                if (href && href.startsWith('#') && document.getElementById(href.substring(1))) {
                    e.preventDefault();
                    showTooltip(link);
                }
            } else if (!tooltip.contains(e.target)) {
                hideTooltip();
            }
        };

        const handleKeydown = (e) => {
            if (!tooltip.classList.contains('visible')) return;
            if (e.key === 'Escape') hideTooltip();
            if (e.key === 'Tab') {
                const focusable = tooltip.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
                if (focusable.length === 0) { e.preventDefault(); return; }
                const first = focusable[0], last = focusable[focusable.length - 1];
                if (e.shiftKey && document.activeElement === first) { 
                    last.focus(); e.preventDefault(); 
                } else if (!e.shiftKey && document.activeElement === last) { 
                    first.focus(); e.preventDefault(); 
                }
            }
        };

        document.addEventListener('click', handleClick);
        document.addEventListener('keydown', handleKeydown);
        window.addEventListener('scroll', updateTooltipPosition, { passive: true });
        window.addEventListener('resize', updateTooltipPosition, { passive: true });

        return function cleanup() {
            document.removeEventListener('click', handleClick);
            document.removeEventListener('keydown', handleKeydown);
            window.removeEventListener('scroll', updateTooltipPosition);
            window.removeEventListener('resize', updateTooltipPosition);
            if (rafId) cancelAnimationFrame(rafId);
            tooltip.remove();
            overlay.remove();
        };
    }

    let cleanup = initFootnotesTooltip();

    const observer = new MutationObserver(() => {
        if (!document.querySelector('.footnote-tooltip-container')) {
            if (typeof cleanup === 'function') cleanup();
            cleanup = initFootnotesTooltip();
        }
    });
    observer.observe(document.body, { childList: true, subtree: false });

    window.addEventListener('pagehide', () => {
        if (typeof cleanup === 'function') cleanup();
    }, { once: true });
})();