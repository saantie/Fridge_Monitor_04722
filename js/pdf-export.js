class PDFExporter {
  constructor() {
    this.currentDevice = null;
    this.monthlyData = null;
  }

  async generateMonthlyPDF(device, year, month) {
    try {
      showLoading();
      
      // ดึงข้อมูลรายเดือน
      const response = await API.getMonthlyData(device.device_name, year, month);
      
      if (response.error) {
        throw new Error(response.error);
      }

      this.monthlyData = response;
      
      // สร้าง PDF
      await this.createPDF();
      
      hideLoading();
    } catch (error) {
      showError('ไม่สามารถสร้าง PDF ได้: ' + error.message);
    }
  }

  async createPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    
    const data = this.monthlyData;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // ตั้งค่า font (ใช้ default font ที่รองรับภาษาไทย)
    doc.setFont('helvetica');
    
    // === หน้าปก ===
    let yPos = 20;
    
    // Logo/Icon
    doc.setFontSize(40);
    doc.text('🌡️', pageWidth / 2, yPos, { align: 'center' });
    
    yPos += 20;
    
    // ชื่อรายงาน
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Fridge Temperature Report', pageWidth / 2, yPos, { align: 'center' });
    
    yPos += 10;
    doc.setFontSize(16);
    doc.text(data.month_name, pageWidth / 2, yPos, { align: 'center' });
    
    yPos += 15;
    
    // ชื่อเครื่อง
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text('Device: ' + data.device_name, pageWidth / 2, yPos, { align: 'center' });
    
    yPos += 30;
    
    // === สรุปข้อมูล ===
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Monthly Summary', 20, yPos);
    
    yPos += 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    
    const summary = data.summary;
    
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
      doc.text(line, 25, yPos);
      yPos += 6;
    });
    
    // === กราฟ ===
    yPos += 10;
    
    if (yPos > pageHeight - 100) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Temperature Chart', 20, yPos);
    
    yPos += 10;
    
    // สร้างกราฟชั่วคราวสำหรับ export
    const chartCanvas = await this.createChartForPDF(data.data);
    const chartImage = chartCanvas.toDataURL('image/png');
    
    doc.addImage(chartImage, 'PNG', 20, yPos, pageWidth - 40, 80);
    
    yPos += 90;
    
    // === ตารางข้อมูล ===
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Data Table (Last 50 records)', 20, yPos);
    
    yPos += 10;
    
    // Header ตาราง
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Date/Time', 20, yPos);
    doc.text('Chiller (°C)', 80, yPos);
    doc.text('Freezer (°C)', 130, yPos);
    doc.text('Status', 180, yPos);
    
    yPos += 5;
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 5;
    
    // ข้อมูล (แสดง 50 แถวล่าสุด)
    doc.setFont('helvetica', 'normal');
    const recentData = data.data.slice(-50);
    
    recentData.forEach((record, index) => {
      if (yPos > pageHeight - 20) {
        doc.addPage();
        yPos = 20;
        
        // Header ซ้ำ
        doc.setFont('helvetica', 'bold');
        doc.text('Date/Time', 20, yPos);
        doc.text('Chiller (°C)', 80, yPos);
        doc.text('Freezer (°C)', 130, yPos);
        doc.text('Status', 180, yPos);
        yPos += 5;
        doc.line(20, yPos, pageWidth - 20, yPos);
        yPos += 5;
        doc.setFont('helvetica', 'normal');
      }
      
      const timestamp = record.timestamp.substring(5); // ตัดปีออก
      const chiller = record.chiller.toFixed(1);
      const freezer = record.freezer.toFixed(1);
      
      // กำหนดสีตามสถานะ
      let status = 'OK';
      if (record.chiller < 2 || record.chiller > 8 || 
          record.freezer < -20 || record.freezer > -10) {
        doc.setTextColor(220, 53, 69); // สีแดง
        status = 'Alert';
      } else {
        doc.setTextColor(0, 0, 0); // สีดำ
      }
      
      doc.text(timestamp, 20, yPos);
      doc.text(chiller, 80, yPos);
      doc.text(freezer, 130, yPos);
      doc.text(status, 180, yPos);
      
      yPos += 6;
    });
    
    // === Footer ===
    const totalPages = doc.internal.pages.length - 1; // ลบหน้าว่าง
    doc.setTextColor(128, 128, 128);
    doc.setFontSize(8);
    
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.text(
        `Generated: ${new Date().toLocaleString('th-TH')} | Page ${i} of ${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }
    
    // บันทึกไฟล์
    const filename = `FridgeReport_${data.device_name}_${data.year}-${String(data.month).padStart(2, '0')}.pdf`;
    doc.save(filename);
  }

  async createChartForPDF(data) {
    // สร้าง canvas ชั่วคราว
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 400;
    
    const ctx = canvas.getContext('2d');
    
    // เตรียมข้อมูล - สุ่มตัวอย่าง 100 จุดถ้ามีข้อมูลเยอะเกินไป
    let sampledData = data;
    if (data.length > 100) {
      const step = Math.floor(data.length / 100);
      sampledData = data.filter((_, index) => index % step === 0);
    }
    
    const timestamps = sampledData.map(d => {
      const date = new Date(d.timestamp);
      return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
    });

    const chillerData = sampledData.map(d => d.chiller);
    const freezerData = sampledData.map(d => d.freezer);

    new Chart(ctx, {
      type: 'line',
      data: {
        labels: timestamps,
        datasets: [
          {
            label: 'Chiller (°C)',
            data: chillerData,
            borderColor: '#2196F3',
            backgroundColor: 'rgba(33, 150, 243, 0.1)',
            tension: 0.4,
            fill: true
          },
          {
            label: 'Freezer (°C)',
            data: freezerData,
            borderColor: '#00BCD4',
            backgroundColor: 'rgba(0, 188, 212, 0.1)',
            tension: 0.4,
            fill: true
          }
        ]
      },
      options: {
        responsive: false,
        animation: false,
        plugins: {
          legend: {
            display: true,
            position: 'top'
          }
        },
        scales: {
          y: {
            beginAtZero: false,
            title: {
              display: true,
              text: 'Temperature (°C)'
            }
          }
        }
      }
    });
    
    return canvas;
  }
}

// สร้าง instance
const pdfExporter = new PDFExporter();
