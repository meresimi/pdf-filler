class FormEditor {
    constructor() {
        this.annotationsByPage = {};
        this.currentPage = 1;
        this.isTextMode = false;
        this.currentTextPosition = null;
        this.annotationLayer = null;
        this.initialized = false;
    }

    initialize() {
        this.annotationLayer = document.getElementById('annotationLayer');
        this.initialized = true;
        console.log('FormEditor initialized');
    }

    setPage(pageNum) {
        this.currentPage = pageNum;
        this.refreshAnnotationLayer();
    }

    refreshAnnotationLayer() {
        if (!this.initialized) this.initialize();

        this.annotationLayer = document.getElementById('annotationLayer');
        if (!this.annotationLayer) {
            console.error('Annotation layer not found');
            return;
        }

        this.annotationLayer.innerHTML = '';

        const pageAnnotations = this.annotationsByPage[this.currentPage] || [];
        pageAnnotations.forEach(annotation => {
            this.renderAnnotation(annotation);
        });
    }

    enableTextMode() {
        this.isTextMode = true;
        document.getElementById('pdfCanvas').style.cursor = 'crosshair';
        alert('Click on the PDF where you want to add text');
    }

    showTextInput(x, y) {
        this.currentTextPosition = { x, y };
        const textInputPanel = document.getElementById('textInput');
        textInputPanel.style.display = 'block';
        document.getElementById('textField').focus();
    }

    confirmText() {
        const text = document.getElementById('textField').value.trim();
        if (text) {
            this.addTextAnnotation(text, this.currentTextPosition.x, this.currentTextPosition.y);
            this.cancelText();
        }
    }

    cancelText() {
        this.isTextMode = false;
        document.getElementById('pdfCanvas').style.cursor = 'default';
        document.getElementById('textInput').style.display = 'none';
        document.getElementById('textField').value = '';
        this.currentTextPosition = null;
    }

    addTextAnnotation(text, x, y) {
        if (!this.initialized) this.initialize();

        const annotation = {
            type: 'text',
            text: text,
            x: x,
            y: y,
            page: this.currentPage,
            id: Date.now(),
            locked: true,
            fontSize: 12,
            color: '#000000'
        };

        if (!this.annotationsByPage[this.currentPage]) {
            this.annotationsByPage[this.currentPage] = [];
        }
        this.annotationsByPage[this.currentPage].push(annotation);
        this.renderAnnotation(annotation);
    }

    addCheckbox() {
        if (!this.initialized) this.initialize();

        const canvas = document.getElementById('pdfCanvas');
        if (!canvas) {
            alert('Please load a PDF first');
            return;
        }

        const rect = canvas.getBoundingClientRect();
        const x = rect.width / 2;
        const y = rect.height / 2;

        const annotation = {
            type: 'checkbox',
            checked: false,
            x: x,
            y: y,
            page: this.currentPage,
            id: Date.now(),
            locked: true
        };

        if (!this.annotationsByPage[this.currentPage]) {
            this.annotationsByPage[this.currentPage] = [];
        }
        this.annotationsByPage[this.currentPage].push(annotation);
        this.renderAnnotation(annotation);

        console.log('Checkbox added at', x, y);
    }

    renderAnnotation(annotation) {
        if (!this.annotationLayer) {
            console.error('Cannot render - annotation layer not ready');
            return;
        }

        const element = document.createElement('div');
        element.className = 'annotation-item';
        element.dataset.id = annotation.id;
        element.style.left = annotation.x + 'px';
        element.style.top = annotation.y + 'px';

        // Add locked state if not exists
        if (annotation.locked === undefined) {
            annotation.locked = true;
        }

        if (annotation.type === 'text') {
            element.className += ' text-annotation';
            element.textContent = annotation.text;
            
            // Set contentEditable based on locked state
            element.contentEditable = !annotation.locked;
            
            if (annotation.locked) {
                element.classList.add('locked');
            }

            // Handle click to unlock/lock
            element.addEventListener('click', (e) => {
                if (annotation.locked) {
                    // Unlock on first click
                    annotation.locked = false;
                    element.contentEditable = true;
                    element.classList.remove('locked');
                    element.classList.add('editable');
                    element.focus();
                    e.stopPropagation();
                }
            });

            // Lock when clicking outside
            element.addEventListener('blur', (e) => {
                annotation.text = e.target.textContent.trim();
                annotation.locked = true;
                element.contentEditable = false;
                element.classList.remove('editable');
                element.classList.add('locked');
            });
            
        } else if (annotation.type === 'checkbox') {
            element.className += ' checkbox-annotation';
            
            if (annotation.locked === undefined) {
                annotation.locked = true;
            }
            
            if (annotation.locked) {
                element.classList.add('locked');
            }
            
            if (annotation.checked) {
                element.classList.add('checked');
                element.textContent = '✓';
            } else {
                element.textContent = '';
            }

            element.addEventListener('click', (e) => {
                if (annotation.locked) {
                    // Unlock on first click
                    annotation.locked = false;
                    element.classList.remove('locked');
                    element.classList.add('editable');
                } else {
                    // Toggle checkbox when unlocked
                    annotation.checked = !annotation.checked;
                    if (annotation.checked) {
                        element.classList.add('checked');
                        element.textContent = '✓';
                    } else {
                        element.classList.remove('checked');
                        element.textContent = '';
                    }
                }
                e.stopPropagation();
            });
        }

        // Make draggable only when unlocked
        this.makeDraggable(element, annotation);
        this.annotationLayer.appendChild(element);
    }

    makeDraggable(element, annotation) {
        let isDragging = false;
        let startX, startY, initialX, initialY;

        const startDrag = (e) => {
            // Don't drag if locked
            if (annotation.locked) {
                return;
            }
            
            if (e.target.contentEditable === 'true' && e.type === 'mousedown') {
                return;
            }

            isDragging = true;
            const touch = e.touches ? e.touches[0] : e;
            startX = touch.clientX;
            startY = touch.clientY;
            initialX = annotation.x;
            initialY = annotation.y;

            document.addEventListener('mousemove', drag);
            document.addEventListener('touchmove', drag);
            document.addEventListener('mouseup', stopDrag);
            document.addEventListener('touchend', stopDrag);
        };

        const drag = (e) => {
            if (!isDragging || annotation.locked) return;
            e.preventDefault();

            const touch = e.touches ? e.touches[0] : e;
            const dx = touch.clientX - startX;
            const dy = touch.clientY - startY;

            annotation.x = initialX + dx;
            annotation.y = initialY + dy;

            element.style.left = annotation.x + 'px';
            element.style.top = annotation.y + 'px';
        };

        const stopDrag = () => {
            isDragging = false;
            document.removeEventListener('mousemove', drag);
            document.removeEventListener('touchmove', drag);
            document.removeEventListener('mouseup', stopDrag);
            document.removeEventListener('touchend', stopDrag);
        };

        element.addEventListener('mousedown', startDrag);
        element.addEventListener('touchstart', startDrag);
    }

    clearAll() {
        if (confirm('Clear all annotations on ALL pages?')) {
            this.annotationsByPage = {};
            if (this.annotationLayer) {
                this.annotationLayer.innerHTML = '';
            }
        }
    }

    async applyAnnotationsToPDF(pdfBytes) {
        try {
            const { PDFDocument, rgb, StandardFonts } = window.PDFLib;

            const pdfDoc = await PDFDocument.load(pdfBytes);
            const pages = pdfDoc.getPages();
            const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

            for (let pageNum in this.annotationsByPage) {
                const pageIndex = parseInt(pageNum) - 1;
                if (pageIndex < 0 || pageIndex >= pages.length) continue;

                const page = pages[pageIndex];
                const { width, height } = page.getSize();
                const canvas = document.getElementById('pdfCanvas');
                const scaleX = width / canvas.width;
                const scaleY = height / canvas.height;

                const annotations = this.annotationsByPage[pageNum];
                for (const annotation of annotations) {
                    const x = annotation.x * scaleX;
                    const y = height - (annotation.y * scaleY);

                    if (annotation.type === 'text') {
                        page.drawText(annotation.text, {
                            x: x,
                            y: y - 12,
                            size: annotation.fontSize || 12,
                            font: font,
                            color: rgb(0, 0, 0)
                        });
                    } else if (annotation.type === 'checkbox') {
                        // Draw checkbox border
                        page.drawRectangle({
                            x: x,
                            y: y - 20,
                            width: 20,
                            height: 20,
                            borderColor: rgb(0, 0, 0),
                            borderWidth: 2
                        });
                        
                        // Draw checkmark if checked
                        if (annotation.checked) {
                            page.drawText('✓', {
                                x: x + 2,
                                y: y - 16,
                                size: 18,
                                color: rgb(0, 0, 0)
                            });
                        }
                    }
                }
            }

            const modifiedPdfBytes = await pdfDoc.save();
            return modifiedPdfBytes;
        } catch (error) {
            console.error('Error applying annotations:', error);
            throw error;
        }
    }
}

console.log('formEditor.js loaded');
