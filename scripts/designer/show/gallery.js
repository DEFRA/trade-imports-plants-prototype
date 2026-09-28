/**
 * The gallery: one static index.html per designer:show run, drawn from its
 * manifest. It uses GOV.UK Frontend's own stylesheet, copied beside it, so the
 * folder can be zipped, attached to a pull request or opened from disk with
 * no server. Pure: manifest in, HTML string out.
 */
import {
  STATES,
  VARIANTS,
  WIDTHS,
  axeLine,
  axeSentence,
  fileSafe
} from './manifest.js'

export const GOVUK_STYLESHEET = 'govuk-frontend.min.css'

const HTML_ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}

/** Makes any text safe to put inside HTML. */
export const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (char) => HTML_ESCAPES[char])

const VARIANT_ORDER = [
  VARIANTS.before,
  VARIANTS.now,
  VARIANTS.compare,
  VARIANTS.reference
]

const variantLabel = (variant, manifest) => {
  switch (variant) {
    case VARIANTS.before:
      return manifest.options?.beforeCommit
        ? `Before: saved version ${manifest.options.beforeCommit}`
        : 'Before: your last saved version'
    case VARIANTS.compare:
      return `In ${manifest.compare}`
    case VARIANTS.reference:
      return 'Your reference image'
    default:
      return 'Now: your working copy'
  }
}

const VIEWS = [
  { state: STATES.page, width: WIDTHS.desktop, heading: 'The page' },
  {
    state: STATES.errors,
    width: WIDTHS.desktop,
    heading: 'With error messages (the form sent empty)'
  },
  {
    state: STATES.page,
    width: WIDTHS.mobile,
    heading: 'At phone width (320px)'
  }
]

const pageAnchor = (key) => `page-${fileSafe(key)}`

const pageHeading = (page) => page.title ?? page.key

const figure = (capture, manifest, page) => {
  const label = variantLabel(capture.variant, manifest)
  return `
        <figure class="app-shot">
          <a class="govuk-link" href="${escapeHtml(capture.file)}">
            <img src="${escapeHtml(capture.file)}" alt="${escapeHtml(`${pageHeading(page)}: ${label}`)}" loading="lazy">
          </a>
          <figcaption class="govuk-body-s">${escapeHtml(label)}</figcaption>
        </figure>`
}

const viewBlock = (view, page, manifest) => {
  const shots = page.captures
    .filter((capture) => {
      if (capture.variant === VARIANTS.reference) {
        return view.state === STATES.page && view.width === WIDTHS.desktop
      }
      return capture.state === view.state && capture.width === view.width
    })
    .sort(
      (a, b) =>
        VARIANT_ORDER.indexOf(a.variant) - VARIANT_ORDER.indexOf(b.variant)
    )
  if (shots.length === 0) {
    return ''
  }
  return `
      <h3 class="govuk-heading-s">${escapeHtml(view.heading)}</h3>
      <div class="app-shots app-shots--${shots.length}">${shots.map((shot) => figure(shot, manifest, page)).join('')}
      </div>`
}

const axeBlock = (page, manifest) => {
  const entries = Object.entries(page.axe ?? {})
  if (entries.length === 0) {
    return ''
  }
  return entries
    .map(([which, summary]) => {
      const [variant, state] = which.split('/')
      const label = `${variantLabel(variant, manifest)}${state === STATES.errors ? ', with error messages' : ''}`
      const items = (summary ?? [])
        .map(
          (item) =>
            `<li>${escapeHtml(axeLine(item))}. <a class="govuk-link" href="${escapeHtml(item.helpUrl)}">What this means and how to fix it</a></li>`
        )
        .join('')
      const list = items
        ? `<ul class="govuk-list govuk-list--bullet">${items}</ul>`
        : ''
      return `
      <p class="govuk-body"><strong>${escapeHtml(label)}.</strong> ${escapeHtml(axeSentence(summary))}</p>${list}`
    })
    .join('')
}

const notesBlock = (notes) =>
  notes.length === 0
    ? ''
    : `
      <div class="govuk-inset-text">${notes.map((note) => `<p class="govuk-body">${escapeHtml(note)}</p>`).join('')}</div>`

const pageSection = (page, manifest) => {
  const link = page.path
    ? `<p class="govuk-body-s">Address: <code>${escapeHtml(page.path)}</code></p>`
    : ''
  return `
    <section class="app-page" id="${pageAnchor(page.key)}">
      <h2 class="govuk-heading-l">${escapeHtml(pageHeading(page))}</h2>
      <p class="govuk-caption-m">Page name for designer:show: ${escapeHtml(page.key)}</p>
      ${link}${notesBlock(page.notes ?? [])}${VIEWS.map((view) => viewBlock(view, page, manifest)).join('')}
      <h3 class="govuk-heading-s">Accessibility</h3>${axeBlock(page, manifest)}
    </section>`
}

const summaryRow = (key, valueHtml) => `
        <div class="govuk-summary-list__row">
          <dt class="govuk-summary-list__key">${escapeHtml(key)}</dt>
          <dd class="govuk-summary-list__value">${valueHtml}</dd>
        </div>`

const optionsText = (options) => {
  const parts = [`pages: ${options.pages}`]
  for (const flag of ['before', 'errors', 'mobile', 'video', 'eachExample']) {
    if (options[flag]) {
      parts.push(flag === 'eachExample' ? 'each example' : flag)
    }
  }
  if (options.examples === false) {
    parts.push('no example notifications')
  }
  if (options.urls?.length) {
    parts.push(`addresses: ${options.urls.join(', ')}`)
  }
  if (options.compare) {
    parts.push(`compare with ${options.compare}`)
  }
  if (options.references?.length) {
    parts.push(`${options.references.length} reference image(s)`)
  }
  return parts.join(', ')
}

const summaryList = (manifest) => {
  const saved = manifest.commit
    ? `${escapeHtml(manifest.commit.slice(0, 7))}${manifest.branch ? ` on ${escapeHtml(manifest.branch)}` : ''}`
    : 'Not known'
  return `
      <dl class="govuk-summary-list">${[
        summaryRow('Set', escapeHtml(manifest.set)),
        summaryRow('Made', escapeHtml(manifest.createdAt)),
        summaryRow('Last saved version', saved),
        summaryRow(
          'What was asked for',
          escapeHtml(optionsText(manifest.options))
        ),
        summaryRow(
          'See it yourself',
          `<a class="govuk-link" href="${escapeHtml(manifest.localUrl)}">${escapeHtml(manifest.localUrl)}</a> (while <code>npm run dev</code> is running)`
        )
      ].join('')}
      </dl>`
}

const contents = (manifest) =>
  manifest.pages.length === 0
    ? ''
    : `
      <h2 class="govuk-heading-m">Pages in this gallery</h2>
      <ul class="govuk-list">${manifest.pages
        .map(
          (page) =>
            `<li><a class="govuk-link" href="#${pageAnchor(page.key)}">${escapeHtml(pageHeading(page))}</a></li>`
        )
        .join('')}</ul>`

const videoBlock = (manifest) =>
  manifest.video
    ? `
      <h2 class="govuk-heading-l" id="walkthrough">Walkthrough</h2>
      <p class="govuk-body">The whole journey, slowed down so it can be followed.</p>
      <video class="app-video" controls src="${escapeHtml(manifest.video)}"></video>
      <p class="govuk-body-s"><a class="govuk-link" href="${escapeHtml(manifest.video)}">Download the walkthrough (${escapeHtml(manifest.video)})</a></p>`
    : ''

const listSection = (heading, intro, items) =>
  items.length === 0
    ? ''
    : `
      <h2 class="govuk-heading-m">${escapeHtml(heading)}</h2>
      <p class="govuk-body">${escapeHtml(intro)}</p>
      <ul class="govuk-list govuk-list--bullet">${items.map((item) => `<li><code>${escapeHtml(item)}</code></li>`).join('')}</ul>`

const STYLES = `
    .app-shots { display: grid; gap: 20px; grid-template-columns: 1fr; margin-bottom: 30px; }
    @media (min-width: 900px) {
      .app-shots--2 { grid-template-columns: 1fr 1fr; }
      .app-shots--3, .app-shots--4 { grid-template-columns: repeat(3, 1fr); }
    }
    .app-shot { margin: 0; }
    .app-shot img { display: block; max-width: 100%; height: auto; border: 1px solid #b1b4b6; }
    .app-page { border-top: 2px solid #b1b4b6; padding-top: 30px; margin-top: 30px; }
    .app-video { display: block; max-width: 100%; border: 1px solid #b1b4b6; }
    .govuk-width-container { max-width: 1400px; }`

/**
 * The gallery page for a manifest.
 *
 * @param {object} manifest - from buildManifest.
 * @returns {string} a complete HTML document.
 */
export const renderGallery = (manifest) => `<!doctype html>
<html lang="en" class="govuk-template">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(`${manifest.set}: designer:show gallery`)}</title>
    <link rel="stylesheet" href="${GOVUK_STYLESHEET}">
    <style>${STYLES}
    </style>
  </head>
  <body class="govuk-template__body">
    <div class="govuk-width-container">
      <main class="govuk-main-wrapper" id="main-content">
      <span class="govuk-caption-l">designer:show gallery</span>
      <h1 class="govuk-heading-xl">How ${escapeHtml(manifest.set)} looks</h1>${summaryList(manifest)}${notesBlock(manifest.notes)}${contents(manifest)}${videoBlock(manifest)}${manifest.pages.map((page) => pageSection(page, manifest)).join('')}
      <div class="app-page">${listSection(
        'Pages no example reaches',
        "No example gets to these pages, so there are no pictures of them. To see them, add them to an example's route: add steps for them to the set's happy-path.json.",
        manifest.neverReached
      )}${listSection(
        'Pages you asked for that could not be shown',
        'These pages were asked for but no example reaches them.',
        manifest.unreached
      )}${listSection(
        'Files changed since your last save',
        'What git status listed when these pictures were taken.',
        manifest.changedFiles
      )}
      <p class="govuk-body-s">The data behind this gallery is in manifest.json, and the full accessibility results are in axe.json, both in this folder.</p>
      </div>
      </main>
    </div>
  </body>
</html>
`
