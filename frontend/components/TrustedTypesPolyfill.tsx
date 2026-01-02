'use client'

import { useEffect } from 'react'

export default function TrustedTypesPolyfill() {
  useEffect(() => {
    if (typeof window !== 'undefined' && window.trustedTypes && window.trustedTypes.createPolicy) {
      if (!window.trustedTypes.defaultPolicy) {
        try {
          window.trustedTypes.createPolicy('default', {
            createHTML: (string) => string,
            createScript: (string) => string,
            createScriptURL: (string) => string,
          })
        } catch (e) {
          console.warn('Failed to create default Trusted Types policy', e)
        }
      }
    }
  }, [])

  return null
}
