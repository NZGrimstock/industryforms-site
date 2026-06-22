'use client'
import { useEffect, useRef, useState, useCallback } from 'react'

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google?: any
    initGooglePlaces?: () => void
  }
}

interface Props {
  value: string
  onChange: (address: string) => void
  placeholder?: string
  required?: boolean
  className?: string
  id?: string
}

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

let scriptLoaded = false
let scriptLoading = false
const onLoadCallbacks: (() => void)[] = []

function loadGoogleScript(cb: () => void) {
  if (scriptLoaded) { cb(); return }
  onLoadCallbacks.push(cb)
  if (scriptLoading) return
  scriptLoading = true
  window.initGooglePlaces = () => {
    scriptLoaded = true
    onLoadCallbacks.forEach(fn => fn())
    onLoadCallbacks.length = 0
  }
  const s = document.createElement('script')
  s.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places&callback=initGooglePlaces`
  s.async = true; s.defer = true
  document.head.appendChild(s)
}

export function AddressAutocomplete({ value, onChange, placeholder = 'Start typing an address…', required, className, id }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const autocompleteRef = useRef<any>(null)
  const [ready, setReady] = useState(false)

  const initAutocomplete = useCallback(() => {
    if (!inputRef.current || autocompleteRef.current) return
    const ac = new window.google!.maps.places.Autocomplete(inputRef.current, {
      types: ['address'],
      componentRestrictions: { country: ['nz', 'au'] },
      fields: ['formatted_address'],
    })
    ac.addListener('place_changed', () => {
      const place = ac.getPlace()
      if (place.formatted_address) onChange(place.formatted_address)
    })
    autocompleteRef.current = ac
    setReady(true)
  }, [onChange])

  useEffect(() => {
    if (!API_KEY) return
    loadGoogleScript(() => {
      initAutocomplete()
    })
  }, [initAutocomplete])

  const baseClass = `w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent,#f97316)] ${className ?? ''}`

  // Fallback: plain text input when no API key configured
  if (!API_KEY) {
    return (
      <input
        id={id}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className={baseClass}
      />
    )
  }

  return (
    <input
      ref={inputRef}
      id={id}
      type="text"
      defaultValue={value}
      onBlur={e => onChange(e.target.value)}
      onKeyDown={e => { if (e.key === 'Enter') e.preventDefault() }}
      placeholder={ready ? placeholder : 'Loading address lookup…'}
      required={required}
      className={baseClass}
    />
  )
}
