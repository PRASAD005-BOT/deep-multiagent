// Simple Wikipedia-style website functionality

document.addEventListener('DOMContentLoaded', function() {
    // Smooth scrolling for anchor links
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                const headerOffset = 80;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                
                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Search functionality (demo)
    const searchInput = document.querySelector('.search input');
    const searchButton = document.querySelector('.search button');
    
    function performSearch() {
        const query = searchInput.value.trim().toLowerCase();
        
        if (query) {
            // Simple highlight functionality
            const content = document.querySelector('.main-content');
            const textNodes = getTextNodes(content);
            
            // Remove previous highlights
            removeHighlights();
            
            if (query.length > 2) {
                let found = false;
                textNodes.forEach(node => {
                    const text = node.textContent.toLowerCase();
                    if (text.includes(query)) {
                        highlightText(node, query);
                        found = true;
                    }
                });
                
                if (found) {
                    // Scroll to first highlight
                    const firstHighlight = document.querySelector('.highlight');
                    if (firstHighlight) {
                        firstHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                } else {
                    alert('No results found for: ' + query);
                }
            }
        }
    }
    
    searchButton.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
    
    // Helper function to get all text nodes
    function getTextNodes(element) {
        const textNodes = [];
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        
        let node;
        while (node = walker.nextNode()) {
            if (node.parentElement.tagName !== 'SCRIPT' && 
                node.parentElement.tagName !== 'STYLE') {
                textNodes.push(node);
            }
        }
        
        return textNodes;
    }
    
    // Highlight text function
    function highlightText(textNode, query) {
        const span = document.createElement('span');
        span.className = 'highlight';
        span.style.backgroundColor = '#ffeb3b';
        span.style.padding = '2px 0';
        
        const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
        const parts = textNode.textContent.split(regex);
        
        const fragment = document.createDocumentFragment();
        parts.forEach((part, index) => {
            if (part.toLowerCase() === query.toLowerCase()) {
                const highlight = span.cloneNode();
                highlight.textContent = part;
                fragment.appendChild(highlight);
            } else {
                fragment.appendChild(document.createTextNode(part));
            }
        });
        
        textNode.parentNode.replaceChild(fragment, textNode);
    }
    
    // Remove highlights
    function removeHighlights() {
        const highlights = document.querySelectorAll('.highlight');
        highlights.forEach(highlight => {
            const parent = highlight.parentNode;
            parent.replaceChild(document.createTextNode(highlight.textContent), highlight);
            parent.normalize();
        });
    }
    
    // Escape special regex characters
    function escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    // Active section highlighting in sidebar
    const sections = document.querySelectorAll('.section');
    const sidebarLinks = document.querySelectorAll('.sidebar a');
    
    function updateActiveLink() {
        let current = '';
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (window.pageYOffset >= sectionTop - 100) {
                current = section.getAttribute('id');
            }
        });
        
        sidebarLinks.forEach(link => {
            link.style.fontWeight = 'normal';
            link.style.color = '#2c5aa0';
            if (link.getAttribute('href') === '#' + current) {
                link.style.fontWeight = 'bold';
                link.style.color = '#1e3d6f';
            }
        });
    }
    
    window.addEventListener('scroll', updateActiveLink);
    updateActiveLink();
});
