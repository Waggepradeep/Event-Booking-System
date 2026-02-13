const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

function generateTicketPDF(booking, event) {
  return new Promise((resolve, reject) => {
    try {
      const ticketsDir = path.join(__dirname, '../../tickets');
      if (!fs.existsSync(ticketsDir)) {
        fs.mkdirSync(ticketsDir, { recursive: true });
        console.log('Created tickets folder:', ticketsDir);
      }

      const filePath = path.join(ticketsDir, `ticket_${booking.id}.pdf`);
      const doc = new PDFDocument();
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);

      const eventDate = event?.date ? new Date(event.date).toLocaleString() : 'N/A';
      const userEmail = booking.user?.email || booking.userEmail || booking.user_email || 'N/A';

      doc.fontSize(20).text('Event Ticket', { align: 'center' });
      doc.moveDown();
      doc.fontSize(14).text(`Booking ID: ${booking.id}`);
      doc.text(`Event: ${event?.title || 'N/A'}`);
      doc.text(`Seats Booked: ${booking?.seats_booked ?? 'N/A'}`);
      doc.text(`Date: ${eventDate}`);
      doc.text(`Location: ${event?.location || 'N/A'}`);
      doc.text(`User Email: ${userEmail}`);
      doc.text(`Payment ID: ${booking.payment_id || 'N/A'}`);
      doc.text(`Payment Status: ${booking.payment_status || 'N/A'}`);

      doc.end();

      stream.on('finish', () => {
        console.log('PDF generated:', filePath);
        resolve(filePath);
      });

      stream.on('error', (err) => {
        console.error('PDF generation error:', err);
        reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = generateTicketPDF;
