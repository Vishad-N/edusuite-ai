import pptxgen from "pptxgenjs";

export const generatePptxFile = async (presentationData, theme = "navy") => {
  const pptx = new pptxgen();

  // Set widescreen 16:9
  pptx.layout = "LAYOUT_16x9";

  // Color Palettes
  const themes = {
    navy: {
      bg: "0F172A", // Dark Slate Blue
      cardBg: "1E293B",
      primary: "38BDF8", // Cyan
      secondary: "94A3B8",
      text: "FFFFFF",
      accent: "F59E0B",
    },
    emerald: {
      bg: "064E3B", // Forest Emerald
      cardBg: "047857",
      primary: "34D399", // Light Emerald
      secondary: "D1FAE5",
      text: "FFFFFF",
      accent: "FBBF24",
    },
    purple: {
      bg: "2E1065", // Deep Royal Purple
      cardBg: "3B0764",
      primary: "C084FC", // Lilac
      secondary: "E9D5FF",
      text: "FFFFFF",
      accent: "38BDF8",
    },
    classic: {
      bg: "F8FAFC", // Clean light academic
      cardBg: "FFFFFF",
      primary: "1E3A8A", // Deep Navy
      secondary: "475569",
      text: "0F172A",
      accent: "DC2626",
    },
  };

  const currentTheme = themes[theme] || themes.navy;

  // Slide 1: Title Slide
  const titleSlide = pptx.addSlide();
  titleSlide.background = { color: currentTheme.bg };

  titleSlide.addText(presentationData.title, {
    x: 0.8,
    y: 2.2,
    w: "85%",
    fontSize: 38,
    bold: true,
    color: currentTheme.text,
    align: "left",
    fontFace: "Arial",
  });

  if (presentationData.subtitle) {
    titleSlide.addText(presentationData.subtitle, {
      x: 0.8,
      y: 3.4,
      w: "85%",
      fontSize: 20,
      color: currentTheme.primary,
      align: "left",
      fontFace: "Arial",
    });
  }

  // School / Institute Branding Footer
  titleSlide.addText(
    `${presentationData.instituteName || ""} | Class: ${presentationData.grade || "All Standards"} | Subject: ${presentationData.subject || "General"}`,
    {
      x: 0.8,
      y: 5.8,
      w: "85%",
      fontSize: 12,
      color: currentTheme.secondary,
      fontFace: "Arial",
    }
  );

  // Content Slides
  presentationData.slides.forEach((slide, idx) => {
    const s = pptx.addSlide();
    s.background = { color: currentTheme.bg };

    // Slide Number & Tag Header
    s.addText(`Slide ${idx + 1} of ${presentationData.slides.length} • ${slide.tag || "Core Concept"}`, {
      x: 0.8,
      y: 0.5,
      w: "85%",
      fontSize: 11,
      color: currentTheme.primary,
      bold: true,
      fontFace: "Arial",
    });

    // Slide Title
    s.addText(slide.title, {
      x: 0.8,
      y: 0.9,
      w: "85%",
      fontSize: 26,
      bold: true,
      color: currentTheme.text,
      fontFace: "Arial",
    });

    // Content Box
    const bulletItems = slide.points.map((p) => ({
      text: p,
      options: {
        fontSize: 16,
        color: currentTheme.text,
        bullet: { code: "2022" },
        breakLine: true,
        spaceAfter: 12,
      },
    }));

    s.addText(bulletItems, {
      x: 0.8,
      y: 1.8,
      w: 8.5,
      h: 3.5,
      fontFace: "Arial",
      valign: "top",
    });

    // Key takeaway callout card
    if (slide.takeaway) {
      s.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
        x: 0.8,
        y: 5.4,
        w: 11.5,
        h: 1.0,
        fill: { color: currentTheme.cardBg },
        line: { color: currentTheme.primary, width: 1 },
      });

      s.addText(`💡 Key Takeaway / Exam Tip: ${slide.takeaway}`, {
        x: 1.0,
        y: 5.5,
        w: 11.0,
        h: 0.8,
        fontSize: 12,
        bold: true,
        color: currentTheme.primary,
        fontFace: "Arial",
      });
    }

    // Footer
    s.addText(presentationData.instituteName || "", {
      x: 0.8,
      y: 6.8,
      w: 6.0,
      fontSize: 10,
      color: currentTheme.secondary,
    });
  });

  // Save the PPTX
  const fileName = `${(presentationData.title || "Presentation").replace(/[^a-zA-Z0-9]/g, "_")}.pptx`;
  await pptx.writeFile({ fileName });
};

export const generateScreenshotMcqPptx = async ({
  title = "MCQ Live Class",
  facultyName = "",
  subject = "सामान्य अध्ययन",
  examTag = "",
  instituteName = "",
  /** City and phone, shown in the slide footer when set. */
  instituteContact = "",
  questions = [],
  theme = "satyadhi_dark",
  layoutMode = "split", // 'split' | 'screenshot_left' | 'classic_full'
}) => {
  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_16x9";

  const themes = {
    satyadhi_dark: {
      bg: "0F172A", // Deep Navy
      cardBg: "1E293B",
      cardBorder: "334155",
      primary: "FACC15", // Amber Yellow
      secondary: "94A3B8",
      text: "FFFFFF",
      accent: "DC2626", // Red
      correctGreen: "16A34A",
      teacherCanvas: "141E33",
    },
    clean_white: {
      bg: "F8FAFC",
      cardBg: "FFFFFF",
      cardBorder: "CBD5E1",
      primary: "0F172A",
      secondary: "64748B",
      text: "0F172A",
      accent: "DC2626",
      correctGreen: "16A34A",
      teacherCanvas: "F1F5F9",
    },
    emerald: {
      bg: "064E3B",
      cardBg: "065F46",
      cardBorder: "047857",
      primary: "FACC15",
      secondary: "A7F3D0",
      text: "FFFFFF",
      accent: "EF4444",
      correctGreen: "22C55E",
      teacherCanvas: "053B2D",
    },
  };

  const curr = themes[theme] || themes.satyadhi_dark;

  // Slide 1: High-Impact Title Slide
  const titleSlide = pptx.addSlide();
  titleSlide.background = { color: curr.bg };

  // Top Yellow Banner Accent
  titleSlide.addShape(pptx.shapes.RECTANGLE, {
    x: 0,
    y: 0,
    w: 13.33,
    h: 0.18,
    fill: { color: curr.primary },
  });

  // Institute Name Tag
  titleSlide.addText(`★ ${instituteName.toUpperCase()} ★`, {
    x: 1.0,
    y: 1.2,
    w: 11.33,
    fontSize: 16,
    bold: true,
    color: curr.primary,
    fontFace: "Arial",
  });

  // Presentation Title
  titleSlide.addText(title, {
    x: 1.0,
    y: 1.8,
    w: 11.33,
    fontSize: 34,
    bold: true,
    color: curr.text,
    fontFace: "Arial",
  });

  // Subtitle / Exam Tag Card
  titleSlide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 1.0,
    y: 3.2,
    w: 11.33,
    h: 1.2,
    fill: { color: curr.cardBg },
    line: { color: curr.primary, width: 1 },
  });

  titleSlide.addText(
    `🎯 टारगेट परीक्षा: ${examTag} | विषय: ${subject}\n👨‍🏫 मार्गदर्शक: ${facultyName} | कुल प्रश्न: ${questions.length} MCQs`,
    {
      x: 1.2,
      y: 3.4,
      w: 10.9,
      fontSize: 14,
      color: curr.text,
      fontFace: "Arial",
    }
  );

  // Footer Tagline
  titleSlide.addText(instituteName, {
    x: 1.0,
    y: 6.2,
    w: 11.33,
    fontSize: 12,
    color: curr.secondary,
    fontFace: "Arial",
  });

  // Slides 2..N: Question Slides
  questions.forEach((q, idx) => {
    const s = pptx.addSlide();
    s.background = { color: curr.bg };

    // Speaker Notes for Teacher Presenter View
    s.addNotes(
      `🎯 प्रश्न संख्या: ${q.qNum || idx + 1}\n✅ सही उत्तर: विकल्प (${q.correct || "A"})\n\n💡 व्याख्या / शॉर्टकट ट्रिक:\n${q.trick || "कोई व्याख्या नहीं।"}`
    );

    // Top Header Strip
    // Question Number Badge
    s.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: 0.6,
      y: 0.4,
      w: 1.8,
      h: 0.5,
      fill: { color: curr.primary },
    });
    s.addText(`Q. ${q.qNum || idx + 1} / ${questions.length}`, {
      x: 0.6,
      y: 0.45,
      w: 1.8,
      h: 0.4,
      fontSize: 13,
      bold: true,
      align: "center",
      color: "000000",
      fontFace: "Arial",
    });

    // Exam tag
    s.addText(`🎯 ${q.exam || examTag}`, {
      x: 2.6,
      y: 0.45,
      w: 6.0,
      fontSize: 12,
      bold: true,
      color: curr.secondary,
      fontFace: "Arial",
    });

    // Institute Brand Top Right
    s.addText(instituteName, {
      x: 9.0,
      y: 0.45,
      w: 3.7,
      fontSize: 12,
      bold: true,
      align: "right",
      color: curr.primary,
      fontFace: "Arial",
    });

    // Layout rendering
    if (layoutMode === "screenshot_left" && q.screenshotDataUrl) {
      // Screenshot on the left
      try {
        s.addImage({
          data: q.screenshotDataUrl,
          x: 0.6,
          y: 1.1,
          w: 5.8,
          h: 5.6,
        });
      } catch {
        // Fallback placeholder box
        s.addShape(pptx.shapes.RECTANGLE, {
          x: 0.6,
          y: 1.1,
          w: 5.8,
          h: 5.6,
          fill: { color: curr.cardBg },
          line: { color: curr.cardBorder, width: 1 },
        });
        s.addText("मूल स्क्रीनशॉट", {
          x: 0.6,
          y: 3.5,
          w: 5.8,
          align: "center",
          color: curr.secondary,
        });
      }

      // Options on the right
      const optList = [
        { key: "A", val: q.options?.A || "विकल्प A" },
        { key: "B", val: q.options?.B || "विकल्प B" },
        { key: "C", val: q.options?.C || "विकल्प C" },
        { key: "D", val: q.options?.D || "विकल्प D" },
      ];

      optList.forEach((opt, oIdx) => {
        const optY = 1.2 + oIdx * 1.1;
        s.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
          x: 6.8,
          y: optY,
          w: 5.9,
          h: 0.9,
          fill: { color: curr.cardBg },
          line: { color: curr.cardBorder, width: 1 },
        });

        s.addShape(pptx.shapes.OVAL, {
          x: 7.0,
          y: optY + 0.15,
          w: 0.6,
          h: 0.6,
          fill: { color: curr.primary },
        });

        s.addText(opt.key, {
          x: 7.0,
          y: optY + 0.22,
          w: 0.6,
          h: 0.5,
          fontSize: 12,
          bold: true,
          align: "center",
          color: "000000",
        });

        s.addText(opt.val, {
          x: 7.8,
          y: optY + 0.18,
          w: 4.7,
          fontSize: 14,
          color: curr.text,
          fontFace: "Arial",
        });
      });

      // Bottom Trick Box
      if (q.trick) {
        s.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
          x: 6.8,
          y: 5.7,
          w: 5.9,
          h: 1.0,
          fill: { color: curr.teacherCanvas },
          line: { color: curr.primary, width: 1 },
        });
        s.addText(`💡 शॉर्टकट / परीक्षा तथ्य:\n${q.trick}`, {
          x: 7.0,
          y: 5.8,
          w: 5.5,
          fontSize: 11,
          color: curr.primary,
        });
      }
    } else {
      // Split Smartboard Mode: Clean question + options on left, Teacher Stylus Space on right
      // Question Card
      s.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
        x: 0.6,
        y: 1.1,
        w: 7.8,
        h: 1.6,
        fill: { color: curr.cardBg },
        line: { color: curr.primary, width: 1 },
      });

      s.addText(q.question || `प्रश्न संख्या ${q.qNum}: प्रश्न का विवरण...`, {
        x: 0.8,
        y: 1.25,
        w: 7.4,
        h: 1.3,
        fontSize: 18,
        bold: true,
        color: curr.text,
        fontFace: "Arial",
      });

      // 4 Options
      const optList = [
        { key: "A", val: q.options?.A || "विकल्प A" },
        { key: "B", val: q.options?.B || "विकल्प B" },
        { key: "C", val: q.options?.C || "विकल्प C" },
        { key: "D", val: q.options?.D || "विकल्प D" },
      ];

      optList.forEach((opt, oIdx) => {
        const optY = 2.9 + oIdx * 0.95;
        s.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
          x: 0.6,
          y: optY,
          w: 7.8,
          h: 0.8,
          fill: { color: curr.cardBg },
          line: { color: curr.cardBorder, width: 1 },
        });

        // Letter Badge
        s.addShape(pptx.shapes.OVAL, {
          x: 0.8,
          y: optY + 0.12,
          w: 0.55,
          h: 0.55,
          fill: { color: curr.primary },
        });
        s.addText(opt.key, {
          x: 0.8,
          y: optY + 0.18,
          w: 0.55,
          h: 0.45,
          fontSize: 12,
          bold: true,
          align: "center",
          color: "000000",
        });

        // Option text
        s.addText(opt.val, {
          x: 1.5,
          y: optY + 0.15,
          w: 6.7,
          fontSize: 14,
          color: curr.text,
          fontFace: "Arial",
        });
      });

      // Right Side: Teacher Smartboard Pen / Solution Space
      s.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
        x: 8.7,
        y: 1.1,
        w: 4.0,
        h: 5.6,
        fill: { color: curr.teacherCanvas },
        line: { color: curr.cardBorder, width: 1, dashType: "dash" },
      });

      s.addText("✏️ शिक्षक रफ वर्क / हल (Pen Space)", {
        x: 8.8,
        y: 1.3,
        w: 3.8,
        fontSize: 12,
        bold: true,
        align: "center",
        color: curr.primary,
        fontFace: "Arial",
      });

      s.addText("(डिजिटल बोर्ड स्टायलस से यहाँ हल करें)", {
        x: 8.8,
        y: 1.6,
        w: 3.8,
        fontSize: 10,
        align: "center",
        color: curr.secondary,
        fontFace: "Arial",
      });

      // Show thumbnail of original screenshot if available at bottom of teacher space
      if (q.screenshotDataUrl) {
        try {
          s.addImage({
            data: q.screenshotDataUrl,
            x: 8.9,
            y: 4.2,
            w: 3.6,
            h: 2.3,
          });
        } catch {
          // ignore
        }
      }
    }

    // Bottom institute footer
    s.addText([instituteName, instituteContact].filter(Boolean).join(" • "), {
      x: 0.6,
      y: 6.9,
      w: 12.13,
      fontSize: 9,
      color: curr.secondary,
      fontFace: "Arial",
    });
  });

  const safeFileName = `${(title || "MCQ_Smartboard").replace(/[^a-zA-Z0-9_\u0900-\u097F]/g, "_")}.pptx`;
  await pptx.writeFile({ fileName: safeFileName });
};
