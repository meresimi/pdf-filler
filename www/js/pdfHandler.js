pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

class PDFHandler {
    constructor() {
        this.pdfDoc = null;
        this.currentPage = 1;
        this.zoomLevel = 0; // 0 to 5
        this.baseScale = 1.0;
        this.scalePerZoom = 0.5;
        this.canvas = null;
        this.ctx = null;
        this.pdfBytes = null;
        this.formEditor = null;
        this.canvasContainer = null;
        this.canvasWrapper = null;
    }

    setFormEditor(editor) {
        this.formEditor = editor;
    }

    getCurrentScale() {
        return this.baseScale + (this.zoomLevel * this.scalePerZoom);
    }

    async loadPDF(file) {
        try {
            console.log('Loading PDF:', file.name);
            
            const arrayBuffer = await file.arrayBuffer();
            this.pdfBytes = new Uint8Array(arrayBuffer);
            
            const loadingTask = pdfjsLib.getDocument({ data: this.pdfBytes });
            this.pdfDoc = await loadingTask.promise;
            
            this.canvas = document.getElementById('pdfCanvas');
            this.ctx = this.canvas.getContext('2d');
            this.canvasContainer = document.getElementById('canvasContainer');
            this.canvasWrapper = this.canvas.parentElement;
            
            console.log('PDF loaded. Pages:', this.pdfDoc.numPages);
            this.currentPage = 1;
            this.zoomLevel = 0;
            await this.renderPage(this.currentPage);
            
            this.setupTouchPan();
            
            return true;
        } catch (error) {
            console.error('Error loading PDF:', error);
            alert('Error loading PDF: ' + error.message);
            throw error;
        }
    }

    setupTouchPan() {
        let isPanning = false;
        let startX = 0;
        let startY = 0;
        let scrollLeft = 0;
        let scrollTop = 0;

        this.canvasContainer.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                isPanning = true;
                startX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                startY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
                scrollLeft = this.canvasContainer.scrollLeft;
                scrollTop = this.canvasContainer.scrollTop;
            }
        }, { passive: false });

        this.canvasContainer.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2 && isPanning) {
                e.preventDefault();
                const currentX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                const currentY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
                
                const dx = currentX - startX;
                const dy = currentY - startY;
                
                this.canvasContainer.scrollLeft = scrollLeft - dx;
                this.canvasContainer.scrollTop = scrollTop - dy;
            }
        }, { passive: false });

        this.canvasContainer.addEventListener('touchend', () => {
            isPanning = false;
        });
    }

    async renderPage(pageNum) {
        try {
            console.log('Rendering page', pageNum, 'zoom level:', this.zoomLevel);
            
            const page = await this.pdfDoc.getPage(pageNum);
            const scale = this.getCurrentScale();
            const viewport = page.getViewport({ scale: scale });
            
            console.log('Viewport size:', viewport.width, 'x', viewport.height, 'at scale:', scale);
            
            // Set canvas size
            this.canvas.width = viewport.width;
            this.canvas.height = viewport.height;
            
            // Clear canvas
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Render PDF
            await page.render({
                canvasContext: this.ctx,
                viewport: viewport
            }).promise;
            
            document.getElementById('pageInfo').textContent = 
                `Page ${pageNum} of ${this.pdfDoc.numPages}`;
            
            // Update annotations
            setTimeout(() => {
                if (this.formEditor) {
                    this.formEditor.setPage(pageNum);
                }
            }, 50);
            
            console.log('Render complete');
        } catch (error) {
            console.error('Error rendering page:', error);
            throw error;
        }
    }

    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.renderPage(this.currentPage);
        }
    }

    nextPage() {
        if (this.currentPage < this.pdfDoc.numPages) {
            this.currentPage++;
            this.renderPage(this.currentPage);
        }
    }

    zoomIn() {
        console.log('Zoom in clicked. Current level:', this.zoomLevel);
        
        if (this.zoomLevel < 5) {
            this.zoomLevel++;
            console.log('New zoom level:', this.zoomLevel, 'Scale:', this.getCurrentScale());
            this.renderPage(this.currentPage);
        } else {
            console.log('Max zoom reached');
            alert('Maximum zoom reached');
        }
    }

    zoomOut() {
        console.log('Zoom out clicked. Current level:', this.zoomLevel);
        
        if (this.zoomLevel > 0) {
            this.zoomLevel--;
            console.log('New zoom level:', this.zoomLevel, 'Scale:', this.getCurrentScale());
            this.renderPage(this.currentPage);
        } else {
            console.log('Min zoom reached');
            alert('Minimum zoom reached');
        }
    }
}

console.log('pdfHandler.js loaded');
