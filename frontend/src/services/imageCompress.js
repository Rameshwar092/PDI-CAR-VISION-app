// Shrink a phone photo before it is stored/uploaded.
// A 12 MP camera photo is 3-8 MB; this makes it ~150-400 KB (max 1600 px, JPEG 75%),
// which uploads fast on mobile data and fits under Vercel's 4.5 MB request limit.
export function compressImage(file, maxSide = 1600, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read the photo'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => resolve(reader.result) // unknown format: keep original
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
        const w = Math.round(img.width * scale), h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h) // PNG transparency -> white
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}