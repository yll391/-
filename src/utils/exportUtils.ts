import { jsPDF } from 'jspdf';
import { NovelProject } from '../types';

export const exportToTxt = (project: NovelProject) => {
  let content = `${project.title}\n\n`;
  
  // Sort chapters by order
  const sortedChapters = [...project.chapters].sort((a, b) => a.order - b.order);
  
  sortedChapters.forEach(chapter => {
    content += `第${chapter.order}章: ${chapter.title}\n`;
    content += `--------------------------------\n\n`;
    content += `${chapter.content}\n\n\n`;
  });

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${project.title}.txt`;
  link.click();
  URL.revokeObjectURL(url);
};

export const exportToPdf = (project: NovelProject) => {
  const doc = new jsPDF();
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxLineWidth = pageWidth - margin * 2;
  
  let y = margin;

  // Title
  doc.setFontSize(24);
  doc.text(project.title, pageWidth / 2, y, { align: 'center' });
  y += 20;

  // Chapters
  const sortedChapters = [...project.chapters].sort((a, b) => a.order - b.order);
  
  sortedChapters.forEach((chapter, index) => {
    if (y > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }

    // Chapter Title
    doc.setFontSize(18);
    const chapterTitle = `第${chapter.order}章: ${chapter.title}`;
    doc.text(chapterTitle, margin, y);
    y += 10;

    // Chapter Content
    doc.setFontSize(12);
    const lines = doc.splitTextToSize(chapter.content, maxLineWidth);
    
    lines.forEach((line: string) => {
      if (y > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += 7;
    });

    y += 15; // Space between chapters
  });

  doc.save(`${project.title}.pdf`);
};
