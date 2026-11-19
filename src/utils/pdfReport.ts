import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { PredictionRecord, RecommendationItem } from '../../shared/types';

export interface PdfReportInput {
  studentId: string;
  studentName: string;
  department: string;
  semester: number;
  prediction: PredictionRecord;
  recommendations: RecommendationItem[];
  departmentAverage?: number;
  institutionName?: string;
}

export function generatePredictionPdfReport(data: PdfReportInput) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header band
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 34, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('NeuroPredict — Academic Performance Prediction Report', 14, 15);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(203, 213, 225);
  doc.text(
    `${data.institutionName || 'NeuroPredict Academic Research Institute'}  |  Model ${data.prediction.modelVersion} (9-16-8-1 ANN)`,
    14,
    23
  );
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 29);

  // Student Profile Summary
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Student Profile & Prediction Outcome', 14, 45);

  autoTable(doc, {
    startY: 49,
    theme: 'grid',
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: [30, 41, 59] },
    head: [['Student ID', 'Student Name', 'Department', 'Semester']],
    body: [[data.studentId, data.studentName, data.department, `Semester ${data.semester}`]],
  });

  const afterProfileY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

  autoTable(doc, {
    startY: afterProfileY,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 9.5, fontStyle: 'bold' },
    head: [
      [
        'Predicted Score',
        '90% Conformal Interval',
        'Predicted Grade',
        'Academic Risk',
        'Dept. Average',
      ],
    ],
    body: [
      [
        `${data.prediction.predictedScore.toFixed(1)}%`,
        `${data.prediction.uncertaintyBand.lowerBound.toFixed(1)}% – ${data.prediction.uncertaintyBand.upperBound.toFixed(1)}% (±${data.prediction.uncertaintyBand.halfWidth})`,
        data.prediction.predictedGrade,
        data.prediction.riskCategory,
        data.departmentAverage !== undefined ? `${data.departmentAverage.toFixed(1)}%` : 'N/A',
      ],
    ],
  });

  const afterScoreY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // Input Features & Contributions
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Academic Feature Profile & Model Importance', 14, afterScoreY);

  const f = data.prediction.inputFeatures;
  const featureRows = [
    ['Attendance Percentage', `${f.attendance}%`],
    ['Internal Examination Marks', `${f.internalMarks} / 100`],
    ['Previous Semester GPA', `${f.previousGPA} / 10`],
    ['Assignment Completion', `${f.assignmentCompletion}%`],
    ['Weekly Study Hours', `${f.weeklyStudyHours} hrs/week`],
    ['Previous Academic Performance', `${f.previousPerformance}%`],
    ['Subjects Requiring Improvement', `${f.subjectsNeedingImprovement}`],
    ['Class Participation Score', `${f.participationScore} / 100`],
    ['Current Semester', `Semester ${f.semester}`],
  ];

  autoTable(doc, {
    startY: afterScoreY + 3,
    theme: 'striped',
    headStyles: { fillColor: [51, 65, 85], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 8.8 },
    head: [['Academic Input Feature', 'Recorded Value']],
    body: featureRows,
  });

  const afterFeaturesY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // Rule-Based Recommendations
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Personalized Action Plan (Rule-Based Recommendation Engine)', 14, afterFeaturesY);

  autoTable(doc, {
    startY: afterFeaturesY + 3,
    theme: 'grid',
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 8.5 },
    columnStyles: {
      0: { cellWidth: 26 },
      1: { cellWidth: 20 },
      2: { cellWidth: 44 },
      3: { cellWidth: 'auto' },
    },
    head: [['Category', 'Priority', 'Recommendation', 'Action Plan & Trigger']],
    body: data.recommendations.map((r) => [
      r.category,
      r.priority,
      r.title,
      `${r.actionPlan}\nTrigger: ${r.triggerReason}`,
    ]),
  });

  // Footer disclaimer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Academic Disclosure: Trained on a reproducible synthetic educational dataset for NNDL PBL demonstration. Predictions are decision-support indicators, not guaranteed academic outcomes.',
    14,
    pageHeight - 10,
    { maxWidth: pageWidth - 28 }
  );

  const safeId = data.studentId.replace(/[^a-zA-Z0-9_-]/g, '');
  doc.save(`NeuroPredict-Report-${safeId}.pdf`);
}
