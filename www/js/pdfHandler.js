pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

class PDFHandler {
    constructor() {
        this.pdfDoc = null;
        this.currentPage = 1;
        this.scale = 1.0;
        this.minScale = 1.0;
        this.maxScale = 3.5; // 1.0 + (0.5 * 5) = 3.5
        this.zoomStep = 0.5;
        this.canvas = null;
        this.ctx = null;
        this.pdfBytes = null;
        this.formEditor = null;
        this.canvasContainer = null;
        this.isRendering = false;
    }

    setFormEditor(editor) {
        this.formEditor = editor;
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
            
            console.log('PDF loaded. Pages:', this.pdfDoc.numPages);
            this.currentPage = 1;
            this.scale = this.minScale;
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
        if (this.isRendering) {
            console.log('Already rendering, skipping...');
            return;
        }

        try {
            this.isRendering = true;
            
            if (!this.canvas) {
                this.canvas = document.getElementById('pdfCanvas');
                this.ctx = this.canvas.getContext('2d');
            }
            
            console.log('Rendering page', pageNum, 'at scale', this.scale);
            
            const page = await this.pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: this.scale });
            
            // Store scroll position
            const scrollLeft = this.canvasContainer ? this.canvasContainer.scrollLeft : 0;
            const scrollTop = this.canvasContainer ? this.canvasContainer.scrollTop : 0;
            
            this.canvas.width = viewport.width;
            this.canvas.height = viewport.height;
            
            // Clear canvas
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Render PDF
            await page.render({
                canvasContext: this.ctx,
                viewport: viewport
            }).promise;
            
            // Restore scroll position
            if (this.canvasContainer) {
                this.canvasContainer.scrollLeft = scrollLeft;
                this.canvasContainer.scrollTop = scrollTop;
            }
            
            document.getElementById('pageInfo').textContent = 
                `Page ${pageNum} of ${this.pdfDoc.numPages}`;
            
            // Update annotations after a short delay
            setTimeout(() => {
                if (this.formEditor) {
                    this.formEditor.setPage(pageNum);
                }
            }, 100);
            
            this.isRendering = false;
            console.log('Page rendered successfully at scale:', this.scale);
        } catch (error) {
            this.isRendering = false;
            console.error('Error rendering page:', error);
            throw error;
        }
    }

    previousPage() {
        if (this.currentPage > 1 && !this.isRendering) {
            this.currentPage--;
            this.renderPage(this.currentPage);
        }
    }

    nextPage() {
        if (this.currentPage < this.pdfDoc.numPages && !this.isRendering) {
            this.currentPage++;
            this.renderPage(this.currentPage);
        }
    }

    zoomIn() {
        if (this.isRendering) {
            console.log('Currently rendering, please wait');
            return;
        }
        
        const newScale = this.scale + this.zoomStep;
        
        if (newScale <= this.maxScale) {
            this.scale = newScale;
            console.log('Zooming in to scale:', this.scale);
            this.renderPage(this.currentPage);
        } else {
            console.log('Already at max zoom:', this.maxScale);
            alert('Maximum zoom reached');
        }
    }

    zoomOut() {
        if (this.isRendering) {
            console.log('Currently rendering, please wait');
            return;
        }
        
        const newScale = this.scale - this.zoomStep;
        
        if (newScale >= this.minScale) {
            this.scale = newScale;
            console.log('Zooming out to scale:', this.scale);
            this.renderPage(this.currentPage);
        } else {
            console.log('Already at min zoom:', this.minScale);
            alert('Minimum zoom reached');
        }
    }
}

console.log('pdfHandler.js loaded');
