// Form Editor using pdf-lib
class FormEditor {
    constructor() {
        this.annotations = [];
        this.isTextMode = false;
        this.currentTextPosition = null;
        this.annotationLayer = document.getElementById('annotationLayer');
    }
    
    enableTextMode() {
        this.isTextMode = true;
        document.getElementById('pdfCanvas').style.cursor = 'crosshair';
        alert('Click on the PDF where you want to add text');
    }
    
    showTextInput(x, y) {
        this.currentTextPosition = { x, y };
        document.getElementById('textInput').style.display = 'flex';
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
        const annotation = {
            type: 'text',
            text: text,
            x: x,
            y: y,
            id: Date.now()
        };
        
        this.annotations.push(annotation);
        this.renderAnnotation(annotation);
    }
    
    addCheckbox() {
        // Add checkbox at center of page
        const canvas = document.getElementById('pdfCanvas');
        const x = canvas.width / 2;
        const y = canvas.height / 2;
        
        const annotation = {
            type: 'checkbox',
            checked: false,
            x: x,
            y: y,
            id: Date.now()
        };
        
        this.annotations.push(annotation);
        this.renderAnnotation(annotation);
    }
    
    renderAnnotation(annotation) {
        const element = document.createElement('div');
        element.className = 'annotation-item';
        element.dataset.id = annotation.id;
        element.style.left = annotation.x + 'px';
        element.style.top = annotation.y + 'px';
        
        if (annotation.type === 'text') {
            element.className += ' text-annotation';
            element.textContent = annotation.text;
            element.contentEditable = true;
            
            // Update annotation text on blur
            element.addEventListener('blur', (e) => {
                const annot = this.annotations.find(a => a.id === annotation.id);
                if (annot) {
                    annot.text = e.target.textContent.trim();
                }
            });
        } else if (annotation.type === 'checkbox') {
            element.className += ' checkbox-annotation';
            if (annotation.checked) {
                element.classList.add('checked');
            }
            
            // Toggle checkbox on click
            element.addEventListener('click', () => {
                annotation.checked = !annotation.checked;
                element.classList.toggle('checked');
            });
        }
        
        // Make draggable
        this.makeDraggable(element, annotation);
        
        // Add delete on long press
        let pressTimer;
        element.addEventListener('touchstart', () => {
            pressTimer = setTimeout(() => {
                if (confirm('Delete this annotation?')) {
                    this.removeAnnotation(annotation.id);
                }
            }, 800);
        });
        
        element.addEventListener('touchend', () => {
            clearTimeout(pressTimer);
        });
        
        this.annotationLayer.appendChild(element);
    }
    
    makeDraggable(element, annotation) {
        let isDragging = false;
        let startX, startY, initialX, initialY;
        
        element.addEventListener('mousedown', startDrag);
        element.addEventListener('touchstart', startDrag);
        
        function startDrag(e) {
            if (e.target.contentEditable === 'true' && e.type === 'mousedown') {
                return; // Don't drag when editing text
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
        }
        
        function drag(e) {
            if (!isDragging) return;
            e.preventDefault();
            
            const touch = e.touches ? e.touches[0] : e;
            const dx = touch.clientX - startX;
            const dy = touch.clientY - startY;
            
            annotation.x = initialX + dx;
            annotation.y = initialY + dy;
            
            element.style.left = annotation.x + 'px';
            element.style.top = annotation.y + 'px';
        }
        
        function stopDrag() {
            isDragging = false;
            document.removeEventListener('mousemove', drag);
            document.removeEventListener('touchmove', drag);
            document.removeEventListener('mouseup', stopDrag);
            document.removeEventListener('touchend', stopDrag);
        }
    }
    
    removeAnnotation(id) {
        this.annotations = this.annotations.filter(a => a.id !== id);
        const element = this.annotationLayer.querySelector(`[data-id="${id}"]`);
        if (element) {
            element.remove();
        }
    }
    
    clearAll() {
        this.annotations = [];
        this.annotationLayer.innerHTML = '';
    }
    
    async applyAnnotationsToPDF(pdfBytes) {
        try {
            // Load PDF with pdf-lib
            const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
            const pages = pdfDoc.getPages();
            const firstPage = pages[0];
            const { width, height } = firstPage.getSize();
            
            // Get canvas dimensions for scaling
            const canvas = document.getElementById('pdfCanvas');
            const scaleX = width / canvas.width;
            const scaleY = height / canvas.height;
            
            // Apply annotations
            for (const annotation of this.annotations) {
                const x = annotation.x * scaleX;
                const y = height - (annotation.y * scaleY); // PDF coordinates are bottom-up
                
                if (annotation.type === 'text') {
                    firstPage.drawText(annotation.text, {
                        x: x,
                        y: y,
                        size: 12,
                        color: PDFLib.rgb(0, 0, 0)
                    });
                } else if (annotation.type === 'checkbox' && annotation.checked) {
                    // Draw checkmark
                    firstPage.drawText('✓', {
                        x: x,
                        y: y,
                        size: 20,
                        color: PDFLib.rgb(0, 0.5, 0)
                    });
                }
            }
            
            // Save modified PDF
            const modifiedPdfBytes = await pdfDoc.save();
            return modifiedPdfBytes;
        } catch (error) {
            console.error('Error applying annotations:', error);
            throw error;
        }
    }
}