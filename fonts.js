// fonts.js
(function() {
    // Загружаем шрифт Noto Sans
    const font = 'AAEAAAASAQAABAAgRk...'; // Здесь должен быть base64-encoded шрифт
    window.pdfFont = font;
    
    // Добавляем шрифт в jsPDF при загрузке страницы
    document.addEventListener('DOMContentLoaded', function() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.addFileToVFS('NotoSans-normal.ttf', window.pdfFont);
        doc.addFont('NotoSans-normal.ttf', 'NotoSans', 'normal');
    });
})();