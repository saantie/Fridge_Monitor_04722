class PDFExporter {
  constructor() {
    this.currentDevice = null;
    this.monthlyData = null;
  }

  async generateMonthlyPDF(device, year, month) {
    try {
      showLoading();
      
      const response = await API.getMonthlyData(device.device_name, year, month);
      
      if (response.error) {
        throw new Error(response.error);
      }

      this.monthlyData = response;
      this.currentDevice = device;
      
      await this.createPDF();
      
      hideLoading();
    } catch (error) {
      showError('Cannot generate PDF: ' + error.message);
    }
  }

  async createPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    
    const data = this.monthlyData;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // === PAGE 1: COVER & SUMMARY ===
    let yPos = 20;
    
    // Logo
    doc.setFontSize(40);
    doc.text('🌡️', pageWidth / 2, yPos, { align: 'center' });
    
    yPos += 20;
    
    // Title
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('Fridge Temperature Report', pageWidth / 2, yPos, { align: 'center' });
    
    yPos += 12;
    
    // Month/Year
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    const monthName = monthNames[data.month - 1] + ' ' + data.year;
    
    doc.setFontSize(18);
    doc.text(monthName, pageWidth / 2, yPos, { align: 'center' });
    
    yPos += 15;
    
    // Device Name (English only)
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    const deviceNameEn = this.translateDeviceName(this.currentDevice.device_name);
    doc.text('Device: ' + deviceNameEn, pageWidth / 2, yPos, { align: 'center' });
    
    yPos += 25;
    
    // Box for Summary
    doc.setDrawColor(102, 126, 234);
    doc.setLineWidth(0.5);
    doc.roundedRect(20, yPos, pageWidth - 40, 90, 3, 3);
    
    yPos += 10;
    
    // Summary Title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Monthly Summary', 25, yPos);
    
    yPos += 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    
    const summary = data.summary;
    
    // Summary data
    const summaryLines = [
      `Total Records: ${summary.total_records}`,
      `Alert Count: ${summary.alert_count}`,
      '',
      'Chiller (Target: 2-8°C):',
      `  Average: ${summary.chiller_avg}°C`,
      `  Min: ${summary.chiller_min}°C`,
      `  Max: ${summary.chiller_max}°C`,
      '',
      'Freezer (Target: -20 to -10°C):',
      `  Average: ${summary.freezer_avg}°C`,
      `  Min: ${summary.freezer_min}°C`,
      `  Max: ${summary.freezer_max}°C`
    ];
    
    summaryLines.forEach(line => {
      doc.text(line, 30, yPos);
      yPos += 6;
    });
    
    // Add alert status indicator
    yPos += 15;
    if (summary.alert_count > 0) {
      doc.setTextColor(245, 101, 101);
      doc.setFontSize(11);
      const alertPercent = ((summary.alert_count / summary.total_records) * 100).toFixed(1);
      doc.text(`⚠ ${alertPercent}% of records had temperature alerts`, 25, yPos);
      doc.setTextColor(0, 0, 0);
    }
    
    // === PAGE 2: CHART ===
    doc.addPage();
    yPos = 20;
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Temperature Trend', 20, yPos);
    
    yPos += 10;
    
    // Create chart
    try {
      const chartCanvas = await this.createChartForPDF(data.data);
      const chartImage = chartCanvas.toDataURL('image/png');
      doc.addImage(chartImage, 'PNG', 20, yPos, pageWidth - 40, 100);
      yPos += 110;
    } catch (error) {
      console.error('Chart error:', error);
      doc.setFontSize(12);
      doc.text('Chart generation failed', 20, yPos);
      yPos += 10;
    }
    
    // === PAGE 3: DATA TABLE ===
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Temperature Records', 20, yPos);
    
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('(Showing last 50 records)', 20, yPos);
    
    yPos += 8;
    
    // Table header
    doc.setFont('helvetica', 'bold');
    doc.text('Date/Time', 20, yPos);
    doc.text('Chiller (°C)', 70, yPos);
    doc.text('Freezer (°C)', 110, yPos);
    doc.text('Status', 150, yPos);
    
    yPos += 2;
    doc.setLineWidth(0.3);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 5;
    
    // Table data (last 50 records)
    doc.setFont('helvetica', 'normal');
    const recentData = data.data.slice(-50);
    
    recentData.forEach((record) => {
      if (yPos > pageHeight - 20) {
        doc.addPage();
        yPos = 20;
        
        // Repeat header
        doc.setFont('helvetica', 'bold');
        doc.text('Date/Time', 20, yPos);
        doc.text('Chiller (°C)', 70, yPos);
        doc.text('Freezer (°C)', 110, yPos);
        doc.text('Status', 150, yPos);
        yPos += 2;
        doc.line(20, yPos, pageWidth - 20, yPos);
        yPos += 5;
        doc.setFont('helvetica', 'normal');
      }
      
      const timestamp = record.timestamp.substring(5, 16); // MM-DD HH:MM
      const chiller = parseFloat(record.chiller).toFixed(1);
      const freezer = parseFloat(record.freezer).toFixed(1);
      
      // Check alert status
      let status = 'OK';
      let isAlert = false;
      
      if (record.chiller < 2 || record.chiller > 8 || 
          record.freezer < -20 || record.freezer > -10) {
        status = 'Alert';
        isAlert = true;
        doc.setTextColor(245, 101, 101);
      } else {
        doc.setTextColor(72, 187, 120);
      }
      
      doc.text(timestamp, 20, yPos);
      doc.text(chiller, 70, yPos);
      doc.text(freezer, 110, yPos);
      doc.text(status, 150, yPos);
      
      doc.setTextColor(0, 0, 0);
      yPos += 6;
    });
    
    // === FOOTER ON ALL PAGES ===
    const totalPages = doc.internal.pages.length - 1;
    doc.setTextColor(128, 128, 128);
    doc.setFontSize(8);
    
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      const footerText = `Generated: ${new Date().toLocaleString('en-US', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })} | Page ${i} of ${totalPages}`;
      doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' });
    }
    
    // Save PDF
    const filename = `FridgeReport_${deviceNameEn}_${data.year}-${String(data.month).padStart(2, '0')}.pdf`;
    doc.save(filename);
    
    console.log('✅ PDF saved:', filename);
  }

  // Translate Thai device names to English
  translateDeviceName(name) {
    // Remove Thai characters and special chars, keep only alphanumeric
    let cleanName = name.replace(/[^\x00-\x7F]/g, ''); // Remove non-ASCII
    
    // If nothing left, use device ID
    if (cleanName.trim().length === 0) {
      cleanName = this.currentDevice.device_id || 'Device';
    }
    
    // Common translations
    const translations = {
      'ตู้เย็น': 'Fridge',
      'ห้องยา': 'Medicine Room',
      'วัคซีน': 'Vaccine',
      'ชั้น': 'Floor',
    };
    
    let result = cleanName.trim();
    
    // Try to add context from location if available
    if (this.currentDevice.location && this.currentDevice.location !== '-') {
      const locationEn = this.currentDevice.location.replace(/[^\x00-\x7F]/g, '').trim();
      if (locationEn) {
        result += ' ' + locationEn;
      }
    }
    
    // If still empty, use device ID
    if (!result || result.length === 0) {
      result = this.currentDevice.device_id || 'Fridge Monitor';
    }
    
    return result;
  }

  async createChartForPDF(data) {
    const canvas = document.createElement('canvas');
    canvas.width = 1000;
    canvas.height = 500;
    
    const ctx = canvas.getContext('2d');
    
    // Sample data if too many points
    let sampledData = data;
    if (data.length > 100) {
      const step = Math.floor(data.length / 100);
      sampledData = data.filter((_, index) => index % step === 0);
    }
    
    const timestamps = sampledData.map(d => {
      const date = new Date(d.timestamp);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit'
      });
    });

    const chillerData = sampledData.map(d => parseFloat(d.chiller));
    const freezerData = sampledData.map(d => parseFloat(d.freezer));

    new Chart(ctx, {
      type: 'line',
      data: {
        labels: timestamps,
        datasets: [
          {
            label: 'Chiller (°C)',
            data: chillerData,
            borderColor: '#667eea',
            backgroundColor: 'rgba(102, 126, 234, 0.1)',
            tension: 0.4,
            fill: true,
            borderWidth: 2
          },
          {
            label: 'Freezer (°C)',
            data: freezerData,
            borderColor: '#06b6d4',
            backgroundColor: 'rgba(6, 182, 212, 0.1)',
            tension: 0.4,
            fill: true,
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: false,
        animation: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              font: {
                size: 14
              }
            }
          },
          title: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: false,
            title: {
              display: true,
              text: 'Temperature (°C)',
              font: {
                size: 14
              }
            },
            ticks: {
              font: {
                size: 12
              }
            }
          },
          x: {
            ticks: {
              maxRotation: 45,
              minRotation: 45,
              font: {
                size: 10
              }
            }
          }
        }
      }
    });
    
    return canvas;
  }
}

const pdfExporter = new PDFExporter();
