class PageNavigation {
    constructor() {
        this.sections = Array.from(document.querySelectorAll('.section, #start'));
        this.threads = Array.from(document.querySelectorAll('.thread'));
        this.scrollContainer = document.querySelector('.col-8');
        this.onThreadChange = null;
        
        this.initializeNodes();
        this.initializeScrollListener();
        
        // Set initial state
        this.activateNodeFromSection(this.sections[0]);
    }

    initializeNodes() {
        document.querySelectorAll('.mini-node').forEach(node => {
            node.addEventListener('click', () => this.activateNode(node));
        });
    }

    initializeScrollListener() {
        let ticking = false;
        this.scrollContainer.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    this.handleScroll();
                    ticking = false;
                });
                ticking = true;
            }
        });
    }

    handleScroll() {
        const sections = this.sections;
        let maxVisibleSection = null;
        let maxVisibleAmount = 0;
        
        sections.forEach(section => {
            const rect = section.getBoundingClientRect();
            const visibleHeight = Math.min(rect.bottom, window.innerHeight) - 
                                Math.max(rect.top, 0);
            
            if (visibleHeight > maxVisibleAmount) {
                maxVisibleAmount = visibleHeight;
                maxVisibleSection = section;
            }
        });
        
        if (maxVisibleSection) {
            this.activateNodeFromSection(maxVisibleSection);
        }
    }

    activateNodeFromSection(section) {
        const parentThread = section.closest('.thread');
        
        if (parentThread) {
            this.threads.forEach(thread => {
                thread.classList.toggle('active', thread === parentThread);
            });
        }

        const threadId = parentThread ? parentThread.id : section.id;
        const node = document.querySelector(`[data-section="${threadId}"]`);
                
        if (node) {
            this.activateNode(node, false);
        }
    }

    activateNode(node, shouldScroll = true) {
        // Update minimap UI
        document.querySelectorAll('.mini-node.active')
            .forEach(n => n.classList.remove('active'));
        node.classList.add('active');
        
        if (shouldScroll) {
            const threadId = node.dataset.section;
            const thread = document.getElementById(threadId);
            
            if (thread) {
                // Deactivate all threads first
                this.threads.forEach(t => t.classList.remove('active'));
                // Activate the selected thread
                thread.classList.add('active');
                
                // Call the visualization callback
                if (this.onThreadChange) {
                    this.onThreadChange(threadId);
                }
                
                // Scroll to thread
                const scrollOffset = thread.offsetTop;
                this.scrollContainer.scrollTo({
                    top: scrollOffset,
                    behavior: 'smooth'
                });
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new PageNavigation();
});
