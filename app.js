(() => {
  'use strict';

  const STORAGE_KEY = 'storyboard-prompt-generator:v1';
  const MAX_CLIPS = 60;
  const WORDS_PER_SECOND = 2.5;

  const STYLE_TAGS = {
    'Cinematic / photorealistic': { frame: 'photorealistic still, high detail', video: 'cinematic live-action footage, 1080p' },
    '3D cartoon / animated': { frame: '3D animated still, high detail', video: '3D animation, 1080p' },
    '2D flat / simple': { frame: 'flat 2D illustration still, clean edges', video: '2D motion graphics animation, 1080p' },
    '2D anime': { frame: 'anime still, clean line art', video: '2D anime animation, 1080p' },
    'Claymation / stop-motion': { frame: 'claymation still, tactile detail', video: 'stop-motion animation, 1080p' },
    'Paper cutout / collage': { frame: 'paper cutout still, tactile detail', video: 'paper cutout animation, 1080p' },
    'Watercolor / hand-painted': { frame: 'watercolor illustration still, soft painted texture', video: 'hand-painted watercolor animation, 1080p' },
    'Pixel art': { frame: 'pixel art still, crisp pixels', video: 'pixel art animation, 1080p' },
    'Comic book': { frame: 'comic book illustration still, bold ink lines', video: 'comic book style animation, 1080p' },
  };

  const ASPECT_LABELS = {
    '9:16': '9:16 vertical',
    '16:9': '16:9 landscape',
    '1:1': '1:1 square',
    '4:5': '4:5 portrait',
  };

  const REQUIRED = [
    ['platform', 'Platform'],
    ['aspect', 'Aspect ratio'],
    ['style', 'Graphic style'],
    ['videoType', 'Video type'],
    ['about', 'What the video is about'],
  ];

  const OTHER_FIELDS = [
    ['platform', 'platformOther', 'Other platform'],
    ['style', 'styleOther', 'Style description'],
    ['videoType', 'videoTypeOther', 'Other video type'],
  ];

  const $ = (id) => document.getElementById(id);
  const form = $('briefForm');
  const customList = $('customClips');

  const round = (n) => Math.round(n * 100) / 100;
  const fmt = (n) => String(round(n));
  const clean = (s) => s.trim().replace(/\s*\n\s*/g, ' ');

  let lastClips = [];

  // ---------- Clip plan ----------

  function readCustomClips() {
    return [...customList.querySelectorAll('input')].map((input) => parseFloat(input.value));
  }

  function computePlan() {
    const total = parseFloat($('totalLength').value);
    const mode = form.elements.clipMode.value;
    const errors = [];
    const warnings = [];
    let clips = [];

    if (!(total > 0)) {
      errors.push('Enter a max video length greater than 0 seconds.');
      return { total: 0, clips, errors, warnings };
    }

    if (mode === 'length') {
      const len = parseFloat($('clipLength').value);
      if (!(len > 0)) {
        errors.push('Enter a clip length greater than 0 seconds.');
      } else if (len > total) {
        errors.push('Clip length can’t be longer than the max video length.');
      } else {
        const count = Math.floor(total / len + 1e-9);
        clips = Array(count).fill(round(len));
        const rest = round(total - count * len);
        if (rest > 0) {
          clips.push(rest);
          warnings.push(`${fmt(total)}s doesn’t divide evenly into ${fmt(len)}s clips, so the last clip is ${fmt(rest)}s.`);
        }
      }
    } else if (mode === 'count') {
      const count = parseInt($('clipCount').value, 10);
      if (!(count >= 1)) {
        errors.push('Enter at least 1 clip.');
      } else {
        const len = round(total / count);
        clips = Array(count).fill(len);
        clips[count - 1] = round(total - len * (count - 1));
      }
    } else {
      clips = readCustomClips();
      if (!clips.length) {
        errors.push('Add at least one clip.');
      } else if (clips.some((c) => !(c > 0))) {
        errors.push('Every custom clip needs a length greater than 0 seconds.');
      } else {
        const sum = round(clips.reduce((a, b) => a + b, 0));
        if (sum > total) {
          errors.push(`Custom clips add up to ${fmt(sum)}s, which is over the ${fmt(total)}s max.`);
        } else if (sum < total) {
          warnings.push(`Custom clips add up to ${fmt(sum)}s, ${fmt(round(total - sum))}s under the max. The video will be ${fmt(sum)}s long.`);
        }
      }
    }

    if (clips.length > MAX_CLIPS) {
      errors.push(`That makes ${clips.length} clips; the limit is ${MAX_CLIPS}. Use longer clips or a shorter video.`);
    }

    if (!errors.length) {
      if (clips.some((c) => c > 10)) warnings.push('Some clips are longer than 10s. Many AI video tools cap a single clip at 5–10s.');
      if (clips.some((c) => c < 2)) warnings.push('Some clips are shorter than 2s. Their motion will be kept very simple.');
    }

    return { total, clips: errors.length ? [] : clips, errors, warnings };
  }

  function renderPlan() {
    const plan = computePlan();
    const timeline = $('timeline');
    const messages = $('planMessages');
    const sum = round(plan.clips.reduce((a, b) => a + b, 0));

    $('planSummary').textContent = plan.clips.length
      ? `${plan.clips.length} clip${plan.clips.length === 1 ? '' : 's'} · ${fmt(sum)}s`
      : '';

    timeline.replaceChildren(...plan.clips.map((len, i) => {
      const seg = document.createElement('div');
      seg.className = 'seg';
      seg.style.flexGrow = String(len);
      seg.title = `Clip ${i + 1}: ${fmt(len)}s`;
      if (plan.clips.length <= 20) seg.textContent = `${fmt(len)}s`;
      return seg;
    }));

    messages.replaceChildren(
      ...plan.errors.map((m) => messageItem(m, 'error')),
      ...plan.warnings.map((m) => messageItem(m, 'warn')),
    );

    if (plan.clips.length) lastClips = plan.clips;
    return plan;
  }

  function messageItem(text, kind) {
    const li = document.createElement('li');
    li.className = kind;
    li.textContent = text;
    return li;
  }

  function addCustomClip(value = 4) {
    if (customList.children.length >= MAX_CLIPS) return;
    const row = document.createElement('li');
    row.className = 'clip-row';
    row.innerHTML = '<span class="clip-index"></span>'
      + '<input type="number" min="0.5" step="0.5" aria-label="Clip length in seconds">'
      + '<span class="unit">s</span>'
      + '<button type="button" class="icon-btn" aria-label="Remove clip">×</button>';
    row.querySelector('input').value = value;
    customList.appendChild(row);
    renumberCustomClips();
  }

  function renumberCustomClips() {
    [...customList.children].forEach((row, i) => {
      row.querySelector('.clip-index').textContent = `Clip ${i + 1}`;
    });
  }

  // ---------- UI sync ----------

  function syncOtherFields() {
    form.querySelectorAll('select[data-other]').forEach((select) => {
      $(select.dataset.other).hidden = select.value !== 'Other';
    });
  }

  function syncModePanels() {
    const mode = form.elements.clipMode.value;
    $('modeLength').hidden = mode !== 'length';
    $('modeCount').hidden = mode !== 'count';
    $('modeCustom').hidden = mode !== 'custom';
    if (mode === 'custom' && !customList.children.length) {
      (lastClips.length ? lastClips : [4]).forEach((len) => addCustomClip(len));
    }
  }

  function syncPresets() {
    const value = parseFloat($('clipLength').value);
    form.querySelectorAll('[data-clip-length]').forEach((btn) => {
      btn.classList.toggle('active', parseFloat(btn.dataset.clipLength) === value);
    });
  }

  function syncVoiceover() {
    $('voStyleWrap').hidden = form.elements.voiceover.value !== 'yes';
  }

  function syncAll() {
    syncOtherFields();
    syncModePanels();
    syncPresets();
    syncVoiceover();
    renderPlan();
  }

  // ---------- Validation ----------

  function validate() {
    const errors = [];
    form.querySelectorAll('.invalid').forEach((el) => el.classList.remove('invalid'));

    REQUIRED.forEach(([id, label]) => {
      const el = $(id);
      if (!el.value.trim()) {
        el.classList.add('invalid');
        errors.push(`${label} is required.`);
      }
    });

    OTHER_FIELDS.forEach(([selectId, otherId, label]) => {
      const other = $(otherId);
      if ($(selectId).value === 'Other' && !other.value.trim()) {
        other.classList.add('invalid');
        errors.push(`${label} is required.`);
      }
    });

    return errors;
  }

  // ---------- Prompt ----------

  function valueOrOther(selectId, otherId) {
    const value = $(selectId).value;
    return value === 'Other' ? $(otherId).value.trim() : value;
  }

  function buildPrompt(plan) {
    const platform = valueOrOther('platform', 'platformOther');
    const aspect = $('aspect').value;
    const aspectLabel = ASPECT_LABELS[aspect] || aspect;
    const style = valueOrOther('style', 'styleOther');
    const tags = STYLE_TAGS[style] || { frame: `${style} still, high detail`, video: `${style} animation, 1080p` };
    const videoType = valueOrOther('videoType', 'videoTypeOther');
    const tones = [...form.querySelectorAll('input[name="tone"]:checked')].map((i) => i.value);
    if ($('toneCustom').value.trim()) tones.push($('toneCustom').value.trim());
    const voiceover = form.elements.voiceover.value === 'yes';
    const onscreen = $('onscreenText').checked;
    const language = $('language').value.trim() || 'English';
    const voStyle = $('voStyle').value.trim();
    const cta = clean($('cta').value);
    const factual = $('factual').checked;
    const hasReferences = $('hasReferences').checked;
    const vertical = aspect === '9:16';
    const sum = round(plan.clips.reduce((a, b) => a + b, 0));

    const brief = [
      ['Platform', platform],
      ['Aspect ratio', aspectLabel],
      ['Graphic style', style],
      ['Video type', videoType],
      ['About', clean($('about').value)],
      ['Target audience', clean($('audience').value)],
      ['Tone', tones.join(', ')],
      ['Brand colors', clean($('brandColors').value)],
      ['Story structure', $('structure').value || 'Choose the best arc for this video type and clip count'],
      ['Call to action', cta],
      ['Voice-over', voiceover ? `Yes, in ${language}${voStyle ? `; narrator: ${voStyle}` : ''}` : 'None'],
      ['On-screen text', onscreen ? `Yes, in ${language}` : 'None'],
      ['Music mood', clean($('musicMood').value)],
      ['Must include', clean($('mustInclude').value)],
      ['Avoid', clean($('avoid').value)],
    ].filter(([, value]) => value).map(([key, value]) => `- ${key}: ${value}`);

    let t = 0;
    const timeline = plan.clips.map((len, i) => {
      const start = t;
      t = round(t + len);
      const words = voiceover ? `, voice-over max ${Math.max(1, Math.floor(len * WORDS_PER_SECOND))} words` : '';
      return `- Clip ${i + 1}: ${fmt(start)}–${fmt(t)}s (${fmt(len)}s${words})`;
    });

    const clipFields = [
      'purpose, composition, camera move, action',
      voiceover && 'voice-over line',
      onscreen && 'on-screen text and its position',
      'first frame image prompt',
      'last frame image prompt',
      'video prompt',
      'audio direction',
    ].filter(Boolean).join('; ');

    const output = [
      `1. Header: title, platform, length, clip count, aspect ratio, graphic style, story arc.`,
      `2. Style anchor: one fixed 10–20 word phrase that defines the ${style} look.`,
      `3. Visual theme: color palette (names + hex), lighting, camera, surface/texture and motion, all native to the ${style} style.`,
      `4. Subject lock: for every character, creature, product or location in more than one clip, a fixed 20–40 word physical description and a reference image prompt.`,
      `5. Clips: for each clip, ${clipFields}.`,
      voiceover && `6. Voice-over script with timestamps.`,
      `${voiceover ? 7 : 6}. Post-production checklist: generation order (reference images, then first frames, then last frames, then clips), trimming each clip to its exact length, stitching, a uniform grade, ${onscreen ? 'text overlays, ' : ''}and export for ${platform} at ${aspectLabel}.`,
    ].filter(Boolean);

    const rules = [
      'Consistency: paste the style anchor and each locked subject description word for word into every image and video prompt. Never change a subject’s size, colors or features between clips.',
      `Use only vocabulary native to the ${style} style (no film grain in 2D, no cel shading in photoreal, etc.).`,
      `Hook: clip 1’s first frame must be visually striking on its own. ${cta ? 'The last clip delivers the call to action.' : 'End on a strong closing image.'}`,
      `Frame prompts: 30–60 words describing one frozen moment, no motion verbs. The last frame is the first frame plus only what the clip’s action and camera move change. End with "${aspectLabel}, ${tags.frame}".`,
      `Video prompts: 40–80 words, one action and one camera move that carry the first frame to the last within the clip length. End with "[clip length] seconds, ${aspectLabel}, ${tags.video}".`,
      plan.clips.some((c) => c < 3) && 'Clips under 3 seconds: near-static framing with one small, simple motion.',
      'Describe what to show instead of writing "no X". Use color names, not hex codes, inside prompts.',
      `Never render text, numbers or logos inside images or videos; leave clean empty space where overlays will go${vertical ? ', and keep the subject and text out of the bottom 20% and right edge (platform UI)' : ''}.`,
      `Write all image and video prompts in English${(voiceover || onscreen) && language.toLowerCase() !== 'english' ? `; write voice-over and on-screen text in ${language}` : ''}.`,
      voiceover
        ? 'Voice-over: about 2.5 words per second, within each clip’s word limit. Audio direction covers ambience and sound effects only; voice-over and music are added in editing.'
        : 'Audio direction covers ambience and sound effects only; music is added in editing.',
      factual && 'Facts: state only claims you are confident in, hedge uncertain numbers ("around", "earliest known"), keep numbers identical across voice-over and text, label artistic reconstructions, and list sources at the end.',
      hasReferences && 'The user will attach real photos of the product or characters. Base the subject lock on them and say which photo to attach for each prompt.',
      `Before replying, check that there are exactly ${plan.clips.length} clips matching the timeline and that every rule above is followed.`,
    ].filter(Boolean).map((rule) => `- ${rule}`);

    return [
      'You are an expert AI video director. Create a complete clip-by-clip storyboard for the brief below. Follow the timeline and rules exactly.',
      '',
      '## Brief',
      ...brief,
      '',
      `## Timeline (fixed: ${plan.clips.length} clips, ${fmt(sum)}s total)`,
      ...timeline,
      '',
      '## Output (Markdown)',
      ...output,
      '',
      '## Rules',
      ...rules,
    ].join('\n');
  }

  // ---------- Persistence ----------

  function save() {
    const data = { tone: [], customClips: readCustomClips() };
    form.querySelectorAll('input, select, textarea').forEach((el) => {
      if (el.closest('#customClips')) return;
      if (el.name === 'tone') {
        if (el.checked) data.tone.push(el.value);
      } else if (el.type === 'radio') {
        if (el.checked) data[el.name] = el.value;
      } else if (el.type === 'checkbox') {
        data[el.id] = el.checked;
      } else if (el.id) {
        data[el.id] = el.value;
      }
    });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Storage can be unavailable (private mode, file:// restrictions); the form still works.
    }
  }

  function restore() {
    let data;
    try {
      data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch {
      return;
    }
    if (!data) return;

    Object.entries(data).forEach(([key, value]) => {
      if (key === 'tone') {
        form.querySelectorAll('input[name="tone"]').forEach((i) => { i.checked = value.includes(i.value); });
      } else if (key === 'customClips') {
        value.forEach((len) => addCustomClip(Number.isFinite(len) ? len : 4));
      } else {
        const radios = form.querySelectorAll(`input[type="radio"][name="${key}"]`);
        if (radios.length) {
          radios.forEach((r) => { r.checked = r.value === value; });
          return;
        }
        const el = $(key);
        if (!el || !form.contains(el)) return;
        if (el.type === 'checkbox') el.checked = Boolean(value);
        else el.value = value;
      }
    });
  }

  // ---------- Output actions ----------

  function setOutput(text) {
    $('promptOutput').value = text;
    updateOutput();
  }

  function updateOutput() {
    const text = $('promptOutput').value;
    $('copyBtn').disabled = !text;
    $('downloadBtn').disabled = !text;
    $('promptStats').textContent = text
      ? `${text.split(/\s+/).filter(Boolean).length} words · ${text.length} characters`
      : '';
    if (!$('promptPreview').hidden) renderPreview(text);
  }

  function renderPreview(text) {
    const preview = $('promptPreview');
    preview.replaceChildren();
    if (!text.trim()) {
      preview.textContent = $('promptOutput').placeholder;
      return;
    }

    let block;
    let code;
    for (const line of text.split(/\r?\n/)) {
      if (/^\s*```/.test(line)) {
        if (code) {
          code = null;
        } else {
          code = document.createElement('code');
          preview.appendChild(document.createElement('pre')).appendChild(code);
        }
        block = null;
        continue;
      }
      if (code) {
        code.append(line + '\n');
        continue;
      }
      if (!line.trim()) {
        block = null;
        continue;
      }
      const heading = line.match(/^(#{1,6})\s+(.+)$/);
      const item = line.match(/^\s*(?:([-+*])|(\d+)\.)\s+(.+)$/);
      const tag = item ? (item[2] ? 'ol' : 'ul') : 'p';
      if (heading || block?.localName !== tag) {
        block = preview.appendChild(document.createElement(heading ? 'h' + heading[1].length : tag));
        if (item?.[2]) block.start = Number(item[2]);
      }
      const target = item ? block.appendChild(document.createElement('li')) : block;
      if (target.hasChildNodes()) target.append(' ');
      const content = heading ? heading[2] : item ? item[3] : line;
      for (const part of content.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/)) {
        if (!part) continue;
        const inline = part.match(/^(`|\*\*|\*)(.+)\1$/);
        if (inline) {
          const tags = { '`': 'code', '**': 'strong', '*': 'em' };
          target.appendChild(document.createElement(tags[inline[1]])).textContent = inline[2];
        } else {
          target.append(part);
        }
      }
    }
  }

  function setPreviewMode(previewing) {
    $('promptPreview').hidden = !previewing;
    $('promptOutput').hidden = previewing;
    $('previewBtn').setAttribute('aria-pressed', previewing);
    $('editBtn').setAttribute('aria-pressed', !previewing);
    $('previewBtn').classList.toggle('btn-primary', previewing);
    $('previewBtn').classList.toggle('btn-ghost', !previewing);
    $('editBtn').classList.toggle('btn-primary', !previewing);
    $('editBtn').classList.toggle('btn-ghost', previewing);
    if (previewing) renderPreview($('promptOutput').value);
  }

  async function copyPrompt() {
    const output = $('promptOutput');
    const btn = $('copyBtn');
    try {
      await navigator.clipboard.writeText(output.value);
    } catch {
      if (output.hidden) setPreviewMode(false);
      output.select();
      if (!document.execCommand('copy')) return;
    }
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
  }

  function downloadPrompt() {
    const blob = new Blob([$('promptOutput').value], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'storyboard-prompt.md';
    link.click();
    URL.revokeObjectURL(url);
  }

  // ---------- Events ----------

  form.addEventListener('input', (e) => {
    if (e.target.classList.contains('invalid') && e.target.value.trim()) e.target.classList.remove('invalid');
    if (e.target.id === 'clipLength') syncPresets();
    renderPlan();
    save();
  });

  form.addEventListener('change', (e) => {
    const { target } = e;
    if (target.id === 'platform') {
      const aspect = target.selectedOptions[0]?.dataset.aspect;
      if (aspect) $('aspect').value = aspect;
    }
    if (target.id === 'videoType' && target.value === 'Educational / facts') $('factual').checked = true;
    if (target.matches('select[data-other]')) syncOtherFields();
    if (target.name === 'clipMode') syncModePanels();
    if (target.name === 'voiceover') syncVoiceover();
    renderPlan();
    save();
  });

  form.addEventListener('click', (e) => {
    const preset = e.target.closest('[data-clip-length]');
    if (preset) {
      $('clipLength').value = preset.dataset.clipLength;
      syncPresets();
      renderPlan();
      save();
      return;
    }
    const remove = e.target.closest('.clip-row .icon-btn');
    if (remove) {
      remove.closest('.clip-row').remove();
      renumberCustomClips();
      renderPlan();
      save();
    }
  });

  $('addClip').addEventListener('click', () => {
    const values = readCustomClips();
    addCustomClip(values.length ? values[values.length - 1] : 4);
    renderPlan();
    save();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const plan = renderPlan();
    const errors = [...validate(), ...plan.errors];
    $('formErrors').replaceChildren(...errors.map((m) => messageItem(m, 'error')));
    if (errors.length) {
      setOutput('');
      $('formErrors').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }
    setOutput(buildPrompt(plan));
  });

  $('resetBtn').addEventListener('click', () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    form.reset();
    customList.replaceChildren();
    lastClips = [];
    form.querySelectorAll('.invalid').forEach((el) => el.classList.remove('invalid'));
    $('formErrors').replaceChildren();
    setOutput('');
    syncAll();
  });

  $('previewBtn').addEventListener('click', () => setPreviewMode(true));
  $('editBtn').addEventListener('click', () => setPreviewMode(false));
  $('promptOutput').addEventListener('input', updateOutput);
  $('copyBtn').addEventListener('click', copyPrompt);
  $('downloadBtn').addEventListener('click', downloadPrompt);

  restore();
  syncAll();
})();
