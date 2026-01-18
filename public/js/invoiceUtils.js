// Common invoice utility functions for QR code generation

/**
 * Generate QR code for invoice download link
 * @param {string} invoiceUrl - The URL to the invoice PDF
 * @returns {Promise<string>} - Base64 data URL of the QR code image
 */
async function generateQRCodeImage(invoiceUrl) {
    try {
        // Use window.QRCode to access the global library
        if (typeof window.QRCode === 'undefined') {
            console.error('QRCode library not loaded');
            console.log('Available globals:', Object.keys(window).filter(k => k.toLowerCase().includes('qr')));
            return '';
        }
        
        const qrDataUrl = await window.QRCode.toDataURL(invoiceUrl, {
            width: 200,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });
        return qrDataUrl;
    } catch (err) {
        console.error('Error generating QR code:', err);
        return '';
    }
}

/**
 * Generate PDF invoice with QR code
 * @param {string} transactionId - The transaction ID
 * @param {object} invoiceData - Invoice data including products, customer info, etc.
 * @param {boolean} includeQR - Whether to include QR code on PDF (default: true)
 * @param {boolean} sendEmail - Whether to send email with PDF attachment (default: false)
 */
async function generateInvoicePDF(transactionId, invoiceData, includeQR = true, sendEmail = false) {
    // Check if html2pdf is loaded
    if (typeof html2pdf === 'undefined') {
        alert('PDF library not loaded. Please refresh the page and try again.');
        return;
    }

    // First upload the PDF to get the download URL if QR code is needed
    let qrCodeDataUrl = '';
    
    if (includeQR) {
        // We'll generate QR after uploading, so use placeholder for now
        qrCodeDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    }

    // Invoice HTML template with QR code
     const html = `<!DOCTYPE html><html lang="en"><head>   <meta charset="UTF-8">   <meta name="viewport" content="width=device-width, initial-scale=1.0">   <title>RETAIL INVOICE</title>   <style>body{font-family:Arial,sans-serif;font-size:13px;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid#000;padding:8px;}th{text-align:center;background-color:#e7e7e7;}h1{margin:0;padding:0;}.header h1{text-decoration:underline;}.header{float:left;}.logo{width:100px;}.address{font-size:14px;margin-top:4px;}.invoice-details{text-align:right;}.invoice-details table{border:none;}h2{text-align:center;}.invoice-details{float:right;text-align:right;margin-right:0px;margin-bottom:5px;}.invoice-details table{border:none;}.invoice-summary-footer{display:inline-block;width:100%;}.invoice-details th{text-align:left;}.invoice-summary{float:right;text-align:right;}.invoice-summary table td{border:none;text-align:right;}.footer{float:left;text-align:left;}.payment-details{margin-left:20px;}.main_wrapper{width:900px;margin:0px auto;}tfoot tr td:first-child{background-color:#fff}tfoot tr td{background-color:#e7e7e7;}.info-table{width:100%;margin-bottom:5px;}.info-table th{text-align:left;background-color:transparent;font-weight:normal;}.info-table td{padding:4px 8px;}.customer-info{width:100%;margin-bottom:5px;border:1px solid;}.customer-info th,.customer-info td{padding:4px;}.customer-info th{text-align:left;width:100px;background-color:transparent;border:none;font-weight:normal;}.customer-info td{width:41%;border:none;}.qr-section{text-align:center;margin:15px 0;padding:10px;}.qr-section img{max-width:180px;}.qr-section p{margin:5px 0;font-size:12px;color:#666;}.sign-stamp-section{display:flex;justify-content:space-between;align-items:flex-end;margin-top:20px;padding-top:15px;border-top:1px solid #999;}.sign-stamp-section img{max-height:100px;width:auto;}.sign-label{text-align:center;font-size:11px;font-weight:bold;margin-top:3px;}   </style></head><body>   <div class="main_wrapper">      <div class="header">         <h1><strong>THE CYCLE HUB</strong></h1>         <span><strong>THE PHONER MOBILE ACCESSORIES HUB</strong></span><br>         <div class="address"><strong>Address:</strong>Shop No:G-101,B.T.Mall,Navjivan Mall            Compound,Kalol-382721<br>DIST-GANDHINAGAR,<strong>Contact No:</strong>9714621020</div>      </div>      <div class="invoice-details">         <table>            <tr>               <th>Invoice No:</th>               <td>{{number}}</td>            </tr>            <tr>               <th><strong>Invoice Date:</strong></th>               <td>{{date}}</td>            </tr>            <tr>               <th><strong>State code:</strong></th>               <td>24</td>            </tr>            <tr>               <th><strong>GSTN No:</strong></th>               <td>24BNYPG4010L1ZU</td>            </tr>         </table>      </div>      <h3>RETAIL INVOICE</h3>      ${includeQR ? '<div class="qr-section"><img src="{{qrCode}}" alt="Download Invoice"><p><strong>Scan to Download Invoice</strong></p></div>' : ''}      <table class="customer-info">         <tr>            <th>Name:</th>            <td>{{customerName}}</td>            <th>Mobile No:</th>            <td>{{customerPhone}}</td>         </tr>         <tr>            <th>Address:</th>            <td>{{customerAddress}}</td>            <th>GSTN:</th>            <td></td>         </tr>         <tr>            <th>Email</th>            <td>{{email}}</td>            <th>ID Proof:</t>            <td>ID Proof No:</td>         </tr>      </table>      <table id="products-table">         <thead>            <tr>               <th>No.</th>               <th style="width:50%">Particular</th>               <th>HSN/HSB</th>               <th>Qty</th>               <th>Sale Rate</th>               <th>Disc</th>               <th>GST</th>               <th>Amount</th>            </tr>         </thead>         <tbody>            {{#each products}}            <tr>               <td>{{noitem}}</td>               <td>{{description}}</td>               <td>{{hsn}}</td>               <td align="center">{{quantity}}</td>               <td>{{salePrice}}</td>               <td>{{distotal}}</td>               <td>{{GST}}</td>               <td>{{price}}</td>            </tr>            {{/each}}         </tbody>         <tfoot>            <tr>               <td colspan="2" class="total"></td>               <td></td>               <td></td>               <td></td>               <td></td>               <td></td>               <td>{{totalAmount}}</td>            </tr>         </tfoot>      </table>      <div class="invoice-summary-footer">         <div class="invoice-summary">            <table>               <tr>                  <td>Final Amount:</td>                  <td>{{totalAmount}}</td>               </tr>            </table>            <div class="sign-stamp-section" style="justify-content:space-between;">               <div>                  <img src="/sign-stamp2.png" alt="Signature" style="max-height:80px;width:auto;">                  <div class="sign-label">Authorized Signature</div>               </div>               <div style="text-align:right;">                  <img src="/sign-stamp1.png" alt="Stamp" style="max-height:80px;width:auto;margin-left:auto;display:block;">                  <div class="sign-label">Official Stamp</div>               </div>            </div>                     </div>         <div class="footer">            <p>In Words: <span>{{wordsMatter}} Paisa Only</span></p>            <p>Payment Mode:<strong>Cash</strong>/<strong>Online</strong>:{{totalAmount}}</p>            <p>Bill By:Keyur Gajjar</p> <p style="margin-top:10px;margin-bottom:15px;font-size:11px;line-height:1.3;">Goods once sold will not be taken back. Warranty will be converted</p>         </div>      </div>   </div></body></html>`;
  
    // Prepare template data
    const htmlPayload = {
        ...invoiceData,
        number: transactionId,
        qrCode: qrCodeDataUrl
    };

    // Compile template
    const template = Handlebars.compile(html);
    let parsedHtml = template(htmlPayload);

    // If including QR code, generate it and add to HTML
    if (includeQR) {
        try {
            // Generate QR code pointing to download endpoint
            const downloadUrl = `${window.location.protocol}//${window.location.host}/download-invoice/${encodeURIComponent(transactionId)}`;
            const qrCode = await generateQRCodeImage(downloadUrl);
            
            // Update HTML with QR code
            htmlPayload.qrCode = qrCode;
            parsedHtml = template(htmlPayload);
            
        } catch (error) {
            console.error('Error generating QR code:', error);
            // Continue without QR if it fails
        }
    }

    // Create final PDF with QR code
    const finalDiv = document.createElement('div');
    finalDiv.innerHTML = parsedHtml;
    finalDiv.style.width = '900px';
    finalDiv.style.height = '900px';
    document.body.appendChild(finalDiv);

    // PDF generation options
    const opt = {
        margin: 15,
        filename: `${transactionId}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, logging: false, letterRendering: true, useCORS: true},
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    // Generate PDF and optionally send email
    html2pdf().from(finalDiv).set(opt).outputPdf('datauristring').then(async function(pdfDataUri) {
        // Download the PDF
        const link = document.createElement('a');
        link.href = pdfDataUri;
        link.download = `${transactionId}.pdf`;
        link.click();
    
        console.log('PDF generated and downloaded successfully');
        document.body.removeChild(finalDiv);
    
        if (sendEmail) {
            // Send email with PDF attachment
            try {
                const base64Pdf = pdfDataUri.split(',')[1];
                const emailResponse = await fetch('/sendmailpdf', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        data: {
                            filename: `Invoice_${transactionId}.pdf`,
                            pdf: base64Pdf,
                            invoiceNumber: transactionId,
                            customerName: invoiceData.customerName,
                            customerEmail: invoiceData.email,
                            totalAmount: invoiceData.totalAmount
                        },
                        html: parsedHtml
                    })
                });
            
                const emailResult = await emailResponse.json();
            
                if (typeof window.showAlert === 'function') {
                    if (emailResult.error) {
                        window.showAlert(`Invoice downloaded! But email failed: ${emailResult.error}<br>Customers can scan the QR code on the PDF to download it.`, 'danger');
                    } else {
                        window.showAlert(`✅ Invoice downloaded successfully!<br>✉️ Email sent to: ${invoiceData.email}<br>📧 ${emailResult.message}<br>Customers can also scan the QR code on the PDF.`, 'success');
                    }
                }
            } catch (emailError) {
                console.error('Error sending email:', emailError);
                if (typeof window.showAlert === 'function') {
                    window.showAlert(`Invoice downloaded! But email failed: ${emailError.message}<br>Customers can scan the QR code on the PDF to download it.`, 'danger');
                }
            }
        } else {
            if (typeof window.showAlert === 'function') {
                window.showAlert('Invoice downloaded successfully!', 'success');
            }
        }
    }).catch(function(error) {
        console.error('Error generating PDF:', error);
        if (document.body.contains(finalDiv)) {
            document.body.removeChild(finalDiv);
        }
        if (typeof window.showAlert === 'function') {
            window.showAlert('Error generating PDF: ' + error.message, 'danger');
        }
    });
}
