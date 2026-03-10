const PDFDocument = require('pdfkit');

/**
 * Generates a No Due Certificate PDF
 * @param {Object} data - Certificate data
 * @param {string} data.studentName - Student's name
 * @param {string} data.admissionNumber - Student's admission number
 * @param {string} data.branch - Student's branch
 * @param {string} data.completedDate - Date when all approvals were completed
 * @param {Array} data.departments - List of department names that approved
 * @returns {PDFDocument} - PDF document stream
 */
function generateNoDueCertificate(data) {
    const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;

    // Colors
    const primaryBlue = '#1976d2';
    const darkBlue = '#0d47a1';
    const greenAccent = '#43a047';

    // Header with college logo placeholder and title
    doc.rect(0, 0, pageWidth, 120).fill(primaryBlue);
    
    // College Name
    doc.fillColor('white')
       .font('Helvetica-Bold')
       .fontSize(18)
       .text('JNTUA College of Engineering Ananthapuramu', 0, 30, {
           align: 'center',
           width: pageWidth
       });
    
    doc.fillColor('white')
       .font('Helvetica')
       .fontSize(11)
       .text('(Autonomous)', 0, 55, {
           align: 'center',
           width: pageWidth
       });
    
    doc.fillColor('white')
       .font('Helvetica')
       .fontSize(10)
       .text('Accredited by NAAC with \'A\' Grade', 0, 70, {
           align: 'center',
           width: pageWidth
       });

    doc.fillColor('white')
       .font('Helvetica-Bold')
       .fontSize(14)
       .text('NO DUES CERTIFICATE', 0, 95, {
           align: 'center',
           width: pageWidth
       });

    // Certificate body
    doc.fillColor('#333')
       .font('Helvetica-Bold')
       .fontSize(16)
       .text('Certificate of No Dues', 0, 160, {
           align: 'center',
           width: pageWidth
       });

    // Decorative line
    doc.moveTo(150, 185).lineTo(pageWidth - 150, 185).strokeColor(greenAccent).lineWidth(2).stroke();

    // Certificate content
    const startY = 220;
    const leftMargin = 70;
    const contentWidth = pageWidth - 140;

    doc.fillColor('#333')
       .font('Helvetica')
       .fontSize(12)
       .text('This is to certify that', leftMargin, startY, {
           align: 'center',
           width: contentWidth
       });

    // Student Name (bold and larger)
    doc.font('Helvetica-Bold')
       .fontSize(16)
       .fillColor(darkBlue)
       .text(data.studentName || 'Student Name', leftMargin, startY + 30, {
           align: 'center',
           width: contentWidth
       });

    // Student details table
    const detailsY = startY + 70;
    
    doc.font('Helvetica')
       .fontSize(12)
       .fillColor('#333');

    // Admission Number
    doc.text('Admission Number:', leftMargin, detailsY);
    doc.font('Helvetica-Bold').text(data.admissionNumber || 'N/A', leftMargin + 150, detailsY);

    // Branch
    doc.font('Helvetica').text('Branch:', leftMargin, detailsY + 25);
    doc.font('Helvetica-Bold').text(data.branch || 'N/A', leftMargin + 150, detailsY + 25);

    // Completion Date
    doc.font('Helvetica').text('Certificate Date:', leftMargin, detailsY + 50);
    doc.font('Helvetica-Bold').text(formatDate(data.completedDate) || new Date().toLocaleDateString(), leftMargin + 150, detailsY + 50);

    // Main certificate text
    const mainTextY = detailsY + 100;
    doc.font('Helvetica')
       .fontSize(12)
       .fillColor('#333')
       .text(
           'has cleared all dues and has no pending obligations with the following departments of the college:',
           leftMargin, mainTextY, {
               width: contentWidth,
               align: 'justify'
           }
       );

    // Departments list
    const deptStartY = mainTextY + 50;
    const departments = data.departments || [];
    
    if (departments.length > 0) {
        doc.font('Helvetica-Bold')
           .fontSize(11)
           .fillColor(primaryBlue)
           .text('Departments Cleared:', leftMargin, deptStartY);
        
        let currentY = deptStartY + 20;
        const columnWidth = contentWidth / 2;
        
        departments.forEach((dept, index) => {
            const xPos = index % 2 === 0 ? leftMargin + 20 : leftMargin + columnWidth;
            const yPos = currentY + Math.floor(index / 2) * 20;
            
            // Checkmark symbol
            doc.fillColor(greenAccent)
               .font('Helvetica-Bold')
               .text('✓', xPos - 15, yPos);
            
            doc.fillColor('#333')
               .font('Helvetica')
               .text(dept, xPos, yPos);
        });
        
        currentY += Math.ceil(departments.length / 2) * 20 + 30;
    }

    // Certificate validity note
    const noteY = pageHeight - 200;
    doc.font('Helvetica-Oblique')
       .fontSize(10)
       .fillColor('#666')
       .text(
           'This certificate is generated electronically and is valid without signature.',
           leftMargin, noteY, {
               width: contentWidth,
               align: 'center'
           }
       );

    // Footer
    doc.rect(0, pageHeight - 60, pageWidth, 60).fill(primaryBlue);
    
    doc.fillColor('white')
       .font('Helvetica')
       .fontSize(9)
       .text('JNTUA College of Engineering Ananthapuramu - No Dues Management System', 0, pageHeight - 45, {
           align: 'center',
           width: pageWidth
       });
    
    doc.fillColor('white')
       .font('Helvetica')
       .fontSize(8)
       .text(`Generated on: ${new Date().toLocaleString()}`, 0, pageHeight - 30, {
           align: 'center',
           width: pageWidth
       });

    return doc;
}

/**
 * Format date for display
 */
function formatDate(dateString) {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });
}

module.exports = { generateNoDueCertificate };
