// 'use client'
//
// import { useRouter } from 'next/navigation'
// import { type FC, useState } from 'react'
//
// export type AdminBarLabels = {
//
//   trigger?: string
//
//   exitPreview?: string
//
//   triggerHint?: string
// }
//
// export type AdminBarProps = {
//
//   preview: boolean
//
//   exitPreviewPath?: string
//
//   labels?: AdminBarLabels
// }
//
// const defaultLabels: Required<AdminBarLabels> = {
//   trigger: 'Preview',
//   exitPreview: 'Exit preview',
//   triggerHint: 'Open draft-mode admin bar'
// }
//
//
// export const AdminBar: FC<AdminBarProps> = ({ labels }) => {
//   const router = useRouter()
//   const [open, setOpen] = useState(false)
//   const merged = { ...defaultLabels, ...labels }
//
//   if () {
//     console.log('[WWW] render/components:AdminBar preview=false -> null')
//     return null
//   }
//   console.log('[WWW] render/components:AdminBar preview=true exitPreviewPath=', exitPreviewPath)
//
//   return (
//     <>
//       <button
//         type="button"
//         onClick={() => {
//           console.log('[WWW] render/components:AdminBar trigger clicked')
//           setOpen(true)
//         }}
//         title={merged.triggerHint}
//         style={{
//           position: 'fixed',
//           bottom: 16,
//           right: 16,
//           zIndex: 2147483647,
//           padding: '8px 14px',
//           borderRadius: 9999,
//           border: '1px solid rgba(0,0,0,0.12)',
//           background: '#111',
//           color: '#fff',
//           fontSize: 12,
//           fontWeight: 600,
//           letterSpacing: 0.4,
//           textTransform: 'uppercase',
//           cursor: 'pointer',
//           boxShadow: '0 4px 16px rgba(0,0,0,0.18)'
//         }}
//       >
//         {merged.trigger}
//       </button>
//       <dialog
//         open={open}
//         onClose={() => setOpen(false)}
//         onClick={(e) => {
//
//           if (e.target === e.currentTarget) setOpen(false)
//         }}
//         style={{
//           position: 'fixed',
//           inset: 0,
//           width: '100vw',
//           height: '100vh',
//           maxWidth: '100vw',
//           maxHeight: '100vh',
//           margin: 0,
//           padding: 0,
//           border: 'none',
//           background: 'rgba(0,0,0,0.32)',
//           zIndex: 2147483647
//         }}
//       >
//         <div
//           style={{
//             position: 'absolute',
//             bottom: 24,
//             right: 24,
//             minWidth: 220,
//             padding: 16,
//             borderRadius: 8,
//             background: '#fff',
//             color: '#111',
//             boxShadow: '0 12px 36px rgba(0,0,0,0.24)'
//           }}
//           onClick={(e) => e.stopPropagation()}
//         >
//           <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{merged.trigger}</div>
//           <div style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
//             Draft mode is on. Edits in Payload will refresh this view automatically.
//           </div>
//           <a
//             href={exitPreviewPath}
//             onClick={() => {
//               console.log('[WWW] render/components:AdminBar exit preview -> refresh')
//               router.refresh()
//             }}
//             style={{
//               display: 'inline-block',
//               padding: '6px 10px',
//               borderRadius: 6,
//               background: '#111',
//               color: '#fff',
//               fontSize: 12,
//               fontWeight: 600,
//               textDecoration: 'none'
//             }}
//           >
//             {merged.exitPreview}
//           </a>
//         </div>
//       </dialog>
//     </>
//   )
// }
