const DEFAULT_SVG_PADDING = 20
const DEFAULT_BACKGROUND_COLOR = 'white'

export function svgDownloadElement(
    svgGroupElement: SVGGElement,
    filename: string,
    options: {
        padding?: number
        backgroundColor?: string
    } = {}
) {
    const padding = options.padding ?? DEFAULT_SVG_PADDING
    const backgroundColor = options.backgroundColor ?? DEFAULT_BACKGROUND_COLOR

    if (!svgGroupElement) {
        throw new Error('SVG group element is null or undefined')
    }

    const rect = svgGroupElement.getBBox()

    const viewportX = rect.x - padding
    const viewportY = rect.y - padding
    const viewportWidth = rect.width + 2 * padding
    const viewportHeight = rect.height + 2 * padding

    const svgContent = `
        <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="${rect.width}" 
            height="${rect.height}"
            viewBox="${[viewportX, viewportY, viewportWidth, viewportHeight].join(' ')}">
            <rect 
                x="${viewportX}"
                y="${viewportY}"
                width="${viewportWidth}"
                height="${viewportHeight}"
                fill="${backgroundColor}"
            />
            ${svgGroupElement.outerHTML}
        </svg>
    `
    // .replace(/\s+/g, ' ')
    // .trim()

    console.log('Exporting:', svgContent)

    const base64doc = btoa(svgContent)

    const a = document.createElement('a')
    const e = new MouseEvent('click')
    a.download = filename
    a.href = 'data:image/svg+xml;base64,' + base64doc
    a.dispatchEvent(e)
}
