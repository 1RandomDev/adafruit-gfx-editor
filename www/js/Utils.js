export class Utils {
    static rgb888ToRgb565(color) {
        const r = (color >> 16) & 0xFF;
        const g = (color >> 8)  & 0xFF;
        const b =  color        & 0xFF;

        return ((r & 0xF8) << 8) | 
            ((g & 0xFC) << 3) | 
            (b >> 3);
    }
    static rgb565ToRgb888(color) {
        const r = (color >> 11) & 0x1F;
        const g = (color >> 5)  & 0x3F;
        const b =  color        & 0x1F;

        const r8 = (r << 3) | (r >> 2);
        const g8 = (g << 2) | (g >> 4);
        const b8 = (b << 3) | (b >> 2);

        return (r8 << 16) | 
            (g8 << 8)  | 
            b8;
    }
    static formatHex(val, length) {
        return val.toString(16).toUpperCase().padStart(length, '0');
    }
    static colorCloseToWhite(color, threshold = 200) {
        return ((color >> 16) & 0xFF) > threshold &&
               ((color >> 8)  & 0xFF) > threshold &&
                (color        & 0xFF) > threshold;
    }

    static makeDraggable(element) {
        let isDragging = false;
        let startX, startY;

        const parent = element.parentElement;
        parent.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX + parent.scrollLeft;
            startY = e.clientY + parent.scrollTop;
        });
        parent.addEventListener('mousemove', (e) => {
            if(isDragging) {
                parent.scrollLeft = startX - e.clientX;
                parent.scrollTop = startY - e.clientY;
            }
        });
        parent.addEventListener('mouseup', () => isDragging = false);
        parent.addEventListener('mouseleave', () => isDragging = false);
    }
    static makeCopyButton(element, target) {
        element.addEventListener('click', () => {
            if(element.dataset.copying) return;
            element.dataset.copying = true;
            navigator.clipboard.writeText(target.innerText);

            const originalContent = element.innerHTML;
            element.innerHTML = 'Copied!';
            setTimeout(() => {
                element.innerHTML = originalContent;
                delete element.dataset.copying;
            }, 2000);
        });
    }

    static downloadFile(content, filename, type) {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
    static requestFileUpload(cb, types) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = types;
        input.click();
        input.onchange = event => {
            const file = event.target.files[0]; 
            const reader = new FileReader();
            reader.readAsText(file, 'UTF-8');
            reader.onload = readerEvent => {
                cb(readerEvent.target.result);
            }
        };
    }
    static showToast(data) {
        let toastElement = document.createElement('template');
        toastElement.innerHTML =
            `<div class="toast align-items-center border-0 mb-2 text-bg-${data.type || 'secondary'}">
                <div class="d-flex">
                    <div class="toast-body">
                        ${data.message}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>`;
        toastElement = toastElement.content.firstChild;
        if(data.width) toastElement.style.width = data.width;
        toastElement.addEventListener('hidden.bs.toast', () => toastElement.remove());
        document.getElementById('toastContainer').appendChild(toastElement);
        new bootstrap.Toast(toastElement).show();
    }
}
