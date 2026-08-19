(function () {
  "use strict";

  const templates = window.CARD_TEMPLATES;
  const fonts = window.CARD_FONTS;
  if (!Array.isArray(templates) || !Array.isArray(fonts)) {
    throw new Error("テンプレート設定を読み込めませんでした。");
  }

  const TEXT_LABELS = {
    recipient: "宛名",
    body: "本文",
    signature: "署名",
    headline: "英字見出し",
  };
  const TEXT_ORDER = ["headline", "recipient", "body", "signature"];
  const DEFAULT_VALUES = {
    recipient: "",
    body: "本日はありがとうございました。\nまたお会いできる日を楽しみにしています。",
    signature: "",
    headline: "Thank You",
  };
  const EMPTY_TRANSFORM = Object.freeze({ offsetX: 0, offsetY: 0, scale: 1, rotation: 0 });
  const emptyTransforms = () => [
    { ...EMPTY_TRANSFORM },
    { ...EMPTY_TRANSFORM },
    { ...EMPTY_TRANSFORM },
  ];

  const elements = {
    canvas: document.getElementById("card-canvas"),
    canvasStage: document.getElementById("canvas-stage"),
    templateName: document.getElementById("template-name"),
    sizeBadge: document.getElementById("size-badge"),
    templateGrid: document.getElementById("template-grid"),
    templateDescription: document.getElementById("template-description"),
    slotTabs: document.getElementById("slot-tabs"),
    imageInput: document.getElementById("image-input"),
    uploadLabel: document.getElementById("upload-label"),
    fileName: document.getElementById("file-name"),
    scaleInput: document.getElementById("scale-input"),
    scaleOutput: document.getElementById("scale-output"),
    rotationInput: document.getElementById("rotation-input"),
    rotationOutput: document.getElementById("rotation-output"),
    imageReset: document.getElementById("image-reset"),
    recipientInput: document.getElementById("recipient-input"),
    bodyInput: document.getElementById("body-input"),
    signatureInput: document.getElementById("signature-input"),
    headlineInput: document.getElementById("headline-input"),
    messageBackground: document.getElementById("message-background"),
    textTabs: document.getElementById("text-tabs"),
    fontSelect: document.getElementById("font-select"),
    fontSizeInput: document.getElementById("font-size-input"),
    fontSizeOutput: document.getElementById("font-size-output"),
    colorInput: document.getElementById("color-input"),
    colorOutput: document.getElementById("color-output"),
    alignControl: document.getElementById("align-control"),
    exportButton: document.getElementById("export-button"),
    exportSize: document.getElementById("export-size"),
  };

  const state = {
    templateId: templates[0].id,
    images: [null, null, null],
    transforms: emptyTransforms(),
    texts: textFromTemplate(templates[0]),
    messageBackground: false,
    activeText: "body",
    activeSlot: 0,
    selected: { type: "text", key: "body" },
    textBounds: {},
    drag: null,
    exporting: false,
  };

  function currentTemplate() {
    return templates.find((item) => item.id === state.templateId) || templates[0];
  }

  function textFromTemplate(template, previous) {
    return Object.fromEntries(
      Object.keys(template.text).map((key) => [
        key,
        {
          ...template.text[key],
          value: previous && previous[key] ? previous[key].value : DEFAULT_VALUES[key],
        },
      ]),
    );
  }

  function addRoundedRect(ctx, x, y, width, height, radiusValue) {
    const radius = Math.max(0, Math.min(radiusValue, width / 2, height / 2));
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  function drawLeafBranch(ctx, x, y, length, angle, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, length / 250);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(length * 0.3, -length * 0.08, length * 0.7, length * 0.08, length, 0);
    ctx.stroke();
    for (let index = 0.14; index < 0.96; index += 0.13) {
      const side = Math.round(index * 100) % 2 === 0 ? 1 : -1;
      ctx.save();
      ctx.translate(length * index, Math.sin(index * 8) * length * 0.018);
      ctx.rotate(side * 0.75);
      ctx.beginPath();
      ctx.ellipse(0, -length * 0.035, length * 0.052, length * 0.022, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  function drawFlower(ctx, x, y, radius, color, alpha = 0.18) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    for (let index = 0; index < 8; index += 1) {
      ctx.rotate(Math.PI / 4);
      ctx.beginPath();
      ctx.ellipse(0, -radius * 0.7, radius * 0.34, radius * 0.78, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = alpha * 1.8;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function seeded(index) {
    return Math.abs(Math.sin(index * 91.731 + 0.37) * 43758.5453) % 1;
  }

  function drawTemplateBase(ctx, template) {
    const width = template.width;
    const height = template.height;
    const kind = template.kind;
    if (kind === "simple") {
      ctx.fillStyle = "#f7f2ea";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "rgba(255,255,255,.62)";
      ctx.fillRect(52, 52, width - 104, height - 104);
      ctx.strokeStyle = "rgba(105,86,89,.16)";
      ctx.lineWidth = 2;
      for (let y = 330; y < height - 80; y += 66) {
        ctx.setLineDash([3, 9]);
        ctx.beginPath();
        ctx.moveTo(95, y);
        ctx.lineTo(width - 95, y);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      drawLeafBranch(ctx, 30, 315, 480, -0.45, "#765e63");
      drawLeafBranch(ctx, 760, 1450, 420, -0.55, "#765e63");
    } else if (kind === "elegant") {
      ctx.fillStyle = "#f6fafc";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#ffffff";
      addRoundedRect(ctx, 56, 54, width - 112, height - 108, 26);
      ctx.fill();
      ctx.strokeStyle = "#7899b5";
      ctx.lineWidth = 3;
      addRoundedRect(ctx, 88, 82, width - 176, height - 164, 22);
      ctx.stroke();
      for (let x = 40; x < width; x += 120) {
        drawFlower(ctx, x, 28 + seeded(x) * 38, 34 + seeded(x + 1) * 22, "#75a7c5", 0.16);
        drawFlower(ctx, x, height - 25 - seeded(x + 2) * 30, 26 + seeded(x + 3) * 18, "#91b9cf", 0.15);
      }
      drawFlower(ctx, 1140, 610, 170, "#87aeca", 0.07);
      drawFlower(ctx, 1330, 785, 120, "#a9c3d6", 0.08);
    } else if (kind === "fullscreen" || kind === "none") {
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, kind === "fullscreen" ? "#242333" : "#323232");
      gradient.addColorStop(1, kind === "fullscreen" ? "#6c596d" : "#171717");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    } else if (kind === "collage") {
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, "#35233f");
      gradient.addColorStop(0.55, "#315c59");
      gradient.addColorStop(1, "#4c2c56");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = 0.24;
      ctx.fillStyle = "#5dd0bc";
      ctx.beginPath();
      ctx.ellipse(210, 610, 320, 540, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#d59acf";
      ctx.beginPath();
      ctx.ellipse(980, 1010, 260, 650, 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = "#ffffff";
      for (let index = 0; index < 190; index += 1) {
        const size = 1 + seeded(index) * 4;
        ctx.fillRect(seeded(index + 31) * width, seeded(index + 83) * height, size, size);
      }
      ctx.globalAlpha = 1;
    } else if (kind === "luxury") {
      const gradient = ctx.createRadialGradient(width * 0.52, height * 0.38, 80, width * 0.5, height * 0.48, height * 0.8);
      gradient.addColorStop(0, "#653d5b");
      gradient.addColorStop(0.48, "#321d34");
      gradient.addColorStop(1, "#170e1c");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = "rgba(225,188,112,.76)";
      ctx.lineWidth = 3;
      addRoundedRect(ctx, 46, 46, width - 92, height - 92, 26);
      ctx.stroke();
      addRoundedRect(ctx, 64, 64, width - 128, height - 128, 22);
      ctx.stroke();
      for (let index = 0; index < 52; index += 1) {
        const x = 70 + seeded(index + 3) * (width - 140);
        const y = 70 + seeded(index + 55) * (height - 140);
        const radius = 1 + seeded(index + 100) * 5;
        ctx.fillStyle = `rgba(239,201,125,${0.25 + seeded(index + 44) * 0.45})`;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawTemplateOverlay(ctx, template) {
    const width = template.width;
    const height = template.height;
    const kind = template.kind;
    if (kind === "simple") {
      drawLeafBranch(ctx, 90, 555, 340, 0.12, "rgba(58,48,52,.76)");
      drawLeafBranch(ctx, 790, 1080, 320, -2.95, "rgba(58,48,52,.76)");
    }
    if (kind === "fullscreen") {
      const gradient = ctx.createLinearGradient(0, height * 0.55, 0, height);
      gradient.addColorStop(0, "rgba(18,17,25,0)");
      gradient.addColorStop(1, "rgba(18,17,25,.82)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, height * 0.45, width, height * 0.55);
      ctx.strokeStyle = "rgba(255,255,255,.45)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(82, 175);
      ctx.lineTo(450, 175);
      ctx.stroke();
    }
    if (kind === "collage") {
      ctx.strokeStyle = "rgba(255,255,255,.72)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(20, 950);
      ctx.bezierCurveTo(250, 840, 220, 1100, 500, 1010);
      ctx.bezierCurveTo(760, 930, 810, 1110, 1060, 980);
      ctx.stroke();
      for (let index = 0; index < 11; index += 1) {
        ctx.beginPath();
        ctx.arc(40 + seeded(index) * 980, 80 + seeded(index + 9) * 1000, 5 + seeded(index + 19) * 14, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    if (kind === "luxury") {
      drawLeafBranch(ctx, 80, 1035, 360, 0.18, "rgba(229,196,126,.72)");
      drawLeafBranch(ctx, width - 80, 320, 360, Math.PI + 0.18, "rgba(229,196,126,.72)");
    }
    if (kind === "elegant") {
      drawLeafBranch(ctx, 1210, 100, 310, 0.18, "rgba(91,127,154,.55)");
      drawLeafBranch(ctx, 1160, height - 90, 340, -0.18, "rgba(91,127,154,.55)");
    }
  }

  function pointInBounds(x, y, bounds) {
    return x >= bounds.x && x <= bounds.x + bounds.width && y >= bounds.y && y <= bounds.y + bounds.height;
  }

  function formatText(key, value) {
    if (!value.trim()) return "";
    if (key === "recipient") return `${value.trim()}へ`;
    if (key === "signature") return `${value.trim()}より`;
    return value;
  }

  function wrapText(ctx, value, maxWidth) {
    const lines = [];
    value.split("\n").forEach((paragraph) => {
      if (paragraph === "") {
        lines.push("");
        return;
      }
      let line = "";
      Array.from(paragraph).forEach((character) => {
        const next = line + character;
        if (line && ctx.measureText(next).width > maxWidth) {
          lines.push(line);
          line = character;
        } else {
          line = next;
        }
      });
      lines.push(line);
    });
    return lines;
  }

  function layoutText(ctx, key, textState, preset) {
    const value = formatText(key, textState.value);
    if (!value) return null;
    ctx.font = `${textState.size}px "${textState.font}", "Zen Maru Gothic", sans-serif`;
    const lines = wrapText(ctx, value, preset.maxWidth);
    const lineHeight = textState.size * (key === "body" ? 1.48 : 1.24);
    const measuredWidth = Math.min(
      preset.maxWidth,
      Math.max(...lines.map((line) => ctx.measureText(line || " ").width)),
    );
    const left = textState.align === "center"
      ? textState.x - measuredWidth / 2
      : textState.align === "right"
        ? textState.x - measuredWidth
        : textState.x;
    return {
      lines,
      lineHeight,
      bounds: {
        x: left - 8,
        y: textState.y - 6,
        width: measuredWidth + 16,
        height: lines.length * lineHeight + 12,
      },
    };
  }

  function drawImageSlot(ctx, template, slot, loaded, transform) {
    const centerX = slot.x + slot.width / 2;
    const centerY = slot.y + slot.height / 2;
    const frameAngle = ((slot.angle || 0) * Math.PI) / 180;
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(frameAngle);
    if (template.kind === "collage") {
      ctx.shadowColor = "rgba(8,4,12,.36)";
      ctx.shadowBlur = 20;
      ctx.shadowOffsetY = 12;
      ctx.fillStyle = "#f7f4ef";
      ctx.fillRect(-slot.width / 2 - 18, -slot.height / 2 - 18, slot.width + 36, slot.height + 86);
      ctx.shadowColor = "transparent";
    } else if (template.kind !== "fullscreen" && template.kind !== "none") {
      ctx.shadowColor = "rgba(18,12,22,.2)";
      ctx.shadowBlur = 24;
      ctx.shadowOffsetY = 10;
      ctx.fillStyle = template.kind === "luxury" ? "#d8b870" : "#ffffff";
      addRoundedRect(ctx, -slot.width / 2 - 12, -slot.height / 2 - 12, slot.width + 24, slot.height + 24, template.kind === "simple" ? 12 : 4);
      ctx.fill();
      ctx.shadowColor = "transparent";
    }
    ctx.save();
    ctx.beginPath();
    if (template.kind === "simple") {
      addRoundedRect(ctx, -slot.width / 2, -slot.height / 2, slot.width, slot.height, 8);
    } else {
      ctx.rect(-slot.width / 2, -slot.height / 2, slot.width, slot.height);
    }
    ctx.clip();
    ctx.fillStyle = template.kind === "luxury" ? "#251b27" : "#e8e3df";
    ctx.fillRect(-slot.width / 2, -slot.height / 2, slot.width, slot.height);
    if (loaded) {
      const image = loaded.image;
      const coverScale = Math.max(slot.width / image.naturalWidth, slot.height / image.naturalHeight);
      const scale = coverScale * transform.scale;
      const drawWidth = image.naturalWidth * scale;
      const drawHeight = image.naturalHeight * scale;
      ctx.translate(transform.offsetX, transform.offsetY);
      ctx.rotate((transform.rotation * Math.PI) / 180);
      ctx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    } else {
      const gradient = ctx.createLinearGradient(-slot.width / 2, -slot.height / 2, slot.width / 2, slot.height / 2);
      gradient.addColorStop(0, "#eee8e3");
      gradient.addColorStop(1, "#d7ced2");
      ctx.fillStyle = gradient;
      ctx.fillRect(-slot.width / 2, -slot.height / 2, slot.width, slot.height);
      ctx.strokeStyle = "rgba(83,66,75,.22)";
      ctx.lineWidth = 3;
      ctx.setLineDash([12, 12]);
      ctx.strokeRect(-slot.width / 2 + 24, -slot.height / 2 + 24, slot.width - 48, slot.height - 48);
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(74,58,67,.55)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `${Math.max(22, slot.width * 0.045)}px "Zen Maru Gothic", sans-serif`;
      ctx.fillText("SSを読み込む", 0, 0);
    }
    ctx.restore();
    ctx.restore();
  }

  function renderCard(canvas, template, images, transforms, texts, messageBackground, guides, selected) {
    if (canvas.width !== template.width) canvas.width = template.width;
    if (canvas.height !== template.height) canvas.height = template.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { textBounds: {} };
    ctx.clearRect(0, 0, template.width, template.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    drawTemplateBase(ctx, template);
    template.slots.forEach((slot, index) => drawImageSlot(ctx, template, slot, images[index], transforms[index]));
    drawTemplateOverlay(ctx, template);
    const layouts = {};
    const textBounds = {};
    TEXT_ORDER.forEach((key) => {
      const layout = layoutText(ctx, key, texts[key], template.text[key]);
      if (layout) {
        layouts[key] = layout;
        textBounds[key] = layout.bounds;
      }
    });
    const visibleBounds = Object.values(textBounds);
    if (messageBackground && visibleBounds.length) {
      const minX = Math.max(20, Math.min(...visibleBounds.map((bounds) => bounds.x)) - 28);
      const minY = Math.max(20, Math.min(...visibleBounds.map((bounds) => bounds.y)) - 22);
      const maxX = Math.min(template.width - 20, Math.max(...visibleBounds.map((bounds) => bounds.x + bounds.width)) + 28);
      const maxY = Math.min(template.height - 20, Math.max(...visibleBounds.map((bounds) => bounds.y + bounds.height)) + 22);
      addRoundedRect(ctx, minX, minY, maxX - minX, maxY - minY, 20);
      ctx.fillStyle = ["luxury", "fullscreen", "collage", "none"].includes(template.kind)
        ? "rgba(25,25,29,.52)"
        : "rgba(82,82,86,.20)";
      ctx.fill();
    }
    TEXT_ORDER.forEach((key) => {
      const layout = layouts[key];
      if (!layout) return;
      const textState = texts[key];
      ctx.save();
      ctx.font = `${textState.size}px "${textState.font}", "Zen Maru Gothic", sans-serif`;
      ctx.fillStyle = textState.color;
      ctx.textAlign = textState.align;
      ctx.textBaseline = "top";
      ctx.shadowColor = template.kind === "fullscreen" || template.kind === "none"
        ? "rgba(0,0,0,.42)"
        : "rgba(255,255,255,.24)";
      ctx.shadowBlur = template.kind === "fullscreen" || template.kind === "none" ? 8 : 2;
      layout.lines.forEach((line, lineIndex) => {
        ctx.fillText(line, textState.x, textState.y + lineIndex * layout.lineHeight, template.text[key].maxWidth);
      });
      ctx.restore();
    });
    if (guides && selected) {
      ctx.save();
      ctx.strokeStyle = "#ec6e88";
      ctx.fillStyle = "#ec6e88";
      ctx.lineWidth = Math.max(2, template.width / 600);
      ctx.setLineDash([10, 8]);
      if (selected.type === "text") {
        const bounds = textBounds[selected.key];
        if (bounds) {
          ctx.strokeRect(bounds.x - 6, bounds.y - 6, bounds.width + 12, bounds.height + 12);
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.arc(bounds.x + bounds.width, bounds.y + bounds.height, 7, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        const slot = template.slots[selected.index];
        if (slot) ctx.strokeRect(slot.x - 10, slot.y - 10, slot.width + 20, slot.height + 20);
      }
      ctx.restore();
    }
    return { textBounds };
  }

  function redraw() {
    const result = renderCard(
      elements.canvas,
      currentTemplate(),
      state.images,
      state.transforms,
      state.texts,
      state.messageBackground,
      true,
      state.selected,
    );
    state.textBounds = result.textBounds;
  }

  function createTemplateCards() {
    elements.templateGrid.textContent = "";
    templates.forEach((template) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "template-card";
      button.dataset.templateId = template.id;
      button.setAttribute("aria-pressed", "false");

      const thumb = document.createElement("span");
      thumb.className = `template-thumb thumb-${template.kind}`;
      const miniPhoto = document.createElement("span");
      miniPhoto.className = "mini-photo";
      const firstLine = document.createElement("span");
      firstLine.className = "mini-line first";
      const secondLine = document.createElement("span");
      secondLine.className = "mini-line second";
      thumb.append(miniPhoto, firstLine, secondLine);

      const meta = document.createElement("span");
      meta.className = "template-meta";
      const strong = document.createElement("strong");
      strong.textContent = template.shortName;
      const small = document.createElement("small");
      small.textContent = template.width > template.height ? "横型" : "縦型";
      meta.append(strong, small);

      const swatches = document.createElement("span");
      swatches.className = "swatches";
      swatches.setAttribute("aria-hidden", "true");
      template.swatches.forEach((color) => {
        const swatch = document.createElement("i");
        swatch.style.backgroundColor = color;
        swatches.append(swatch);
      });
      button.append(thumb, meta, swatches);
      button.addEventListener("click", () => chooseTemplate(template.id));
      elements.templateGrid.append(button);
    });
  }

  function createFontOptions() {
    elements.fontSelect.textContent = "";
    fonts.forEach((font) => {
      const option = document.createElement("option");
      option.value = font;
      option.textContent = font;
      option.style.fontFamily = font;
      elements.fontSelect.append(option);
    });
  }

  function chooseTemplate(id) {
    const nextTemplate = templates.find((item) => item.id === id);
    if (!nextTemplate) return;
    state.templateId = id;
    state.texts = textFromTemplate(nextTemplate, state.texts);
    state.transforms = emptyTransforms();
    state.activeSlot = 0;
    state.selected = { type: "text", key: state.activeText };
    syncInterface();
    redraw();
  }

  function selectText(key) {
    if (!TEXT_LABELS[key]) return;
    state.activeText = key;
    state.selected = { type: "text", key };
    syncTextControls();
    redraw();
  }

  function selectSlot(index) {
    if (!currentTemplate().slots[index]) return;
    state.activeSlot = index;
    state.selected = { type: "image", index };
    syncSlotControls();
    redraw();
  }

  function syncTemplateCards() {
    elements.templateGrid.querySelectorAll("[data-template-id]").forEach((button) => {
      const isActive = button.dataset.templateId === state.templateId;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  }

  function syncSlotTabs() {
    const template = currentTemplate();
    elements.slotTabs.textContent = "";
    if (template.slots.length <= 1) {
      elements.slotTabs.hidden = true;
      return;
    }
    elements.slotTabs.hidden = false;
    template.slots.forEach((slot, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = `SS ${index + 1}`;
      button.classList.toggle("active", state.activeSlot === index);
      button.addEventListener("click", () => selectSlot(index));
      elements.slotTabs.append(button);
    });
  }

  function syncSlotControls() {
    const transform = state.transforms[state.activeSlot] || EMPTY_TRANSFORM;
    const image = state.images[state.activeSlot];
    elements.scaleInput.value = String(Math.round(transform.scale * 100));
    elements.scaleOutput.textContent = `${Math.round(transform.scale * 100)}%`;
    elements.rotationInput.value = String(transform.rotation);
    elements.rotationOutput.textContent = `${transform.rotation}°`;
    elements.uploadLabel.textContent = image ? "SSを差し替える" : "SSを読み込む";
    if (image) {
      elements.fileName.hidden = false;
      elements.fileName.textContent = image.name;
      elements.fileName.title = image.name;
    } else {
      elements.fileName.hidden = true;
      elements.fileName.textContent = "";
      elements.fileName.removeAttribute("title");
    }
    elements.slotTabs.querySelectorAll("button").forEach((button, index) => {
      button.classList.toggle("active", index === state.activeSlot);
    });
  }

  function syncMessageControls() {
    elements.recipientInput.value = state.texts.recipient.value;
    elements.bodyInput.value = state.texts.body.value;
    elements.signatureInput.value = state.texts.signature.value;
    elements.headlineInput.value = state.texts.headline.value;
    elements.messageBackground.checked = state.messageBackground;
  }

  function syncTextControls() {
    const active = state.texts[state.activeText];
    elements.textTabs.querySelectorAll("[data-text-key]").forEach((button) => {
      button.classList.toggle("active", button.dataset.textKey === state.activeText);
    });
    elements.fontSelect.value = active.font;
    elements.fontSizeInput.value = String(active.size);
    elements.fontSizeOutput.textContent = `${active.size}px`;
    elements.colorInput.value = active.color;
    elements.colorOutput.textContent = active.color.toUpperCase();
    elements.alignControl.querySelectorAll("[data-align]").forEach((button) => {
      button.classList.toggle("active", button.dataset.align === active.align);
    });
  }

  function syncInterface() {
    const template = currentTemplate();
    elements.templateName.textContent = template.name;
    const sizeText = `${template.width} × ${template.height}px`;
    elements.sizeBadge.textContent = sizeText;
    elements.exportSize.textContent = sizeText;
    elements.templateDescription.textContent = template.description;
    elements.canvasStage.className = `canvas-stage canvas-${template.kind}`;
    syncTemplateCards();
    syncSlotTabs();
    syncSlotControls();
    syncMessageControls();
    syncTextControls();
  }

  function updateTransform(index, patch) {
    state.transforms[index] = { ...state.transforms[index], ...patch };
    syncSlotControls();
    redraw();
  }

  function updateText(key, patch) {
    state.texts[key] = { ...state.texts[key], ...patch };
    syncTextControls();
    redraw();
  }

  function loadImage(file) {
    if (!file) return;
    const index = state.activeSlot;
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      if (state.images[index]) URL.revokeObjectURL(state.images[index].url);
      state.images[index] = { image, name: file.name, url };
      state.transforms[index] = { ...EMPTY_TRANSFORM };
      selectSlot(index);
      syncSlotControls();
    };
    image.onerror = () => URL.revokeObjectURL(url);
    image.src = url;
  }

  function canvasPoint(event) {
    const template = currentTemplate();
    const rect = elements.canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * template.width,
      y: ((event.clientY - rect.top) / rect.height) * template.height,
    };
  }

  function pointerDown(event) {
    const template = currentTemplate();
    const point = canvasPoint(event);
    const hitText = [...TEXT_ORDER].reverse().find((key) => {
      const bounds = state.textBounds[key];
      return bounds && pointInBounds(point.x, point.y, bounds);
    });
    if (hitText) {
      selectText(hitText);
      state.drag = {
        type: "text",
        key: hitText,
        startX: point.x,
        startY: point.y,
        x: state.texts[hitText].x,
        y: state.texts[hitText].y,
      };
      elements.canvas.setPointerCapture(event.pointerId);
      return;
    }
    const hitSlot = template.slots
      .map((slot, index) => index)
      .reverse()
      .find((index) => pointInBounds(point.x, point.y, template.slots[index]));
    if (hitSlot !== undefined) {
      selectSlot(hitSlot);
      state.drag = {
        type: "image",
        index: hitSlot,
        startX: point.x,
        startY: point.y,
        x: state.transforms[hitSlot].offsetX,
        y: state.transforms[hitSlot].offsetY,
      };
      elements.canvas.setPointerCapture(event.pointerId);
    } else {
      state.selected = null;
      redraw();
    }
  }

  function pointerMove(event) {
    if (!state.drag) return;
    const point = canvasPoint(event);
    const deltaX = point.x - state.drag.startX;
    const deltaY = point.y - state.drag.startY;
    if (state.drag.type === "text") {
      state.texts[state.drag.key].x = state.drag.x + deltaX;
      state.texts[state.drag.key].y = state.drag.y + deltaY;
    } else {
      state.transforms[state.drag.index].offsetX = state.drag.x + deltaX;
      state.transforms[state.drag.index].offsetY = state.drag.y + deltaY;
    }
    redraw();
  }

  function stopDrag(event) {
    state.drag = null;
    if (elements.canvas.hasPointerCapture(event.pointerId)) {
      elements.canvas.releasePointerCapture(event.pointerId);
    }
  }

  function canvasWheel(event) {
    const template = currentTemplate();
    const point = canvasPoint(event);
    const index = template.slots
      .map((slot, slotIndex) => slotIndex)
      .reverse()
      .find((slotIndex) => pointInBounds(point.x, point.y, template.slots[slotIndex]));
    if (index === undefined || !state.images[index]) return;
    event.preventDefault();
    const nextScale = Math.min(
      3,
      Math.max(0.5, state.transforms[index].scale + (event.deltaY < 0 ? 0.05 : -0.05)),
    );
    state.transforms[index].scale = Number(nextScale.toFixed(2));
    state.activeSlot = index;
    state.selected = { type: "image", index };
    syncSlotControls();
    redraw();
  }

  async function exportPng() {
    if (state.exporting) return;
    state.exporting = true;
    elements.exportButton.disabled = true;
    elements.exportButton.querySelector("span").textContent = "書き出し中…";
    try {
      if (document.fonts) await document.fonts.ready;
      const template = currentTemplate();
      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = template.width;
      exportCanvas.height = template.height;
      renderCard(
        exportCanvas,
        template,
        state.images,
        state.transforms,
        state.texts,
        state.messageBackground,
        false,
        null,
      );
      const blob = await new Promise((resolve) => exportCanvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("PNGを作成できませんでした。");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `thank-you-card-${new Date().toISOString().slice(0, 10)}.png`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } finally {
      state.exporting = false;
      elements.exportButton.disabled = false;
      elements.exportButton.querySelector("span").textContent = "PNGで保存";
    }
  }

  function bindEvents() {
    elements.imageInput.addEventListener("change", (event) => {
      loadImage(event.target.files && event.target.files[0]);
      event.target.value = "";
    });
    elements.scaleInput.addEventListener("input", (event) => {
      updateTransform(state.activeSlot, { scale: Number(event.target.value) / 100 });
    });
    elements.rotationInput.addEventListener("input", (event) => {
      updateTransform(state.activeSlot, { rotation: Number(event.target.value) });
    });
    elements.imageReset.addEventListener("click", () => {
      updateTransform(state.activeSlot, { ...EMPTY_TRANSFORM });
    });

    const messageInputs = {
      recipient: elements.recipientInput,
      body: elements.bodyInput,
      signature: elements.signatureInput,
      headline: elements.headlineInput,
    };
    Object.entries(messageInputs).forEach(([key, input]) => {
      input.addEventListener("focus", () => selectText(key));
      input.addEventListener("input", (event) => {
        state.texts[key].value = event.target.value;
        redraw();
      });
    });
    elements.messageBackground.addEventListener("change", (event) => {
      state.messageBackground = event.target.checked;
      redraw();
    });
    elements.textTabs.addEventListener("click", (event) => {
      const button = event.target.closest("[data-text-key]");
      if (button) selectText(button.dataset.textKey);
    });
    elements.fontSelect.addEventListener("change", (event) => {
      updateText(state.activeText, { font: event.target.value });
    });
    elements.fontSizeInput.addEventListener("input", (event) => {
      updateText(state.activeText, { size: Number(event.target.value) });
    });
    elements.colorInput.addEventListener("input", (event) => {
      updateText(state.activeText, { color: event.target.value });
    });
    elements.alignControl.addEventListener("click", (event) => {
      const button = event.target.closest("[data-align]");
      if (button) updateText(state.activeText, { align: button.dataset.align });
    });
    elements.canvas.addEventListener("pointerdown", pointerDown);
    elements.canvas.addEventListener("pointermove", pointerMove);
    elements.canvas.addEventListener("pointerup", stopDrag);
    elements.canvas.addEventListener("pointercancel", stopDrag);
    elements.canvas.addEventListener("wheel", canvasWheel, { passive: false });
    elements.exportButton.addEventListener("click", exportPng);
    window.addEventListener("beforeunload", () => {
      state.images.forEach((item) => {
        if (item) URL.revokeObjectURL(item.url);
      });
    });
  }

  function initialize() {
    createTemplateCards();
    createFontOptions();
    bindEvents();
    syncInterface();
    redraw();
    const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
    fontsReady.then(redraw);
  }

  initialize();
})();
