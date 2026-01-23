// PDF Handler using PDF.js
class PDFHandler {
    constructor() {
        this.pdfDoc = null;
        this.pdfBytes = null;
        this.currentPage = 1;
        this.totalPages = 0;
        this.scale = 1.5;
        this.canvas = document.getElementById('pdfCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Configure PDF.js worker
        if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.min.js';
        }
    }
    
    async loadPDF(file) {
        try {
            // Read file as array buffer
            const arrayBuffer = await this.readFileAsArrayBuffer(file);
            this.pdfBytes = new Uint8Array(arrayBuffer);
            
            // Load PDF document
            const loadingTask = pdfjsLib.getDocument({ data: this.pdfBytes });
            this.pdfDoc = await loadingTask.promise;
            this.totalPages = this.pdfDoc.numPages;
            
            // Render first page
            await this.renderPage(this.currentPage);
            this.updatePageInfo();
            
            return true;
        } catch (error) {
            console.error('Error loading PDF:', error);
            throw error;
        }
    }
    
    readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsArrayBuffer(file);
        });
    }
    
    async renderPage(pageNum) {
        try {
            const page = await this.pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: this.scale });
            
            // Set canvas dimensions
            this.canvas.width = viewport.width;
            this.canvas.height = viewport.height;
            
            // Update annotation layer size
            const annotationLayer = document.getElementById('annotationLayer');
            annotationLayer.style.width = viewport.width + 'px';
            annotationLayer.style.height = viewport.height + 'px';
            
            // Render page
            const renderContext = {
                canvasContext: this.ctx,
                viewport: viewport
            };
            
            await page.render(renderContext).promise;
            
            return true;
        } catch (error) {
            console.error('Error rendering page:', error);
            throw error;
        }
    }
    
    async nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            await this.renderPage(this.currentPage);
            this.updatePageInfo();
        }
    }
    
    async previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            await this.renderPage(this.currentPage);
            this.updatePageInfo();
        }
    }
    
    async zoomIn() {
        this.scale += 0.25;
        await this.renderPage(this.currentPage);
        this.updateZoomLevel();
    }
    
    async zoomOut() {
        if (this.scale > 0.5) {
            this.scale -= 0.25;
            await this.renderPage(this.currentPage);
            this.updateZoomLevel();
        }
    }
    
    updatePageInfo() {
        document.getElementById('pageInfo').textContent = 
            `Page ${this.currentPage} of ${this.totalPages}`;
    }
    
    updateZoomLevel() {
        document.getElementById('zoomLevel').textContent = 
            Math.round(this.scale * 100) + '%';
    }
}