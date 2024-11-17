class PageNavigation {
    constructor() {
        this.currentLayout = 'graph';
        this.initializeNodes();
        this.initializeLayoutToggles();
        this.initializeScrollListener();
        this.initializeKeyboardNavigation();
        
        // Start in graph view
        this.switchLayout('graph');
    }

    initializeNodes() {
        // Add click handlers to all nodes and subnodes
        document.querySelectorAll('.mini-node, .mini-subnode').forEach(node => {
            node.addEventListener('click', () => this.activateNode(node));
        });
    }

    initializeLayoutToggles() {
        document.querySelectorAll('.layout-toggle').forEach(button => {
            button.addEventListener('click', () => {
                const layout = button.dataset.layout;
                this.switchLayout(layout);
            });
        });
    }

    switchLayout(layout) {
        this.currentLayout = layout;
        document.body.classList.remove('layout-vertical', 'layout-graph');
        document.body.classList.add(`layout-${layout}`);

        // Update toggle buttons
        document.querySelectorAll('.layout-toggle').forEach(button => {
            button.classList.toggle('active', button.dataset.layout === layout);
        });

        // Show/hide keyboard navigation hint
        const keyboardHint = document.querySelector('.keyboard-hint');
        if (keyboardHint) {
            keyboardHint.style.display = layout === 'graph' ? 'block' : 'none';
        }
    }

    initializeKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            if (this.currentLayout !== 'graph') return;

            switch(e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    this.navigateToParent();
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.navigateToChild();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.navigateToSibling(-1);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.navigateToSibling(1);
                    break;
            }
        });
    }

    activateNode(node) {
        if (!node) return;
        
        // Remove active class from all nodes and branches
        document.querySelectorAll('.mini-node.active, .mini-subnode.active, .branch.active')
            .forEach(n => n.classList.remove('active'));
        
        // Add active class to clicked node
        node.classList.add('active');
        
        // If it's a node, activate its branch
        if (node.classList.contains('mini-node')) {
            const branch = node.closest('.branch');
            if (branch) branch.classList.add('active');
        }
        
        // If it's a subnode, activate its parent node and branch
        if (node.classList.contains('mini-subnode')) {
            const branch = node.closest('.branch');
            if (branch) {
                branch.classList.add('active');
                const parentNode = branch.querySelector('.mini-node');
                if (parentNode) parentNode.classList.add('active');
            }
        }

        this.navigateToSection(node.dataset.section);
    }

    navigateToSection(section) {
        if (!section) return;

        // Hide all threads
        document.querySelectorAll('.thread').forEach(thread => {
            thread.classList.remove('active');
        });

        // Show the selected thread
        const targetThread = document.querySelector(`#${section}`);
        if (targetThread) {
            targetThread.classList.add('active');
        }

        // Scroll to the section if needed
        const targetSection = document.querySelector(`[data-section="${section}"]`);
        if (targetSection) {
            targetSection.scrollIntoView({ behavior: 'smooth' });
        }
    }

    initializeScrollListener() {
        // Optional: Add scroll behavior if needed
        window.addEventListener('scroll', () => {
            // Add your scroll handling logic here
        });
    }

    // ... keep other navigation methods ...
}
