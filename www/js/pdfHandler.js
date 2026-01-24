pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

class PDFHandler {
    constructor() {
        this.pdfDoc = null;
        this.currentPage = 1;
        this.scale = 1.0; // Start at default zoom (zoom out max)
        this.minScale = 1.0;
        this.maxScale = 2.0;
        this.zoomStep = 0.2; // 5 clicks from min to max: 1.0, 1.2, 1.4, 1.6, 1.8, 2.0
        this.canvas = null;
        this.ctx = null;
        this.pdfBytes = null;
        this.formEditor = null;
        this.canvasContainer = null;
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
            this.scale = this.minScale; // Start at zoom out max
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
        });

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
        });

        this.canvasContainer.addEventListener('touchend', () => {
            isPanning = false;
        });
    }

    async renderPage(pageNum) {
        try {
            if (!this.canvas) {
                this.canvas = document.getElementById('pdfCanvas');
                this.ctx = this.canvas.getContext('2d');
            }
            
            const page = await this.pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: this.scale });
            
            this.canvas.width = viewport.width;
            this.canvas.height = viewport.height;
            
            await page.render({
                canvasContext: this.ctx,
                viewport: viewport
            }).promise;
            
            document.getElementById('pageInfo').textContent = 
                `Page ${pageNum} of ${this.pdfDoc.numPages}`;
            
            if (this.formEditor) {
                this.formEditor.setPage(pageNum);
            }
            
            console.log('Page rendered:', pageNum, 'scale:', this.scale.toFixed(1));
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
        if (this.scale < this.maxScale) {
            this.scale = Math.min(this.maxScale, this.scale + this.zoomStep);
            this.renderPage(this.currentPage);
            console.log('Zoom in, scale:', this.scale.toFixed(1));
        } else {
            console.log('Already at max zoom');
        }
    }

    zoomOut() {
        if (this.scale > this.minScale) {
            this.scale = Math.max(this.minScale, this.scale - this.zoomStep);
            this.renderPage(this.currentPage);
            console.log('Zoom out, scale:', this.scale.toFixed(1));
        } else {
            console.log('Already at min zoom');
        }
    }
}

console.log('pdfHandler.js loaded');
